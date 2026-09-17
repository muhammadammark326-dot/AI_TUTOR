import { ProviderConfig, ChatMessage } from '../types.js';

export interface GenerateOptions {
  systemPrompt: string;
  messages: ChatMessage[];
  temperature?: number;
}

export interface LLMProvider {
  generate(config: ProviderConfig, options: GenerateOptions): Promise<string>;
  validate(config: ProviderConfig): Promise<{ ok: boolean; error?: string }>;
}

function resolveModelAlias(inputModel: string, isOpenRouter: boolean): string {
  const trimmed = inputModel.trim();
  if (!isOpenRouter) return trimmed;

  const lower = trimmed.toLowerCase();
  // OpenRouter Nemo / Nemotron aliases
  if (lower.includes('nemo') && (lower.includes('3') || lower.includes('ultra')) && lower.includes('free')) {
    return 'nvidia/nemotron-3-ultra-550b-a55b:free';
  }
  if (lower === 'nemo 3 ultra' || lower === 'nemotron 3 ultra' || lower === 'nemo-3-ultra' || lower === 'nvidia/nemotron-3-ultra') {
    return 'nvidia/nemotron-3-ultra-550b-a55b:free';
  }
  if (lower === 'nemo' || lower === 'mistral-nemo' || lower === 'mistral nemo') {
    return 'mistralai/mistral-nemo';
  }
  if (lower === 'llama 3.3 free' || lower === 'llama 3.3 70b free' || lower === 'llama-3.3-70b-instruct:free') {
    return 'meta-llama/llama-3.3-70b-instruct:free';
  }
  if (lower === 'deepseek r1 free' || lower === 'r1 free') {
    return 'deepseek/deepseek-r1:free';
  }
  if (lower === 'gemini flash free' || lower === 'gemini 2.0 flash free') {
    return 'google/gemini-2.0-flash-exp:free';
  }
  if (lower === 'qwen coder free' || lower === 'qwen 2.5 coder free') {
    return 'qwen/qwen-2.5-coder-32b-instruct:free';
  }

  return trimmed;
}

export class OpenAICompatibleProvider implements LLMProvider {
  async generate(config: ProviderConfig, options: GenerateOptions): Promise<string> {
    let defaultBaseUrl = 'https://api.openai.com/v1';
    if (config.provider === 'openrouter') defaultBaseUrl = 'https://openrouter.ai/api/v1';
    else if (config.provider === 'groq') defaultBaseUrl = 'https://api.groq.com/openai/v1';
    else if (config.provider === 'ollama') defaultBaseUrl = 'http://localhost:11434/v1';

    const baseUrl = (config.baseUrl || defaultBaseUrl).replace(/\/+$/, '');
    const url = `${baseUrl}/chat/completions`;
    const isOpenRouter = baseUrl.includes('openrouter.ai') || config.provider === 'openrouter';

    const cleanMessages: Array<{ role: string; content: string }> = [];
    if (options.systemPrompt && options.systemPrompt.trim().length > 0) {
      cleanMessages.push({ role: 'system', content: options.systemPrompt.trim() });
    }

    for (const m of options.messages) {
      const text = typeof m.content === 'string' ? m.content.trim() : String(m.content || '').trim();
      if (text.length > 0) {
        cleanMessages.push({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: text,
        });
      }
    }

    if (cleanMessages.length === 0) {
      cleanMessages.push({ role: 'user', content: 'Hello' });
    }

    const messages = cleanMessages;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
    }
    // OpenRouter-specific headers for proper attribution & routing
    if (isOpenRouter) {
      headers['HTTP-Referer'] = 'http://localhost:3000';
      headers['X-Title'] = 'Graphical AI Tutor';
    }

    const rawModel = config.model || (isOpenRouter ? 'meta-llama/llama-3.3-70b-instruct:free' : 'gpt-4o-mini');
    const model = resolveModelAlias(rawModel, isOpenRouter);

    // Initial attempt with json_object format (14s timeout)
    let res = await fetch(url, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(14000),
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    // If provider or model rejects json_object (400, 422, 404, or any 4xx), fallback without response_format
    if (!res.ok && res.status >= 400 && res.status < 500) {
      const fallbackRes = await fetch(url, {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(14000),
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature ?? 0.3,
        }),
      });

      if (fallbackRes.ok) {
        const data: any = await fallbackRes.json();
        return data.choices?.[0]?.message?.content || '';
      }

      // If fallback also failed, extract readable error
      const fallbackErr = await fallbackRes.text();
      let readableMsg = fallbackErr;
      try {
        const parsed = JSON.parse(fallbackErr);
        if (parsed.error?.message) readableMsg = parsed.error.message;
      } catch (_) {}
      throw new Error(`Model "${model}" request failed (${fallbackRes.status}): ${readableMsg}`);
    }

    if (!res.ok) {
      const errorText = await res.text();
      let readableMsg = errorText;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.error?.message) readableMsg = parsed.error.message;
      } catch (_) {}
      throw new Error(`Model "${model}" request failed (${res.status}): ${readableMsg}`);
    }

    const data: any = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async validate(config: ProviderConfig): Promise<{ ok: boolean; error?: string; message?: string }> {
    try {
      const baseUrl = (config.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
      const isOpenRouter = baseUrl.includes('openrouter.ai') || config.provider === 'openrouter';

      if (isOpenRouter) {
        const key = config.apiKey?.trim();
        if (!key) {
          return { ok: false, error: 'OpenRouter API key is required. Paste your sk-or-v1-... key.' };
        }
        const authRes = await fetch('https://openrouter.ai/api/v1/auth/key', {
          headers: {
            'Authorization': `Bearer ${key}`,
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Graphical AI Tutor',
          },
          signal: AbortSignal.timeout(7000),
        });
        if (!authRes.ok) {
          const authErr = await authRes.text();
          let msg = 'Invalid OpenRouter API key';
          try {
            const parsed = JSON.parse(authErr);
            if (parsed.error?.message) msg = parsed.error.message;
          } catch (_) {}
          return { ok: false, error: msg };
        }
        const authData: any = await authRes.json();
        const keyLabel = authData?.data?.label ? ` (${authData.data.label})` : '';
        const limitStr = authData?.data?.limit != null ? ` • Credit limit: $${authData.data.limit}` : '';
        return {
          ok: true,
          message: `OpenRouter key verified${keyLabel}${limitStr}. Ready to teach!`,
        };
      }

      // Generic OpenAI-compatible endpoint verification
      const url = `${baseUrl}/models`;
      const headers: Record<string, string> = {};
      if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
      }

      const res = await fetch(url, { headers, signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        return { ok: true, message: 'Endpoint & model list connected successfully.' };
      }

      // If /models returned 401 or 403, report credentials error directly
      if (res.status === 401 || res.status === 403) {
        return { ok: false, error: `Authentication failed (${res.status}). Please check your API key.` };
      }

      // Fallback: test minimal generation
      const testGen = await this.generate(config, {
        systemPrompt: 'Respond with {"ok":true}',
        messages: [{ role: 'user', content: 'ping' }],
      });
      return { ok: Boolean(testGen), message: 'Model test completed successfully.' };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Connection failed. Check your network or base URL.' };
    }
  }
}

export class AnthropicProvider implements LLMProvider {
  async generate(config: ProviderConfig, options: GenerateOptions): Promise<string> {
    const baseUrl = (config.baseUrl || 'https://api.anthropic.com/v1').replace(/\/+$/, '');
    const url = `${baseUrl}/messages`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model || 'claude-3-5-haiku-20241022',
        max_tokens: 4096,
        system: options.systemPrompt,
        messages: options.messages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
        temperature: options.temperature ?? 0.3,
      }),
    });

    if (!res.ok) {
      throw new Error(`Anthropic request failed (${res.status}): ${await res.text()}`);
    }

    const data: any = await res.json();
    const textBlock = data.content?.find((c: any) => c.type === 'text');
    return textBlock?.text || '';
  }

  async validate(config: ProviderConfig): Promise<{ ok: boolean; error?: string }> {
    try {
      const test = await this.generate(config, {
        systemPrompt: 'Respond with {"status":"ok"}',
        messages: [{ role: 'user', content: 'ping' }],
      });
      return { ok: Boolean(test) };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }
}

export class GeminiProvider implements LLMProvider {
  async generate(config: ProviderConfig, options: GenerateOptions): Promise<string> {
    const model = config.model || 'gemini-2.0-flash';
    const baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com';
    const url = `${baseUrl}/v1beta/models/${model}:generateContent?key=${config.apiKey}`;

    const contents = options.messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: options.systemPrompt }] },
        contents,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: options.temperature ?? 0.3,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Gemini request failed (${res.status}): ${await res.text()}`);
    }

    const data: any = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  async validate(config: ProviderConfig): Promise<{ ok: boolean; error?: string }> {
    try {
      const test = await this.generate(config, {
        systemPrompt: 'Respond with {"status":"ok"}',
        messages: [{ role: 'user', content: 'ping' }],
      });
      return { ok: Boolean(test) };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }
}

export function getLLMProvider(provider: ProviderConfig['provider']): LLMProvider {
  switch (provider) {
    case 'anthropic':
      return new AnthropicProvider();
    case 'gemini':
      return new GeminiProvider();
    case 'openai':
    case 'openai-compatible':
    case 'openai_compatible':
    case 'openrouter':
    case 'groq':
    case 'ollama':
    default:
      return new OpenAICompatibleProvider();
  }
}

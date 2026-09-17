import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldCheckIcon,
  EyeIcon,
  EyeOffIcon,
  XIcon,
  CheckIcon,
  SparklesIcon,
  SearchIcon,
  RefreshCwIcon,
  CpuIcon,
  LayersIcon,
  KeyIcon,
  GlobeIcon,
  ActivityIcon,
  RotateCcwIcon,
  SlidersIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  SettingsIcon,
  ZapIcon,
  Volume2Icon,
} from '../icons/Icons';

export interface ProviderSettings {
  provider: 'openrouter' | 'openai' | 'anthropic' | 'gemini' | 'groq' | 'ollama' | 'openai_compatible';
  apiKey: string;
  baseUrl?: string;
  model: string;
}

export interface TutorUserSettings {
  providerConfig: ProviderSettings;
  autoSpeak: boolean;
  voiceRate: number;
  voiceName?: string;
  voiceEngine?: 'neural' | 'browser';
}

export interface ModelOption {
  id: string;
  label: string;
  group?: string;
  isFree?: boolean;
}

// Curated OpenRouter models with emphasis on Free Tier and top flagship models
export const STATIC_OPENROUTER_MODELS: ModelOption[] = [
  // Free Tier
  { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', label: 'NVIDIA: Nemotron 3 Ultra (Free)', group: 'Free Tier', isFree: true },
  { id: 'nvidia/nemotron-3.5-lightning:free', label: 'NVIDIA: Nemotron 3.5 Lightning (Free)', group: 'Free Tier', isFree: true },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'NVIDIA: Nemotron 3 Super (Free)', group: 'Free Tier', isFree: true },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Meta Llama 3.3 70B (Free)', group: 'Free Tier', isFree: true },
  { id: 'meta-llama/llama-3.1-8b-instruct:free', label: 'Meta Llama 3.1 8B (Free)', group: 'Free Tier', isFree: true },
  { id: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash Exp (Free)', group: 'Free Tier', isFree: true },
  { id: 'qwen/qwen-2.5-coder-32b-instruct:free', label: 'Qwen 2.5 Coder 32B (Free)', group: 'Free Tier', isFree: true },
  { id: 'deepseek/deepseek-r1:free', label: 'DeepSeek R1 (Free)', group: 'Free Tier', isFree: true },
  { id: 'mistralai/mistral-7b-instruct:free', label: 'Mistral 7B Instruct (Free)', group: 'Free Tier', isFree: true },
  // Flagship Models
  { id: 'anthropic/claude-3.7-sonnet', label: 'Claude 3.7 Sonnet (Hybrid Reasoning)', group: 'Flagship Models' },
  { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet (Anthropic)', group: 'Flagship Models' },
  { id: 'openai/gpt-4o', label: 'GPT-4o (Omni Flagship)', group: 'Flagship Models' },
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini (Ultra-Fast)', group: 'Flagship Models' },
  { id: 'openai/o3-mini', label: 'OpenAI o3-mini (Advanced STEM Reasoning)', group: 'Flagship Models' },
  { id: 'deepseek/deepseek-chat', label: 'DeepSeek V3 (Chat)', group: 'Flagship Models' },
  { id: 'deepseek/deepseek-r1', label: 'DeepSeek R1 (Reasoning)', group: 'Flagship Models' },
  { id: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash (Google)', group: 'Flagship Models' },
  { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Meta Llama 3.3 70B Instruct', group: 'Flagship Models' },
  { id: 'mistralai/mistral-nemo', label: 'Mistral Nemo (12B)', group: 'Flagship Models' },
];

export const STATIC_PROVIDER_MODELS: Record<string, ModelOption[]> = {
  openrouter: STATIC_OPENROUTER_MODELS,
  openai: [
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast, Intelligent & Economical)' },
    { id: 'gpt-4o', label: 'GPT-4o (Omni Flagship Reasoning & Vision)' },
    { id: 'o3-mini', label: 'o3-mini (Advanced Mathematics & STEM Reasoning)' },
    { id: 'o1', label: 'o1 (Deep Reasoning Model)' },
    { id: 'o1-mini', label: 'o1-mini (Fast Reasoning)' },
    { id: 'gpt-4-turbo', label: 'GPT-4 Turbo (128k Context)' },
    { id: 'chatgpt-4o-latest', label: 'ChatGPT-4o Latest (Continuous Checkpoint)' },
    { id: 'custom', label: 'Custom Model ID...' },
  ],
  anthropic: [
    { id: 'claude-3-7-sonnet-latest', label: 'Claude 3.7 Sonnet (Hybrid Reasoning & Vision)' },
    { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Standard)' },
    { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (Ultra-Fast & Responsive)' },
    { id: 'claude-3-opus-20240229', label: 'Claude 3 Opus (Deep Synthesis)' },
    { id: 'custom', label: 'Custom Model ID...' },
  ],
  gemini: [
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Fast & Capable Multimodal)' },
    { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite (Cost Efficient)' },
    { id: 'gemini-2.0-pro-exp-02-05', label: 'Gemini 2.0 Pro Experimental' },
    { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (2M Token Deep Context)' },
    { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (1M Token Context)' },
    { id: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B (High Throughput)' },
    { id: 'custom', label: 'Custom Model ID...' },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile (Ultra-Fast LPU)' },
    { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant (~800 tokens/sec)' },
    { id: 'deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 Distill Llama 70B (Fast Reasoning)' },
    { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B (MoE Architecture)' },
    { id: 'gemma2-9b-it', label: 'Gemma 2 9B Instruct' },
    { id: 'custom', label: 'Custom Model ID...' },
  ],
  ollama: [
    { id: 'llama3.3', label: 'Llama 3.3 (Local 70B Instruct)' },
    { id: 'llama3.2', label: 'Llama 3.2 (Local 3B / 1B Edge)' },
    { id: 'deepseek-r1:8b', label: 'DeepSeek R1 8B (Local Reasoning)' },
    { id: 'deepseek-r1:14b', label: 'DeepSeek R1 14B (Local Reasoning)' },
    { id: 'qwen2.5-coder:7b', label: 'Qwen 2.5 Coder 7B (Local Code & Diagram)' },
    { id: 'qwen2.5-coder:14b', label: 'Qwen 2.5 Coder 14B' },
    { id: 'mistral-nemo', label: 'Mistral Nemo (Local 12B)' },
    { id: 'mistral', label: 'Mistral 7B (Local)' },
    { id: 'phi4', label: 'Phi-4 14B (Local Microsoft)' },
    { id: 'custom', label: 'Custom Model ID...' },
  ],
  openai_compatible: [
    { id: 'custom', label: 'Custom Endpoint Model...' },
  ],
};

const DEFAULT_BASE_URLS: Record<string, string> = {
  openrouter: 'https://openrouter.ai/api/v1',
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
  gemini: 'https://generativelanguage.googleapis.com',
  groq: 'https://api.groq.com/openai/v1',
  ollama: 'http://localhost:11434/v1',
  openai_compatible: 'https://api.openai.com/v1',
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TutorUserSettings;
  onSave: (newSettings: TutorUserSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const initialProvider = settings.providerConfig.provider || 'openrouter';
  const [provider, setProvider] = useState<ProviderSettings['provider']>(initialProvider);
  const [apiKey, setApiKey] = useState<string>(settings.providerConfig.apiKey || '');
  const [baseUrl, setBaseUrl] = useState<string>(
    settings.providerConfig.baseUrl || DEFAULT_BASE_URLS[initialProvider] || ''
  );
  const [selectedModel, setSelectedModel] = useState<string>(
    settings.providerConfig.model || 'nvidia/nemotron-3-ultra-550b-a55b:free'
  );
  const [customModelId, setCustomModelId] = useState<string>(
    settings.providerConfig.model || 'nvidia/nemotron-3-ultra-550b-a55b:free'
  );
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [autoSpeak, setAutoSpeak] = useState<boolean>(settings.autoSpeak ?? true);
  const [voiceRate, setVoiceRate] = useState<number>(settings.voiceRate ?? 1.0);
  const [voiceName, setVoiceName] = useState<string>(
    settings.voiceName || 'en-US-ChristopherNeural'
  );
  const [voiceEngine, setVoiceEngine] = useState<'neural' | 'browser'>(
    settings.voiceEngine || 'neural'
  );
  const [isTestingVoice, setIsTestingVoice] = useState<boolean>(false);

  // Dynamic OpenRouter catalog state
  const [dynamicOpenRouterModels, setDynamicOpenRouterModels] = useState<ModelOption[]>(STATIC_OPENROUTER_MODELS);
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [freeOnly, setFreeOnly] = useState<boolean>(false);

  const [testStatus, setTestStatus] = useState<{
    loading: boolean;
    success?: boolean;
    message?: string;
  }>({ loading: false });

  const handleTestVoice = async () => {
    setIsTestingVoice(true);
    const sampleText = voiceName.startsWith('ur-')
      ? 'السلام علیکم، میں آپ کا گرافیکل اے آئی ٹیوٹر ہوں۔'
      : 'Hello! I am your Graphical AI Tutor, ready to teach concepts step by step on the whiteboard.';

    try {
      if (voiceEngine === 'neural') {
        const res = await fetch('/api/tutor/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: sampleText, voice: voiceName, rate: '+0%' }),
        });
        if (res.ok) {
          const blob = await res.blob();
          const audio = new Audio(URL.createObjectURL(blob));
          audio.onended = () => setIsTestingVoice(false);
          audio.onerror = () => setIsTestingVoice(false);
          await audio.play();
          return;
        }
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const ut = new SpeechSynthesisUtterance(sampleText);
        ut.lang = voiceName.startsWith('ur-') ? 'ur-PK' : 'en-US';
        ut.onend = () => setIsTestingVoice(false);
        ut.onerror = () => setIsTestingVoice(false);
        window.speechSynthesis.speak(ut);
      } else {
        setIsTestingVoice(false);
      }
    } catch {
      setIsTestingVoice(false);
    }
  };

  const handleSave = () => {
    onSave({
      providerConfig: {
        provider,
        apiKey: apiKey.trim(),
        baseUrl: baseUrl || undefined,
        model: getEffectiveModel(),
      },
      autoSpeak,
      voiceRate,
      voiceName,
      voiceEngine,
    });
    onClose();
  };

  // Fetch full OpenRouter catalog from server proxy
  const fetchOpenRouterModels = useCallback(async () => {
    setIsLoadingModels(true);
    try {
      const res = await fetch('/api/tutor/openrouter/models');
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.models) && data.models.length > 0) {
        const mapped: ModelOption[] = data.models.map((m: any) => ({
          id: m.id,
          label: `${m.name || m.id}${m.isFree ? ' (Free)' : ''}`,
          isFree: Boolean(m.isFree),
          group: m.isFree ? 'Free Tier' : 'All Models',
        }));
        setDynamicOpenRouterModels(mapped);
      }
    } catch (err) {
      console.warn('Could not load dynamic OpenRouter models, using static list:', err);
    } finally {
      setIsLoadingModels(false);
    }
  }, []);

  // Preload OpenRouter catalog whenever modal opens or provider changes to openrouter
  useEffect(() => {
    if (provider === 'openrouter') {
      void fetchOpenRouterModels();
    }
  }, [provider, fetchOpenRouterModels]);

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProv = e.target.value as ProviderSettings['provider'];
    setProvider(newProv);
    setBaseUrl(DEFAULT_BASE_URLS[newProv] || '');

    if (newProv === 'openrouter') {
      setSelectedModel('nvidia/nemotron-3-ultra-550b-a55b:free');
      setCustomModelId('nvidia/nemotron-3-ultra-550b-a55b:free');
      void fetchOpenRouterModels();
    } else {
      const options = STATIC_PROVIDER_MODELS[newProv] || [];
      const firstNonCustom = options.find((o) => o.id !== 'custom');
      if (firstNonCustom) {
        setSelectedModel(firstNonCustom.id);
        setCustomModelId(firstNonCustom.id);
      } else {
        setSelectedModel('custom');
      }
    }
  };

  const handleModelSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedModel(val);
    if (val !== 'custom') {
      setCustomModelId(val);
    }
  };

  const getEffectiveModel = (): string => {
    return selectedModel === 'custom' ? customModelId.trim() : selectedModel;
  };

  const handleTestConnection = async () => {
    setTestStatus({ loading: true });
    try {
      const effectiveModel = getEffectiveModel();
      const res = await fetch('/api/tutor/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerConfig: {
            provider,
            apiKey: apiKey.trim(),
            baseUrl: baseUrl || undefined,
            model: effectiveModel,
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setTestStatus({
          loading: false,
          success: true,
          message: data.message || 'Connection verified. Tutor is ready!',
        });
      } else {
        setTestStatus({
          loading: false,
          success: false,
          message: data.error || 'Connection failed. Please check your credentials.',
        });
      }
    } catch (err: any) {
      setTestStatus({
        loading: false,
        success: false,
        message: err.message || 'Network error during connection test.',
      });
    }
  };

  // Filtered OpenRouter models based on search query & free toggle

  const filteredOpenRouterModels = useMemo(() => {
    let list = dynamicOpenRouterModels;
    if (freeOnly) {
      list = list.filter((m) => m.isFree || m.id.endsWith(':free'));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((m) => m.id.toLowerCase().includes(q) || m.label.toLowerCase().includes(q));
    }
    return list;
  }, [dynamicOpenRouterModels, freeOnly, searchQuery]);

  const currentModelOptions = useMemo(() => {
    if (provider !== 'openrouter') {
      return STATIC_PROVIDER_MODELS[provider] || [{ id: 'custom', label: 'Custom Model ID...' }];
    }
    const list = [...filteredOpenRouterModels];
    // If selectedModel is not in the filtered results, ensure it's still present in the dropdown
    if (selectedModel && selectedModel !== 'custom' && !list.some((m) => m.id === selectedModel)) {
      const found = dynamicOpenRouterModels.find((m) => m.id === selectedModel);
      if (found) {
        list.unshift(found);
      } else {
        list.unshift({ id: selectedModel, label: `${selectedModel} (Selected)` });
      }
    }
    return list;
  }, [provider, filteredOpenRouterModels, selectedModel, dynamicOpenRouterModels]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SettingsIcon size={18} style={{ color: 'var(--apple-blue)' }} />
            <h2 style={{ margin: 0 }}>Tutor Settings & BYOK</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close" title="Close">
            <XIcon size={16} />
          </button>
        </div>

        <div className="modal-body">
          {/* Privacy Guarantee Badge */}
          <div className="badge-privacy">
            <ShieldCheckIcon size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Student Privacy First:</strong> Your API keys and custom model preferences are stored locally in your browser and used only for direct lesson requests.
            </div>
          </div>

          {/* AI Provider Selection */}
          <div className="form-group">
            <label htmlFor="provider-select" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CpuIcon size={14} style={{ color: 'var(--apple-blue)' }} />
              <span>AI Provider</span>
            </label>
            <select
              id="provider-select"
              className="form-select"
              value={provider}
              onChange={handleProviderChange}
            >
              <option value="openrouter">OpenRouter (Unified Gateway — 400+ Free & Flagship Models)</option>
              <option value="openai">OpenAI (Direct API — GPT-4o, o3-mini, o1)</option>
              <option value="anthropic">Anthropic (Claude 3.7 Sonnet / 3.5 Haiku)</option>
              <option value="gemini">Google Gemini (Gemini 2.0 Flash / 1.5 Pro)</option>
              <option value="groq">Groq (Ultra-Fast Inference — LPU)</option>
              <option value="ollama">Ollama (Local Offline Open-Source)</option>
              <option value="openai_compatible">Custom OpenAI-Compatible Endpoint</option>
            </select>
          </div>

          {/* OpenRouter Search & Filter Bar */}
          {provider === 'openrouter' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: '100%', paddingLeft: '32px', boxSizing: 'border-box' }}
                    placeholder="Search 400+ models (e.g. nemo, llama, claude, deepseek, free)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <div style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-tertiary)' }}>
                    <SearchIcon size={14} />
                  </div>
                </div>
                <button
                  type="button"
                  className="apple-btn-secondary"
                  style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={fetchOpenRouterModels}
                  disabled={isLoadingModels}
                  title="Refresh models catalog"
                >
                  <RefreshCwIcon size={13} className={isLoadingModels ? 'spinner' : ''} />
                  <span style={{ fontSize: '11.5px' }}>{isLoadingModels ? 'Syncing' : 'Refresh'}</span>
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={freeOnly}
                    onChange={(e) => setFreeOnly(e.target.checked)}
                  />
                  <span>Show free community models only</span>
                </label>
                <span>
                  {filteredOpenRouterModels.length} of {dynamicOpenRouterModels.length} models
                </span>
              </div>
            </div>
          )}

          {/* Model Selection Dropdown */}
          <div className="form-group">
            <label htmlFor="model-select" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <LayersIcon size={14} style={{ color: 'var(--apple-blue)' }} />
              <span>Select Model</span>
            </label>
            <select
              id="model-select"
              className="form-select"
              value={selectedModel}
              onChange={handleModelSelectChange}
            >
              {currentModelOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
              <option value="custom">Custom Model ID...</option>
            </select>
            {selectedModel === 'custom' && (
              <input
                type="text"
                className="form-input"
                style={{ marginTop: '8px' }}
                placeholder="Enter exact model ID (e.g. nvidia/nemotron-3-ultra-550b-a55b:free)"
                value={customModelId}
                onChange={(e) => setCustomModelId(e.target.value)}
              />
            )}
            <span className="form-help">
              {provider === 'openrouter'
                ? `Active model: ${getEffectiveModel()}`
                : 'Choose a standard model or enter any custom model ID.'}
            </span>
          </div>

          {/* API Key Input */}
          <div className="form-group">
            <label htmlFor="api-key-input" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <KeyIcon size={14} style={{ color: 'var(--apple-blue)' }} />
              <span>API Key</span>
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="api-key-input"
                type={showApiKey ? 'text' : 'password'}
                className="form-input"
                style={{ flex: 1 }}
                placeholder={
                  provider === 'ollama'
                    ? 'Optional for local Ollama'
                    : provider === 'openrouter'
                    ? 'sk-or-v1-...'
                    : 'sk-...'
                }
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <button
                type="button"
                className="icon-btn"
                style={{ border: '1px solid var(--border-subtle)' }}
                onClick={() => setShowApiKey(!showApiKey)}
                title={showApiKey ? 'Hide key' : 'Show key'}
                aria-label="Toggle API Key Visibility"
              >
                {showApiKey ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
              </button>
            </div>
          </div>

          {/* Base URL Input */}
          <div className="form-group">
            <label htmlFor="base-url-input" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <GlobeIcon size={14} style={{ color: 'var(--apple-blue)' }} />
              <span>Base Endpoint URL</span>
            </label>
            <input
              id="base-url-input"
              type="text"
              className="form-input"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://openrouter.ai/api/v1"
            />
            <span className="form-help">
              Endpoint for OpenRouter (https://openrouter.ai/api/v1) or local Ollama (http://localhost:11434/v1).
            </span>
          </div>

          {/* Test Connection Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
            <button
              type="button"
              className="apple-btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={handleTestConnection}
              disabled={testStatus.loading}
            >
              <ZapIcon size={13} style={{ color: 'var(--apple-orange)' }} />
              <span>{testStatus.loading ? 'Testing...' : 'Test Connection'}</span>
            </button>
            {testStatus.message && (
              <span
                style={{
                  fontSize: '12px',
                  color: testStatus.success ? 'var(--apple-green)' : 'var(--apple-red)',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {testStatus.success ? <CheckCircleIcon size={14} /> : <AlertCircleIcon size={14} />}
                <span>{testStatus.message}</span>
              </span>
            )}
          </div>

          {/* Voice & Neural Speech Settings */}
          <div className="form-group" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
              <Volume2Icon size={14} style={{ color: 'var(--apple-blue)' }} />
              <span>Voice & Speech Narration</span>
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  Tutor Voice (English & Urdu):
                </label>
                <select
                  className="apple-select"
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  style={{ width: '100%', height: '32px', fontSize: '12.5px' }}
                >
                  <optgroup label="English Voices">
                    <option value="en-US-ChristopherNeural">Christopher (Male - American Tutor)</option>
                    <option value="en-US-JennyNeural">Jenny (Female - American Teacher)</option>
                    <option value="en-US-GuyNeural">Guy (Male - Conversational)</option>
                    <option value="en-US-AriaNeural">Aria (Female - Expressive)</option>
                    <option value="en-GB-RyanNeural">Ryan (Male - British Accent)</option>
                    <option value="en-GB-SoniaNeural">Sonia (Female - British Accent)</option>
                  </optgroup>
                  <optgroup label="Urdu Voices (اردو)">
                    <option value="ur-PK-UzmaNeural">Uzma (Female - Pakistani Urdu)</option>
                    <option value="ur-PK-AsadNeural">Asad (Male - Pakistani Urdu)</option>
                    <option value="ur-IN-GulNeural">Gul (Female - Indian Urdu)</option>
                    <option value="ur-IN-SalmanNeural">Salman (Male - Indian Urdu)</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  Voice Engine:
                </label>
                <select
                  className="apple-select"
                  value={voiceEngine}
                  onChange={(e) => setVoiceEngine(e.target.value as 'neural' | 'browser')}
                  style={{ width: '100%', height: '32px', fontSize: '12.5px' }}
                >
                  <option value="neural">Edge Neural TTS (Realistic 24kHz)</option>
                  <option value="browser">Browser Built-in (Offline fallback)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', gap: '12px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px' }}>
                <input
                  type="checkbox"
                  checked={autoSpeak}
                  onChange={(e) => setAutoSpeak(e.target.checked)}
                />
                <span>Auto-narrate answers</span>
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Speed:</span>
                <input
                  type="range"
                  min="0.8"
                  max="1.3"
                  step="0.1"
                  value={voiceRate}
                  onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
                  style={{ width: '70px' }}
                />
                <span style={{ fontSize: '12px', minWidth: '28px', color: 'var(--text-secondary)' }}>{voiceRate}x</span>
              </div>

              <button
                type="button"
                className="apple-btn-secondary"
                style={{ padding: '4px 10px', fontSize: '11.5px', height: '28px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                onClick={handleTestVoice}
                disabled={isTestingVoice}
              >
                <Volume2Icon size={12} />
                <span>{isTestingVoice ? 'Playing...' : 'Test Voice'}</span>
              </button>
            </div>
          </div>

        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="apple-btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={onClose}
          >
            <XIcon size={13} />
            <span>Cancel</span>
          </button>
          <button
            type="button"
            className="apple-btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={handleSave}
          >
            <CheckIcon size={13} />
            <span>Save Preferences</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import { TutorChatRequest, TutorResponse, TutorResponseSchema, LessonState, TeachingStep } from './types.js';
import { buildSystemPrompt } from './prompt-builder.js';
import { getLLMProvider } from './llm/provider-adapter.js';
import { compileDrawOperations } from './canvas-compiler.js';
import { searchEducationalImage } from './image-service.js';
import { elements, files, ServerElement } from '../types.js';
import { findMatchingLibrarySymbol } from './library-registry.js';
import { generateIntelligentTopicLesson, findCuratedTopic } from './topic-knowledge.js';
import logger from '../utils/logger.js';

let currentLessonState: LessonState = {
  id: 'lesson_1',
  level: 'beginner',
  completedConcepts: [],
  misconceptions: [],
};

export function getActiveLesson(): LessonState {
  return currentLessonState;
}

export function resetActiveLesson(level: LessonState['level'] = 'beginner'): LessonState {
  currentLessonState = {
    id: `lesson_${Date.now()}`,
    level,
    completedConcepts: [],
    misconceptions: [],
  };
  return currentLessonState;
}

export interface CanvasBounds {
  hasElements: boolean;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
  suggestedStartX: number;
  suggestedStartY: number;
}

export function getCanvasBounds(): CanvasBounds {
  const activeElements = Array.from(elements.values()).filter(el => !el.isDeleted);
  if (activeElements.length === 0) {
    return {
      hasElements: false,
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
      width: 0,
      height: 0,
      suggestedStartX: 120,
      suggestedStartY: 160,
    };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const el of activeElements) {
    const elW = el.width || 140;
    const elH = el.height || 70;
    minX = Math.min(minX, el.x);
    maxX = Math.max(maxX, el.x + elW);
    minY = Math.min(minY, el.y);
    maxY = Math.max(maxY, el.y + elH);
  }

  // If the canvas width is under 1500px, place the new diagram to the right!
  // If the canvas is already very wide, wrap to a new row below.
  let suggestedStartX = 120;
  let suggestedStartY = 160;

  if (maxX < 1500) {
    suggestedStartX = maxX + 140;
    suggestedStartY = Math.max(160, minY);
  } else {
    suggestedStartX = 120;
    suggestedStartY = maxY + 140;
  }

  return {
    hasElements: true,
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    suggestedStartX,
    suggestedStartY,
  };
}

function summarizeCanvas(): string {
  const activeElements = Array.from(elements.values()).filter(el => !el.isDeleted);
  if (activeElements.length === 0) {
    return 'The whiteboard is empty.';
  }

  const summaries = activeElements.slice(0, 30).map(el => {
    const label = (el as any).text || (el as any).label?.text || '';
    const labelPart = label ? ` (label: "${label}")` : '';
    return `[${el.type} id: "${el.id}" at (${Math.round(el.x)}, ${Math.round(el.y)}) w:${Math.round(el.width || 0)} h:${Math.round(el.height || 0)}${labelPart}]`;
  });

  return `Current whiteboard contents (${activeElements.length} elements):\n${summaries.join('\n')}`;
}

const COMMON_STOPWORDS = new Set([
  'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom', 'whose',
  'where', 'when', 'why', 'how', 'does', 'doing', 'done', 'will', 'would',
  'shall', 'should', 'can', 'could', 'may', 'might', 'must', 'have', 'having',
  'with', 'without', 'from', 'into', 'through', 'about', 'above', 'after',
  'before', 'between', 'during', 'under', 'over', 'again', 'further', 'then',
  'once', 'here', 'there', 'both', 'each', 'more', 'most', 'other', 'some',
  'such', 'only', 'same', 'than', 'very', 'just', 'also', 'explain', 'describe',
  'tell', 'learn', 'work', 'works', 'process', 'step', 'first', 'second', 'third',
  'concept', 'conceptually', 'understand', 'overview', 'summary', 'details'
]);

function extractSubjectKeywords(text: string, count: number = 3): string[] {
  const words = text
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !COMMON_STOPWORDS.has(w.toLowerCase()));
  const unique: string[] = [];
  for (const w of words) {
    const capitalized = w.charAt(0).toUpperCase() + w.slice(1);
    if (!unique.some(u => u.toLowerCase() === w.toLowerCase())) {
      unique.push(capitalized);
      if (unique.length >= count) break;
    }
  }
  return unique;
}

function extractAndSanitizeJson(raw: string): any | null {
  if (!raw || typeof raw !== 'string') return null;

  // 1. Match explicit ```json ... ``` code block
  const jsonBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  let candidate = jsonBlockMatch && jsonBlockMatch[1] ? jsonBlockMatch[1].trim() : '';

  // 2. If no code block or candidate is empty, locate outer-most braces { ... }
  if (!candidate) {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      candidate = raw.substring(start, end + 1).trim();
    }
  }

  if (!candidate) return null;

  // Clean trailing commas before } or ]
  const cleanTrailing = candidate.replace(/,\s*([\}\]])/g, '$1');

  try {
    return JSON.parse(cleanTrailing);
  } catch (e1) {
    // Try to balance braces/brackets if truncated
    try {
      let openBraces = (cleanTrailing.match(/\{/g) || []).length;
      let closeBraces = (cleanTrailing.match(/\}/g) || []).length;
      let openBrackets = (cleanTrailing.match(/\[/g) || []).length;
      let closeBrackets = (cleanTrailing.match(/\]/g) || []).length;
      let patched = cleanTrailing;
      while (closeBrackets < openBrackets) {
        patched += ']';
        closeBrackets++;
      }
      while (closeBraces < openBraces) {
        patched += '}';
        closeBraces++;
      }
      patched = patched.replace(/,\s*([\}\]])/g, '$1');
      return JSON.parse(patched);
    } catch (e2) {
      // Unescaped newlines inside strings repair
      try {
        const sanitized = cleanTrailing
          .replace(/(?<=:\s*"[^"]*)\r?\n([^"]*")/g, '\\n$1')
          .replace(/\t/g, '  ');
        return JSON.parse(sanitized);
      } catch (e3) {
        logger.warn('Failed to parse candidate JSON, falling back to topic-faithful synthesis');
        return null;
      }
    }
  }
}

function synthesizeTopicSteps(
  question: string,
  answer: string,
  explanation: string = '',
  topic?: string,
  startX: number = 140,
  startY: number = 220
): any[] {
  const curated = findCuratedTopic(question + ' ' + (topic || ''));
  if (curated) {
    return curated.generateSteps(startX, startY);
  }

  const cleanAnswer = answer.replace(/[#*_`]/g, '').trim();
  const cleanExp = explanation.replace(/[#*_`]/g, '').trim();
  const narrative = cleanExp.length > cleanAnswer.length ? cleanExp : cleanAnswer;

  const sentences = narrative
    .split(/(?<=[.?!])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);

  const cleanQ = question.replace(/[^\w\s]/gi, ' ').trim();
  const qTopic = topic || cleanQ.split(/\s+/).filter(w => w.length > 2 && !COMMON_STOPWORDS.has(w.toLowerCase())).slice(0, 3).join(' ') || 'Core Concept';

  const s1Text = sentences.slice(0, 2).join(' ') || cleanAnswer.slice(0, 180) || `Let us explore ${qTopic} and examine the starting inputs.`;
  const s2Text = sentences.slice(2, 4).join(' ') || (sentences[1] ? sentences[1] : `The core mechanism and transformation takes place through key interactions.`);
  const s3Text = sentences.slice(4, 7).join(' ') || (sentences[2] ? sentences[2] : `This produces the final outputs and real-world results.`);

  const s1Keywords = extractSubjectKeywords(question + ' ' + s1Text, 2);
  const s2Keywords = extractSubjectKeywords(s2Text, 2);
  const s3Keywords = extractSubjectKeywords(s3Text, 2);

  const step1Label = s1Keywords.length > 0 ? s1Keywords.join(' & ') : `${qTopic} (Inputs)`;
  const step2Label = s2Keywords.length > 0 ? s2Keywords.join(' & ') : 'Core Mechanism';
  const step3Label = s3Keywords.length > 0 ? s3Keywords.join(' & ') : 'Outputs & Impact';

  const step1Draw = [
    {
      op: 'box',
      id: 'step1_input',
      x: startX,
      y: startY,
      w: 180,
      h: 65,
      label: step1Label.slice(0, 28),
      color: '#2b8a3e',
      bgColor: '#ebfbee',
    },
  ];

  // Check if topic matches any rich compound vector library symbol
  const matchedSymbol = findMatchingLibrarySymbol(qTopic + ' ' + question);
  let step2Draw: any[];
  if (matchedSymbol) {
    step2Draw = [
      {
        op: 'library_symbol',
        id: 'step2_mechanism',
        symbol: matchedSymbol.id,
        x: startX + 280,
        y: startY - 20,
        label: step2Label.slice(0, 28),
        scale: 1.0,
      },
      {
        op: 'arrow',
        id: 'step2_arrow',
        from: 'step1_input',
        to: 'step2_mechanism',
        label: 'powers / initiates',
        color: '#2b8a3e',
      },
    ];
  } else {
    step2Draw = [
      {
        op: 'ellipse',
        id: 'step2_mechanism',
        x: startX + 280,
        y: startY,
        w: 190,
        h: 75,
        label: step2Label.slice(0, 28),
        color: '#e67700',
        bgColor: '#fff9db',
      },
      {
        op: 'arrow',
        id: 'step2_arrow',
        from: 'step1_input',
        to: 'step2_mechanism',
        label: 'powers / initiates',
        color: '#e67700',
      },
    ];
  }

  const step3Draw = [
    {
      op: 'box',
      id: 'step3_output',
      x: startX + 580,
      y: startY,
      w: 180,
      h: 65,
      label: step3Label.slice(0, 28),
      color: '#1971c2',
      bgColor: '#e7f5ff',
    },
    {
      op: 'arrow',
      id: 'step3_arrow',
      from: 'step2_mechanism',
      to: 'step3_output',
      label: 'yields / produces',
      color: '#1971c2',
    },
    {
      op: 'note',
      id: 'step3_takeaway',
      x: startX + 160,
      y: startY + 140,
      w: 360,
      h: 90,
      text: `Why We Need It (${qTopic}): ${s3Text.slice(0, 85)}... Essential for real-world functioning.`,
      color: '#e67700',
      bgColor: '#fff9db',
    },
  ];

  return [
    {
      stepNumber: 1,
      title: `1. What It Is & Key Inputs (${step1Label.slice(0, 20)})`,
      speech: `Let's understand what ${qTopic} is! Rather than memorizing dry definitions, think of it intuitively. It starts with the core inputs: ${s1Text}`,
      explanation: `### 1. What is it? (The Intuitive Hook)\n\n${s1Text}\n\n### Starting Conditions & Inputs\nWe start by mapping the fundamental components on our whiteboard: **${step1Label}**.`,
      draw: step1Draw,
      highlightElementIds: ['step1_input'],
    },
    {
      stepNumber: 2,
      title: `2. How It Works: The Mechanism (${step2Label.slice(0, 20)})`,
      speech: `Now, how does it actually work? Inside the system, the transformation happens right here: ${s2Text}`,
      explanation: `### 2. How It Works (Step-by-Step Mechanics)\n\n${s2Text}\n\nNotice how the inputs interact with the central mechanism (**${step2Label}**) to drive the process forward.`,
      draw: step2Draw,
      highlightElementIds: ['step2_mechanism'],
    },
    {
      stepNumber: 3,
      title: `3. Results & Why We Need It (${step3Label.slice(0, 20)})`,
      speech: `Finally, what are the results and why do we need this? ${s3Text} Without this process, the entire system would break down.`,
      explanation: `### 3. Why We Need It & Real-World Impact\n\n${s3Text}\n\n**Why it matters**: Without ${qTopic}, the ecosystem, physical process, or architecture could not achieve equilibrium or accomplish its purpose.`,
      draw: step3Draw,
      highlightElementIds: ['step3_output', 'step3_takeaway'],
    },
  ];
}

export async function handleTutorChat(
  request: TutorChatRequest,
  applyElements: (elements: ServerElement[]) => void
): Promise<TutorResponse> {
  const level = request.level || 'beginner';
  const providerConfig = request.providerConfig || {
    provider: (process.env.DEFAULT_PROVIDER as any) || 'openrouter',
    apiKey: process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY || '',
    model: process.env.DEFAULT_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
  };

  const canvasBounds = getCanvasBounds();
  const canvasSummary = summarizeCanvas();
  const systemPrompt = buildSystemPrompt(level, canvasSummary, {
    startX: canvasBounds.suggestedStartX,
    startY: canvasBounds.suggestedStartY,
  });

  const history = request.history || [];
  const messages = [
    ...history,
    { role: 'user' as const, content: request.message },
  ];

  const provider = getLLMProvider(providerConfig.provider);

  logger.info(`Tutor invoking LLM provider: ${providerConfig.provider} for level: ${level}`);

  let rawOutput = '';
  let providerFailed = false;
  try {
    rawOutput = await provider.generate(providerConfig, {
      systemPrompt,
      messages,
      temperature: 0.2,
    });
  } catch (err: any) {
    logger.warn('LLM generation error, activating Socratic topic knowledge engine:', err.message);
    providerFailed = true;
  }

  let parsedResponse: TutorResponse;

  if (providerFailed || !rawOutput || !rawOutput.trim()) {
    // LLM unreachable or empty -> synthesize intelligent Socratic lesson directly from topic knowledge base
    const intelligentLesson = await generateIntelligentTopicLesson(
      request.message,
      level,
      canvasBounds.suggestedStartX,
      canvasBounds.suggestedStartY
    );
    parsedResponse = {
      answer: intelligentLesson.answer,
      explanation: intelligentLesson.explanation,
      level,
      steps: intelligentLesson.steps,
      draw: [],
      speak: true,
      lesson: {
        topic: intelligentLesson.topicTitle,
      },
    };
  } else {
    const parsedObj = extractAndSanitizeJson(rawOutput);

    if (parsedObj && typeof parsedObj === 'object') {
      if (!parsedObj.answer && parsedObj.explanation) {
        parsedObj.answer = String(parsedObj.explanation).slice(0, 200);
      }
      if (!parsedObj.level) {
        parsedObj.level = level;
      }
      if (Array.isArray(parsedObj.steps)) {
        parsedObj.steps = parsedObj.steps.map((st: any, idx: number) => ({
          stepNumber: typeof st.stepNumber === 'number' ? st.stepNumber : idx + 1,
          title: st.title || st.name || `Phase ${idx + 1}`,
          speech: st.speech || st.explanation || st.text || st.content || st.title || '',
          explanation: st.explanation || st.speech || '',
          draw: Array.isArray(st.draw) ? st.draw : [],
          mermaid: typeof st.mermaid === 'string' ? st.mermaid : undefined,
          highlightElementIds: Array.isArray(st.highlightElementIds) ? st.highlightElementIds : [],
        }));
      }

      const validated = TutorResponseSchema.safeParse(parsedObj);
      if (validated.success) {
        parsedResponse = validated.data;
      } else {
        logger.warn('Tutor response schema issues, normalizing fields:', validated.error.issues);
        parsedResponse = {
          answer: parsedObj.answer || rawOutput.slice(0, 200),
          explanation: parsedObj.explanation || rawOutput,
          level,
          steps: Array.isArray(parsedObj.steps) ? parsedObj.steps : [],
          draw: Array.isArray(parsedObj.draw) ? parsedObj.draw : [],
          speak: true,
        };
      }
    } else {
      logger.info('LLM produced plain text response, checking domain synthesis');
      // If plain text is short or looks like an error, use intelligent domain generator
      if (rawOutput.length < 80 || /trouble connecting|api key|error|cannot connect/i.test(rawOutput)) {
        const intelligentLesson = await generateIntelligentTopicLesson(
          request.message,
          level,
          canvasBounds.suggestedStartX,
          canvasBounds.suggestedStartY
        );
        parsedResponse = {
          answer: intelligentLesson.answer,
          explanation: intelligentLesson.explanation,
          level,
          steps: intelligentLesson.steps,
          draw: [],
          speak: true,
          lesson: {
            topic: intelligentLesson.topicTitle,
          },
        };
      } else {
        parsedResponse = {
          answer: rawOutput.slice(0, 300),
          explanation: rawOutput,
          level,
          steps: [],
          draw: [],
          speak: true,
        };
      }
    }

    // Ensure we have teaching steps with topic-accurate visual drawings and spatial clearance
    if (!parsedResponse.steps || parsedResponse.steps.length === 0) {
      parsedResponse.steps = synthesizeTopicSteps(
        request.message,
        parsedResponse.answer,
        parsedResponse.explanation,
        parsedResponse.lesson?.topic,
        canvasBounds.suggestedStartX,
        canvasBounds.suggestedStartY
      );
    }
  }

  // Search internet (open web, Pinterest, Openverse, Wikipedia) and attach real-world visual analysis phase
  try {
    const topicQuery = parsedResponse.lesson?.topic || request.message;
    const isPinterestPreferred = /pinterest/i.test(request.message);
    const imgResult = await searchEducationalImage(topicQuery, { preferPinterest: isPinterestPreferred } as any);
    if (imgResult) {
      const stepNum = (parsedResponse.steps?.length || 0) + 1;
      const fileDict: Record<string, any> = {
        [imgResult.fileId]: {
          id: imgResult.fileId,
          dataURL: imgResult.dataUrl,
          mimeType: imgResult.mimeType,
          created: Date.now(),
        },
      };

      // Persist to server global files storage so canvas sync never loses the binary
      files.set(imgResult.fileId, {
        id: imgResult.fileId,
        dataURL: imgResult.dataUrl,
        mimeType: imgResult.mimeType,
        created: Date.now(),
      });

      const sourceLabel = imgResult.sourceDomain ? `sourced from ${imgResult.sourceDomain}` : 'from the internet';
      const cleanTitle = imgResult.title.replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, '').slice(0, 45);
      const analysisSpeech = `Now that we've mapped out the core concepts on our whiteboard, let's examine this authentic real-world diagram of ${cleanTitle}, ${sourceLabel}. Notice how the physical organization and detailed structures correspond directly to the step-by-step flow we just illustrated. While our hand-drawn diagram mapped the theoretical mechanism, this real-world graphic reveals the observed spatial arrangement and physical features. Comparing our whiteboard model with this authentic visual gives us a complete, rigorous understanding of ${topicQuery}.`;

      // Position the visual analysis image cleanly to the right of the conceptual diagram
      const imgX = canvasBounds.suggestedStartX + 860;
      const imgY = canvasBounds.suggestedStartY - 20;

      const deepDiveStep: TeachingStep = {
        stepNumber: stepNum,
        title: `${stepNum}. Visual Analysis & Evidence: ${cleanTitle.slice(0, 24)}`,
        speech: analysisSpeech,
        explanation: `### Real-World Visual Analysis & Evidence\n\n![${cleanTitle}](${imgResult.sourceUrl})\n\n**Visual Evidence**: ${cleanTitle}\n**Source**: ${imgResult.sourceDomain || 'Open Web'}\n\n**Tutor Analysis**: This authentic visual corroborates our whiteboard diagram with empirical real-world evidence. Notice how each stage in our drawn whiteboard flow directly aligns with the concrete structures depicted here.`,
        draw: [
          {
            op: 'image',
            id: imgResult.id,
            fileId: imgResult.fileId,
            x: imgX,
            y: imgY,
            w: imgResult.width,
            h: imgResult.height,
            title: cleanTitle,
          },
          {
            op: 'note',
            id: `${imgResult.id}_caption`,
            x: imgX,
            y: imgY + imgResult.height + 15,
            w: Math.max(260, imgResult.width),
            h: 80,
            text: `Visual Analysis: ${cleanTitle}\nSource: ${imgResult.sourceDomain || 'Open Web'}\nCorroborates conceptual whiteboard steps with empirical real-world structure.`,
            color: '#1971c2',
            bgColor: '#e7f5ff',
          },
        ],
        files: fileDict,
        highlightElementIds: [imgResult.id, `${imgResult.id}_caption`],
      };

      parsedResponse.steps.push(deepDiveStep);
      parsedResponse.files = { ...(parsedResponse.files || {}), ...fileDict };

      // Compile image elements directly so they can be placed on the canvas immediately
      const imageCompiled = compileDrawOperations(deepDiveStep.draw!, {
        existingElements: {},
      });
      deepDiveStep.compiledElements = imageCompiled;
      (parsedResponse as any).visualEvidenceElements = imageCompiled;

      parsedResponse.visualEvidence = {
        title: cleanTitle,
        query: topicQuery,
        sourceUrl: imgResult.sourceUrl,
        dataUrl: imgResult.dataUrl,
        mimeType: imgResult.mimeType,
        width: imgResult.width,
        height: imgResult.height,
        analysisSpeech,
        elementId: imgResult.id,
        fileId: imgResult.fileId,
        x: imgX,
        y: imgY,
      };
    }
  } catch (imgErr: any) {
    logger.warn('Non-fatal educational image search error:', imgErr.message);
  }

  // Pre-compile each step's drawings and ensure each step has visual elements
  const existingElementsMap: Record<string, ServerElement> = {};
  elements.forEach((el, id) => {
    existingElementsMap[id] = el;
  });

  const allCompiledElements: ServerElement[] = [];

  const steps = parsedResponse.steps || [];

  // Collision Prevention: If the whiteboard has elements, ensure all newly generated operations
  // start in the open area at or beyond canvasBounds.suggestedStartX
  if (canvasBounds.hasElements) {
    let minOpX = Infinity;
    for (const step of steps) {
      if (Array.isArray(step.draw)) {
        for (const op of step.draw) {
          const opAny = op as any;
          if (typeof opAny.x === 'number' && opAny.op !== 'image') {
            minOpX = Math.min(minOpX, opAny.x);
          }
        }
      }
    }
    if (minOpX < canvasBounds.suggestedStartX && minOpX !== Infinity) {
      const shiftX = canvasBounds.suggestedStartX - minOpX;
      for (const step of steps) {
        if (Array.isArray(step.draw)) {
          for (const op of step.draw) {
            const opAny = op as any;
            if (typeof opAny.x === 'number') {
              opAny.x += shiftX;
            }
          }
        }
      }
    }
  }

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (!step) continue;

    // If step has no drawings, generate step-appropriate visual nodes in the clear coordinate space
    if ((!step.draw || step.draw.length === 0) && !step.mermaid) {
      const nodeX = canvasBounds.suggestedStartX + i * 280;
      const nodeY = canvasBounds.suggestedStartY;
      const nodeColor = i === 0 ? '#2b8a3e' : i === 1 ? '#e67700' : '#1971c2';
      const nodeBg = i === 0 ? '#ebfbee' : i === 1 ? '#fff9db' : '#e7f5ff';
      const stepTitleClean = step.title.replace(/^\d+[\.\s]*/, '').slice(0, 24) || `Phase ${i + 1}`;

      const syntheticDraw: any[] = [
        {
          op: i === 1 ? 'ellipse' : 'box',
          id: `step_${i + 1}_node`,
          x: nodeX,
          y: nodeY,
          w: i === 1 ? 190 : 180,
          h: i === 1 ? 75 : 65,
          label: stepTitleClean,
          color: nodeColor,
          bgColor: nodeBg,
        },
      ];

      if (i > 0) {
        syntheticDraw.push({
          op: 'arrow',
          id: `step_${i + 1}_arr`,
          from: `step_${i}_node`,
          to: `step_${i + 1}_node`,
          label: i === 1 ? 'drives' : 'yields',
          color: nodeColor,
        });
      }

      step.draw = syntheticDraw;
    }

    if (step.draw && step.draw.length > 0) {
      try {
        const stepCompiled = compileDrawOperations(step.draw, {
          existingElements: existingElementsMap,
        });
        step.compiledElements = stepCompiled;
        allCompiledElements.push(...stepCompiled);

        // Update existingElementsMap so subsequent steps can bind arrows to this step's nodes
        stepCompiled.forEach(el => {
          existingElementsMap[el.id] = el;
        });

        if (!step.highlightElementIds || step.highlightElementIds.length === 0) {
          step.highlightElementIds = stepCompiled.map(e => e.id);
        }
      } catch (err: any) {
        logger.error(`Error compiling draw for step ${i + 1}:`, err);
      }
    }
  }

  // Set cumulative draw operations
  if (!parsedResponse.draw || parsedResponse.draw.length === 0) {
    const combinedDraw: any[] = [];
    for (const step of steps) {
      if (step && step.draw) combinedDraw.push(...step.draw);
    }
    parsedResponse.draw = combinedDraw;
  }

  // Only apply elements globally if steps are NOT present (legacy fallback)
  // When steps are present, the client StepPlayer draws each step incrementally with speech
  if ((!parsedResponse.steps || parsedResponse.steps.length === 0) && allCompiledElements.length > 0) {
    logger.info(`Applying ${allCompiledElements.length} elements via legacy global draw`);
    applyElements(allCompiledElements);
  }

  // Update current lesson state
  currentLessonState.level = request.level;
  if (parsedResponse.lesson) {
    if (parsedResponse.lesson.topic) currentLessonState.topic = parsedResponse.lesson.topic;
    if (parsedResponse.lesson.objective) currentLessonState.objective = parsedResponse.lesson.objective;
    if (parsedResponse.lesson.concept) {
      currentLessonState.currentConcept = parsedResponse.lesson.concept;
      if (!currentLessonState.completedConcepts.includes(parsedResponse.lesson.concept)) {
        currentLessonState.completedConcepts.push(parsedResponse.lesson.concept);
      }
    }
  }

  return parsedResponse;
}

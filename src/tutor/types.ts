import { z } from 'zod';

export const LevelSchema = z.enum(['beginner', 'intermediate', 'pro']);
export type Level = z.infer<typeof LevelSchema>;

export const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type Point = z.infer<typeof PointSchema>;

export const RegionSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});
export type Region = z.infer<typeof RegionSchema>;

export const DrawOperationSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('box'),
    id: z.string(),
    x: z.number().optional().default(150),
    y: z.number().optional().default(200),
    w: z.number().optional().default(140),
    h: z.number().optional().default(60),
    label: z.string().optional(),
    color: z.string().optional(),
    bgColor: z.string().optional(),
  }),
  z.object({
    op: z.literal('ellipse'),
    id: z.string(),
    x: z.number().optional().default(150),
    y: z.number().optional().default(200),
    w: z.number().optional().default(120),
    h: z.number().optional().default(60),
    label: z.string().optional(),
    color: z.string().optional(),
    bgColor: z.string().optional(),
  }),
  z.object({
    op: z.literal('diamond'),
    id: z.string(),
    x: z.number().optional().default(150),
    y: z.number().optional().default(200),
    w: z.number().optional().default(100),
    h: z.number().optional().default(100),
    label: z.string().optional(),
    color: z.string().optional(),
    bgColor: z.string().optional(),
  }),
  z.object({
    op: z.literal('database'),
    id: z.string(),
    x: z.number().optional().default(150),
    y: z.number().optional().default(200),
    w: z.number().optional().default(130),
    h: z.number().optional().default(90),
    label: z.string().optional(),
    color: z.string().optional(),
    bgColor: z.string().optional(),
  }),
  z.object({
    op: z.literal('cloud'),
    id: z.string(),
    x: z.number().optional().default(150),
    y: z.number().optional().default(200),
    w: z.number().optional().default(150),
    h: z.number().optional().default(80),
    label: z.string().optional(),
    color: z.string().optional(),
    bgColor: z.string().optional(),
  }),
  z.object({
    op: z.literal('actor'),
    id: z.string(),
    x: z.number().optional().default(150),
    y: z.number().optional().default(200),
    w: z.number().optional().default(120),
    h: z.number().optional().default(60),
    label: z.string().optional(),
    color: z.string().optional(),
  }),
  z.object({
    op: z.literal('queue'),
    id: z.string(),
    x: z.number().optional().default(150),
    y: z.number().optional().default(200),
    w: z.number().optional().default(160),
    h: z.number().optional().default(50),
    label: z.string().optional(),
    color: z.string().optional(),
    bgColor: z.string().optional(),
  }),
  z.object({
    op: z.literal('container'),
    id: z.string(),
    x: z.number().optional().default(100),
    y: z.number().optional().default(100),
    w: z.number().optional().default(300),
    h: z.number().optional().default(200),
    label: z.string().optional(),
    color: z.string().optional(),
    bgColor: z.string().optional(),
  }),
  z.object({
    op: z.literal('note'),
    id: z.string(),
    x: z.number().optional().default(100),
    y: z.number().optional().default(100),
    w: z.number().optional().default(180),
    h: z.number().optional().default(90),
    text: z.string().optional(),
    label: z.string().optional(),
    content: z.string().optional(),
    color: z.string().optional(),
    bgColor: z.string().optional(),
  }),
  z.object({
    op: z.literal('mermaid'),
    id: z.string(),
    syntax: z.string().optional(),
    code: z.string().optional(),
    x: z.number().optional(),
    y: z.number().optional(),
  }),
  z.object({
    op: z.literal('text'),
    id: z.string(),
    x: z.number().optional().default(150),
    y: z.number().optional().default(200),
    text: z.string().optional(),
    label: z.string().optional(),
    content: z.string().optional(),
    fontSize: z.number().optional(),
    color: z.string().optional(),
  }),
  z.object({
    op: z.literal('line'),
    id: z.string(),
    from: PointSchema,
    to: PointSchema,
    color: z.string().optional(),
  }),
  z.object({
    op: z.literal('arrow'),
    id: z.string(),
    from: z.string().optional().default(''), // ID of source element or start coordinate
    to: z.string().optional().default(''),   // ID of target element or end coordinate
    label: z.string().optional(),
    color: z.string().optional(),
  }),
  z.object({
    op: z.literal('group'),
    id: z.string(),
    children: z.array(z.string()),
  }),
  z.object({
    op: z.literal('delete'),
    id: z.string(),
  }),
  z.object({
    op: z.literal('clear_region'),
    region: RegionSchema,
  }),
  z.object({
    op: z.literal('library_symbol'),
    id: z.string(),
    symbol: z.string(),
    library: z.string().optional().default('general'),
    x: z.number().optional().default(150),
    y: z.number().optional().default(200),
    scale: z.number().optional().default(1.0),
    label: z.string().optional(),
  }),
  z.object({
    op: z.literal('image'),
    id: z.string(),
    fileId: z.string(),
    x: z.number().optional().default(150),
    y: z.number().optional().default(200),
    w: z.number().optional().default(400),
    h: z.number().optional().default(300),
    title: z.string().optional(),
  }),
]);
export type DrawOperation = z.infer<typeof DrawOperationSchema>;

export const TeachingStepSchema = z.object({
  stepNumber: z.number().optional(),
  title: z.string().optional().default('Pedagogical Step').describe('Short title of this pedagogical step'),
  speech: z.string().optional().default('').describe('What the tutor says aloud during this step'),
  explanation: z.string().optional().describe('Markdown text for this step'),
  draw: z.array(DrawOperationSchema).optional().default([]).describe('Whiteboard operations drawn during this step'),
  mermaid: z.string().optional().describe('Mermaid diagram code for this step'),
  compiledElements: z.array(z.any()).optional().describe('Pre-compiled Excalidraw elements for this step'),
  files: z.record(z.any()).optional().describe('Excalidraw binary files dictionary'),
  highlightElementIds: z.array(z.string()).optional().default([]).describe('Element IDs to highlight or pulse during this step'),
});
export type TeachingStep = z.infer<typeof TeachingStepSchema>;

export const LessonStateSchema = z.object({
  id: z.string(),
  topic: z.string().optional(),
  level: LevelSchema,
  objective: z.string().optional(),
  currentConcept: z.string().optional(),
  completedConcepts: z.array(z.string()).default([]),
  misconceptions: z.array(z.string()).default([]),
  canvasSnapshot: z.string().optional(),
});
export type LessonState = z.infer<typeof LessonStateSchema>;

export const TutorResponseSchema = z.object({
  answer: z.string().optional().default('').describe('Direct, clear pedagogical answer to the student.'),
  explanation: z.string().optional().default('').describe('Detailed conceptual explanation adapted to the student level.'),
  boardNote: z.string().optional().describe('Summary of what is being drawn or highlighted on the whiteboard.'),
  quickCheck: z.string().optional().describe('Short comprehension checkpoint question for the student.'),
  level: LevelSchema.optional().default('beginner'),
  lesson: z.object({
    topic: z.string().optional(),
    objective: z.string().optional(),
    concept: z.string().optional(),
    nextQuestion: z.string().optional(),
  }).optional(),
  steps: z.array(TeachingStepSchema).optional().default([]).describe('Step-by-step interactive teaching sequence.'),
  draw: z.array(DrawOperationSchema).optional().default([]),
  files: z.record(z.any()).optional().describe('Global Excalidraw binary files dictionary'),
  visualEvidence: z.object({
    title: z.string(),
    query: z.string(),
    sourceUrl: z.string().optional(),
    sourceDomain: z.string().optional(),
    dataUrl: z.string().optional(),
    mimeType: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    analysisSpeech: z.string().optional(),
    elementId: z.string().optional(),
    fileId: z.string().optional(),
    x: z.number().optional(),
    y: z.number().optional(),
  }).optional(),
  visualEvidenceElements: z.array(z.any()).optional().describe('Pre-compiled Excalidraw elements for the visual evidence diagram'),
  speak: z.boolean().optional().default(true),
});
export type TutorResponse = z.infer<typeof TutorResponseSchema>;


export const ProviderConfigSchema = z.object({
  provider: z.enum([
    'openai-compatible',
    'openai_compatible',
    'openrouter',
    'groq',
    'openai',
    'anthropic',
    'gemini',
    'ollama'
  ]),
  baseUrl: z.string().optional(),
  apiKey: z.string().default(''),
  model: z.string().default('gpt-4o-mini'),
});
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface TutorChatRequest {
  message: string;
  level: Level;
  lessonState?: LessonState;
  providerConfig: ProviderConfig;
  history?: ChatMessage[];
}

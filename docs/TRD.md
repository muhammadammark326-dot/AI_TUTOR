# TRD.md — Graphical AI Tutor

## 1. Technical direction

Recommended stack:

- Frontend: React + TypeScript + Vite
- Canvas: Excalidraw frontend/library + the `mcp_excalidraw` canvas server
- Backend: Node.js + TypeScript
- Voice optional backend: Python + faster-whisper + Piper
- Realtime canvas: WebSocket provided by the repository
- HTTP: REST/JSON
- Validation: Zod
- Tests: Vitest + Playwright
- Runtime verification: Reticle
- Security testing: Strix
- Code review: CodeRabbit
- Codebase knowledge graph: Graphify

The system should remain modular enough that Python voice services can be disabled without affecting text/canvas operation.

## 2. Repository strategy

Start from:

`yctimlin/mcp_excalidraw`

Do not rewrite the existing canvas infrastructure unnecessarily.

The upstream project already provides:
- Canvas server.
- REST API.
- WebSocket sync.
- MCP server.
- 26 drawing/scene/state tools.
- CLI.
- Agent skill.
- Import/export.
- Mermaid conversion.
- Screenshot and scene description.
- Snapshots.
- Viewport controls.

Use these capabilities instead of rebuilding equivalent canvas infrastructure.

## 3. Proposed project structure

```text
graphical-ai-tutor/
├─ frontend/
│  ├─ src/
│  │  ├─ app/
│  │  ├─ components/
│  │  │  ├─ chat/
│  │  │  ├─ tutor/
│  │  │  ├─ voice/
│  │  │  ├─ canvas/
│  │  │  └─ settings/
│  │  ├─ hooks/
│  │  ├─ lib/
│  │  │  ├─ llm/
│  │  │  ├─ canvas/
│  │  │  ├─ voice/
│  │  │  └─ security/
│  │  ├─ state/
│  │  └─ types/
│  └─ package.json
├─ server/
│  ├─ src/
│  │  ├─ api/
│  │  ├─ llm/
│  │  ├─ tutor/
│  │  ├─ canvas/
│  │  ├─ voice/
│  │  ├─ security/
│  │  └─ index.ts
│  └─ package.json
├─ voice/
│  ├─ stt/
│  ├─ tts/
│  └─ requirements.txt
├─ docs/
│  ├─ prd.md
│  ├─ trd.md
│  ├─ ui-ux.md
│  └─ architecture.md
├─ .agent/
│  └─ rules/
│     └─ graphical-tutor.md
├─ AGENTS.md
├─ package.json
└─ docker-compose.yml
```

## 4. LLM abstraction

Create a provider-neutral interface:

```ts
interface LLMProvider {
  id: string;
  chat(request: ChatRequest): AsyncIterable<ChatChunk>;
  validate(): Promise<ProviderHealth>;
}
```

Support:
- OpenAI-compatible endpoint.
- OpenAI adapter.
- Future Anthropic/Gemini adapters.
- Local Ollama adapter.

Provider configuration:

```ts
interface ProviderConfig {
  provider: string;
  baseUrl?: string;
  apiKey: string;
  model: string;
}
```

The application must never assume every provider supports tools/function calling.

Therefore the minimum contract is structured JSON output.

## 5. Structured tutor protocol

The LLM response should conform to a schema:

```ts
type TutorResponse = {
  answer: string;
  level: "beginner" | "intermediate" | "pro";
  lesson: {
    objective?: string;
    concept?: string;
    nextQuestion?: string;
  };
  draw?: DrawOperation[];
  speak?: boolean;
};
```

Every `draw` operation is validated before execution.

## 6. Drawing DSL

Define a small internal DSL:

```ts
type DrawOperation =
  | { op: "text"; id: string; x: number; y: number; text: string }
  | { op: "box"; id: string; x: number; y: number; w: number; h: number; label?: string }
  | { op: "ellipse"; id: string; x: number; y: number; w: number; h: number; label?: string }
  | { op: "diamond"; id: string; x: number; y: number; w: number; h: number; label?: string }
  | { op: "line"; id: string; from: Point; to: Point }
  | { op: "arrow"; id: string; from: string; to: string; label?: string }
  | { op: "group"; id: string; children: string[] }
  | { op: "delete"; id: string }
  | { op: "clear_region"; region: Region };
```

Later extensions can include:
- graph,
- chart,
- table,
- timeline,
- image,
- Mermaid,
- LaTeX/math.

## 7. Canvas adapter

Create:

```ts
interface CanvasAdapter {
  create(elements: CanvasElement[]): Promise<void>;
  update(elements: CanvasElement[]): Promise<void>;
  delete(ids: string[]): Promise<void>;
  describe(): Promise<CanvasDescription>;
  screenshot(): Promise<CanvasScreenshot>;
  snapshot(name: string): Promise<void>;
  restore(name: string): Promise<void>;
  export(): Promise<ExcalidrawFile>;
}
```

The implementation should call the existing repository's REST/MCP capabilities rather than duplicate Excalidraw internals.

## 8. Drawing loop

Recommended loop:

```text
student question
      ↓
LLM teacher
      ↓
TutorResponse JSON
      ↓
Zod validation
      ↓
Drawing planner
      ↓
Canvas adapter
      ↓
scene description / screenshot
      ↓
layout validator
      ↓
repair if needed
      ↓
viewport fit
```

Do not automatically run a repair loop forever.

Maximum:
- initial draw
- one validation
- one repair
- final validation

unless the task explicitly requires a more complex iterative process.

## 9. Teacher context

The LLM receives a structured context:

```ts
type TutorContext = {
  level: Level;
  subject?: string;
  topic?: string;
  lessonState: LessonState;
  conversation: Message[];
  canvasDescription?: CanvasDescription;
  selectedElements?: string[];
};
```

Avoid sending the complete canvas JSON on every request. Prefer:
1. scene summary,
2. relevant selected elements,
3. screenshot when necessary,
4. full element data only for targeted operations.

## 10. Voice architecture

### Default browser path

Use:
- `SpeechRecognition` / `webkitSpeechRecognition` when available.
- `SpeechSynthesis` for output.

Advantages:
- zero server infrastructure,
- low latency,
- easy MVP,
- no additional API key.

### Robust path

Provide an optional local voice service:

```text
Browser
  ↓ MediaRecorder
Node server
  ↓
Python voice service
  ↓
faster-whisper
  ↓ transcript
Node server
  ↓
Tutor
```

For TTS:

```text
Tutor response
  ↓
Python voice service
  ↓
Piper
  ↓ audio stream
Browser
```

This is the preferred high-control/self-hosted option for later versions.

Do not make Python a hard dependency for the first MVP.

## 11. Voice state machine

```text
IDLE
 ↓
LISTENING
 ↓
TRANSCRIBING
 ↓
READY_TO_SEND
 ↓
THINKING
 ↓
SPEAKING
 ↓
IDLE
```

Errors return to IDLE with a user-visible message.

## 12. Security

Critical requirements:
- API keys are secrets.
- Never render keys in logs.
- Never put keys into canvas data.
- Never put keys into lesson exports.
- Never send keys to the LLM as prompt content.
- Validate user-supplied base URLs.
- Protect against SSRF if the server makes outbound requests.
- Rate-limit local endpoints where appropriate.
- Sanitize rendered markdown/HTML.
- Restrict arbitrary URL fetching.
- Never allow LLM output to execute shell commands.
- Drawing DSL is data, not executable code.

Strix should be used against the running app only with authorization.

## 13. Persistence

MVP:
- LocalStorage/IndexedDB for non-sensitive lesson metadata.
- Session-only API keys unless secure persistence is explicitly implemented.

Later:
- SQLite for local desktop/local-server persistence.
- Encrypted secret storage.

## 14. Performance

- Stream LLM text.
- Apply canvas operations in batches.
- Debounce scene inspection.
- Do not screenshot after every single element.
- Use viewport fitting after a drawing batch.
- Keep canvas operations deterministic.
- Avoid giant prompts containing the whole scene.

## 15. Testing

### Unit
- Tutor JSON schema.
- Drawing DSL.
- Excalidraw conversion.
- Provider adapters.
- Level-specific prompt generation.
- Voice state machine.

### Integration
- Question → LLM → drawing.
- Provider failure.
- Canvas failure.
- Voice transcription failure.
- Export/import.
- Lesson continuation.

### E2E
- Open app.
- Configure provider.
- Ask question.
- See response.
- See drawing.
- Ask follow-up.
- Use microphone where supported.
- Export lesson.

### Runtime verification
Reticle must verify user-facing flows against the running application.

### Security
Strix should test:
- API endpoint exposure.
- SSRF.
- prompt injection boundaries.
- XSS.
- secret leakage.
- insecure WebSocket/HTTP behavior.
- malformed drawing operations.

## 16. Dependencies

Prefer existing dependencies first.

For Excalidraw:
- reuse the repository's installed packages and server.

For voice:
- browser APIs first.
- add `faster-whisper` only when robust STT is required.
- add Piper only when local high-quality TTS is required.

Do not add a dependency merely because it is popular.

## 17. Compatibility

Target:
- Windows.
- macOS.
- Linux.
- Chromium-based browsers first.

Node:
- Use Node >= 20 because the current upstream repository requires it.

Python:
- Optional in MVP.
- If voice backend is enabled, document the supported Python version.

## 18. Failure behavior

If LLM fails:
- show error,
- preserve question,
- allow retry,
- do not corrupt canvas.

If drawing fails:
- answer text normally,
- show "visual unavailable",
- preserve lesson state.

If voice fails:
- offer typed input.

If provider returns invalid JSON:
1. attempt constrained repair,
2. retry once,
3. fall back to plain answer.

## 19. Definition of done

A release is ready only when:
- tests pass,
- Reticle passes user-facing flows,
- CodeRabbit review is clean or findings are consciously resolved,
- security checks are complete for the release scope,
- API secrets are not exposed,
- drawing is editable,
- exports reopen correctly,
- Beginner/Intermediate/Pro behave distinctly,
- voice gracefully degrades.

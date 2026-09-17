# Architecture.md — Graphical AI Tutor

## 1. Architecture overview

```text
                         ┌──────────────────────┐
                         │      Student         │
                         └──────────┬───────────┘
                                    │
                         text / microphone
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    Tutor Web Application                    │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐   ┌───────────────┐ │
│  │ Chat UI      │    │ Level/State  │   │ Voice UI      │ │
│  └──────┬───────┘    └──────┬───────┘   └──────┬────────┘ │
│         │                   │                  │          │
│         └───────────────────┼──────────────────┘          │
│                             ▼                             │
│                   ┌─────────────────┐                     │
│                   │ Tutor Orchestrator│                    │
│                   └───────┬─────────┘                     │
│                           │                               │
│             ┌─────────────┼──────────────┐                │
│             ▼             ▼              ▼                │
│      ┌─────────────┐ ┌────────────┐ ┌──────────────┐     │
│      │ LLM Adapter │ │ Lesson     │ │ Canvas       │     │
│      │             │ │ Manager    │ │ Orchestrator │     │
│      └──────┬──────┘ └────────────┘ └──────┬───────┘     │
└─────────────┼──────────────────────────────┼─────────────┘
              │                              │
              ▼                              ▼
       User-selected LLM              mcp_excalidraw
                                             │
                              ┌──────────────┼─────────────┐
                              ▼              ▼             ▼
                         REST API       WebSocket      Excalidraw
                                                           Canvas
```

## 2. Major components

### 2.1 Student UI

Responsibilities:
- Chat.
- Level selection.
- Voice controls.
- API configuration.
- Lesson controls.
- Canvas embedding.
- Export.

No LLM-specific business logic should live in UI components.

### 2.2 Tutor Orchestrator

The central application service.

Responsibilities:
1. Receive student input.
2. Build tutor context.
3. Apply level policy.
4. Call selected LLM.
5. Validate structured response.
6. Execute drawing plan.
7. Inspect/repair canvas.
8. Update lesson state.
9. Return answer and UI events.

### 2.3 LLM Adapter

Provider-neutral interface.

```text
Tutor Orchestrator
       │
       ▼
LLMProvider
 ├── OpenAICompatibleProvider
 ├── OpenAIProvider
 ├── GeminiProvider
 ├── AnthropicProvider
 └── OllamaProvider
```

Only the adapter knows provider-specific API formats.

## 3. API-key model

Preferred architecture:

```text
Browser
   │
   │ provider config + request
   ▼
Local Tutor Server
   │
   │ authenticated outbound request
   ▼
Chosen LLM
```

For a local/self-hosted app, this gives better compatibility and centralizes provider handling.

However:
- keys must be stored only locally,
- server logs must redact credentials,
- browser/server communication must use local secure channels,
- no project maintainer service should receive the key by default.

A pure browser-to-provider mode can be offered later for providers that support it safely.

## 4. Canvas architecture

Use the upstream `mcp_excalidraw` infrastructure rather than recreating a drawing engine.

The repository provides:
- canvas server,
- REST API,
- WebSocket sync,
- MCP server,
- CLI,
- scene tools,
- screenshots,
- scene descriptions,
- CRUD,
- layout,
- snapshots,
- import/export,
- Mermaid conversion.

The architecture should use a `CanvasAdapter` so the tutor is not tightly coupled to MCP.

```text
Tutor
  ↓
CanvasAdapter
  ├── RESTCanvasAdapter
  └── MCPCanvasAdapter
```

For the student application, REST is the simplest primary integration.

MCP remains valuable for developer/agent workflows and advanced integrations.

## 5. Canvas command flow

```text
LLM
 ↓
TutorResponse
 ↓
Zod validation
 ↓
Draw DSL
 ↓
Drawing compiler
 ↓
Excalidraw elements
 ↓
Canvas server
 ↓
WebSocket
 ↓
Student canvas
```

## 6. Visual reasoning loop

The tutor should behave like a teacher drawing on a board.

### Step 1
Understand the question.

### Step 2
Decide whether a visual is useful.

### Step 3
Plan the visual.

### Step 4
Draw.

### Step 5
Inspect scene description.

### Step 6
If necessary, inspect screenshot.

### Step 7
Fix layout.

### Step 8
Fit viewport.

### Step 9
Explain what was drawn.

This is intentionally different from "LLM emits an image".

## 7. Lesson state

```ts
type LessonState = {
  id: string;
  topic?: string;
  level: Level;
  objective?: string;
  currentConcept?: string;
  completedConcepts: string[];
  misconceptions: string[];
  checkpoints: LessonCheckpoint[];
  canvasSnapshot?: string;
};
```

Lesson state is separate from chat history.

## 8. Memory model

Three levels:

### Conversation memory
Recent messages.

### Lesson memory
What the student is currently learning.

### Canvas memory
What exists on the board.

Do not merge all three into one huge prompt.

Use summaries and targeted retrieval.

## 9. Prompt architecture

System prompt contains:
- teacher role,
- safety,
- level rules,
- drawing DSL contract,
- output schema.

Dynamic context contains:
- student question,
- recent conversation,
- lesson state,
- canvas summary,
- selected objects.

The prompt should explicitly tell the model:
- never output executable code as a drawing operation,
- use only supported drawing operations,
- do not erase unrelated student work,
- preserve existing IDs when editing,
- prefer incremental changes.

## 10. Arbitrary LLM compatibility

Some providers support structured output or tool calls; some do not.

Use this hierarchy:

1. Native structured output if supported.
2. JSON schema prompt + parser.
3. Single retry with repair prompt.
4. Plain text fallback.

This makes the application provider-agnostic.

## 11. Voice architecture

### MVP

```text
Browser microphone
       ↓
SpeechRecognition
       ↓
text
       ↓
Tutor
       ↓
SpeechSynthesis
       ↓
speaker
```

### Advanced

```text
Microphone
   ↓
MediaRecorder
   ↓
Node voice endpoint
   ↓
Python faster-whisper
   ↓
Transcript
   ↓
Tutor
   ↓
Piper
   ↓
Audio
```

The advanced voice service is optional and independently deployable.

## 12. Voice provider abstraction

```ts
interface SpeechToText {
  transcribe(audio: Blob): Promise<Transcript>;
}

interface TextToSpeech {
  speak(text: string, options?: SpeechOptions): Promise<void>;
  stop(): void;
}
```

This allows:
- browser speech,
- local Whisper,
- cloud STT,
- local Piper,
- cloud TTS.

## 13. Security architecture

Trust boundaries:

```text
Student
  ↓
Browser
  ↓
Local Tutor Server
  ├── LLM provider
  ├── Voice service
  └── Excalidraw canvas
```

Threats:
- malicious prompts,
- malicious LLM output,
- secret leakage,
- SSRF through custom LLM URLs,
- XSS in Markdown,
- unauthorized local endpoints,
- malformed canvas operations.

Controls:
- strict schemas,
- output sanitization,
- URL allow/deny policy,
- secret redaction,
- no shell execution from tutor output,
- least privilege,
- security tests.

## 14. Observability

Local logs should contain:
- request id,
- provider name,
- model name,
- latency,
- success/failure,
- canvas operation count.

Never log:
- API keys,
- full authorization headers,
- raw voice recordings,
- sensitive student content unless explicitly enabled.

## 15. Developer workflow / "Graphical Memory"

The project must maintain a persistent agent instruction layer.

Primary project memory:
- `AGENTS.md`
- `docs/PRD.md`
- `docs/TRD.md`
- `docs/UI-UX.md`
- `docs/Architecture.md`
- Graphify-generated graph files.

Graphify should be run after meaningful architecture/code changes so the code knowledge graph stays current.

Graphify is an on-device code knowledge graph/skill; its current workflow generates local graph artifacts and can expose the graph to coding assistants. It should be treated as the project's codebase memory, not as a substitute for source-of-truth docs.

## 16. Mandatory agent workflow

Every development prompt must begin with this workflow:

### Always
1. Read `AGENTS.md`.
2. Read the relevant PRD/TRD/UI/architecture sections.
3. Run/query Graphify when the task touches multiple files or architecture.
4. Apply Matt Pocock skills where relevant.
5. Apply ECC engineering workflow/rules.
6. Apply Ponytail's minimal-code/YAGNI constraints.
7. Use the Excalidraw skill/tooling for canvas changes.

### User-facing changes
Additionally:
8. Run Reticle against the running application.
9. Fix failures and re-run.

### Security-sensitive changes
Additionally:
10. Run Strix within the authorized local/test scope.
11. Resolve critical/high findings before completion.

### Iterative/large tasks
12. Use Ralph Loop for repeated implementation → test → fix cycles.

### Review
13. Run CodeRabbit review before declaring a substantial change complete.

The rule means the agent must consult/apply the relevant skills, not blindly execute an irrelevant tool on every tiny edit.

## 17. Ralph Loop

For large features:

```text
PLAN
 ↓
IMPLEMENT
 ↓
TEST
 ↓
RETICLE
 ↓
SECURITY (if relevant)
 ↓
CODERABBIT
 ↓
FIX
 ↓
RETEST
 ↓
DONE
```

Stop when acceptance criteria pass, not merely when code compiles.

## 18. Graphify memory workflow

Recommended:
```bash
uv tool install graphifyy
graphify install
graphify .
```

Keep generated graph artifacts out of secrets and temporary directories.

After major changes:
```bash
graphify .
```

The agent should query Graphify before making cross-cutting changes.

## 19. Agent rules file

Create `.agent/rules/graphical-tutor.md` and/or root `AGENTS.md`.

The rule file should contain:
- architecture constraints,
- mandatory workflow,
- security rules,
- testing gates,
- canvas rules,
- "do not rewrite upstream Excalidraw infrastructure unnecessarily".

## 20. Deployment modes

### Local development
```text
Frontend
Node Tutor Server
mcp_excalidraw Canvas
Optional Python Voice
```

### Desktop/local package
Bundle:
- frontend,
- Node server,
- canvas,
- optional voice service.

### Cloud
Possible later, but BYOK and privacy policies must be redesigned before using a shared server.

## 21. Architectural principle

The most important separation is:

```text
Teacher intelligence ≠ Canvas implementation
Voice ≠ LLM
LLM provider ≠ Tutor
Tutor ≠ UI
Canvas ≠ MCP
```

Each can be replaced independently.

## 22. Final architecture objective

The end result should allow:

```text
Student:
"Explain photosynthesis at beginner level."

Tutor:
1. Understands level.
2. Explains simply.
3. Draws a plant + sunlight + CO₂ + water → glucose + O₂.
4. Labels the diagram.
5. Speaks the explanation.
6. Asks one quick check.

Student:
"Now explain the light-dependent reaction."

Tutor:
1. Keeps the lesson context.
2. Extends the existing canvas.
3. Does not destroy the original diagram.
4. Explains the new concept.
5. Speaks it if voice mode is enabled.
```

That is the core product behavior.

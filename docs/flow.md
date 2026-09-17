# System Flow & Architecture Blueprint (`flow.md`)

This document details **how each file, module, data structure, and interaction works** in the **Graphical AI Tutor** application.

---

## 1. High-Level System Architecture & Flow

```text
  [ Student ]
      │
      ├───────────────────────┬────────────────────────┐
      ▼                       ▼                        ▼
[ Text Input ]       [ Microphone Voice ]       [ Level Selector ]
      │                       │                        │
      │                       ▼ (Web Speech API)       ▼
      │                 [ Transcript ]           [ Beginner/Inter/Pro ]
      │                       │                        │
      └───────────────────────┴────────────────────────┘
                              │
                              ▼
                   [ Frontend ChatPanel.tsx ]
                              │
                    POST /api/tutor/chat
             (with lesson context + provider config)
                              │
                              ▼
            [ Backend Express Server (server.ts) ]
                              │
                              ▼
             [ Tutor Orchestrator (orchestrator.ts) ]
                              │
         ┌────────────────────┼────────────────────────┐
         ▼                    ▼                        ▼
[ Prompt Builder ]    [ Canvas Inspector ]     [ LLM Provider Adapter ]
(Persona + Level +    (Retrieves scene state   (OpenAI, Anthropic,
 Drawing DSL rules)   & bounds from memory)    Gemini, Ollama, Groq)
         │                    │                        │
         └────────────────────┼────────────────────────┘
                              │
                              ▼
                    [ Structured Output ]
                              │
                              ▼
                   [ Zod Schema Validator ]
                              │
                              ▼
                  [ Canvas Compiler (DSL) ]
          (box, ellipse, diamond, arrow, text)
                              │
                              ▼
              [ Native Excalidraw JSON Elements ]
                              │
                              ▼
               [ Canvas Server Scene Mutation ]
              (POST /api/elements/batch internal)
                              │
                              ▼
                  [ WebSocket Broadcast ]
                              │
                              ▼
                 [ Live Excalidraw Canvas ]
                     (Student sees drawing)
                              │
                              ▼
                  [ Tutor Explanation ]
             (Appears in Chat & Spoken aloud)
```

---

## 2. Directory & File Inventory

### Root Configuration & Docs
- **[`AGENTS.md`](file:///e:/Adaptive%20Modern%20Learning%201/AGENTS.md)**: Agent development rules, mandatory workflow gates, and tutor pedagogical guidelines.
- **[`PRD.md`](file:///e:/Adaptive%20Modern%20Learning%201/PRD.md)**: Product requirements document (student personas, feature list, MVP scope).
- **[`TRD.md`](file:///e:/Adaptive%20Modern%20Learning%201/TRD.md)**: Technical requirements document (stack, protocol schemas, security, performance).
- **[`UI-UX.md`](file:///e:/Adaptive%20Modern%20Learning%201/UI-UX.md)**: Design system, 3-zone layout specifications, and interaction states.
- **[`Architecture.md`](file:///e:/Adaptive%20Modern%20Learning%201/Architecture.md)**: System design, boundaries, memory models, and failure recovery.
- **[`decision.md`](file:///e:/Adaptive%20Modern%20Learning%201/decision.md)**: Architecture Decision Records (ADRs) explaining every trade-off and choice.
- **[`flow.md`](file:///e:/Adaptive%20Modern%20Learning%201/flow.md)**: This exact operational flow and component index.
- **[`package.json`](file:///e:/Adaptive%20Modern%20Learning%201/package.json)**: Root scripts, dependencies, build, and test orchestration.

### Backend (`src/`)
- **[`src/server.ts`](file:///e:/Adaptive%20Modern%20Learning%201/src/server.ts)**:
  - Express application entry point.
  - Initializes HTTP server on port 3000 (configurable via `PORT` / `EXPRESS_SERVER_URL`).
  - Sets up WebSocket server (`ws`) on the same port to broadcast scene mutations to all connected browsers.
  - Exposes REST endpoints for canvas CRUD (`/api/elements`, `/api/scene`, `/api/snapshots`).
  - Mounts tutor routes (`/api/tutor/chat`, `/api/tutor/test-connection`, `/api/tutor/lesson`).
- **[`src/tutor/orchestrator.ts`](file:///e:/Adaptive%20Modern%20Learning%201/src/tutor/orchestrator.ts)**:
  - Central brain of the tutor server.
  - Receives `studentQuestion`, `level`, `lessonState`, and `providerConfig`.
  - Assembles prompt via `prompt-builder.ts` with current canvas summary.
  - Invokes `provider-adapter.ts` with timeout & retry handling.
  - Passes LLM output to Zod parser; attempts constrained JSON repair if needed.
  - Hands `draw` operations to `canvas-compiler.ts`.
  - Injects compiled elements into the canvas scene store and triggers WebSocket broadcast.
  - Returns `TutorResponse` payload to client.
- **[`src/tutor/prompt-builder.ts`](file:///e:/Adaptive%20Modern%20Learning%201/src/tutor/prompt-builder.ts)**:
  - Encodes the pedagogical persona:
    - **Beginner**: Defines all concepts, uses analogies, draws basic labeled blocks, one step at a time, checks understanding.
    - **Intermediate**: Assumes basics, explains mechanisms and data flow, draws connected diagrams, points out gotchas.
    - **Pro**: Deep technical terminology, architectural diagrams, performance/complexity analysis, edge cases.
  - Embeds the strict Drawing DSL contract and schema rules.
  - Incorporates dynamic lesson objective, recent messages, and current canvas element summary.
- **[`src/tutor/canvas-compiler.ts`](file:///e:/Adaptive%20Modern%20Learning%201/src/tutor/canvas-compiler.ts)**:
  - Pure deterministic transformation function: `compileDrawOperations(ops: DrawOperation[]): ServerElement[]`.
  - Generates valid Excalidraw element properties: `id`, `type`, `x`, `y`, `width`, `height`, `angle`, `strokeColor`, `backgroundColor`, `fillStyle`, `strokeWidth`, `roughness`, `opacity`, `groupIds`, `frameId`, `roundness`, `seed`, `version`, `versionNonce`, `isDeleted`, `boundElements`, `updated`.
  - For connected `arrow` operations: resolves source and target element centers, sets arrow points `[[0, 0], [dx, dy]]`, and registers binding entries in `startBinding` and `endBinding`.
- **[`src/tutor/llm/provider-adapter.ts`](file:///e:/Adaptive%20Modern%20Learning%201/src/tutor/llm/provider-adapter.ts)**:
  - Universal provider contract:
    ```ts
    interface LLMProvider {
      generate(request: GenerationRequest): Promise<string>;
      validate(config: ProviderConfig): Promise<{ ok: boolean; error?: string }>;
    }
    ```
  - Subclasses for:
    - `OpenAICompatibleProvider` (OpenRouter, Groq, Ollama, vLLM, LM Studio)
    - `OpenAIProvider` (Official OpenAI GPT-4o / GPT-4o-mini)
    - `AnthropicProvider` (Claude 3.7 Sonnet / Haiku via messages API)
    - `GeminiProvider` (Google Gemini 2.0 Flash / Pro)
- **[`src/tutor/types.ts`](file:///e:/Adaptive%20Modern%20Learning%201/src/tutor/types.ts)**:
  - Zod schemas for all messages, operations, lesson states, and configuration models.

### Frontend (`frontend/src/`)
- **[`frontend/src/main.tsx`](file:///e:/Adaptive%20Modern%20Learning%201/frontend/src/main.tsx)**:
  - React application mount.
- **[`frontend/src/App.tsx`](file:///e:/Adaptive%20Modern%20Learning%201/frontend/src/App.tsx)**:
  - Top-level application shell.
  - Manages global state: `level` (`beginner` | `intermediate` | `pro`), `theme` (`light` | `dark`), `providerConfig`, `lessonState`, `isVoiceActive`, `isSettingsOpen`.
  - Manages Excalidraw API ref and WebSocket connection to the server.
  - Renders the 3-Zone Desktop Grid:
    - Top: `<Header />`
    - Left: `<div className="canvas-container"><Excalidraw /></div>`
    - Right: `<ChatPanel />`
    - Overlays: `<SettingsModal />`
- **[`frontend/src/components/header/Header.tsx`](file:///e:/Adaptive%20Modern%20Learning%201/frontend/src/components/header/Header.tsx)**:
  - Displays Logo and active lesson topic.
  - Level segmented button (`Beginner`, `Intermediate`, `Pro`).
  - Voice toggle button (shows active listening/speaking status).
  - Settings button (opens BYOK modal).
  - Export menu (Export `.excalidraw`, PNG image, SVG, or lesson JSON).
- **[`frontend/src/components/chat/ChatPanel.tsx`](file:///e:/Adaptive%20Modern%20Learning%201/frontend/src/components/chat/ChatPanel.tsx)**:
  - Conversation scroll container rendering teacher and student messages.
  - Teacher message format:
    - **Direct Answer**
    - **Let's understand it**
    - **On the board** (references drawing)
    - **Quick check** (interactive checkpoint question)
  - Drawing status indicator: animated badge showing `AI is planning...`, `AI is drawing...`, `Finished`.
  - Composer input:
    - Auto-resizing textarea.
    - Microphone button (triggers `useVoice` speech-to-text).
    - Send button & keyboard `Enter` listener.
- **[`frontend/src/components/settings/SettingsModal.tsx`](file:///e:/Adaptive%20Modern%20Learning%201/frontend/src/components/settings/SettingsModal.tsx)**:
  - Form to select provider: OpenRouter, OpenAI, Anthropic, Gemini, Groq, Ollama, Custom OpenAI-Compatible.
  - Interactive model dropdown for OpenRouter with categorized free community models (Llama 3.3 70B, Gemini 2.0 Flash Exp, Qwen 2.5 Coder, DeepSeek R1) and flagship models (Claude 3.7 Sonnet, GPT-4o).
  - Custom model ID entry fallback.
  - "Test Connection" button calling `POST /api/tutor/test-connection`.
  - Local storage persistence indicator (keys never transmitted anywhere except local server for provider dispatch).
- **[`frontend/src/components/icons/Icons.tsx`](file:///e:/Adaptive%20Modern%20Learning%201/frontend/src/components/icons/Icons.tsx)**:
  - Minimalist, crisp Apple SF Symbols-style SVG icons system.
  - Strict zero-emoji replacement covering all UI actions: `SparklesIcon`, `MicIcon`, `MicOffIcon`, `Volume2Icon`, `VolumeXIcon`, `RefreshCwIcon`, `Trash2Icon`, `SettingsIcon`, `MessageSquareIcon`, `SendIcon`, `CheckIcon`, `ChevronDownIcon`, `EyeIcon`, `EyeOffIcon`, `ShieldCheckIcon`, `CompassIcon`, `ZapIcon`, `RocketIcon`, `PenToolIcon`, `LightbulbIcon`, `ArrowRightIcon`, `XIcon`, `GraduationCapIcon`, `CanvasBoardIcon`.
- **[`frontend/src/hooks/useVoice.ts`](file:///e:/Adaptive%20Modern%20Learning%201/frontend/src/hooks/useVoice.ts)**:
  - Wraps browser `window.SpeechRecognition` / `window.webkitSpeechRecognition`.
  - Manages recording states (`idle`, `listening`, `transcribing`, `error`).
  - Wraps `window.speechSynthesis` for reading tutor answers aloud with configurable voice pitch and rate.
- **[`frontend/src/styles/tutor.css`](file:///e:/Adaptive%20Modern%20Learning%201/frontend/src/styles/tutor.css)**:
  - Apple-grade Cupertino design system with system font typography (`-apple-system`, `SF Pro Text`).
  - Frosted glassmorphism header and panels (`backdrop-filter: blur(20px) saturate(180%)`), Apple segmented level pills, System Blue (`#0071e3`) accents, subtle translucent borders, and OLED dark mode.

---

## 3. Data Formats & Protocols

### The Tutor Protocol (`TutorResponse`)
```json
{
  "answer": "Binary search divides a sorted list in half repeatedly to locate an item in O(log n) time.",
  "level": "beginner",
  "lesson": {
    "objective": "Understand how binary search eliminates half the remaining items each step",
    "concept": "Dividing search space in half",
    "nextQuestion": "If we have 16 numbers, how many cuts do we need at most?"
  },
  "draw": [
    {
      "op": "box",
      "id": "arr_0",
      "x": 200,
      "y": 200,
      "w": 60,
      "h": 50,
      "label": "2"
    },
    {
      "op": "box",
      "id": "arr_1",
      "x": 270,
      "y": 200,
      "w": 60,
      "h": 50,
      "label": "5"
    },
    {
      "op": "arrow",
      "id": "mid_arrow",
      "from": "mid_label",
      "to": "arr_1",
      "label": "Middle"
    }
  ],
  "speak": true
}
```

### Drawing DSL Operations
| Operation | Key Fields | Output Excalidraw Element |
| :--- | :--- | :--- |
| `box` | `id, x, y, w, h, label` | Rectangle + centered Text element |
| `ellipse` | `id, x, y, w, h, label` | Ellipse + centered Text element |
| `diamond` | `id, x, y, w, h, label` | Diamond + centered Text element |
| `arrow` | `id, from, to, label` | Arrow with bound start & end + label |
| `line` | `id, from: {x,y}, to: {x,y}` | Line segment |
| `text` | `id, x, y, text` | Standalone Text element |
| `group` | `id, children: string[]` | Group binding assigned to child elements |
| `delete` | `id` | Marks element as `isDeleted: true` |
| `clear_region`| `region: {x, y, w, h}` | Deletes elements intersecting bounds |

---

## 4. Step-by-Step Runtime Execution Walkthrough

### Flow A: Asking a Concept Question
1. **Student Input**: Student types "How does the event loop work?" or clicks a starter chip.
2. **Client Dispatch**: `ChatPanel.tsx` appends student message and posts JSON to `/api/tutor/chat`:
   - `message`: "How does the event loop work?"
   - `level`: e.g. "intermediate"
   - `providerConfig`: Selected provider, API key, model ID from `localStorage`.
   - `canvasStateSummary`: Current count and bounds of active whiteboard shapes.
3. **Backend Prompt Assembly**: `prompt-builder.ts` injects the intermediate persona constraints and the drawing DSL specification.
4. **LLM Invocation**: `provider-adapter.ts` transmits request to the user's selected endpoint (OpenRouter, Groq, Ollama, OpenAI, Claude, Gemini) with `temperature: 0.2`.
5. **Output Validation & JSON Extraction**: `orchestrator.ts` cleans fences and parses response using `TutorResponseSchema`.
6. **Drawing Compilation**: `canvas-compiler.ts` converts `draw` operations to native Excalidraw shapes.
7. **Scene Mutation & Broadcast**: Server stores elements in `elements` Map and sends `elements_batch_created` via WebSocket.
8. **Client Rendering**: `App.tsx` receives WS message, merges new elements into Excalidraw scene, and smoothly centers the viewport.
9. **Spoken Explanation**: If audio narration is active, `useVoice.ts` speaks the summary via `speechSynthesis`.

### Flow B: Switching Difficulty Level
1. Student clicks **Pro 🚀** in the top navigation bar.
2. `Header.tsx` triggers `onLevelChange('pro')`.
3. `App.tsx` saves new level to `localStorage` (`tutor_level`).
4. `ChatPanel.tsx` swaps starter prompt chips to advanced distributed systems and architecture questions.
5. All subsequent tutor chats receive `level: 'pro'` to activate advanced terminology and protocol analysis.

### Flow C: Whiteboard Interaction & Persistence
1. Student draws or edits any shape directly on the Excalidraw canvas.
2. `App.tsx` debounces changes via `scheduleAutoSync()`.
3. `POST /api/elements/sync` uploads modified scene to server memory.
4. If tutor draws next, it respects existing student work without wiping or overwriting unselected regions.

### Flow D: OpenRouter Dynamic Catalog Discovery & Filtering
1. `SettingsModal.tsx` mounts or switches provider to `'openrouter'`.
2. Client queries `GET /api/tutor/openrouter/models`.
3. Server checks in-memory cache (1 hour TTL); if stale, fetches `https://openrouter.ai/api/v1/models`, formats pricing and flags free models, then returns 440+ models.
4. Client updates `dynamicOpenRouterModels` state with all models.
5. Student can type in real-time search box (`llama`, `claude`, `deepseek`) or toggle "Show free community models only".
6. `useMemo` filters the list instantly without extra server calls.
7. Selected model is preserved in `<select>` even across active filters, and persisted to `localStorage` on "Save Preferences".

### Flow E: Nemo 3 Ultra & OpenRouter Free Model Execution
1. Student selects `NVIDIA: Nemotron 3 Ultra (Free)` (`nvidia/nemotron-3-ultra-550b-a55b:free`) in Settings.
2. In `Test Connection`, client calls `POST /api/tutor/test-connection`.
3. `provider-adapter.ts` validates the key via `https://openrouter.ai/api/v1/auth/key` with `Authorization: Bearer <key>`, ensuring the key is authentic and reporting credit balance.
4. When student asks a question in `ChatPanel.tsx`, `handleTutorChat` sanitizes messages:
   - Strips undefined or empty messages to avoid Nvidia NIM's `400 Bad Request: missing field 'content'` error.
5. `provider-adapter.ts` makes initial attempt with `response_format: { type: 'json_object' }`.
6. If the model rejects json_object (400, 422), adapter automatically retries without `response_format`.
7. `orchestrator.ts` uses `extractJson()` to cleanly isolate the `{ ... }` JSON block, validate schema, compile drawing operations, and broadcast elements to the canvas.

### Flow F: Apple-Grade SVG Icon Render Pipeline
1. All UI icons are pure vector React SVG components in `frontend/src/components/icons/Icons.tsx` (stroke-based, zero emojis).
2. Global buttons are isolated from legacy CSS overrides in `index.html`.
3. Action buttons use `.icon-btn` with `box-sizing: border-box`, `padding: 0`, and `width: 34px; height: 34px`.
4. Inner SVGs receive explicit dimensions (`16px x 16px`), `stroke: currentColor`, and `fill: none`, scaling crisply on Retina and standard displays.

### Flow G: Realistic Neural Voice Pipeline (Edge-TTS English & Urdu)
1. Student selects preferred voice in Settings or Chat (e.g. `Urdu (Female) - Uzma`, `Urdu (Male) - Asad`, `English (Male) - Christopher`, `English (Female) - Jenny`).
2. When the tutor speaks a step or full explanation, `useVoice.ts` dispatches `POST /api/tutor/tts` with `{ text, voice, rate, pitch }`.
3. Express backend invokes Python `edge-tts` service asynchronously, generating crystal-clear 24kHz audio.
4. Server streams audio buffer/base64 to frontend.
5. Frontend HTML5 `Audio` element plays audio smoothly without robotization or stutter.
6. If the network or backend is unreachable, frontend seamlessly falls back to `window.speechSynthesis` without throwing errors.

### Flow H: Synchronized Step-by-Step Pedagogical Teaching Playback
1. Tutor responds with structured `steps: TeachingStep[]` (each step has `stepNumber`, `title`, `speech`, `explanation`, `draw`, and `highlightElementIds`).
2. `StepPlayer.tsx` in `ChatPanel` mounts and begins sequential playback.
3. **Step 1**:
   - Compiles step 1 draw operations and mutates Excalidraw scene via WebSocket.
   - Highlights focal element IDs on canvas.
   - Triggers realistic Neural TTS for step 1 speech.
4. **Transition**:
   - Player displays step pill (e.g. `Step 1 of 4: Client Request`).
   - If auto-advance is enabled, automatically transitions to Step 2 upon audio completion; otherwise waits for student to click `Next Step`.
5. **Step 2 to N**:
   - Draws incremental connecting relationships, shifts canvas highlight, and plays narration for each phase.
6. Student retains full interactive control: Play/Pause, Next Step, Previous Step, Replay Step, or Free Scrub.

### Flow I: Native Mermaid & Visual Library Primitive Compilation
1. When tutor emits `{ op: "mermaid", syntax: "..." }` or domain primitives (`database`, `cloud`, `actor`, `queue`, `container`, `note`):
2. In `canvas-compiler.ts`:
   - Domain primitives are compiled with mathematically precise 3D caps, dashed zone borders, and auto-centered labels into native Excalidraw elements.
3. For Mermaid diagrams:
   - Server broadcasts `mermaid_convert` via WebSocket.
   - Frontend invokes `parseMermaidToExcalidraw()` from `@excalidraw/mermaid-to-excalidraw`.
   - Resulting Excalidraw shapes are injected into the scene and auto-centered, giving the student a fully editable, pristine architectural diagram.

### Flow J: Synchronized Dynamic Whiteboard Drawing & Smooth Viewport Centering
1. **Per-Step Drawing Generation**:
   - The LLM emits step-by-step instructions. If an open model returns text or an incomplete schema, `synthesizeVisualSteps` automatically synthesizes 3 structured pedagogical steps (Actor/Client, Processing Engine/Cloud, and Persistence/Storage).
   - In `orchestrator.ts`, each step's `draw` operations are compiled on the server into `step.compiledElements` using `compileDrawingOperations()`.
   - Upfront full-canvas WebSocket broadcasting is suppressed when `steps` are present, preventing the whole diagram from appearing before speech begins.
2. **Client Step Mounting & AutoPlay**:
   - In `StepPlayer.tsx`, `autoPlay` starts immediately on Step 1 (or on student selection).
   - `onStepChange(step)` notifies `App.tsx` with the active `TeachingStep`.
3. **Whiteboard Element Injection**:
   - If `step.compiledElements` are present, `App.tsx` converts and merges them into the current Excalidraw scene elements via `applySceneUpdateWithoutAutoSync`.
   - If `step.mermaid` is present, `convertMermaidToExcalidraw()` compiles the Mermaid definition into Excalidraw shapes.
4. **Active Element Highlighting & Camera Tracking**:
   - The active elements for that step are selected (`selectedElementIds`) giving visual focus.
   - `api.scrollToContent(elements, { animate: true, duration: 400, viewportZoomFactor: 0.85 })` smoothly glides the canvas camera right to the newly drawn shapes.
5. **Speech Synchronization**:
   - Simultaneously, `useVoice.ts` speaks the step narration via 24kHz edge-tts (English or Urdu) or browser SpeechSynthesis.
   - Upon completion of audio, `StepPlayer` smoothly advances to Step 2, triggering Step 2's shapes, camera glide, and narration.

### Flow K: Topic-Faithful Semantic Visual Synthesis & Zero-Bias Domain Adaptation
1. **System Prompt Topic Independence**:
   - `buildSystemPrompt` eliminates software/client-server bias from system prompt instructions and examples.
   - Mandates explicit topic faithfulness: non-software queries (Photosynthesis, Biology, Physics, Mathematics, History) produce subject-appropriate visuals (leaves, chloroplasts, glucose, formulas, planetary orbits, etc.) and strictly forbids generic tech terms.
2. **Resilient JSON Recovery Pipeline**:
   - `extractAndSanitizeJson` safely handles unescaped newlines in strings, trailing commas, and truncated braces/brackets without failing.
   - Eliminates recursive secondary LLM repair calls that previously timed out on free/rate-limited models.
3. **Semantic Topic Step Synthesizer**:
   - When an LLM returns unstructured markdown text, `synthesizeTopicSteps` extracts real sentences directly from the tutor's response narrative.
   - Keyword extraction identifies topic-specific entities (e.g., "Sunlight & Water", "Chloroplast", "Glucose & Oxygen") for node labeling.
   - Synthesizes 3 coherent phases (Starting Inputs -> Core Mechanism/Reaction -> Outputs/Results & Takeaways) with directional flow arrows and takeaway sticky notes.
   - Guarantees that the spoken explanation and drawn whiteboard diagram match the student's exact topic with zero irrelevant terminology.

### Flow M: Multi-Source Internet Image Discovery & Open-Web Scraper (DuckDuckGo, Pinterest, Openverse, Wikimedia)
1. **Multi-Source Image Search Engine (`image-service.ts`)**:
   - `searchInternetImage` queries multiple discovery engines across the open internet:
     - **DuckDuckGo Image Search (`duckduckgo.com/i.js`)**: Queries the open web for authentic scientific diagrams, educational graphics, and infographics across Pinterest (`*.pinimg.com`), Vecteezy, Dreamstime, blogs, and university domains without requiring proprietary API keys.
     - **Openverse Engine (`api.openverse.org`)**: Searches over 700 million CC-licensed open cultural and educational media assets across Flickr, Behance, and Wikimedia.
     - **Wikipedia & Wikimedia Commons**: High-trust peer-reviewed encyclopedic diagrams and micrographs.
2. **SSRF Guard & Image Fetch Pipeline**:
   - All image candidate URLs undergo strict validation before downloading:
     - Enforces HTTPS protocol.
     - Resolves hostname via DNS and blocks private RFC 1918 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopbacks (`127.0.0.1`, `::1`), link-local metadata addresses (`169.254.169.254`), and local domains.
     - Dispatches requests with browser-grade headers (`User-Agent`, `Accept: image/*`, `Referer`) so image hosts and CDNs serve authentic image binaries without 403 blocks.
     - Validates MIME type (`image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`) and enforces a 5MB payload limit.
3. **AI Tutor Pedagogical Visual Analysis First**:
   - Upon retrieving an authentic internet image, the AI tutor conducts an in-depth visual analysis before presentation:
     - Inspects the image metadata, source domain, and visual features.
     - Synthesizes an insightful `analysisSpeech` comparing the abstract whiteboard flow to the concrete real-world structures depicted in the image.
     - Inserts the image (`op: 'image'`) and an analytical sticky note card (`op: 'note'`) directly onto the canvas.
     - Adds a dedicated final Teaching Step ("Visual Analysis & Evidence") with synchronized spoken analysis and automatic canvas camera zooming.

### Flow N: Excalidraw Native UI Library Synchronization (`excalidrawAPI.updateLibrary`)
1. **Backend Symbol Registry (`library-registry.ts`)**:
   - Curates compound domain symbols across Biology (`chloroplast`, `mitochondria`), Physics/Electronics (`battery`), and Software Architecture (`microservice`).
   - `exportExcalidrawLibraryItems()` converts symbols into standardized Excalidraw Library Item format (`{ id, status: 'published', elements, title }`).
2. **REST API Endpoint (`server.ts`)**:
   - `GET /api/tutor/libraries` returns both the registry and the formatted `libraryItems` payload.
3. **Frontend Excalidraw UI Injection (`App.tsx`)**:
   - When `excalidrawAPI` mounts, `App.tsx` fetches `GET /api/tutor/libraries`.
   - Calls `excalidrawAPI.updateLibrary({ libraryItems: data.libraryItems, merge: true })`.
   - Populates Excalidraw's built-in Library drawer with the curated educational vector libraries, allowing students and the tutor to share the exact same whiteboard asset palette.

### Flow O: Dynamic Canvas Spatial Partitioning & Whiteboard Collision Prevention
1. **Canvas Bounding Box Evaluation (`getCanvasBounds`)**:
   - `getCanvasBounds()` dynamically computes the active visual bounding box of all non-deleted whiteboard elements (`minX, maxX, minY, maxY`).
   - When the whiteboard contains pre-existing elements, the engine evaluates available whitespace:
     - If `maxX < 1500`, it positions new lesson drawings horizontally to the right: `suggestedStartX = maxX + 140`, `suggestedStartY = Math.max(160, minY)`.
     - If the whiteboard has grown wide (`maxX >= 1500`), it wraps down to a new clean row: `suggestedStartX = 120`, `suggestedStartY = maxY + 140`.
2. **Spatial Alignment Enforcement**:
   - `buildSystemPrompt` receives explicit spatial recommendations informing the LLM of the clear whiteboard region.
   - `synthesizeTopicSteps` anchors step 1, 2, 3 and takeaway sticky notes starting at `suggestedStartX`.
   - Drawing Shift Guard: if LLM-generated operations or custom steps contain coordinates where `minX < canvasBounds.suggestedStartX`, the orchestrator computes `shiftX = canvasBounds.suggestedStartX - minX` and translates all coordinates cleanly into open whiteboard space.
   - Educational image and caption are offset to `suggestedStartX + 860` and `suggestedStartY - 20`, guaranteeing zero overlap with the conceptual diagram or pre-existing whiteboard items.

### Flow P: Perimeter Edge Arrow Compilation & Visual Evidence Chat Surface
1. **Perimeter Edge-to-Edge Arrow Connection (`canvas-compiler.ts`)**:
   - Arrows compute bounding geometry of source and target shapes.
   - For predominantly horizontal flow: starts at `fromEl.x + fromEl.width + 8` and terminates at `toEl.x - 8`.
   - For predominantly vertical flow: starts at `fromEl.y + fromEl.height + 8` and terminates at `toEl.y - 8`.
   - Prevents arrows from penetrating box borders or colliding with centered labels.
2. **Direction-Aware Arrow Label Clearance**:
   - Horizontal arrows center labels horizontally between endpoints and elevate them 24px above the line (`startY + dy / 2 - 24`).
   - Vertical arrows position labels 14px to the right of the vertical shaft (`startX + 14`), preventing label text from slicing through the arrow line.
3. **Compound Library Symbol Op Binding**:
   - `case 'library_symbol'` maps `op.id` to the outer primary container of compound symbols (`chloroplast`, `mitochondria`, `battery`, `microservice`, `atom`, `neuron`).
   - Arrows specifying `from` or `to` library symbol IDs bind cleanly to the outer edge of the symbol.
4. **Cupertino Visual Evidence & Analysis Card (`ChatPanel.tsx` & `tutor.css`)**:
   - Renders a real-world visual card within the tutor response bubble.
   - Displays origin source domain tag (Pinterest, Wikimedia, Open Web), responsive media thumbnail preview, diagram title, and analytical quote.
   - Synchronized with whiteboard Step 4 camera focus.

---

### Flow Q: Socratic Teacher Pedagogy Pipeline
1. **Teacher Persona Calibration (`prompt-builder.ts`)**:
   - System prompt explicitly bans passive reader definitions ("X is defined as Y that does Z").
   - Mandates the 4-part pedagogical architecture across all levels (Beginner, Intermediate, Pro):
     * **1. What is it? (Intuitive Hook)**: Relatable analogy, everyday mental model, conversational introduction.
     * **2. Why We Need It & Why It Is Useful (Motivation)**: Immediate problem-solving context, real-world necessity, what fails without it.
     * **3. How Does It Work? (Whiteboard Walkthrough)**: Step-by-step physical/logical breakdown with synchronized drawing.
     * **4. Real-World Applications & Quick Check**: Practical application and an engaging checkpoint question.
2. **Pedagogical Step Synthesizer (`synthesizeTopicSteps` in `orchestrator.ts`)**:
   - Synthesizes topic steps into distinct pedagogical phases:
     * `Phase 1: 1. What It Is & Key Inputs`
     * `Phase 2: 2. How It Works: The Mechanism`
     * `Phase 3: 3. Results & Why We Need It`
   - Generates an explicit whiteboard purpose note anchored on the canvas: `Why We Need It (${qTopic}): ... Essential for real-world functioning.`

---

### Flow R: Direct Canvas Image Ingestion & Dual-Surface Action Lifecycle
1. **Image Pre-Compilation & Element Synthesis (`orchestrator.ts`)**:
   - When an authentic educational/scientific image is discovered, the orchestrator compiles the native Excalidraw `image` element and its companion caption note into `parsedResponse.visualEvidenceElements`.
   - Persists binary data in `files` map with `{ id: fileId, dataURL, mimeType, created }`.
   - Attaches canvas coordinates (`suggestedStartX + 860, suggestedStartY - 20`) ensuring zero collision with the hand-drawn diagram.
2. **Immediate Canvas Ingestion (`App.tsx`)**:
   - Upon receiving the chat response, `App.tsx` immediately ingests binary files into Excalidraw via `api.addFiles(fileList)`.
   - Merges `data.visualEvidenceElements` directly into the active Excalidraw scene elements so the authentic diagram appears on the whiteboard canvas immediately without requiring manual step progression.
3. **Dual-Surface Whiteboard Navigation (`ChatPanel.tsx`)**:
   - The chatbox Visual Evidence card renders an active status badge (`✓ Imported to Canvas`) and a **"Show on Whiteboard"** action button.
   - Clicking **"Show on Whiteboard"** triggers `handleFocusEvidenceImage`, which smoothly zooms and centers the Excalidraw camera right on the image element (`api.scrollToContent([target], { fitToViewport: true, animate: true, viewportZoomFactor: 0.85 })`).

---

### Flow S: Socratic Domain Lesson Synthesis & Blood Groups Pedagogy
1. **Curated & Factual Knowledge Resolution (`topic-knowledge.ts`)**:
   - When external LLM calls fail or timeout, the orchestrator triggers `generateIntelligentTopicLesson(query, level, startX, startY)`.
   - Checks `CURATED_TOPIC_REGISTRY` for matching domain concepts (e.g. `blood_groups`, `photosynthesis`).
   - For `blood_groups`:
     * Returns structured hematological answers explaining red blood cells, ABO surface antigens (A and B), plasma antibodies (anti-A and anti-B), Rh D factor, and transfusion compatibility.
     * Step 1: `1. What It Is: Red Blood Cells & Surface Antigens` (draws `blood_cell` vector symbol and antigen notes).
     * Step 2: `2. How It Works: ABO System & Plasma Antibodies` (draws ABO classification matrix and plasma rules).
     * Step 3: `3. Why We Need It: Transfusion Safety & Universal Donor` (draws Universal Donor O- / Universal Recipient AB+ compatibility and clinical safety note).
   - For uncurated topics, queries Wikipedia Summary API (`fetchDynamicWikipediaSummary`) to retrieve peer-reviewed encyclopedia facts and synthesizes 3 Socratic teaching steps from the factual text.
   - Completely eliminates error-string slicing and prevents the tutor from discussing unrelated error text.
2. **Compound Vector Symbol Integration (`library-registry.ts`)**:
   - `blood_cell` registered in `LIBRARY_REGISTRY`:
     * Outer biconcave disc with inner concave dimple.
     * Surface Antigen A marker (blue) and Antigen B marker (amber).
     * Surface Rh(+) factor marker (green).
     * Exported into native Excalidraw library drawer for interactive student use.
3. **Provider Network Hardening (`provider-adapter.ts`)**:
   - Configures default base URLs for OpenRouter (`https://openrouter.ai/api/v1`), Groq, and Ollama.
   - Applies `AbortSignal.timeout(14000)` to all fetch requests to prevent indefinite network hanging.



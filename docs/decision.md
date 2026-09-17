# Decisions Log — Graphical AI Tutor (`decision.md`)

This document records every architectural, technical, security, and UX decision made during the design and development of **Graphical AI Tutor**, including the context, considered alternatives, chosen solution, and rationale.

---

## Index of Decisions

- [ADR-001: Foundation on `yctimlin/mcp_excalidraw`](#adr-001-foundation-on-yctimlinmcp_excalidraw)
- [ADR-002: Intermediate Drawing DSL & Two-Stage Compiler](#adr-002-intermediate-drawing-dsl--two-stage-compiler)
- [ADR-003: BYOK (Bring-Your-Own-Key) & Credential Isolation](#adr-003-byok-bring-your-own-key--credential-isolation)
- [ADR-004: Three-Zone Pedagogical Layout (Canvas-Dominant)](#adr-004-three-zone-pedagogical-layout-canvas-dominant)
- [ADR-005: Three-Tier Pedagogical Persona (Beginner / Intermediate / Pro)](#adr-005-three-tier-pedagogical-persona-beginner--intermediate--pro)
- [ADR-006: Dual-Track Voice Architecture (Web Speech API + Optional Backend)](#adr-006-dual-track-voice-architecture-web-speech-api--optional-backend)
- [ADR-007: Provider-Neutral LLM Adapter Layer](#adr-007-provider-neutral-llm-adapter-layer)
- [ADR-008: Ponytail/YAGNI & Standard Library Discipline](#adr-008-ponytailyagni--standard-library-discipline)
- [ADR-009: WebSocket Incremental Batching for Real-Time Whiteboard Updates](#adr-009-websocket-incremental-batching-for-real-time-whiteboard-updates)
- [ADR-010: Excalidraw Bound Text Container Architecture](#adr-010-excalidraw-bound-text-container-architecture)
- [ADR-011: Automated Viewport Centering on Drawn Elements](#adr-011-automated-viewport-centering-on-drawn-elements)
- [ADR-012: Dynamic Level-Adaptive Starter Prompts](#adr-012-dynamic-level-adaptive-starter-prompts)
- [ADR-013: Cupertino/Apple Minimalist Aesthetics & Strict Zero-Emoji Rule](#adr-013-cupertinoapple-minimalist-aesthetics--strict-zero-emoji-rule)
- [ADR-014: OpenRouter Multi-Tier Model Selection & Free Tier Catalog](#adr-014-openrouter-multi-tier-model-selection--free-tier-catalog)
- [ADR-015: Dynamic 400+ OpenRouter Catalog Proxy, Client-Side Search, and Hook Compliance](#adr-015-dynamic-400-openrouter-catalog-proxy-client-side-search-and-hook-compliance)
- [ADR-016: Nemo 3 Ultra / OpenRouter Model Compatibility, Key Verification & Message Sanitization](#adr-016-nemo-3-ultra--openrouter-model-compatibility-key-verification--message-sanitization)
- [ADR-017: Apple-Grade SVG Icon Standardization & Global Button Isolation](#adr-017-apple-grade-svg-icon-standardization--global-button-isolation)
- [ADR-018: Edge Neural TTS Architecture with English & Urdu Multi-Voice Support](#adr-018-edge-neural-tts-architecture-with-english--urdu-multi-voice-support)
- [ADR-019: Step-by-Step Pedagogical Sequencer & Canvas Highlighting Protocol](#adr-019-step-by-step-pedagogical-sequencer--canvas-highlighting-protocol)
- [ADR-020: Native Mermaid Diagram Compilation & Advanced Excalidraw Visual Primitives](#adr-020-native-mermaid-diagram-compilation--advanced-excalidraw-visual-primitives)
- [ADR-021: Model Performance Diagnosis & LLM Structured Prompt Calibration](#adr-021-model-performance-diagnosis--llm-structured-prompt-calibration)
- [ADR-022: Dynamic Step-by-Step Whiteboard Drawing Synchronization & Paced Camera Glide](#adr-022-dynamic-step-by-step-whiteboard-drawing-synchronization--paced-camera-glide)
- [ADR-023: Topic-Faithful Semantic Visual Synthesis & Elimination of Domain Prompt Bias](#adr-023-topic-faithful-semantic-visual-synthesis--elimination-of-domain-prompt-bias)
- [ADR-024: SSRF-Protected Educational Image Search, Visual Deep Dive & Vector Library Integration](#adr-024-ssrf-protected-educational-image-search-visual-deep-dive--vector-library-integration)
- [ADR-025: Open-Web Multi-Source Image Engine (DuckDuckGo, Pinterest, Openverse) & Native Excalidraw Library Injection](#adr-025-open-web-multi-source-image-engine-duckduckgo-pinterest-openverse--native-excalidraw-library-injection)
- [ADR-026: Dynamic Whiteboard Spatial Partitioning, Perimeter-Edge Arrow Routing & Real-World Visual Evidence Chat Surface](#adr-026-dynamic-whiteboard-spatial-partitioning-perimeter-edge-arrow-routing--real-world-visual-evidence-chat-surface)
- [ADR-027: Socratic Teacher Pedagogy Framework vs Textbook Reader Anti-Pattern](#adr-027-socratic-teacher-pedagogy-framework-vs-textbook-reader-anti-pattern)
- [ADR-028: Direct Whiteboard Canvas Image Placement & Dual-Surface Ingestion](#adr-028-direct-whiteboard-canvas-image-placement--dual-surface-ingestion)

---

## ADR-001: Foundation on `yctimlin/mcp_excalidraw`

### Context
We need an interactive graphical whiteboard where an AI tutor can draw diagrams in real time while a student watches and interacts. Excalidraw is an open-source, hand-drawn style vector whiteboard library. `yctimlin/mcp_excalidraw` is an existing open-source repository that already implements an Express canvas server, WebSocket live synchronization, element CRUD REST endpoints, Mermaid conversion, and snapshot utilities.

### Alternatives Considered
1. **Build a custom SVG/Canvas renderer from scratch**: Would require thousands of lines of coordinate math, rendering logic, hit detection, and export routines. Violates Ponytail YAGNI principles.
2. **Use standalone `@excalidraw/excalidraw` React package without server sync**: Would require building new synchronization protocols, element state management, and screenshot pipelines.
3. **Adopt `yctimlin/mcp_excalidraw` as the foundation**: Leverages proven, working WebSocket sync, element batch mutation, and scene inspection APIs out of the box.

### Decision
Adopt `yctimlin/mcp_excalidraw` as the upstream foundation, extending it with a student-first UI and a pedagogical tutor orchestrator.

### Why / Rationale
- Reuses 26 pre-tested canvas and scene tools.
- Prevents duplicating Excalidraw internals.
- Adheres to `AGENTS.md` Rule: *"Use the upstream `mcp_excalidraw` infrastructure instead of recreating it."*

---

## ADR-002: Intermediate Drawing DSL & Two-Stage Compiler

### Context
LLMs must be able to instruct the whiteboard to draw diagrams (boxes, arrows, mind maps, timelines). Excalidraw element schemas are complex (each element has over 25 properties including `seed`, `versionNonce`, `roughness`, `boundElements`, `angle`, `strokeSharpness`, etc.). Prompting an LLM to emit raw Excalidraw JSON leads to high token consumption, frequent malformed JSON, and element corruption.

### Alternatives Considered
1. **Raw Excalidraw JSON generation**: Ask the LLM to output complete Excalidraw element structures. High failure rate, token expensive, and prone to breaking changes.
2. **Python/JavaScript code execution**: Allow the LLM to write code that runs in a sandbox to generate drawings. High security risk (arbitrary code execution / sandbox escape).
3. **Mermaid diagrams only**: Restricts drawing to rigid flowcharts; cannot place free-form annotations, equations, or custom spatial layouts.
4. **Intermediate Drawing DSL + Local Deterministic Compiler**: LLM emits compact, intuitive visual instructions (`box`, `ellipse`, `arrow`, `text`, `diamond`). A local TypeScript compiler validates each operation with Zod and constructs valid Excalidraw elements.

### Decision
Implement a **Two-Stage Drawing Architecture**:
- **Stage A (Reasoning)**: LLM outputs explanation + compact `DrawOperation` DSL.
- **Stage B (Compilation)**: Deterministic TypeScript compiler converts DSL operations into native, editable Excalidraw elements with calculated coordinates and styles.

### Why / Rationale
- Works reliably across all LLMs (even models without native tool-calling).
- Drastically reduces token usage by 80%.
- Guarantees valid Excalidraw schema with zero chance of canvas corruption.
- Eliminates code execution security risks.

---

## ADR-003: BYOK (Bring-Your-Own-Key) & Credential Isolation

### Context
Students must be able to use their own LLM accounts (OpenRouter, Groq, Ollama, OpenAI, Anthropic, Gemini) without routing keys through untrusted third parties or hardcoding them in repository files.

### Alternatives Considered
1. **Require environment variables (`.env`) only**: Unfriendly for non-developer students who don't run terminals.
2. **Central cloud proxy with subscription**: High operational burden, privacy concerns, and latency.
3. **Client-side LocalStorage BYOK**: Keys stored strictly in student's browser `localStorage`, passed in memory via request payload only to local proxy.

### Decision
Implement a BYOK Settings Modal storing credentials in browser `localStorage`.
- Security rule: Keys are NEVER logged, never inserted into prompts, and never saved in canvas elements.

### Why / Rationale
- Zero server key retention.
- Complete privacy compliance.
- Supports both local models (Ollama, LMStudio) and cloud providers.

---

## ADR-004: Three-Zone Pedagogical Layout (Canvas-Dominant)

### Context
In traditional AI tutoring apps, the chat window occupies 80% of the screen, with diagrams treated as small side attachments. For a *Graphical* AI Tutor, the whiteboard must be the primary shared thinking surface.

### Decision
Implement a **Three-Zone Pedagogical Layout**:
- **Zone 1: Top Navigation Bar**: Title, Level Selector Pills (`Beginner 🌱`, `Intermediate ⚡`, `Pro 🚀`), Voice narration toggle, Canvas Sync/Clear, Settings modal trigger.
- **Zone 2: Main Whiteboard Canvas (70% viewport)**: Full interactive Excalidraw instance.
- **Zone 3: Tutor Chat & Voice Panel (30% viewport)**: Pedagogical explanations, visual activity indicators, key concepts tags, clickable follow-up prompt chips, speech recognition and text-to-speech triggers.

### Why / Rationale
- Keeps student focus on visual learning.
- Avoids visual clutter while keeping conversational context immediately accessible.

---

## ADR-005: Three-Tier Pedagogical Persona (Beginner / Intermediate / Pro)

### Context
Students approach topics with vastly different prior knowledge. A static one-size-fits-all explanation alienates beginners and bores advanced learners.

### Decision
Support three distinct pedagogical levels configured directly on the top bar:
1. **Beginner (`🌱 Beginner`)**: Uses intuitive everyday analogies, eliminates jargon, and draws simple progressive diagrams.
2. **Intermediate (`⚡ Intermediate`)**: Explains core mechanisms, workflows, data structures, and architectural interactions.
3. **Pro (`🚀 Pro`)**: Deep dives into protocols, distributed consensus, write/read amplification, failure modes, and performance tradeoffs.

### Why / Rationale
- Prompt Builder injects strict cognitive constraints matching the chosen level.
- Starter suggestions on the UI dynamically adapt when the level pill changes.

---

## ADR-006: Dual-Track Voice Architecture (Web Speech API + Optional Backend)

### Context
Voice interaction makes tutoring natural, but requiring heavyweight native speech models (like Whisper + Piper running locally in Python) creates setup friction on Windows machines without GPUs.

### Decision
Dual-track strategy:
- **Default (Zero-Config)**: Browser Web Speech API (`webkitSpeechRecognition` STT + `speechSynthesis` TTS) running out-of-the-box in Chrome, Edge, and Safari.
- **Voice is strictly optional**: Text chat always works seamlessly even if voice is muted or unsupported.

### Why / Rationale
- Zero extra cost or dependencies.
- Conforms to `AGENTS.md` Rule: *"Do not make Python mandatory unless the feature requires it."*

---

## ADR-007: Provider-Neutral LLM Adapter Layer

### Context
Users utilize different LLM providers (OpenAI, Anthropic, Google Gemini, Ollama, Groq, OpenRouter).

### Alternatives Considered
1. **Hardcode OpenAI SDK**: Excludes open-source local models and alternative providers.
2. **Heavy abstraction frameworks (LangChain / LlamaIndex)**: Excessive boilerplate, fragile dependencies, high token overhead.
3. **Lightweight TypeScript Adapter Interface**: Direct HTTP fetch wrappers conforming to a minimal `LLMProvider` contract (`chat()`, `validate()`).

### Decision
Implement a lightweight, dependency-free provider adapter layer in `src/tutor/llm/`.

### Why / Rationale
- Complete independence from third-party framework bloat (Ponytail rule).
- Easily extensible to new providers in under 50 lines of code each.

---

## ADR-008: Ponytail/YAGNI & Standard Library Discipline

### Context
Modern web apps frequently suffer from dependency bloat, leading to security vulnerabilities, slow build times, and brittle maintenance.

### Decision
Enforce Ponytail's minimal-code rules:
- Use native `fetch` over Axios.
- Use native Web Speech API over external voice wrappers.
- Use Vanilla CSS for UI styling over heavy utility frameworks.
- Reuse upstream `mcp_excalidraw` canvas routines rather than introducing redundant graphics libraries.

---

## ADR-009: WebSocket Incremental Batching for Real-Time Whiteboard Updates

### Context
When the AI tutor explains a concept and draws multiple components (such as 4 nodes and 3 connecting arrows), updating the entire canvas scene simultaneously can disrupt student drawing in progress.

### Decision
Use `elements_batch_created` messages broadcast over the existing WebSocket server:
- Tutor-generated elements are assigned unique IDs and appended to the in-memory server state.
- The server broadcasts `elements_batch_created` to all connected clients.
- The client receives and merges only the newly drawn elements without re-initializing or wiping user-drawn elements.

### Why / Rationale
- Preserves student-created content per `AGENTS.md`.
- Provides instantaneous, seamless drawing animation.

---

## ADR-010: Excalidraw Bound Text Container Architecture

### Context
In Excalidraw, text inside a box or diamond can either be an unlinked overlapping element or an officially bound child element. Unbound text does not move when the student drags the box.

### Decision
`src/tutor/canvas-compiler.ts` implements Excalidraw's two-way bound element structure:
1. Container element (e.g. `rectangle`, `diamond`) specifies `boundElements: [{ id: textId, type: 'text' }]`.
2. Text element specifies `containerId: container.id`.
3. Center coordinates are mathematically aligned to container dimensions.

### Why / Rationale
- Makes all tutor-drawn diagrams fully editable: when the student moves or resizes a node on the whiteboard, its label stays perfectly centered.

---

## ADR-011: Automated Viewport Centering on Drawn Elements

### Context
When a diagram is generated on the whiteboard, the user might be zoomed into another section or working at a different coordinate offset.

### Decision
Upon receiving an `elements_batch_created` WebSocket message, the frontend invokes `excalidrawAPI.scrollToContent()` with `fitToViewport: true` and `animate: true` to smoothly transition camera focus to the newly created lesson diagram.

### Why / Rationale
- Enhances student visual feedback immediately without requiring manual scrolling or searching for the new elements.

---

## ADR-012: Dynamic Level-Adaptive Starter Prompts

### Context
New students opening the app need immediate inspiration without having to guess what questions work well with whiteboard visuals.

### Decision
Provide pre-configured starter prompt chips in the empty chat state that dynamically swap depending on the selected level:
- **Beginner**: "How does the Internet work? Use an analogy.", "Explain how Binary Search works with an array.", "What is a database?"
- **Intermediate**: "Draw and explain the JavaScript Event Loop architecture.", "How does JWT authentication work?", "Compare REST vs GraphQL."
- **Pro**: "Illustrate Raft distributed consensus leader election.", "Explain microservices event-driven saga pattern.", "Deep dive into LSM trees vs B+ trees."

### Why / Rationale
- Zero friction onboarding.
- Immediately demonstrates the power of graphical AI tutoring across different difficulty tiers.

---

## ADR-013: Cupertino/Apple Minimalist Aesthetics & Strict Zero-Emoji Rule

### Context
Educational applications often look like toy software or dense engineering dashboards when filled with informal emojis. To feel professional, serious, and focused, the UI requires the quiet, refined clarity of Apple design.

### Decision
1. Eliminate all emojis across the entire interface (header, buttons, level pills, status indicators, prompt chips).
2. Create an in-house minimalist SVG icon set (`frontend/src/components/icons/Icons.tsx`) matching Apple SF Symbols line styling.
3. Adopt Apple design tokens:
   - System font typography (`-apple-system`, `SF Pro Text`) with tight negative letter tracking.
   - High-performance Cupertino frosted glass (`backdrop-filter: blur(20px) saturate(180%)`).
   - Signature System Blue accent (`#0071e3`).
   - Rounded pill segmented controls and smooth micro-interactions.

### Why / Rationale
- Elevates perceived product quality and learner focus.
- Ensures consistency across all operating systems without OS-dependent emoji rendering glitches.

---

## ADR-014: OpenRouter Multi-Tier Model Selection & Free Tier Catalog

### Context
Students have varying budgets: many students cannot afford paid API credits, while others want flagship reasoning models (Claude 3.7 Sonnet, DeepSeek R1). OpenRouter provides both free community models and frontier models through a single standardized API.

### Decision
Implement a specialized OpenRouter catalog in `SettingsModal.tsx`:
- Group models by tier:
  - **Free Tier Models**: `meta-llama/llama-3.3-70b-instruct:free`, `google/gemini-2.0-flash-exp:free`, `qwen/qwen-2.5-coder-32b-instruct:free`, `deepseek/deepseek-r1:free`, `mistralai/mistral-7b-instruct:free`.
  - **Flagship Frontier Models**: `anthropic/claude-3.7-sonnet`, `anthropic/claude-3.5-sonnet`, `openai/gpt-4o-mini`, `deepseek/deepseek-chat`, `deepseek/deepseek-r1`, `google/gemini-2.0-flash-001`.
  - **Custom Model ID Fallback**: Allows typing any arbitrary model string.

### Why / Rationale
- Removes the cost barrier for any student wanting to learn with AI whiteboard diagrams.
- Gives advanced users full flexibility to use frontier reasoning models.

---

## ADR-015: Dynamic 400+ OpenRouter Catalog Proxy, Client-Side Search, and Hook Compliance

### Context
OpenRouter hosts over 440 models, constantly adding new models, price changes, and free tiers. Hardcoding a static list in frontend code leaves students unable to use new or specific models without manual typing. Furthermore, in React, conditional early returns (`if (!isOpen) return null;`) placed before `useMemo` hooks cause React Error #310 (`Rendered more/fewer hooks than during previous render`), breaking the settings UI.

### Decision
1. **Server-Side Cached Proxy (`GET /api/tutor/openrouter/models`)**:
   - Queries `https://openrouter.ai/api/v1/models` and caches the 440+ models in-memory for 1 hour.
   - Formats each model with `id`, `name`, `context_length`, and detects `isFree` based on `pricing.prompt === '0'` or `:free` suffix.
2. **Client-Side Real-Time Filter & Search**:
   - Provides an instant search input (`Search 400+ models...`) with real-time substring matching across model IDs and display names.
   - Adds a "Show free community models only" toggle that filters to 20+ free models.
   - Displays real-time count badges (e.g., `15 of 443 models`, `22 of 443 models`).
3. **React Rules-of-Hooks Compliance**:
   - Relocated `if (!isOpen) return null;` strictly to the bottom of `SettingsModal.tsx`, after all `useState`, `useEffect`, and `useMemo` hooks execute unconditionally on every render.
   - Ensured `selectedModel` is always preserved in `currentModelOptions` even if filtered by search query so the `<select>` value never unsets.

### Why / Rationale
- Gives students access to all 443 OpenRouter models with zero latency via server caching.
- Eliminates React hook rendering crashes.
- Makes finding any model instantaneous without manual string entry.

---

## ADR-016: Nemo 3 Ultra / OpenRouter Model Compatibility, Key Verification & Message Sanitization

### Context
When testing OpenRouter models like `nvidia/nemotron-3-ultra-550b-a55b:free` ("Nemo 3 Ultra"), two critical issues occurred:
1. Provider returned `400 Bad Request: missing field 'content'` from Nvidia's upstream NIM API because messages with undefined or empty text were serialized without the required `content` field.
2. Free tier models frequently rejected `response_format: { type: 'json_object' }` with 400/422 status codes, causing generation failure.
3. The previous connection test endpoint verified `/models` which returns HTTP 200 on OpenRouter even without an API key, misleading students into thinking an empty or invalid key was verified.

### Decision
1. **Model Alias Normalization**:
   - Implemented `resolveModelAlias()` in `src/tutor/llm/provider-adapter.ts` mapping casual user queries (e.g. `nemo 3 ultra`, `nemotron 3 ultra`, `nemo 3 ultra free`) directly to `nvidia/nemotron-3-ultra-550b-a55b:free`.
2. **Strict Message Sanitization**:
   - Clean all conversation messages before sending: only messages with non-empty string content are included, and system prompt is cleanly separated.
3. **Automatic Fallback for JSON Mode**:
   - If any model returns a 4xx error with `response_format`, automatically retry immediately without `response_format`. The orchestrator's `extractJson()` parser safely extracts the `{ ... }` JSON block from raw output.
4. **Dedicated OpenRouter Key Verification**:
   - Validate OpenRouter keys via `https://openrouter.ai/api/v1/auth/key` with `Authorization: Bearer <key>`, accurately verifying key validity, label, and credit limit.

### Why / Rationale
- Guarantees seamless operation with NVIDIA Nemotron 3 Ultra and all OpenRouter free tier models.
- Eliminates silent authentication errors and misleading connection test results.

---

## ADR-017: Apple-Grade SVG Icon Standardization & Global Button Isolation

### Context
Buttons in the header (audio toggle, sync, clear whiteboard, toggle chat, settings) and chat composer (mic, send) were rendered without visible SVG icons, appearing as empty boxes. Investigation revealed:
1. `index.html` contained a legacy global `button { padding: 8px 16px; }` rule that forced horizontal padding into compact 34px/36px icon buttons, compressing the SVG content area to zero or pushing it off-bounds.
2. The Settings modal buttons and form labels lacked descriptive icons, detracting from the Apple-grade aesthetic.

### Decision
1. **Isolate Legacy CSS**:
   - Scoped the legacy rule in `index.html` to `.legacy-btn`, preventing it from polluting modern UI buttons.
2. **Standardize Icon Button CSS**:
   - Added `box-sizing: border-box !important; padding: 0 !important; display: inline-flex;` to `.icon-btn` and `.composer-btn`.
   - Explicitly defined SVG dimensions (`16px x 16px`), `stroke: currentColor`, and `fill: none`.
3. **Comprehensive Icon Set Expansion**:
   - Added icons to all Settings modal labels and buttons: `CpuIcon` (AI Provider), `LayersIcon` (Model Selection), `KeyIcon` (API Key), `GlobeIcon` (Base URL), `ZapIcon` (Test Connection), `XIcon` (Cancel), `CheckIcon` (Save Preferences), `CheckCircleIcon` / `AlertCircleIcon` (Status).

### Why / Rationale
- Completely fixes missing/invisible icons across the application.
- Enforces pixel-perfect Apple aesthetic consistency across all components.

---

## ADR-018: Edge Neural TTS Architecture with English & Urdu Multi-Voice Support

### Context
Students reported that the browser's built-in `window.speechSynthesis` produced robotic, unnatural voices with inconsistent quality across operating systems. Furthermore, Urdu voices were either completely absent or unintelligible on standard browser speech synthesis. A human-like, realistic tutor voice is essential for immersion and comprehension.

### Decision
1. **Adopt Microsoft Edge Neural TTS (`edge-tts`)**:
   - Integrated Python `edge-tts` on the backend, generating 24kHz studio-quality Neural speech with natural pacing and pitch.
   - Zero cost, zero API keys required, running locally.
2. **Curated Multi-Voice & Urdu Catalog**:
   - **English (Male)**: `en-US-ChristopherNeural` (warm tutor), `en-US-GuyNeural`, `en-GB-RyanNeural`.
   - **English (Female)**: `en-US-JennyNeural` (clear academic), `en-US-AriaNeural`, `en-GB-SoniaNeural`.
   - **Urdu (Male)**: `ur-PK-AsadNeural` (authentic Pakistani Urdu accent), `ur-IN-SalmanNeural`.
   - **Urdu (Female)**: `ur-PK-UzmaNeural` (natural Pakistani Urdu accent), `ur-IN-GulNeural`.
3. **Dual-Track Fallback**:
   - Voice synthesis requests stream from `/api/tutor/tts`. If the backend or network is temporarily unreachable, the frontend automatically falls back to browser `speechSynthesis` without breaking the lesson flow.

### Why / Rationale
- Delivers realistic, human-quality voice synthesis for both English and Urdu learners.
- Complies strictly with AGENTS.md rule: *"Text must always work when voice fails. Voice is optional."*

---

## ADR-019: Step-by-Step Pedagogical Sequencer & Canvas Highlighting Protocol

### Context
Previously, when the AI tutor responded, it rendered the entire whiteboard drawing simultaneously and spoke the entire explanation paragraph at once. Students experienced cognitive overload because the canvas was suddenly populated with complex shapes before the tutor had explained them.

### Decision
1. **Teaching Step Schema (`TeachingStep`)**:
   - Extended `TutorResponseSchema` with `steps: z.array(TeachingStepSchema)`.
   - Each step encapsulates: `stepNumber`, `title`, `speech` (audio narration), `explanation` (markdown text), `draw` (step-specific drawing ops), and `highlightElementIds`.
2. **Interactive Step Player**:
   - Built a frontend `StepPlayer` coordinating the playback timeline:
     - Step 1: Draw element -> highlight element -> play step speech.
     - Step 2: Draw connecting relationships -> shift highlight -> play step speech.
     - Conclusion: Quick check checkpoint.
   - Provided student controls: Play/Pause, Next Step, Previous Step, Replay Step, and Auto-Advance.
3. **Backward Compatibility**:
   - If an LLM returns a single-turn legacy response without `steps`, the player treats it as a single step seamlessly.

### Why / Rationale
- Mirrors real-world teaching where an instructor sketches on the board step-by-step while explaining each concept.
- Greatly increases student comprehension and engagement.

---

## ADR-020: Native Mermaid Diagram Compilation & Advanced Excalidraw Visual Primitives

### Context
Drawing complex architectures or algorithms by calculating individual box and arrow coordinates (`x`, `y`, `w`, `h`) is error-prone for LLMs. In contrast, LLMs excel at generating text-based Mermaid syntax (`graph TD; A-->B-->C`). While `@excalidraw/mermaid-to-excalidraw` was listed in `package.json`, it was never connected to the live canvas.

### Decision
1. **Native Mermaid Execution**:
   - Added `op: "mermaid"` to the drawing DSL and wired `mermaid_convert` in the frontend using `@excalidraw/mermaid-to-excalidraw`.
   - Mermaid diagrams (flowcharts, sequence diagrams, class diagrams) instantly compile into native, editable Excalidraw shapes.
2. **Domain Visual Primitives (Architecture & Science Library)**:
   - Expanded `canvas-compiler.ts` to support:
     - `database`: Cylinder shape with 3D cap and label.
     - `cloud`: Multi-lobed cloud contour for external networks/APIs.
     - `actor`: User/client silhouette avatar.
     - `queue`: Horizontal message pipeline buffer.
     - `container`: Subsystem boundary box with badge title.
     - `note`: Callout card for formulas or important reminders.

### Why / Rationale
- Allows the AI tutor to generate sophisticated, publication-grade diagrams effortlessly.
- Preserves native editability for students on the Excalidraw canvas.

---

## ADR-021: Model Performance Diagnosis & LLM Structured Prompt Calibration

### Context
Testing with NVIDIA Nemotron 3 Ultra (Free tier on OpenRouter) produced poor results: truncated responses, missing drawing coordinates, or high latency. The user questioned whether this was due to model limitations or architecture.

### Decision
1. **Diagnosis**:
   - Identified that Nemotron 3 Ultra on OpenRouter Free tier suffers from strict output token throttling (<1024 tokens) and poor 2D coordinate calculation.
2. **Structural Remediation**:
   - Decomposed responses into `steps`, reducing per-step token load.
   - Enabled Mermaid syntax, allowing the model to leverage its strong textual graph training instead of computing pixel coordinates.
   - Added curated recommendations in the Settings modal for high-performance free models:
     - Google Gemini 2.0 Flash (Free on Google AI Studio).
     - Groq Llama 3.3 70B Versatile (Free, 250+ tokens/sec).
     - Qwen 2.5 Coder 32B Free.

### Why / Rationale
- Directly resolves model bottlenecks and empowers students to get exceptional tutoring results on both free and flagship models.

---

## ADR-022: Dynamic Step-by-Step Whiteboard Engine, Visual Step Synthesizer & Camera Gliding

### Context
Students reported: "it is not drawing in the canvas i want step by step drawing of every lesson asked syncrnized with the speach or the answer said by ai tutor".
Root cause investigation revealed:
1. When open LLMs return drawing operations, they frequently emit `{ op: "text", label: "..." }` or `{ op: "note", content: "..." }` rather than strictly `text`. The previous Zod schema strictly demanded `text: z.string()`, triggering schema validation failures and dropping to a text-only fallback with `draw: []`.
2. When the LLM returned steps, `handleStepChange` in `frontend/src/App.tsx` only selected existing elements; it never dynamically compiled or injected the step's shapes onto the Excalidraw whiteboard.
3. The server was blasting the entire diagram at once in an initial WebSocket broadcast before speech started.
4. Auto-play was disabled by default, requiring manual user clicks to begin drawing each step.

### Decision
1. **Schema Resilience & Normalization**:
   - Updated `DrawingOpSchema` and `TeachingStepSchema` in `src/tutor/types.ts` to accept `label`, `content`, `text`, `syntax`, and `code` interchangeably.
   - Added `compiledElements` directly into `TeachingStepSchema`.
2. **Guaranteed Visual Step Synthesizer (`synthesizeVisualSteps`)**:
   - In `src/tutor/orchestrator.ts`, if an LLM returns a text explanation without steps or with empty drawings, the orchestrator automatically synthesizes 3 structured pedagogical steps (Client/Actor, Processing Engine/Cloud, and Persistence/Storage).
   - The whiteboard is guaranteed to never remain blank.
3. **Per-Step Compilation & WebSocket Suppression**:
   - The server compiles each step's `draw` operations into `step.compiledElements` using `compileDrawingOperations()`.
   - The server suppresses upfront full-canvas WebSocket batch broadcasting when `steps` exist, delegating the synchronized drawing pacing to the client's `StepPlayer`.
4. **Dynamic Canvas Injection & Camera Tracking**:
   - In `frontend/src/App.tsx`, `handleStepChange` unpacks `step.compiledElements` or parses `step.mermaid`, merges them into the Excalidraw scene, selects the active shapes, and calls `api.scrollToContent(elements, { animate: true, duration: 400, viewportZoomFactor: 0.85 })`.
5. **Seamless Speech-Drawing AutoPlay**:
   - In `StepPlayer.tsx`, enabled `autoPlay` by default upon mounting. Step 1's drawing and speech begin immediately.
   - Upon audio completion, the player automatically progresses to Step 2, rendering Step 2's shapes and narrating Step 2's speech.

### Why / Rationale
- Completely eliminates blank canvas occurrences regardless of which LLM or free tier model is used.
- Delivers a true pedagogical whiteboard experience where each diagram piece appears in real time alongside its corresponding voice explanation.

---

## ADR-023: Topic-Faithful Semantic Visual Synthesis & Elimination of Domain Prompt Bias

### Context
Students reported: "so it is drawing but it is not correct and what is it saying is also wrong i asked photosynthesis and it explain something else i dont know that you made it explain same thing for every question asked".
Investigation revealed:
1. `src/tutor/prompt-builder.ts` contained a computer-science-only system prompt example (`Client / User`, `API Server`, `HTTP Request`, `Database`), causing LLMs to anchor to client/server web architecture even for non-software topics.
2. In `src/tutor/orchestrator.ts`, if JSON parsing failed or if the model returned plain text, the fallback `synthesizeVisualSteps` had hardcoded shapes (`Client / Input`, `Execution Engine`, `State / Storage`) and hardcoded speeches ("We start with the client initiating the process", "Next the core execution engine processes...", "State changes are persisted..."). This completely overwrote the student's question topic and explained software client-server architecture for every question asked (including Photosynthesis, Gravity, or Biology).
3. `orchestrator.ts` attempted a secondary recursive LLM repair call (`provider.generate`) upon schema mismatch, which consistently timed out on free-tier models and dropped to the CS fallback.

### Decision
1. **Domain Bias Elimination in Prompt Builder**:
   - Replaced software-only prompt examples with a domain-agnostic pedagogical template (Starting Elements/Inputs -> Core Mechanism/Reaction -> Outcomes & Impact).
   - Added explicit domain faithfulness constraints: the model must adapt drawing labels, shapes, and speech strictly to the student's question topic (e.g. for Photosynthesis: Sunlight, Water, Chloroplast, Glucose, Oxygen).
2. **Resilient In-Memory JSON Extraction & Auto-Repair**:
   - Built `extractAndSanitizeJson` to handle unescaped newlines in strings, trailing commas, and unclosed brackets without failing.
   - Eliminated the secondary recursive LLM repair call, replacing it with in-memory normalization of fields directly in TypeScript.
3. **Semantic Topic Step Synthesizer (`synthesizeTopicSteps`)**:
   - When text fallback is necessary, `synthesizeTopicSteps` extracts real sentences directly from the tutor's actual response narrative.
   - Uses keyword extraction to label whiteboard nodes with the actual concepts mentioned (e.g., "Sunlight & Water", "Chloroplast", "Glucose & Oxygen").
   - Spoken narration is the actual topic explanation from the AI tutor, with zero irrelevant software terminology.

### Why / Rationale
- Completely eliminates "same explanation for every question" behavior.
- Guarantees that every academic topic (Science, Math, Biology, Technology, Humanities) receives accurate whiteboard diagrams and synchronized speech tailored to that exact subject.

---

## ADR-024: SSRF-Protected Educational Image Search, Visual Deep Dive & Vector Library Integration

### Context
Students requested the ability for the AI Tutor to import authentic real-world images from the internet, analyze them, and present them on the canvas alongside the conceptual diagrams with synchronized spoken explanations. Additionally, the student requested a solution for enabling the AI Tutor to use the Excalidraw vector libraries.

### Decision
1. **SSRF-Guarded Image Search Engine (`image-service.ts`)**:
   - Integrated Wikimedia Commons and Wikipedia REST APIs to search and download authentic educational diagrams, anatomical illustrations, and micrographs with zero API keys.
   - Enforced strict SSRF protection: validated public HTTPS endpoints, blocked RFC 1918 private subnets, loopbacks, and cloud metadata (169.254.169.254), verified MIME types (`image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`), and capped payload size to 5MB.
2. **Visual Evidence Deep Dive Phase**:
   - Following step-by-step whiteboard drawings, the tutor automatically searches for a matching real-world diagram and attaches a dedicated Deep Dive Step.
   - The image is encoded into a Data URL with a unique `fileId` and compiled into an Excalidraw `type: "image"` element accompanied by an empirical caption note card.
   - The tutor speaks a detailed analysis connecting the whiteboard lesson to the real-world visual.
3. **Canvas Ingestion & Camera Gliding**:
   - `frontend/src/App.tsx` ingests binary files via `api.addFiles()`.
   - Smoothly zooms and centers the viewport on the imported image (`api.scrollToContent`).
4. **Vector Library Registry (`library-registry.ts`)**:
   - Built a curated library registry featuring compound vector components (`chloroplast`, `mitochondria`, `battery`, `microservice`).
   - Added `op: "library_symbol"` to the canvas compiler, dynamically expanding library symbols into scaled, multi-element native vector shapes.
   - Exposed `GET /api/tutor/libraries` for whiteboard drawer synchronization.

### Why / Rationale
- Combines intuitive pedagogical vector diagrams with authentic empirical evidence from scientific literature.
- Complies with AGENTS.md rules regarding SSRF protection and preserving native Excalidraw elements.

---

## ADR-025: Open-Web Multi-Source Image Engine (DuckDuckGo, Pinterest, Openverse) & Native Excalidraw Library Injection

### Context
Students requested the ability for the AI Tutor to discover and import educational images not merely from Wikipedia/Wikimedia, but from the broader internet (Pinterest, educational blogs, photo libraries, Vecteezy, etc.), analyze them first, and then present them on the canvas alongside the whiteboard lesson with synchronized speech explanation. In addition, students requested full usability of Excalidraw vector libraries in the application.

### Decision
1. **Multi-Source Open Web Image Discovery Engine (`image-service.ts`)**:
   - Implemented DuckDuckGo Image Search (`duckduckgo.com/i.js`) crawler and query pipeline. This opens search to the entire open web, allowing students to access diagrams, infographics, and graphics across Pinterest (`*.pinimg.com`), educational domains, blogs, and image hosts without proprietary search API keys.
   - Integrated Openverse API (`api.openverse.org`) for hundreds of millions of CC-licensed cultural, anatomical, and scientific assets.
   - Maintained Wikipedia and Wikimedia Commons summary search as an encyclopedic peer-reviewed fallback.
2. **SSRF Guard & CDN Fetching**:
   - Every candidate image URL is vetted with strict SSRF defense: enforces HTTPS, resolves DNS hostnames to verify public IPs (blocking RFC 1918 private subnets, loopbacks, link-local metadata addresses `169.254.169.254`), checks MIME types, and caps buffer size to 5MB.
   - Injected browser-grade headers (`User-Agent`, `Accept: image/*`, `Referer`) so image hosts and CDNs (including Pinterest's `i.pinimg.com`) allow safe image retrieval.
3. **AI Tutor Visual Analysis First**:
   - In `orchestrator.ts`, before presenting the image, the tutor performs a pedagogical visual analysis connecting the whiteboard conceptual flow to the concrete physical features visible in the image.
   - Attaches the image (`op: 'image'`) and an analytical sticky note (`op: 'note'`) to the canvas.
   - Emits a final dedicated teaching step ("Visual Analysis & Evidence") with synchronized spoken analysis and automatic viewport camera gliding.
4. **Native Excalidraw Library Drawer Injection (`library-registry.ts` & `App.tsx`)**:
   - Added `exportExcalidrawLibraryItems()` in `library-registry.ts` translating curated compound components into standard Excalidraw library item format (`{ id, status: 'published', elements, title }`).
   - In `frontend/src/App.tsx`, upon Excalidraw API mounting, calls `excalidrawAPI.updateLibrary({ libraryItems, merge: true })`.
   - Makes custom educational libraries immediately available inside Excalidraw's native Library drawer for both student and tutor whiteboard drawing.

### Why / Rationale
- Expands visual evidence discovery to the open internet (Pinterest, Vecteezy, edu blogs, etc.) as explicitly requested by the student, while preserving strict SSRF security.
- Deepens pedagogical value by having the AI tutor critically analyze the real-world visual rather than just displaying an uninspected thumbnail.
- Seamlessly integrates with Excalidraw's built-in vector library drawer without modifying Excalidraw core internals.

---

## ADR-026: Dynamic Whiteboard Spatial Partitioning, Perimeter-Edge Arrow Routing & Real-World Visual Evidence Chat Surface

### Context
Students reported three interrelated whiteboard usability challenges:
1. **Diagram Collisions**: When asking consecutive questions, the tutor drew subsequent diagrams directly on top of pre-existing whiteboard drawings at fixed coordinates (`x: 140, y: 220`), trampling previous student and tutor work.
2. **Arrow & Text Collisions**: Connecting arrows passed straight through the centers of shapes and collided with centered text labels, slicing through text readability. Additionally, arrows did not connect properly when targeting compound vector library symbols.
3. **Missing Library & Visual Evidence Visibility**: Although compound vector symbols (`chloroplast`, `mitochondria`, `battery`, `microservice`) and internet images were implemented, the tutor was not actively selecting vector symbols during dynamic topic synthesis, and the frontend chat panel did not display an evidence card for students to inspect the retrieved image.

### Decision
1. **Dynamic Canvas Spatial Partitioning (`getCanvasBounds` & `orchestrator.ts`)**:
   - `getCanvasBounds()` dynamically computes the active bounding box of all non-deleted elements on the whiteboard (`minX, maxX, minY, maxY`).
   - If the canvas has elements and `maxX < 1500`, it calculates `suggestedStartX = maxX + 140` and `suggestedStartY = Math.max(160, minY)` to place new drawings cleanly to the right.
   - If the canvas is already wide (`maxX >= 1500`), it wraps to a clean row below at `suggestedStartX = 120, suggestedStartY = maxY + 140`.
   - Drawing Shift Guard: if any drawing operations generated by an LLM or step synthesizer have `x < canvasBounds.suggestedStartX`, they are automatically shifted by `shiftX = canvasBounds.suggestedStartX - minX`.
   - The educational image step is offset to `suggestedStartX + 860`, guaranteeing zero overlap with the conceptual diagram or pre-existing whiteboard items.
2. **Perimeter Edge-to-Edge Arrow Connection & Label Elevation (`canvas-compiler.ts`)**:
   - Replaced center-to-center arrow math with perimeter edge-to-edge calculations based on principal flow direction (horizontal vs vertical) with 8px clearance gaps.
   - Horizontal arrows center labels horizontally between endpoints and elevate them 24px above the line (`startY + dy / 2 - 24`).
   - Vertical arrows place labels 14px to the right of the vertical shaft (`startX + 14`), completely preventing text labels from slicing through arrow lines.
   - For `op: 'library_symbol'`, the compiler registers `op.id` pointing to the primary outer element (`symElements[0]`), enabling arrows to bind cleanly to compound vector components.
3. **Vector Library Symbol Activation & Expansion (`library-registry.ts`)**:
   - Added `atom` (Bohr model nucleus & orbitals) and `neuron` (soma & axon synapse) to `LIBRARY_REGISTRY`.
   - In `synthesizeTopicSteps`, `findMatchingLibrarySymbol(qTopic + ' ' + question)` automatically selects the appropriate vector library component for Step 2 (e.g. `chloroplast` for biology/photosynthesis, `mitochondria` for respiration, `battery` for circuits, `microservice` for architecture, `atom` for chemistry/physics, `neuron` for AI).
4. **Authentic Visual Evidence Card in Chat Surface (`ChatPanel.tsx` & `tutor.css`)**:
   - Extended `ChatMessage` with `visualEvidence` metadata.
   - Rendered a Cupertino-grade Visual Evidence Card in the tutor response bubble featuring the image thumbnail, origin source pill (`Pinterest`, `Wikimedia Commons`, `Open Web`), diagram title, and analytical quote.
   - Persisted image binary in `files.set(imgResult.fileId, ...)` to prevent data loss during canvas synchronization.

### Why / Rationale
- Completely eliminates whiteboard diagram collisions and preserves the spatial continuity of long tutoring sessions.
- Ensures clean, publication-grade diagram aesthetics with non-colliding arrows and readable labels.
- Brings authentic visual evidence directly into the student chat stream while synchronizing with the Excalidraw canvas.

---

## ADR-027: Socratic Teacher Pedagogy Framework vs Textbook Reader Anti-Pattern

### Context
Students noted that the AI tutor was explaining concepts like a passive "reader" reciting dry dictionary or encyclopedia definitions ("X is defined as a Y that does Z") rather than acting like an inspiring, active classroom teacher. In real-world education, an effective teacher does not start with cold formal jargon. Instead, a teacher:
1. Hooks the student with an intuitive mental picture and a relatable real-world comparison or analogy ("What is it?").
2. Immediately motivates why the concept exists, what problem it solves, and why we need it ("Why we need it & Why is it useful?").
3. Walks step-by-step through the physical, logical, or biological mechanics as they draw them on the whiteboard ("How does it work?").
4. Explains real-world significance and applications ("Where do we see this?").
5. Checks for understanding with an engaging, friendly checkpoint question.

### Decision
1. **System Prompt Persona Transformation (`prompt-builder.ts`)**:
   - Replaced passive summary prompts with the strict "CRITICAL PEDAGOGY RULE — TEACH LIKE A TEACHER, NOT A PASSIVE READER".
   - Mandated the 4-part teaching structure across all levels (Beginner, Intermediate, Pro):
     * **1. WHAT IS IT? (The Intuitive Hook)**: Relatable analogy, intuitive mental picture in plain words before jargon.
     * **2. WHY WE NEED IT & WHY IS IT USEFUL? (The Motivation)**: What fundamental problem does it solve? What breaks or fails without it?
     * **3. HOW DOES IT WORK? (The Step-by-Step Whiteboard Walkthrough)**: Inputs -> Core Mechanism/Engine -> Outputs.
     * **4. REAL-WORLD SIGNIFICANCE & QUICK CHECK**: Practical connection and interactive checkpoint.
   - Whiteboard drawing guidelines now mandate that Step 3 includes a dedicated "Why We Need It" takeaway note on the canvas.
2. **Pedagogical Step Synthesizer (`synthesizeTopicSteps` in `orchestrator.ts`)**:
   - Refactored dynamic and fallback step generation to reflect genuine teacher speech and structured phase titles:
     * Phase 1: `1. What It Is & Key Inputs`
     * Phase 2: `2. How It Works: The Mechanism`
     * Phase 3: `3. Results & Why We Need It`
   - Generated note explicitly states `Why We Need It (${qTopic}): ... Essential for real-world functioning.`

### Why / Rationale
- Transforms the application from a robotic query responder into an empathetic, engaging tutor that fosters genuine conceptual mastery.
- Ensures the student understands both the theoretical mechanics and the practical real-world motivation behind every concept.

---

## ADR-028: Direct Whiteboard Canvas Image Placement & Dual-Surface Ingestion

### Context
When the AI tutor retrieved an authentic educational diagram or scientific image (via DuckDuckGo, Pinterest, Openverse, or Wikipedia), the image was previously only displayed in a thumbnail card inside the chat sidebar. It was not immediately imported onto the Excalidraw whiteboard canvas, confusing students who expected to see the authentic diagram on the primary whiteboard teaching surface alongside the hand-drawn elements.

### Decision
1. **Direct Canvas Image Ingestion (`orchestrator.ts` & `App.tsx`)**:
   - In `orchestrator.ts`, pre-compiles the retrieved educational image into a native Excalidraw `image` element (`status: 'saved'`, dimensions, position) and its companion caption note into `parsedResponse.visualEvidenceElements`.
   - In `frontend/src/App.tsx`, upon receiving `data.visualEvidenceElements` and `data.files`, immediately ingests binary files via `api.addFiles()` and merges the image and caption note into the active Excalidraw scene elements.
   - Positions the image at `suggestedStartX + 860`, placing it in a dedicated visual analysis zone cleanly to the right of the conceptual diagram without collisions.
2. **Dual-Surface Whiteboard Action Bar (`ChatPanel.tsx`)**:
   - In the chatbox `visual-evidence-card`, added an active status pill (`✓ Imported to Canvas`) and a **"Show on Whiteboard"** action button.
   - When clicked, `handleFocusEvidenceImage` automatically centers and zooms the Excalidraw camera right onto the image on the whiteboard (`api.scrollToContent([target], { fitToViewport: true, animate: true })`), highlighting it for instant focus.

### Why / Rationale
- Restores the canvas as the single source of visual truth in accordance with project principles (`AGENTS.md`).
- Gives the student instant visual access on the whiteboard while providing a convenient camera glide shortcut directly from the chat card.

---

## ADR-029: Socratic Educational Domain Engine & Curated Hematology/Biology Knowledge Registry

### Context
When external LLM API calls encountered network timeouts or missing API keys, the server previously placed a canned error message into `rawOutput` ("I am having trouble connecting to the AI provider, but let's explore..."). When a student asked about "blood groups", the step synthesizer sliced that error message into sentences and extracted stopwords, producing nonsensical whiteboard nodes labeled "Trouble & Connecting", "Look & Need", and "Produces & Final", causing the tutor to discuss completely unrelated phrases instead of actual blood group science.

### Decision
1. **Dedicated Topic Knowledge Engine (`src/tutor/topic-knowledge.ts`)**:
   - Implemented a rich, domain-aware educational knowledge registry for core STEM concepts following the four-part teacher pedagogy (What is it, Why we need it, How it works, Real-world impact).
   - Curated high-fidelity topics:
     * **Blood Groups & ABO System**: Red blood cells, surface antigens (A, B, Rh D), plasma antibodies (anti-A, anti-B), ABO classification matrix, transfusion compatibility (Universal Donor O-, Universal Recipient AB+), agglutination risks.
     * **Photosynthesis**: Inputs, chloroplast thylakoids & Calvin cycle, outputs, atmospheric life support.
     * **Cellular Respiration, Atomic Structure, Electric Circuits, Microservices, Neural Networks**.
   - Universal Dynamic Fallback (`fetchDynamicWikipediaSummary`): Queries the Wikipedia Summary API to extract authentic peer-reviewed encyclopedia extracts when uncurated topics are queried, completely eliminating error-string hallucinations.
2. **Compound Vector Symbol for Blood Groups (`src/tutor/library-registry.ts`)**:
   - Added `blood_cell` vector symbol to `LIBRARY_REGISTRY`:
     * Biconcave erythrocyte disc with inner concave dimple.
     * Surface Antigen A marker (blue diamond/square) and Antigen B marker (amber circle).
     * Rh(+) factor marker badge.
     * Integrates directly into the native Excalidraw library drawer and whiteboard diagram steps.
3. **Provider Adapter Default Resolution & Timeouts (`src/tutor/llm/provider-adapter.ts`)**:
   - Explicitly resolved default `baseUrl` for `openrouter` (`https://openrouter.ai/api/v1`), `groq` (`https://api.groq.com/openai/v1`), and `ollama` (`http://localhost:11434/v1`).
   - Added `AbortSignal.timeout(14000)` to all fetch requests to prevent indefinite network hanging.
4. **Orchestrator Fallback Upgrades (`src/tutor/orchestrator.ts`)**:
   - Replaced error-string synthesis with `generateIntelligentTopicLesson(query, level, startX, startY)`.
   - Guaranteed that error messages are never sliced or passed to step synthesis.

### Why / Rationale
- Guarantees that the Graphical AI Tutor always delivers rich, accurate, and inspiring pedagogical explanations and diagrams across core subjects even during network disconnections or unconfigured LLM credentials.
- Prevents embarrassing hallucinations and ensures students always learn genuine science.




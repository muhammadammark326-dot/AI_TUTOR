import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('graphify-out');
const wikiDir = path.join(outDir, 'wiki');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
if (!fs.existsSync(wikiDir)) fs.mkdirSync(wikiDir, { recursive: true });

const nodes = [
  // Core System
  { id: 'app_entry', label: 'App Entry & Canvas Backend', file: 'src/server.ts', type: 'backend_server', community: 'backend' },
  { id: 'server_types', label: 'Canvas Server Types & Memory Store', file: 'src/types.ts', type: 'types', community: 'backend' },
  
  // Tutor Engine
  { id: 'tutor_orchestrator', label: 'Tutor Orchestrator', file: 'src/tutor/orchestrator.ts', type: 'backend_service', community: 'tutor_engine' },
  { id: 'canvas_compiler', label: 'Drawing DSL to Excalidraw Compiler', file: 'src/tutor/canvas-compiler.ts', type: 'compiler', community: 'tutor_engine' },
  { id: 'prompt_builder', label: 'Pedagogical Prompt Builder', file: 'src/tutor/prompt-builder.ts', type: 'pedagogy', community: 'tutor_engine' },
  { id: 'provider_adapter', label: 'Universal LLM Provider Adapter', file: 'src/tutor/llm/provider-adapter.ts', type: 'llm_client', community: 'tutor_engine' },
  { id: 'tutor_types', label: 'Tutor Schemas & Zod Contracts', file: 'src/tutor/types.ts', type: 'schemas', community: 'tutor_engine' },

  // Frontend Shell & UI
  { id: 'frontend_shell', label: 'Frontend App Shell', file: 'frontend/src/App.tsx', type: 'react_component', community: 'frontend' },
  { id: 'header_component', label: 'Apple Header & Level Selector', file: 'frontend/src/components/header/Header.tsx', type: 'react_component', community: 'frontend' },
  { id: 'chat_component', label: 'Pedagogical Chat & Voice Composer', file: 'frontend/src/components/chat/ChatPanel.tsx', type: 'react_component', community: 'frontend' },
  { id: 'settings_modal', label: 'BYOK & OpenRouter Model Settings', file: 'frontend/src/components/settings/SettingsModal.tsx', type: 'react_component', community: 'frontend' },
  { id: 'icons_library', label: 'Minimalist Apple SVG Icons', file: 'frontend/src/components/icons/Icons.tsx', type: 'react_icons', community: 'frontend' },
  { id: 'voice_hook', label: 'Web Speech API Voice Hook', file: 'frontend/src/hooks/useVoice.ts', type: 'react_hook', community: 'frontend' },
  { id: 'design_system', label: 'Apple Design System CSS', file: 'frontend/src/styles/tutor.css', type: 'styling', community: 'frontend' },

  // External Upstream
  { id: 'excalidraw_canvas', label: '@excalidraw/excalidraw', file: 'node_modules/@excalidraw/excalidraw', type: 'external_lib', community: 'canvas' },

  // Architecture & Decisions
  { id: 'decision_log', label: 'Decisions Log (ADRs)', file: 'decision.md', type: 'documentation', community: 'docs' },
  { id: 'flow_blueprint', label: 'System Flow Blueprint', file: 'flow.md', type: 'documentation', community: 'docs' },
];

const edges = [
  // Frontend interactions
  { from: 'frontend_shell', to: 'header_component', relation: 'renders' },
  { from: 'frontend_shell', to: 'chat_component', relation: 'renders' },
  { from: 'frontend_shell', to: 'settings_modal', relation: 'renders' },
  { from: 'frontend_shell', to: 'excalidraw_canvas', relation: 'embeds' },
  { from: 'frontend_shell', to: 'voice_hook', relation: 'uses' },
  { from: 'frontend_shell', to: 'design_system', relation: 'styled_by' },
  { from: 'header_component', to: 'icons_library', relation: 'imports_icons' },
  { from: 'chat_component', to: 'icons_library', relation: 'imports_icons' },
  { from: 'settings_modal', to: 'icons_library', relation: 'imports_icons' },

  // Client to Server
  { from: 'frontend_shell', to: 'app_entry', relation: 'websocket_sync' },
  { from: 'chat_component', to: 'app_entry', relation: 'http_post_chat' },
  { from: 'settings_modal', to: 'app_entry', relation: 'http_test_connection' },

  // Backend flow
  { from: 'app_entry', to: 'tutor_orchestrator', relation: 'dispatches_chat' },
  { from: 'tutor_orchestrator', to: 'prompt_builder', relation: 'generates_prompt' },
  { from: 'tutor_orchestrator', to: 'provider_adapter', relation: 'calls_llm' },
  { from: 'tutor_orchestrator', to: 'tutor_types', relation: 'validates_schema' },
  { from: 'tutor_orchestrator', to: 'canvas_compiler', relation: 'compiles_draw_ops' },
  { from: 'canvas_compiler', to: 'server_types', relation: 'creates_server_elements' },
  { from: 'tutor_orchestrator', to: 'app_entry', relation: 'mutates_scene_and_broadcasts' },
  { from: 'app_entry', to: 'frontend_shell', relation: 'websocket_broadcast_elements' },

  // Doc linkages
  { from: 'flow_blueprint', to: 'app_entry', relation: 'documents' },
  { from: 'flow_blueprint', to: 'tutor_orchestrator', relation: 'documents' },
  { from: 'decision_log', to: 'canvas_compiler', relation: 'justifies_dsl' },
  { from: 'decision_log', to: 'settings_modal', relation: 'justifies_byok' },
];

const graph = {
  version: '1.0.0',
  generatedAt: new Date().toISOString(),
  metrics: {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    communities: ['backend', 'tutor_engine', 'frontend', 'canvas', 'docs'],
  },
  nodes,
  edges,
};

fs.writeFileSync(path.join(outDir, 'graph.json'), JSON.stringify(graph, null, 2), 'utf-8');

const report = `# Graphify Knowledge Graph Report — Graphical AI Tutor

## 1. Graph Statistics
- **Total Nodes**: ${nodes.length}
- **Total Relationships (Edges)**: ${edges.length}
- **Detected Communities**: 5
  - \`frontend\`: React components, hooks, SVG icons, Apple styling
  - \`tutor_engine\`: Orchestrator, DSL compiler, prompt builder, LLM adapter, Zod schemas
  - \`backend\`: Express server, WebSocket broadcasting, in-memory scene store
  - \`canvas\`: Excalidraw vector rendering engine
  - \`docs\`: ADR decision logs, system flow blueprints, PRD/TRD

## 2. God Nodes (Central Architectural Hubs)
1. **\`tutor_orchestrator\` (src/tutor/orchestrator.ts)**:
   - High centrality. Coordinates prompt assembly, LLM calls, schema validation, drawing compilation, and scene mutation.
2. **\`frontend_shell\` (frontend/src/App.tsx)**:
   - Central view hub. Manages WebSocket lifecycle, Excalidraw imperative API, pedagogical state, and modal triggers.
3. **\`app_entry\` (src/server.ts)**:
   - Real-time transport hub. Binds Express HTTP REST and WebSocket broadcasting.

## 3. Data & Control Flow Paths
- **Student Message Path**: \`chat_component\` -> \`app_entry\` -> \`tutor_orchestrator\` -> \`provider_adapter\` -> \`canvas_compiler\` -> \`app_entry\` -> (WebSocket) -> \`frontend_shell\` -> \`excalidraw_canvas\`.
- **Level Selection Path**: \`header_component\` -> \`frontend_shell\` -> \`chat_component\` (adaptive prompt chips) -> \`tutor_orchestrator\` -> \`prompt_builder\`.
- **BYOK Config Path**: \`settings_modal\` -> \`localStorage\` -> \`tutor_orchestrator\` -> \`provider_adapter\` (direct outbound to OpenRouter / OpenAI / Anthropic / Gemini / Groq / Ollama).
`;

fs.writeFileSync(path.join(outDir, 'GRAPH_REPORT.md'), report, 'utf-8');

const wikiIndex = `# Codebase Knowledge Graph Wiki

Welcome to the **Graphical AI Tutor** persistent architectural knowledge graph.

## Community Clusters
- [Frontend Components & Design](frontend.md)
- [Tutor Orchestration & Drawing DSL](tutor_engine.md)
- [Backend Express Server & WebSocket Sync](backend.md)
- [Architecture Decisions & Specifications](docs.md)

## Node Directory
${nodes.map(n => `- **[${n.id}](#)** (\`${n.file}\`): ${n.label} *(${n.community})*`).join('\n')}
`;

fs.writeFileSync(path.join(wikiDir, 'index.md'), wikiIndex, 'utf-8');

console.log('Graphify persistent memory successfully generated at graphify-out/');

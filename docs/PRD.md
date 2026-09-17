# PRD.md — Graphical AI Tutor

## 1. Product summary

**Graphical AI Tutor** is an interactive learning application built around Excalidraw. A student asks questions through a chat box or microphone, selects a learning level, and receives an intelligent teacher-like explanation that is also drawn onto a live Excalidraw canvas.

The application is based on `yctimlin/mcp_excalidraw`, which already provides a local Excalidraw canvas, REST API, WebSocket synchronization, MCP tools, scene inspection, screenshots, layout operations, Mermaid conversion, import/export, snapshots, and viewport control.

The key product change is:

> Replace the coding-agent-only interaction with a student-facing tutor UI that can call a user-selected LLM API and convert the LLM's teaching plan into real, editable Excalidraw elements.

Reference repository:
https://github.com/yctimlin/mcp_excalidraw

## 2. Problem

The existing repository is optimized for AI coding agents. Students should not need Claude Code, Codex, Cursor, Antigravity, or an MCP client to use it.

Students need:
- A normal chat interface.
- A choice of Beginner / Intermediate / Pro.
- Voice input and spoken answers.
- Teacher-like explanations.
- Visual explanations drawn directly on the canvas.
- The ability to ask follow-up questions while keeping the lesson context.
- A provider/API settings screen so the user can bring their own LLM API key.
- Editable Excalidraw diagrams instead of static images.

## 3. Goals

### Primary goals
1. Create a student-first chat UI.
2. Support user-provided LLM API credentials.
3. Support multiple LLM providers through an adapter layer.
4. Make the tutor capable of drawing lessons on Excalidraw.
5. Support Beginner, Intermediate, and Pro teaching modes.
6. Support microphone input and spoken tutor responses.
7. Preserve conversation + lesson + canvas context.
8. Make drawing deterministic, editable, inspectable, and recoverable.
9. Make the tutor behave like a teacher, not a generic chatbot.
10. Keep the core canvas local and minimize unnecessary data leaving the student's machine.

### Secondary goals
- Save/export `.excalidraw` lessons.
- Take canvas snapshots.
- Continue lessons from previous sessions.
- Support diagrams, flowcharts, timelines, graphs, equations, tables, mind maps, system diagrams, and annotated explanations.
- Allow the student to manually edit the canvas.

## 4. Non-goals for v1

- Full autonomous coding agent functionality for students.
- Multi-user collaborative classrooms.
- Automatic grading for every subject.
- A custom vector drawing engine replacing Excalidraw.
- Sending API keys to our own server by default.
- Mandatory cloud speech services.
- Training a custom LLM.

## 5. Target users

### Beginner
Students with little or no prior knowledge.

Tutor behavior:
- Define terms before using them.
- Use simple language.
- Use analogies.
- Draw basic shapes.
- Teach one concept at a time.
- Frequently check understanding.

### Intermediate
Students with basic knowledge.

Tutor behavior:
- Assume fundamentals.
- Explain relationships and mechanisms.
- Use structured diagrams.
- Introduce moderate technical vocabulary.
- Include examples and common mistakes.

### Pro
Advanced students.

Tutor behavior:
- Use technical terminology.
- Explain internals and edge cases.
- Compare approaches.
- Build complex diagrams.
- Include trade-offs, proofs, derivations, architecture, and advanced examples.

The level is a teaching constraint, not a different model.

## 6. Core user journey

1. Student opens the app.
2. Student selects Beginner / Intermediate / Pro.
3. Student opens Settings and selects an LLM provider.
4. Student enters API key and optional model/base URL.
5. Student starts a lesson by typing or speaking.
6. Tutor understands the question.
7. Tutor creates a structured teaching response.
8. Tutor sends the drawing plan to the canvas adapter.
9. Excalidraw elements are created/updated.
10. Tutor explains the result in chat.
11. Tutor optionally speaks the answer.
12. Student asks follow-up questions.
13. Tutor uses conversation state + lesson state + canvas state.
14. Student can manually edit the canvas.
15. Tutor can inspect the current scene and adapt subsequent drawings.

## 7. Main features

### F1 — Chat
- Message history.
- Streaming text response where supported.
- Stop generation.
- Retry.
- Copy response.
- Clear conversation.
- Follow-up questions.
- System-generated lesson summaries.

### F2 — API/provider settings
Provider adapter interface must support:
- OpenAI-compatible APIs.
- Provider-specific APIs through adapters.
- Custom base URL.
- API key.
- Model.
- Optional organization/project fields where required.
- Connection/test button.
- Delete/clear key.
- Local-only storage by default.

API keys must never be included in:
- chat messages,
- canvas elements,
- analytics,
- logs,
- error reports,
- Git,
- exported `.excalidraw` files.

Prefer Web Crypto / OS-backed secure storage where available. If the browser environment cannot provide secure persistence, use session-only storage and clearly tell the user.

### F3 — Level selector
Three levels:
- Beginner
- Intermediate
- Pro

Level affects:
- vocabulary,
- explanation depth,
- diagram complexity,
- number of examples,
- pace,
- assumptions about prior knowledge,
- question/checkpoint frequency.

### F4 — AI teacher
The tutor should:
- Answer the question.
- Explain why.
- Use examples.
- Ask a small comprehension question when useful.
- Detect confusion.
- Correct misconceptions.
- Remember the current lesson.
- Avoid blindly agreeing with the student.
- State uncertainty when appropriate.
- Decide when a visual explanation is useful.

### F5 — Canvas drawing
The tutor must be able to draw:
- rectangles
- ellipses
- diamonds
- arrows
- lines
- text
- freeform/rough shapes
- groups
- labels
- diagrams
- flowcharts
- mind maps
- timelines
- simple charts
- coordinate/number-line style visuals
- architecture diagrams
- process diagrams
- annotated illustrations

The app must prefer native Excalidraw elements over rasterized images.

### F6 — Canvas awareness
The tutor can:
- inspect scene structure,
- inspect selected elements,
- inspect a screenshot,
- create/update/delete elements,
- align/distribute/group/lock elements,
- zoom to relevant content,
- snapshot before risky modifications,
- restore a previous snapshot.

### F7 — Voice
Input:
- microphone button,
- recording state,
- transcription preview,
- cancel,
- send.

Output:
- speak tutor response,
- pause/resume,
- stop,
- automatic speech for lesson mode.

Voice should support interruption in a later phase.

### F8 — Lesson mode
A lesson has:
- topic,
- level,
- learning objectives,
- current concept,
- current canvas region,
- completed concepts,
- misconceptions,
- checkpoints,
- summary.

The tutor should not redraw the entire canvas unnecessarily.

### F9 — Export
- Export `.excalidraw`.
- Export image.
- Save lesson state.
- Restore lesson.
- Optional share URL.

## 8. Intelligent drawing requirements

The LLM must not directly invent arbitrary Excalidraw JSON without validation.

Use a two-stage architecture:

**Stage A — Teacher reasoning**
The model produces:
- explanation,
- teaching steps,
- visual intent,
- structured drawing operations.

**Stage B — Canvas compiler**
Application validates and compiles those operations into Excalidraw elements.

This allows any supported LLM to work even if it lacks native tool/function calling.

Example conceptual output:

```json
{
  "answer": "A binary tree is...",
  "lesson": {
    "objective": "Understand root, child and leaf nodes"
  },
  "draw": [
    {
      "op": "box",
      "id": "root",
      "x": 500,
      "y": 150,
      "w": 180,
      "h": 80,
      "label": "Root"
    },
    {
      "op": "arrow",
      "from": "root",
      "to": "left"
    }
  ],
  "speak": true
}
```

The compiler maps these operations to native Excalidraw elements.

## 9. "Draw anything" strategy

"Anything" must mean broad visual teaching capability, not unrestricted arbitrary code execution.

Use a drawing abstraction with:
- primitive elements,
- connectors,
- groups,
- text,
- styles,
- layout constraints,
- coordinate systems,
- templates,
- Mermaid import where suitable.

For complex subjects:
1. Prefer a known template.
2. Otherwise compose primitives.
3. Use Mermaid where it gives a clean result.
4. Validate the scene.
5. Inspect/screenshot.
6. Repair overlaps and bad labels.
7. Fit the viewport.

## 10. Success metrics

### Product
- Student can ask a question in under 10 seconds after opening the app.
- First useful text response in a reasonable streaming interval.
- First visual response appears without manual canvas interaction.
- Follow-up question retains lesson context.
- User can switch levels without losing the lesson.

### Quality
- Drawing commands pass schema validation.
- No invalid canvas elements.
- Low overlap rate.
- Labels remain readable.
- Tutor explanations match selected level.
- Voice transcription accuracy is acceptable for supported languages.

### Reliability
- API failure produces a useful error.
- Canvas failure does not destroy chat.
- Voice failure falls back to text.
- LLM output failure falls back to a normal text answer.

## 11. MVP

MVP must include:
- Excalidraw canvas.
- Chat panel.
- API settings.
- OpenAI-compatible provider adapter.
- Beginner / Intermediate / Pro.
- Structured tutor response.
- Native canvas drawing.
- Canvas inspection.
- Browser speech recognition where available.
- Browser speech synthesis.
- Lesson state.
- Export/import.
- Error handling.

## 12. Phase 2

- faster-whisper local STT.
- High-quality local TTS such as Piper.
- Better multilingual voice support.
- Visual self-correction loop.
- More subject templates.
- Adaptive quizzes.
- Lesson history.
- Student progress.

## 13. Phase 3

- Real-time voice conversation.
- Barge-in/interruption.
- Local model support.
- Collaborative classroom mode.
- Teacher dashboard.
- Assignment generation and grading.
- Advanced accessibility.

## 14. Acceptance criteria

A feature is complete only when:
- It works from the student UI without a coding agent.
- It has error handling.
- It does not leak API credentials.
- It is accessible by keyboard.
- It works with the selected LLM provider.
- If it affects the UI, it is verified against the running application.
- If it changes security boundaries, it receives a security review.
- Canvas changes are inspectable and exportable.

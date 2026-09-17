# UI/UX.md — Graphical AI Tutor

## 1. Design principles

The product should feel like:

> **A smart teacher standing beside an interactive whiteboard.**

Not:
- a developer tool,
- an MCP dashboard,
- a configuration-heavy IDE,
- a generic chatbot.

Primary visual priority:
1. Canvas.
2. Tutor conversation.
3. Student controls.
4. Settings.

## 2. Desktop layout

Use a three-zone layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ Logo / Lesson title / Level / Voice / Settings              │
├───────────────────────────────┬──────────────────────────────┤
│                               │                              │
│       EXCALIDRAW CANVAS       │        TUTOR CHAT            │
│                               │                              │
│       interactive board       │  Teacher messages            │
│                               │  Student messages            │
│                               │                              │
│                               │                              │
├───────────────────────────────┴──────────────────────────────┤
│ Contextual canvas toolbar / status                           │
└──────────────────────────────────────────────────────────────┘
```

Recommended starting ratio:
- Canvas: 68–75%
- Chat: 25–32%

The student should always be able to see both the explanation and the drawing.

## 3. Header

Header contains:
- Graphical AI Tutor logo.
- Current lesson.
- Level selector.
- Voice toggle.
- API/settings button.
- Save/export menu.

Do not overload the header.

## 4. Chat panel

### Message bubbles

Tutor:
- calm visual identity,
- readable width,
- supports Markdown,
- equations,
- code blocks,
- lists.

Student:
- visually distinct,
- compact.

### Tutor response structure

For educational answers, prefer:

**Answer**

Short direct answer.

**Let's understand it**

Explanation.

**On the board**

Indicate what is being drawn.

**Quick check**

One short comprehension question when appropriate.

Do not force these headings for every tiny conversational exchange.

## 5. Composer

Composer contains:
- text input,
- microphone button,
- send button.

States:
- idle,
- recording,
- transcribing,
- generating,
- speaking.

Microphone state must be obvious.

During recording:
- show waveform/level indicator,
- show elapsed time,
- show Stop button.

## 6. Level selector

Three segmented options:

```text
[ Beginner ] [ Intermediate ] [ Pro ]
```

Each has a short tooltip:

Beginner:
"Explain from the basics."

Intermediate:
"Build on existing knowledge."

Pro:
"Deep technical explanation."

Switching levels should not erase the conversation.

The next response should acknowledge the new level internally.

## 7. Canvas UX

The canvas remains a real Excalidraw canvas.

AI actions should feel visible:
- subtle "AI drawing…" state,
- optional highlighted region while drawing,
- final zoom/focus.

Never lock the entire canvas for long periods.

The student can manually draw/edit at any time unless an atomic AI operation is currently being applied.

## 8. AI drawing indicator

Use a small status pill:

```text
● AI is drawing
```

Optional stages:
- Planning
- Drawing
- Checking
- Finished

If a repair occurs:

```text
AI is adjusting the diagram…
```

Avoid technical wording such as "MCP tool call".

## 9. API settings

Settings should be simple.

```text
AI Provider
[ OpenAI-compatible ▼ ]

Base URL
[ https://... ]

API Key
[ ••••••••••••• ] [Show]

Model
[ model-name ]

[ Test connection ]

Security:
✓ Stored locally
✓ Never placed on the canvas
```

If secure local persistence is unavailable:

"Your key is stored only for this session."

Never display an API key after saving unless the user explicitly chooses to reveal it.

## 10. Voice UX

### Input

Mic button states:
- idle: microphone icon.
- listening: animated recording indicator.
- processing: spinner.
- error: retry.

### Output

When tutor speaks:
- animated voice indicator,
- pause,
- stop.

The chat text remains visible while speaking.

## 11. First-run experience

First screen:

```text
        Graphical AI Tutor

        Learn it. See it. Understand it.

        Choose your level

        [ Beginner ]
        [ Intermediate ]
        [ Pro ]

        [ Configure AI ]
```

Then a short example:
"Ask me to explain photosynthesis, binary search, Newton's laws, a database ERD, or anything you are learning."

## 12. Empty canvas

Do not leave students with an unexplained blank whiteboard.

Show lightweight hints:
- "Ask a question"
- "Try: Explain binary search"
- "Try: Draw a database ER diagram"

These disappear after the first interaction.

## 13. Accessibility

Must support:
- keyboard navigation,
- visible focus,
- screen-reader labels,
- sufficient contrast,
- reduced motion,
- large clickable controls,
- text alternative for important visual explanations.

Voice must never be the only way to perform an action.

## 14. Responsive behavior

Desktop:
- split canvas/chat.

Tablet:
- adjustable split.

Mobile:
- canvas and chat become tabs or a draggable bottom sheet.
- chat composer remains easy to reach.
- drawing controls stay accessible.

The MVP can optimize for desktop first because Excalidraw is central.

## 15. Error UX

Errors should be human-readable.

Bad:
"HTTP 422: Invalid TutorResponse schema."

Good:
"I understood your question, but the visual explanation could not be created. Your answer is still available. Try again."

Advanced details can be shown behind "Technical details".

## 16. Teacher personality

Default:
- patient,
- concise,
- encouraging,
- intellectually honest,
- not childish unless Beginner content needs it.

Avoid:
- excessive emojis,
- fake praise,
- repeating the question,
- overly long answers,
- saying "Great question!" on every message.

## 17. Visual language

Use:
- clean modern UI,
- subtle depth,
- restrained accent color,
- high readability,
- strong canvas focus.

Avoid:
- excessive gradients,
- neon everywhere,
- dashboard clutter,
- overly animated interfaces.

The Excalidraw canvas should remain visually dominant.

## 18. Interaction rules

### When drawing is useful
Draw automatically.

### When drawing is unnecessary
Do not create meaningless shapes.

### When the student asks to modify the drawing
Edit the existing scene instead of recreating it.

### When the student asks for a new topic
Create a new lesson area or clear only when the student explicitly requests a reset.

### When the student says "explain this"
Inspect the current canvas/selection first.

## 19. Micro-interactions

Useful:
- typing indicator,
- AI drawing indicator,
- speaking indicator,
- save indicator,
- connection indicator.

Avoid:
- decorative animations that distract from learning.

## 20. UX acceptance checklist

- Can a student ask a question immediately?
- Can they choose level easily?
- Can they configure an API without technical knowledge?
- Does the tutor explain and draw?
- Can the student edit the drawing?
- Can they ask follow-up questions?
- Can they use microphone?
- Can they hear the tutor?
- Can they recover from failures?
- Can they export their lesson?

# Graphical AI Tutor (`AI_TUTOR`) — User & Setup Guide

Welcome to **Graphical AI Tutor**! This application is an interactive, visual-first AI learning assistant that explains complex concepts using a dynamic, hand-drawn Excalidraw whiteboard, real-time Socratic pedagogy, neural speech synthesis, and multi-provider AI model support.

---

## Table of Contents

1. [Overview & Key Features](#overview--key-features)
2. [Prerequisites](#prerequisites)
3. [Quick Start (Installation & Launch)](#quick-start-installation--launch)
4. [Configuring AI Models (Bring Your Own Key)](#configuring-ai-models-bring-your-own-key)
   - [Free Tier via OpenRouter](#free-tier-via-openrouter)
   - [Commercial Providers (OpenAI, Anthropic, Gemini, Groq)](#commercial-providers)
   - [Local Offline Models (Ollama)](#local-offline-models-ollama)
5. [Voice & Speech Synthesis](#voice--speech-synthesis)
6. [How to Use the Tutor as a Student](#how-to-use-the-tutor-as-a-student)
   - [Adaptive Learning Levels](#adaptive-learning-levels)
   - [Interactive Whiteboard & Socratic Sequencer](#interactive-whiteboard--socratic-sequencer)
   - [Whiteboard Tools & Canvas Controls](#whiteboard-tools--canvas-controls)
7. [Testing & Verification](#testing--verification)
8. [Security & Privacy](#security--privacy)

---

## 1. Overview & Key Features

- **Interactive Whiteboard First**: Diagrams are generated natively as editable Excalidraw vector elements (containers, text, arrows, cloud notes, visual symbols), never static images.
- **Socratic Pedagogical Engine**: Answers are structured into clear, sequenced teaching steps:
  1. *What It Is* (Intuition & foundational definition)
  2. *How It Works* (Component-by-component mechanics)
  3. *Why We Need It* (Real-world importance & context)
  4. *Visual Whiteboard Illustration* (Step-by-step drawn diagrams)
- **Adaptive Pedagogy**: Tailored explanations for **Beginner**, **Intermediate**, and **Pro** learners.
- **Neural Voice & Speech**: Listen to lessons with high-quality Edge Neural speech synthesis (with English and Urdu voice options) and dictate questions with browser speech recognition.
- **Universal BYOK (Bring Your Own Key)**: Choose from over 400+ models via OpenRouter (including 20+ free models) or connect your OpenAI, Anthropic, Gemini, Groq, or local Ollama keys.

---

## 2. Prerequisites

Before installing, ensure your system has:

- **Node.js**: Version `20.x` or higher (`node -v`)
- **npm**: Version `9.x` or higher (`npm -v`)
- **Web Browser**: Any modern browser (Google Chrome, Microsoft Edge, Brave, Safari, or Firefox). Chromium-based browsers are recommended for full Web Speech API voice dictation support.

---

## 3. Quick Start (Installation & Launch)

### Step 1: Clone the Repository
```bash
git clone https://github.com/muhammadammark326-dot/AI_TUTOR.git
cd AI_TUTOR
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Build the Project
Compile the frontend React bundle and the TypeScript backend server:
```bash
npm run build
```

### Step 4: Start the Tutor Server
Start the local server (whiteboard canvas + tutor orchestrator):
```bash
npm run canvas
```
*(Or for live development with hot module reloading: `npm run dev`)*

### Step 5: Open in Your Browser
Open your browser and navigate to:
```text
http://localhost:3000
```

---

## 4. Configuring AI Models (Bring Your Own Key)

Click the **Settings** (gear icon) in the top navigation bar to configure your preferred AI provider. All API keys are stored **strictly in your browser's local storage** (`localStorage`) and are never saved to a database or logged.

### Free Tier via OpenRouter
If you do not wish to pay for API usage:
1. Go to [openrouter.ai](https://openrouter.ai) and sign up for a free account.
2. Generate an API Key with zero credit requirement.
3. In Graphical AI Tutor Settings:
   - Select **Provider**: `OpenRouter`
   - Paste your **API Key**
   - In the **Model Selection** dropdown, toggle **"Free Models Only"** to choose from high-performance zero-cost models, such as:
     - `meta-llama/llama-3.3-70b-instruct:free`
     - `google/gemini-2.0-flash-exp:free`
     - `qwen/qwen-2.5-coder-32b-instruct:free`
     - `deepseek/deepseek-r1:free`

### Commercial Providers
You can also connect standard commercial API providers:
- **OpenAI**: `gpt-4o`, `gpt-4o-mini`, `o3-mini` (requires OpenAI API key)
- **Anthropic**: `claude-3-7-sonnet`, `claude-3-5-sonnet`, `claude-3-5-haiku` (requires Anthropic API key)
- **Google Gemini**: `gemini-2.0-flash`, `gemini-1.5-pro` (requires Google AI Studio key)
- **Groq**: Ultra-fast inference with `llama-3.3-70b-versatile` or `deepseek-r1-distill-llama-70b` (requires Groq API key)

### Local Offline Models (Ollama)
For completely offline, private AI execution:
1. Install [Ollama](https://ollama.ai) and pull a model:
   ```bash
   ollama run llama3.2
   ```
2. In Graphical AI Tutor Settings:
   - Select **Provider**: `Ollama`
   - Set **Base URL**: `http://127.0.0.1:11434`
   - Set **Model**: `llama3.2` (or your downloaded model tag)

---

## 5. Voice & Speech Synthesis

Graphical AI Tutor provides a complete dual-track voice interface:

- **Voice Input (Speech-to-Text)**:
  - Click the **Microphone** icon in the chat input bar.
  - Speak your question; your speech is transcribed in real-time into the prompt box.
- **Voice Output (Neural Text-to-Speech)**:
  - Explanations are read aloud using realistic neural voices.
  - In Settings, customize your preferred voice:
    - `Microsoft Server Speech (Jenny / Guy - Neural English)`
    - `Microsoft Server Speech (Asad / Uzma - Neural Urdu)`
  - Toggle audio playback anytime using the **Mute/Unmute** audio control in the chat header.

---

## 6. How to Use the Tutor as a Student

### Adaptive Learning Levels
In the top navigation header or chat controls, select your knowledge tier:
- **Beginner**: Relatable analogies, minimal jargon, simple step-by-step block diagrams.
- **Intermediate**: Detailed mechanics, industry-standard architectural terms, functional flowcharts.
- **Pro**: Formal system design, edge cases, protocol specifications, data contracts, and deep technical diagrams.

### Interactive Whiteboard & Socratic Sequencer
1. Type or speak a topic in the chat (e.g., *"Explain how the human heart pumps blood"* or *"How does HTTPS encryption work?"* or *"Explain photosynthesis"*).
2. The AI Tutor analyzes the topic and renders:
   - **Step-by-step lesson cards** on the left panel.
   - **Dynamic visual whiteboard diagrams** on the right canvas.
3. Use the **Step Controls** (`Previous` / `Next` / `Replay`) to walk through the visual explanation at your own learning pace. As you advance through steps, the whiteboard smoothly pans and highlights corresponding components.

### Whiteboard Tools & Canvas Controls
- **Zoom & Pan**: Scroll to zoom, hold `Space` and drag to pan across the whiteboard.
- **Interactive Editing**: You can select, move, recolor, or annotate any element drawn by the tutor.
- **Exporting**: Click the canvas menu to export your whiteboard session as a `.excalidraw` file or high-resolution PNG image.

---

## 7. Testing & Verification

The repository includes a comprehensive automated test suite verifying compilers, drawing DSL schemas, LLM adapters, and Socratic orchestration:

```bash
# Run the complete tutor test suite
npm run test:tutor

# Check TypeScript type safety
npm run type-check
npm run type-check:frontend

# Run local MCP stdio server checks
npm run test:mcp
```

---

## 8. Security & Privacy

- **Zero Server Key Persistence**: API keys are never stored on the server, written to disk, or committed to version control.
- **SSRF Guard**: Educational image searches and external fetches are protected by strict server-side request forgery (SSRF) filters preventing access to internal network interfaces.
- **Sandboxed Drawing**: The AI tutor outputs structured JSON matching a strict Zod schema; no unvalidated raw code or scripts can execute on the whiteboard.

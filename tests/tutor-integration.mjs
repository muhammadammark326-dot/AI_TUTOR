import assert from 'node:assert';
import test from 'node:test';
import express from 'express';
import { createServer } from 'node:http';
import { handleTutorChat, getActiveLesson, resetActiveLesson } from '../dist/tutor/orchestrator.js';
import { compileDrawOperations } from '../dist/tutor/canvas-compiler.js';
import { AVAILABLE_VOICES, synthesizeSpeech } from '../dist/tutor/tts-service.js';
import { elements } from '../dist/types.js';

test('Tutor Integration Test - HTTP routes, lesson state, neural TTS and drawing compiler', async (t) => {
  const app = express();
  app.use(express.json());
  const server = createServer(app);

  const broadcastMessages = [];
  const broadcast = (msg) => {
    broadcastMessages.push(msg);
  };

  // Mount tutor routes
  app.post('/api/tutor/chat', async (req, res) => {
    try {
      const tutorResp = await handleTutorChat(req.body, (newElements) => {
        newElements.forEach((el) => elements.set(el.id, el));
        broadcast({ type: 'elements_batch_created', elements: newElements });
      });
      res.json({ success: true, tutorResponse: tutorResp });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/tutor/lesson', (req, res) => {
    res.json({ success: true, lesson: getActiveLesson() });
  });

  app.post('/api/tutor/lesson/reset', (req, res) => {
    const lesson = resetActiveLesson(req.body?.level);
    res.json({ success: true, lesson });
  });

  app.get('/api/tutor/voices', (_req, res) => {
    res.json({ success: true, voices: AVAILABLE_VOICES });
  });

  app.post('/api/tutor/tts', async (req, res) => {
    try {
      const { text, voice, rate, pitch } = req.body;
      if (!text) {
        return res.status(400).json({ success: false, error: 'Text required' });
      }
      const audioBuffer = await synthesizeSpeech(text, voice, rate, pitch);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.length);
      res.send(audioBuffer);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // 1. GET /api/tutor/lesson
    const lessonRes = await fetch(`${baseUrl}/api/tutor/lesson`);
    const lessonData = await lessonRes.json();
    assert.strictEqual(lessonData.success, true);
    assert.ok(lessonData.lesson.id);

    // 2. POST /api/tutor/lesson/reset
    const resetRes = await fetch(`${baseUrl}/api/tutor/lesson/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: 'pro' }),
    });
    const resetData = await resetRes.json();
    assert.strictEqual(resetData.success, true);
    assert.strictEqual(resetData.lesson.level, 'pro');

    // 3. Test draw operation compilation to native Excalidraw elements
    const mockDrawOps = [
      {
        op: 'box',
        id: 'box_node1',
        x: 150,
        y: 100,
        w: 140,
        h: 60,
        label: 'Client App',
        bgColor: '#dbeafe',
      },
      {
        op: 'box',
        id: 'box_node2',
        x: 400,
        y: 100,
        w: 140,
        h: 60,
        label: 'API Gateway',
        bgColor: '#bbf7d0',
      },
      {
        op: 'arrow',
        id: 'arrow_conn',
        from: 'box_node1',
        to: 'box_node2',
        label: 'HTTPS / REST',
      },
    ];

    const compiled = compileDrawOperations(mockDrawOps);
    assert.ok(compiled.length >= 3, `Expected at least 3 compiled elements, got ${compiled.length}`);

    // Verify box container and bound text
    const container = compiled.find((e) => e.id === 'box_node1');
    assert.ok(container, 'Container element must exist');
    assert.strictEqual(container.type, 'rectangle');
    assert.ok(container.boundElements && container.boundElements.length > 0);

    const boundText = compiled.find((e) => e.containerId === 'box_node1');
    assert.ok(boundText, 'Bound text element must exist for Client App');
    assert.strictEqual(boundText.text, 'Client App');

    // Verify arrow element
    const arrow = compiled.find((e) => e.id === 'arrow_conn');
    assert.ok(arrow, 'Arrow element must exist');
    assert.strictEqual(arrow.type, 'arrow');
    assert.strictEqual(arrow.startBinding.elementId, 'box_node1');
    assert.strictEqual(arrow.endBinding.elementId, 'box_node2');

    // 4. Test error handling when LLM is unreachable
    const chatRes = await fetch(`${baseUrl}/api/tutor/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Hello tutor',
        level: 'intermediate',
        providerConfig: {
          provider: 'openai_compatible',
          apiKey: 'test_key',
          baseUrl: 'http://127.0.0.1:1', // Unreachable
          model: 'test',
        },
      }),
    });
    const chatData = await chatRes.json();
    assert.strictEqual(chatData.success, true);
    assert.ok(chatData.tutorResponse.answer, 'Tutor response should contain an answer');
    assert.ok(chatData.tutorResponse.steps && chatData.tutorResponse.steps.length >= 1, 'Tutor must provide teaching steps even if provider is unreachable');

    // 5. Test GET /api/tutor/voices returns multi-voice catalog with English & Urdu
    const voicesRes = await fetch(`${baseUrl}/api/tutor/voices`);
    const voicesData = await voicesRes.json();
    assert.strictEqual(voicesData.success, true);
    assert.ok(Array.isArray(voicesData.voices));
    assert.ok(voicesData.voices.length >= 10, 'Expected at least 10 voices');

    const urduVoices = voicesData.voices.filter((v) => v.locale === 'ur-PK');
    assert.ok(urduVoices.length >= 2, 'Must provide at least Urdu Male & Urdu Female');
    assert.ok(urduVoices.some((v) => v.gender === 'female' && v.id === 'ur-PK-UzmaNeural'));
    assert.ok(urduVoices.some((v) => v.gender === 'male' && v.id === 'ur-PK-AsadNeural'));

    const englishVoices = voicesData.voices.filter((v) => v.locale.startsWith('en'));
    assert.ok(englishVoices.some((v) => v.gender === 'female'));
    assert.ok(englishVoices.some((v) => v.gender === 'male'));

    // 6. Test POST /api/tutor/tts with English and Urdu speech synthesis
    const enTtsRes = await fetch(`${baseUrl}/api/tutor/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Welcome to your interactive step by step learning session.',
        voice: 'en-US-GuyNeural',
      }),
    });
    assert.strictEqual(enTtsRes.status, 200);
    assert.strictEqual(enTtsRes.headers.get('content-type'), 'audio/mpeg');
    const enBuffer = await enTtsRes.arrayBuffer();
    assert.ok(enBuffer.byteLength > 1000, `Expected valid audio mp3 buffer, got ${enBuffer.byteLength} bytes`);

    const urTtsRes = await fetch(`${baseUrl}/api/tutor/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'خوش آمدید! آج ہم کمپیوٹر سائنس کے بنیادی اصول سیکھیں گے۔',
        voice: 'ur-PK-UzmaNeural',
      }),
    });
    assert.strictEqual(urTtsRes.status, 200);
    assert.strictEqual(urTtsRes.headers.get('content-type'), 'audio/mpeg');
    const urBuffer = await urTtsRes.arrayBuffer();
    assert.ok(urBuffer.byteLength > 1000, `Expected valid Urdu audio mp3 buffer, got ${urBuffer.byteLength} bytes`);

    // 7. Test compilation of rich visual primitives (database, cloud, actor, queue, container, note)
    const richVisualOps = [
      { op: 'database', id: 'db_1', x: 50, y: 50, label: 'PostgreSQL' },
      { op: 'cloud', id: 'cloud_1', x: 250, y: 50, label: 'AWS VPC' },
      { op: 'actor', id: 'actor_1', x: 450, y: 50, label: 'Client User' },
      { op: 'queue', id: 'queue_1', x: 650, y: 50, label: 'Kafka Topic' },
      { op: 'container', id: 'zone_1', x: 50, y: 200, w: 400, h: 250, label: 'Backend Tier' },
      { op: 'note', id: 'note_1', x: 500, y: 200, w: 180, h: 100, text: 'Key takeaway: microservices decouple scale' },
      { op: 'mermaid', id: 'merm_1', syntax: 'graph TD\nA-->B' },
    ];
    const richCompiled = compileDrawOperations(richVisualOps);
    assert.ok(richCompiled.length >= 10, `Expected rich compilation to generate multiple elements, got ${richCompiled.length}`);

    // Verify container anti-pattern protection (separate badge text, not centered inside container)
    const containerEl = richCompiled.find((e) => e.id === 'zone_1');
    assert.ok(containerEl);
    assert.strictEqual(containerEl.strokeStyle, 'dashed');
    const badgeEl = richCompiled.find((e) => e.id === 'zone_1_badge');
    assert.ok(badgeEl, 'Container must have top-left badge label');
    assert.strictEqual(badgeEl.text, '[ Backend Tier ]');

    // Verify database cylinder elements
    const dbTop = richCompiled.find((e) => e.id === 'db_1_cap');
    assert.ok(dbTop && dbTop.type === 'ellipse');

    // Verify queue partitions (box + 2 divider lines)
    const qElements = richCompiled.filter((e) => e.id.startsWith('queue_1'));
    assert.ok(qElements.length >= 3);
  } finally {
    server.close();
  }
});

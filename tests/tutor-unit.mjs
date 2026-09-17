import test from 'node:test';
import assert from 'node:assert/strict';
import { compileDrawOperations } from '../dist/tutor/canvas-compiler.js';
import { buildSystemPrompt } from '../dist/tutor/prompt-builder.js';
import { TutorResponseSchema, DrawOperationSchema } from '../dist/tutor/types.js';

test('TutorResponseSchema validates correct structured output', () => {
  const sample = {
    answer: 'Binary search works by repeated halving.',
    explanation: 'At each step, examine the middle element...',
    boardNote: 'Drawn array elements with middle pointer.',
    quickCheck: 'What is the runtime complexity?',
    level: 'beginner',
    lesson: {
      topic: 'Searching algorithms',
      objective: 'Understand divide and conquer',
      concept: 'Binary Search',
      nextQuestion: 'What happens when target is not found?'
    },
    draw: [
      { op: 'box', id: 'b1', x: 100, y: 100, w: 120, h: 60, label: 'Mid' },
      { op: 'arrow', id: 'a1', from: 'b1', to: 'b2', label: 'points to' }
    ],
    speak: true
  };

  const parsed = TutorResponseSchema.parse(sample);
  assert.equal(parsed.level, 'beginner');
  assert.equal(parsed.draw?.length, 2);
  assert.equal(parsed.speak, true);
});

test('Drawing Compiler translates box with label into container and text elements', () => {
  const ops = [
    { op: 'box', id: 'box_root', x: 200, y: 150, w: 160, h: 80, label: 'Root Node', color: '#2b8a3e', bgColor: '#ebfbee' }
  ];

  const elements = compileDrawOperations(ops);
  assert.equal(elements.length, 2); // 1 rectangle + 1 bound text element

  const box = elements.find(e => e.type === 'rectangle');
  assert.ok(box);
  assert.equal(box.id, 'box_root');
  assert.equal(box.x, 200);
  assert.equal(box.y, 150);
  assert.equal(box.width, 160);
  assert.equal(box.height, 80);
  assert.equal(box.strokeColor, '#2b8a3e');
  assert.equal(box.backgroundColor, '#ebfbee');
  assert.equal(box.boundElements?.[0]?.id, 'box_root_label');

  const text = elements.find(e => e.type === 'text');
  assert.ok(text);
  assert.equal(text.id, 'box_root_label');
  assert.equal(text.text, 'Root Node');
  assert.equal(text.containerId, 'box_root');
});

test('Drawing Compiler translates arrow between two boxes with bindings', () => {
  const ops = [
    { op: 'box', id: 'b1', x: 100, y: 100, w: 100, h: 50 },
    { op: 'box', id: 'b2', x: 300, y: 100, w: 100, h: 50 },
    { op: 'arrow', id: 'arrow_1', from: 'b1', to: 'b2', label: 'Flow' }
  ];

  const elements = compileDrawOperations(ops);
  // b1 (1) + b2 (1) + arrow_1 (1) + arrow_1_label (1) = 4 elements
  assert.equal(elements.length, 4);

  const arrow = elements.find(e => e.type === 'arrow');
  assert.ok(arrow);
  assert.equal(arrow.id, 'arrow_1');
  assert.equal(arrow.startBinding?.elementId, 'b1');
  assert.equal(arrow.endBinding?.elementId, 'b2');

  const arrowLabel = elements.find(e => e.id === 'arrow_1_label');
  assert.ok(arrowLabel);
  assert.equal(arrowLabel.text, 'Flow');
});

test('Prompt builder applies distinct level constraints', () => {
  const beginnerPrompt = buildSystemPrompt('beginner');
  const proPrompt = buildSystemPrompt('pro');

  assert.ok(beginnerPrompt.includes('BEGINNER'));
  assert.ok(beginnerPrompt.includes('analogies'));
  assert.ok(beginnerPrompt.includes('Define every technical term'));

  assert.ok(proPrompt.includes('PRO / ADVANCED'));
  assert.ok(proPrompt.includes('asymptotic complexity'));
  assert.ok(proPrompt.includes('trade-offs'));
});

test('TutorResponseSchema validates multi-step teaching sequence', () => {
  const stepSample = {
    answer: 'Here is how microservices communicate.',
    level: 'intermediate',
    steps: [
      {
        stepNumber: 1,
        title: 'Client Request',
        speech: 'First, the client browser issues an HTTPS request to our API Gateway.',
        draw: [
          { op: 'actor', id: 'client_1', x: 100, y: 150, w: 120, h: 60, label: 'Client App' },
          { op: 'box', id: 'gw_1', x: 300, y: 150, w: 130, h: 60, label: 'API Gateway' },
          { op: 'arrow', id: 'a1', from: 'client_1', to: 'gw_1', label: 'HTTPS' }
        ],
        highlightElementIds: ['client_1', 'gw_1']
      },
      {
        stepNumber: 2,
        title: 'Database Persistence',
        speech: 'The service then queries the PostgreSQL database.',
        draw: [
          { op: 'database', id: 'db_1', x: 550, y: 140, w: 120, h: 80, label: 'Primary DB' },
          { op: 'arrow', id: 'a2', from: 'gw_1', to: 'db_1', label: 'SQL' }
        ],
        highlightElementIds: ['db_1']
      }
    ],
    draw: [],
    speak: true
  };

  const parsed = TutorResponseSchema.parse(stepSample);
  assert.equal(parsed.steps?.length, 2);
  assert.equal(parsed.steps[0].stepNumber, 1);
  assert.equal(parsed.steps[0].title, 'Client Request');
  assert.equal(parsed.steps[0].draw?.length, 3);
  assert.equal(parsed.steps[1].highlightElementIds?.[0], 'db_1');
});

test('Drawing Compiler translates database, cloud, container, and note primitives', () => {
  const ops = [
    { op: 'database', id: 'db_main', x: 100, y: 100, w: 120, h: 80, label: 'Users DB', color: '#1971c2', bgColor: '#e7f5ff' },
    { op: 'cloud', id: 'cloud_aws', x: 300, y: 100, w: 140, h: 80, label: 'AWS Cloud', color: '#d9480f', bgColor: '#fff4e6' },
    { op: 'container', id: 'vpc_zone', x: 50, y: 50, w: 500, h: 300, label: 'Production VPC' },
    { op: 'note', id: 'note_tip', x: 100, y: 350, w: 150, h: 60, text: 'Remember ACID guarantees' },
    { op: 'mermaid', id: 'mmd_flow', syntax: 'graph TD\nA-->B' }
  ];

  const elements = compileDrawOperations(ops);
  assert.ok(elements.length > 5);

  // Check database cylinder and cap
  const dbBody = elements.find(e => e.id === 'db_main');
  const dbCap = elements.find(e => e.id === 'db_main_cap');
  const dbLabel = elements.find(e => e.id === 'db_main_label');
  assert.ok(dbBody);
  assert.ok(dbCap);
  assert.ok(dbLabel);
  assert.equal(dbLabel.text, 'Users DB');

  // Check cloud
  const cloud = elements.find(e => e.id === 'cloud_aws');
  assert.ok(cloud);
  assert.equal(cloud.type, 'ellipse');

  // Check container with badge label
  const container = elements.find(e => e.id === 'vpc_zone');
  const containerBadge = elements.find(e => e.id === 'vpc_zone_badge');
  assert.ok(container);
  assert.equal(container.strokeStyle, 'dashed');
  assert.ok(containerBadge);
  assert.equal(containerBadge.text, '[ Production VPC ]');

  // Check note
  const note = elements.find(e => e.id === 'note_tip');
  const noteText = elements.find(e => e.id === 'note_tip_text');
  assert.ok(note);
  assert.ok(noteText);
  assert.equal(noteText.text, 'Remember ACID guarantees');

  // Check mermaid placeholder
  const mmd = elements.find(e => e.id === 'mmd_flow');
  assert.ok(mmd);
});

test('Prompt builder mandates topic faithfulness and domain accuracy across subjects', () => {
  const prompt = buildSystemPrompt('beginner');
  assert.ok(prompt.includes('TOPIC FAITHFULNESS & DOMAIN ACCURACY'));
  assert.ok(prompt.includes('Photosynthesis'));
  assert.ok(prompt.includes('NEVER use generic software/client/server/database terms for non-software questions'));
});


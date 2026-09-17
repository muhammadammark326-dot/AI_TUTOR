import test from 'node:test';
import assert from 'node:assert/strict';
import { handleTutorChat } from '../dist/tutor/orchestrator.js';

test('Photosynthesis with plain text LLM response synthesizes domain-accurate steps without CS client/server terms', async () => {
  const originalFetch = globalThis.fetch;
  
  // Mock LLM returning plain text markdown (ignoring JSON schema)
  globalThis.fetch = async () => {
    return {
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: `Photosynthesis is the essential biological process where plants convert solar energy into chemical energy.
Plants absorb water through roots and carbon dioxide through microscopic pores in their leaves.
Inside chloroplast organelles, chlorophyll pigments trap sunlight to drive the energy transformation.
This light reaction synthesizes glucose sugars to fuel plant growth and releases oxygen into the atmosphere.
In summary, photosynthesis sustains all aerobic life on Earth by generating oxygen and food.`
            }
          }
        ]
      })
    };
  };

  try {
    const result = await handleTutorChat(
      {
        message: 'How does photosynthesis work?',
        level: 'beginner',
        providerConfig: {
          provider: 'openrouter',
          apiKey: 'test-key',
          model: 'meta-llama/llama-3.3-70b-instruct:free'
        }
      },
      () => {}
    );

    assert.ok(result.steps && result.steps.length >= 2, 'Should have at least 2 steps');
    
    // Ensure all steps have speech about photosynthesis
    const allSpeech = result.steps.map(s => s.speech).join(' ');
    assert.ok(allSpeech.toLowerCase().includes('photosynthesis') || allSpeech.toLowerCase().includes('plant'), 'Speech must talk about photosynthesis/plants');
    assert.ok(!allSpeech.includes('Client / Input'), 'Speech must not contain Client / Input');
    assert.ok(!allSpeech.includes('Execution Engine'), 'Speech must not contain Execution Engine');
    assert.ok(!allSpeech.includes('State / Storage'), 'Speech must not contain State / Storage');

    // Check drawing operations
    for (const step of result.steps) {
      assert.ok(step.compiledElements && step.compiledElements.length > 0, 'Every step must have compiled whiteboard elements');
      for (const el of step.compiledElements) {
        if (el.type === 'text') {
          assert.notEqual(el.text, 'Client / Input', 'No element should be labeled Client / Input');
          assert.notEqual(el.text, 'Execution Engine', 'No element should be labeled Execution Engine');
          assert.notEqual(el.text, 'State / Storage', 'No element should be labeled State / Storage');
        }
      }
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Photosynthesis with structured JSON returns correct steps and compiled elements', async () => {
  const originalFetch = globalThis.fetch;
  
  const mockJson = JSON.stringify({
    answer: "Photosynthesis converts sunlight, water, and CO2 into glucose and oxygen.",
    explanation: "Photosynthesis occurs in plant chloroplasts...",
    level: "beginner",
    steps: [
      {
        stepNumber: 1,
        title: "1. Raw Materials",
        speech: "Plants take in sunlight, water, and carbon dioxide.",
        draw: [
          { op: "box", id: "light_in", x: 120, y: 200, w: 140, h: 60, label: "Sunlight & Water" }
        ],
        highlightElementIds: ["light_in"]
      },
      {
        stepNumber: 2,
        title: "2. Chloroplast Synthesis",
        speech: "Inside chloroplasts, chlorophyll traps light energy.",
        draw: [
          { op: "ellipse", id: "chloro_node", x: 380, y: 200, w: 160, h: 70, label: "Chloroplast" },
          { op: "arrow", id: "arr_1", from: "light_in", to: "chloro_node", label: "enters" }
        ],
        highlightElementIds: ["chloro_node"]
      },
      {
        stepNumber: 3,
        title: "3. Glucose & Oxygen Release",
        speech: "The plant produces glucose and releases oxygen.",
        draw: [
          { op: "box", id: "out_prod", x: 640, y: 200, w: 150, h: 60, label: "Glucose & O2" },
          { op: "arrow", id: "arr_2", from: "chloro_node", to: "out_prod", label: "yields" }
        ],
        highlightElementIds: ["out_prod"]
      }
    ]
  });

  globalThis.fetch = async () => {
    return {
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: mockJson
            }
          }
        ]
      })
    };
  };

  try {
    const result = await handleTutorChat(
      {
        message: 'Explain photosynthesis',
        level: 'beginner',
        providerConfig: {
          provider: 'openrouter',
          apiKey: 'test-key',
          model: 'meta-llama/llama-3.3-70b-instruct:free'
        }
      },
      () => {}
    );

    assert.equal(result.steps?.length, 3);
    assert.equal(result.steps[0].title, '1. Raw Materials');
    assert.equal(result.steps[1].title, '2. Chloroplast Synthesis');
    assert.equal(result.steps[2].title, '3. Glucose & Oxygen Release');

    // Verify all steps have compiled Excalidraw elements
    assert.ok(result.steps[0].compiledElements.length > 0);
    assert.ok(result.steps[1].compiledElements.length > 0);
    assert.ok(result.steps[2].compiledElements.length > 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

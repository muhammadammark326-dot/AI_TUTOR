import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSystemPrompt } from '../dist/tutor/prompt-builder.js';
import { handleTutorChat } from '../dist/tutor/orchestrator.js';

test('System Prompt builder enforces teacher pedagogy and bans passive reader definitions', () => {
  const prompt = buildSystemPrompt('beginner');
  
  // Must instruct teacher persona rather than textbook reader
  assert.ok(prompt.includes('TEACH LIKE A TEACHER, NOT A PASSIVE READER'), 'Must contain teacher vs reader rule');
  assert.ok(prompt.includes('WHAT IS IT? (The Intuitive Hook)'), 'Must mandate What is it hook');
  assert.ok(prompt.includes('WHY DO WE NEED IT & WHY IS IT USEFUL?'), 'Must mandate Why we need it motivation');
  assert.ok(prompt.includes('HOW DOES IT WORK?'), 'Must mandate How it works breakdown');
  assert.ok(prompt.includes('REAL-WORLD SIGNIFICANCE'), 'Must mandate Real-world significance');
  assert.ok(prompt.includes('Why We Need It'), 'Must mandate note highlighting Why We Need It');
});

test('Orchestrator generates 4-part pedagogical steps with Why We Need It note', async () => {
  const originalFetch = globalThis.fetch;

  // Mock LLM returning plain text
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      choices: [
        {
          message: {
            content: `The heart is a muscular organ that pumps blood throughout the circulatory system.
Oxygen-poor blood enters the right atrium and travels to the lungs.
Oxygen-rich blood returns to the left ventricle to be distributed through the aorta.
Without the heart, oxygen and nutrients could not reach tissues, causing biological death within minutes.`
          }
        }
      ]
    })
  });

  try {
    const result = await handleTutorChat(
      {
        message: 'How does the human heart work?',
        level: 'beginner',
        providerConfig: {
          provider: 'openrouter',
          apiKey: 'test-key',
          model: 'meta-llama/llama-3.3-70b-instruct:free'
        }
      },
      () => {}
    );

    assert.ok(result.steps && result.steps.length >= 3, 'Expected at least 3 teaching steps');
    
    // Check titles reflect teacher pedagogy
    assert.ok(result.steps[0].title.includes('What It Is'), 'Step 1 should include What It Is');
    assert.ok(result.steps[1].title.includes('How It Works'), 'Step 2 should include How It Works');
    assert.ok(result.steps[2].title.includes('Why We Need It'), 'Step 3 should include Why We Need It');

    // Check step 3 contains Why We Need It note in whiteboard drawings
    const step3Draw = result.steps[2].draw || [];
    const takeawayNote = step3Draw.find(d => d.op === 'note');
    assert.ok(takeawayNote, 'Step 3 must have a whiteboard note');
    assert.ok(takeawayNote.text.includes('Why We Need It'), 'Takeaway note must explain Why We Need It');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

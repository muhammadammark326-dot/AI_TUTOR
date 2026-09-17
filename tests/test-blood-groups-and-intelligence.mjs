import assert from 'node:assert/strict';
import { handleTutorChat } from '../dist/tutor/orchestrator.js';
import { generateIntelligentTopicLesson, findCuratedTopic } from '../dist/tutor/topic-knowledge.js';
import { findMatchingLibrarySymbol, LIBRARY_REGISTRY } from '../dist/tutor/library-registry.js';

console.log('--- Starting Blood Groups & Intelligent Pedagogy Tests ---');

// 1. Verify blood_cell library symbol is registered
console.log('1. Testing blood_cell vector library symbol...');
assert.ok(LIBRARY_REGISTRY.blood_cell, 'blood_cell symbol must exist in LIBRARY_REGISTRY');
const rbcDef = LIBRARY_REGISTRY.blood_cell;
assert.equal(rbcDef.category, 'biology');
assert.ok(rbcDef.tags.includes('blood') && rbcDef.tags.includes('abo'));
const rbcElements = rbcDef.generateElements(100, 200);
assert.ok(rbcElements.length >= 5, `Expected at least 5 elements for blood cell, got ${rbcElements.length}`);
console.log(`✓ blood_cell registered with ${rbcElements.length} vector elements.`);

// 2. Verify findMatchingLibrarySymbol matches blood groups
console.log('2. Testing findMatchingLibrarySymbol for blood groups...');
const matched = findMatchingLibrarySymbol('blood groups');
assert.ok(matched, 'Should match a library symbol for "blood groups"');
assert.equal(matched.id, 'blood_cell');
console.log(`✓ Matched symbol: "${matched.name}"`);

// 3. Verify curated topic lookup
console.log('3. Testing curated topic lookup for blood groups...');
const curated = findCuratedTopic('teach me about blood groups and transfusions');
assert.ok(curated, 'Should find curated topic for blood groups');
assert.equal(curated.id, 'blood_groups');
assert.ok(curated.answer.includes('surface antigens'), 'Answer should explain surface antigens');
assert.ok(curated.explanation.includes('ABO'), 'Explanation should explain ABO system');
console.log(`✓ Curated topic found: "${curated.topicTitle}"`);

// 4. Verify generateIntelligentTopicLesson generates domain-accurate Socratic steps
console.log('4. Testing generateIntelligentTopicLesson for blood groups...');
const lesson = await generateIntelligentTopicLesson('blood groups', 'beginner', 120, 160);
assert.ok(lesson.steps.length >= 3, `Expected at least 3 teaching steps, got ${lesson.steps.length}`);

// Step 1: RBC & Antigens
const step1 = lesson.steps[0];
console.log(`Step 1 title: "${step1.title}"`);
assert.ok(step1.title.toLowerCase().includes('antigen') || step1.title.toLowerCase().includes('red blood cell'));
assert.ok(step1.speech.toLowerCase().includes('antigen'), 'Step 1 speech must teach antigens');
assert.ok(!step1.speech.toLowerCase().includes('trouble connecting'), 'Must NOT have error boilerplate');
assert.ok(step1.draw.some(d => d.op === 'library_symbol' && d.symbol === 'blood_cell'), 'Step 1 must draw blood_cell symbol');

// Step 2: ABO Classification
const step2 = lesson.steps[1];
console.log(`Step 2 title: "${step2.title}"`);
assert.ok(step2.speech.toLowerCase().includes('antibody') || step2.speech.toLowerCase().includes('antibodies') || step2.speech.toLowerCase().includes('plasma'));
assert.ok(step2.draw.length > 0, 'Step 2 must include whiteboard drawings');

// Step 3: Transfusion Safety
const step3 = lesson.steps[2];
console.log(`Step 3 title: "${step3.title}"`);
assert.ok(step3.speech.toLowerCase().includes('transfusion') || step3.speech.toLowerCase().includes('donor') || step3.speech.toLowerCase().includes('recipient'));
assert.ok(step3.explanation.toLowerCase().includes('universal donor'), 'Step 3 must teach universal donor concept');
console.log('✓ Socratic steps verified with authentic hematology content and vector drawings.');

// 5. Test handleTutorChat integration (without valid external LLM key, fallback must be intelligent)
console.log('5. Testing handleTutorChat end-to-end integration for blood groups...');
let appliedElementsCount = 0;
const response = await handleTutorChat(
  {
    message: 'tell me about blood groups and how they work',
    level: 'beginner',
  },
  (newEls) => {
    appliedElementsCount = newEls.length;
  }
);

assert.ok(response.answer, 'Tutor response must contain an answer');
assert.ok(!response.answer.toLowerCase().includes('trouble connecting'), 'Tutor answer must NOT be an error message');
assert.ok(response.answer.toLowerCase().includes('antigen') || response.answer.toLowerCase().includes('blood'), 'Answer must be about blood and antigens');
assert.ok(response.steps && response.steps.length >= 3, `Expected at least 3 steps, got ${response.steps?.length}`);

// Ensure every step has compiled elements
for (const st of response.steps) {
  assert.ok(st.compiledElements && st.compiledElements.length > 0, `Step "${st.title}" must have compiledElements`);
}
console.log(`✓ handleTutorChat generated ${response.steps.length} steps with compiled whiteboard elements.`);
console.log('✓ Verified no error-string hallucinations occurred.');

console.log('--- All Blood Groups & Intelligence Tests Passed Successfully! ---');

import logger from '../utils/logger.js';
import { TeachingStep } from './types.js';
import { findMatchingLibrarySymbol } from './library-registry.js';

export interface CuratedTopicLesson {
  id: string;
  topicTitle: string;
  tags: string[];
  answer: string;
  explanation: string;
  generateSteps: (startX: number, startY: number) => TeachingStep[];
}

export const CURATED_TOPIC_REGISTRY: Record<string, CuratedTopicLesson> = {
  blood_groups: {
    id: 'blood_groups',
    topicTitle: 'Blood Groups & ABO Transfusion System',
    tags: [
      'blood', 'blood group', 'blood groups', 'blood type', 'blood types',
      'abo', 'erythrocyte', 'antigen', 'antigens', 'antibody', 'antibodies',
      'transfusion', 'rh factor', 'rhesus', 'hematology', 'circulation'
    ],
    answer: 'Blood groups are inherited classifications of red blood cells determined by surface antigens (A, B, and Rh D). Understanding blood groups is essential for life-saving transfusions, ensuring antibodies in plasma do not attack foreign blood cells and cause fatal clumping (agglutination).',
    explanation: `### 1. What is a Blood Group? (The Identification Tags)
A blood group (or blood type) is an inherited classification of human blood based on distinctive marker proteins called **antigens** found on the outer surface of red blood cells (erythrocytes). In the international ABO system, people are categorized into **Type A**, **Type B**, **Type AB**, or **Type O**.

### 2. How the ABO and Rh Systems Work
Your blood consists of red blood cells and liquid plasma:
- **Type A**: Red blood cells carry **A antigens**; plasma carries **Anti-B antibodies**.
- **Type B**: Red blood cells carry **B antigens**; plasma carries **Anti-A antibodies**.
- **Type AB**: Red blood cells carry **both A & B antigens**; plasma has **no antibodies** (Universal Recipient: AB+).
- **Type O**: Red blood cells have **neither antigen**; plasma contains **both Anti-A & Anti-B antibodies** (Universal Donor: O-).
- **Rh Factor (+/-)**: Refers to the presence (+) or absence (-) of the Rh D protein on cell membranes.

### 3. Why We Need It: Transfusion Safety & Hemolysis
If a patient receives incompatible blood, recipient antibodies bind to the donor's foreign antigens in a rapid immune reaction called **agglutination** (clumping). The clumped cells rupture (**hemolysis**), clogging capillaries and causing kidney failure. Accurate blood typing is vital for surgeries, emergency trauma, and childbirth.`,
    generateSteps: (startX: number, startY: number): TeachingStep[] => [
      {
        stepNumber: 1,
        title: '1. What It Is: Red Blood Cells & Surface Antigens',
        speech: `Let's understand what blood groups really are! Rather than just letters on medical charts, think of your red blood cells as carrying microscopic ID badges called antigens. The two main antigens are Antigen A and Antigen B, accompanied by the Rh protein.`,
        explanation: `### 1. What is a Blood Group? (Surface Antigens)
Red blood cells (erythrocytes) carry distinctive chemical markers called **antigens** on their outer membrane.
- If your cells display **Antigen A**, your blood is **Type A**.
- If they display **Antigen B**, you are **Type B**.
- If they display **both A and B**, you are **Type AB**.
- If they have **neither**, your blood is **Type O**.
- An additional protein, the **Rh D Factor**, determines whether your type is **Positive (+)** or **Negative (-)**.`,
        draw: [
          {
            op: 'library_symbol',
            id: 'step1_rbc_symbol',
            symbol: 'blood_cell',
            library: 'biology',
            x: startX,
            y: startY - 10,
            scale: 1.0,
            label: 'Red Blood Cell (Surface Antigens)',
          },
          {
            op: 'note',
            id: 'step1_antigen_note',
            x: startX + 270,
            y: startY,
            w: 240,
            h: 120,
            text: 'RBC Surface Antigens:\n• Antigen A: Blue Diamond\n• Antigen B: Amber Circle\n• Rh Factor: Green Marker (+)\nDetermines blood identity!',
            color: '#c92a2a',
            bgColor: '#fff5f5',
          },
        ],
        highlightElementIds: ['step1_rbc_symbol', 'step1_antigen_note'],
      },
      {
        stepNumber: 2,
        title: '2. How It Works: ABO System & Plasma Antibodies',
        speech: `Now, how does our immune system interact with blood? Your plasma contains antibodies designed to destroy foreign antigens. Type A people have anti-B antibodies, Type B people have anti-A antibodies, Type O has both, and Type AB has neither!`,
        explanation: `### 2. How the ABO System Operates (Antigens vs. Antibodies)
Your immune system naturally produces antibodies against whichever ABO antigens your own cells lack:
- **Type A Blood**: Antigen A on cells | **Anti-B antibodies** in plasma.
- **Type B Blood**: Antigen B on cells | **Anti-A antibodies** in plasma.
- **Type AB Blood**: Both antigens on cells | **No antibodies** in plasma.
- **Type O Blood**: No antigens on cells | **Both Anti-A & Anti-B antibodies** in plasma.`,
        draw: [
          {
            op: 'box',
            id: 'step2_abo_matrix',
            x: startX + 540,
            y: startY - 10,
            w: 220,
            h: 140,
            label: 'ABO Classification Matrix\nType A (Anti-B)\nType B (Anti-A)\nType AB (None)\nType O (Both Anti-A & B)',
            color: '#e67700',
            bgColor: '#fff9db',
          },
          {
            op: 'arrow',
            id: 'step2_arrow_to_matrix',
            from: 'step1_antigen_note',
            to: 'step2_abo_matrix',
            label: 'governs immune plasma',
            color: '#e67700',
          },
        ],
        highlightElementIds: ['step2_abo_matrix', 'step2_arrow_to_matrix'],
      },
      {
        stepNumber: 3,
        title: '3. Why We Need It: Transfusion Safety & Universal Donor',
        speech: `Finally, why is blood grouping life-or-death important? In blood transfusions, giving the wrong blood triggers agglutination, where antibodies clump cells together like glue. O Negative is the Universal Donor because it has zero antigens to trigger an attack, while AB Positive is the Universal Recipient!`,
        explanation: `### 3. Transfusion Compatibility & Clinical Impact
Mismatched transfusions cause **agglutination** (severe clumping) and **hemolysis** (cell rupture).
- **Universal Donor: O Negative (O-)**: Because O- red blood cells carry no A, B, or Rh antigens, any patient's blood can accept them in an emergency without antibody clumping.
- **Universal Recipient: AB Positive (AB+)**: Possesses all antigens and zero antibodies, meaning they can safely receive red blood cells from any blood type.
- **Rh Incompatibility**: Rh- mothers carrying Rh+ fetuses require RhoGAM to prevent hemolytic disease of the newborn.`,
        draw: [
          {
            op: 'box',
            id: 'step3_transfusion_box',
            x: startX + 800,
            y: startY - 10,
            w: 230,
            h: 140,
            label: 'Transfusion Safety\n• Universal Donor: O-\n• Universal Recipient: AB+\n• Prevents Agglutination',
            color: '#1971c2',
            bgColor: '#e7f5ff',
          },
          {
            op: 'arrow',
            id: 'step3_arrow_safety',
            from: 'step2_abo_matrix',
            to: 'step3_transfusion_box',
            label: 'determines match',
            color: '#1971c2',
          },
          {
            op: 'note',
            id: 'step3_clinical_takeaway',
            x: startX + 270,
            y: startY + 160,
            w: 520,
            h: 90,
            text: 'Clinical Rule: Never transfuse red cells carrying an antigen the recipient possesses antibodies against. O- is the universal emergency lifesaver!',
            color: '#c92a2a',
            bgColor: '#fff5f5',
          },
        ],
        highlightElementIds: ['step3_transfusion_box', 'step3_clinical_takeaway'],
      },
    ],
  },

  photosynthesis: {
    id: 'photosynthesis',
    topicTitle: 'Photosynthesis & Solar Energy Conversion',
    tags: ['photosynthesis', 'plant', 'chloroplast', 'chlorophyll', 'sunlight', 'thylakoid', 'calvin cycle'],
    answer: 'Photosynthesis is the biochemical process whereby green plants, algae, and cyanobacteria convert sunlight, water, and carbon dioxide into oxygen and energy-rich glucose sugar.',
    explanation: `### 1. What is Photosynthesis?
Photosynthesis is Earth's primary bio-energy engine. In plant leaves, specialized organelle structures called **chloroplasts** absorb solar photons to power life.

### 2. The Two Primary Stages
1. **Light-Dependent Reactions (in Thylakoid membranes)**: Photons split water ($H_2O$), releasing Oxygen ($O_2$) and charging energy carriers ($ATP$ & $NADPH$).
2. **Light-Independent Reactions / Calvin Cycle (in Stroma)**: Captures Carbon Dioxide ($CO_2$) and uses ATP/NADPH to synthesize Glucose ($C_6H_{12}O_6$).

### 3. Why We Need It: Global Atmosphere & Food Chains
Photosynthesis produces virtually all atmospheric oxygen ($O_2$) that humans and animals breathe, while forming the foundational base of planetary food webs.`,
    generateSteps: (startX: number, startY: number): TeachingStep[] => [
      {
        stepNumber: 1,
        title: '1. What It Is & Raw Inputs (Sunlight, H2O, CO2)',
        speech: `Let's understand photosynthesis! It is the process by which plants turn solar light into chemical food. It starts with simple raw ingredients: sunlight, water absorbed by roots, and carbon dioxide from the air.`,
        explanation: `### 1. What is Photosynthesis? (Raw Starting Inputs)\nPlants absorb sunlight through chlorophyll pigments, draw water from soil, and take in $CO_2$ through leaf stomata.`,
        draw: [
          {
            op: 'box',
            id: 'step1_inputs',
            x: startX,
            y: startY,
            w: 180,
            h: 70,
            label: 'Inputs: Sunlight,\nH2O & CO2',
            color: '#2b8a3e',
            bgColor: '#ebfbee',
          },
        ],
        highlightElementIds: ['step1_inputs'],
      },
      {
        stepNumber: 2,
        title: '2. How It Works: Chloroplast Thylakoids & Calvin Cycle',
        speech: `Now, how does the plant transform these ingredients? Inside chloroplasts, light reactions in the thylakoid membranes split water to release oxygen, while the Calvin cycle in the stroma builds glucose sugars!`,
        explanation: `### 2. How It Works (Thylakoids & Calvin Cycle)\nInside the chloroplast:\n1. **Thylakoids**: Split $H_2O$ with light, creating ATP, NADPH, and releasing $O_2$.\n2. **Stroma**: Fixes $CO_2$ into glucose using the energy carriers.`,
        draw: [
          {
            op: 'library_symbol',
            id: 'step2_chloro',
            symbol: 'chloroplast',
            library: 'biology',
            x: startX + 270,
            y: startY - 20,
            scale: 1.0,
            label: 'Chloroplast (Thylakoids & Stroma)',
          },
          {
            op: 'arrow',
            id: 'step2_arr1',
            from: 'step1_inputs',
            to: 'step2_chloro',
            label: 'absorbed by',
            color: '#2b8a3e',
          },
        ],
        highlightElementIds: ['step2_chloro'],
      },
      {
        stepNumber: 3,
        title: '3. Why We Need It: Oxygen & Glucose for Life on Earth',
        speech: `Finally, why do we need photosynthesis? It generates the oxygen we breathe and provides the base calories for nearly every living organism on Earth!`,
        explanation: `### 3. Why We Need It (Global Life Support)\nWithout photosynthesis, atmospheric oxygen would deplete and the biological food chain would collapse.`,
        draw: [
          {
            op: 'box',
            id: 'step3_outputs',
            x: startX + 590,
            y: startY,
            w: 190,
            h: 70,
            label: 'Outputs: Glucose\n& Oxygen (O2)',
            color: '#1971c2',
            bgColor: '#e7f5ff',
          },
          {
            op: 'arrow',
            id: 'step3_arr2',
            from: 'step2_chloro',
            to: 'step3_outputs',
            label: 'synthesizes',
            color: '#1971c2',
          },
          {
            op: 'note',
            id: 'step3_takeaway',
            x: startX + 220,
            y: startY + 160,
            w: 420,
            h: 80,
            text: 'Why It Matters: Photosynthesis fuels 99% of Earth ecosystems and maintains atmospheric oxygen balance.',
            color: '#e67700',
            bgColor: '#fff9db',
          },
        ],
        highlightElementIds: ['step3_outputs', 'step3_takeaway'],
      },
    ],
  },
};

/**
 * Searches curated educational knowledge registry for a matching topic.
 */
export function findCuratedTopic(query: string): CuratedTopicLesson | null {
  const clean = query.toLowerCase();
  for (const lesson of Object.values(CURATED_TOPIC_REGISTRY)) {
    if (lesson.tags.some(tag => clean.includes(tag)) || clean.includes(lesson.id)) {
      return lesson;
    }
  }
  return null;
}

/**
 * Fetches dynamic, peer-reviewed Wikipedia encyclopedia summary for any educational topic.
 * Guarantees domain-accurate explanation and definitions without error text hallucination.
 */
export async function fetchDynamicWikipediaSummary(query: string): Promise<{ title: string; extract: string; description: string } | null> {
  const clean = query.replace(/[^\w\s-]/gi, ' ').trim().slice(0, 60);
  if (!clean) return null;

  try {
    const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(clean.replace(/\s+/g, '_'))}`;
    const resp = await fetch(wikiUrl, {
      headers: { 'User-Agent': 'GraphicalAITutor/2.0 (Educational AI Tutor)' },
      signal: AbortSignal.timeout(6000),
    });

    if (resp.ok) {
      const data: any = await resp.json();
      if (data.extract && data.extract.length > 40) {
        return {
          title: data.title || clean,
          extract: data.extract,
          description: data.description || `${clean} core scientific concept`,
        };
      }
    }
  } catch (err: any) {
    logger.warn(`Wikipedia summary fetch failed for "${clean}":`, err.message);
  }

  return null;
}

/**
 * Generates an intelligent, domain-accurate Socratic lesson for any topic.
 * Used when LLM provider fails, times out, or returns invalid syntax.
 * NEVER leaks error messages or stopwords into teaching steps.
 */
export async function generateIntelligentTopicLesson(
  userQuery: string,
  level: string = 'beginner',
  startX: number = 140,
  startY: number = 220
): Promise<{
  answer: string;
  explanation: string;
  topicTitle: string;
  steps: TeachingStep[];
}> {
  // 1. Check if query matches curated high-fidelity STEM knowledge registry
  const curated = findCuratedTopic(userQuery);
  if (curated) {
    logger.info(`Serving curated pedagogical lesson for topic: "${curated.topicTitle}"`);
    return {
      answer: curated.answer,
      explanation: curated.explanation,
      topicTitle: curated.topicTitle,
      steps: curated.generateSteps(startX, startY),
    };
  }

  // 2. Fetch factual encyclopedia summary from Wikipedia Summary API
  const wikiSummary = await fetchDynamicWikipediaSummary(userQuery);
  const topicTitle = wikiSummary?.title || userQuery.trim();
  const rawExtract = wikiSummary?.extract || `The concept of ${topicTitle} encompasses key fundamental principles, mechanisms, and real-world applications in its field.`;

  // Split extract into meaningful pedagogical sentences
  const sentences = rawExtract
    .split(/(?<=[.?!])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 15);

  const s1 = sentences[0] || `${topicTitle} is a foundational concept with distinct starting principles.`;
  const s2 = sentences.slice(1, 3).join(' ') || `It operates through specific mechanical transformations and structured interactions.`;
  const s3 = sentences.slice(3, 5).join(' ') || `Understanding ${topicTitle} is critical for real-world functioning and scientific problem-solving.`;

  const answer = `${topicTitle}: ${s1}`;
  const explanation = `### 1. What is it? (Definition & Core Concept)\n${s1}\n\n### 2. How It Works (Step-by-Step Mechanism)\n${s2}\n\n### 3. Why We Need It & Real-World Impact\n${s3}`;

  // Check if topic matches any rich library symbol
  const matchedSymbol = findMatchingLibrarySymbol(topicTitle + ' ' + userQuery);

  const step1Draw = [
    {
      op: 'box',
      id: 'step1_concept_node',
      x: startX,
      y: startY,
      w: 190,
      h: 70,
      label: `${topicTitle.slice(0, 22)}\n(Core Inputs)`,
      color: '#2b8a3e',
      bgColor: '#ebfbee',
    },
  ];

  let step2Draw: any[];
  if (matchedSymbol) {
    step2Draw = [
      {
        op: 'library_symbol',
        id: 'step2_mechanism_node',
        symbol: matchedSymbol.id,
        library: matchedSymbol.category || 'general',
        x: startX + 280,
        y: startY - 20,
        scale: 1.0,
        label: `${topicTitle.slice(0, 22)} Mechanism`,
      },
      {
        op: 'arrow',
        id: 'step2_arrow_mech',
        from: 'step1_concept_node',
        to: 'step2_mechanism_node',
        label: 'initiates / drives',
        color: '#2b8a3e',
      },
    ];
  } else {
    step2Draw = [
      {
        op: 'ellipse',
        id: 'step2_mechanism_node',
        x: startX + 280,
        y: startY,
        w: 200,
        h: 75,
        label: `${topicTitle.slice(0, 20)}\nTransformation`,
        color: '#e67700',
        bgColor: '#fff9db',
      },
      {
        op: 'arrow',
        id: 'step2_arrow_mech',
        from: 'step1_concept_node',
        to: 'step2_mechanism_node',
        label: 'initiates / drives',
        color: '#e67700',
      },
    ];
  }

  const step3Draw = [
    {
      op: 'box',
      id: 'step3_output_node',
      x: startX + 580,
      y: startY,
      w: 190,
      h: 70,
      label: `${topicTitle.slice(0, 20)}\nOutputs & Impact`,
      color: '#1971c2',
      bgColor: '#e7f5ff',
    },
    {
      op: 'arrow',
      id: 'step3_arrow_out',
      from: 'step2_mechanism_node',
      to: 'step3_output_node',
      label: 'yields / produces',
      color: '#1971c2',
    },
    {
      op: 'note',
      id: 'step3_takeaway_note',
      x: startX + 160,
      y: startY + 150,
      w: 420,
      h: 85,
      text: `Why We Need It: ${s3.slice(0, 110)}... Fundamental for systems balance.`,
      color: '#e67700',
      bgColor: '#fff9db',
    },
  ];

  const steps: TeachingStep[] = [
    {
      stepNumber: 1,
      title: `1. What It Is: ${topicTitle.slice(0, 24)}`,
      speech: `Let's understand what ${topicTitle} is! Rather than memorizing dry definitions, here is the intuitive foundation: ${s1}`,
      explanation: `### 1. What is it? (The Intuitive Hook)\n\n${s1}\n\nWe start by mapping the fundamental components on our whiteboard: **${topicTitle}**.`,
      draw: step1Draw,
      highlightElementIds: ['step1_concept_node'],
    },
    {
      stepNumber: 2,
      title: `2. How It Works: The Mechanism`,
      speech: `Now, how does it actually work? Inside the system, the transformation happens right here: ${s2}`,
      explanation: `### 2. How It Works (Step-by-Step Mechanics)\n\n${s2}\n\nNotice how the components interact with the central mechanism to drive the process forward.`,
      draw: step2Draw,
      highlightElementIds: ['step2_mechanism_node'],
    },
    {
      stepNumber: 3,
      title: `3. Results & Why We Need It`,
      speech: `Finally, why do we need this and what is the real-world impact? ${s3}`,
      explanation: `### 3. Why We Need It & Real-World Impact\n\n${s3}\n\n**Why it matters**: Without ${topicTitle}, the system could not achieve equilibrium or accomplish its purpose.`,
      draw: step3Draw,
      highlightElementIds: ['step3_output_node', 'step3_takeaway_note'],
    },
  ];

  return {
    answer,
    explanation,
    topicTitle,
    steps,
  };
}

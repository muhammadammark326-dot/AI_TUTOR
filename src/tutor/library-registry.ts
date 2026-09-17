import { ExcalidrawElement } from '../types.js';

export interface LibrarySymbolDefinition {
  id: string;
  name: string;
  category: 'biology' | 'architecture' | 'physics' | 'general';
  tags: string[];
  width: number;
  height: number;
  generateElements: (x: number, y: number, scale?: number, label?: string) => any[];
}

/**
 * Curated Vector Library Registry for Graphical AI Tutor.
 * Allows tutor and students to place rich, multi-element vector symbols.
 */
export const LIBRARY_REGISTRY: Record<string, LibrarySymbolDefinition> = {
  // --- BIOLOGY ---
  chloroplast: {
    id: 'chloroplast',
    name: 'Chloroplast (Plant Organelle)',
    category: 'biology',
    tags: ['photosynthesis', 'plant', 'biology', 'thylakoid', 'cell'],
    width: 260,
    height: 160,
    generateElements: (x, y, scale = 1.0, label) => {
      const w = 260 * scale;
      const h = 160 * scale;
      return [
        // Outer membrane
        {
          id: `sym_chloro_outer_${Date.now()}`,
          type: 'ellipse',
          x,
          y,
          width: w,
          height: h,
          strokeColor: '#2b8a3e',
          backgroundColor: '#ebfbee',
          fillStyle: 'solid',
          strokeWidth: 3,
          roughness: 1,
        },
        // Inner stroma region
        {
          id: `sym_chloro_inner_${Date.now()}`,
          type: 'ellipse',
          x: x + 15 * scale,
          y: y + 15 * scale,
          width: w - 30 * scale,
          height: h - 30 * scale,
          strokeColor: '#51cf66',
          backgroundColor: '#d3f9d8',
          fillStyle: 'solid',
          strokeWidth: 1.5,
          roughness: 1,
        },
        // Thylakoid Granum Stack 1
        {
          id: `sym_thylakoid_1a_${Date.now()}`,
          type: 'rectangle',
          x: x + 50 * scale,
          y: y + 55 * scale,
          width: 50 * scale,
          height: 14 * scale,
          strokeColor: '#2b8a3e',
          backgroundColor: '#2f9e44',
          fillStyle: 'solid',
          roundness: { type: 3 },
        },
        {
          id: `sym_thylakoid_1b_${Date.now()}`,
          type: 'rectangle',
          x: x + 50 * scale,
          y: y + 75 * scale,
          width: 50 * scale,
          height: 14 * scale,
          strokeColor: '#2b8a3e',
          backgroundColor: '#2f9e44',
          fillStyle: 'solid',
          roundness: { type: 3 },
        },
        // Thylakoid Granum Stack 2
        {
          id: `sym_thylakoid_2a_${Date.now()}`,
          type: 'rectangle',
          x: x + 130 * scale,
          y: y + 55 * scale,
          width: 50 * scale,
          height: 14 * scale,
          strokeColor: '#2b8a3e',
          backgroundColor: '#2f9e44',
          fillStyle: 'solid',
          roundness: { type: 3 },
        },
        {
          id: `sym_thylakoid_2b_${Date.now()}`,
          type: 'rectangle',
          x: x + 130 * scale,
          y: y + 75 * scale,
          width: 50 * scale,
          height: 14 * scale,
          strokeColor: '#2b8a3e',
          backgroundColor: '#2f9e44',
          fillStyle: 'solid',
          roundness: { type: 3 },
        },
        // Connecting lamella
        {
          id: `sym_lamella_${Date.now()}`,
          type: 'line',
          x: x + 100 * scale,
          y: y + 75 * scale,
          width: 30 * scale,
          height: 0,
          points: [[0, 0], [30 * scale, 0]],
          strokeColor: '#2f9e44',
          strokeWidth: 2,
        },
        // Organelle label
        {
          id: `sym_chloro_lbl_${Date.now()}`,
          type: 'text',
          x: x + 35 * scale,
          y: y + 115 * scale,
          width: w - 70 * scale,
          height: 24,
          text: label || 'Chloroplast (Thylakoids & Stroma)',
          fontSize: 14,
          fontFamily: 1,
          textAlign: 'center',
          strokeColor: '#234e1e',
        },
      ];
    },
  },

  mitochondria: {
    id: 'mitochondria',
    name: 'Mitochondria (Powerhouse Organelle)',
    category: 'biology',
    tags: ['respiration', 'biology', 'energy', 'atp', 'cell'],
    width: 250,
    height: 150,
    generateElements: (x, y, scale = 1.0, label) => {
      const w = 250 * scale;
      const h = 150 * scale;
      return [
        {
          id: `sym_mito_outer_${Date.now()}`,
          type: 'ellipse',
          x,
          y,
          width: w,
          height: h,
          strokeColor: '#d9480f',
          backgroundColor: '#ffe8cc',
          fillStyle: 'solid',
          strokeWidth: 3,
        },
        {
          id: `sym_mito_lbl_${Date.now()}`,
          type: 'text',
          x: x + 30 * scale,
          y: y + 60 * scale,
          width: w - 60 * scale,
          height: 24,
          text: label || 'Mitochondria (ATP Engine)',
          fontSize: 14,
          fontFamily: 1,
          textAlign: 'center',
          strokeColor: '#d9480f',
        },
      ];
    },
  },

  blood_cell: {
    id: 'blood_cell',
    name: 'Red Blood Cell (ABO & Rh Antigens)',
    category: 'biology',
    tags: ['blood', 'blood group', 'blood groups', 'abo', 'erythrocyte', 'antigen', 'transfusion', 'circulation', 'rh', 'hematology'],
    width: 240,
    height: 170,
    generateElements: (x, y, scale = 1.0, label) => {
      const w = 220 * scale;
      const h = 140 * scale;
      return [
        // Outer Biconcave Erythrocyte Disc
        {
          id: `sym_rbc_outer_${Date.now()}`,
          type: 'ellipse',
          x,
          y: y + 20 * scale,
          width: w,
          height: h,
          strokeColor: '#c92a2a',
          backgroundColor: '#ffc9c9',
          fillStyle: 'solid',
          strokeWidth: 3,
          roughness: 1,
        },
        // Inner Concave Depression
        {
          id: `sym_rbc_inner_${Date.now()}`,
          type: 'ellipse',
          x: x + 35 * scale,
          y: y + 45 * scale,
          width: 150 * scale,
          height: 90 * scale,
          strokeColor: '#a61e4d',
          backgroundColor: '#ffa8a8',
          fillStyle: 'solid',
          strokeWidth: 1.5,
          roughness: 1,
        },
        // Surface Antigen A Marker (Blue Diamond/Square)
        {
          id: `sym_rbc_ag_a_${Date.now()}`,
          type: 'rectangle',
          x: x + 25 * scale,
          y: y + 5 * scale,
          width: 20 * scale,
          height: 20 * scale,
          strokeColor: '#1971c2',
          backgroundColor: '#1971c2',
          fillStyle: 'solid',
          roundness: { type: 2 },
        },
        {
          id: `sym_rbc_ag_a_lbl_${Date.now()}`,
          type: 'text',
          x: x + 10 * scale,
          y: y - 14 * scale,
          width: 70 * scale,
          height: 16,
          text: 'Antigen A',
          fontSize: 11,
          fontFamily: 1,
          strokeColor: '#1864ab',
        },
        // Surface Antigen B Marker (Yellow/Amber Circle)
        {
          id: `sym_rbc_ag_b_${Date.now()}`,
          type: 'ellipse',
          x: x + 175 * scale,
          y: y + 5 * scale,
          width: 22 * scale,
          height: 22 * scale,
          strokeColor: '#e67700',
          backgroundColor: '#fcc419',
          fillStyle: 'solid',
        },
        {
          id: `sym_rbc_ag_b_lbl_${Date.now()}`,
          type: 'text',
          x: x + 160 * scale,
          y: y - 14 * scale,
          width: 70 * scale,
          height: 16,
          text: 'Antigen B',
          fontSize: 11,
          fontFamily: 1,
          strokeColor: '#d9480f',
        },
        // Surface Rh(+) Factor Marker (Green Badge)
        {
          id: `sym_rbc_rh_${Date.now()}`,
          type: 'rectangle',
          x: x + 100 * scale,
          y: y + 145 * scale,
          width: 20 * scale,
          height: 20 * scale,
          strokeColor: '#2b8a3e',
          backgroundColor: '#51cf66',
          fillStyle: 'solid',
          roundness: { type: 2 },
        },
        {
          id: `sym_rbc_rh_lbl_${Date.now()}`,
          type: 'text',
          x: x + 80 * scale,
          y: y + 168 * scale,
          width: 80 * scale,
          height: 16,
          text: 'Rh(+) Marker',
          fontSize: 11,
          fontFamily: 1,
          strokeColor: '#2b8a3e',
        },
        // RBC Center Label
        {
          id: `sym_rbc_lbl_${Date.now()}`,
          type: 'text',
          x: x + 25 * scale,
          y: y + 78 * scale,
          width: w - 50 * scale,
          height: 24,
          text: label || 'Red Blood Cell (RBC)',
          fontSize: 14,
          fontFamily: 1,
          textAlign: 'center',
          strokeColor: '#c92a2a',
        },
      ];
    },
  },

  // --- ARCHITECTURE & SYSTEMS ---
  microservice: {
    id: 'microservice',
    name: 'Microservice Component',
    category: 'architecture',
    tags: ['service', 'api', 'backend', 'system', 'architecture'],
    width: 200,
    height: 120,
    generateElements: (x, y, scale = 1.0, label) => {
      const w = 200 * scale;
      const h = 120 * scale;
      return [
        {
          id: `sym_svc_box_${Date.now()}`,
          type: 'rectangle',
          x,
          y,
          width: w,
          height: h,
          strokeColor: '#1971c2',
          backgroundColor: '#e7f5ff',
          fillStyle: 'solid',
          strokeWidth: 2,
          roundness: { type: 3 },
        },
        {
          id: `sym_svc_badge_${Date.now()}`,
          type: 'rectangle',
          x: x + 10 * scale,
          y: y + 10 * scale,
          width: 70 * scale,
          height: 20 * scale,
          strokeColor: '#1971c2',
          backgroundColor: '#1971c2',
          fillStyle: 'solid',
          roundness: { type: 2 },
        },
        {
          id: `sym_svc_txt_${Date.now()}`,
          type: 'text',
          x: x + 15 * scale,
          y: y + 12 * scale,
          width: 60 * scale,
          height: 16,
          text: 'SERVICE',
          fontSize: 10,
          fontFamily: 1,
          strokeColor: '#ffffff',
        },
        {
          id: `sym_svc_lbl_${Date.now()}`,
          type: 'text',
          x: x + 15 * scale,
          y: y + 50 * scale,
          width: w - 30 * scale,
          height: 24,
          text: label || 'Application Service',
          fontSize: 15,
          fontFamily: 1,
          textAlign: 'center',
          strokeColor: '#1864ab',
        },
      ];
    },
  },

  // --- PHYSICS & CIRCUITS ---
  battery: {
    id: 'battery',
    name: 'DC Voltage Source / Battery',
    category: 'physics',
    tags: ['circuits', 'physics', 'electronics', 'voltage'],
    width: 140,
    height: 90,
    generateElements: (x, y, scale = 1.0, label) => {
      return [
        // Long plate (+)
        {
          id: `sym_bat_p_${Date.now()}`,
          type: 'line',
          x: x + 40 * scale,
          y: y + 15 * scale,
          width: 0,
          height: 60 * scale,
          points: [[0, 0], [0, 60 * scale]],
          strokeColor: '#c92a2a',
          strokeWidth: 3,
        },
        // Short thick plate (-)
        {
          id: `sym_bat_n_${Date.now()}`,
          type: 'line',
          x: x + 60 * scale,
          y: y + 30 * scale,
          width: 0,
          height: 30 * scale,
          points: [[0, 0], [0, 30 * scale]],
          strokeColor: '#212529',
          strokeWidth: 5,
        },
        {
          id: `sym_bat_lbl_${Date.now()}`,
          type: 'text',
          x: x + 80 * scale,
          y: y + 30 * scale,
          width: 50 * scale,
          height: 20,
          text: label || '+ V -',
          fontSize: 14,
          fontFamily: 1,
          strokeColor: '#212529',
        },
      ];
    },
  },

  atom: {
    id: 'atom',
    name: 'Bohr Model Atom (Nucleus & Orbitals)',
    category: 'physics',
    tags: ['atom', 'physics', 'chemistry', 'nucleus', 'electron', 'nuclear'],
    width: 220,
    height: 160,
    generateElements: (x, y, scale = 1.0, label) => {
      const w = 220 * scale;
      const h = 160 * scale;
      const cx = x + w / 2;
      const cy = y + h / 2;
      return [
        // Nucleus
        {
          id: `sym_atom_core_${Date.now()}`,
          type: 'ellipse',
          x: cx - 20 * scale,
          y: cy - 20 * scale,
          width: 40 * scale,
          height: 40 * scale,
          strokeColor: '#c92a2a',
          backgroundColor: '#ffe3e3',
          fillStyle: 'solid',
          strokeWidth: 2,
        },
        // Orbital ellipse 1
        {
          id: `sym_atom_orb1_${Date.now()}`,
          type: 'ellipse',
          x: x + 10 * scale,
          y: cy - 35 * scale,
          width: w - 20 * scale,
          height: 70 * scale,
          strokeColor: '#1971c2',
          backgroundColor: 'transparent',
          strokeStyle: 'dashed',
          strokeWidth: 1.5,
        },
        // Orbital label
        {
          id: `sym_atom_lbl_${Date.now()}`,
          type: 'text',
          x: x + 20 * scale,
          y: y + h - 22 * scale,
          width: w - 40 * scale,
          height: 20,
          text: label || 'Atomic Structure (Nucleus & Orbitals)',
          fontSize: 13,
          fontFamily: 1,
          textAlign: 'center',
          strokeColor: '#1864ab',
        },
      ];
    },
  },

  neuron: {
    id: 'neuron',
    name: 'Neural Node & Synapse',
    category: 'architecture',
    tags: ['ai', 'neural', 'neuron', 'machine learning', 'deep learning', 'network'],
    width: 200,
    height: 140,
    generateElements: (x, y, scale = 1.0, label) => {
      const w = 200 * scale;
      const h = 140 * scale;
      return [
        {
          id: `sym_neuron_soma_${Date.now()}`,
          type: 'ellipse',
          x: x + 20 * scale,
          y: y + 30 * scale,
          width: 70 * scale,
          height: 70 * scale,
          strokeColor: '#5f3dc4',
          backgroundColor: '#f3f0ff',
          fillStyle: 'solid',
          strokeWidth: 2.5,
        },
        {
          id: `sym_neuron_axon_${Date.now()}`,
          type: 'line',
          x: x + 90 * scale,
          y: y + 65 * scale,
          width: 80 * scale,
          height: 0,
          points: [[0, 0], [80 * scale, 0]],
          strokeColor: '#7950f2',
          strokeWidth: 3,
        },
        {
          id: `sym_neuron_lbl_${Date.now()}`,
          type: 'text',
          x: x + 10 * scale,
          y: y + 110 * scale,
          width: w - 20 * scale,
          height: 20,
          text: label || 'Neuron / Activation Unit',
          fontSize: 13,
          fontFamily: 1,
          textAlign: 'center',
          strokeColor: '#5f3dc4',
        },
      ];
    },
  },
};

export interface ExcalidrawLibraryItem {
  id: string;
  status: 'published' | 'unpublished';
  elements: any[];
  title?: string;
  created?: number;
}

/**
 * Searches the registry for matching symbols by topic keyword.
 */
export function findMatchingLibrarySymbol(topic: string): LibrarySymbolDefinition | null {
  const clean = topic.toLowerCase();
  for (const def of Object.values(LIBRARY_REGISTRY)) {
    if (def.tags.some(tag => clean.includes(tag)) || clean.includes(def.id)) {
      return def;
    }
  }
  return null;
}

/**
 * Converts all registry symbols into standard Excalidraw Library Items
 * for injection into the native Excalidraw Library Drawer.
 */
export function exportExcalidrawLibraryItems(): ExcalidrawLibraryItem[] {
  return Object.values(LIBRARY_REGISTRY).map(def => {
    const rawElements = def.generateElements(0, 0);
    const elements = rawElements.map((el, idx) => ({
      ...el,
      id: `${def.id}_lib_${idx}`,
      seed: 100000 + idx,
      version: 1,
      versionNonce: 200000 + idx,
      isDeleted: false,
      groupIds: [def.id],
      updated: Date.now(),
    }));

    return {
      id: `lib_item_${def.id}`,
      status: 'published' as const,
      elements,
      title: def.name,
      created: Date.now(),
    };
  });
}

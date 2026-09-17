import test from 'node:test';
import assert from 'node:assert/strict';
import { isPrivateOrReservedIp, validateSafeUrl, searchInternetImage } from '../dist/tutor/image-service.js';
import { compileDrawOperations } from '../dist/tutor/canvas-compiler.js';
import { LIBRARY_REGISTRY, findMatchingLibrarySymbol, exportExcalidrawLibraryItems } from '../dist/tutor/library-registry.js';

test('SSRF Guard correctly identifies private, loopback, and metadata IPs', () => {
  // Loopback
  assert.equal(isPrivateOrReservedIp('127.0.0.1'), true);
  assert.equal(isPrivateOrReservedIp('127.1.2.3'), true);
  assert.equal(isPrivateOrReservedIp('::1'), true);

  // Private RFC 1918
  assert.equal(isPrivateOrReservedIp('10.0.0.1'), true);
  assert.equal(isPrivateOrReservedIp('172.16.0.1'), true);
  assert.equal(isPrivateOrReservedIp('172.31.255.255'), true);
  assert.equal(isPrivateOrReservedIp('192.168.1.1'), true);

  // Cloud Metadata (AWS/GCP/Azure)
  assert.equal(isPrivateOrReservedIp('169.254.169.254'), true);

  // Current network
  assert.equal(isPrivateOrReservedIp('0.0.0.0'), true);

  // Public IPs
  assert.equal(isPrivateOrReservedIp('8.8.8.8'), false);
  assert.equal(isPrivateOrReservedIp('93.184.216.34'), false);
  assert.equal(isPrivateOrReservedIp('151.101.1.140'), false);
});

test('SSRF Guard blocks insecure protocols and private hostnames', async () => {
  // Disallow HTTP (only HTTPS allowed)
  await assert.rejects(
    async () => validateSafeUrl('http://example.com/image.png'),
    /Insecure protocol/
  );

  // Disallow localhost
  await assert.rejects(
    async () => validateSafeUrl('https://localhost/image.png'),
    /Hostname "localhost" is restricted/
  );

  // Disallow private IP literals
  await assert.rejects(
    async () => validateSafeUrl('https://127.0.0.1/evil.png'),
    /is private\/reserved/
  );
  await assert.rejects(
    async () => validateSafeUrl('https://169.254.169.254/metadata'),
    /is private\/reserved/
  );
});

test('Canvas Compiler translates op: image into native Excalidraw image element', () => {
  const ops = [
    {
      op: 'image',
      id: 'img_chloroplast_1',
      fileId: 'file_chloro_123',
      x: 300,
      y: 200,
      w: 480,
      h: 320,
      title: 'Chloroplast Diagram'
    }
  ];

  const elements = compileDrawOperations(ops);
  assert.equal(elements.length, 1);
  const img = elements[0];
  assert.equal(img.type, 'image');
  assert.equal(img.id, 'img_chloroplast_1');
  assert.equal(img.fileId, 'file_chloro_123');
  assert.equal(img.status, 'saved');
  assert.equal(img.width, 480);
  assert.equal(img.height, 320);
});

test('Vector Library Registry provides curated educational symbols and compiles cleanly', () => {
  assert.ok(LIBRARY_REGISTRY.chloroplast);
  assert.ok(LIBRARY_REGISTRY.mitochondria);
  assert.ok(LIBRARY_REGISTRY.battery);
  assert.ok(LIBRARY_REGISTRY.microservice);

  // Test keyword matching
  const matchBio = findMatchingLibrarySymbol('photosynthesis in plant cell');
  assert.ok(matchBio);
  assert.equal(matchBio.id, 'chloroplast');

  const matchCircuit = findMatchingLibrarySymbol('dc battery voltage source');
  assert.ok(matchCircuit);
  assert.equal(matchCircuit.id, 'battery');

  // Test canvas compiler rendering library_symbol
  const ops = [
    {
      op: 'library_symbol',
      id: 'sym_1',
      symbol: 'chloroplast',
      x: 200,
      y: 150,
      scale: 1.0,
      label: 'Chloroplast Organelle'
    }
  ];

  const elements = compileDrawOperations(ops);
  assert.ok(elements.length >= 6, 'Chloroplast compound symbol should generate outer, inner, thylakoids, and text elements');
  
  const outer = elements.find(e => e.type === 'ellipse');
  assert.ok(outer);
  assert.equal(outer.strokeColor, '#2b8a3e');
});

test('exportExcalidrawLibraryItems formats symbols for native Excalidraw UI library drawer', () => {
  const items = exportExcalidrawLibraryItems();
  assert.ok(Array.isArray(items));
  assert.ok(items.length >= 6, 'Should export at least 6 educational library symbols');

  for (const item of items) {
    assert.ok(item.id.startsWith('lib_item_'));
    assert.equal(item.status, 'published');
    assert.ok(Array.isArray(item.elements));
    assert.ok(item.elements.length > 0);
    assert.ok(item.title);
  }
});

test('Arrow edge-to-edge calculation prevents overlapping with connected shapes and text', () => {
  const ops = [
    {
      op: 'box',
      id: 'box_a',
      x: 100,
      y: 100,
      w: 120,
      h: 60,
      label: 'Box A',
    },
    {
      op: 'box',
      id: 'box_b',
      x: 350,
      y: 100,
      w: 120,
      h: 60,
      label: 'Box B',
    },
    {
      op: 'arrow',
      id: 'arrow_ab',
      from: 'box_a',
      to: 'box_b',
      label: 'data flow',
    },
  ];

  const elements = compileDrawOperations(ops);
  const arrowEl = elements.find(e => e.type === 'arrow');
  assert.ok(arrowEl);

  // Arrow should start at right edge of Box A (100 + 120 + 8 = 228)
  assert.equal(arrowEl.x, 228);
  // Arrow should end at left edge of Box B (350 - 8 = 342)
  const dx = arrowEl.points[1][0];
  assert.equal(arrowEl.x + dx, 342);

  // Arrow label should be placed above the line (startY - 24)
  const labelEl = elements.find(e => e.type === 'text' && e.id === 'arrow_ab_label');
  assert.ok(labelEl);
  assert.equal(labelEl.text, 'data flow');
  assert.ok(labelEl.y < arrowEl.y, 'Arrow label must be positioned cleanly above the arrow line');
});

test('Arrow binds accurately to compound vector library symbol without colliding', () => {
  const ops = [
    {
      op: 'box',
      id: 'source_input',
      x: 100,
      y: 200,
      w: 100,
      h: 50,
      label: 'Light + H2O',
    },
    {
      op: 'library_symbol',
      id: 'chloroplast_node',
      symbol: 'chloroplast',
      x: 300,
      y: 180,
      scale: 1.0,
      label: 'Chloroplast',
    },
    {
      op: 'arrow',
      id: 'arr_to_chloro',
      from: 'source_input',
      to: 'chloroplast_node',
      label: 'fuels',
    },
  ];

  const elements = compileDrawOperations(ops);
  const arrow = elements.find(e => e.id === 'arr_to_chloro');
  assert.ok(arrow);
  // Starts outside source_input
  assert.ok(arrow.x >= 200);
  // Ends before chloroplast body
  const dx = arrow.points[1][0];
  assert.ok(arrow.x + dx <= 300);
});

test('searchInternetImage discovers educational images from the open web or encyclopedia', async () => {
  const result = await searchInternetImage('photosynthesis diagram');
  assert.ok(result, 'Should retrieve an image result for photosynthesis');
  assert.ok(result.dataUrl.startsWith('data:image/'), 'Should produce a valid base64 data URL');
  assert.ok(result.width > 0 && result.height > 0, 'Should have positive dimensions');
  assert.ok(result.title, 'Should have a title');
});

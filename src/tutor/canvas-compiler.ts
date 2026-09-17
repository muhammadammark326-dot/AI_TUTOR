import { DrawOperation } from './types.js';
import { LIBRARY_REGISTRY } from './library-registry.js';
import type {
  ExcalidrawElement,
  ExcalidrawRectangleElement,
  ExcalidrawEllipseElement,
  ExcalidrawDiamondElement,
  ExcalidrawTextElement,
  ExcalidrawArrowElement,
  ExcalidrawLineElement,
} from '../types.js';

let seedCounter = 100000;
function nextSeed(): number {
  return (seedCounter = (seedCounter + 12345) % 1000000);
}

function baseElement(id: string, type: any, x: number, y: number, w: number, h: number, options: Partial<ExcalidrawElement> = {}): any {
  return {
    id,
    type,
    x,
    y,
    width: w,
    height: h,
    angle: 0,
    strokeColor: options.strokeColor || '#1e1e1e',
    backgroundColor: options.backgroundColor || 'transparent',
    fillStyle: options.fillStyle || 'solid',
    strokeWidth: options.strokeWidth || 2,
    strokeStyle: options.strokeStyle || 'solid',
    roughness: options.roughness !== undefined ? options.roughness : 1,
    opacity: options.opacity || 100,
    groupIds: options.groupIds || [],
    frameId: null,
    roundness: type === 'rectangle' ? { type: 3 } : null,
    seed: nextSeed(),
    version: 1,
    versionNonce: nextSeed(),
    isDeleted: false,
    locked: false,
    link: null,
    customData: null,
    boundElements: [],
    updated: Date.now(),
  };
}

export interface CompileContext {
  existingElements?: Record<string, any>;
}

export function compileDrawOperations(
  operations: DrawOperation[],
  context: CompileContext = {}
): ExcalidrawElement[] {
  const result: ExcalidrawElement[] = [];
  const elementMap = new Map<string, any>();

  // Seed elementMap with existing elements if available
  if (context.existingElements) {
    for (const [id, el] of Object.entries(context.existingElements)) {
      elementMap.set(id, el);
    }
  }

  for (const op of operations) {
    switch (op.op) {
      case 'box': {
        const box: ExcalidrawRectangleElement = {
          ...baseElement(op.id, 'rectangle', op.x, op.y, op.w, op.h, {
            strokeColor: op.color || '#2b8a3e',
            backgroundColor: op.bgColor || '#ebfbee',
          }),
        };

        if (op.label) {
          const textId = `${op.id}_label`;
          const textEl: ExcalidrawTextElement = {
            ...baseElement(textId, 'text', op.x + 10, op.y + Math.max(5, (op.h - 24) / 2), op.w - 20, 24, {
              strokeColor: op.color || '#2b8a3e',
            }),
            text: op.label,
            fontSize: 16,
            fontFamily: 1,
            textAlign: 'center',
            verticalAlign: 'middle',
            baseline: 16,
            lineHeight: 1.2,
            containerId: op.id,
          };
          box.boundElements = [{ id: textId, type: 'text' }];
          result.push(box);
          result.push(textEl);
          elementMap.set(textId, textEl);
        } else {
          result.push(box);
        }
        elementMap.set(op.id, box);
        break;
      }

      case 'ellipse': {
        const ellipse: ExcalidrawEllipseElement = {
          ...baseElement(op.id, 'ellipse', op.x, op.y, op.w, op.h, {
            strokeColor: op.color || '#1971c2',
            backgroundColor: op.bgColor || '#e7f5ff',
          }),
        };

        if (op.label) {
          const textId = `${op.id}_label`;
          const textEl: ExcalidrawTextElement = {
            ...baseElement(textId, 'text', op.x + 10, op.y + Math.max(5, (op.h - 24) / 2), op.w - 20, 24, {
              strokeColor: op.color || '#1971c2',
            }),
            text: op.label,
            fontSize: 16,
            fontFamily: 1,
            textAlign: 'center',
            verticalAlign: 'middle',
            baseline: 16,
            lineHeight: 1.2,
            containerId: op.id,
          };
          ellipse.boundElements = [{ id: textId, type: 'text' }];
          result.push(ellipse);
          result.push(textEl);
          elementMap.set(textId, textEl);
        } else {
          result.push(ellipse);
        }
        elementMap.set(op.id, ellipse);
        break;
      }

      case 'diamond': {
        const diamond: ExcalidrawDiamondElement = {
          ...baseElement(op.id, 'diamond', op.x, op.y, op.w, op.h, {
            strokeColor: op.color || '#e67700',
            backgroundColor: op.bgColor || '#fff9db',
          }),
        };

        if (op.label) {
          const textId = `${op.id}_label`;
          const textEl: ExcalidrawTextElement = {
            ...baseElement(textId, 'text', op.x + 15, op.y + Math.max(5, (op.h - 24) / 2), op.w - 30, 24, {
              strokeColor: op.color || '#e67700',
            }),
            text: op.label,
            fontSize: 14,
            fontFamily: 1,
            textAlign: 'center',
            verticalAlign: 'middle',
            baseline: 14,
            lineHeight: 1.2,
            containerId: op.id,
          };
          diamond.boundElements = [{ id: textId, type: 'text' }];
          result.push(diamond);
          result.push(textEl);
          elementMap.set(textId, textEl);
        } else {
          result.push(diamond);
        }
        elementMap.set(op.id, diamond);
        break;
      }

      case 'database': {
        const strokeColor = op.color || '#495057';
        const bgColor = op.bgColor || '#f1f3f5';
        const w = op.w || 120;
        const h = op.h || 100;
        const capHeight = Math.min(24, h * 0.25);

        // Cylinder body
        const body: ExcalidrawRectangleElement = {
          ...baseElement(op.id, 'rectangle', op.x, op.y + capHeight / 2, w, h - capHeight / 2, {
            strokeColor,
            backgroundColor: bgColor,
            roundness: { type: 3 },
          }),
        };

        // Top cylinder cap
        const capId = `${op.id}_cap`;
        const cap: ExcalidrawEllipseElement = {
          ...baseElement(capId, 'ellipse', op.x, op.y, w, capHeight, {
            strokeColor,
            backgroundColor: bgColor,
          }),
        };

        result.push(body);
        result.push(cap);

        if (op.label) {
          const textId = `${op.id}_label`;
          const textEl: ExcalidrawTextElement = {
            ...baseElement(textId, 'text', op.x + 5, op.y + capHeight + Math.max(0, (h - capHeight - 24) / 2), w - 10, 24, {
              strokeColor,
            }),
            text: op.label,
            fontSize: 14,
            fontFamily: 1,
            textAlign: 'center',
            verticalAlign: 'middle',
            baseline: 14,
            lineHeight: 1.2,
            containerId: op.id,
          };
          body.boundElements = [{ id: textId, type: 'text' }];
          result.push(textEl);
          elementMap.set(textId, textEl);
        }

        elementMap.set(op.id, body);
        break;
      }

      case 'cloud': {
        const strokeColor = op.color || '#1864ab';
        const bgColor = op.bgColor || '#e7f5ff';
        const w = op.w || 140;
        const h = op.h || 80;
        const cloud: ExcalidrawEllipseElement = {
          ...baseElement(op.id, 'ellipse', op.x, op.y, w, h, {
            strokeColor,
            backgroundColor: bgColor,
            strokeStyle: 'solid',
            roughness: 2,
          }),
        };

        if (op.label) {
          const textId = `${op.id}_label`;
          const textEl: ExcalidrawTextElement = {
            ...baseElement(textId, 'text', op.x + 10, op.y + Math.max(5, (h - 24) / 2), w - 20, 24, {
              strokeColor,
            }),
            text: op.label,
            fontSize: 15,
            fontFamily: 1,
            textAlign: 'center',
            verticalAlign: 'middle',
            baseline: 15,
            lineHeight: 1.2,
            containerId: op.id,
          };
          cloud.boundElements = [{ id: textId, type: 'text' }];
          result.push(cloud);
          result.push(textEl);
          elementMap.set(textId, textEl);
        } else {
          result.push(cloud);
        }
        elementMap.set(op.id, cloud);
        break;
      }

      case 'actor': {
        const strokeColor = op.color || '#2b8a3e';
        const w = op.w || 100;
        const h = op.h || 50;
        const actorBox: ExcalidrawRectangleElement = {
          ...baseElement(op.id, 'rectangle', op.x, op.y, w, h, {
            strokeColor,
            backgroundColor: '#ebfbee',
            roundness: { type: 3 },
          }),
        };

        const labelText = op.label ? `👤 ${op.label}` : '👤 User';
        const textId = `${op.id}_label`;
        const textEl: ExcalidrawTextElement = {
          ...baseElement(textId, 'text', op.x + 8, op.y + Math.max(4, (h - 22) / 2), w - 16, 22, {
            strokeColor,
          }),
          text: labelText,
          fontSize: 14,
          fontFamily: 1,
          textAlign: 'center',
          verticalAlign: 'middle',
          baseline: 14,
          lineHeight: 1.2,
          containerId: op.id,
        };
        actorBox.boundElements = [{ id: textId, type: 'text' }];
        result.push(actorBox);
        result.push(textEl);
        elementMap.set(textId, textEl);
        elementMap.set(op.id, actorBox);
        break;
      }

      case 'queue': {
        const strokeColor = op.color || '#d9480f';
        const bgColor = op.bgColor || '#fff4e6';
        const w = op.w || 140;
        const h = op.h || 50;
        const queueBox: ExcalidrawRectangleElement = {
          ...baseElement(op.id, 'rectangle', op.x, op.y, w, h, {
            strokeColor,
            backgroundColor: bgColor,
            roundness: { type: 2 },
          }),
        };

        // Inner vertical partition dividers
        const segWidth = w / 3;
        const line1Id = `${op.id}_div1`;
        const line2Id = `${op.id}_div2`;
        const div1: ExcalidrawLineElement = {
          ...baseElement(line1Id, 'line', op.x + segWidth, op.y, 0, h, { strokeColor, strokeWidth: 1 }),
          points: [[0, 0], [0, h]],
        };
        const div2: ExcalidrawLineElement = {
          ...baseElement(line2Id, 'line', op.x + segWidth * 2, op.y, 0, h, { strokeColor, strokeWidth: 1 }),
          points: [[0, 0], [0, h]],
        };

        result.push(queueBox);
        result.push(div1);
        result.push(div2);

        if (op.label) {
          const textId = `${op.id}_label`;
          const textEl: ExcalidrawTextElement = {
            ...baseElement(textId, 'text', op.x, op.y + h + 4, Math.max(w, 80), 20, {
              strokeColor,
            }),
            text: op.label,
            fontSize: 13,
            fontFamily: 1,
            textAlign: 'center',
            verticalAlign: 'top',
            baseline: 13,
            lineHeight: 1.2,
          };
          result.push(textEl);
        }

        elementMap.set(op.id, queueBox);
        break;
      }

      case 'container': {
        const strokeColor = op.color || '#868e96';
        const bgColor = op.bgColor || '#f8f9fa';
        const w = op.w || 300;
        const h = op.h || 200;

        // Background boundary box with dashed border
        const containerBox: ExcalidrawRectangleElement = {
          ...baseElement(op.id, 'rectangle', op.x, op.y, w, h, {
            strokeColor,
            backgroundColor: bgColor,
            strokeStyle: 'dashed',
            strokeWidth: 1.5,
            opacity: 90,
          }),
        };
        result.push(containerBox);

        // Top-left anchor label (avoids center overlap anti-pattern)
        if (op.label) {
          const textId = `${op.id}_badge`;
          const textEl: ExcalidrawTextElement = {
            ...baseElement(textId, 'text', op.x + 12, op.y + 10, Math.max(80, op.label.length * 9), 20, {
              strokeColor: op.color || '#495057',
            }),
            text: `[ ${op.label} ]`,
            fontSize: 14,
            fontFamily: 1,
            textAlign: 'left',
            verticalAlign: 'top',
            baseline: 14,
            lineHeight: 1.2,
          };
          result.push(textEl);
        }

        elementMap.set(op.id, containerBox);
        break;
      }

      case 'note': {
        const strokeColor = op.color || '#e67700';
        const bgColor = op.bgColor || '#fff9db';
        const noteW = op.w || 160;
        const noteH = op.h || 90;
        const noteText = op.text || (op as any).label || '';

        const noteBox: ExcalidrawRectangleElement = {
          ...baseElement(op.id, 'rectangle', op.x, op.y, noteW, noteH, {
            strokeColor,
            backgroundColor: bgColor,
            fillStyle: 'solid',
            roughness: 1,
            roundness: { type: 2 },
          }),
        };

        const textId = `${op.id}_text`;
        const textEl: ExcalidrawTextElement = {
          ...baseElement(textId, 'text', op.x + 10, op.y + 10, noteW - 20, noteH - 20, {
            strokeColor: '#2b2b2b',
          }),
          text: noteText,
          fontSize: 14,
          fontFamily: 1,
          textAlign: 'left',
          verticalAlign: 'top',
          baseline: 14,
          lineHeight: 1.3,
          containerId: op.id,
        };
        noteBox.boundElements = [{ id: textId, type: 'text' }];
        result.push(noteBox);
        result.push(textEl);
        elementMap.set(textId, textEl);
        elementMap.set(op.id, noteBox);
        break;
      }

      case 'mermaid': {
        // A placeholder container for the mermaid diagram area
        const posX = op.x || 100;
        const posY = op.y || 100;
        const rawSyntax = op.syntax || (op as any).code || '';
        const mermaidBox: ExcalidrawRectangleElement = {
          ...baseElement(op.id, 'rectangle', posX, posY, 400, 200, {
            strokeColor: '#495057',
            backgroundColor: '#f8f9fa',
            strokeStyle: 'dashed',
          }),
        };
        const textId = `${op.id}_txt`;
        const textEl: ExcalidrawTextElement = {
          ...baseElement(textId, 'text', posX + 15, posY + 15, 370, 170, {
            strokeColor: '#343a40',
          }),
          text: rawSyntax.length > 80 ? `${rawSyntax.slice(0, 80)}...` : rawSyntax,
          fontSize: 13,
          fontFamily: 2,
          textAlign: 'left',
          verticalAlign: 'top',
          baseline: 13,
          lineHeight: 1.2,
          containerId: op.id,
        };
        mermaidBox.boundElements = [{ id: textId, type: 'text' }];
        result.push(mermaidBox);
        result.push(textEl);
        elementMap.set(textId, textEl);
        elementMap.set(op.id, mermaidBox);
        break;
      }


      case 'text': {
        const fontSize = op.fontSize || 18;
        const textVal = op.text || op.label || op.content || '';
        const textEl: ExcalidrawTextElement = {
          ...baseElement(op.id, 'text', op.x, op.y, Math.max(80, textVal.length * 10), fontSize * 1.5, {
            strokeColor: op.color || '#1e1e1e',
          }),
          text: textVal,
          fontSize,
          fontFamily: 1,
          textAlign: 'left',
          verticalAlign: 'top',
          baseline: fontSize,
          lineHeight: 1.2,
        };
        result.push(textEl);
        elementMap.set(op.id, textEl);
        break;
      }

      case 'line': {
        const dx = op.to.x - op.from.x;
        const dy = op.to.y - op.from.y;
        const line: ExcalidrawLineElement = {
          ...baseElement(op.id, 'line', op.from.x, op.from.y, Math.abs(dx), Math.abs(dy), {
            strokeColor: op.color || '#495057',
          }),
          points: [[0, 0], [dx, dy]],
        };
        result.push(line);
        elementMap.set(op.id, line);
        break;
      }

      case 'arrow': {
        let startX = 100;
        let startY = 100;
        let endX = 250;
        let endY = 100;

        const fromEl = elementMap.get(op.from);
        const toEl = elementMap.get(op.to);

        if (fromEl && toEl) {
          const fromW = fromEl.width || 120;
          const fromH = fromEl.height || 60;
          const toW = toEl.width || 120;
          const toH = toEl.height || 60;

          const fromCenterX = fromEl.x + fromW / 2;
          const fromCenterY = fromEl.y + fromH / 2;
          const toCenterX = toEl.x + toW / 2;
          const toCenterY = toEl.y + toH / 2;

          const diffX = toCenterX - fromCenterX;
          const diffY = toCenterY - fromCenterY;

          // Connect from edge to edge based on principal direction
          if (Math.abs(diffX) >= Math.abs(diffY)) {
            // Predominantly horizontal flow
            if (diffX > 0) {
              // Pointing RIGHT
              startX = fromEl.x + fromW + 8;
              startY = fromCenterY;
              endX = toEl.x - 8;
              endY = toCenterY;
            } else {
              // Pointing LEFT
              startX = fromEl.x - 8;
              startY = fromCenterY;
              endX = toEl.x + toW + 8;
              endY = toCenterY;
            }
          } else {
            // Predominantly vertical flow
            if (diffY > 0) {
              // Pointing DOWN
              startX = fromCenterX;
              startY = fromEl.y + fromH + 8;
              endX = toCenterX;
              endY = toEl.y - 8;
            } else {
              // Pointing UP
              startX = fromCenterX;
              startY = fromEl.y - 8;
              endX = toCenterX;
              endY = toEl.y + toH + 8;
            }
          }
        } else if (fromEl) {
          startX = fromEl.x + (fromEl.width || 100) + 8;
          startY = fromEl.y + (fromEl.height || 60) / 2;
          endX = startX + 120;
          endY = startY;
        } else if (toEl) {
          endX = toEl.x - 8;
          endY = toEl.y + (toEl.height || 60) / 2;
          startX = endX - 120;
          startY = endY;
        }

        const dx = endX - startX;
        const dy = endY - startY;

        const arrow: ExcalidrawArrowElement = {
          ...baseElement(op.id, 'arrow', startX, startY, Math.abs(dx), Math.abs(dy), {
            strokeColor: op.color || '#228be6',
            strokeWidth: 2,
          }),
          points: [[0, 0], [dx, dy]],
          endArrowhead: 'arrow',
          startBinding: fromEl ? { elementId: fromEl.id, focus: 0, gap: 8 } : null,
          endBinding: toEl ? { elementId: toEl.id, focus: 0, gap: 8 } : null,
        };

        if (fromEl) {
          fromEl.boundElements = [...(fromEl.boundElements || []), { id: op.id, type: 'arrow' }];
        }
        if (toEl) {
          toEl.boundElements = [...(toEl.boundElements || []), { id: op.id, type: 'arrow' }];
        }

        if (op.label) {
          const textId = `${op.id}_label`;
          const textLen = op.label.length;
          const textW = Math.max(60, Math.min(220, textLen * 8.5 + 16));
          // For horizontal arrows, center horizontally and place 24px ABOVE arrow
          // For vertical arrows, place 14px to the RIGHT of the vertical arrow shaft
          const isHoriz = Math.abs(dx) >= Math.abs(dy);
          const midX = isHoriz ? (startX + dx / 2 - textW / 2) : (startX + 14);
          const midY = isHoriz ? (startY + dy / 2 - 24) : (startY + dy / 2 - 10);

          const textEl: ExcalidrawTextElement = {
            ...baseElement(textId, 'text', midX, midY, textW, 20, {
              strokeColor: op.color || '#1c7ed6',
            }),
            text: op.label,
            fontSize: 13,
            fontFamily: 1,
            textAlign: isHoriz ? 'center' : 'left',
            verticalAlign: 'middle',
            baseline: 13,
            lineHeight: 1.2,
          };
          result.push(arrow);
          result.push(textEl);
          elementMap.set(textId, textEl);
        } else {
          result.push(arrow);
        }
        elementMap.set(op.id, arrow);
        break;
      }

      case 'group': {
        const groupId = op.id || `group_${Date.now()}`;
        for (const childId of op.children) {
          const el = elementMap.get(childId);
          if (el) {
            el.groupIds = [...(el.groupIds || []), groupId];
          }
        }
        break;
      }

      case 'delete': {
        const el = elementMap.get(op.id);
        if (el) {
          el.isDeleted = true;
          result.push(el);
        } else {
          // Push dummy deleted element so canvas server clears it
          result.push({
            id: op.id,
            type: 'rectangle',
            x: 0,
            y: 0,
            isDeleted: true,
          } as any);
        }
        break;
      }

      case 'clear_region': {
        const { x, y, w, h } = op.region;
        for (const el of elementMap.values()) {
          const elW = el.width || 0;
          const elH = el.height || 0;
          const overlaps = (
            el.x < x + w &&
            el.x + elW > x &&
            el.y < y + h &&
            el.y + elH > y
          );
          if (overlaps) {
            el.isDeleted = true;
            result.push(el);
          }
        }
        break;
      }

      case 'image': {
        const imgW = op.w || 400;
        const imgH = op.h || 300;
        const imgEl: any = {
          ...baseElement(op.id, 'image', op.x, op.y, imgW, imgH),
          fileId: op.fileId,
          status: 'saved',
          scale: [1, 1],
        };
        result.push(imgEl);
        elementMap.set(op.id, imgEl);
        break;
      }

      case 'library_symbol': {
        const symKey = op.symbol.toLowerCase();
        const symbolDef = LIBRARY_REGISTRY[symKey];
        if (symbolDef) {
          const symElements = symbolDef.generateElements(op.x, op.y, op.scale || 1.0, op.label);
          for (const el of symElements) {
            result.push(el);
            elementMap.set(el.id, el);
          }
          // Register op.id to the primary shape so arrows can bind cleanly to this symbol
          if (symElements.length > 0 && op.id) {
            elementMap.set(op.id, symElements[0]);
          }
        } else {
          const fallbackBox: ExcalidrawRectangleElement = {
            ...baseElement(op.id, 'rectangle', op.x, op.y, 160, 70, {
              strokeColor: '#495057',
              backgroundColor: '#f1f3f5',
            }),
          };
          result.push(fallbackBox);
          elementMap.set(op.id, fallbackBox);
        }
        break;
      }
    }
  }

  return result;
}

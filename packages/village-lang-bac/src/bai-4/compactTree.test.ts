import { describe, expect, it } from 'vitest';
import { compactTree } from './compactTree';

describe('compact lesson tree', () => {
  for (const width of [248, 280, 320, 440, 600, 872]) {
    it(`fits all nodes and touch targets in ${width}px`, () => {
      const layout = compactTree(width, [Array(8), Array(4), Array(2), Array(1)].map(a => a.fill(null)));
      const nodes = layout.nodes.flat();
      expect(nodes).toHaveLength(15);
      for (const n of nodes) {
        expect(n.width).toBeGreaterThanOrEqual(44);
        expect(n.height).toBeGreaterThanOrEqual(44);
        expect(n.x - n.width / 2).toBeGreaterThanOrEqual(0);
        expect(n.x + n.width / 2).toBeLessThanOrEqual(width);
        expect(n.y - n.height / 2).toBeGreaterThanOrEqual(0);
        expect(n.y + n.height / 2).toBeLessThanOrEqual(layout.height);
      }
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        expect(Math.abs(a.x - b.x) >= (a.width + b.width) / 2 || Math.abs(a.y - b.y) >= (a.height + b.height) / 2).toBe(true);
      }
    });
  }
});

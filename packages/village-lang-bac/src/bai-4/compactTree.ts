/** Fit all eight leaves without shrinking text or the 44px touch targets.
 * Narrow boards stagger adjacent leaves vertically; logical indices stay unchanged. */
export function compactTree(width: number, levels: readonly (readonly unknown[])[]) {
  const w = Math.max(240, width);
  const narrow = w < 440;
  const height = narrow ? 300 : 260;
  const nodes = levels.map((row, level) => row.map((_, index) => {
    const leaf = level === 0;
    const nodeWidth = leaf ? Math.min(64, narrow ? 44 : w / row.length - 4) : Math.min(96, w / row.length - 8);
    return {
      x: leaf && narrow ? 22 + index * (w - 44) / (row.length - 1) : (index + 0.5) * w / row.length,
      y: narrow ? (leaf ? 220 + (index % 2) * 52 : 156 - (level - 1) * 66) : height - 36 - level * (height - 72) / (levels.length - 1),
      width: nodeWidth,
      height: 44,
    };
  }));
  return { width: w, height, nodes };
}

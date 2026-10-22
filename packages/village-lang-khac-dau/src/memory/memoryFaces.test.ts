import { describe, expect, it } from 'vitest';
import { memoryUi } from '@so-chung/core';
import { publicKey } from '@so-chung/core/lessons/bai-3/logic';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { ATLAS_COLS, ATLAS_ROWS, BACK_CELL, FACE_COUNT, atlasCell, faceIndex, faceOf, fitFaceText, wrapWords } from './memoryFaces';
import { makeDeck } from './memoryLogic';

describe('mặt thẻ màn 8', () => {
  it('24 mặt và mặt sau vừa atlas 5 × 5; mỗi thẻ trỏ đúng mặt có cùng loại và cùng số', () => {
    expect(FACE_COUNT).toBe(24);
    expect(ATLAS_COLS * ATLAS_ROWS).toBeGreaterThanOrEqual(25);
    expect(BACK_CELL).toBe(24);
    for (let seed = 1; seed <= 30; seed++) {
      for (const c of makeDeck(createMulberry32(seed), 8)) {
        const f = faceOf(faceIndex(c));
        expect(f.type).toBe(c.type);
        expect(f.value).toBe(c.value);
      }
    }
  });

  it('mặt thẻ chỉ ghi nhãn và số: "Khuôn tập" + x hoặc "Mẫu công khai" + 5^x mod 23', () => {
    for (let f = 0; f < FACE_COUNT; f++) {
      const face = faceOf(f);
      expect(face.label).toBe(face.type === 'khuon' ? memoryUi.nhanKhuon : memoryUi.nhanMau);
      if (face.type === 'mau') expect(face.value).toBe(publicKey(faceOf(f - 12).value));
    }
  });

  it('ô atlas không chồng nhau và nằm trong [0, 1]', () => {
    const seen = new Set<string>();
    for (let f = 0; f <= BACK_CELL; f++) {
      const c = atlasCell(f);
      expect(c.offsetX).toBeGreaterThanOrEqual(0);
      expect(c.offsetY).toBeGreaterThanOrEqual(0);
      expect(c.offsetX + c.repeatX).toBeLessThanOrEqual(1 + 1e-9);
      expect(c.offsetY + c.repeatY).toBeLessThanOrEqual(1 + 1e-9);
      seen.add(`${c.offsetX.toFixed(4)},${c.offsetY.toFixed(4)}`);
    }
    expect(seen.size).toBe(25);
    // Mặt 0 ở góc trên trái của canvas (v lớn nhất)
    expect(atlasCell(0)).toEqual({ offsetX: 0, offsetY: 0.8, repeatX: 0.2, repeatY: 0.2 });
  });

  it('cỡ chữ vừa khung giấy: nhãn tối đa 2 dòng, thu nhỏ khi cần nhưng không dưới cỡ nhỏ nhất', () => {
    // Đo giả: mỗi ký tự rộng 0,55 lần cỡ chữ
    const m = (s: string, px: number) => s.length * px * 0.55;
    const roomy = fitFaceText('Mẫu công khai', 120, 100, 16, 30, 14, m);
    expect(roomy.label).toBe(16);
    expect(roomy.lines).toEqual(['Mẫu công khai']);
    expect(roomy.number).toBe(30);
    // Hẹp: 16 px phải ngắt 3 dòng, thu về cỡ cho 2 dòng
    const tight = fitFaceText('Mẫu công khai', 66, 70, 16.1, 24, 14, m);
    expect(tight.lines.length).toBeLessThanOrEqual(2);
    expect(tight.label).toBeGreaterThanOrEqual(14);
    expect(tight.label).toBeLessThan(16.1);
    expect(tight.height).toBeLessThanOrEqual(70);
    expect(tight.number).toBeGreaterThanOrEqual(tight.label);
    // Không vừa nổi: dừng ở cỡ nhỏ nhất, không nhỏ hơn
    expect(fitFaceText('Mẫu công khai', 20, 20, 16, 24, 14, m).label).toBe(14);
  });

  it('ngắt dòng theo từ cho vừa bề rộng', () => {
    const m = (s: string) => s.length * 10;
    expect(wrapWords('Mẫu công khai', 200, m)).toEqual(['Mẫu công khai']);
    expect(wrapWords('Mẫu công khai', 80, m)).toEqual(['Mẫu công', 'khai']);
    expect(wrapWords('Khuôn tập', 30, m)).toEqual(['Khuôn', 'tập']);
    expect(wrapWords('', 30, m)).toEqual([]);
  });
});

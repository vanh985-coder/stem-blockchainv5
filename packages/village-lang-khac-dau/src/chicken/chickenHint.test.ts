import { describe, expect, it } from 'vitest';
import { chickenUi, fmt, hintText, plainPower } from '@so-chung/core';
import { publicKey } from '@so-chung/core/lessons/bai-3/logic';
import { CHICKEN_SPEC } from './chickenConfig';
import { hintFor } from './chickenHint';
import { createChickenGame, dropLabel, phaseOf, startWave, stepChicken, type ChickenState } from './chickenLogic';

const KEYS = [...new Set(CHICKEN_SPEC.rounds.flatMap((r) => r.keys))];
const PUBLICS = KEYS.map((k) => publicKey(k));

/** Nạp đúng hết nhãn của đợt đang mở */
function loadAll(s: ChickenState): void {
  const keys = s.spec.rounds[s.round].keys;
  keys.forEach((k, i) => {
    const l = s.loads[s.round].labels.find((x) => x.kind === 'dung' && x.value === publicKey(k))!;
    dropLabel(s, l.id, i);
  });
}

describe('chickenHint: câu nhắc của nút "?" chỉ trả khóa, theo trạng thái ván', () => {
  it('nạp đạn: đợt chưa đủ nhãn thì nhắc cách nạp, đủ nhãn thì nhắc bấm bắt đầu', () => {
    const s = createChickenGame(1);
    expect(hintFor(s)).toEqual(['napDan']);
    loadAll(s);
    expect(hintFor(s)).toEqual(['napXong']);
  });

  it('đợt gà: chưa có gà thì "choGa", có gà thì "dotGa"; còn một tim thì "motTim"', () => {
    const s = createChickenGame(2);
    loadAll(s);
    startWave(s);
    expect(hintFor(s)).toEqual(['choGa']);
    stepChicken(s, 2);
    expect(s.chickens.length).toBeGreaterThan(0);
    expect(hintFor(s)).toEqual(['dotGa']);
    s.hearts = 1;
    expect(hintFor(s)).toEqual(['motTim']);
    s.chickens = [];
    expect(hintFor(s)).toEqual(['motTim']);
  });

  it('gà trùm: "trum", kèm "motTim" khi chỉ còn một tim; hết ván: "hetVan"', () => {
    const s = createChickenGame(3);
    s.phase = 'boss';
    expect(hintFor(s)).toEqual(['trum']);
    s.hearts = 1;
    expect(hintFor(s)).toEqual(['trum', 'motTim']);
    s.phase = 'ended';
    expect(phaseOf(s)).toBe('ended');
    expect(hintFor(s)).toEqual(['hetVan']);
  });

  it('mọi khóa đều có câu trong huongDanGame (màn 9), câu ngắn, có kết quả không rỗng', () => {
    const all = ['napDan', 'napXong', 'dotGa', 'choGa', 'trum', 'motTim', 'hetVan'];
    for (const k of all) {
      const t = hintText(9, [k]);
      expect(t.length, k).toBeGreaterThan(10);
      expect(t.length, k).toBeLessThan(200);
      expect(t.split(/(?<=[.!?])\s+/).length, k).toBeLessThanOrEqual(3);
    }
    expect(hintText(9, ['trum', 'motTim'])).toContain('3 lần');
    expect(hintText(9, ['napDan'])).toContain('{congThuc}');
  });

  it('KHÔNG lộ đáp án: không nói thuốc nào chữa thẻ nào, không có số khuôn hay mẫu công khai cụ thể; công thức chỉ là 5^^x^^ mod 23', () => {
    for (const k of ['napDan', 'napXong', 'dotGa', 'choGa', 'trum', 'motTim', 'hetVan']) {
      const plain = fmt(hintText(9, [k])).replace(/5\^\^x\^\^ mod 23/g, '');
      expect(plain, k).not.toMatch(/Thuốc\s*\d/);
      for (const n of [...KEYS, ...PUBLICS]) {
        // chỉ số "3" của "3 lần" (số lần chữa gà trùm) là luật, không phải khuôn của lọ nào
        const re = new RegExp(`(?<![\\d^])${n}(?![\\d^])(?! lần)`);
        expect(plain, `${k}: ${n}`).not.toMatch(re);
      }
    }
  });

  it('chữ ở màn nạp đạn: "Chưa đúng" có số mũ nhỏ 5^^x^^, không nói số nào', () => {
    expect(chickenUi.napSai).toContain('5^^x^^ mod 23');
    expect(plainPower(fmt(chickenUi.napSai))).toContain('mod 23');
    expect(chickenUi.napSai.replace('5^^x^^ mod 23', '')).not.toMatch(/\d/);
  });
});

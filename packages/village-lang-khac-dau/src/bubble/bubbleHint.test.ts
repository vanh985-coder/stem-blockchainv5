import { gameGuide, hintText } from '@so-chung/core';
import { describe, expect, it } from 'vitest';
import { hintFor } from './bubbleHint';
import { createBubbleGame, pickTrayEgg, planOf, presentValues, selectType, startRound, type BubbleState } from './bubbleLogic';

function loaded(seed = 1): BubbleState {
  const s = createBubbleGame(seed);
  for (const e of planOf(s).tray) if (e.kind === 'dung') pickTrayEgg(s, e.id);
  return s;
}

describe('bubbleHint: nút "?" chỉ trả khóa và không lộ đáp án', () => {
  it('nạp trứng: chưa đủ thì napDan, đủ rồi thì napXong', () => {
    const s = createBubbleGame(1);
    expect(hintFor(s)).toEqual(['napDan']);
    pickTrayEgg(s, planOf(s).tray.find((e) => e.kind === 'dung')!.id);
    expect(hintFor(s)).toEqual(['napDan']);
    expect(hintFor(loaded())).toEqual(['napXong']);
  });

  it('chơi: chưa chọn loại trứng thì chuaChon, chọn rồi thì ngamBan; một tim thì motTim; sắp hạ bàn thì sapHa; hết ván thì hetVan', () => {
    const s = loaded(2);
    startRound(s);
    expect(hintFor(s)).toEqual(['chuaChon']);
    selectType(s, planOf(s).values.findIndex((v) => presentValues(s).has(v)));
    expect(hintFor(s)).toEqual(['ngamBan']);
    s.shotsSinceDescent = s.spec.rounds[0].descendEvery - 2;
    expect(hintFor(s)).toEqual(['sapHa']);
    s.hearts = 1;
    expect(hintFor(s)).toEqual(['motTim']);
    s.phase = 'ended';
    expect(hintFor(s)).toEqual(['hetVan']);
  });

  it('mọi khóa trả ra đều có câu trong huongDanGame.ts, và câu không nhắc số cụ thể nào của ván', () => {
    const s = loaded(3);
    const keys = new Set<string>();
    for (const phase of ['load', 'play', 'ended'] as const) {
      for (const sel of [null, 0]) {
        for (const hearts of [3, 1]) {
          for (const left of [8, 1]) {
            const t = loaded(3);
            if (phase !== 'load') startRound(t);
            t.phase = phase;
            t.selected = sel;
            t.hearts = hearts;
            t.shotsSinceDescent = t.spec.rounds[0].descendEvery - left;
            for (const k of hintFor(t)) keys.add(k);
          }
        }
      }
    }
    const nhac = gameGuide(9)!.nhac as Record<string, string>;
    for (const k of keys) expect(nhac[k], k).toBeTruthy();
    const plan = planOf(s);
    const text = [...keys].map((k) => hintText(9, [k])).join(' ');
    for (const n of [...plan.values, ...plan.keys]) expect(text, `số ${n}`).not.toMatch(new RegExp(`(^|[^0-9])${n}([^0-9]|$)`));
  });
});

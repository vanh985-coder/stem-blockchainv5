import { describe, expect, it } from 'vitest';
import { Man11Engine } from './man11Engine';
import { viewMismatch, type Mark } from './man11Anim';
import { advanceRound, createMatch3Game, legalMoves, swapCells } from './match3Logic';

/** Tìm một ván và một nước đi làm lấp ô cây. */
function slotMove(): { seed: number; apply: (e: Man11Engine) => ReturnType<typeof swapCells> } {
  for (let seed = 1; seed <= 200; seed++) {
    const probe = createMatch3Game(seed);
    for (const m of legalMoves(probe.board)) {
      const s = createMatch3Game(seed);
      const r = swapCells(s, m.a, m.b);
      if (r.ok && r.events.some((e) => e.type === 'slotFilled')) return { seed, apply: () => r };
    }
  }
  throw new Error('no slot-filling opening move in 200 seeds');
}

const run = (e: Man11Engine, paused = false, dt = 16): { marks: Mark[]; frames: number } => {
  const marks: Mark[] = [];
  let frames = 0;
  while (e.playing && frames++ < 100000) e.update(dt, paused, (m) => marks.push(m));
  return { marks, frames };
};

describe('man11Engine: phát dòng thời gian', () => {
  it('cây chỉ đổi khi lá bay tới nơi (mốc slot), không đổi ngay khi logic đã lấp ô', () => {
    const { seed } = slotMove();
    const s = createMatch3Game(seed);
    let r: ReturnType<typeof swapCells> | null = null;
    for (const m of legalMoves(s.board)) {
      const probe = createMatch3Game(seed);
      const pr = swapCells(probe, m.a, m.b);
      if (pr.ok && pr.events.some((x) => x.type === 'slotFilled')) {
        r = swapCells(s, m.a, m.b);
        break;
      }
    }
    expect(r?.ok).toBe(true);
    const e = new Man11Engine(createMatch3Game(seed).board, 4);
    const tl = e.playEvents(r!.events, false);
    expect(s.slots.some((x) => x.filled)).toBe(true); // logic đã lấp
    expect(e.filled.some(Boolean)).toBe(false); // cây chưa hiện
    const land = tl.marks.find((m) => m.type === 'slot')!;
    let seen = false;
    while (e.playing) {
      e.update(16, false, (m) => {
        if (m.type === 'slot') seen = true;
      });
      if (e.clock < land.t - 16) expect(e.filled.some(Boolean)).toBe(false);
    }
    expect(seen).toBe(true);
    expect(e.filled[land.slot!]).toBe(true);
    expect(viewMismatch(e.view, s.board)).toBeNull();
  });

  it('tạm dừng thật: đồng hồ, mốc và cây đứng yên; hết tạm dừng thì chạy tiếp tới cuối', () => {
    const s = createMatch3Game(4);
    const e = new Man11Engine(s.board, 4);
    const m = legalMoves(s.board)[0];
    const r = swapCells(s, m.a, m.b);
    e.playEvents(r.events, false);
    e.update(50, false);
    const clock = e.clock;
    const now = e.now;
    const marks: Mark[] = [];
    for (let i = 0; i < 1000; i++) e.update(16, true, (x) => marks.push(x));
    expect(e.clock).toBe(clock);
    expect(e.now).toBe(now);
    expect(marks).toEqual([]);
    expect(e.playing).toBe(true);
    const after = run(e);
    expect(after.marks.length).toBeGreaterThan(0);
    expect(e.playing).toBe(false);
    expect(viewMismatch(e.view, s.board)).toBeNull();
  });

  it('phát đủ mốc theo thứ tự thời gian và xong ở đúng khung hình; bàn hiển thị khớp logic sau từng nước đi (60 nước ngẫu nhiên)', () => {
    const s = createMatch3Game(11);
    const e = new Man11Engine(s.board, 4);
    for (let i = 0; i < 60 && s.phase !== 'ended'; i++) {
      if (s.phase === 'roundEnd') {
        advanceRound(s);
        e.startRound(s.board, s.slots.length);
        continue;
      }
      const moves = legalMoves(s.board);
      const m = moves[i % moves.length];
      const r = swapCells(s, m.a, m.b);
      const tl = e.playEvents(r.events, i % 2 === 0);
      const { marks } = run(e, false, 20);
      expect(marks).toHaveLength(tl.marks.length);
      for (let k = 1; k < marks.length; k++) expect(marks[k].t).toBeGreaterThanOrEqual(marks[k - 1].t);
      expect(viewMismatch(e.view, s.board), `nước ${i}`).toBeNull();
      expect(e.trackOf.every((t) => t === null)).toBe(true);
    }
  });

  it('cành và gốc hiện khi đủ: đủ mọi ô thì có cành gộp và gốc sáng; vòng mới thì cây trống', () => {
    const s = createMatch3Game(1);
    const e = new Man11Engine(s.board, 4);
    e.playEvents(
      [
        { type: 'slotFilled', slot: 0, leaf: 0, from: [0, 0] },
        { type: 'slotFilled', slot: 1, leaf: 1, from: [0, 1] },
        { type: 'branchMerged', level: 1, index: 0, root: false },
        { type: 'slotFilled', slot: 2, leaf: 2, from: [0, 2] },
        { type: 'slotFilled', slot: 3, leaf: 3, from: [0, 3] },
        { type: 'branchMerged', level: 1, index: 1, root: false },
        { type: 'branchMerged', level: 2, index: 0, root: true },
        { type: 'treeDone' },
      ],
      false,
    );
    run(e);
    expect(e.filled).toEqual([true, true, true, true]);
    expect(e.merged).toEqual([[true, true], [true]]);
    expect(e.treeAt).toBeGreaterThanOrEqual(0);
    expect(e.slotAt.every((t) => t >= 0)).toBe(true);
    e.startRound(s.board, 8);
    expect(e.filled).toEqual(new Array(8).fill(false));
    expect(e.merged).toEqual([new Array(4).fill(false), new Array(2).fill(false), [false]]);
    expect(e.treeAt).toBe(-1);
    expect(e.count).toBe(8);
  });

  it('thao tác mới khi hoạt cảnh cũ chưa xong: hoạt cảnh cũ được xong nốt (mốc vẫn phát), không mất cây', () => {
    const s = createMatch3Game(2);
    const e = new Man11Engine(s.board, 4);
    const m = legalMoves(s.board)[0];
    const r1 = swapCells(s, m.a, m.b);
    e.playEvents(r1.events, false);
    e.update(30, false);
    const seen: Mark[] = [];
    const m2 = legalMoves(s.board)[0];
    const r2 = swapCells(s, m2.a, m2.b);
    e.playEvents(r2.events, false, (x) => seen.push(x));
    expect(seen.length).toBeGreaterThan(0); // mốc còn lại của lần trước phát ngay
    run(e);
    expect(viewMismatch(e.view, s.board)).toBeNull();
  });
});

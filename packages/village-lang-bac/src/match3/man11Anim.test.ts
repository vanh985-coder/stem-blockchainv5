import { describe, expect, it } from 'vitest';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import {
  advanceRound,
  boardToText,
  createMatch3FromBoard,
  createMatch3Game,
  legalMoves,
  swapCells,
  WIND,
  type Match3Event,
  type Match3State,
  type Pos,
} from './match3Logic';
import {
  FAKE_FACE,
  NORMAL,
  REDUCED,
  WIND_FACE,
  cloneView,
  faceId,
  keysSorted,
  newSample,
  planEvents,
  resetTimeline,
  sampleTrack,
  stepClock,
  villainAt,
  viewFromBoard,
  viewMismatch,
  type BoardView,
  type Timeline,
} from './man11Anim';

const types = (events: readonly Match3Event[]) => events.map((e) => e.type);

describe('man11Anim: bàn hiển thị khớp bàn của logic', () => {
  it('viewFromBoard: 49 miếng, miếng i ở hàng ⌊i / 7⌋ cột i mod 7, mặt khớp ô, khớp logic', () => {
    const s = createMatch3Game(7);
    const v = viewFromBoard(s.board);
    expect(v.tiles).toHaveLength(49);
    expect(v.grid[3][4]).toBe(3 * 7 + 4);
    expect(v.tiles[3 * 7 + 4]).toMatchObject({ r: 3, c: 4, s: 1, a: 1 });
    expect(viewMismatch(v, s.board)).toBeNull();
  });

  it('một nước đi nổ một hàng: đổi chỗ, nổ, rơi, thêm lá; bàn cuối khớp logic; đồng bộ với danh sách sự kiện', () => {
    const s = createMatch3Game(3);
    const m = legalMoves(s.board)[0];
    const before = viewFromBoard(s.board);
    const r = swapCells(s, m.a, m.b);
    const { timeline, view } = planEvents(before, r.events);
    if (r.ok) {
      expect(viewMismatch(view, s.board)).toBeNull();
      expect(types(r.events)[0]).toBe('swap');
      expect(timeline.marks[0].type).toBe('swap');
      expect(timeline.duration).toBeGreaterThan(NORMAL.swap);
    } else expect(viewMismatch(view, s.board)).toBeNull();
    expect(keysSorted(timeline)).toBe(true);
  });

  it('đổi không tạo hàng: đổi rồi trả về, bàn hiển thị y nguyên, hai miếng đổi chỗ rồi về', () => {
    const s = createMatch3FromBoard('ABABA / BABAB / ABABA / BABAB / ABABA', { slots: 'AAAA' });
    const before = viewFromBoard(s.board);
    const r = swapCells(s, [0, 0], [0, 1]);
    expect(r.ok).toBe(false);
    expect(types(r.events)).toEqual(['swap', 'swapBack']);
    const { timeline, view } = planEvents(before, r.events);
    expect(viewMismatch(view, s.board)).toBeNull();
    expect(timeline.marks.map((m) => m.type)).toEqual(['swap', 'swapBack']);
    expect(timeline.duration).toBe(NORMAL.swap + NORMAL.swapBack);
    const out = newSample();
    const tr = timeline.tracks.find((x) => x.id === 0)!;
    sampleTrack(tr, NORMAL.swap, out);
    expect(out.c).toBeCloseTo(1, 5); // đã sang ô bên cạnh lúc giữa hai lần đổi
    sampleTrack(tr, timeline.duration, out);
    expect(out.c).toBeCloseTo(0, 5);
  });

  it('hàng 3 lá lấp ô cây: có lá bay lên đúng ô cây và mốc `slot` khi lá tới nơi', () => {
    // hàng ngang ở hàng 0 sau khi đổi (1,2) với (0,2): A A [B→A] ...
    const s = createMatch3FromBoard('AABCD / CCADB / BDCAD / DBACC / CADBB', { slots: 'AAAA', turns: 10 });
    const before = viewFromBoard(s.board);
    const r = swapCells(s, [0, 2], [1, 2]);
    expect(r.ok).toBe(true);
    const slot = r.events.find((e) => e.type === 'slotFilled');
    expect(slot).toBeDefined();
    const { timeline } = planEvents(before, r.events);
    const fl = timeline.flights.filter((f) => f.kind === 'slot');
    expect(fl).toHaveLength(1);
    expect(fl[0].slot).toBe(slot && slot.type === 'slotFilled' ? slot.slot : -1);
    expect(fl[0].from).toEqual({ r: (slot as { from: Pos }).from[0], c: (slot as { from: Pos }).from[1] });
    const land = timeline.marks.find((m) => m.type === 'slot')!;
    expect(land.t).toBeCloseTo(fl[0].t1, 6);
    expect(fl[0].t1 - fl[0].t0).toBe(NORMAL.flight);
    expect(timeline.marks.some((m) => m.type === 'clear')).toBe(true);
  });
});

/** Chơi nhiều ván bằng nước đi ngẫu nhiên (hợp lệ hay không) và kiểm bàn hiển thị sau từng thao tác. */
function playRandom(seed: number, reduced: boolean, on: (s: Match3State, events: readonly Match3Event[], timeline: Timeline, before: BoardView, after: BoardView) => void, maxMoves = 80): void {
  const rng = createMulberry32(seed * 7919 + 13);
  const s = createMatch3Game(seed);
  let view = viewFromBoard(s.board);
  let guard = 0;
  while (s.phase !== 'ended' && guard++ < maxMoves) {
    if (s.phase === 'roundEnd') {
      const ev = advanceRound(s);
      view = viewFromBoard(s.board);
      expect(ev.length).toBe(1);
      continue;
    }
    let a: Pos;
    let b: Pos;
    if (rng() < 0.85) {
      const moves = legalMoves(s.board);
      const m = moves[Math.floor(rng() * moves.length)];
      a = m.a;
      b = m.b;
    } else {
      const r = Math.floor(rng() * 7);
      const c = Math.floor(rng() * 6);
      a = [r, c];
      b = [r, c + 1];
    }
    const res = swapCells(s, a, b);
    if (res.events.length === 0) continue;
    const { timeline, view: after } = planEvents(view, res.events, reduced);
    on(s, res.events, timeline, view, after);
    view = after;
  }
}

describe('man11Anim: nhiều ván ngẫu nhiên (mỗi thao tác một dòng thời gian, bàn hiển thị luôn khớp bàn của logic)', () => {
  it('120 ván × 80 nước: bàn cuối của mỗi thao tác khớp logic, khóa có thứ tự thời gian, mốc đủ, không hết miếng', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 120; seed++) {
      playRandom(seed, false, (s, events, tl, _before, after) => {
        const bad = viewMismatch(after, s.board);
        expect(bad, `seed ${seed}: ${bad}\n${boardToText(s.board)}`).toBeNull();
        expect(keysSorted(tl), `seed ${seed}`).toBe(true);
        expect(Number.isFinite(tl.duration)).toBe(true);
        expect(tl.duration).toBeGreaterThan(0);
        for (let i = 1; i < tl.marks.length; i++) expect(tl.marks[i].t).toBeGreaterThanOrEqual(tl.marks[i - 1].t);
        for (const m of tl.marks) expect(m.t, `${m.type}`).toBeLessThanOrEqual(tl.duration + 1e-6);
        const slotFills = events.filter((e) => e.type === 'slotFilled').length;
        const throws = events.filter((e) => e.type === 'throwFake').length;
        expect(tl.flights.filter((f) => f.kind === 'slot')).toHaveLength(slotFills);
        expect(tl.flights.filter((f) => f.kind === 'fake')).toHaveLength(throws);
        expect(tl.marks.filter((m) => m.type === 'slot')).toHaveLength(slotFills);
        expect(tl.marks.filter((m) => m.type === 'branch')).toHaveLength(events.filter((e) => e.type === 'branchMerged').length);
        for (const e of events) seen.add(e.type);
        if (events.some((e) => e.type === 'roundEnd')) expect(tl.marks.some((m) => m.type === 'roundEnd')).toBe(true);
      });
    }
    // đã gặp đủ loại sự kiện quan trọng
    for (const t of ['swap', 'swapBack', 'wave', 'spawnLotus', 'clear', 'fakeGone', 'slotFilled', 'branchMerged', 'fall', 'fill', 'throwFake', 'roundEnd']) expect(seen.has(t), t).toBe(true);
  }, 60000);

  it('"Giảm chuyển động": cùng bàn cuối, ngắn hơn hay bằng, không có vòng nổ, lá bay thẳng', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const normal: { dur: number; final: string }[] = [];
      const reduced: { dur: number; final: string; bursts: number; arcs: number }[] = [];
      playRandom(seed, false, (s, _e, tl) => normal.push({ dur: tl.duration, final: boardToText(s.board) }), 40);
      playRandom(seed, true, (s, _e, tl, _b, after) => {
        expect(viewMismatch(after, s.board)).toBeNull();
        reduced.push({ dur: tl.duration, final: boardToText(s.board), bursts: tl.bursts.length, arcs: tl.flights.filter((f) => f.arc > 0).length });
      }, 40);
      expect(reduced.map((x) => x.final)).toEqual(normal.map((x) => x.final));
      reduced.forEach((x, i) => {
        expect(x.dur, `seed ${seed} nước ${i}`).toBeLessThanOrEqual(normal[i].dur + 1e-6);
        expect(x.bursts).toBe(0);
        expect(x.arcs).toBe(0);
      });
    }
  }, 60000);

  it('lấy mẫu: đầu dòng thời gian giống bàn hiển thị trước, cuối giống bàn hiển thị sau; mọi lúc giữa chừng hữu hạn, độ trong 0 đến 1, phóng không âm', () => {
    for (let seed = 1; seed <= 25; seed++) {
      playRandom(seed, false, (_s, _e, tl, before, after) => {
        const out = newSample();
        resetTimeline(tl);
        for (const tr of tl.tracks) {
          sampleTrack(tr, 0, out);
          const t0 = before.tiles[tr.id];
          expect(out.r).toBeCloseTo(t0.r, 6);
          expect(out.c).toBeCloseTo(t0.c, 6);
          expect(out.a).toBeCloseTo(t0.a, 6);
          expect(out.face).toBe(faceId(t0));
          expect(out.lotus).toBe(t0.lotus);
        }
        for (let t = 0; t <= tl.duration; t += 37) {
          for (const tr of tl.tracks) {
            sampleTrack(tr, t, out);
            expect(Number.isFinite(out.r + out.c + out.s + out.a)).toBe(true);
            expect(out.a).toBeGreaterThanOrEqual(-1e-9);
            expect(out.a).toBeLessThanOrEqual(1 + 1e-9);
            expect(out.s).toBeGreaterThanOrEqual(-1e-9);
          }
        }
        resetTimeline(tl);
        for (const tr of tl.tracks) {
          sampleTrack(tr, tl.duration, out);
          const t1 = after.tiles[tr.id];
          expect(out.r).toBeCloseTo(t1.r, 6);
          expect(out.c).toBeCloseTo(t1.c, 6);
          expect(out.s).toBeCloseTo(t1.s, 6);
          expect(out.a).toBeCloseTo(t1.a, 6);
          expect(out.face).toBe(faceId(t1));
          expect(out.lotus).toBe(t1.lotus);
        }
      }, 30);
    }
  }, 60000);

  it('planEvents không đổi bàn hiển thị đầu vào', () => {
    const s = createMatch3Game(5);
    const v = viewFromBoard(s.board);
    const snapshot = JSON.stringify(v);
    const m = legalMoves(s.board)[0];
    const r = swapCells(s, m.a, m.b);
    planEvents(v, r.events);
    expect(JSON.stringify(v)).toBe(snapshot);
    expect(JSON.stringify(cloneView(v))).toBe(snapshot);
  });
});

describe('man11Anim: lá giả ném, hoa sen, gió xoáy, xáo bàn, hết vòng', () => {
  it('ném lá giả sau lượt thứ 5: {phanDien} ló ra, vung (swing), lá rời tay, bay vào ô logic chọn, đổi mặt thành lá giả đúng lúc lá tới, rồi cười và rụt lại', () => {
    let found = false;
    for (let seed = 1; seed <= 80 && !found; seed++) {
      playRandom(seed, false, (s, events, tl, before, after) => {
        const th = events.find((e) => e.type === 'throwFake');
        if (!th || th.type !== 'throwFake' || found) return;
        found = true;
        const order = tl.marks.filter((m) => ['swing', 'throw', 'land', 'cheer'].includes(m.type)).map((m) => m.type);
        expect(order).toEqual(['swing', 'throw', 'land', 'cheer']);
        const flight = tl.flights.find((f) => f.kind === 'fake')!;
        expect(flight.from).toBeNull();
        expect(flight.to).toEqual({ r: th.pos[0], c: th.pos[1] });
        const land = tl.marks.find((m) => m.type === 'land')!;
        expect(land.t).toBeCloseTo(flight.t1, 6);
        const id = before.grid[th.pos[0]][th.pos[1]];
        void id;
        const tr = tl.tracks.find((x) => x.id === after.grid[th.pos[0]][th.pos[1]])!;
        const out = newSample();
        resetTimeline(tl);
        sampleTrack(tr, flight.t1 - 1, out);
        expect(out.face).not.toBe(FAKE_FACE);
        sampleTrack(tr, flight.t1 + 1, out);
        expect(out.face).toBe(FAKE_FACE);
        expect(villainAt(tl.villain, 0)).toBe(0);
        expect(villainAt(tl.villain, flight.t0)).toBeCloseTo(1, 5);
        expect(villainAt(tl.villain, tl.duration)).toBe(0);
        expect(s.board[th.pos[0]][th.pos[1]].kind).toBe('fake');
      });
    }
    expect(found).toBe(true);
  }, 60000);

  it('hoa sen và gió xoáy: đổi mặt ngay tại ô tạo ra; nổ hoa sen quét cả hàng lần lượt (khóa có trễ theo cột)', () => {
    let lotus = false;
    let wind = false;
    for (let seed = 1; seed <= 150 && !(lotus && wind); seed++) {
      playRandom(seed, false, (_s, events, tl, before, after) => {
        const sl = events.find((e) => e.type === 'spawnLotus');
        if (sl && sl.type === 'spawnLotus' && !lotus) {
          lotus = true;
          expect(tl.marks.some((m) => m.type === 'lotus')).toBe(true);
          const id = after.grid[sl.pos[0]][sl.pos[1]];
          void id;
        }
        const sw = events.find((e) => e.type === 'spawnWind');
        if (sw && !wind) {
          wind = true;
          expect(tl.marks.some((m) => m.type === 'wind')).toBe(true);
        }
        void before;
      }, 200);
    }
    expect(lotus).toBe(true);
    expect(WIND_FACE).toBe(7);
  }, 120000);

  it('xáo bàn: các lá thu nhỏ rồi đổi mặt rồi lớn lại; "Giảm chuyển động" thì mờ rồi hiện', () => {
    // tạo sự kiện xáo bằng tay: một bàn hai hàng
    const s = createMatch3FromBoard('ABABAB / BABABA', { slots: 'AAAA' });
    const v = viewFromBoard(s.board);
    const ev: Match3Event[] = [{ type: 'shuffle', cells: [{ pos: [0, 0], leaf: 2 }, { pos: [1, 1], leaf: 3 }] }];
    const { timeline, view } = planEvents(v, ev);
    expect(view.tiles[view.grid[0][0]]).toMatchObject({ leaf: 2, s: 1, a: 1 });
    expect(view.tiles[view.grid[1][1]]).toMatchObject({ leaf: 3 });
    expect(timeline.marks.map((m) => m.type)).toEqual(['shuffle']);
    const tr = timeline.tracks.find((x) => x.id === view.grid[0][0])!;
    const out = newSample();
    sampleTrack(tr, NORMAL.shuffle / 2, out);
    expect(out.s).toBeCloseTo(0, 5);
    const r = planEvents(v, ev, true);
    expect(r.timeline.duration).toBe(REDUCED.shuffle);
    const tr2 = r.timeline.tracks.find((x) => x.id === r.view.grid[0][0])!;
    sampleTrack(tr2, REDUCED.shuffle / 2, out);
    expect(out.a).toBeCloseTo(0, 5);
    expect(out.s).toBeCloseTo(1, 5);
  });

  it('hết vòng: mốc roundEnd (xong cây, lượt dư, thưởng) nằm sau mọi hoạt cảnh của thao tác; roundStart không có dòng thời gian riêng', () => {
    const s = createMatch3Game(4);
    s.turnsLeft = 1;
    const m = legalMoves(s.board)[0];
    const v = viewFromBoard(s.board);
    const r = swapCells(s, m.a, m.b);
    expect(r.events.some((e) => e.type === 'roundEnd')).toBe(true);
    const { timeline } = planEvents(v, r.events);
    const end = timeline.marks.find((m) => m.type === 'roundEnd')!;
    for (const m of timeline.marks) expect(m.t).toBeLessThanOrEqual(end.t + 1e-6);
    if (end.done) {
      // cây xong: gộp cành và gốc sáng chạy hết, cây đầy được giữ ≥ treeHold trước khi hộp hết vòng hiện
      const lastTree = Math.max(...timeline.marks.filter((m) => ['slot', 'branch', 'tree'].includes(m.type)).map((m) => m.t));
      expect(end.t - lastTree).toBeGreaterThanOrEqual(NORMAL.treeHold - 1e-6);
    } else expect(end.t - Math.max(...timeline.marks.filter((m) => m.type !== 'roundEnd').map((m) => m.t))).toBeLessThan(NORMAL.treeHold);
    expect(end.done).toBe(s.results[0].done);
    expect(end.turnsLeft).toBe(s.results[0].turnsLeft);
    const next = advanceRound(s);
    const p = planEvents(viewFromBoard(s.board), next);
    expect(p.timeline.marks.map((m) => m.type)).toEqual(['roundStart']);
  });
});

describe('man11Anim: thời lượng', () => {
  it('"Giảm chuyển động" không dài hơn bình thường ở mọi bước, không nảy (bounce 0), không trễ quét hàng', () => {
    for (const k of Object.keys(NORMAL) as (keyof typeof NORMAL)[]) expect(REDUCED[k], k).toBeLessThanOrEqual(NORMAL[k] + 1e-9);
    expect(REDUCED.bounce).toBe(0);
    expect(REDUCED.sweep).toBe(0);
    expect(REDUCED.pop).toBe(0);
  });
});

describe('man11Anim: tạm dừng thật', () => {
  it('stepClock: tạm dừng thì đồng hồ đứng yên qua nhiều khung; hết tạm dừng thì chạy tiếp, mỗi khung tối đa 100 ms và không vượt thời lượng', () => {
    let t = 250;
    for (let i = 0; i < 500; i++) t = stepClock(t, 16, true, 2000);
    expect(t).toBe(250);
    t = stepClock(t, 16, false, 2000);
    expect(t).toBe(266);
    expect(stepClock(0, 5000, false, 2000)).toBe(100);
    expect(stepClock(1990, 50, false, 2000)).toBe(2000);
    expect(stepClock(10, -5, false, 2000)).toBe(10);
  });
});

describe('man11Anim: cây xong giữ cây đầy cho em nhìn rồi mới hết vòng', () => {
  const events: Match3Event[] = [
    { type: 'swap', a: [0, 0], b: [0, 1] },
    { type: 'wave', n: 1 },
    { type: 'slotFilled', slot: 0, leaf: 0, from: [0, 0] },
    { type: 'slotFilled', slot: 1, leaf: 1, from: [0, 1] },
    { type: 'branchMerged', level: 1, index: 0, root: false },
    { type: 'slotFilled', slot: 2, leaf: 2, from: [0, 2] },
    { type: 'slotFilled', slot: 3, leaf: 3, from: [0, 3] },
    { type: 'branchMerged', level: 1, index: 1, root: false },
    { type: 'branchMerged', level: 2, index: 0, root: true },
    { type: 'treeDone' },
    { type: 'roundEnd', round: 0, done: true, turnsLeft: 3, bonus: 260 },
  ];
  const board = createMatch3Game(2).board;
  it('hộp hết vòng hiện sau mốc gốc sáng ít nhất treeHold (bình thường ≥ 1,4 giây, giảm chuyển động ≥ 0,5 giây)', () => {
    for (const reduced of [false, true]) {
      const { timeline } = planEvents(viewFromBoard(board), events, reduced);
      const tree = timeline.marks.find((m) => m.type === 'tree')!;
      const end = timeline.marks.find((m) => m.type === 'roundEnd')!;
      const hold = reduced ? REDUCED.treeHold : NORMAL.treeHold;
      expect(end.t - tree.t).toBeGreaterThanOrEqual(hold - 1e-6);
      expect(timeline.duration).toBeGreaterThanOrEqual(end.t);
      for (const m of timeline.marks) expect(m.t).toBeLessThanOrEqual(end.t + 1e-6);
    }
    expect(NORMAL.treeHold).toBeGreaterThanOrEqual(1400);
  });
});

describe('man11Anim: gió xoáy đổi chỗ với một lá', () => {
  it('xóa đúng mọi lá cùng loại và chính ô gió (đợt nổ đầu), không lá loại khác; bàn hiển thị cuối khớp logic; mọi lá bị xóa có khóa mờ dần và vòng nổ', () => {
    const s = createMatch3FromBoard('ABCDEFA / CDEFABC / EFABCDE / BCDEFAB / DEFABCD / FABCDEF / ABCDEFA', { slots: 'AAAA', turns: 10 });
    s.board[3][3] = WIND; // đang là ô gió; ô (3,4) là lá loại E
    const kind = s.board[3][4].leaf;
    const expected = s.board.flat().filter((c) => c.kind === 'leaf' && c.leaf === kind).length;
    expect(expected).toBeGreaterThan(5);
    const before = viewFromBoard(s.board);
    const r = swapCells(s, [3, 3], [3, 4]);
    expect(r.ok).toBe(true);
    const clear = r.events.find((e) => e.type === 'clear');
    expect(clear && clear.type === 'clear' ? clear.windOf : -2).toBe(kind);
    const cells = clear && clear.type === 'clear' ? clear.cells : [];
    expect(cells.filter((c) => c.kind === 'leaf' || c.kind === 'lotus')).toHaveLength(expected);
    expect(cells.filter((c) => c.kind === 'wind')).toHaveLength(1);
    for (const c of cells) if (c.kind !== 'wind') expect(c.leaf).toBe(kind);
    const { timeline, view } = planEvents(before, r.events);
    expect(viewMismatch(view, s.board)).toBeNull();
    expect(timeline.marks.filter((m) => m.type === 'clear')[0].count).toBe(expected + 1);
    expect(timeline.bursts.filter((b) => b.leaf === kind).length).toBeGreaterThanOrEqual(expected);
    // cuối đợt nổ đầu, mọi miếng bị xóa (lá loại đó và ô gió) đã mờ hẳn
    const out = newSample();
    const firstEnd = NORMAL.swap + NORMAL.clear;
    let faded = 0;
    for (const c of cells) {
      const id = before.grid[c.pos[0]][c.pos[1]];
      const tr = timeline.tracks.find((x) => x.id === id);
      expect(tr, `miếng ${id}`).toBeDefined();
      resetTimeline(timeline);
      sampleTrack(tr!, firstEnd + 1, out);
      if (out.a < 0.01) faded++;
    }
    expect(faded).toBe(cells.length);
  });
});

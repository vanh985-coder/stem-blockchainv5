import { describe, expect, it } from 'vitest';
import { BASE_MATCH3_SPEC, MATCH3_SPEC, match3Variant, type Match3Spec } from './match3Config';
import {
  advanceRound,
  boardToText,
  createMatch3FromBoard,
  createMatch3Game,
  fillSlot,
  findGroups,
  hasMove,
  isLegalMove,
  legalMoves,
  makeBoard,
  makeSlots,
  parseBoard,
  previewMove,
  roundRng,
  scoreFromStats,
  settleBoard,
  shuffleBoard,
  swapCells,
  throwFake,
  type Match3Event,
  type Pos,
} from './match3Logic';

const ev = <T extends Match3Event['type']>(events: readonly Match3Event[], type: T) => events.filter((e): e is Extract<Match3Event, { type: T }> => e.type === type);
const keyOf = (p: Pos) => `${p[0]},${p[1]}`;
const cellsOfFirstClear = (events: readonly Match3Event[]) =>
  ev(events, 'clear')[0].cells
    .map((c) => keyOf(c.pos))
    .sort();

describe('bảng test của spec 08 (màn 11)', () => {
  it('AAAB / CDEF: nổ đúng 3 ô (0,0), (0,1), (0,2)', () => {
    const s = createMatch3FromBoard('AAAB / CDEF');
    expect(findGroups(s.board).map((g) => g.cells.map(keyOf))).toEqual([['0,0', '0,1', '0,2']]);
    const events = settleBoard(s);
    expect(cellsOfFirstClear(events)).toEqual(['0,0', '0,1', '0,2']);
    expect(ev(events, 'clear')[0].points).toBe(15);
  });

  it('ABC / ADE / AFG: nổ đúng 3 ô cột 0', () => {
    const s = createMatch3FromBoard('ABC / ADE / AFG');
    expect(cellsOfFirstClear(settleBoard(s))).toEqual(['0,0', '1,0', '2,0']);
  });

  it('AAX / BCD: không nổ (lá giả không tính vào hàng)', () => {
    const s = createMatch3FromBoard('AAX / BCD');
    expect(findGroups(s.board)).toEqual([]);
    expect(settleBoard(s)).toEqual([]);
    expect(boardToText(s.board)).toBe('AAX / BCD');
  });

  it('ABAB / BABA / ABAB: còn nước đi (đổi ô (0,1) với (1,1))', () => {
    const b = parseBoard('ABAB / BABA / ABAB');
    expect(hasMove(b)).toBe(true);
    expect(isLegalMove(b, { a: [0, 1], b: [1, 1] })).toBe(true);
    expect(legalMoves(b).length).toBeGreaterThan(0);
  });

  it('ABC / BCA / CAB: hết nước đi, phải xáo lại', () => {
    const b = parseBoard('ABC / BCA / CAB');
    expect(hasMove(b)).toBe(false);
    expect(legalMoves(b)).toEqual([]);
  });

  it('lá giả nằm sát một hàng vừa nổ thì biến mất; lá giả không sát thì còn', () => {
    const near = createMatch3FromBoard('AAAX / CDEF');
    const e1 = settleBoard(near);
    expect(ev(e1, 'fakeGone').map((x) => keyOf(x.pos))).toContain('0,3');
    const far = createMatch3FromBoard('AAAB / CDEX');
    const e2 = settleBoard(far);
    expect(ev(e2, 'fakeGone')).toEqual([]);
  });

  it('nổ hàng loại A khi cây còn ô trống loại A: lấp đúng 1 ô', () => {
    const s = createMatch3FromBoard('AAAB / CDEF', { slots: 'BACD' });
    const events = settleBoard(s);
    const filled = ev(events, 'slotFilled');
    expect(filled).toHaveLength(1);
    expect(filled[0].slot).toBe(1);
    expect(filled[0].leaf).toBe(0);
    expect(s.slots.map((x) => x.filled)).toEqual([false, true, false, false]);
    const none = createMatch3FromBoard('AAAB / CDEF', { slots: 'BBCD' }); // không còn ô cần A
    expect(ev(settleBoard(none), 'slotFilled')).toEqual([]);
  });

  it('hai ô cạnh nhau cùng đầy: gộp thành 1 cành', () => {
    const s = createMatch3FromBoard('AAAB / CDEF', { slots: 'AABB' });
    s.slots[1].filled = true; // ô anh em đã đầy
    const events = settleBoard(s);
    expect(ev(events, 'slotFilled')[0].slot).toBe(0);
    expect(ev(events, 'branchMerged')).toEqual([{ type: 'branchMerged', level: 1, index: 0, root: false }]);
    expect(s.merged[0]).toEqual([true, false]);
  });

  it('4 lá thẳng hàng: tạo ô hoa sen ở vị trí vừa đổi, giữ loại lá', () => {
    const s = createMatch3FromBoard('AABA / CCAD');
    const r = swapCells(s, [0, 2], [1, 2]);
    expect(r.ok).toBe(true);
    const lotus = ev(r.events, 'spawnLotus');
    expect(lotus).toEqual([{ type: 'spawnLotus', pos: [0, 2], leaf: 0 }]);
    expect(cellsOfFirstClear(r.events)).toEqual(['0,0', '0,1', '0,3']); // 3 lá nổ, hoa sen ở lại
    expect(ev(r.events, 'clear')[0].points).toBe(15);
  });
});

describe('hàng dài, nổ dây chuyền, hai hàng cùng loại', () => {
  it('hàng 5 lá chỉ lấp 1 ô cây (và tạo gió xoáy, không phải hoa sen)', () => {
    const s = createMatch3FromBoard('AAAAA / BCDEB', { slots: 'AAAA' });
    const events = settleBoard(s);
    expect(ev(events, 'slotFilled')).toHaveLength(1);
    expect(ev(events, 'spawnWind')).toHaveLength(1);
    expect(ev(events, 'spawnLotus')).toEqual([]);
    expect(ev(events, 'clear')[0].cells).toHaveLength(4); // 5 lá, ô gió ở lại
  });

  it('hàng 4 lá cũng chỉ lấp 1 ô cây; hình L (hai đường 3 giao nhau) là MỘT nhóm lấp 1 ô', () => {
    const four = createMatch3FromBoard('AAAA / BCDE', { slots: 'AAAA' });
    expect(ev(settleBoard(four), 'slotFilled')).toHaveLength(1);
    const el = createMatch3FromBoard('AAAB / ACDE / AFGB', { slots: 'AAAA' });
    const groups = findGroups(el.board);
    expect(groups).toHaveLength(1);
    expect(groups[0].cells).toHaveLength(5);
    expect(groups[0].length).toBe(3);
    const events = settleBoard(el);
    expect(ev(events, 'slotFilled')).toHaveLength(1);
    expect(ev(events, 'spawnLotus')).toEqual([]); // đường dài nhất mới 3
    expect(ev(events, 'clear')[0].cells).toHaveLength(5);
  });

  it('hai hàng loại A trong cùng một đợt lấp 2 ô A (nếu còn), còn 1 ô thì lấp 1', () => {
    const two = createMatch3FromBoard('AAAB / CDEF / AAAB', { slots: 'AACC' });
    const events = settleBoard(two);
    expect(ev(events, 'clear')[0].cells).toHaveLength(6);
    expect(ev(events, 'slotFilled').map((x) => x.slot)).toEqual([0, 1]);
    const one = createMatch3FromBoard('AAAB / CDEF / AAAB', { slots: 'ACCC' });
    expect(ev(settleBoard(one), 'slotFilled')).toHaveLength(1);
  });

  it('nổ dây chuyền: lá thêm vào từ trên tạo hàng mới thì nổ tiếp ở đợt sau (đợt đánh số tăng dần, mỗi đợt có rơi và thêm lá)', () => {
    // cột 0 có BBB ở hàng 2 đến 4; C và A phía trên rơi xuống, ba lá mới (loại A) thêm vào trên cùng tạo AAA ở đợt 2
    const s = createMatch3FromBoard('CDEF / AEFD / BFDE / BDEF / BEFD');
    let calls = 0;
    const seq = [0, 0, 0, 0.2, 0.5, 0.8];
    s.rng = () => seq[Math.min(calls++, seq.length - 1)] ?? 0.2;
    const events = settleBoard(s);
    expect(ev(events, 'wave').map((w) => w.n)).toEqual([1, 2]);
    const clears = ev(events, 'clear');
    expect(clears[0].cells.map((c) => keyOf(c.pos)).sort()).toEqual(['2,0', '3,0', '4,0']);
    expect(clears[1].cells.map((c) => keyOf(c.pos)).sort()).toEqual(['0,0', '1,0', '2,0']);
    expect(ev(events, 'fall').length).toBeGreaterThan(0);
    expect(ev(events, 'fill')).toHaveLength(2);
    expect(findGroups(s.board)).toEqual([]);
  });

  it('lá giả không đổi chỗ được và không đổi chỗ với ô gió', () => {
    const s = createMatch3FromBoard('AXB / CWD');
    const a = swapCells(s, [0, 1], [0, 0]);
    expect(a.ok === false && a.why).toBe('fake');
    const b = swapCells(s, [0, 1], [1, 1]);
    expect(b.ok === false && b.why).toBe('fake');
    expect(s.turnsLeft).toBe(MATCH3_SPEC.rounds[0].turns);
  });
});

describe('hoa sen và gió xoáy', () => {
  it('hoa sen giữ loại lá (ghép hàng được) và khi nổ xóa cả hàng ngang, kể cả lá giả; lá bị xóa thêm +5, lá giả không điểm, không lấp ô cây', () => {
    const s = createMatch3FromBoard('BCDEF / aAAXD / FEDCB', { slots: 'DDDD' });
    const groups = findGroups(s.board);
    expect(groups).toHaveLength(1);
    expect(groups[0].type).toBe(0);
    const events = settleBoard(s);
    const clear = ev(events, 'clear')[0];
    expect(clear.lotusRows).toEqual([1]);
    expect(clear.cells.map((c) => keyOf(c.pos)).sort()).toEqual(['1,0', '1,1', '1,2', '1,4']);
    expect(clear.points).toBe(20);
    expect(ev(events, 'fakeGone').map((x) => keyOf(x.pos))).toEqual(['1,3']);
    expect(ev(events, 'slotFilled')).toEqual([]); // loại A không có ô cần; D ở hàng bị xóa thêm không lấp
  });

  it('hoa sen nổ kéo theo hoa sen khác trong cùng hàng', () => {
    const s = createMatch3FromBoard('BCDEF / aAAbD / FEDCB');
    const clear = ev(settleBoard(s), 'clear')[0];
    expect(clear.cells).toHaveLength(5);
    expect(clear.lotusRows).toEqual([1]);
  });

  it('gió xoáy đổi với lá loại X xóa đúng mọi lá loại X (kể cả hoa sen) và chính nó; tính là 1 hàng, lấp tối đa 1 ô', () => {
    const s = createMatch3FromBoard('WAB / BAC / ACB', { slots: 'AAAB' });
    const r = swapCells(s, [0, 0], [0, 1]);
    expect(r.ok).toBe(true);
    const clear = ev(r.events, 'clear')[0];
    expect(clear.windOf).toBe(0);
    expect(clear.cells.map((c) => keyOf(c.pos)).sort()).toEqual(['0,0', '0,1', '1,1', '2,0']);
    expect(clear.points).toBe(15); // 3 lá A, ô gió không tính điểm
    expect(ev(r.events, 'slotFilled')).toHaveLength(1);
    expect(r.events[0]).toEqual({ type: 'swap', a: [0, 0], b: [0, 1] });
  });

  it('gió xoáy + gió xoáy: xóa mọi lá thường', () => {
    const s = createMatch3FromBoard('WWX / ABC / DEF');
    const r = swapCells(s, [0, 0], [0, 1]);
    expect(r.ok).toBe(true);
    const clear = ev(r.events, 'clear')[0];
    expect(clear.windOf).toBe(-1);
    expect(clear.cells).toHaveLength(8); // 6 lá thường và hai ô gió; lá giả sát bên biến mất
    expect(ev(r.events, 'fakeGone').map((x) => keyOf(x.pos))).toEqual(['0,2']);
    expect(ev(r.events, 'slotFilled')).toEqual([]);
  });

  it('gió xoáy đổi với hoa sen loại X xóa mọi lá X; hoa sen nổ kéo theo cả hàng của nó', () => {
    const s = createMatch3FromBoard('WaB / BCA / ACB');
    const r = swapCells(s, [0, 0], [0, 1]);
    const clear = ev(r.events, 'clear')[0];
    expect(clear.lotusRows).toEqual([0]);
    expect(clear.cells.map((c) => keyOf(c.pos)).sort()).toEqual(['0,0', '0,1', '0,2', '1,2', '2,0']);
  });
});

describe('lượt, lá giả ném, đổi không tạo hàng', () => {
  it('đổi không tạo hàng thì trả về chỗ cũ và KHÔNG mất lượt', () => {
    const s = createMatch3Game(7);
    const before = boardToText(s.board);
    const legal = new Set(legalMoves(s.board).map((m) => `${keyOf(m.a)}-${keyOf(m.b)}`));
    let tried = false;
    for (let r = 0; r < 7 && !tried; r++) {
      for (let c = 0; c < 6 && !tried; c++) {
        const x = s.board[r][c];
        const y = s.board[r][c + 1];
        if (x.kind !== 'leaf' || y.kind !== 'leaf' || legal.has(`${r},${c}-${r},${c + 1}`)) continue;
        const res = swapCells(s, [r, c], [r, c + 1]);
        expect(res.ok).toBe(false);
        expect(res.ok === false && res.why).toBe('noMatch');
        expect(res.events.map((e) => e.type)).toEqual(['swap', 'swapBack']);
        expect(boardToText(s.board)).toBe(before);
        expect(s.turnsLeft).toBe(MATCH3_SPEC.rounds[0].turns);
        expect(s.turnsUsed).toBe(0);
        tried = true;
      }
    }
    expect(tried).toBe(true);
  });

  it('mỗi 5 lượt đúng 1 lá giả mới ném (không ném ở lượt khác)', () => {
    const spec: Match3Spec = { ...BASE_MATCH3_SPEC, rounds: [{ slots: 8, turns: 80, fakes: 3 }] };
    for (const seed of [1, 2, 3]) {
      const s = createMatch3Game(seed, spec);
      let turn = 0;
      while (turn < 14 && s.phase === 'play') {
        const m = legalMoves(s.board)[0];
        const r = swapCells(s, m.a, m.b);
        expect(r.ok).toBe(true);
        turn++;
        const thrown = ev(r.events, 'throwFake');
        if (s.phase === 'play') expect(thrown).toHaveLength(turn % 5 === 0 ? 1 : 0);
      }
      expect(s.stats.fakesThrown).toBe(Math.floor(turn / 5));
    }
  });

  it('lá giả chỉ ném vào ô lá thường (không vào hoa sen, ô gió, lá giả)', () => {
    const s = createMatch3FromBoard('aWX / AXB / bCW');
    const seen = new Set<string>();
    for (let i = 0; i < 4; i++) {
      const before = boardToText(s.board);
      const p = throwFake(s);
      if (!p) break;
      seen.add(keyOf(p));
      const c = parseBoard(before)[p[0]][p[1]];
      expect(c.kind === 'leaf' && !c.lotus).toBe(true);
    }
    expect([...seen].sort()).toEqual(['1,0', '1,2', '2,1']); // chỉ ba ô lá thường A, B, C
    expect(throwFake(s)).toBeNull(); // hết ô lá thường
  });
});

describe('bàn đầu vòng, xáo bàn', () => {
  it('bàn đầu mỗi vòng: không có hàng sẵn, có nước đi (1000 seed), đủ lá giả', () => {
    for (let seed = 1; seed <= 1000; seed++) {
      const round = seed % 3;
      const spec = MATCH3_SPEC.rounds[round];
      const b = makeBoard(MATCH3_SPEC, spec.fakes, roundRng(seed, round));
      expect(findGroups(b), `seed ${seed}`).toEqual([]);
      expect(hasMove(b), `seed ${seed}`).toBe(true);
      expect(b.flat().filter((x) => x.kind === 'fake')).toHaveLength(spec.fakes);
    }
  });

  it('sau khi xáo: không có hàng sẵn, có nước đi, lá giả giữ chỗ (1000 seed, bàn hết nước đi)', () => {
    // bàn chết kiểu (hàng + cột) mod 3, thêm lá giả ở vài chỗ
    const dead = Array.from({ length: 7 }, (_, r) =>
      Array.from({ length: 7 }, (_, c) => String.fromCharCode(65 + ((r + c) % 3))),
    ).map((row) => row.join(''));
    const fakesAt: Pos[] = [
      [1, 2],
      [3, 3],
      [5, 1],
      [6, 6],
    ];
    for (const [r, c] of fakesAt) dead[r] = dead[r].slice(0, c) + 'X' + dead[r].slice(c + 1);
    const text = dead.join(' / ');
    for (let seed = 1; seed <= 1000; seed++) {
      const s = createMatch3FromBoard(text, { seed });
      expect(hasMove(s.board), `bàn gốc seed ${seed}`).toBe(false);
      const cells = shuffleBoard(s);
      expect(cells.length).toBeGreaterThan(0);
      expect(findGroups(s.board), `seed ${seed}`).toEqual([]);
      expect(hasMove(s.board), `seed ${seed}`).toBe(true);
      for (const [r, c] of fakesAt) expect(s.board[r][c].kind, `seed ${seed}`).toBe('fake');
      expect(s.board.flat().filter((x) => x.kind === 'fake')).toHaveLength(fakesAt.length);
    }
  });

  it('trong ván: bàn luôn không có hàng sẵn và còn nước đi sau mỗi lượt; hết nước đi thì tự xáo (ít loại lá, nhiều lá giả để hay hết nước đi; ba seed đã dò ra có xáo)', () => {
    const spec: Match3Spec = { ...BASE_MATCH3_SPEC, kinds: 4, rounds: BASE_MATCH3_SPEC.rounds.map((r) => ({ ...r, fakes: 20, turns: 60 })) };
    let shuffles = 0;
    for (const seed of [1, 6, 7]) {
      const s = createMatch3Game(seed, spec);
      let guard = 0;
      while (s.phase !== 'ended' && guard++ < 400) {
        if (s.phase === 'roundEnd') {
          advanceRound(s);
          continue;
        }
        const moves = legalMoves(s.board);
        expect(moves.length, `seed ${seed}`).toBeGreaterThan(0);
        const m = moves[(seed + guard) % moves.length];
        const r = swapCells(s, m.a, m.b);
        if (s.phase === 'play') {
          expect(findGroups(s.board), `seed ${seed}`).toEqual([]);
          expect(hasMove(s.board), `seed ${seed}`).toBe(true);
        }
        // xáo là việc cuối của lượt, và chỉ xáo các lá thường: lá giả không bị chạm tới
        if (ev(r.events, 'shuffle').length) {
          expect(r.events[r.events.length - 1].type).toBe('shuffle');
          for (const c of ev(r.events, 'shuffle')[0].cells) expect(s.board[c.pos[0]][c.pos[1]].kind).toBe('leaf');
        }
      }
      shuffles += s.stats.shuffles;
    }
    expect(shuffles).toBeGreaterThan(0);
  });
});

describe('ô cây', () => {
  it('8 ô cây không loại nào quá 3 ô; 4 ô thì không loại nào quá 2 (1000 seed)', () => {
    for (let seed = 1; seed <= 1000; seed++) {
      for (const n of [8, 4]) {
        const slots = makeSlots(MATCH3_SPEC, n, roundRng(seed, n));
        const count = new Map<number, number>();
        for (const x of slots) count.set(x.need, (count.get(x.need) ?? 0) + 1);
        expect(Math.max(...count.values()), `seed ${seed}, ${n} ô`).toBeLessThanOrEqual(n === 8 ? 3 : 2);
        expect(slots).toHaveLength(n);
        for (const x of slots) {
          expect(x.need).toBeGreaterThanOrEqual(0);
          expect(x.need).toBeLessThan(MATCH3_SPEC.kinds);
        }
      }
    }
  });

  it('gộp cành đúng cặp anh em: (0,1), (2,3), rồi hai cành, rồi gốc; xong cây khi mọi ô đầy', () => {
    const s = createMatch3FromBoard('AB / CD', { slots: 'ABCDEFAB' });
    const events: Match3Event[] = [];
    const fill = (type: number) => fillSlot(s, type, [0, 0], events);
    fill(2); // ô 2
    expect(ev(events, 'branchMerged')).toEqual([]);
    fill(5); // ô 5: anh em của ô 4 chưa đầy
    expect(ev(events, 'branchMerged')).toEqual([]);
    fill(3); // ô 3 đầy cùng ô 2: gộp cành 1 (cành ở mức 1, chỉ số 1)
    expect(ev(events, 'branchMerged')).toEqual([{ type: 'branchMerged', level: 1, index: 1, root: false }]);
    fill(0); // ô 0
    fill(1); // ô 1: gộp cành 0, rồi cành 0 và cành 1 cùng đầy nên gộp lên mức 2 chỉ số 0
    expect(ev(events, 'branchMerged').slice(1)).toEqual([
      { type: 'branchMerged', level: 1, index: 0, root: false },
      { type: 'branchMerged', level: 2, index: 0, root: false },
    ]);
    expect(ev(events, 'treeDone')).toEqual([]);
    fill(4); // ô 4: anh em là ô 5 (đã đầy) nên gộp cành mức 1 chỉ số 2
    expect(ev(events, 'branchMerged').pop()).toEqual({ type: 'branchMerged', level: 1, index: 2, root: false });
    expect(ev(events, 'treeDone')).toEqual([]);
    expect(s.slots.filter((x) => x.filled)).toHaveLength(6);
  });

  it('cây 8 ô: đầy cả 8 ô thì gốc hình thành (một lần gộp gốc và một sự kiện xong cây); cây 4 ô: 2 cành rồi gốc', () => {
    const s = createMatch3FromBoard('AB / CD', { slots: 'ABCDEFGA' });
    const events: Match3Event[] = [];
    for (const t of [0, 1, 2, 3, 4, 5, 6]) fillSlot(s, t, [0, 0], events);
    expect(ev(events, 'treeDone')).toEqual([]);
    fillSlot(s, 0, [0, 0], events); // ô 7 (loại A, ô 0 đã đầy nên là ô 7)
    const merges = ev(events, 'branchMerged');
    expect(merges.filter((m) => m.root)).toEqual([{ type: 'branchMerged', level: 3, index: 0, root: true }]);
    expect(ev(events, 'treeDone')).toHaveLength(1);
    const t4 = createMatch3FromBoard('AB / CD', { slots: 'ABCD' });
    const e4: Match3Event[] = [];
    for (const t of [0, 1, 2, 3]) fillSlot(t4, t, [0, 0], e4);
    expect(ev(e4, 'branchMerged').map((m) => `${m.level}:${m.index}:${m.root}`)).toEqual(['1:0:false', '1:1:false', '2:0:true']);
    expect(ev(e4, 'treeDone')).toHaveLength(1);
  });
});

describe('vòng, điểm, tất định', () => {
  it('xong cây: hết vòng, thưởng +20 mỗi lượt dư; điểm khớp công thức (lá nổ × 5 + ô cây × 50 + thưởng)', () => {
    const spec: Match3Spec = { ...BASE_MATCH3_SPEC, rounds: [{ slots: 2, turns: 5, fakes: 0 }, ...BASE_MATCH3_SPEC.rounds.slice(1)] };
    const s = createMatch3FromBoard('AABA / CCAD', { spec, slots: 'AA', turns: 5 });
    s.slots[1].filled = true; // ô 0 là ô cuối cùng
    const r = swapCells(s, [0, 2], [1, 2]);
    expect(r.ok).toBe(true);
    const end = ev(r.events, 'roundEnd')[0];
    expect(end).toEqual({ type: 'roundEnd', round: 0, done: true, turnsLeft: 4, bonus: 80 });
    expect(s.phase).toBe('roundEnd');
    expect(s.results[0]).toMatchObject({ done: true, turnsLeft: 4 });
    expect(ev(r.events, 'treeDone')).toHaveLength(1);
    expect(s.score).toBe(scoreFromStats(spec, s.stats, s.results)); // ô 1 đầy sẵn (không qua lấp) không tính điểm
    expect(s.results[0].score).toBe(s.score);
    const next = advanceRound(s);
    expect(next).toEqual([{ type: 'roundStart', round: 1 }]);
    expect(s.phase).toBe('play');
    expect(s.turnsLeft).toBe(spec.rounds[1].turns);
    expect(s.slots).toHaveLength(8);
  });

  it('hết lượt mà chưa xong cây thì vẫn sang vòng sau (không thưởng), game không chặn đường; sau vòng cuối là hết ván', () => {
    const spec: Match3Spec = { ...BASE_MATCH3_SPEC, rounds: BASE_MATCH3_SPEC.rounds.map((r) => ({ ...r, turns: 2 })) };
    const s = createMatch3Game(3, spec);
    for (let round = 0; round < 3; round++) {
      expect(s.round).toBe(round);
      let guard = 0;
      while (s.phase === 'play' && guard++ < 50) {
        const m = legalMoves(s.board)[0];
        swapCells(s, m.a, m.b);
      }
      expect(s.phase).toBe('roundEnd');
      expect(s.results[round].done).toBe(false);
      expect(s.results[round].turnsLeft).toBe(0);
      const events = advanceRound(s);
      expect(events[0].type).toBe(round < 2 ? 'roundStart' : 'gameEnd');
    }
    expect(s.phase).toBe('ended');
    expect(swapCells(s, [0, 0], [0, 1]).ok).toBe(false);
  });

  it('điểm một ván mẫu đúng công thức (20 seed)', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const s = createMatch3Game(seed);
      let guard = 0;
      while (s.phase !== 'ended' && guard++ < 500) {
        if (s.phase === 'roundEnd') {
          advanceRound(s);
          continue;
        }
        const moves = legalMoves(s.board);
        const m = moves[(seed * 7 + guard) % moves.length];
        swapCells(s, m.a, m.b);
      }
      expect(s.phase).toBe('ended');
      expect(s.results).toHaveLength(3);
      expect(s.score, `seed ${seed}`).toBe(scoreFromStats(s.spec, s.stats, s.results));
      expect(s.results.reduce((a, r) => a + r.score, 0)).toBe(s.score);
    }
  });

  it('cùng seed và cùng chuỗi nước đi thì cùng ván (sự kiện, bàn, điểm); khác seed thì khác', () => {
    const run = (seed: number) => {
      const s = createMatch3Game(seed);
      const log: Match3Event[][] = [];
      for (let i = 0; i < 25 && s.phase === 'play'; i++) {
        const moves = legalMoves(s.board);
        const m = moves[(i * 3) % moves.length];
        log.push(swapCells(s, m.a, m.b).events);
      }
      return { text: boardToText(s.board), score: s.score, log: JSON.stringify(log) };
    };
    expect(run(11)).toEqual(run(11));
    expect(run(11).text).not.toBe(run(12).text);
  });

  it('bàn đầu và ô cây của vòng chỉ phụ thuộc seed và số vòng, không phụ thuộc cách chơi', () => {
    const a = createMatch3Game(5);
    const b = createMatch3Game(5);
    for (let i = 0; i < 6; i++) {
      const m = legalMoves(a.board)[0];
      swapCells(a, m.a, m.b);
    }
    a.turnsLeft = 0;
    for (const s of [a, b]) {
      s.turnsLeft = 0;
      swapCells(s, legalMoves(s.board)[0].a, legalMoves(s.board)[0].b); // hết vòng
      advanceRound(s);
    }
    expect(boardToText(a.board)).toBe(boardToText(b.board));
    expect(a.slots).toEqual(b.slots);
  });

  it('xem trước nước đi khớp với đợt nổ đầu thật (số ô cây lấp, số lá nổ), 60 seed', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const s = createMatch3Game(seed, match3Variant('base'));
      for (const m of legalMoves(s.board).slice(0, 6)) {
        const p = previewMove(s, m)!;
        expect(p).not.toBeNull();
        const copy = createMatch3FromBoard(s.board, { seed: 99, slots: s.slots.map((x) => x.need) });
        const r = swapCells(copy, m.a, m.b);
        expect(r.ok).toBe(true);
        const firstWave: Match3Event[] = [];
        let waves = 0;
        for (const e of r.events) {
          if (e.type === 'wave') waves++;
          if (waves === 1) firstWave.push(e);
        }
        expect(ev(firstWave, 'slotFilled').length).toBe(p.slots);
        const clear = ev(firstWave, 'clear')[0];
        expect(clear.cells.filter((c) => c.kind !== 'wind').length).toBe(p.leaves);
      }
    }
  });

  it('phương án số lượt: A (12, 16, 16), B (10, 14, 14), C (8, 12, 12); chỉ đổi lượt, lá giả và ô cây giữ nguyên; số liệu đang dùng là C', () => {
    const expected = { A: [12, 16, 16], B: [10, 14, 14], C: [8, 12, 12] } as const;
    for (const v of ['A', 'B', 'C'] as const) {
      const spec = match3Variant(v);
      expect(spec.rounds.map((r) => r.turns)).toEqual(expected[v]);
      expect(spec.rounds.map((r) => r.fakes)).toEqual(BASE_MATCH3_SPEC.rounds.map((r) => r.fakes));
      expect(spec.rounds.map((r) => r.slots)).toEqual(BASE_MATCH3_SPEC.rounds.map((r) => r.slots));
      expect({ ...spec, rounds: BASE_MATCH3_SPEC.rounds }).toEqual(BASE_MATCH3_SPEC);
    }
    expect(match3Variant('base')).toBe(BASE_MATCH3_SPEC);
    expect(MATCH3_SPEC.rounds.map((r) => r.turns)).toEqual([8, 12, 12]);
  });

  it('số liệu gốc đúng bảng spec 08: lưới 7 × 7, 6 loại, ba vòng, điểm 5 / 50 / 20, mốc 600 / 1000 / 1400 (hay mốc đã đặt lại, ghi trong spec)', () => {
    expect(BASE_MATCH3_SPEC.size).toBe(7);
    expect(BASE_MATCH3_SPEC.kinds).toBe(6);
    expect(BASE_MATCH3_SPEC.rounds).toEqual([
      { slots: 4, turns: 20, fakes: 3 },
      { slots: 8, turns: 25, fakes: 5 },
      { slots: 8, turns: 25, fakes: 8 },
    ]);
    expect(BASE_MATCH3_SPEC.throwEvery).toBe(5);
    expect(BASE_MATCH3_SPEC.points).toEqual({ leaf: 5, slot: 50, spare: 20 });
    expect(BASE_MATCH3_SPEC.medals).toEqual([600, 1000, 1400]);
  });
});


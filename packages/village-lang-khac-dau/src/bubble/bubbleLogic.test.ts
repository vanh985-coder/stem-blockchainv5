import { publicKey } from '@so-chung/core/lessons/bai-3/logic';
import { describe, expect, it } from 'vitest';
import { BUBBLE_SPEC, bubbleMaxScore } from './bubbleConfig';
import {
  bubbleScore,
  canShoot,
  cellCenter,
  createBubbleGame,
  eggCount,
  groupAt,
  land,
  loadComplete,
  neighbors,
  pickTrayEgg,
  planOf,
  pointAlong,
  presentValues,
  rowWidth,
  selectType,
  shoot,
  shootAndLand,
  shotsToDescend,
  startRound,
  tracePath,
  type BubbleState,
  type Cell,
} from './bubbleLogic';


/** Ván đã nạp đủ trứng đúng và đang ở đợt `round` (bàn do `startRound` dựng; test thường ghi đè bằng `setBoard`) */
function playing(seed = 1, round = 0): BubbleState {
  const s = createBubbleGame(seed);
  for (let r = 0; r <= round; r++) {
    for (const e of planOf(s).tray) if (e.kind === 'dung') pickTrayEgg(s, e.id);
    expect(startRound(s)).toBe(true);
    if (r < round) {
      s.round++;
      s.phase = 'load';
      s.load = { picked: [], failed: false };
    }
  }
  return s;
}

/** Ghi đè bàn bằng các hàng cho trước (bỏ trống bằng null; độ rộng hàng tự theo lưới) */
function setBoard(s: BubbleState, rows: (number | null)[][]): void {
  s.board = rows.map((row, r) => {
    const w = rowWidth(s.shift, r);
    return Array.from({ length: w }, (_, c) => row[c] ?? null);
  });
}

/** Cho trứng `value` dính vào ô `cell` ngay (bỏ qua đường bay) rồi áp kết quả */
function drop(s: BubbleState, value: number, cell: Cell) {
  s.flying = { value, angle: 90, path: [{ x: 5, y: 10 }], length: 0, cell };
  return land(s);
}

describe('bubbleLogic: mẫu công khai và khay nạp', () => {
  it('publicKey của 3, 5, 6, 7, 9 là 10, 20, 8, 17, 11', () => {
    expect([3, 5, 6, 7, 9].map(publicKey)).toEqual([10, 20, 8, 17, 11]);
  });

  it('đợt 1, 2, 3 có 3, 4, 5 khóa riêng; mẫu đúng tính bằng publicKey; khóa khác nhau (500 seed)', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const s = createBubbleGame(seed);
      expect(s.plans.map((p) => p.keys.length)).toEqual([3, 4, 5]);
      for (const p of s.plans) {
        expect(new Set(p.keys).size).toBe(p.keys.length);
        expect(p.values).toEqual(p.keys.map(publicKey));
        for (const k of p.keys) expect(k).toBeGreaterThanOrEqual(2), expect(k).toBeLessThanOrEqual(15);
      }
    }
  });

  it('khay nạp: trứng đúng + 3 nhiễu (1 ghi chính số khóa riêng, 2 ghi mẫu của khóa ngoài đợt), nhiễu không trùng mẫu đúng, các số khác nhau (500 seed)', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const s = createBubbleGame(seed);
      for (const p of s.plans) {
        const n = p.keys.length;
        expect(p.tray).toHaveLength(n + 3);
        const dung = p.tray.filter((e) => e.kind === 'dung');
        const rieng = p.tray.filter((e) => e.kind === 'rieng');
        const ngoai = p.tray.filter((e) => e.kind === 'ngoai');
        expect(dung.map((e) => e.value).sort((a, b) => a - b)).toEqual([...p.values].sort((a, b) => a - b));
        expect(rieng).toHaveLength(1);
        expect(p.keys).toContain(rieng[0].value);
        expect(ngoai).toHaveLength(2);
        for (const e of ngoai) {
          const k = [...Array(22).keys()].map((i) => i + 1).find((x) => publicKey(x) === e.value)!;
          expect(p.keys).not.toContain(k);
        }
        for (const e of [...rieng, ...ngoai]) expect(p.values).not.toContain(e.value);
        expect(new Set(p.tray.map((e) => e.value)).size).toBe(n + 3);
      }
    }
  });

  it('chọn đúng thì trứng vào máy bắn; chọn sai thì bật ra và đợt đó mất thưởng nạp; chọn lại trứng đã nạp không đổi gì', () => {
    const s = createBubbleGame(3);
    const tray = planOf(s).tray;
    const sai = tray.find((e) => e.kind !== 'dung')!;
    const dung = tray.find((e) => e.kind === 'dung')!;
    expect(pickTrayEgg(s, sai.id)).toBe('sai');
    expect(s.load.failed).toBe(true);
    expect(s.load.picked).toEqual([]);
    expect(pickTrayEgg(s, dung.id)).toBe('dung');
    expect(pickTrayEgg(s, dung.id)).toBe('bo-qua');
    expect(s.load.picked).toEqual([dung.id]);
    expect(pickTrayEgg(s, 9999)).toBe('bo-qua');
  });

  it('chỉ vào đợt khi đã nạp đủ trứng đúng; nạp không sai được +30, nạp sai thì không', () => {
    const s = createBubbleGame(4);
    expect(startRound(s)).toBe(false);
    const dung = planOf(s).tray.filter((e) => e.kind === 'dung');
    for (const e of dung.slice(0, -1)) pickTrayEgg(s, e.id);
    expect(loadComplete(s)).toBe(false);
    expect(startRound(s)).toBe(false);
    pickTrayEgg(s, dung[dung.length - 1].id);
    expect(loadComplete(s)).toBe(true);
    expect(startRound(s)).toBe(true);
    expect(s.phase).toBe('play');
    expect(s.stats.cleanLoads).toBe(1);

    const t = createBubbleGame(4);
    pickTrayEgg(t, planOf(t).tray.find((e) => e.kind === 'rieng')!.id);
    for (const e of planOf(t).tray) if (e.kind === 'dung') pickTrayEgg(t, e.id);
    startRound(t);
    expect(t.stats.cleanLoads).toBe(0);
    expect(t.stats.wrongPicks).toBe(1);
  });
});

describe('bubbleLogic: bàn lưới lục giác', () => {
  it('đợt 1, 2, 3 có 5, 7, 8 hàng; hàng rộng 10 và hàng hẹp 9 xen kẽ; mỗi trứng mang mẫu công khai của đợt', () => {
    for (const [round, rows] of [[0, 5], [1, 7], [2, 8]] as const) {
      const s = playing(5, round);
      expect(s.board).toHaveLength(rows);
      s.board.forEach((row, r) => {
        expect(row).toHaveLength(r % 2 === 0 ? 10 : 9);
        for (const v of row) expect(planOf(s).values).toContain(v);
      });
    }
  });

  it('bàn đầu đợt sinh có kiểm nên hầu như không có sẵn cụm 3 trứng cùng số (dưới 10% số trứng nằm trong cụm, 150 ván)', () => {
    let inGroup = 0;
    let total = 0;
    for (let seed = 1; seed <= 50; seed++) {
      for (const round of [0, 1, 2]) {
        const s = playing(seed, round);
        for (let r = 0; r < s.board.length; r++) {
          for (let c = 0; c < s.board[r].length; c++) {
            total++;
            if (groupAt(s, r, c).length >= 3) inGroup++;
          }
        }
      }
    }
    expect(inGroup / total).toBeLessThan(0.1);
  });

  it('ô kề đối xứng và đúng 6 ô ở giữa bàn; tâm ô hàng hẹp lệch nửa trứng', () => {
    const s = createBubbleGame(1);
    expect(neighbors(0, 2, 4)).toHaveLength(6);
    for (const [r, c] of [[2, 4], [1, 3], [3, 0], [0, 9]] as const) {
      for (const n of neighbors(0, r, c)) expect(neighbors(0, n.r, n.c).some((x) => x.r === r && x.c === c)).toBe(true);
    }
    expect(cellCenter(s.shift, 0, 0).x).toBe(0.5);
    expect(cellCenter(s.shift, 1, 0).x).toBe(1);
    expect(cellCenter(s.shift, 1, 0).y).toBeCloseTo(0.5 + BUBBLE_SPEC.rowH, 6);
  });
});

describe('bubbleLogic: chọn loại trứng và bắn', () => {
  it('chưa chọn loại trứng thì không bắn được; chọn rồi bắn được và lựa chọn giữ nguyên sau phát bắn', () => {
    const s = playing(7);
    expect(s.selected).toBeNull();
    expect(canShoot(s)).toBe(false);
    expect(shoot(s, 90)).toBeNull();
    expect(s.stats.shots).toBe(0);
    const v = planOf(s).values;
    const i = v.findIndex((x) => presentValues(s).has(x));
    expect(selectType(s, i)).toBe(true);
    expect(canShoot(s)).toBe(true);
    const f = shoot(s, 90)!;
    expect(f.value).toBe(v[i]);
    expect(canShoot(s)).toBe(false); // đang bay
    land(s);
    if (presentValues(s).has(v[i])) expect(s.selected).toBe(i);
  });

  it('loại không còn trên bàn thì không chọn được (mờ trên khay)', () => {
    const s = playing(8);
    const v = planOf(s).values;
    setBoard(s, [[v[0], v[0]]]);
    expect(selectType(s, 1)).toBe(false);
    expect(selectType(s, 99)).toBe(false);
    expect(selectType(s, 0)).toBe(true);
    expect(s.selected).toBe(0);
  });

  it('bỏ chọn khi loại đang chọn hết khỏi bàn', () => {
    const s = playing(9);
    const [x, y] = planOf(s).values;
    setBoard(s, [[x, x, null, y]]);
    s.selected = 0;
    expect(drop(s, x, { r: 0, c: 2 }).some((e) => e.type === 'pop')).toBe(true);
    expect(s.selected).toBeNull();
  });

  it('góc bị kẹp trong 12 đến 168 độ', () => {
    const s = playing(1);
    selectType(s, planOf(s).values.findIndex((x) => presentValues(s).has(x)));
    expect(shoot(s, 3)!.angle).toBe(12);
    s.flying = null;
    expect(shoot(s, 179)!.angle).toBe(168);
  });
});

describe('bubbleLogic: đường bay, nảy tường, dính ô', () => {
  it('thẳng lên trên bàn trống thì chạm trần ở giữa, dính hàng 0', () => {
    const s = playing(1);
    s.board = [];
    const p = tracePath(s, 90);
    expect(p).toHaveLength(2);
    expect(p[1].x).toBeCloseTo(5, 6);
    expect(p[1].y).toBeCloseTo(0.5, 6);
    s.selected = 0;
    const f = shoot(s, 90)!;
    expect(f.cell.r).toBe(0);
  });

  it('góc xiên nảy tường: x luôn nằm trong [0,5; 9,5], đi lên, dừng ở trần; vạch ngắm (1 lần nảy) có tối đa 3 điểm', () => {
    const s = playing(1);
    s.board = [];
    const p = tracePath(s, 20);
    expect(p.length).toBeGreaterThanOrEqual(3);
    for (const q of p) {
      expect(q.x).toBeGreaterThanOrEqual(0.5 - 1e-9);
      expect(q.x).toBeLessThanOrEqual(9.5 + 1e-9);
    }
    for (let i = 1; i < p.length; i++) expect(p[i].y).toBeLessThan(p[i - 1].y);
    expect(p[p.length - 1].y).toBeCloseTo(0.5, 6);
    expect(tracePath(s, 20, 1).length).toBeLessThanOrEqual(3);
    // đối xứng trái phải
    const q = tracePath(s, 160);
    expect(q[q.length - 1].x).toBeCloseTo(10 - p[p.length - 1].x, 5);
  });

  it('chạm trứng thì dừng cách tâm trứng không quá hitDist và dính vào ô trống kề', () => {
    const s = playing(1);
    const [x] = planOf(s).values;
    setBoard(s, [[null, null, null, null, x, null, null, null, null, null]]);
    selectType(s, 0);
    const f = shoot(s, 90)!;
    const end = f.path[f.path.length - 1];
    const hit = cellCenter(s.shift, 0, 4);
    expect(Math.hypot(end.x - hit.x, end.y - hit.y)).toBeLessThanOrEqual(BUBBLE_SPEC.hitDist + 1e-6);
    expect(s.board[f.cell.r]?.[f.cell.c] ?? null).toBeNull();
    expect(neighbors(s.shift, f.cell.r, f.cell.c).some((n) => s.board[n.r]?.[n.c] === x) || f.cell.r === 0).toBe(true);
  });

  it('pointAlong nội suy dọc đường và dừng ở điểm cuối', () => {
    const path = [{ x: 0, y: 0 }, { x: 0, y: -4 }, { x: 3, y: -4 }];
    expect(pointAlong(path, 2)).toEqual({ x: 0, y: -2 });
    expect(pointAlong(path, 5)).toEqual({ x: 1, y: -4 });
    expect(pointAlong(path, 99)).toEqual({ x: 3, y: -4 });
  });
});

describe('bubbleLogic: vỡ, rơi, hạ bàn, tim, đợt', () => {
  it('từ 3 trứng cùng số liền nhau thì vỡ; hai trứng thì không', () => {
    const s = playing(10);
    const [x, y] = planOf(s).values;
    setBoard(s, [[x, x, null, y, y]]);
    const ev = drop(s, x, { r: 0, c: 2 });
    expect(ev.find((e) => e.type === 'pop')).toBeTruthy();
    expect(s.board[0].slice(0, 3)).toEqual([null, null, null]);
    expect(s.stats.popped).toBe(2); // trứng em bắn không tính điểm vỡ

    const t = playing(10);
    setBoard(t, [[x, null, null, y, y]]);
    const ev2 = drop(t, x, { r: 0, c: 1 });
    expect(ev2.some((e) => e.type === 'pop')).toBe(false);
    expect(t.board[0][0]).toBe(x);
    expect(t.board[0][1]).toBe(x);
  });

  it('trứng không còn nối với trần thì rơi (tính 20 điểm mỗi trứng)', () => {
    const s = playing(11);
    const [x, y, z] = planOf(s).values;
    // hàng 0: x x _ ; hàng 1 (hẹp): y dưới x x; hàng 2: z dưới y
    setBoard(s, [[x, x], [y], [z]]);
    const ev = drop(s, x, { r: 0, c: 2 });
    expect(ev.some((e) => e.type === 'pop')).toBe(true);
    const dropEv = ev.find((e) => e.type === 'drop');
    expect(dropEv && dropEv.type === 'drop' ? dropEv.cells.length : 0).toBe(2);
    expect(s.stats.dropped).toBe(2);
    expect(eggCount(s)).toBe(0);
  });

  it('trứng còn nối với trần bằng đường khác thì không rơi', () => {
    const s = playing(11);
    const [x, y] = planOf(s).values;
    setBoard(s, [[x, x, null, y], [y, y, y]]);
    const ev = drop(s, x, { r: 0, c: 2 });
    expect(ev.some((e) => e.type === 'drop')).toBe(false);
    expect(s.board[1][0]).toBe(y);
  });

  it('cứ 8 phát (đợt 3: 6 phát) cả bàn hạ một hàng, không thêm trứng', () => {
    for (const [round, every] of [[0, 8], [1, 8], [2, 6]] as const) {
      const s = playing(12, round);
      const [x, y] = planOf(s).values;
      // bàn lớn không vỡ: hai hàng xen kẽ x y, bắn vào hàng 0 trống cuối
      setBoard(s, [[x, y, x, y, x, y, x, y, x], [y, x, y, x, y, x, y, x]]);
      const eggs = eggCount(s);
      expect(shotsToDescend(s)).toBe(every);
      for (let k = 1; k <= every; k++) {
        s.flying = null;
        // đặt thêm vào cột 9 của hàng 0 rồi dọn lại để bàn không đổi số trứng
        const ev = drop(s, x === s.board[0][8] ? y : x, { r: 0, c: 9 });
        s.board[0][9] = null;
        if (k < every) expect(ev.some((e) => e.type === 'descend')).toBe(false);
        else expect(ev.some((e) => e.type === 'descend')).toBe(true);
      }
      expect(s.lowered).toBe(1);
      expect(eggCount(s)).toBe(eggs);
      expect(shotsToDescend(s)).toBe(every);
    }
  });

  it('trứng chạm dây giới hạn: mất 1 tim, xóa 2 hàng dưới cùng, chơi tiếp', () => {
    const s = playing(13);
    const [x, y] = planOf(s).values;
    setBoard(s, [[x, y, x], [y, x], [x, y, x], [y, x]]);
    s.lowered = BUBBLE_SPEC.limitRow - 3; // hàng 3 (thấp nhất) có chỉ số 3 + lowered = limitRow
    const eggs = eggCount(s);
    const ev = drop(s, y, { r: 0, c: 5 });
    const heart = ev.find((e) => e.type === 'heart');
    expect(heart).toBeTruthy();
    expect(s.hearts).toBe(BUBBLE_SPEC.hearts - 1);
    expect(s.stats.heartsLost).toBe(1);
    expect(s.phase).toBe('play');
    expect(s.board.length).toBeLessThanOrEqual(2);
    expect(s.board[2]).toBeUndefined();
    expect(eggCount(s)).toBeLessThan(eggs);
  });

  it('hết 3 tim thì hết ván (hearts)', () => {
    const s = playing(14);
    const [x, y] = planOf(s).values;
    setBoard(s, [[x, y], [y, x], [x, y]]);
    s.lowered = BUBBLE_SPEC.limitRow - 2;
    s.hearts = 1;
    const ev = drop(s, y, { r: 0, c: 6 });
    expect(ev.some((e) => e.type === 'end' && e.reason === 'hearts')).toBe(true);
    expect(s.phase).toBe('ended');
    expect(s.end).toBe('hearts');
    expect(s.hearts).toBe(0);
  });

  it('sạch bàn thì sang đợt nạp kế tiếp (+100); sạch bàn đợt 3 thì thắng', () => {
    const s = playing(15);
    const [x] = planOf(s).values;
    setBoard(s, [[x, x]]);
    const ev = drop(s, x, { r: 0, c: 2 });
    expect(ev.some((e) => e.type === 'roundClear')).toBe(true);
    expect(s.phase).toBe('load');
    expect(s.round).toBe(1);
    expect(s.stats.roundsCleared).toBe(1);
    expect(s.lowered).toBe(0);

    const w = playing(15, 2);
    const [y] = planOf(w).values;
    setBoard(w, [[y, y]]);
    const ev2 = drop(w, y, { r: 0, c: 2 });
    expect(ev2.some((e) => e.type === 'end' && e.reason === 'win')).toBe(true);
    expect(w.phase).toBe('ended');
    expect(w.end).toBe('win');
    expect(w.stats.roundsCleared).toBe(1);
  });
});

describe('bubbleLogic: điểm và tất định', () => {
  it('điểm = vỡ × 10 + rơi × 20 + 30 mỗi đợt nạp không sai + 100 mỗi đợt xong + tim còn × 50 (cộng lúc hết ván)', () => {
    const s = createBubbleGame(1);
    s.stats = { ...s.stats, popped: 10, dropped: 4, cleanLoads: 2, roundsCleared: 2 };
    expect(bubbleScore(s)).toBe(100 + 80 + 60 + 200);
    s.phase = 'ended';
    s.hearts = 2;
    expect(bubbleScore(s)).toBe(100 + 80 + 60 + 200 + 100);
    s.hearts = 0;
    expect(bubbleScore(s)).toBe(440);
  });

  it('điểm tối đa lý thuyết lớn hơn điểm tối đa 750 của game cũ', () => {
    expect(bubbleMaxScore()).toBe(4360);
    expect(bubbleMaxScore()).toBeGreaterThan(750);
    expect(bubbleMaxScore()).toBeGreaterThan(BUBBLE_SPEC.medals[2]);
  });

  it('cùng seed và cùng thao tác thì cùng ván', () => {
    const run = () => {
      const s = playing(77);
      const out: unknown[] = [];
      for (let i = 0; i < 12 && s.phase === 'play'; i++) {
        const idx = planOf(s).values.findIndex((v) => presentValues(s).has(v));
        selectType(s, idx);
        shootAndLand(s, 40 + i * 9);
        out.push(JSON.stringify(s.board), s.hearts, s.stats.popped);
      }
      return out;
    };
    expect(run()).toEqual(run());
  });

  it('mốc điểm tăng dần', () => {
    const [d, b, v] = BUBBLE_SPEC.medals;
    expect(d).toBeLessThan(b);
    expect(b).toBeLessThan(v);
  });
});

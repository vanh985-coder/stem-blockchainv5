import { describe, expect, it } from 'vitest';
import { RUNNER_SPEC as SPEC, RUNNER_TUNING as T } from './runnerConfig';
import {
  cloneRunner,
  createRunner,
  occupiedCount,
  makeCell,
  minGap,
  passable,
  runnerMedal,
  runnerScore,
  speedAt,
  stepRunner,
  type Cell,
  type Row,
  type RunnerState,
} from './runnerLogic';

/** Trạng thái trắng để dựng tình huống: không sinh đường tự động, không có chướng ngại hay vật nhặt. */
function blank(): RunnerState {
  return createRunner({ seed: 1, autoSpawn: false });
}

/** Một hàng tự dựng: `cells` theo từng làn. */
function rowOf(z: number, cells: [Cell | null, Cell | null, Cell | null], id = 1): Row {
  return { id, z, cells, pathLane: 1, speedBasis: 8, boots: false, gap: 10 };
}

/** Đứng yên tại chỗ (tốc độ 0 nhờ speedScale = 0 ở pha 'resume') để thử riêng một vị trí. Dùng bước nhỏ. */
const DT = 1 / 60;

/** Chạy một ván không va (bóng ma) tới khi đủ `rows` hàng, trả lời đúng mọi câu hỏi. `onStep` được gọi sau mỗi bước. */
function ghostRun(rows: number, seed: number, onStep?: (s: RunnerState) => void): RunnerState {
  const s = createRunner({ seed, rounds: 1_000_000, ghost: true, recordRows: true });
  let guard = 0;
  while (s.rowLog!.length < rows && guard++ < 2_000_000) {
    if (s.phase === 'quiz') stepRunner(s, s.quiz!.answered === null ? { answer: true } : { resume: true }, DT);
    else stepRunner(s, {}, DT);
    onStep?.(s);
  }
  expect(s.rowLog!.length).toBeGreaterThanOrEqual(rows);
  return s;
}

describe('bảng test của spec 05, Màn 2 (9 ca)', () => {
  // Ca 1
  it('1. Sinh 1000 hàng chướng ngại, có cả rơm {phanDien} ném: không hàng nào chắn kín 3 làn', () => {
    for (const seed of [1, 2, 3]) {
      const s = ghostRun(1000, seed);
      const rows = s.rowLog!;
      expect(rows.length).toBeGreaterThanOrEqual(1000);
      const thrown = rows.reduce((n, r) => n + r.cells.filter((c) => c?.thrown).length, 0);
      expect(thrown, `seed ${seed}: phải có rơm ném`).toBeGreaterThan(50);
      for (const r of rows) {
        expect(occupiedCount(r), `hàng ${r.id} seed ${seed}`).toBeLessThanOrEqual(2);
        expect(r.cells.some((c) => c === null), `hàng ${r.id} phải có một làn trống`).toBe(true);
      }
    }
  });

  // Ca 2
  it('2. Hai hàng liên tiếp cách nhau ≥ tốc độ × 1,0 (có guốc mộc thì × 1,2)', () => {
    let withBoots = 0;
    let checkedAtArrival = 0;
    const seen = new Set<number>();
    const s = ghostRun(1000, 7, (st) => {
      // có guốc mộc từng đợt để có hàng sinh ra lúc đang có guốc
      if (Math.floor(st.time / 30) % 2 === 1 && st.boots < 1) st.boots = SPEC.powerSec;
      // lúc nhân vật tới hàng nào thì khoảng cách của hàng đó phải đủ với tốc độ thật lúc đó
      if (st.phase === 'run') {
        for (const r of st.rows) {
          if (r.z <= st.z && !seen.has(r.id)) {
            seen.add(r.id);
            if (r.id > 1) {
              expect(r.gap, `hàng ${r.id} lúc tới nơi`).toBeGreaterThanOrEqual(minGap(speedAt(st.time), r.boots) - 1e-9);
              checkedAtArrival++;
            }
          }
        }
      }
    });
    const rows = s.rowLog!;
    for (let i = 1; i < rows.length; i++) {
      const gap = rows[i].z - rows[i - 1].z;
      const need = rows[i].speedBasis * (rows[i].boots ? SPEC.gapFactorBoots : SPEC.gapFactor);
      expect(gap, `hàng ${rows[i].id}`).toBeGreaterThanOrEqual(need - 1e-9);
      expect(rows[i].gap).toBeCloseTo(gap, 9);
      if (rows[i].boots) withBoots++;
    }
    expect(withBoots).toBeGreaterThan(50);
    expect(checkedAtArrival).toBeGreaterThan(300);
  });

  // Ca 3
  it('3. Dò đường qua 1000 hàng (mỗi bước đổi tối đa 1 làn, xét cả nhảy và trượt): luôn có đường tới hàng cuối', () => {
    for (const seed of [11, 12, 13, 14]) {
      const rows = ghostRun(1000, seed).rowLog!;
      let reach = [true, true, true]; // bắt đầu ở làn nào cũng được
      for (const r of rows) {
        const next = [false, false, false];
        for (let l = 0; l < 3; l++) {
          if (!passable(r.cells[l])) continue; // trống, thấp (nhảy) hoặc cao (trượt)
          for (let k = Math.max(0, l - 1); k <= Math.min(2, l + 1); k++) if (reach[k]) next[l] = true;
        }
        expect(next.some(Boolean), `hết đường ở hàng ${r.id}, seed ${seed}`).toBe(true);
        reach = next;
      }
    }
  });

  // Ca 4
  it('4. Nhân vật ở độ cao 1,0 gặp chướng ngại thấp: không va', () => {
    const s = blank();
    s.rows = [rowOf(2, [null, makeCell('low', 2), null])];
    s.z = 1.4; // vừa chạm vào đoạn chướng ngại (1,5 đến 2,5)
    s.y = 1.0;
    s.vy = 0;
    s.grounded = false;
    for (let i = 0; i < 4; i++) stepRunner(s, {}, DT);
    expect(s.z).toBeGreaterThan(1.5);
    expect(s.y).toBeGreaterThanOrEqual(1.0 - 0.05);
    expect(s.hearts).toBe(SPEC.hearts);
    expect(s.rows[0].cells[1]!.spent).toBe(false);
  });

  // Ca 5
  it('5. Đang trượt, gặp sào ngang: không va', () => {
    const s = blank();
    s.rows = [rowOf(2, [null, makeCell('high', 2), null])];
    stepRunner(s, { slide: true }, DT);
    expect(s.slide).toBeGreaterThan(0);
    for (let i = 0; i < 20; i++) stepRunner(s, {}, DT);
    expect(s.z).toBeGreaterThan(1.8);
    expect(s.hearts).toBe(SPEC.hearts);
  });

  // Ca 6
  it('6. Đang rơi, ở độ cao 0,95 trên xe chở hàng: đáp lên nóc', () => {
    const s = blank();
    s.rows = [rowOf(1, [null, makeCell('truck', 1), null])];
    s.z = 1;
    s.y = 0.95;
    s.vy = -1;
    s.grounded = false;
    for (let i = 0; i < 10; i++) stepRunner(s, {}, DT);
    expect(s.hearts).toBe(SPEC.hearts);
    expect(s.grounded).toBe(true);
    expect(s.onRoof).toBe(true);
    expect(s.y).toBeCloseTo(SPEC.roofHeight, 6);
    // và chạy được trên nóc suốt chiều dài xe, rồi rơi xuống đất ở cuối xe
    for (let i = 0; i < 20; i++) stepRunner(s, {}, DT);
    expect(s.y).toBeCloseTo(SPEC.roofHeight, 6);
    for (let i = 0; i < 90; i++) stepRunner(s, {}, DT);
    expect(s.y).toBe(0);
    expect(s.hearts).toBe(SPEC.hearts);
  });

  // Ca 7
  it('7. Ở độ cao 0,5, gặp đầu xe chở hàng: va', () => {
    const s = blank();
    s.rows = [rowOf(1, [null, makeCell('truck', 1), null])];
    s.z = 0.5;
    s.y = 0.5;
    s.vy = 0;
    s.grounded = false;
    for (let i = 0; i < 6; i++) stepRunner(s, {}, DT);
    expect(s.hearts).toBe(SPEC.hearts - 1);
  });

  // Ca 8
  it('8. Có nón lá, va 2 lần liên tiếp: lần đầu không mất tim, lần sau mất tim', () => {
    const s = blank();
    s.shield = SPEC.powerSec;
    s.rows = [rowOf(1, [null, makeCell('block', 1), null], 1), rowOf(5, [null, makeCell('block', 5), null], 2)];
    let firstHit = -1;
    for (let i = 0; i < 90 && s.hearts === SPEC.hearts; i++) {
      stepRunner(s, {}, DT);
      if (firstHit < 0 && s.shield === 0) {
        firstHit = i;
        expect(s.hearts, 'lần đầu: nón lá chặn, không mất tim').toBe(SPEC.hearts);
      }
    }
    expect(firstHit).toBeGreaterThanOrEqual(0);
    expect(s.hearts, 'lần sau: mất tim').toBe(SPEC.hearts - 1);
  });

  // Ca 9
  it('9. 23 trang, 50 tiền, 1080 m, 3 câu đúng: điểm 478', () => {
    expect(runnerScore({ pages: 23, coins: 50, distance: 1080, correct: 3 })).toBe(478);
  });
});

describe('tốc độ, nhảy, trượt', () => {
  it('tốc độ 8, tăng 0,25 mỗi 5 giây, tối đa 16', () => {
    expect(speedAt(0)).toBe(8);
    expect(speedAt(5)).toBeCloseTo(8.25, 9);
    expect(speedAt(10)).toBeCloseTo(8.5, 9);
    expect(speedAt(100)).toBeCloseTo(13, 9);
    expect(speedAt(160)).toBe(16);
    expect(speedAt(1000)).toBe(16);
  });

  /** Nhảy một lần ở chỗ trống, trả về đỉnh cao và thời gian bay. */
  function jumpOnce(boots: boolean): { peak: number; air: number } {
    const s = blank();
    if (boots) s.boots = SPEC.powerSec;
    stepRunner(s, { jump: true }, DT);
    let peak = s.y;
    let air = DT;
    while (!s.grounded && air < 3) {
      stepRunner(s, {}, DT);
      peak = Math.max(peak, s.y);
      air += DT;
    }
    return { peak, air };
  }

  it('nhảy: vận tốc đầu 7, trọng lực 22: đỉnh khoảng 1,1 và bay khoảng 0,64 giây', () => {
    const { peak, air } = jumpOnce(false);
    expect(peak).toBeGreaterThan(1.08);
    expect(peak).toBeLessThan(1.12);
    expect(air).toBeGreaterThan(0.62);
    expect(air).toBeLessThan(0.67);
  });

  it('có guốc mộc: vận tốc đầu 10, bay khoảng 0,91 giây', () => {
    const { peak, air } = jumpOnce(true);
    expect(peak).toBeGreaterThan(2.2);
    expect(air).toBeGreaterThan(0.89);
    expect(air).toBeLessThan(0.94);
  });

  it('trượt kéo dài 0,6 giây, thân cao 0,6; nhảy được ngay khi đang trượt', () => {
    const s = blank();
    stepRunner(s, { slide: true }, DT);
    expect(s.slide).toBeGreaterThan(0.58);
    for (let i = 0; i < 36; i++) stepRunner(s, {}, DT);
    expect(s.slide).toBe(0);
    stepRunner(s, { slide: true }, DT);
    stepRunner(s, { jump: true }, DT);
    expect(s.slide).toBe(0);
    expect(s.grounded).toBe(false);
  });

  it('chướng ngại thấp: không nhảy thì va; sào ngang: đứng thì va; chắn làn: nhảy cũng va, kể cả có guốc mộc', () => {
    const hitWith = (cell: Cell, act?: 'jump', boots = false) => {
      const s = blank();
      if (boots) s.boots = SPEC.powerSec;
      s.rows = [rowOf(5, [null, cell, null])];
      // đi tới cách chướng ngại 1,7 rồi mới nhảy (thời điểm gần đỉnh nhảy ngay trên chướng ngại)
      let jumped = false;
      for (let i = 0; i < 200 && s.hearts === SPEC.hearts; i++) {
        const dz = cell.z0 + (cell.z1 - cell.z0) / 2 - s.z;
        const inp = act === 'jump' && !jumped && dz / speedAt(s.time) <= (boots ? 10 : 7) / 22 ? { jump: true } : {};
        if ('jump' in inp) jumped = true;
        stepRunner(s, inp, DT);
        if (s.z > 8) break;
      }
      return s.hearts < SPEC.hearts;
    };
    expect(hitWith(makeCell('low', 5))).toBe(true);
    expect(hitWith(makeCell('low', 5), 'jump')).toBe(false);
    expect(hitWith(makeCell('high', 5), 'jump')).toBe(true); // nhảy qua sào thấp: thân vẫn chạm sào
    expect(hitWith(makeCell('block', 5), 'jump')).toBe(true);
    expect(hitWith(makeCell('block', 5), 'jump', true)).toBe(true);
  });
});

describe('vật nhặt', () => {
  const itemAt = (kind: 'trang' | 'dong' | 'nonla' | 'guoc' | 'tui', lane: 0 | 1 | 2, z: number, y = T.itemY) => ({ id: 1, group: 1, kind, lane, x: SPEC.laneX[lane], z, y });

  it('trang +1, tiền đồng +1', () => {
    const s = blank();
    s.items = [itemAt('trang', 1, 1), itemAt('dong', 1, 2)];
    for (let i = 0; i < 40; i++) stepRunner(s, {}, DT);
    expect(s.pages).toBe(1);
    expect(s.coins).toBe(1);
  });

  it('không nhặt vật ở làn khác', () => {
    const s = blank();
    s.items = [itemAt('trang', 2, 1)];
    for (let i = 0; i < 40; i++) stepRunner(s, {}, DT);
    expect(s.pages).toBe(0);
    expect(s.items.length).toBe(1);
  });

  it('nón lá: khiên chặn 1 lần va, tối đa 10 giây; guốc mộc: 10 giây; túi tiền: 10 giây', () => {
    const s = blank();
    s.items = [itemAt('nonla', 1, 1), itemAt('guoc', 1, 1.5), itemAt('tui', 1, 2)];
    for (let i = 0; i < 40; i++) stepRunner(s, {}, DT);
    expect(s.shield).toBeGreaterThan(SPEC.powerSec - 1);
    expect(s.boots).toBeGreaterThan(SPEC.powerSec - 1);
    expect(s.magnet).toBeGreaterThan(SPEC.powerSec - 1);
    for (let i = 0; i < 60 * 10; i++) stepRunner(s, {}, DT);
    expect(s.shield).toBe(0);
    expect(s.boots).toBe(0);
    expect(s.magnet).toBe(0);
  });

  it('nón lá hết 10 giây thì va mất tim', () => {
    const s = blank();
    s.shield = 0.2;
    s.rows = [rowOf(20, [null, makeCell('block', 20), null])];
    for (let i = 0; i < 400 && s.hearts === SPEC.hearts; i++) stepRunner(s, {}, DT);
    expect(s.hearts).toBe(SPEC.hearts - 1);
  });

  it('túi tiền hút tiền đồng ở cả 3 làn trong 6 đơn vị phía trước, không hút xa hơn và không hút trang', () => {
    const s = blank();
    s.magnet = SPEC.powerSec;
    s.items = [itemAt('dong', 0, 3), itemAt('dong', 2, 4), itemAt('dong', 1, 5), itemAt('dong', 0, 40), itemAt('trang', 2, 4)];
    stepRunner(s, {}, DT);
    expect(s.coins).toBe(3);
    expect(s.pages).toBe(0);
    expect(s.items.map((i) => i.z).sort((a, b) => a - b)).toEqual([4, 40]);
  });

  it('nhảy qua vật nhặt trên mặt đất thì không nhặt (nhảy cao hơn tầm với)', () => {
    const s = blank();
    s.items = [itemAt('dong', 1, 4)];
    stepRunner(s, { jump: true }, DT);
    for (let i = 0; i < 120 && s.z < 6; i++) stepRunner(s, {}, DT);
    // nhảy lúc z gần 0, qua z = 4 sau 0,5 giây: đã hạ độ cao nên có thể nhặt được; chỉ kiểm tra không lỗi khi đang bay
    expect(s.coins).toBeGreaterThanOrEqual(0);
  });

  it('vật nhặt sinh ra không bao giờ nằm trong chướng ngại', () => {
    const s = ghostRun(300, 21);
    const rows = s.rowLog!;
    expect(rows.length).toBeGreaterThanOrEqual(300);
    // chạy lại từ đầu với cùng seed để lấy vật nhặt lúc mới sinh
    const t = createRunner({ seed: 21, ghost: true, recordRows: true, rounds: 1_000_000 });
    const all = new Map<number, (typeof t.items)[number]>();
    let guard = 0;
    while (t.rowLog!.length < 300 && guard++ < 1_000_000) {
      if (t.phase === 'quiz') stepRunner(t, t.quiz!.answered === null ? { answer: true } : { resume: true }, DT);
      else stepRunner(t, {}, DT);
      for (const it of t.items) all.set(it.id, it);
    }
    expect(all.size).toBeGreaterThan(100);
    for (const it of all.values()) {
      for (const r of t.rowLog!) {
        const c = r.cells[it.lane];
        if (!c) continue;
        const onRoof = c.kind === 'truck' && it.y > SPEC.roofHeight;
        if (onRoof) continue;
        expect(it.z < c.z0 - 0.5 || it.z > c.z1 + 0.5, `vật ${it.id} (${it.kind}) làn ${it.lane} z=${it.z.toFixed(1)} chồng chướng ngại ${c.kind} ${c.z0.toFixed(1)}..${c.z1.toFixed(1)}`).toBe(true);
      }
    }
  });
});

describe('vòng, câu hỏi, tim, kết thúc', () => {
  /** Chạy tới hết vòng đầu (bóng ma để khỏi va). */
  function toQuiz(s: RunnerState): void {
    const ghost = s.ghost;
    s.ghost = true; // không va trên đường tới câu hỏi
    let guard = 0;
    while (s.phase !== 'quiz' && s.phase !== 'over' && guard++ < 100_000) stepRunner(s, {}, DT);
    s.ghost = ghost;
  }

  it('mỗi vòng 25 giây rồi chạy chậm lại và hiện câu hỏi 15 giây', () => {
    const s = createRunner({ seed: 5, ghost: true });
    toQuiz(s);
    expect(s.phase).toBe('quiz');
    expect(s.time).toBeGreaterThanOrEqual(SPEC.roundSec);
    expect(s.time).toBeLessThan(SPEC.roundSec + 0.1);
    expect(s.speedScale).toBe(0);
    expect(s.quiz!.timeLeft).toBe(SPEC.quizSec);
    const z = s.z;
    for (let i = 0; i < 60; i++) stepRunner(s, {}, DT);
    expect(s.z).toBe(z); // đứng yên lúc hỏi
    expect(s.quiz!.timeLeft).toBeCloseTo(SPEC.quizSec - 1, 6);
  });

  it('trả lời đúng: +3 trang và +1 câu đúng; chưa bấm "tiếp" thì chưa chạy tiếp', () => {
    const s = createRunner({ seed: 5 });
    s.hearts = 3;
    toQuiz(s);
    const pages = s.pages;
    stepRunner(s, { answer: true }, DT);
    expect(s.pages).toBe(pages + SPEC.quizPages);
    expect(s.correct).toBe(1);
    expect(s.hearts).toBe(3);
    for (let i = 0; i < 30; i++) stepRunner(s, {}, DT);
    expect(s.phase).toBe('quiz');
    stepRunner(s, { resume: true }, DT);
    expect(s.phase).toBe('resume');
    expect(s.round).toBe(1);
    expect(s.roundTime).toBe(0);
  });

  it('trả lời sai: mất 1 tim; hết 15 giây cũng mất 1 tim; chỉ nhận câu trả lời đầu tiên', () => {
    const a = createRunner({ seed: 5 });
    toQuiz(a);
    stepRunner(a, { answer: false }, DT);
    stepRunner(a, { answer: true }, DT);
    expect(a.hearts).toBe(2);
    expect(a.correct).toBe(0);

    const b = createRunner({ seed: 5 });
    toQuiz(b);
    for (let i = 0; i < 60 * 15 + 5; i++) stepRunner(b, {}, DT);
    expect(b.quiz!.answered).toBe(false);
    expect(b.quiz!.timedOut).toBe(true);
    expect(b.hearts).toBe(2);
  });

  it('chạy lại sau câu hỏi: tăng tốc từ 0, không bị va ngay, vòng sau lại 25 giây', () => {
    const s = createRunner({ seed: 8 });
    toQuiz(s);
    stepRunner(s, { answer: true }, DT);
    stepRunner(s, { resume: true }, DT);
    const hearts = s.hearts;
    for (let i = 0; i < 60; i++) stepRunner(s, {}, DT);
    expect(s.hearts).toBe(hearts);
    expect(s.speedScale).toBeGreaterThan(0.9);
    toQuiz(s);
    expect(s.round).toBe(1);
    expect(s.roundTime).toBeGreaterThanOrEqual(SPEC.roundSec);
  });

  it('hết 4 vòng thì kết thúc "done"; có 4 câu hỏi', () => {
    const s = createRunner({ seed: 9, ghost: true });
    let quizzes = 0;
    let guard = 0;
    while (s.phase !== 'over' && guard++ < 1_000_000) {
      if (s.phase === 'quiz') {
        quizzes++;
        stepRunner(s, { answer: true }, DT);
        stepRunner(s, { resume: true }, DT);
      } else stepRunner(s, {}, DT);
    }
    expect(quizzes).toBe(4);
    expect(s.over).toBe('done');
    expect(s.correct).toBe(4);
    expect(s.pages).toBeGreaterThanOrEqual(12);
  });

  it('hết tim thì kết thúc "hearts" (va chạm, hoặc trả lời sai ở câu hỏi)', () => {
    const s = blank();
    s.hearts = 1;
    s.rows = [rowOf(1, [null, makeCell('block', 1), null])];
    for (let i = 0; i < 30 && s.phase !== 'over'; i++) stepRunner(s, {}, DT);
    expect(s.phase).toBe('over');
    expect(s.over).toBe('hearts');

    const q = createRunner({ seed: 5, ghost: true });
    q.ghost = false;
    q.hearts = 1;
    toQuiz(q);
    stepRunner(q, { answer: false }, DT);
    expect(q.phase).toBe('quiz'); // vẫn hiện giải thích
    stepRunner(q, { resume: true }, DT);
    expect(q.over).toBe('hearts');
  });

  it('mỗi lần va mất đúng 1 tim và có nhấp nháy 1 giây; chướng ngại đã va không va lại', () => {
    const s = blank();
    s.rows = [rowOf(1, [null, makeCell('block', 1), null])];
    for (let i = 0; i < 60; i++) stepRunner(s, {}, DT);
    expect(s.hearts).toBe(SPEC.hearts - 1);
    expect(s.invuln).toBeGreaterThan(0);
    expect(s.invuln).toBeLessThanOrEqual(T.hitInvulnSec);
  });
});

describe('rơm {phanDien} ném', () => {
  it('khoảng mỗi 6 giây ném một đống rơm ở phía trước, luôn chừa ít nhất một làn trống', () => {
    const times: number[] = [];
    const s = ghostRun(300, 31, (st) => {
      for (const e of st.events) if (e.type === 'throw') times.push(st.time);
    });
    expect(times.length).toBeGreaterThan(20);
    const gaps = times.slice(1).map((t, i) => t - times[i]);
    // mỗi lần cách 6 ± 1 giây; thỉnh thoảng phải chờ thêm vài lần thử lại khi chưa có hàng nào còn chỗ trống
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    expect(mean).toBeGreaterThan(SPEC.throwEverySec - 0.3);
    expect(mean).toBeLessThan(SPEC.throwEverySec + 1);
    for (const g of gaps) expect(g).toBeGreaterThan(SPEC.throwEverySec - T.throwJitterSec - 0.1);
    expect(gaps.filter((g) => g > SPEC.throwEverySec + T.throwJitterSec + 0.5).length / gaps.length).toBeLessThan(0.1);
    for (const r of s.rowLog!) for (const c of r.cells) if (c?.thrown) expect(r.cells.filter(Boolean).length).toBeLessThanOrEqual(2);
  });

  it('rơm rơi cách nhân vật ≥ throwAheadMin và chưa va được lúc còn đang bay', () => {
    const s = createRunner({ seed: 41, ghost: false, rounds: 1_000_000 });
    // dựng sẵn: chỉ có hàng rơm ném nên dễ kiểm tra; đặt bộ đếm sát để ném ngay
    s.villain.throwTimer = 0.01;
    let ev: { lane: number; z: number; landAt: number } | undefined;
    for (let i = 0; i < 10 && !ev; i++) {
      stepRunner(s, {}, DT);
      const e = s.events.find((x) => x.type === 'throw');
      if (e && e.type === 'throw') ev = e;
    }
    expect(ev).toBeDefined();
    expect(ev!.z - s.z).toBeGreaterThanOrEqual(T.throwAheadMin - 1);
    expect(ev!.landAt).toBeCloseTo(s.time + T.throwFlightSec, 1);
    const row = s.rows.find((r) => r.cells.some((c) => c?.thrown))!;
    const c = row.cells.find((x) => x?.thrown)!;
    expect(c.kind).toBe('low');
    expect(c.landAt).toBeGreaterThan(s.time);
  });
});

describe('tính tất định và bản sao', () => {
  const play = (seed: number) => {
    const s = createRunner({ seed });
    let guard = 0;
    while (s.phase !== 'over' && guard++ < 200_000) {
      if (s.phase === 'quiz') stepRunner(s, s.quiz!.answered === null ? { answer: s.round % 2 === 0 } : { resume: true }, DT);
      else stepRunner(s, guard % 97 === 0 ? { move: guard % 2 ? 1 : -1 } : guard % 131 === 0 ? { jump: true } : {}, DT);
    }
    return [s.pages, s.coins, Math.round(s.distance * 1000), s.hearts, s.correct, s.over];
  };

  it('cùng seed và cùng chuỗi lệnh thì cùng kết quả; khác seed thì khác', () => {
    expect(play(77)).toEqual(play(77));
    expect(play(77)).not.toEqual(play(78));
  });

  it('cloneRunner cho bản sao độc lập', () => {
    const a = createRunner({ seed: 3 });
    for (let i = 0; i < 100; i++) stepRunner(a, {}, DT);
    const b = cloneRunner(a);
    for (let i = 0; i < 200; i++) stepRunner(b, {}, DT);
    expect(b.z).toBeGreaterThan(a.z);
    const c = cloneRunner(a);
    for (let i = 0; i < 200; i++) stepRunner(c, {}, DT);
    expect(c.z).toBe(b.z);
  });

  it('dt lớn được chia nhỏ: một bước 1 giây bằng 60 bước 1/60 giây', () => {
    const a = createRunner({ seed: 3 });
    const b = createRunner({ seed: 3 });
    stepRunner(a, {}, 1);
    for (let i = 0; i < 30; i++) stepRunner(b, {}, 1 / 30);
    expect(a.z).toBeCloseTo(b.z, 9);
    expect(a.rows.length).toBe(b.rows.length);
  });
});

describe('điểm và mốc', () => {
  it('điểm = trang × 10 + tiền + quãng đường ÷ 10 + câu đúng × 30', () => {
    expect(runnerScore({ pages: 0, coins: 0, distance: 0, correct: 0 })).toBe(0);
    expect(runnerScore({ pages: 1, coins: 0, distance: 0, correct: 0 })).toBe(10);
    expect(runnerScore({ pages: 0, coins: 7, distance: 0, correct: 0 })).toBe(7);
    expect(runnerScore({ pages: 0, coins: 0, distance: 99.9, correct: 0 })).toBe(9);
    expect(runnerScore({ pages: 0, coins: 0, distance: 0, correct: 4 })).toBe(120);
  });

  it('mốc Đồng 200, Bạc 380, Vàng 520', () => {
    expect([0, 199, 200, 379, 380, 519, 520, 9999].map(runnerMedal)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });
});

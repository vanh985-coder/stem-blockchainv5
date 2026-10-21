import { describe, expect, it } from 'vitest';
import { pageCode } from '@so-chung/core/lessons/bai-1/logic';
import { REBUILD_KEEP as K, REBUILD_SPEC as SPEC } from './rebuildConfig';
import {
  advance,
  beginKeep,
  binFromSlot,
  binFromTable,
  checkPlacement,
  createRebuild,
  formulaHolds,
  keepChainStatus,
  keepHalf,
  keepUnfixed,
  placeInSlot,
  rebuildScore,
  scoreParts,
  stepKeep,
  swapIntervalAt,
  swapSchedule,
  type KeepEvent,
  type RebuildState,
} from './rebuildLogic';

/** Ván đã ở vòng 3 (qua hai vòng đầu bằng cách đặt thẳng trạng thái), đồng hồ chưa chạy. */
function atKeep(seed: number): RebuildState {
  const s = createRebuild(seed);
  s.round = 2;
  s.hearts = SPEC.hearts;
  // dùng đường chính thức của vòng: advance từ vòng 2 sang 3
  s.round = 1;
  s.phase = 'roundDone';
  advance(s);
  return s;
}

function swaps(events: readonly KeepEvent[]): Extract<KeepEvent, { kind: 'swap' }>[] {
  return events.filter((e): e is Extract<KeepEvent, { kind: 'swap' }> => e.kind === 'swap');
}

describe('lịch tráo: khoảng cách giảm từ 9 giây xuống 5 giây', () => {
  it('khoảng cách tại giây 0 là 9, giữa vòng 7, hết vòng 5; luôn nằm trong [5, 9] và không tăng', () => {
    expect(swapIntervalAt(0)).toBe(9);
    expect(swapIntervalAt(45)).toBeCloseTo(7, 10);
    expect(swapIntervalAt(90)).toBe(5);
    expect(swapIntervalAt(-5)).toBe(9);
    expect(swapIntervalAt(500)).toBe(5);
    let prev = Infinity;
    for (let t = 0; t <= 90; t += 0.5) {
      const v = swapIntervalAt(t);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(9);
      expect(v).toBeLessThanOrEqual(prev);
      prev = v;
    }
  });

  it('lịch tráo: bắt đầu ở giây 6, các khoảng giảm dần và nằm trong [5, 9], không tráo trong 6 giây cuối', () => {
    const times = swapSchedule();
    expect(times[0]).toBe(6);
    expect(times.length).toBe(12);
    expect(times.map((t) => Math.round(t * 10) / 10)).toEqual([6, 14.7, 23.1, 31.1, 38.7, 46, 52.9, 59.6, 65.9, 72, 77.8, 83.3]);
    const gaps = times.slice(1).map((t, i) => t - times[i]);
    for (let i = 0; i < gaps.length; i++) {
      expect(gaps[i]).toBeGreaterThanOrEqual(5);
      expect(gaps[i]).toBeLessThanOrEqual(9);
      if (i > 0) expect(gaps[i]).toBeLessThan(gaps[i - 1]);
    }
    expect(gaps[0]).toBeGreaterThan(8);
    expect(gaps[gaps.length - 1]).toBeLessThan(5.6);
    expect(gaps[gaps.length - 1]).toBeGreaterThan(5);
    expect(times[times.length - 1]).toBeLessThanOrEqual(K.seconds - K.noSwapLast);
  });

  it('chạy đồng hồ đúng lịch: các lần tráo xảy ra đúng giờ của lịch (học sinh sửa ngay)', () => {
    const s = atKeep(1);
    beginKeep(s);
    const at: number[] = [];
    for (let i = 0; i < 1200 && s.phase === 'keep'; i++) {
      for (const e of swaps(stepKeep(s, 0.1))) {
        at.push(e.at);
        binFromSlot(s, e.slot);
        placeInSlot(s, e.real.id, e.slot);
      }
    }
    expect(at).toEqual(swapSchedule());
  });

  it('dt lớn (3 giây một bước) cho cùng các lần tráo theo thứ tự thời gian', () => {
    const s = atKeep(2);
    beginKeep(s);
    const at: number[] = [];
    for (let i = 0; i < 40 && s.phase === 'keep'; i++) {
      for (const e of stepKeep(s, 3)) {
        if (e.kind === 'swap') {
          at.push(e.at);
          binFromSlot(s, e.slot);
          placeInSlot(s, e.real.id, e.slot);
        }
      }
    }
    expect(at).toEqual(swapSchedule());
  });
});

describe('vòng 3: chuỗi và trang tráo', () => {
  it('bắt đầu: chuỗi 6 trang thật khớp công thức và mã trước, mã khác nhau; mặt bàn trống; đồng hồ chưa chạy', () => {
    const s = atKeep(3);
    const k = s.keep!;
    expect(s.phase).toBe('keep');
    expect(k.running).toBe(false);
    expect(k.slots).toHaveLength(6);
    expect(new Set([s.deal.genesis, ...k.slots.map((c) => c!.code)]).size).toBe(7);
    let tail = s.deal.genesis;
    for (const c of k.slots) {
      expect(checkPlacement(tail, c!)).toBe('ok');
      tail = c!.code;
    }
    expect(s.tray).toHaveLength(0);
    expect(keepChainStatus(k)).toBe('dung');
    // chưa beginKeep thì đồng hồ đứng yên
    expect(stepKeep(s, 30)).toHaveLength(0);
    expect(k.elapsed).toBe(0);
  });

  it('300 ván, học sinh không sửa gì: trang giả luôn sai công thức, giữ mã trước và mã trang của trang thật, và đúng 1 trang mồi đi kèm mỗi lần tráo', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const s = atKeep(seed);
      beginKeep(s);
      const real = s.keep!.slots.slice();
      const ev = swaps(stepKeep(s, 30));
      expect(ev.length).toBeGreaterThan(0);
      for (const e of ev) {
        expect(formulaHolds(e.fake)).toBe(false);
        expect(e.fake.code).not.toBe(pageCode(e.fake.prev, e.fake.content));
        expect(e.fake.prev).toBe(real[e.slot]!.prev);
        expect(e.fake.code).toBe(real[e.slot]!.code);
        expect(e.fake.content).not.toBe(real[e.slot]!.content);
        expect(e.real).toBe(real[e.slot]);
        // trang mồi: đúng công thức nhưng mã trước không thuộc chuỗi, nên không ô nào nhận
        expect(formulaHolds(e.decoy)).toBe(true);
        const codes = [s.deal.genesis, ...real.map((c) => c!.code)];
        expect(codes).not.toContain(e.decoy.prev);
        for (let i = 0; i < 6; i++) expect(checkPlacement(s.deal.real[i].prev, e.decoy)).toBe('badPrev');
      }
    }
  });

  it('không bao giờ tráo vào ô đã là trang giả (hoặc đang trống); tối đa 3 ô chưa sửa', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const s = atKeep(seed);
      beginKeep(s);
      const swapped = new Set<number>();
      for (let t = 0; t < 900 && s.phase === 'keep'; t++) {
        for (const e of swaps(stepKeep(s, 0.1))) {
          expect(swapped.has(e.slot), `seed ${seed}: ô ${e.slot} tráo hai lần`).toBe(false);
          swapped.add(e.slot);
        }
        expect(keepUnfixed(s.keep!)).toBeLessThanOrEqual(K.maxUnfixed);
      }
      expect(swapped.size).toBeLessThanOrEqual(3);
    }
  });

  it('đã đủ 3 ô chưa sửa mà đến lượt tráo: không tráo, mất 1 tim; hết 3 tim thì hết ván (vòng 3 vẫn tính điểm các ô đã sửa)', () => {
    const s = atKeep(5);
    beginKeep(s);
    const times = swapSchedule();
    const ev = stepKeep(s, times[2]);
    expect(swaps(ev)).toHaveLength(3);
    expect(s.hearts).toBe(3);
    expect(keepChainStatus(s.keep!)).toBe('lech');
    // lần tráo thứ 4: đầy
    const noHint = (ev: readonly KeepEvent[]): KeepEvent[] => ev.filter((e) => e.kind !== 'hint');
    const over1 = noHint(stepKeep(s, times[3] - times[2]));
    expect(over1).toEqual([{ kind: 'overflow', at: times[3], heartsLeft: 2 }]);
    expect(s.hearts).toBe(2);
    expect(keepUnfixed(s.keep!)).toBe(3);
    expect(noHint(stepKeep(s, times[4] - times[3]))).toEqual([{ kind: 'overflow', at: times[4], heartsLeft: 1 }]);
    const last = noHint(stepKeep(s, times[5] - times[4]));
    expect(last).toEqual([{ kind: 'overflow', at: times[5], heartsLeft: 0 }]);
    expect(s.phase).toBe('over');
    expect(s.over).toBe('hearts');
    expect(s.parts.find((p) => p.round === 2)).toMatchObject({ points: 0, keep: { fixed: 0, fast: 0, left: 0 } }); // bước X2b: vẫn có phần vòng 3, 0 điểm, không trừ ô chưa sửa
    expect(stepKeep(s, 10)).toHaveLength(0);
    expect(rebuildScore(s)).toBe(0);
  });

  it('sửa một ô rồi thì tráo tiếp được: sau khi sửa không còn đầy, không mất tim', () => {
    const s = atKeep(6);
    beginKeep(s);
    const times = swapSchedule();
    const ev = swaps(stepKeep(s, times[2]));
    binFromSlot(s, ev[0].slot);
    placeInSlot(s, ev[0].real.id, ev[0].slot);
    expect(keepUnfixed(s.keep!)).toBe(2);
    const next = stepKeep(s, times[3] - times[2]);
    expect(swaps(next)).toHaveLength(1);
    expect(s.hearts).toBe(3);
  });
});

describe('vòng 3: sửa một ô', () => {
  function prepared(seed = 7): { s: RebuildState; e: Extract<KeepEvent, { kind: 'swap' }> } {
    const s = atKeep(seed);
    beginKeep(s);
    const e = swaps(stepKeep(s, 6))[0];
    return { s, e };
  }

  it('lần tráo đầu: trang thật và trang mồi bị ném ra bàn, ô là trang giả; thanh trạng thái "lệch"', () => {
    const { s, e } = prepared();
    expect(s.tray.map((c) => c.id).sort()).toEqual([e.decoy.id, e.real.id].sort());
    expect(s.keep!.slots[e.slot]).toBe(e.fake);
    expect(keepChainStatus(s.keep!)).toBe('lech');
  });

  it('kéo trang giả vào rổ (từ chuỗi) thì ô thành ô trống, vẫn "lệch" cho tới khi đặt đúng trang thật', () => {
    const { s, e } = prepared();
    expect(binFromSlot(s, e.slot)).toEqual({ kind: 'binned', slot: e.slot });
    expect(s.keep!.slots[e.slot]).toBeNull();
    expect(keepChainStatus(s.keep!)).toBe('lech');
    expect(s.hearts).toBe(3);
  });

  it('sửa trong 5 giây: +20 +5 và thanh trạng thái "đúng"; trang mồi được dọn khỏi bàn', () => {
    const { s, e } = prepared();
    stepKeep(s, 4.9); // 4,9 giây sau khi bị tráo
    binFromSlot(s, e.slot);
    const r = placeInSlot(s, e.real.id, e.slot);
    expect(r).toEqual({ kind: 'fixed', slot: e.slot, points: 25, fast: true, chainOk: true });
    expect(s.tray).toHaveLength(0);
    expect(keepChainStatus(s.keep!)).toBe('dung');
    expect(s.keep!.fixed).toBe(1);
    expect(s.keep!.fast).toBe(1);
  });

  it('sửa đúng lúc 5 giây vẫn được +5; quá 5 giây chỉ +20', () => {
    const a = prepared(8);
    stepKeep(a.s, 5);
    binFromSlot(a.s, a.e.slot);
    expect(placeInSlot(a.s, a.e.real.id, a.e.slot)).toMatchObject({ points: 25, fast: true });
    const b = prepared(8);
    stepKeep(b.s, 5.1);
    binFromSlot(b.s, b.e.slot);
    expect(placeInSlot(b.s, b.e.real.id, b.e.slot)).toMatchObject({ points: 20, fast: false });
    expect(b.s.keep!.fast).toBe(0);
  });

  it('đặt trang vào ô còn trang (chưa bỏ trang giả vào rổ): bỏ qua, không phạt', () => {
    const { s, e } = prepared();
    expect(placeInSlot(s, e.real.id, e.slot)).toEqual({ kind: 'ignored' });
    expect(s.hearts).toBe(3);
    expect(s.tray).toContain(e.real);
  });

  it('đặt trang mồi vào ô trống: sai mã trước, mất 1 tim, thẻ vẫn ở bàn', () => {
    const { s, e } = prepared();
    binFromSlot(s, e.slot);
    expect(placeInSlot(s, e.decoy.id, e.slot)).toEqual({ kind: 'badPrev', heartsLeft: 2 });
    expect(s.tray).toContain(e.decoy);
    expect(s.keep!.slots[e.slot]).toBeNull();
  });

  it('kéo trang thật (ở chuỗi hay ở bàn) vào rổ: mất 1 tim, thẻ bật về chỗ cũ', () => {
    const { s, e } = prepared();
    const other = s.keep!.slots.findIndex((c, i) => c && i !== e.slot);
    expect(binFromSlot(s, other)).toEqual({ kind: 'realBack', heartsLeft: 2 });
    expect(s.keep!.slots[other]).not.toBeNull();
    expect(binFromTable(s, e.real.id)).toEqual({ kind: 'realBack', heartsLeft: 1 });
    expect(s.tray).toContain(e.real);
    expect(binFromTable(s, 'khong-co')).toEqual({ kind: 'ignored' });
  });

  it('đặt trang thật của ô khác vào ô trống: sai mã trước, mất 1 tim', () => {
    const s = atKeep(9);
    beginKeep(s);
    const two = swaps(stepKeep(s, swapSchedule()[1]));
    expect(two).toHaveLength(2);
    binFromSlot(s, two[0].slot);
    expect(placeInSlot(s, two[1].real.id, two[0].slot)).toEqual({ kind: 'badPrev', heartsLeft: 2 });
  });
});

describe('vòng 3: gợi ý của Bi', () => {
  it('quá 10 giây chưa sửa thì Bi gợi ý nửa trái hay nửa phải (đúng nửa chứa ô), chỉ một lần mỗi ô, không chỉ đúng ô', () => {
    const s = atKeep(10);
    beginKeep(s);
    const e = swaps(stepKeep(s, 6))[0];
    expect(stepKeep(s, 9.9).filter((x) => x.kind === 'hint')).toHaveLength(0); // 9,9 giây sau khi bị tráo
    const hints = stepKeep(s, 0.2).filter((x) => x.kind === 'hint'); // 10,1 giây sau khi bị tráo
    expect(hints).toHaveLength(1);
    expect(hints[0]).toMatchObject({ kind: 'hint', half: e.slot < 3 ? 'left' : 'right' });
    expect(stepKeep(s, 1).filter((x) => x.kind === 'hint')).toHaveLength(0);
    expect(Object.keys(hints[0]).sort()).toEqual(['at', 'half', 'kind']); // không có số ô
  });

  it('sửa trước 10 giây thì không có gợi ý; nửa chuỗi: ô 0 đến 2 trái, 3 đến 5 phải', () => {
    const s = atKeep(11);
    beginKeep(s);
    const e = swaps(stepKeep(s, 6))[0];
    stepKeep(s, 3);
    binFromSlot(s, e.slot);
    placeInSlot(s, e.real.id, e.slot);
    expect(stepKeep(s, 5).filter((x) => x.kind === 'hint')).toHaveLength(0);
    expect([0, 1, 2, 3, 4, 5].map((i) => keepHalf(i, 6))).toEqual(['left', 'left', 'left', 'right', 'right', 'right']);
  });
});

describe('vòng 3: điểm và hết giờ', () => {
  /** Chơi vòng 3: sửa ngay mọi lần tráo, trừ `skip` lần tráo cuối (bỏ mặc). */
  function playLeaving(s: RebuildState, skip: number): void {
    const total = swapSchedule().length;
    let n = 0;
    beginKeep(s);
    for (let i = 0; i < 1200 && s.phase === 'keep'; i++) {
      for (const e of swaps(stepKeep(s, 0.1))) {
        n++;
        if (n > total - skip) continue;
        binFromSlot(s, e.slot);
        placeInSlot(s, e.real.id, e.slot);
      }
    }
  }

  it('hết 90 giây: mỗi ô còn lệch −10; điểm vòng = 20 × sửa + 5 × nhanh − 10 × còn lệch; sau đó advance kết thúc ván', () => {
    const s = atKeep(12);
    const total = swapSchedule().length;
    playLeaving(s, 2);
    expect(s.phase).toBe('roundDone');
    expect(s.keep!.elapsed).toBe(90);
    expect(s.hearts).toBe(3);
    const part = s.parts.find((p) => p.round === 2)!;
    expect(part.keep).toEqual({ fixed: total - 2, fast: total - 2, left: 2 });
    expect(part.points).toBe((total - 2) * 25 - 2 * 10);
    expect(rebuildScore(s)).toBe(230);
    advance(s);
    expect(s.phase).toBe('over');
    expect(s.over).toBe('done');
  });

  it('hết giờ: sự kiện timeout báo số ô còn lệch và điểm vòng', () => {
    const s = atKeep(15);
    beginKeep(s);
    let timeout: KeepEvent | undefined;
    for (let i = 0; i < 1000 && !timeout; i++) {
      for (const e of stepKeep(s, 0.1)) {
        if (e.kind === 'swap') {
          binFromSlot(s, e.slot);
          placeInSlot(s, e.real.id, e.slot);
        }
        if (e.kind === 'timeout') timeout = e;
      }
    }
    expect(timeout).toEqual({ kind: 'timeout', left: 0, points: 300 });
  });

  it('hết tim giữa vòng 3 (bước X2b): ván kết thúc nhưng vẫn tính +20/+5 các ô đã sửa, không trừ −10 cho ô chưa sửa', () => {
    const s = atKeep(13);
    beginKeep(s);
    const times = swapSchedule();
    const first = swaps(stepKeep(s, times[0]))[0];
    binFromSlot(s, first.slot);
    placeInSlot(s, first.real.id, first.slot); // sửa nhanh: +25
    const second = swaps(stepKeep(s, times[1] - times[0]))[0];
    stepKeep(s, 8); // ô thứ hai sửa chậm: +20
    binFromSlot(s, second.slot);
    placeInSlot(s, second.real.id, second.slot);
    stepKeep(s, 300); // bỏ mặc: đầy 3 ô rồi mất hết tim, còn 3 ô chưa sửa
    expect(s.over).toBe('hearts');
    expect(s.phase).toBe('over');
    expect(keepUnfixed(s.keep!)).toBe(3);
    const part = s.parts.find((p) => p.round === 2)!;
    expect(part.keep).toEqual({ fixed: 2, fast: 1, left: 0 });
    expect(part.points).toBe(45);
    expect(rebuildScore(s)).toBe(45);
    expect(scoreParts(s)).toEqual([
      { key: 'sua', round: 2, count: 2, points: 40 },
      { key: 'nhanh', round: 2, count: 1, points: 5 },
    ]);
  });

  it('hết tim ở vòng 3 chỉ bị tính một lần: các thao tác sau đó không thêm phần điểm', () => {
    const s = atKeep(16);
    beginKeep(s);
    stepKeep(s, 300);
    expect(s.over).toBe('hearts');
    expect(s.parts.filter((p) => p.round === 2)).toHaveLength(1);
    expect(binFromTable(s, 'khong-co')).toEqual({ kind: 'ignored' });
    expect(stepKeep(s, 10)).toHaveLength(0);
    expect(s.parts.filter((p) => p.round === 2)).toHaveLength(1);
    expect(s.parts.find((p) => p.round === 2)!.points).toBe(0);
  });

  it('hết tim do kéo nhầm trang thật vào rổ (không phải do đầy ô) cũng tính điểm các ô đã sửa', () => {
    const s = atKeep(17);
    beginKeep(s);
    const e = swaps(stepKeep(s, 6))[0];
    binFromSlot(s, e.slot);
    placeInSlot(s, e.real.id, e.slot); // +25
    const real = s.keep!.slots.findIndex((c) => c);
    for (let i = 0; i < 3; i++) binFromSlot(s, real);
    expect(s.over).toBe('hearts');
    expect(s.parts.find((p) => p.round === 2)!.points).toBe(25);
  });

  it('các phần điểm cho màn kết quả cộng đúng bằng điểm ván: dòng sửa, nhanh, còn lệch cùng các vòng 1, 2', () => {
    const s = atKeep(14);
    s.parts.push({ round: 0, errors: 0, fakeBinned: false, points: 100 }, { round: 1, errors: 0, fakeBinned: true, points: 130 });
    playLeaving(s, 2);
    const rows = scoreParts(s);
    expect(rows.map((r) => r.key)).toEqual(['vong', 'vong', 'trangGia', 'sua', 'nhanh', 'conLech']);
    expect(rows.slice(3)).toEqual([
      { key: 'sua', round: 2, count: 10, points: 200 },
      { key: 'nhanh', round: 2, count: 10, points: 50 },
      { key: 'conLech', round: 2, count: 2, points: -20 },
    ]);
    expect(rows.reduce((a, r) => a + r.points, 0)).toBe(rebuildScore(s));
    expect(rebuildScore(s)).toBe(100 + 130 + 230);
  });

  it('tất định: cùng seed và cùng thao tác thì cùng các sự kiện, điểm và tim; khác seed thì khác', () => {
    const run = (seed: number): string => {
      const s = atKeep(seed);
      beginKeep(s);
      const log: string[] = [];
      for (let i = 0; i < 920 && s.phase === 'keep'; i++) {
        for (const e of stepKeep(s, 0.1)) {
          log.push(e.kind === 'swap' ? `swap ${e.slot} ${e.fake.content} ${e.decoy.prev} ${e.decoy.content}` : JSON.stringify(e));
          if (e.kind === 'swap' && e.slot % 2 === 0) {
            binFromSlot(s, e.slot);
            placeInSlot(s, e.real.id, e.slot);
          }
        }
      }
      return log.join('|') + '#' + rebuildScore(s) + '#' + s.hearts;
    };
    expect(run(77)).toBe(run(77));
    expect(run(77)).not.toBe(run(78));
  });
});

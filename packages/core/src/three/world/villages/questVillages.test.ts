import { describe, expect, it } from 'vitest';
import { levelsOfVillage } from '../../../content/levels';
import { computeUnlock } from '../../../progress/unlock';
import type { VillageId } from '../../../village';
import { nextLevel } from '../../village/villageQuest';
import { createRouter, type RouteStep } from '../roadGraph';
import { assembleWorld, boardNodeId, gateNodeId } from '../worldLayout';
import { targetNodeId } from '../worldQuest';


/** Đứng trước biển bấy nhiêu: mũi tên từ chỗ xuất hiện `?tu=` phải tới được từng biển trong chừng này đơn vị đường đi. */
const NEAR = 20;

/** Trạng thái màn và việc tiếp theo trong một làng, từ danh sách màn đã xong (bảng status mặc định của levels.ts). */
function questIn(village: VillageId, doneLevels: number[]) {
  const unlock = computeUnlock({ doneLevels });
  const stateOf = (id: number) => unlock.levels.find((l) => l.id === id)?.state;
  const ids = levelsOfVillage(village).map((l) => l.id);
  return { unlock, stateOf, next: nextLevel(ids, stateOf) };
}


describe('đồ thị đường thế giới và nhiệm vụ theo biển', () => {
  it('đồ thị đường thế giới có nút cho cả 12 biển; mũi tên từ chỗ xuất hiện ?tu= tới từng biển của mỗi làng đều có đường', () => {
    const w = assembleWorld();
    const router = createRouter(w.graph);
    const out: RouteStep = { x: 0, z: 0, remaining: 0, found: false };
    for (let level = 1; level <= 12; level++) expect(w.graph.nodes.some((n) => n.id === boardNodeId(level)), `board:${level}`).toBe(true);
    for (const v of w.villages) {
      for (const b of v.layout.boards) {
        router.setTarget(boardNodeId(b.level));
        router.next(v.start.x, v.start.z, out);
        expect(out.found, `${v.id} màn ${b.level}`).toBe(true);
        expect(out.remaining, `${v.id} màn ${b.level}`).toBeLessThan(NEAR);
      }
    }
    // từ chợ đi vào Làng Khắc Dấu tới biển màn 8
    router.setTarget(boardNodeId(8));
    router.next(0, -10, out);
    expect(out.found).toBe(true);
  });
});


describe('nhiệm vụ ở Làng Khắc Dấu và Làng Dệt khi cả hai game của làng đã ra mắt (màn 8 và 9, màn 5 và 6)', () => {
  it('đã xong màn 7, chưa chơi màn 8: trong làng, mũi tên chỉ tới biển màn 8', () => {
    const { unlock, next } = questIn('lang-khac-dau', [1, 2, 3, 4, 5, 6, 7]);
    expect(next).toBe(8);
    expect(targetNodeId({ inVillage: 'lang-khac-dau', nextBoard: next, pages: unlock.goldenPages })).toBe(boardNodeId(8));
  });

  it('đã chơi màn 8: chưa có Trang Sổ Vàng 3, biển màn 9 của làng tối giản mở được và là việc tiếp theo', () => {
    const { unlock, next, stateOf } = questIn('lang-khac-dau', [1, 2, 3, 4, 5, 6, 7, 8]);
    expect(unlock.goldenPages).toBe(2);
    expect(stateOf(8)).toBe('done');
    expect(stateOf(9)).toBe('open');
    expect(next).toBe(9);
    expect(targetNodeId({ inVillage: 'lang-khac-dau', nextBoard: next, pages: unlock.goldenPages })).toBe(boardNodeId(9));
  });

  it('đã chơi màn 9 (màn cuối của làng): có Trang Sổ Vàng 3, làng hết việc, nhiệm vụ chỉ sang cổng Bạc', () => {
    const { unlock, next, stateOf } = questIn('lang-khac-dau', [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(unlock.goldenPages).toBe(3);
    expect(stateOf(9)).toBe('done');
    expect(next).toBeNull();
    expect(targetNodeId({ inVillage: 'lang-khac-dau', nextBoard: next, pages: unlock.goldenPages })).toBe(gateNodeId('bac'));
    expect(targetNodeId({ inVillage: null, nextBoard: null, pages: unlock.goldenPages })).toBe(gateNodeId('bac'));
  });

  it('làng tối giản Bạc (bước B13): màn 10, 11, 12 đều ra mắt; xong bài học thì biển màn 11 mở được (biển 12 còn khóa), xong màn 11 thì biển 12 mở; Trang Sổ Vàng 4 chỉ có sau màn 12', () => {
    const lesson = questIn('lang-bac', [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(lesson.stateOf(10)).toBe('open');
    expect(lesson.stateOf(11)).toBe('locked');
    expect(lesson.next).toBe(10);
    expect(lesson.unlock.goldenPages).toBe(3);
    const afterLesson = questIn('lang-bac', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(afterLesson.stateOf(11)).toBe('open'); // biển màn 11 mở được, vào chơi được (không còn "sắp ra mắt")
    expect(afterLesson.stateOf(12)).toBe('locked');
    expect(afterLesson.next).toBe(11);
    expect(afterLesson.unlock.goldenPages).toBe(3);
    expect(targetNodeId({ inVillage: 'lang-bac', nextBoard: afterLesson.next, pages: afterLesson.unlock.goldenPages })).toBe(boardNodeId(11));
    const afterMatch = questIn('lang-bac', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(afterMatch.stateOf(11)).toBe('done');
    expect(afterMatch.stateOf(12)).toBe('open');
    expect(afterMatch.next).toBe(12);
    expect(afterMatch.unlock.goldenPages).toBe(3); // Trang Sổ Vàng 4 chỉ trao sau màn 12 và cao trào
    const all = questIn('lang-bac', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(all.next).toBeNull();
    expect(all.unlock.goldenPages).toBe(4);
  });

  it('biển sắp ra mắt không vào được (không phải open/done) nhưng không chặn màn sau; biển màn 5 và 6 của làng Dệt mở được khi tới lượt', () => {
    // Làng Dệt (bước B9): màn 5 và 6 đều đã ra mắt; xong màn 4 thì việc tiếp theo là biển màn 5, xong màn 5 thì biển màn 6 mở, chơi màn 6 (màn cuối của làng) là có trang 2 và cổng Khắc Dấu mở, màn 7 mở
    const lesson = questIn('lang-det', [1, 2, 3, 4]);
    expect(lesson.stateOf(5)).toBe('open');
    expect(lesson.stateOf(6)).toBe('locked');
    expect(lesson.next).toBe(5);
    expect(lesson.unlock.goldenPages).toBe(1);
    const five = questIn('lang-det', [1, 2, 3, 4, 5]);
    expect(five.stateOf(5)).toBe('done');
    expect(five.stateOf(6)).toBe('open'); // biển màn 6 của làng tối giản mở được
    expect(five.next).toBe(6);
    expect(five.unlock.goldenPages).toBe(1);
    expect(targetNodeId({ inVillage: 'lang-det', nextBoard: five.next, pages: five.unlock.goldenPages })).toBe(boardNodeId(6));
    const det = questIn('lang-det', [1, 2, 3, 4, 5, 6]);
    expect(det.stateOf(6)).toBe('done');
    expect(det.next).toBeNull();
    expect(det.unlock.goldenPages).toBe(2);
    expect(det.stateOf(7)).toBe('open');
    // Giả sử màn 8 sắp ra mắt còn màn 9 đã ra mắt: xong màn 7 thì việc tiếp theo là màn 9 (bỏ qua biển 8)
    const unlock = computeUnlock({ doneLevels: [1, 2, 3, 4, 7], statuses: { 5: 'coming-soon', 6: 'coming-soon', 8: 'coming-soon', 9: 'ready', 11: 'coming-soon', 12: 'coming-soon' } });
    const stateOf = (id: number) => unlock.levels.find((l) => l.id === id)?.state;
    expect(stateOf(8)).toBe('coming-soon');
    expect(stateOf(9)).toBe('open');
    expect(nextLevel([7, 8, 9], stateOf)).toBe(9);
  });
});

import { describe, expect, it } from 'vitest';
import { dialogueFor, momentBeforeStation } from '../../lesson2d/flow';
import { CHARACTER_IDS, EXTRA_VARS, fmt, makeFmt, characterNames, CHARACTERS } from '../characters';
import { bai2Lesson, bai2Logic, bai2Texts } from './bai-2';

const ALLOWED = new Set<string>(['ten', 'Ten', ...CHARACTER_IDS.filter((id) => id !== 'hocSinh'), ...EXTRA_VARS]);

function allStrings(node: unknown, path = 'bai2', out: [string, string][] = []): [string, string][] {
  if (typeof node === 'string') out.push([path, node]);
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) allStrings(v, `${path}.${k}`, out);
  return out;
}

describe('content/lessons/bai-2.ts', () => {
  const strings = [...allStrings(bai2Lesson, 'lesson'), ...allStrings(bai2Logic, 'logic'), ...allStrings(bai2Texts, 'texts')];

  it('có chữ và không câu nào rỗng', () => {
    expect(strings.length).toBeGreaterThan(100);
    for (const [path, s] of strings) expect(s.trim(), path).not.toBe('');
  });

  it('chỉ dùng chỗ giữ tên hợp lệ', () => {
    for (const [path, s] of strings) {
      for (const m of s.matchAll(/\{([^}]*)\}/g)) expect(ALLOWED.has(m[1]), `${path}: {${m[1]}}`).toBe(true);
    }
  });

  it('không viết cứng tên phản diện, không còn "Linh vật", emoji 🦊🐢🐇 hay tên cũ Bình/Chi không kèm cụ/cô', () => {
    for (const [path, s] of strings) {
      expect(s, path).not.toMatch(/(^|[^\p{L}])Tí(?![\p{L}])/u);
      expect(s, path).not.toMatch(/linh vật/i);
      for (const e of ['🦊', '🐢', '🐇']) expect(s, path).not.toContain(e);
      expect(s, path).not.toMatch(/(^|[^\p{L}])(?<!cụ )(?<!cô )(Bình|Chi)(?![\p{L}])/iu);
    }
  });

  it('lời người dẫn đúng bảng "Màn 4" của spec 06 (không có lời trước trạm Trung bình)', () => {
    const d = bai2Lesson.dialogue;
    expect(dialogueFor(d, momentBeforeStation(0))).toEqual([
      { characterId: 'cuBinh', text: 'Mỗi nhà là một người giữ sổ. Trang mới phải được cả làng kiểm lại rồi mới ghi.' },
    ]);
    expect(dialogueFor(d, momentBeforeStation(1))).toEqual([]);
    expect(dialogueFor(d, momentBeforeStation(2))).toEqual([
      { characterId: 'coChi', text: 'Duyệt nhanh cho xong việc được không cụ?' },
      { characterId: 'cuBinh', text: 'Duyệt ẩu là mất cọc đấy!' },
    ]);
    expect(dialogueFor(d, 'cuoiBai')).toEqual([
      { characterId: 'cuBinh', text: 'Gian một lần thì mất cọc, làm thật thì có thưởng. Ai cũng hiểu nên chẳng ai muốn gian.' },
    ]);
  });

  it('lời trao trang là lời "Kết thúc làng" của spec 06', () => {
    expect(bai2Lesson.award.chuThich).toBe('Cụ Bình trao Trang Sổ Vàng thứ hai.');
    expect(bai2Lesson.award.loi).toEqual([
      {
        characterId: 'cuBinh',
        text: 'Sổ thì ai cũng kiểm được. Nhưng làm sao biết giấy nợ đúng là người đó viết? Sang Làng Khắc Dấu hỏi chú Dũng.',
      },
    ]);
  });

  it('thẻ "Em có biết?" đủ 4 thẻ giữ thuật ngữ thật, thẻ Đặt cọc chỉ ở trạm Khó', () => {
    expect(bai2Lesson.emCoBiet).toHaveLength(4);
    expect(bai2Lesson.emCoBiet[0].title).toBe('Node là ai?');
    expect(bai2Lesson.emCoBiet[2].text).toContain('cơ chế đồng thuận');
    expect(bai2Lesson.emCoBietKho).toHaveLength(1);
    expect(bai2Lesson.emCoBietKho?.[0].text).toContain('Proof of Stake');
  });

  it('đổi tên phản diện thì mọi chữ đổi theo (bong bóng suy nghĩ, câu hỏi suy ngẫm, tên bài)', () => {
    const cuoi = makeFmt({ ...characterNames(), phanDien: 'Cuội' });
    for (const text of [...Object.values(bai2Texts.kho.nghi), bai2Texts.kho.suyNgam.cauHoi, ...bai2Texts.kho.suyNgam.dapAn, bai2Lesson.stations.kho.mucTieu]) {
      expect(cuoi(text)).not.toContain('Tí');
    }
    expect(cuoi(bai2Texts.kho.suyNgam.cauHoi)).toBe('Vì sao càng về sau Cuội càng ít gian lận?');
  });

  it('tên hiển thị của hai người dẫn là cụ Bình và cô Chi', () => {
    expect(fmt('{cuBinh}')).toBe(CHARACTERS.cuBinh.name);
    expect(CHARACTERS.cuBinh.name).toBe('cụ Bình');
    expect(CHARACTERS.coChi.name).toBe('cô Chi');
  });
});

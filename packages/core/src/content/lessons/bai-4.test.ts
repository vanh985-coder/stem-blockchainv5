import { describe, expect, it } from 'vitest';
import { dialogueFor, momentBeforeStation } from '../../lesson2d/flow';
import { CHARACTER_IDS, EXTRA_VARS, makeFmt, characterNames } from '../characters';
import { DEFAULT_EASY_TXS, HARD_PEOPLE, buildTree, combine } from '../../lessons/bai-4/logic';
import { bai4Data, bai4Lesson, bai4Texts } from './bai-4';

const ALLOWED = new Set<string>(['ten', 'Ten', ...CHARACTER_IDS.filter((id) => id !== 'hocSinh'), ...EXTRA_VARS]);

function allStrings(node: unknown, path = 'bai4', out: [string, string][] = []): [string, string][] {
  if (typeof node === 'string') out.push([path, node]);
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) allStrings(v, `${path}.${k}`, out);
  return out;
}

describe('content/lessons/bai-4.ts', () => {
  const strings = [...allStrings(bai4Lesson, 'lesson'), ...allStrings(bai4Data, 'data'), ...allStrings(bai4Texts, 'texts')];

  it('khóa có tên theo trạm và nội dung (không còn t01, t02…), chuỗi không thừa khoảng trắng đầu cuối', () => {
    for (const [group, items] of Object.entries(bai4Texts)) {
      for (const [key, text] of Object.entries(items as Record<string, string>)) {
        expect(key, `${group}.${key}`).not.toMatch(/^t\d+$/);
        if (key !== 'khoaKiemTra' && key !== 'ketLuan') expect(text, `${group}.${key}`).toBe(text.trim());
      }
    }
  });

  it('có chữ và không câu nào rỗng', () => {
    expect(strings.length).toBeGreaterThan(80);
    for (const [path, s] of strings) expect(s.trim(), path).not.toBe('');
  });

  it('chỉ dùng chỗ giữ tên hợp lệ', () => {
    for (const [path, s] of strings) {
      for (const m of s.matchAll(/\{([^}]*)\}/g)) expect(ALLOWED.has(m[1]), `${path}: {${m[1]}}`).toBe(true);
    }
  });

  it('không viết cứng tên phản diện, không còn "Linh vật", "Cáo", emoji nhân vật cũ', () => {
    for (const [path, s] of strings) {
      expect(s, path).not.toMatch(/(^|[^\p{L}])Tí(?![\p{L}])/u);
      expect(s, path).not.toMatch(/linh vật/i);
      expect(s, path).not.toMatch(/(^|[^\p{L}])Cáo(?![\p{L}])/u);
      for (const e of ['🦊', '🐢', '🐇', '⚽', '🎒']) expect(s, path).not.toContain(e);
    }
  });

  it('bỏ câu linh vật trùng lời thầy Linh lúc {phanDien} tráo giao dịch', () => {
    const all = strings.map(([, s]) => s).join('\n');
    expect(all).not.toContain('Chỉ đổi 1 giao dịch mà gốc đổi ngay');
  });

  it('lời thầy Linh đúng bảng "Màn 10" của spec 08', () => {
    const d = bai4Lesson.dialogue;
    expect(dialogueFor(d, momentBeforeStation(0))).toEqual([
      {
        characterId: 'thayLinh',
        text: 'Ghép hai giao dịch: T_ab = T_a × 10 + T_b. Ghép từng cặp, rồi lại ghép từng cặp kết quả, tới khi còn một số gốc.',
      },
    ]);
    expect(dialogueFor(d, momentBeforeStation(1))).toEqual([]);
    expect(dialogueFor(d, momentBeforeStation(2))).toEqual([]);
    expect(bai4Lesson.twist).toEqual([{ characterId: 'thayLinh', text: 'Thấy chưa, chỉ đổi một lá mà con số đổi lan lên tận gốc.' }]);
    expect(dialogueFor(d, 'cuoiBai')).toEqual([
      { characterId: 'thayLinh', text: 'Nhờ số gốc, cả làng chỉ cần so một con số là biết sổ có bị sửa hay không.' },
    ]);
  });

  it('trao trang thứ tư ở mốc 1: thầy Linh trao, Bi nói, "Hội làng sắp mở"', () => {
    expect(bai4Lesson.award.chuThich).toBe('Thầy Linh trao Trang Sổ Vàng thứ tư.');
    expect(bai4Lesson.award.loi).toEqual([{ characterId: 'bi', text: 'Đủ 4 trang rồi! Cả làng đang mở hội.' }]);
    expect(bai4Lesson.award.ghiChuCuoi).toBe('Hội làng sắp mở');
  });

  it('phần 3 "Khám phá bí mật": lời {phanDien} không nói lá nào, các câu soi đúng như spec', () => {
    const t = bai4Texts.tramTb;
    expect(t.tinhNghichToVuaLen).toBe(
      '**{phanDien} tinh nghịch: **"Tớ vừa lén sửa một lá trên cây em vừa dựng. Gốc đổi rồi đấy, xem em có tìm ra lá nào không!"',
    );
    expect(t.tinhNghichToVuaLen).not.toMatch(/T\d|\{so\}/); // không nói lá nào
    expect(t.soGocDaGhi).toBe('Sổ ghi số gốc **{so}** — em đã tính đúng ✓');
    expect(t.soGocTinhLai).toBe('{phanDien} sửa một lá, nên tính lại bây giờ ra **{so}**. Hãy tìm lá đã khác so với lúc em dựng cây!');
    expect(t.huongDanSoiO).toBe('Bấm vào một ô để so: số lúc em dựng cây (trong sổ) và số tính lại bây giờ.');
    expect(t.soiSo).toBe('lúc dựng {so}');
    expect(t.soiTinhLai).toBe('bây giờ {so}');
    expect(t.soiTieuDeCay).toBe('Số trên ô là số lúc em dựng cây (đã ghi trong sổ).');
    expect(t.soiTimRaRoi).toBe('Em tìm ra rồi! {phanDien} đã sửa {la} từ {cu} thành {moi}.');
    expect(t.soiTongKet).toBe('Em soi {so} ô. Đi theo nhánh đỏ thì chỉ cần 2 ô mỗi tầng.');
    expect(t.soiBiGoiY).toBe('Bắt đầu từ gốc, soi 2 ô con, rồi đi theo ô đỏ.');
    expect(Object.keys(t)).not.toContain('suaGiaoDichXemGoc'); // đã bỏ nút "Sửa giao dịch & xem gốc đổi"
    // khớp/lệch có icon và chữ, không chỉ màu
    expect(t.soiKhop).toBe('✓ giống');
    expect(t.soiLech).toBe('✗ khác');
  });

  it('có 4 thẻ "Em có biết?"', () => {
    expect(bai4Lesson.emCoBiet).toHaveLength(4);
  });

  it('đổi tên phản diện thì chữ đổi theo', () => {
    const cuoi = makeFmt({ ...characterNames(), phanDien: 'Cuội' });
    const text = bai4Texts.tramTb.tinhNghichToVuaLen;
    expect(cuoi(text)).toContain('Cuội');
    expect(cuoi(text)).not.toContain('Tí');
  });
});

describe('Bài 4: công thức và dữ liệu giữ nguyên sau khi chuyển chữ sang content/', () => {
  it('công thức T_ab = T_a × 10 + T_b, thứ tự quan trọng', () => {
    expect(combine(3, 7)).toBe(37);
    expect(combine(7, 3)).toBe(73);
    expect(buildTree([3, 7, 5, 2])).toEqual([[3, 7, 5, 2], [37, 52], [422]]);
  });

  it('4 giao dịch của trạm Dễ: giá trị 3, 7, 5, 2; tên theo bảng đổi tên (bác An, cụ Bình, cô Chi, chú Dũng)', () => {
    expect(DEFAULT_EASY_TXS.map((t) => t.value)).toEqual([3, 7, 5, 2]);
    expect(DEFAULT_EASY_TXS.map((t) => t.name)).toEqual(['Bác An', 'Cụ Bình', 'Cô Chi', 'Chú Dũng']);
  });

  it('8 người của trạm Khó: người thứ 8 tên là Lan (không còn Linh, khỏi trùng thầy Linh)', () => {
    expect(HARD_PEOPLE).toHaveLength(8);
    expect(HARD_PEOPLE[7].name).toBe('Lan');
    expect(HARD_PEOPLE.map((p) => p.name)).not.toContain('Linh');
  });
});

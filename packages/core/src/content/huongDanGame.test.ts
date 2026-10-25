import { describe, expect, it } from 'vitest';
import { parseRich } from '../ui/rich';
import { CHARACTER_IDS, EXTRA_VARS, fmt, phanDien } from './characters';
import { GAMES } from './games';
import { GUIDE_ART_IDS, GUIDE_SECTIONS, GUIDE_SHOT_IDS, guideSectionsFor } from './huongDan';
import { HUONG_DAN_GAME, gameGuide, hintText, type GameGuide } from './huongDanGame';
import { LEVELS } from './levels';

const ALLOWED = new Set<string>(['ten', 'Ten', ...CHARACTER_IDS.filter((id) => id !== 'hocSinh'), ...EXTRA_VARS]);
const READY_GAMES = LEVELS.filter((l) => l.kind === 'game' && l.status === 'ready');
const guide = (id: number): GameGuide => gameGuide(id)!;

/** Mọi câu chữ của một màn (luật, cách điều khiển, trang, tiêu đề, câu nhắc), kèm tên đường dẫn để báo lỗi */
function allTexts(id: number): [string, string][] {
  const g = guide(id);
  const out: [string, string][] = [[`${id}.nhan`, g.nhan], [`${id}.tieuDe`, g.tieuDe], [`${id}.dieuKhien.mayTinh`, g.dieuKhien.mayTinh], [`${id}.dieuKhien.dienThoai`, g.dieuKhien.dienThoai]];
  g.luat.forEach((t, i) => out.push([`${id}.luat[${i}]`, t]));
  g.trang.forEach((p, i) => {
    out.push([`${id}.trang[${i}].may`, p.may]);
    if (p.dt) out.push([`${id}.trang[${i}].dt`, p.dt]);
  });
  for (const [k, t] of Object.entries(g.nhac)) out.push([`${id}.nhac.${k}`, t]);
  return out;
}

describe('huongDanGame.ts: mọi chữ hướng dẫn của game nằm trong một file', () => {
  it('có đủ các màn 2, 3, 5, 6, 8, 9, 11, 12; màn chưa ra mắt (11) để trống', () => {
    expect(Object.keys(HUONG_DAN_GAME).map(Number).sort((a, b) => a - b)).toEqual([2, 3, 5, 6, 8, 9, 11, 12]);
    for (const id of [11]) {
      const g = guide(id);
      expect(g.luat, String(id)).toEqual([]);
      expect(g.trang, String(id)).toEqual([]);
      expect(g.nhac, String(id)).toEqual({});
      expect(g.dieuKhien, String(id)).toEqual({ mayTinh: '', dienThoai: '' });
    }
  });

  it('mọi màn đã ra mắt (game status ready) có đủ luat, dieuKhien, trang và nhac', () => {
    expect(READY_GAMES.map((l) => l.id)).toEqual([2, 3, 5, 6, 8, 9, 12]);
    for (const l of READY_GAMES) {
      const g = guide(l.id);
      expect(g, `màn ${l.id}`).toBeDefined();
      expect(g.nhan.trim(), `màn ${l.id}`).not.toBe('');
      expect(g.tieuDe.trim(), `màn ${l.id}`).not.toBe('');
      expect(g.luat.length, `màn ${l.id} luat`).toBeGreaterThanOrEqual(2);
      expect(g.luat.length, `màn ${l.id} luat`).toBeLessThanOrEqual(4);
      expect(g.dieuKhien.mayTinh.length, `màn ${l.id}`).toBeGreaterThan(10);
      expect(g.dieuKhien.dienThoai.length, `màn ${l.id}`).toBeGreaterThan(5);
      expect(g.trang.length, `màn ${l.id} trang`).toBeGreaterThanOrEqual(3);
      expect(g.trang.length, `màn ${l.id} trang`).toBeLessThanOrEqual(4);
      expect(Object.keys(g.nhac).length, `màn ${l.id} nhac`).toBeGreaterThanOrEqual(6);
      for (const [name, t] of allTexts(l.id)) expect(t.trim(), name).not.toBe('');
    }
  });

  it('hình của trang chỉ ghi tên hình có thật (GuideArt.tsx hay ảnh chụp)', () => {
    for (const l of READY_GAMES) {
      for (const p of guide(l.id).trang) {
        for (const f of [p.hinh, p.hinhDt]) {
          if (!f) continue;
          if ('shot' in f) expect(GUIDE_SHOT_IDS).toContain(f.shot);
          else expect(GUIDE_ART_IDS).toContain(f.art);
        }
        if (p.hinhDt) expect(p.dt, `màn ${l.id}`).toBeTruthy();
      }
    }
  });

  it('huongDan.ts chỉ còn phần chung; phần riêng của game lấy đúng chữ từ file này (nhãn, tiêu đề, trang)', () => {
    for (const [section, id] of [['man-2', 2], ['man-3', 3], ['man-5', 5], ['man-8', 8], ['man-9', 9], ['man-12', 12]] as const) {
      const s = guideSectionsFor(section)[0];
      expect(s.id).toBe(section);
      expect(s.nhan).toBe(guide(id).nhan);
      expect(s.tieuDe).toBe(guide(id).tieuDe);
      expect(s.trang).toEqual(guide(id).trang);
      expect((s as { man?: readonly number[] }).man).toEqual([id]);
    }
    expect(guideSectionsFor(undefined).map((s) => s.id)).toEqual(['di-lai', 'noi-chuyen']);
    // mọi trang riêng của game trong GUIDE_SECTIONS nằm trong file này: phần có `man` không tự viết trang
    const ownText = new Set(READY_GAMES.flatMap((l) => guide(l.id).trang.map((p) => p.may)));
    for (const s of GUIDE_SECTIONS) {
      if (!(s as { man?: readonly number[] }).man) continue;
      for (const p of s.trang) expect(ownText.has(p.may), s.id).toBe(true);
    }
  });

  it('luật và cách điều khiển ở thẻ bắt đầu (GAMES) lấy từ file này, không viết lại ở games.ts', () => {
    for (const l of READY_GAMES) {
      expect(GAMES[l.id]?.luat, `màn ${l.id}`).toBe(guide(l.id).luat);
      expect(GAMES[l.id]?.dieuKhien, `màn ${l.id}`).toBe(guide(l.id).dieuKhien);
    }
  });

  it('chỉ dùng chỗ giữ tên hợp lệ ({phanDien}, {congThuc}, {viDu}…); không viết cứng tên phản diện; không còn chỗ giữ tên sau fmt()', () => {
    for (const l of READY_GAMES) {
      for (const [name, t] of allTexts(l.id)) {
        for (const m of t.matchAll(/\{([^}]*)\}/g)) expect(ALLOWED.has(m[1]), `${name}: {${m[1]}}`).toBe(true);
        expect(t, name).not.toContain(phanDien);
        expect(fmt(t), name).not.toMatch(/[{}]/);
      }
    }
  });

  it('câu nhắc ngắn (dưới 200 ký tự, tối đa 3 câu)', () => {
    for (const l of READY_GAMES) {
      for (const [k, t] of Object.entries(guide(l.id).nhac)) {
        expect(t.length, `${l.id}.${k}`).toBeLessThan(200);
        expect(t.split(/(?<=[.!?])\s+/).length, `${l.id}.${k}`).toBeLessThanOrEqual(3);
      }
    }
  });

  it('hintText tra khóa trong nhac của màn, nối nhiều khóa bằng dấu cách, khóa lạ bị bỏ qua, không còn câu nào thì dùng câu mặc định', () => {
    expect(hintText(8, ['chuaLat'])).toBe(guide(8).nhac.chuaLat);
    expect(hintText(8, ['choUp', 'vong3'])).toBe(`${guide(8).nhac.choUp} ${guide(8).nhac.vong3}`);
    expect(hintText(8, ['khongCoKhoaNay', 'hetVan'])).toBe(guide(8).nhac.hetVan);
    expect(hintText(8, ['khongCoKhoaNay']).length).toBeGreaterThan(10);
    expect(hintText(99, ['chuaLat']).length).toBeGreaterThan(10);
  });

  it('số mũ trong chữ hướng dẫn viết bằng ^^…^^ (chỉ số trên), không có dạng "5^x" một dấu mũ', () => {
    for (const l of READY_GAMES) {
      for (const [name, t] of allTexts(l.id)) expect(t, name).not.toMatch(/\d\^[^^]/);
    }
    const all = guide(8).luat.join(' ');
    expect(all).toContain('{congThuc}');
    const nodes = parseRich(fmt(guide(8).luat[1]));
    expect(nodes.some((n) => typeof n !== 'string' && n.mark === 'sup')).toBe(true);
  });
});

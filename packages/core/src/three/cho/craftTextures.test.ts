import { BoxGeometry, Box3, CylinderGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { createStoneHill } from '../village/scatterGeometry';
import { CRAFT_TEXTURE_OF, CRAFT_TEXTURE_TILE, acquireCraftTexture, applyBoxUV, craftTextureCount, releaseCraftTexture } from './craftTextures';
import { DOVECOTE_PIGEONS, PIGEON_NECK, createCraftProp, createPigeonHead } from './marketGeometry';
import { CRAFT_KINDS, LOW_COPPER, craftMaterial } from './MarketProcedural';
import { PROP_SIZES, type PropKind } from './marketLayout';

describe('toạ độ ảnh theo mét thật (applyBoxUV)', () => {
  it('mặt trên chiếu theo x–z, mặt trước theo x–y, mặt bên theo z–y, chia cho cỡ một chu kỳ', () => {
    const g = applyBoxUV(new BoxGeometry(2, 2, 2), 2);
    const pos = g.getAttribute('position');
    const nor = g.getAttribute('normal');
    const uv = g.getAttribute('uv');
    for (let i = 0; i < pos.count; i++) {
      const ny = nor.getY(i);
      const nz = nor.getZ(i);
      if (ny > 0.9) expect([uv.getX(i), uv.getY(i)]).toEqual([pos.getX(i) / 2, pos.getZ(i) / 2]);
      else if (Math.abs(nz) > 0.9) expect([uv.getX(i), uv.getY(i)]).toEqual([pos.getX(i) / 2, pos.getY(i) / 2]);
      else if (Math.abs(nor.getX(i)) > 0.9) expect([uv.getX(i), uv.getY(i)]).toEqual([pos.getZ(i) / 2, pos.getY(i) / 2]);
    }
  });

  it('mật độ vân đều: cùng độ dài thật thì cùng độ dài trong ảnh, dù hình to hay nhỏ', () => {
    const big = applyBoxUV(new CylinderGeometry(1, 1, 3, 12), 1.6);
    const small = applyBoxUV(new CylinderGeometry(0.1, 0.1, 0.3, 12), 1.6);
    const span = (g: ReturnType<typeof applyBoxUV>) => {
      const uv = g.getAttribute('uv');
      let min = Infinity;
      let max = -Infinity;
      for (let i = 0; i < uv.count; i++) {
        min = Math.min(min, uv.getY(i));
        max = Math.max(max, uv.getY(i));
      }
      return max - min;
    };
    expect(span(big) / span(small)).toBeGreaterThan(5); // to hơn thì phủ nhiều chu kỳ hơn
  });
});

describe('texture dùng chung của đồ nhỏ', () => {
  it('mọi loại có texture là loại đã khai báo; mọi texture có cỡ chu kỳ dương', () => {
    for (const [kind, name] of Object.entries(CRAFT_TEXTURE_OF)) {
      expect(PROP_SIZES[kind as PropKind], kind).toBeDefined();
      expect(CRAFT_TEXTURE_TILE[name!], `${kind}: ${name}`).toBeGreaterThan(0);
    }
  });

  it('đá, gỗ, tranh, đồng đều được dùng; bàn đá khắc và đá xẻ dùng vân đá, phôi gỗ dùng vân gỗ, mái che dùng vân tranh, máy soi dấu vân đồng', () => {
    expect(new Set(Object.values(CRAFT_TEXTURE_OF))).toEqual(new Set(['stone', 'wood', 'thatch', 'copper']));
    for (const k of ['khoi-da', 'ban-da', 'phien-da', 'da-xe', 'da-vun', 'ban-khac', 'ban-khac2', 'ban-khac3'] as const) expect(CRAFT_TEXTURE_OF[k], k).toBe('stone');
    expect(CRAFT_TEXTURE_OF['phoi-go']).toBe('wood');
    expect(CRAFT_TEXTURE_OF['mai-che']).toBe('thatch');
    expect(CRAFT_TEXTURE_OF['may-soi-dau']).toBe('copper');
  });

  it('chạy ở node (không có canvas): không có texture, không lỗi, đếm tham chiếu không lệch', () => {
    expect(acquireCraftTexture('stone')).toBeNull();
    releaseCraftTexture('stone');
    expect(craftTextureCount()).toBe(0);
  });

  it('hình dựng của loại có texture có toạ độ ảnh theo mét thật (mặt trên khối đá lớn phủ nhiều chu kỳ)', () => {
    const g = createCraftProp('da-xe')!;
    const uv = g.getAttribute('uv');
    expect(uv).toBeDefined();
    const pos = g.getAttribute('position');
    const nor = g.getAttribute('normal');
    for (let i = 0; i < pos.count; i += 37) {
      if (nor.getY(i) > 0.9) expect(uv.getX(i)).toBeCloseTo(pos.getX(i) / CRAFT_TEXTURE_TILE.stone, 5);
    }
  });
});

describe('đồ làm đẹp bước L4', () => {
  it('ba kiểu bàn đá khắc xếp dụng cụ khác nhau (hình học khác nhau) nhưng cùng khung bao và cùng chiều cao', () => {
    const sigs = (['ban-khac', 'ban-khac2', 'ban-khac3'] as const).map((k) => {
      const g = createCraftProp(k)!;
      const pos = g.getAttribute('position');
      let sx = 0;
      let sz = 0;
      for (let i = 0; i < pos.count; i++) {
        sx += pos.getX(i) * (i % 7);
        sz += pos.getZ(i) * (i % 5);
      }
      const b = new Box3().setFromBufferAttribute(pos as never);
      return { sig: `${sx.toFixed(2)}|${sz.toFixed(2)}|${pos.count}`, h: b.max.y, w: b.max.x - b.min.x };
    });
    expect(new Set(sigs.map((s) => s.sig)).size).toBe(3);
    for (const s of sigs) {
      expect(s.h).toBeCloseTo(1.05, 5);
      expect(s.w).toBeCloseTo(1.7, 5);
    }
  });

  it('đồi đá: nửa khối lởm chởm bán kính gần 1, chân ở y = 0, có toạ độ ảnh lặp để phủ vân đá', () => {
    const g = createStoneHill();
    const b = new Box3().setFromBufferAttribute(g.getAttribute('position') as never);
    expect(b.min.y).toBeCloseTo(0, 6);
    expect(b.max.y).toBeGreaterThan(0.8);
    expect(b.max.y).toBeLessThan(1.4);
    expect(b.max.x).toBeLessThan(1.2);
    const uv = g.getAttribute('uv');
    let maxU = 0;
    for (let i = 0; i < uv.count; i++) maxU = Math.max(maxU, uv.getX(i));
    expect(maxU).toBeGreaterThan(3.5);
  });

  it('bồ câu: ba con trên thanh đậu của chuồng, đầu gật quanh cổ ở gốc hình học đầu, mỏ hướng +z', () => {
    expect(DOVECOTE_PIGEONS).toHaveLength(3);
    for (const p of DOVECOTE_PIGEONS) {
      expect(Math.abs(p.x)).toBeLessThan(PROP_SIZES['chuong-bo-cau'].box!.hx);
      expect(p.y).toBeGreaterThan(2);
    }
    expect(PIGEON_NECK.y).toBeGreaterThan(0.1);
    const head = createPigeonHead();
    const b = new Box3().setFromBufferAttribute(head.getAttribute('position') as never);
    expect(b.max.z).toBeGreaterThan(0.1); // mỏ nhô ra trước
    expect(b.min.y).toBeGreaterThanOrEqual(-0.05); // đầu nằm trên cổ
    expect(b.max.y).toBeLessThan(0.2);
  });
});

describe('ánh kim chỉ của máy soi dấu (bước L4)', () => {
  it('mọi đồ nhỏ khác (kể cả bệ đá của máy) không kim loại, không bản đồ môi trường, không ánh kim giả: trông như trước L4', () => {
    for (const kind of CRAFT_KINDS) {
      if (kind === 'may-soi-dau') continue;
      const m = craftMaterial(kind);
      expect(m.metalness, kind).toBe(0);
      expect(m.envMap, kind).toBeNull();
      expect(m.onBeforeCompile.toString(), kind).not.toContain('uSheen');
    }
  });

  it('mức Thấp: máy soi dấu chỉ có màu đồng và ánh kim thấp, không ánh kim giả; các mức khác có ánh kim giả và kim loại cao hơn rõ rệt (không dùng envMap)', () => {
    const low = craftMaterial('may-soi-dau', 'low');
    expect(low.envMap).toBeNull();
    expect(low.onBeforeCompile.toString()).not.toContain('uSheen');
    expect(low.metalness).toBeCloseTo(LOW_COPPER.metalness, 6);
    for (const level of ['medium', 'high'] as const) {
      const m = craftMaterial('may-soi-dau', level);
      expect(m.metalness).toBeGreaterThan(low.metalness + 0.4);
      expect(m.envMap).toBeNull(); // envMap buộc three đổi sang PMREM ở khung đầu tiên (400 ms)
      expect(m.onBeforeCompile.toString()).toContain('uSheen');
    }
  });

  it('bệ đá của máy là vật riêng cùng bán kính vật cản của máy, không có vật cản riêng', () => {
    expect(PROP_SIZES['de-may'].r).toBe(PROP_SIZES['may-soi-dau'].r);
    expect(PROP_SIZES['de-may'].collide).toBe(false);
    expect(CRAFT_TEXTURE_OF['de-may']).toBeUndefined(); // vật liệu đá phẳng như trước, không vân mới
  });
});

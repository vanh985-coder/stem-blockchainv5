// Nén một model .glb cho assets-build.mjs (spec 01 mục 5 "Xử lý model").
// dedup, weld, (simplify nếu không xương và quá nặng), texture sang WebP, nén meshopt.
// LƯU Ý khi tải: file nén meshopt (EXT_meshopt_compression, bắt buộc) cần gọi loader.setMeshoptDecoder(MeshoptDecoder)
// trên GLTFLoader; texture WebP (EXT_texture_webp) three.js tự hỗ trợ.
import { createTransform, dedup, compactPrimitive, prune, textureCompress, weld, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { boundsDeviation, createIO, inspectDoc, skinnedRestBounds } from './glb.mjs';
import { composeBeforeAfter, renderRaw } from './preview.mjs';

/** Model không xương có nhiều hơn số này thì giảm mặt. Có xương thì chỉ cảnh báo. */
export const SIMPLIFY_ABOVE_TRIS = 30000;
export const PREVIEW_SIZE = 480;

/**
 * Số tam giác mục tiêu ghi đè theo model (đường dẫn không đuôi). Mặc định theo spec 01: nhân vật ~15.000, đồ vật ~8.000.
 * Xe bò: thân con trâu là lưới liền mạch nên hấp thụ toàn bộ phần giảm; ở ~21.000 tam giác nó thành khối đa giác thô.
 */
const TARGET_TRIS_OVERRIDE = { 'models/games/man-02-duoi-ti/xe-bo': 40000 };

/** Quy tắc theo đường dẫn không đuôi, ví dụ "models/characters/ti". */
export function classifyModel(key) {
  const MB = 1048576;
  if (key.startsWith('models/characters/')) {
    return { kind: 'nhan-vat', maxTexture: 1024, targetTris: TARGET_TRIS_OVERRIDE[key] ?? 15000, maxBytes: 2.5 * MB };
  }
  const big = key === 'models/env/cay-da' || /^models\/env\/cong-lang-/.test(key); // cây đa và 4 cổng làng: texture 2048
  return { kind: 'do-vat', maxTexture: big ? 2048 : 1024, targetTris: TARGET_TRIS_OVERRIDE[key] ?? 8000, maxBytes: 1.5 * MB };
}

// Trọng số cho thuộc tính khi giảm mặt: để UV và pháp tuyến không bị kéo vỡ.
const ATTR_WEIGHTS = { NORMAL: 0.5, TEXCOORD_0: 1, COLOR_0: 0.5 };

/**
 * Chế độ chặt (mặc định của meshopt) giữ nguyên đường nối UV nên texture sạch, nhưng model nhiều đường nối
 * (mái tranh, gạch, khung cửi) dừng ở số tam giác cao hơn mục tiêu. Nếu chế độ chặt dừng ở mức này hoặc thấp hơn
 * thì giữ kết quả chặt (vượt mục tiêu, có cảnh báo); cao hơn nữa thì mới dùng Permissive (sập cạnh qua đường nối,
 * đạt mục tiêu nhưng texture bị méo).
 */
export const STRICT_ACCEPT_TRIS = 40000;

/** Giảm mặt có tính tới UV, pháp tuyến, màu đỉnh (khác simplify của gltf-transform vốn chỉ nhìn vị trí). */
function simplifyKeepingAttributes(targetTris, report) {
  return createTransform('simplifyAttributes', async (document) => {
    await MeshoptSimplifier.ready;
    const logger = document.getLogger();
    const prims = document.getRoot().listMeshes().flatMap((m) => m.listPrimitives()).filter((p) => p.getMode() === 4 && p.getIndices());
    const total = prims.reduce((s, p) => s + p.getIndices().getCount() / 3, 0);
    const ratio = Math.min(1, targetTris / total);

    // Chuẩn bị dữ liệu vào meshopt cho từng primitive.
    const jobs = prims.map((prim) => {
      const position = prim.getAttribute('POSITION');
      const n = position.getCount();
      const positions = new Float32Array(n * 3);
      const el = [0, 0, 0];
      for (let i = 0; i < n; i++) {
        position.getElement(i, el);
        positions.set(el, i * 3);
      }
      // Gom thuộc tính vào một mảng xen kẽ.
      const parts = [];
      for (const [semantic, weight] of Object.entries(ATTR_WEIGHTS)) {
        const a = prim.getAttribute(semantic);
        if (!a) continue;
        parts.push({ a, size: Math.min(a.getElementSize(), semantic === 'TEXCOORD_0' ? 2 : 3), weight });
      }
      const stride = parts.reduce((s, p) => s + p.size, 0);
      const attrs = new Float32Array(n * stride);
      const weights = [];
      let off = 0;
      const tmp = [0, 0, 0, 0];
      for (const part of parts) {
        for (let i = 0; i < n; i++) {
          part.a.getElement(i, tmp);
          for (let k = 0; k < part.size; k++) attrs[i * stride + off + k] = tmp[k];
        }
        for (let k = 0; k < part.size; k++) weights.push(part.weight);
        off += part.size;
      }
      const indices = Uint32Array.from(prim.getIndices().getArray());
      const targetCount = Math.max(3 * 4, Math.floor((ratio * indices.length) / 3) * 3);
      return { prim, positions, attrs, weights, stride, indices, targetCount };
    });

    const run = (flags) =>
      jobs.map((j) =>
        (j.stride
          ? MeshoptSimplifier.simplifyWithAttributes(j.indices, j.positions, 3, j.attrs, j.stride, j.weights, null, j.targetCount, 1, flags)
          : MeshoptSimplifier.simplify(j.indices, j.positions, 3, j.targetCount, 1, flags))[0],
      );
    const count = (res) => res.reduce((s, r) => s + r.length / 3, 0);

    let result = run([]);
    let trisOut = count(result);
    if (trisOut > Math.max(STRICT_ACCEPT_TRIS, targetTris * 1.5)) {
      logger.info(`simplify: chế độ chặt dừng ở ${Math.round(trisOut)} tam giác, thử Permissive`);
      result = run(['Permissive']);
      trisOut = count(result);
      report.permissive = true;
    }

    jobs.forEach((j, i) => {
      const srcIndices = j.prim.getIndices();
      j.prim.setIndices(document.createAccessor().setType('SCALAR').setArray(result[i]).setBuffer(j.prim.getAttribute('POSITION').getBuffer()));
      if (srcIndices.listParents().length === 1) srcIndices.dispose();
      compactPrimitive(j.prim);
    });
  });
}

/**
 * Nén một file. Trả về:
 * { glb: Buffer, before, after (inspectDoc), srcBytes, simplified, permissive, preview: Buffer|null, skinDeviation: number|null }
 */
export async function buildModel(srcBytes, rule) {
  const io = await createIO();
  const doc = await io.readBinary(new Uint8Array(srcBytes));
  // File gốc nén Draco đã được giải mã khi đọc; gỡ extension để lúc ghi không đòi mã hóa lại bằng Draco (ta dùng meshopt).
  for (const ext of doc.getRoot().listExtensionsUsed()) if (ext.extensionName === 'KHR_draco_mesh_compression') ext.dispose();
  const before = inspectDoc(doc);
  const skinned = before.skins > 0;
  const simplified = !skinned && before.tris > SIMPLIFY_ABOVE_TRIS;

  const beforeRaw = simplified ? await renderRaw(doc, { size: PREVIEW_SIZE }) : null;
  const boundsBefore = skinned ? skinnedRestBounds(doc) : null;

  const steps = [dedup(), weld()];
  const simplifyReport = { permissive: false };
  if (simplified) steps.push(simplifyKeepingAttributes(rule.targetTris, simplifyReport));
  steps.push(
    prune({ keepLeaves: true }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [rule.maxTexture, rule.maxTexture], quality: 85, effort: 4 }),
    meshopt({ encoder: MeshoptEncoder, level: 'high' }),
  );
  await doc.transform(...steps);
  const glb = Buffer.from(await io.writeBinary(doc));

  // Đọc lại đúng file đã ghi để đo và kiểm tra.
  const out = await io.readBinary(new Uint8Array(glb));
  const after = inspectDoc(out);
  let preview = null;
  if (simplified) {
    const afterRaw = await renderRaw(out, { size: PREVIEW_SIZE });
    const fmt = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : `${Math.round(n).toLocaleString('en-US')}`);
    preview = await composeBeforeAfter(beforeRaw, afterRaw, PREVIEW_SIZE, `Truoc: ${fmt(before.tris)} tam giac`, `Sau: ${fmt(after.tris)} tam giac`);
  }
  const skinDeviation = skinned ? boundsDeviation(boundsBefore, skinnedRestBounds(out)) : null;
  return { glb, before, after, srcBytes: srcBytes.length, simplified, permissive: simplifyReport.permissive, preview, skinDeviation };
}

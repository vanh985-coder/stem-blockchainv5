// Nén một model .glb cho assets-build.mjs (spec 01 mục 5 "Xử lý model").
// dedup, weld, gỡ vật liệu kính, (giảm mặt nếu không xương và quá nặng), texture sang WebP, nén meshopt.
// Mỗi model trong models/env và models/games có thêm bản xa "<tên>-xa" (ít mặt, texture nhỏ).
// LƯU Ý khi tải: file nén meshopt (EXT_meshopt_compression, bắt buộc) cần gọi loader.setMeshoptDecoder(MeshoptDecoder)
// trên GLTFLoader; texture WebP (EXT_texture_webp) three.js tự hỗ trợ.
import { createTransform, dedup, compactPrimitive, normals, prune, textureCompress, weld, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { boundsDeviation, createIO, inspectDoc, skinnedRestBounds } from './glb.mjs';
import { composePanels, renderRaw } from './preview.mjs';

const MB = 1048576;
export const PREVIEW_SIZE = 480;
export const LOD_SUFFIX = '-xa';
export const LOD_TRIS = 8000;
export const LOD_TEXTURE = 512;
/**
 * Bản vừa (LOD giữa, bước 8b): model đồ vật có bản chính trên `MID_MIN_MAIN_TRIS` tam giác có thêm "<tên>-vua" khoảng `MID_TRIS` tam giác. CHỈ dùng chế độ chặt
 * (sai số tối đa 3%, không Permissive) nên texture và pháp tuyến sạch; nếu chế độ chặt dừng cao hơn mục tiêu thì giữ nguyên và ghi cảnh báo.
 */
export const MID_SUFFIX = '-vua';
export const MID_TRIS = 15000;
export const MID_MIN_MAIN_TRIS = 20000;
/**
 * Bản vừa chỉ được tạo (và ghi vào manifest) khi chế độ chặt xuống được tới mức này (tam giác) hoặc thấp hơn (bước 8c). Dừng cao hơn thì bản vừa chẳng nhẹ hơn bản chính bao nhiêu,
 * không dùng được, nên bỏ: không tạo, không ghi manifest, và `pnpm assets:build` ghi cảnh báo.
 */
export const MID_MAX_TRIS = 25000;
export const MID_TEXTURE = 1024;
export const MID_WEBP_QUALITY = 85;
/** Chất lượng WebP của texture (spec 01 mục 5). */
export const WEBP_QUALITY = 90;
/** Bản xa chỉ nhìn từ xa: nén mạnh hơn để giữ ≤ 0,4 MB. */
export const LOD_WEBP_QUALITY = 80;
/** Vật liệu kính bị gỡ: đổi về vật liệu thường, giữ màu gốc. */
const GLASS_EXTENSIONS = ['KHR_materials_transmission', 'KHR_materials_volume'];

/** Quy tắc theo đường dẫn không đuôi, ví dụ "models/characters/ti". */
export function classifyModel(key) {
  if (key.startsWith('models/characters/')) {
    // Nhân vật có xương không giảm mặt. Nhân vật đứng yên chỉ giảm nếu trên 30.000 tam giác (không có cái nào).
    return { kind: 'nhan-vat', maxTexture: 2048, targetTris: 15000, simplifyAbove: 30000, maxBytes: 3 * MB, lod: false };
  }
  // Cổng làng, cây đa, nhà: model lớn, nhìn gần, nên được nhiều mặt và texture 2048.
  const big = key === 'models/env/cay-da' || /^models\/env\/(cong-lang-|nha-)/.test(key);
  const targetTris = big ? 50000 : 30000;
  return { kind: 'do-vat', maxTexture: big ? 2048 : 1024, targetTris, simplifyAbove: targetTris, maxBytes: 2.5 * MB, lod: true, lodMaxBytes: 0.4 * MB };
}

/**
 * Sai số tối đa (tỉ lệ so với kích thước model) khi giảm mặt bản chính. Không giới hạn (1 = 100%) thì khi không đạt được mục tiêu,
 * meshopt vẫn nhận những lần sập cạnh rất xấu và sinh ra gai (khung cửi). Bản xa cần đạt 8.000 nên không giới hạn.
 */
export const MAIN_MAX_ERROR = 0.03;

/** Trọng số thuộc tính khi giảm mặt: để UV, pháp tuyến và màu đỉnh không bị kéo vỡ. */
const ATTR_WEIGHTS = { NORMAL: 0.5, TEXCOORD_0: 1, COLOR_0: 0.5 };

/**
 * Giảm mặt có tính tới UV, pháp tuyến, màu đỉnh (khác simplify của gltf-transform vốn chỉ nhìn vị trí).
 * Chế độ chặt giữ nguyên đường nối UV nên texture sạch, nhưng có thể dừng ở số tam giác cao hơn mục tiêu.
 * Permissive cho phép sập cạnh qua đường nối: đạt mục tiêu nhưng texture bị méo (dùng cho bản xa).
 * `report.tris` nhận số tam giác thực tế sau khi giảm.
 */
export function simplifyKeepingAttributes(targetTris, { permissive = false, weights = ATTR_WEIGHTS, error = 1 } = {}, report = {}) {
  return createTransform('simplifyAttributes', async (document) => {
    await MeshoptSimplifier.ready;
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
      for (const [semantic, weight] of Object.entries(weights)) {
        const a = prim.getAttribute(semantic);
        if (!a) continue;
        parts.push({ a, size: Math.min(a.getElementSize(), semantic === 'TEXCOORD_0' ? 2 : 3), weight });
      }
      const stride = parts.reduce((s, p) => s + p.size, 0);
      const attrs = new Float32Array(n * stride);
      const w = [];
      let off = 0;
      const tmp = [0, 0, 0, 0];
      for (const part of parts) {
        for (let i = 0; i < n; i++) {
          part.a.getElement(i, tmp);
          for (let k = 0; k < part.size; k++) attrs[i * stride + off + k] = tmp[k];
        }
        for (let k = 0; k < part.size; k++) w.push(part.weight);
        off += part.size;
      }
      const indices = Uint32Array.from(prim.getIndices().getArray());
      const targetCount = Math.max(3 * 4, Math.floor((ratio * indices.length) / 3) * 3);
      return { prim, positions, attrs, weights: w, stride, indices, targetCount };
    });

    const flags = permissive ? ['Permissive'] : [];
    const result = jobs.map(
      (j) =>
        (j.stride
          ? MeshoptSimplifier.simplifyWithAttributes(j.indices, j.positions, 3, j.attrs, j.stride, j.weights, null, j.targetCount, error, flags)
          : MeshoptSimplifier.simplify(j.indices, j.positions, 3, j.targetCount, error, flags))[0],
    );
    report.tris = result.reduce((s, r) => s + r.length / 3, 0);

    jobs.forEach((j, i) => {
      const srcIndices = j.prim.getIndices();
      j.prim.setIndices(document.createAccessor().setType('SCALAR').setArray(result[i]).setBuffer(j.prim.getAttribute('POSITION').getBuffer()));
      if (srcIndices.listParents().length === 1) srcIndices.dispose();
      compactPrimitive(j.prim);
    });
  });
}

/** Gỡ KHR_materials_transmission và KHR_materials_volume; trả về tên các extension thực sự bị gỡ. */
function removeGlassExtensions(doc) {
  const removed = [];
  for (const ext of doc.getRoot().listExtensionsUsed()) {
    if (GLASS_EXTENSIONS.includes(ext.extensionName)) {
      removed.push(ext.extensionName);
      ext.dispose();
    }
  }
  return removed;
}

/** Đọc file gốc. File nén Draco đã được giải mã khi đọc; gỡ extension để lúc ghi không đòi mã hóa lại bằng Draco. */
async function readSource(io, srcBytes) {
  const doc = await io.readBinary(new Uint8Array(srcBytes));
  for (const ext of doc.getRoot().listExtensionsUsed()) if (ext.extensionName === 'KHR_draco_mesh_compression') ext.dispose();
  return doc;
}

/**
 * Một biến thể (bản chính hoặc bản xa), đọc lại từ file gốc.
 * Trả về { glb, before, after, simplified, reachedTris, removedExt, skinDeviation, raw }.
 */
async function buildVariant(io, srcBytes, rule, { lod, mid = false }) {
  const doc = await readSource(io, srcBytes);
  const before = inspectDoc(doc);
  const skinned = before.skins > 0;
  const target = lod ? LOD_TRIS : mid ? MID_TRIS : rule.targetTris;
  const simplified = !skinned && before.tris > (lod || mid ? target : rule.simplifyAbove);
  const removedExt = removeGlassExtensions(doc);
  const boundsBefore = skinned ? skinnedRestBounds(doc) : null;

  const report = {};
  const steps = [dedup(), weld()];
  if (simplified) steps.push(simplifyKeepingAttributes(target, { permissive: lod, error: lod ? 1 : MAIN_MAX_ERROR }, report)); // bản vừa như bản chính: chế độ chặt, sai số 3%
  // Giảm mặt kiểu Permissive làm pháp tuyến đỉnh hỏng (mảng đen, tối): bản xa tính lại pháp tuyến từ hình khối.
  if (simplified && lod) steps.push(normals({ overwrite: true }));
  const maxTexture = lod ? LOD_TEXTURE : mid ? Math.min(MID_TEXTURE, rule.maxTexture) : rule.maxTexture;
  const webpQuality = lod ? LOD_WEBP_QUALITY : mid ? MID_WEBP_QUALITY : WEBP_QUALITY;
  steps.push(
    prune({ keepLeaves: true }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [maxTexture, maxTexture], quality: webpQuality, effort: 4 }),
    // UV 12 bit (mặc định) chỉ có 4096 bước, sát với texture 2048; dùng 14 bit cho khỏi mất chi tiết.
    meshopt({ encoder: MeshoptEncoder, level: 'high', quantizeTexcoord: 14 }),
  );
  await doc.transform(...steps);
  const glb = Buffer.from(await io.writeBinary(doc));

  // Đọc lại đúng file đã ghi để đo, kiểm tra và dựng ảnh.
  const out = await io.readBinary(new Uint8Array(glb));
  const after = inspectDoc(out);
  const skinDeviation = skinned ? boundsDeviation(boundsBefore, skinnedRestBounds(out)) : null;
  const raw = await renderRaw(out, { size: PREVIEW_SIZE });
  return { glb, before, after, simplified, reachedTris: report.tris ?? before.tris, removedExt, skinDeviation, raw };
}

const fmtTris = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : Math.round(n).toLocaleString('en-US'));
const fmtMb = (b) => `${(b / MB).toFixed(2)} MB`;

/**
 * Nén một model: bản chính, bản vừa (nếu bản chính trên 20.000 tam giác) và (nếu rule.lod) bản xa, kèm ảnh so sánh gốc | chính | vừa | xa.
 * Trả về { srcBytes, srcInfo, main, mid, lod, preview } (main, mid và lod là kết quả buildVariant; mid là bản vừa, null nếu bản chính không quá MID_MIN_MAIN_TRIS).
 */
export async function buildModelSet(srcBytes, rule) {
  const io = await createIO();
  const srcDoc = await io.readBinary(new Uint8Array(srcBytes));
  const srcInfo = inspectDoc(srcDoc);
  const srcRaw = await renderRaw(srcDoc, { size: PREVIEW_SIZE });
  const main = await buildVariant(io, srcBytes, rule, { lod: false });
  const midTry = rule.lod && main.after.tris > MID_MIN_MAIN_TRIS ? await buildVariant(io, srcBytes, rule, { lod: false, mid: true }) : null;
  // chế độ chặt dừng cao hơn MID_MAX_TRIS: bỏ bản vừa (ghi lại để build sau không thử lại và để cảnh báo)
  const midSkipped = midTry && midTry.after.tris > MID_MAX_TRIS ? { reachedTris: Math.round(midTry.after.tris) } : null;
  const mid = midTry && !midSkipped ? midTry : null;
  const lod = rule.lod ? await buildVariant(io, srcBytes, rule, { lod: true }) : null;
  const panels = [
    { raw: srcRaw, label: `Goc: ${fmtTris(srcInfo.tris)} tam giac, ${fmtMb(srcBytes.length)}` },
    { raw: main.raw, label: `Chinh: ${fmtTris(main.after.tris)} tam giac, ${fmtMb(main.glb.length)}` },
  ];
  if (mid) panels.push({ raw: mid.raw, label: `Vua: ${fmtTris(mid.after.tris)} tam giac, ${fmtMb(mid.glb.length)}` });
  if (lod) panels.push({ raw: lod.raw, label: `Xa: ${fmtTris(lod.after.tris)} tam giac, ${fmtMb(lod.glb.length)}` });
  const preview = await composePanels(panels, PREVIEW_SIZE);
  delete main.raw;
  if (mid) delete mid.raw;
  if (lod) delete lod.raw;
  return { srcBytes: srcBytes.length, srcInfo, main, mid, midSkipped, lod, preview };
}

// Luật "không viết cứng tên phản diện" (CLAUDE.md mục 5): tên phản diện chỉ được lấy từ `{phanDien}` (content/characters.ts).
// Chỉ bắt đúng CẢ TỪ: ranh giới chữ tính cả chữ tiếng Việt có dấu, nên "Tí chạy", "của Tí." bị bắt còn "Tính", "Tím", "Tích", "Tín" thì không.

/** Tên phản diện đang dùng, đọc từ nội dung file characters.ts (dòng `export const phanDien = '...'`); không có thì null. */
export function readVillainName(charactersSource) {
  const m = /export const phanDien\s*=\s*(['"])(.+?)\1/.exec(charactersSource);
  return m ? m[2].normalize('NFC') : null;
}

const ESCAPE = /[.*+?^${}()|[\]\\]/g;

/**
 * Chỉ số (0, 1, …) các chỗ trong `text` có nguyên cả từ `name`. Chuẩn hóa NFC trước khi so (chữ có dấu gõ kiểu tổ hợp vẫn bị bắt); chữ cái hay dấu đứng sát hai bên thì không tính là cả từ.
 */
export function findVillainName(text, name) {
  const re = new RegExp(`(?<![\\p{L}\\p{M}\\p{N}_])${name.normalize('NFC').replace(ESCAPE, '\\$&')}(?![\\p{L}\\p{M}\\p{N}_])`, 'gu');
  const out = [];
  for (const m of text.normalize('NFC').matchAll(re)) out.push(m.index);
  return out;
}

import { devWarn } from '../lib/dev';

/**
 * Tên phản diện. MUỐN ĐỔI TÊN (ví dụ thành "Cuội") CHỈ SỬA ĐÚNG DÒNG NÀY.
 * Mọi lời thoại và câu hỏi viết {phanDien}, không viết thẳng tên.
 */
export const phanDien = 'Tí';

export type CharacterId =
  | 'hocSinh'
  | 'phanDien'
  | 'baCu'
  | 'nongDan'
  | 'bacAn'
  | 'cuBinh'
  | 'coChi'
  | 'chuDung'
  | 'thayLinh'
  | 'laiBuon'
  | 'bi';

export interface CharacterInfo {
  /** Tên khi nằm giữa câu, ví dụ "bác An". Tên người nói ở hộp thoại tự viết hoa chữ đầu. */
  name: string;
  /** Tên file chân dung trong ui/portraits/ (không đuôi). */
  portrait: string;
}

/** Bảng nhân vật theo spec 03 mục 3.1. `hocSinh` không có tên cố định: lấy tên người chơi ({ten}). */
export const CHARACTERS: Record<CharacterId, CharacterInfo> = {
  hocSinh: { name: 'em', portrait: 'hoc-sinh-nam' },
  phanDien: { name: phanDien, portrait: 'ti' },
  baCu: { name: 'bà cụ', portrait: 'ba-cu' },
  nongDan: { name: 'chú nông dân', portrait: 'nong-dan' },
  bacAn: { name: 'bác An', portrait: 'bac-an' },
  cuBinh: { name: 'cụ Bình', portrait: 'cu-binh' },
  coChi: { name: 'cô Chi', portrait: 'co-chi' },
  chuDung: { name: 'chú Dũng', portrait: 'chu-dung' },
  thayLinh: { name: 'thầy Linh', portrait: 'thay-linh' },
  laiBuon: { name: 'lái buôn', portrait: 'lai-buon' },
  bi: { name: 'Bi', portrait: 'bi' },
};

export const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[];

/** Chỗ giữ tên cho từng nhân vật: {phanDien}, {bacAn}, {cuBinh}… (trừ hocSinh, dùng {ten}). */
export type NameTable = Record<string, string>;

export function characterNames(table: Record<CharacterId, CharacterInfo> = CHARACTERS): NameTable {
  const out: NameTable = {};
  for (const id of CHARACTER_IDS) {
    if (id !== 'hocSinh') out[id] = table[id].name;
  }
  return out;
}

/** Chỗ giữ số và chữ khác mà lời thoại, nhãn được phép dùng (ngoài {ten}, {Ten} và tên nhân vật). */
export const EXTRA_VARS = ['so', 'diem', 'kb', 'muc', 'earned', 'max', 'bai', 'man', 'lang', 'path', 'src', 'loi', 'trangThai', 'x', 'y', 'n', 'truoc', 'nd', 'ma', 'gapDoi', 'tong', 's', 'sau', 'k', 'tram', 'tenTram', 'sao', 'nguoi', 'phieu', 'chiTiet', 'cacPhan', 'tao', 'cuoi', 'dung', 'cu', 'moi', 'luot', 'so2', 'so3', 'myName', 'nextN', 'nextK', 'wrongNames', 'attempts', 'secs', 'm', 'days', 'wrongExplanation', 'testedKey', 'supercomputerTriesPerSec', 'supercomputerYears', 'smartSteps', 'smartYears', 'universeMultiplier', 'so4', 'id', 'id2', 'value', 'value2', 'inputValue', 'inputVal', 'expectedValue', 'expected', 'pairLabel', 'label', 'hintFormula', 'nodeLabel', 'rightVal', 'leftVal', 'reverseVal', 'level', 'placedVal', 'accumK', 'accumN', 'checkCount', 'msDisplay', 'p1Prediction', 'priv', 'tamperedNewValue', 'nhan', 'ketQua', 'la'] as const;

export type FmtVars = { ten?: string } & Record<string, string | number | undefined>;

export function capitalize(text: string): string {
  return text === '' ? text : text.charAt(0).toLocaleUpperCase('vi') + text.slice(1);
}

const PLACEHOLDER = /\{([A-Za-z][A-Za-z0-9]*)\}/g;

/**
 * Hàm thuần: thay chỗ giữ tên trong `text`.
 * - {ten} / {Ten}: tên người chơi (nếu không có thì "em" / "Em"); {Ten} viết hoa chữ đầu.
 * - {phanDien}, {bacAn}…: lấy từ `names`.
 * - Các biến trong `vars` (ví dụ {so}) thay bằng giá trị tương ứng.
 * - Chỗ giữ tên lạ: giữ nguyên, chỉ cảnh báo ở chế độ dev.
 */
export function formatText(text: string, names: NameTable, vars: FmtVars = {}): string {
  return text.replace(PLACEHOLDER, (whole, key: string) => {
    if (key === 'ten' || key === 'Ten') {
      const player = (vars.ten ?? '').trim() || 'em';
      return key === 'Ten' ? capitalize(player) : player;
    }
    const v = vars[key];
    if (v !== undefined) return String(v);
    if (Object.prototype.hasOwnProperty.call(names, key)) return names[key];
    devWarn(`Chỗ giữ tên không có trong danh sách: ${whole}`);
    return whole;
  });
}

/** Tạo fmt dùng một bảng tên riêng (dùng trong test: đổi phanDien thì mọi chuỗi đổi theo). */
export function makeFmt(names: NameTable) {
  return (text: string, vars?: FmtVars): string => formatText(text, names, vars);
}

export const fmt = makeFmt(characterNames());

/** Tên người nói ở hộp thoại: viết hoa chữ đầu; học sinh dùng tên người chơi. */
export function speakerLabel(id: CharacterId, vars: FmtVars = {}): string {
  if (id === 'hocSinh') return capitalize((vars.ten ?? '').trim() || 'em');
  return capitalize(fmt(CHARACTERS[id].name));
}

/** Tên cho chữ thay thế của ảnh chân dung (alt). */
export function portraitAlt(portrait: string): string {
  const id = CHARACTER_IDS.find((c) => CHARACTERS[c].portrait === portrait);
  return id ? speakerLabel(id) : portrait;
}

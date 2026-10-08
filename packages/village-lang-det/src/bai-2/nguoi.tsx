import { CHARACTERS, PortraitFrame, fmt, speakerLabel, type CharacterId } from '@so-chung/core';

/** 3 người gửi trang ở Bài 2: cụ Bình (cẩn thận), cô Chi (vội vàng), {phanDien} (gian xảo). */
export type BotId = 'binh' | 'chi' | 'ti';
/** 4 người chơi ở trạm Khó */
export type PlayerKey = 'em' | BotId;

const CHARACTER_OF: Record<BotId, CharacterId> = { binh: 'cuBinh', chi: 'coChi', ti: 'phanDien' };

/** Tên giữa câu, ví dụ "cụ Bình" */
export const tenGiua = (id: BotId): string => fmt(`{${CHARACTER_OF[id]}}`);

/** Tên viết hoa chữ đầu để làm nhãn, ví dụ "Cụ Bình" */
export const tenNhan = (id: BotId): string => speakerLabel(CHARACTER_OF[id]);

/** Tên nhãn của người chơi; em thì lấy tên người chơi ({Ten}) */
export const tenNguoiChoi = (id: PlayerKey, playerName: string | undefined): string =>
  id === 'em' ? fmt('{Ten}', { ten: playerName }) : tenNhan(id);

const portraitOf = (id: PlayerKey): string => (id === 'em' ? CHARACTERS.hocSinh.portrait : CHARACTERS[CHARACTER_OF[id]].portrait);

/** Chân dung vuông bo góc của một người chơi */
export function Chan({ id, size = 48 }: { id: PlayerKey; size?: number }) {
  return <PortraitFrame portrait={portraitOf(id)} size={size} />;
}

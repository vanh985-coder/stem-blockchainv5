import { CHARACTERS, fmt, speakerLabel, type CharacterId } from '@so-chung/core';
import { bai3Names } from '@so-chung/core/content/lessons/bai-3';

/** Mọi người xuất hiện trong Bài 3: 6 nhân vật của bảng khóa và 5 bạn ở trạm Dễ */
export type PersonId = 'em' | 'an' | 'binh' | 'chi' | 'dung' | 'ti' | 'giang' | 'hoa' | 'khang' | 'lan' | 'minh';

/** Số khóa dùng id cũ của giai đoạn 1 (an, binh…); nhân vật thật lấy từ content/characters */
const CHARACTER_OF: Partial<Record<PersonId, CharacterId>> = {
  em: 'hocSinh',
  an: 'bacAn',
  binh: 'cuBinh',
  chi: 'coChi',
  dung: 'chuDung',
  ti: 'phanDien',
};

/** Chân dung của người đó (5 bạn có file chân dung cùng tên với id) */
export const portraitOf = (id: PersonId): string => {
  const c = CHARACTER_OF[id];
  return c ? CHARACTERS[c].portrait : id;
};

/** Tên viết hoa chữ đầu để làm nhãn, ví dụ "Bác An"; em thì lấy tên người chơi */
export const tenNhan = (id: PersonId, playerName?: string): string => {
  if (id === 'em') return fmt('{Ten}', { ten: playerName });
  const c = CHARACTER_OF[id];
  return c ? speakerLabel(c) : bai3Names[id as keyof typeof bai3Names];
};

/** Tên giữa câu, ví dụ "bác An" */
export const tenGiua = (id: PersonId, playerName?: string): string => {
  if (id === 'em') return fmt('{ten}', { ten: playerName });
  const c = CHARACTER_OF[id];
  return c ? fmt(`{${c}}`) : bai3Names[id as keyof typeof bai3Names];
};

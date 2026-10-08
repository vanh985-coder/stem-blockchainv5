import { CHARACTERS, type CharacterId } from '@so-chung/core';

/** Mã người của giai đoạn 1 (an, binh, chi, dung, ti) → nhân vật thật */
const CHARACTER_OF: Record<string, CharacterId> = {
  an: 'bacAn',
  binh: 'cuBinh',
  chi: 'coChi',
  dung: 'chuDung',
  ti: 'phanDien',
};

/** Tên file chân dung của người đó (ui/portraits/…) */
export const portraitOf = (id: string): string => CHARACTERS[CHARACTER_OF[id]].portrait;

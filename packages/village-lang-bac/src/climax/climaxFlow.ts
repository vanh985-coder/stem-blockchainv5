/**
 * Luồng cảnh cao trào sau màn 12 (spec 08 "Cảnh cao trào", bước B5): hàm thuần, không React. Bốn bước, mỗi bước một hộp VnDialog có "Bỏ qua":
 *  a. ảnh truyện số 10 kèm lời (lấy từ STORY, cùng chữ với /truyen);
 *  b. dưới gốc đa (cảnh 3D nhỏ): {phanDien} cúi đầu nói, cụ Bình nói, {phanDien} "Có ạ!";
 *  c. ảnh truyện số 11 kèm lời;
 *  d. thầy Linh trao Trang Sổ Vàng thứ tư (hàng 4 ô), Bi nói, dòng "Hội làng sắp mở".
 * Bước d chỉ có khi trang thứ tư chưa có trước ván này (tài khoản đã có trang từ luật mốc 1 thì không trao lại) hoặc khi xem lại.
 */
import { CHARACTERS, FESTIVAL_LAUNCHED, STORY, climaxUi, fmt, speakerLabel, type CharacterId } from '@so-chung/core';

export type ClimaxStepId = 'a' | 'b' | 'c' | 'd';

/** Một lượt thoại. `pagesRow`: đặt hàng 4 ô Trang Sổ Vàng dưới lời (bước d). `note`: dòng chữ đậm dưới lời. `speakerId`: ai đang nói (điều khiển hoạt cảnh 3D). */
export interface ClimaxTurn {
  speaker?: string;
  portrait?: string;
  image?: string;
  text: string;
  mood?: 'vui';
  speakerId?: CharacterId;
  pagesRow?: boolean;
  note?: string;
}

export interface ClimaxStep {
  id: ClimaxStepId;
  turns: ClimaxTurn[];
  /** Có cảnh 3D dưới gốc đa không */
  scene: boolean;
}

export interface ClimaxOptions {
  /** Tên học sinh (chỗ giữ {ten}) */
  ten: string;
  /** Có trao Trang Sổ Vàng thứ tư ở bước d không */
  award: boolean;
  /** Hội làng đã ra mắt chưa (mặc định `FESTIVAL_LAUNCHED`): chưa thì Bi nói "đang chuẩn bị mở hội" kèm dòng "Hội làng sắp mở", rồi thì "đang mở hội" và không có dòng đó */
  festivalLaunched?: boolean;
}

const storyTurn = (n: number, ten: string): ClimaxTurn => {
  const frame = STORY.find((s) => s.n === n);
  if (!frame) throw new Error(`Missing story frame ${n}`);
  return { image: frame.image, text: fmt(frame.text, { ten }) };
};

const say = (id: CharacterId, text: string, ten: string, extra: Partial<ClimaxTurn> = {}): ClimaxTurn => ({
  speaker: speakerLabel(id),
  portrait: CHARACTERS[id].portrait,
  text: fmt(text, { ten }),
  speakerId: id,
  ...extra,
});

/** Các bước của cảnh, theo thứ tự a, b, c rồi d (nếu có trao trang). */
export function climaxSteps({ ten, award, festivalLaunched = FESTIVAL_LAUNCHED }: ClimaxOptions): ClimaxStep[] {
  const steps: ClimaxStep[] = [
    { id: 'a', scene: false, turns: [storyTurn(10, ten)] },
    {
      id: 'b',
      scene: true,
      turns: [say('phanDien', climaxUi.loiPhanDien, ten), say('cuBinh', climaxUi.loiCuBinh, ten), say('phanDien', climaxUi.loiPhanDienCoA, ten, { mood: 'vui' })],
    },
    { id: 'c', scene: false, turns: [storyTurn(11, ten)] },
  ];
  if (award) {
    steps.push({
      id: 'd',
      scene: true,
      turns: [
        // lời chú thích của cảnh trao trang: chân dung thầy Linh, không ghi tên người nói (không phải lời thoại)
        { portrait: CHARACTERS.thayLinh.portrait, text: fmt(climaxUi.traoTrang, { ten }), speakerId: 'thayLinh', mood: 'vui', pagesRow: true },
        festivalLaunched ? say('bi', climaxUi.biDuTrang, ten, { mood: 'vui' }) : say('bi', climaxUi.biDuTrangChuanBi, ten, { note: climaxUi.hoiLangSapMo, mood: 'vui' }),
      ],
    });
  }
  return steps;
}

/** Chữ ở nút lượt cuối của một bước: bước cuối cùng của cảnh là "Xem kết quả" (xem lại thì "Xong"), các bước khác để mặc định ("Tiếp"). */
export function finishLabelOf(stepIndex: number, stepCount: number, replay: boolean): string | undefined {
  return stepIndex === stepCount - 1 ? (replay ? climaxUi.xong : climaxUi.xemKetQua) : undefined;
}

/** Hoạt cảnh 3D theo bước và lượt: {phanDien} cúi đầu (sad) ở lượt đầu bước b, vui (cheer) khi nói "Có ạ!"; ai đang nói thì "talking". */
export interface ClimaxMotion {
  /** {phanDien} cúi đầu (tư thế sad, lặp lại cho tới hết lượt) */
  tiBow: boolean;
  /** {phanDien} nhảy cẫng (cheer) */
  tiCheer: boolean;
  /** Nhân vật không xương đang nói (nghiêng đầu, quay về phía người nghe) */
  talking: CharacterId | null;
}

export function climaxMotion(step: ClimaxStep, turnIndex: number): ClimaxMotion {
  const turn = step.turns[Math.min(Math.max(turnIndex, 0), step.turns.length - 1)];
  const id = turn?.speakerId ?? null;
  return {
    tiBow: step.id === 'b' && turnIndex !== 2,
    tiCheer: step.id === 'b' && turnIndex === 2,
    talking: id === 'cuBinh' || id === 'thayLinh' ? id : null,
  };
}

/** Bước hiện tại theo chỉ số; chỉ số vượt số bước (ví dụ bước d biến mất giữa lúc đang chiếu vì cờ trao trang đổi) thì lấy bước cuối, không lỗi. */
export function stepAt(steps: readonly ClimaxStep[], index: number): ClimaxStep {
  return steps[Math.max(0, Math.min(steps.length - 1, Math.floor(index)))];
}

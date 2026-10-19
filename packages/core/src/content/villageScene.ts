import type { VillageId } from '../village';
import type { CharacterId } from './characters';

/**
 * Chữ của cảnh làng 3D (spec 03 mục 6, spec 05 mục "Cảnh làng"), theo từng làng. Mọi câu đi qua fmt() trước khi hiện ({ten}, {phanDien}, {bacAn}…).
 */
export interface VillageSceneText {
  /** Người dẫn đứng gần bàn chép sổ (chân dung, tên ở hộp thoại) */
  guide: CharacterId;
  /** Số thứ tự (1 đến 14) của ảnh truyện chiếu ở cảnh mở đầu lần đầu vào làng (`story.ts`) */
  storyFrame: number;
  /** Câu người dẫn nói sau ảnh truyện ở cảnh mở đầu */
  opening: string;
  /** Người dẫn nhắc việc tiếp theo khi nói chuyện (E), theo việc đang chờ: bài học, game 1, game 2, hoặc đã xong cả làng */
  guideNext: { lesson: string; game1: string; game2: string; done: string };
  /** Cảnh trao Trang Sổ Vàng khi vào làng sau khi xong màn ready cuối (spec 05 "Kết thúc làng"): các lượt người dẫn nói */
  award: { loi: readonly string[] };
}

/** Mốc 2 chỉ có Làng Giấy; 3 làng còn lại điền ở mốc 3. */
export const VILLAGE_SCENE: Partial<Record<VillageId, VillageSceneText>> = {
  'lang-giay': {
    guide: 'bacAn',
    storyFrame: 6,
    opening: 'Mỗi trang sổ có một mã, tính từ mã trang trước. Đêm qua có kẻ sửa trộm một trang, cả làng cãi nhau xem ai nợ ai!',
    guideNext: {
      lesson: 'Em ra biển gỗ "Học cùng bác An" nhé. Bác sẽ chỉ em cách các trang sổ móc nối vào nhau.',
      game1: 'Giờ tới biển "Đuổi theo {phanDien}" nhé. Nó ôm xấp trang bị trộm chạy qua sân phơi giấy đấy!',
      game2: 'Còn biển "Ghép lại cuốn sổ": giúp bác ghép lại những trang sổ bị xé nhé.',
      done: 'Làng Giấy cảm ơn em nhiều! Em quay về chợ để sang làng kế tiếp nhé.',
    },
    award: {
      loi: [
        'Em đã mang các trang về và ghép lại cuốn sổ rồi đấy! Bác trao em Trang Sổ Vàng thứ nhất.',
        'Một mình giữ sổ thì kẻ gian vẫn ngồi sửa cả đêm được. Vì thế các làng không bao giờ để sổ ở một nơi. Xuống Làng Dệt mà xem.',
      ],
    },
  },
};

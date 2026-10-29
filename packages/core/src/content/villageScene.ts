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
  /** Cảnh trao Trang Sổ Vàng khi vào làng sau khi xong màn ready cuối (spec 05 "Kết thúc làng"): các lượt người dẫn nói. Làng Bạc không có: Trang Sổ Vàng thứ tư trao trong cảnh cao trào sau màn 12. */
  award?: { loi: readonly string[] };
}

/** Cả bốn làng: Làng Giấy (mốc 2), Làng Dệt (mốc 3, bước L1), Làng Khắc Dấu (bước L3) và Làng Bạc (bước L5, không có cảnh trao trang). */
export const VILLAGE_SCENE: Partial<Record<VillageId, VillageSceneText>> = {
  'lang-giay': {
    guide: 'bacAn',
    storyFrame: 6,
    opening: 'Mỗi trang sổ có một mã, tính từ mã trang trước. Đêm qua có kẻ sửa trộm một trang, cả làng cãi nhau xem ai nợ ai!',
    guideNext: {
      lesson: 'Em ra biển gỗ "Học cùng bác An" nhé. Bác sẽ chỉ em cách các trang sổ móc nối vào nhau.',
      game1: 'Giờ tới biển "Đuổi theo {phanDien}" nhé. Nó ôm xấp trang bị trộm chạy qua sân phơi giấy đấy!',
      game2: 'Còn biển "Ghép lại cuốn sổ": giúp bác ghép lại những trang sổ bị xé nhé.',
      done: 'Làng Giấy cảm ơn em nhiều! Em quay về chợ để ghé làng khác nhé.',
    },
    award: {
      loi: [
        'Em đã mang các trang về và ghép lại cuốn sổ rồi đấy! Bác trao em Trang Sổ Vàng thứ nhất.',
        'Một mình giữ sổ thì kẻ gian vẫn ngồi sửa cả đêm được. Vì thế các làng không bao giờ để sổ ở một nơi. Xuống Làng Dệt mà xem.',
      ],
    },
  },
  'lang-det': {
    guide: 'cuBinh',
    storyFrame: 7,
    opening: 'Ở làng này, nhà nào cũng giữ một cuốn sổ giống hệt nhau. Có trang mới là cả làng kéo về đình kiểm.',
    guideNext: {
      lesson: 'Em ra biển gỗ "Học cùng cụ Bình" nhé. Cụ sẽ chỉ em cách cả làng cùng kiểm một trang sổ trước khi ghi.',
      game1: 'Giờ tới biển "Đập {phanDien}" nhé. Nó gấp trang giả thành chuột giấy, thả xuống làm loang mực cuốn sổ của làng đấy!',
      game2: 'Còn biển "Diều đưa sổ": cụ nhờ em thả diều mang bản sao sổ mới tới những làng xa, để làng nào cũng có sổ giống nhau.',
      done: 'Làng Dệt cảm ơn em nhiều! Em quay về chợ để ghé làng khác nhé.',
    },
    award: {
      loi: [
        'Cả làng đã cùng kiểm sổ, và nhờ diều của em, bản sao sổ mới đã tới các làng xa! Cụ trao em Trang Sổ Vàng thứ hai.',
        'Sổ thì ai cũng kiểm được. Nhưng làm sao biết giấy nợ đúng là người đó viết? Sang Làng Khắc Dấu hỏi chú Dũng.',
      ],
    },
  },
  'lang-khac-dau': {
    guide: 'chuDung',
    storyFrame: 8,
    opening: 'Mỗi người có một khuôn dấu riêng cất kín, và một mẫu dấu công khai treo ở đình. Từ khuôn tạo ra mẫu thì dễ, nhìn mẫu mà đoán ngược ra khuôn thì chịu.',
    guideNext: {
      lesson: 'Em ra biển gỗ "Học cùng chú Dũng" nhé. Chú sẽ chỉ em cách đóng dấu bằng khuôn riêng và kiểm dấu bằng mẫu chung.',
      game1: 'Giờ tới biển "Lật thẻ tìm cặp khóa" nhé. {phanDien} trộn lung tung bộ khuôn tập của chú đấy!',
      game2: 'Còn biển "Chữa đàn gà": {phanDien} lùa một đàn gà bệnh vào làng, em dùng ná bắn viên thuốc đúng loại để chữa cho gà nhé.',
      done: 'Làng Khắc Dấu cảm ơn em nhiều! Em quay về chợ để ghé làng khác nhé.',
    },
    award: {
      loi: [
        'Em đã ghép lại bộ khuôn và chữa cả đàn gà rồi đấy! Chú trao em Trang Sổ Vàng thứ ba.',
        'Không giả dấu được nữa, {phanDien} chuyển sang trò trộn giao dịch ở Làng Bạc rồi.',
      ],
    },
  },
  'lang-bac': {
    guide: 'thayLinh',
    storyFrame: 9,
    opening: 'Hàng trăm khoản bạc đổi tay mỗi ngày, ghi cả vào sổ thì dài lắm. Thầy gộp từng cặp giao dịch lên cây đa này, để chỉ cần nhìn một con số ở gốc là biết cả sổ có bị sửa hay không.',
    guideNext: {
      lesson: 'Em ra biển gỗ "Học cùng thầy Linh" nhé. Thầy sẽ chỉ em cách gộp cả cuốn sổ thành một con số ở gốc cây.',
      game1: 'Giờ tới biển "Ghép lá cây sổ" nhé. {phanDien} ném lá giả lẫn vào cây, em ghép các lá cho đúng để gộp cây cho xong!',
      game2: 'Còn biển "Leo cây tìm lá giả": {phanDien} đã tráo một chiếc lá trên cây đa, em leo từ gốc theo nhánh lệch để bắt nó nhé.',
      done: 'Làng Bạc cảm ơn em nhiều! Nhờ em, cả bốn làng đã giữ sổ cùng nhau.',
    },
    // không có `award`: Trang Sổ Vàng thứ tư trao trong cảnh cao trào sau màn 12
  },
};

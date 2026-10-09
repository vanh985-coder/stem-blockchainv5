import type { VillageId } from '../village';
import type { CharacterId } from './characters';

/**
 * Lời giới thiệu làng (lần đầu học sinh bấm vào một làng trên /ban-do). Mỗi làng có 2 lượt của người dẫn,
 * sau đó là lượt cuối chung (danh sách 3 màn). Hiện ra màn hình luôn đi qua fmt().
 */
export interface VillageIntroContent {
  /** Người dẫn: chân dung lớn và tên ở hộp thoại */
  guide: CharacterId;
  /** Các lượt đầu (2 lượt) */
  turns: readonly string[];
}

export const VILLAGE_INTRO: Record<VillageId, VillageIntroContent> = {
  'lang-giay': {
    guide: 'bacAn',
    turns: [
      'Chào em! Đây là Làng Giấy. Cả làng làm giấy dó và giữ cuốn sổ giao dịch của chợ phiên.',
      'Ở đây em sẽ học vì sao các trang sổ phải móc nối vào nhau: sửa lén một trang là cả chuỗi phía sau lộ ra ngay.',
    ],
  },
  'lang-det': {
    guide: 'cuBinh',
    turns: [
      'Chào em, đây là Làng Dệt. Ở đây không ai giữ sổ một mình, mỗi nhà giữ một bản.',
      'Em sẽ học cách cả làng cùng duyệt một trang mới và cùng quyết định trang nào được ghi, để kẻ gian khó qua mặt.',
    ],
  },
  'lang-khac-dau': {
    guide: 'chuDung',
    turns: [
      'Chào em! Làng Khắc Dấu chuyên làm con dấu, mỗi người một khuôn riêng.',
      'Em sẽ học cách đóng dấu bằng khuôn riêng và kiểm dấu bằng mẫu chung, để biết chắc ai đã viết giao dịch.',
    ],
  },
  'lang-bac': {
    guide: 'thayLinh',
    turns: [
      'Chào em. Làng Bạc là nơi gom giao dịch của cả vùng về một mối.',
      'Em sẽ học cách gộp nhiều giao dịch thành một cây: chỉ cần một con số ở gốc là biết cả cây có bị sửa hay không.',
    ],
  },
};

export const villageIntroTexts = {
  /** Lượt cuối của mọi làng; {so} là số Trang Sổ Vàng của làng này (1 đến 4) */
  lanCuoi: 'Làng có 3 nhiệm vụ cho em. Xong cả ba, làng trao em Trang Sổ Vàng thứ {so}.',
  /** Tên nút ở lượt cuối: bấm thì mở bảng làng */
  ketThuc: 'Xem các màn',
  /** Nhãn cho người dùng đọc màn hình của hộp giới thiệu: {lang} là tên làng */
  nhan: 'Giới thiệu {lang}',
  /** Loại màn trong danh sách nhiệm vụ */
  loai: { lesson: 'Bài học', game: 'Thử thách' },
  /** Nhãn cho người dùng đọc màn hình của danh sách nhiệm vụ */
  danhSach: 'Ba nhiệm vụ của làng',
} as const;

import { StoryCard } from '../../components/game/DidYouKnowModal';
import { LevelMetadata } from '../../components/game/LessonShell';
import { LevelId } from '../../lib/progressLogic';

export const storyCards: StoryCard[] = [
  {
    title: 'Một khối chứa rất nhiều giao dịch.',
    text: 'Cây Merkle là cách "gói" tất cả giao dịch thành một con số duy nhất ở đỉnh, gọi là gốc Merkle (Merkle root).',
    example: 'Dù một trang sổ chứa hàng trăm hay hàng ngàn giao dịch, chỉ cần một con số Gốc Merkle là đại diện được cho tất cả!',
  },
  {
    title: 'Cách tạo cây.',
    text: 'Ghép từng cặp giao dịch thành một giá trị mới, rồi lại ghép từng cặp giá trị mới, cho tới khi chỉ còn 1 giá trị. Giá trị đó là gốc. Trong bài, công thức ghép là T_ab = T_a × 10 + T_b, và thứ tự quan trọng (T_12 khác T_21).',
    example: 'T12 = 3 × 10 + 7 = 37. Nhưng T21 = 7 × 10 + 3 = 73! Thứ tự trước sau quyết định kết quả.',
  },
  {
    title: 'Giống bảng đấu loại trực tiếp.',
    text: '8 đội đá 4 trận tứ kết, rồi 2 trận bán kết, rồi 1 trận chung kết. Mỗi cặp gộp thành 1, cho tới khi chỉ còn nhà vô địch ở đỉnh.',
    example: 'Chiếc cúp vô địch ở đỉnh chính là Gốc Merkle, kết tinh từ toàn bộ nhánh đấu bên dưới!',
  },
  {
    title: 'Để làm gì?',
    text: 'Chỉ cần sửa 1 giao dịch là gốc đổi ngay. Gốc được ghi vào khối (trang sổ), nên node chỉ cần so 1 con số thay vì so từng giao dịch, và phát hiện sửa đổi rất nhanh.',
    example: 'Mỗi khi kiểm tra sổ, các máy tính chỉ cần so khớp 1 con số Gốc Merkle là biết ngay tính toàn vẹn của cả trang.',
  },
];

export const levelsMeta: Record<LevelId, LevelMetadata> = {
  easy: {
    title: 'Màn 4.1: Làm quen ghép cặp',
    objective: 'Thực hành công thức ghép cặp giao dịch và chú ý thứ tự ghép.',
    tip: 'Công thức ghép: T_ab = T_a × 10 + T_b. Thứ tự trước sau rất quan trọng!',
  },
  medium: {
    title: 'Màn 4.2: Xây cây 4 giao dịch',
    objective: 'Tự tay dựng cây Merkle 4 giao dịch và khám phá vì sao đổi 1 lá thì gốc đổi.',
    tip: 'Một ô chỉ mở nhập khi cả hai ô con bên dưới đã có kết quả đúng.',
  },
  hard: {
    title: 'Màn 4.3: Ghép mảnh cây 8 giao dịch',
    objective: 'Kéo thả hoặc chạm đặt các mảnh ghép vào cây Merkle 8 giao dịch và tránh các mảnh bẫy ngược thứ tự.',
    tip: 'Hãy tính xuôi từ tầng dưới lên trên và cẩn thận với mảnh ghép bị đảo ngược thứ tự!',
  },
};

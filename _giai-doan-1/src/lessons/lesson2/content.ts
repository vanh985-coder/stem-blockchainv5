import { StoryCard } from '../../components/game/DidYouKnowModal';
import { LevelMetadata } from '../../components/game/LessonShell';
import { LevelId } from '../../lib/progress';

export const storyCards: StoryCard[] = [
  {
    title: 'Node là ai?',
    text: 'Node là một máy tính trong mạng blockchain, giống một người giữ sổ. Mỗi node giữ một bản sao đầy đủ của cuốn sổ, và các bản sao giống hệt nhau.',
    example: 'Trong mạng Sổ Chung, 4 bạn Em, Bình, Chi và Tí mỗi người giữ một cuốn sổ y hệt nhau.',
  },
  {
    title: 'Node làm gì khi có trang mới?',
    text: 'Node tự kiểm tra 2 điều: mã trang trước ghi trong trang mới có khớp với trang cuối trong sổ của mình không, và mã trang mới có được tính đúng không.',
    example: 'Sổ em: trang cuối mã 57. Trang mới: mã trước 57, nội dung 36, mã 50 → (57 × 2 + 36) mod 100 = 50 ✓.',
  },
  {
    title: 'Đa số đồng ý mới được ghi.',
    text: 'Chỉ khi phần lớn các node đồng ý, trang mới được ghi vào sổ của tất cả mọi người. Cách các node thống nhất với nhau gọi là cơ chế đồng thuận.',
    example: 'Có 4 người giữ sổ: khi có ít nhất 2 bạn khác đồng ý (cùng với người tạo là đa số), trang mới được ghi vào sổ chung.',
  },
  {
    title: 'Vì sao an toàn hơn?',
    text: 'Sổ không nằm trong tay một người. Muốn sửa lén, kẻ gian phải sửa sổ của phần lớn các node cùng lúc, điều này cực kỳ khó.',
    example: 'Nếu kẻ gian sửa lén sổ của riêng mình, các node khác sẽ phát hiện ngay vì mã trang không khớp với sổ của số đông.',
  },
];

export const hardStoryCard: StoryCard = {
  title: 'Đặt cọc (Proof of Stake)',
  text: 'Ở một số blockchain (cơ chế Proof of Stake), muốn được tạo khối thì phải đặt cọc. Làm đúng thì được thưởng, gian lận thì mất cọc, nên làm thật luôn có lợi hơn.',
  example: 'Đặt cọc 30 điểm: làm thật được duyệt thì nhận lại cọc và được thưởng 10 điểm (+10). Gian lận bị phát hiện thì mất luôn 30 điểm cọc (-30).',
};

export const levelsMeta: Record<LevelId, LevelMetadata> = {
  easy: {
    title: 'Màn 2.1: Duyệt trang mới',
    objective: 'Kiểm tra trang bạn gửi: tính lại mã rồi Đồng ý hoặc Từ chối. Em có 3 tim.',
    tip: 'Lấy (mã trang cuối × 2 + nội dung) mod 100 rồi so với mã trang bạn gửi.',
  },
  medium: {
    title: 'Màn 2.2: So sổ trước khi duyệt',
    objective: 'So sổ của em với sổ người gửi, rồi kiểm mã trang mới. Em có 3 tim.',
    tip: 'Kiểm tra xem các trang trước trong sổ bạn gửi có khớp với sổ của em không.',
  },
  hard: {
    title: 'Màn 2.3: Đặt cọc để được ghi sổ',
    objective: 'Chơi cùng Bình, Chi, Tí. Mỗi lượt tạo trang phải đặt cọc 30 điểm. Làm thật hay gian lận, em chọn!',
    tip: 'Bỏ phiếu đúng để được thưởng điểm, tránh tiếp tay cho trang gian lận kẻo bị phạt!',
  },
};

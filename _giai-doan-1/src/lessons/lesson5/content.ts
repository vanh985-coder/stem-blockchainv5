import { StoryCard } from '../../components/game/DidYouKnowModal';

export const lesson5StoryCards: StoryCard[] = [
  {
    title: 'Các node "bỏ phiếu"',
    text: 'Trong blockchain, các node bỏ phiếu để quyết định trang nào được ghi. Sức nặng lá phiếu phụ thuộc vào sức mạnh của node (ví dụ sức mạnh máy tính hoặc số tiền đặt cọc), không phụ thuộc vào số lượng node.',
  },
  {
    title: 'Tấn công 51% là gì?',
    text: 'Là khi một kẻ, hoặc một nhóm, nắm hơn một nửa tổng sức mạnh của mạng. Khi đó họ có thể lấn át toàn bộ phần còn lại.',
  },
  {
    title: 'Họ làm được gì?',
    text: 'Chặn giao dịch của người khác, hoặc cố đảo ngược các giao dịch gần đây để tiêu một khoản tiền hai lần.',
  },
  {
    title: 'Họ KHÔNG làm được gì?',
    text: 'Họ không lấy được tiền trong ví của người khác, vì không có khóa riêng của người đó (nhớ lại Bài 3!).',
  },
  {
    title: 'Vì vậy',
    text: 'Mạng càng phân tán (nhiều người tham gia, không ai nắm quá nhiều sức mạnh) thì càng an toàn.',
  },
];

import { StoryCard } from '../../components/game/DidYouKnowModal';
import { LevelMetadata } from '../../components/game/LessonShell';
import { LevelId } from '../../lib/progressLogic';

export const lesson1StoryCards: StoryCard[] = [
  {
    title: 'Blockchain là một cuốn sổ.',
    text: 'Mỗi trang sổ là một khối (block). Các trang được ghi nối tiếp nhau thành một chuỗi (chain), vì vậy mới gọi là "chuỗi khối".',
  },
  {
    title: 'Mỗi trang có 2 phần.',
    text: 'Nội dung là điều được ghi lại (ở đây là một con số). Mã trang giống như "dấu vân tay" của trang.',
  },
  {
    title: 'Cách tính mã trang.',
    text: 'Mã trang = (Mã trang trước × 2 + Nội dung) mod 100, trong đó "mod 100" nghĩa là chỉ giữ 2 chữ số cuối. Ví dụ: trang bìa có mã 10, nội dung là 23, ta có 10 × 2 + 23 = 43, vậy mã trang là 43.',
  },
  {
    title: 'Vì sao khó sửa lén?',
    text: 'Mã trang sau được tính từ mã trang trước, nên sửa một trang sẽ kéo theo phải sửa mọi trang phía sau. Blockchain thật dùng "hàm băm" (như SHA-256) phức tạp hơn nhiều, nhưng ý tưởng giống hệt.',
  },
];

export const lesson1LevelsMeta: Record<LevelId, LevelMetadata> = {
  easy: {
    title: 'Màn 1.1: Xây chuỗi 5 trang',
    objective: 'Tính mã từng trang theo công thức của cuốn sổ để nối thành chuỗi.',
    tip: 'Lấy mã trang trước nhân 2, cộng nội dung, rồi giữ 2 chữ số cuối (mod 100).',
  },
  medium: {
    title: 'Màn 1.2: Tí sửa trộm sổ',
    objective: 'Sửa lại các mã trang bị lệch do nội dung một trang bị thay đổi lén.',
    tip: 'Chỉ cần sửa mã trang đầu tiên bị lệch, hiệu ứng domino sẽ chỉ ra trang tiếp theo.',
  },
  hard: {
    title: 'Màn 1.3: Cuộc đua với cả mạng lưới',
    objective: 'Em muốn lén đổi nội dung trang 2 mà không ai phát hiện. Muốn vậy, cả chuỗi phải khớp. Nhưng mạng lưới vẫn liên tục ghi thêm trang mới!',
    tip: 'Tập trung tính thật nhanh mã trang lệch đầu tiên trước khi trang mới xuất hiện.',
  },
};

export const lesson1Texts = {
  easy: {
    title: 'Xây chuỗi 5 trang',
    instruction: 'Điền nội dung và tính mã trang tương ứng để đóng dấu xác nhận từng trang.',
    pickRandom: 'Chọn giúp em',
    checkButton: 'Kiểm tra',
    nextPage: 'Tiếp tục trang sau',
    contentError: 'Nội dung là số từ 0 đến 99',
    codeError: 'Mã trang là số từ 0 đến 99',
    learned: 'Mỗi trang giữ mã của trang trước. Nhờ vậy các trang móc vào nhau thành chuỗi.',
  },
  medium: {
    title: 'Tí sửa trộm sổ',
    fromPrevious: 'Đây là chuỗi em vừa xây',
    tamperAlert: (page: number) => `Nội dung trang ${page} đã bị đổi nên mã trang không còn khớp.`,
    dominoAlert: (k: number) =>
      `Ôi! Mã trang ${k + 1} được tính từ mã trang ${k}. Mã trang ${k} vừa đổi nên trang ${k + 1} lệch theo.`,
    fixedCountLabel: 'Số trang đã phải sửa:',
    reflectionQuestion: 'Liệu có nhiều khối hơn và sinh ra liên tục thì sửa có kịp không?',
    reflectionOptions: ['Kịp chứ!', 'Chắc là không kịp', 'Em chưa chắc'],
    reflectionExplanation: 'Hãy sang mức Khó để tìm hiểu điều đó!',
    nextLevelButton: 'Sang mức Khó',
    learned: 'Chỉ đổi 1 trang mà em phải tính lại cả những trang phía sau.',
  },
  hard: {
    title: 'Cuộc đua với cả mạng lưới',
    remainingLabel: 'Còn phải sửa:',
    fixedLabel: 'Đã sửa:',
    pagesUnit: 'trang',
    toastFast: 'Wow, em nhanh thật! Nhưng trang mới vẫn tiếp tục tới…',
    timeUpTitle: 'Hết giờ!',
    mascotSad: 'Không kịp! Một người không thể sửa nhanh hơn cả mạng lưới cùng ghi sổ.',
    summaryFixed: 'Số trang đã sửa:',
    summaryAdded: 'Số trang mạng đã thêm:',
    summaryRemaining: 'Số trang còn lệch:',
    reflectionQuestion:
      'Nếu cuốn sổ nằm trong tay một mình em và không ai thêm trang mới, em có sửa lén được không?',
    reflectionOptions: ['Được, cứ từ từ tính lại', 'Không được'],
    reflectionExplanation:
      'Đúng vậy. Vì thế blockchain không bao giờ để sổ trong tay một người. Ở Bài 2, rất nhiều người cùng giữ sổ!',
    nextLessonButton: 'Sang Bài 2',
    learned: 'Một người không thể sửa nhanh hơn cả mạng lưới cùng ghi sổ.',
  },
};

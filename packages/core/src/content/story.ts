/**
 * Lời 14 ảnh truyện (spec 04 mục 2). Hiện ra màn hình luôn đi qua fmt():
 * {ten} = tên hiển thị của học sinh (chơi thử thì là "em"); {Ten} = như {ten} nhưng viết hoa chữ đầu; {phanDien} = tên phản diện.
 * Ảnh dùng lại làm cảnh chuyển trong game: ảnh 1–5 mở đầu, 6–9 mở mỗi làng, 10–11 cao trào, 12–14 kết thúc.
 */
export interface StoryFrame {
  /** Số thứ tự 1 đến 14 */
  n: number;
  /** Đường dẫn ảnh trong manifest, không đuôi */
  image: string;
  text: string;
}

export const STORY: readonly StoryFrame[] = [
  {
    n: 1,
    image: 'story/01-ngu-guc',
    text: 'Tối trước bài kiểm tra về blockchain, {ten} học mãi không hiểu, ngủ gục lúc nào không hay.',
  },
  { n: 2, image: 'story/02-cuon-vo-sang', text: 'Cuốn vở bìa tím bỗng phát sáng…' },
  {
    n: 3,
    image: 'story/03-cho-phien',
    text: '{Ten} mở mắt và thấy mình đứng giữa một chợ phiên Đại Việt thế kỷ XVI, thời buôn bán đang phát triển.',
  },
  {
    n: 4,
    image: 'story/04-gap-bi',
    text: 'Cuốn vở hóa thành Bi: "Muốn tỉnh dậy, cậu phải học bí quyết giữ Sổ Chung của bốn làng. Mỗi làng trao một Trang Sổ Vàng, đủ 4 trang là cậu tỉnh!"',
  },
  {
    n: 5,
    image: 'story/05-ti-chay',
    text: '{phanDien}, cậu thiếu niên muốn thành lái buôn giàu nhất vùng, lẻn đi sửa sổ, giả dấu, trộn giao dịch. Sổ các làng lệch nhau, cổng làng đóng hết!',
  },
  {
    n: 6,
    image: 'story/06-lang-giay',
    text: 'Làng Giấy: Bác An buồn rầu vì có kẻ đã sửa trộm một trang sổ của làng.',
  },
  {
    n: 7,
    image: 'story/07-lang-det',
    text: 'Làng Dệt: nhà nào cũng giữ một bản sổ, có trang mới là cả làng kéo về đình kiểm tra.',
  },
  {
    n: 8,
    image: 'story/08-lang-khac-dau',
    text: 'Làng Khắc Dấu: mỗi người có một khuôn dấu riêng cất kín, và một mẫu dấu công khai treo ở đình cho mọi người đối chiếu.',
  },
  {
    n: 9,
    image: 'story/09-lang-bac',
    text: 'Làng Bạc: mỗi ngày hàng trăm khoản bạc qua tay. Thầy Linh gộp chúng lên cây đa thành một con số gốc.',
  },
  {
    n: 10,
    image: 'story/10-ti-tren-cay',
    text: '{phanDien} tráo một chiếc lá giao dịch để cuỗm khoản bạc của lái buôn phương xa, nhưng con số gốc đã báo lệch…',
  },
  {
    n: 11,
    image: 'story/11-ti-hoi-cai',
    text: '"Hóa ra làm thật mới có lời." {phanDien} xin được làm người giữ sổ của làng.',
  },
  {
    n: 12,
    image: 'story/12-hoi-lang',
    text: 'Hội làng mở ra. Bốn Trang Sổ Vàng ghép lại thành một cuốn sổ sáng rực…',
  },
  {
    n: 13,
    image: 'story/13-tinh-giac',
    text: '{Ten} tỉnh giấc. Ở trang cuối cuốn vở có một con dấu tím mà {ten} không nhớ mình đã đóng.',
  },
  {
    n: 14,
    image: 'story/14-gio-tay',
    text: 'Cô giáo hỏi: "Vì sao blockchain khó bị sửa lén?" {Ten} giơ tay đầu tiên.',
  },
];

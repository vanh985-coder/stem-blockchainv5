import type { StoryCard, LevelMetadata, LevelId } from '../types';

export const storyCards: StoryCard[] = [
  {
    title: 'Chữ ký trên giấy vs Chữ ký số',
    text: 'Chữ ký trên giấy rất dễ bị tập đồ lại hoặc sao chép. Chữ ký số gắn chặt với từng nội dung cụ thể: đổi dù chỉ 1 đồng trong giao dịch, chữ ký sẽ lập tức vô hiệu!',
    example: 'Kẻ gian không thể cắt chữ ký từ giấy này dán sang giấy khác, vì chữ ký số được tính từ chính nội dung chuyển tiền.',
  },
  {
    title: 'Phép toán một chiều',
    text: 'Dễ đi xuôi, bất khả thi đi ngược. Ví dụ đời thực: thả một giọt mực vào cốc nước rất dễ, nhưng tách giọt mực trở lại thì không thể. Trong toán: tính 5^x mod 23 thì nhanh, nhưng biết kết quả tìm lại x thì cực khó.',
    example: '5^12 mod 23 = 18 tính rất nhanh. Nhưng biết 18 và bảo tìm lại 12 thì phải thử từng số một!',
  },
  {
    title: 'Cặp khóa trong Bitcoin (ECDSA)',
    text: 'Bitcoin dùng đường cong elip secp256k1. Khóa riêng là một số 256-bit (khoảng 77 chữ số thập phân). Số khả năng lớn hơn cả số nguyên tử trong toàn bộ vũ trụ quan sát được (~10^80)!',
    example: '115.792.089.237.316.195.423.570.985.008.687.907.853.269.984.665.640.564.039.457.584.007.913.129.639.936 khả năng!',
  },
  {
    title: 'Mất khóa riêng là mất vĩnh viễn',
    text: 'Không có ngân hàng nào để "quên mật khẩu", không có tổng đài hỗ trợ. Ước tính khoảng 3–4 triệu Bitcoin (trị giá hàng trăm tỷ USD) đã bị "chết vĩnh viễn" vì chủ nhân làm mất khóa riêng.',
    example: 'Hãy ghi khóa riêng ra giấy và cất vào nơi an toàn nhất, tuyệt đối không gửi lên mạng.',
  },
  {
    title: 'Địa chỉ ví chính là khóa công khai',
    text: 'Khi ai đó xin "địa chỉ ví" để gửi tiền cho em, họ đang xin một dạng rút gọn của khóa công khai. Cho người khác biết địa chỉ ví hoàn toàn an toàn — họ chỉ có thể gửi tiền vào, không thể rút tiền ra.',
    example: 'Khóa công khai giống số tài khoản ngân hàng, còn khóa riêng là mật khẩu rút tiền.',
  },
];

export const levelsMeta: Record<LevelId, LevelMetadata> = {
  easy: {
    title: 'Màn 3.1: Ký tên & Tìm khóa',
    objective: 'Dùng khóa riêng ký giao dịch và tính khóa công khai cho 5 bạn.',
    tip: 'Công thức tính khóa công khai: 5^x mod 23.',
  },
  medium: {
    title: 'Màn 3.2: Thẩm định giao dịch',
    objective: 'Dùng Máy xác minh và Danh bạ để tìm 2 giao dịch mạo danh.',
    tip: 'Đừng tin khóa đính kèm trên giao dịch! Hãy luôn so với Danh bạ công khai.',
  },
  hard: {
    title: 'Màn 3.3: Thử thách dò khóa',
    objective: 'Thử bẻ khóa với số nhỏ, số lớn và hiểu lý do bảo mật của blockchain.',
    tip: 'Khóa 256-bit an toàn vì số khả năng vượt xa sức mạnh của mọi siêu máy tính.',
  },
};

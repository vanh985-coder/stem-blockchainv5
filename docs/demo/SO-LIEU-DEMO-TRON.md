# Số liệu demo trọn game (đang làm dở: mới có Làng Giấy và số liệu màn 4)

Nguồn số: `packages/core/src/demo/tron/data.ts`; `data.test.ts` kiểm từng số bằng logic sẵn có (`pageCode`, `buildChain`, `isValidProposal`). Bản thật không đổi.

## Phần mở đầu và Làng Giấy (bot đã chạy thật)

| Mã | Trên màn hình |
|---|---|
| S01–S03 | Trang chủ, truyện 14 trang, chợ + bảng Nhiệm vụ (Hướng dẫn chơi tự mở bị đóng ngay) |
| G03 | Thẻ 1: câu hỏi đáp án A (theo `knowQuiz.ts`) |
| G04 | Thẻ 2: đáp án B |
| G05 | Thẻ 3: điền số 44 (mã trước 43, nội dung 58 → 144 → 44) |
| G06 | Thẻ 4: đáp án C |
| G07 | Bìa 10; nội dung 23, 45, 7, 88, 12 → mã 43, 31, 69, 26, 64 |
| G08 | Dùng chuỗi trạm Dễ; Tí đổi trang 2: 45 → 72 → mã 58, 23, 34, 80 |
| G09 | Bìa 79; trang 1 nội dung 29 (mã 87); trang 2 bị sửa thành 22 (gốc 55); phải tính lại 96, 10, 67. Cuộc đua 40 giây, mạng thêm trang mỗi 3,5 giây; bot sửa đúng 3 trang rồi dừng nên hết giờ chuỗi của làng dài hơn |
| G11 | Chạy 1 vòng 25 giây |
| G12 | Câu B1-01: mã trước 40, nội dung 25. Đáp án hiện theo thứ tự A 50, B 105, C 5, D 65; bot chọn C |
| G13 | Bìa 10; vòng 1: 3 thẻ (mã trước 10/nội dung 23/mã 43; 43/45/31; 31/7/69), khay xáo cố định |
| G14 | Vòng 2: cùng chuỗi + trang giả (mã trước 31, nội dung 50, mã 99; công thức ra 12). Bot bấm "Soi công thức" rồi kéo vào rổ |
| G15 | Cảnh trao Trang Sổ Vàng thứ nhất |

## Màn 4 (số liệu đã khóa, bot chưa làm)

- Trạm Dễ: sổ bìa 5, nội dung 10 và 17 → mã 20, 57 (trang cuối 57). 5 vòng: (Bình 36/50 đồng ý), (Chi 30/35 từ chối), (Tí 25/25 đồng ý), (Bình 30/80 đồng ý), (Chi 47/66 từ chối). Ví dụ "57, 36, 51 thì Từ chối" trong lời thuyết minh KHÔNG hiện nguyên văn (màn hình có 50, không có 51).
- Trạm Trung bình: đề sinh bằng bộ sinh của bài với hạt giống 4 (tự chọn).
- Trạm Khó: bìa 5, nội dung 10 và 85 → mã 20, 25; lượt đầu em tạo trang mã trước 25, nội dung 18 → 68 (hạt giống 9 cho các lượt sau).

## Chưa làm

Bot và số liệu cho: màn 4 trạm Trung bình/Khó (chạy), 5–6 nối mã đoạn, 7, 8, 9, 10 (nối mã đoạn), 11, 12, cảnh cao trào, kết quả cuối; dịch chuyển bằng bản đồ lớn cho D01, K01, B01 và các thẻ ở ba làng sau.

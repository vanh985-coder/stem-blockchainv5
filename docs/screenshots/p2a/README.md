# P2a — triển khai và kiểm tín hiệu production (28/10/2026)

## Phạm vi

- Phản hồi dùng chung ở `LessonPage2D` cho màn 1/4/7/10, nghe `onAnswer`, không thêm thư viện hiệu ứng.
- Hai cụm pháo hoa CSS, tổng 24 hạt, 700 ms; lời khen 1800 ms. Đợt mới thay đợt cũ. Chữ ở `content/lessonPraise.ts`.
- Vùng riêng cao 44 CSS px, không bắt chuột/chạm, không focus, không đổi chiều cao khi có kết quả. Hạt bị giới hạn trong vùng này, không phủ lời giải thích.
- Giảm chuyển động trong cài đặt **hoặc** hệ điều hành đều bỏ hạt, vẫn có lời khen; thay đổi media query khi đang phát cũng bỏ hạt.
- Dọn subscription, timer và media listener khi unmount; key theo màn/lần chơi/trạm, không lưu sự kiện cũ. Giữ hiệu ứng câu cuối khi chuyển từ chơi sang kết quả cùng trạm.
- Bỏ báo lặp cùng kết quả trong 250 ms như cơ chế phản ứng nhân vật hiện có. `FeedbackSheet` không báo lại *submission* khi callback đổi hoặc effect nối lại; vẫn phát âm và giữ listener Enter như trước.

## Rà đường sự kiện

`onAnswer` mặc định vẫn giữ đúng hợp đồng cũ `(correct)` cho nhân vật và callback ngoài. Thêm lựa chọn chỉ nghe kết quả nộp bài; phân loại không thay âm thanh, kết quả game hay phản ứng nhân vật:

- Màn 1: các trạm đã báo ở chỗ kiểm tra; phản hồi có thể báo thêm, được gộp.
- Màn 4: Dễ/Trung bình qua phản hồi; Khó giữ âm accepted/rejected, nhưng lời khen theo **phiếu em đúng**, không theo việc trang được chấp nhận. Trang do em tạo đã báo khi nộp mã, không khen lại khi bot biểu quyết xong.
- Màn 7: không khen khi máy tự quét chữ ký hoặc tự dò khóa; vẫn giữ tiếng và nhân vật. Dò thủ công đúng vẫn báo kết quả.
- Màn 10: soi các ô là thăm dò, chỉ khen lúc tìm đúng lá bị sửa, dù âm cũ ở lá đó là âm khác biệt. Những chỗ nộp số/ghép cây giữ nguyên.
- Máy tính mã trang và ModCalculator không phát tín hiệu đáp án khi nhập.

## Kết quả thực tế

| Kiểm tra | Kết quả |
|---|---|
| `pnpm test --maxWorkers=2` | **2108 pass, 1 skipped**, 192 file pass, 1 skipped |
| `pnpm typecheck` | Đạt |
| `pnpm check:text` | Sạch, 427 file |
| `pnpm build` | Đạt, 5 app; kiểm bản gộp với `VITE_MERGED=true` |
| `node scripts/p2a-check.mjs` | Đạt, Chrome headless local production |

Test mới kiểm: đúng liên tiếp, gộp báo trùng, hết hạn thay vì timer cũ cắt đợt mới, bỏ minh họa, tắt âm vẫn có tín hiệu, giữ hợp đồng người nghe cũ, dọn timer/listener, remount không phát lại.

Trình duyệt mở từng trạm bằng thanh chọn trạm (tiến độ khách chuẩn bị trước), tại **1366×768, 360×800, 844×390**. 36 tổ hợp kiểm sai không khen, đúng một đợt, báo trùng không tăng số đợt, đúng liên tiếp tăng đợt, minh họa không tăng đợt, media giảm chuyển động bỏ hạt, chiều cao và focus không đổi. Nhập máy tính màn 4 Dễ/Trung bình không kích hoạt khen. Tắt âm thực sự được xác nhận qua `isEnabled()`. Cài đặt giảm chuyển động được kiểm thêm trên cả bốn bài ở ba cỡ màn hình. Rời bài bằng điều hướng SPA sang đăng nhập khi đang có hạt; phát tín hiệu sau khi rời không dựng lại vùng khen. Không có `pageerror` trong các lượt thành công.

**Quan trọng:** đúng/sai trong lượt kiểm hiệu ứng được phát qua đối tượng `sound` của bundle production, **không phải nộp lời giải thật** ở mọi trạm. Thao tác chọn trạm bằng DOM click; nút Bỏ qua/Bắt đầu bằng click/tap giả lập. Đây là kiểm tích hợp tín hiệu và vòng đời, không phải chơi xuyên suốt 12 trạm. Không thêm cầu nối kiểm thử vào mã production.

**48 ảnh JPEG**, lớn nhất **114697 byte**, đều dưới 300000 byte. `man-*-tram-0/1/2-*`: Dễ/Trung bình/Khó; `reduced-*`: chỉ lời khen. `measurements.json` ghi 36 tổ hợp trạm/khung hình. Có ảnh đang ở phần mở đầu của trạm; không dùng ảnh để khẳng định đã giải xong trạm.

## Bundle

Đơn vị byte, gzip bằng `node:zlib` mặc định. So với `dist` có sẵn trước sửa, không dựng lại commit gốc; đây là phép so sánh tham khảo, chưa phải baseline tái lập cùng môi trường.

- Tổng tất cả chunk JS hub: **+1723 byte / +714 byte gzip** (không phải lượng tải trang đầu).
- CSS hiệu ứng mới: **624 byte / 354 byte gzip**. Cộng hai số: **2347 byte / 1068 byte gzip**; chưa đối chiếu CSS chung vì baseline chỉ lưu JS.
- `LessonPage2D` JS: 22696 → 23920 byte; gzip 7302 → 7798 (**+1224 / +496**).
- `FeedbackSheet` JS: 2310 → 2444 byte; gzip 1050 → 1105 (**+134 / +55**).
- JS entry hub giữ **237402 byte**; gzip 74580 → 74569 (dao động do tên hash/import).
- Cảnh báo chunk 3D >500 kB vẫn có. Không sửa 3D, không đo FPS mới.

Danh sách đo: `bundle-before.json`, `bundle-after.json`. Log các lệnh ở thư mục này; phần `NativeCommandError` đầu log là cách PowerShell chuyển stderr của pnpm thành bản ghi, không phải exit code cuối (các lượt cuối đều exit 0).

## Chưa xác minh / chưa chốt nghiệm thu

- Chưa nộp đáp án thật đủ đúng/sai/đúng liên tiếp trong **tất cả các phần và vòng của 12 trạm**. Chưa kiểm trực tiếp FeedbackSheet với callback đổi trong trình duyệt StrictMode.
- Chưa kiểm đủ lời khen khi em cuộn sâu trong bài dài: vùng khen hiện ở đầu bảng, có thể ra ngoài khung nhìn khi cuộn. Không tự cuộn hay lấy focus để tránh làm gián đoạn bài. Cần xử lý/kiểm tiếp trước khi chốt yêu cầu mỗi lần trả lời đều nhìn thấy phản hồi mới.
- Chưa xác minh tương tác hạt với mọi hộp phản hồi mở ở khung thấp, Safari/iPhone, bàn phím ảo, trình đọc màn hình và thiết bị thật. Chưa đo FPS điện thoại.
- Chưa có baseline bundle rebuild commit gốc với cấu hình giống hệt.
- Chưa commit vì chưa đủ kiểm nghiệm thu P2a; không push/deploy.

Lỗi ngoài phạm vi: nút **“?” đè chữ “Soi công thức” ở màn 3** được ghi để sửa riêng, không sửa trong P2a. P1a/P1b không làm lại.

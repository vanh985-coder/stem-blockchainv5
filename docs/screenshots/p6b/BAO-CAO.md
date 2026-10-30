# P6b — thẻ "Em có biết?" có ví dụ và câu hỏi (30/10/2026)

Mã kiểm: `scripts/p6b-check.mjs` (bản BUILD có `VITE_PROBE`, Chrome 1243 headless, GL phần mềm SwiftShader, mức Thấp). **Dữ liệu là khách thật** (cookie `sc_guest`, thao tác thật bằng chuột, bàn phím, chạm giả lập), không Supabase, không API giả.

## Kết quả kiểm DOM (bản build)
- **Đủ 16 thẻ, mỗi cỡ màn hình đều trả lời và cất thật cả 16** (48 lượt nhặt): 1366×768 (chuột và bàn phím: thẻ chẵn dùng bàn phím Tab, mũi tên, Space, Enter; thẻ lẻ dùng chuột), 360×800 và 844×390 (chạm). Mỗi cỡ một kiểu đúng/sai khác nhau để mọi thẻ được trả lời đúng ít nhất một lần và sai ít nhất một lần qua ba cỡ; cả ba câu điền số (44, 19, 288) được trả lời đúng và sai.
- **Mỗi thẻ:** đúng tiêu đề thẻ đã sửa, có nội dung, ví dụ, câu hỏi; chưa có đáp án và nút "Cất vào sổ" lúc đầu; chưa chọn hay để trống thì chỉ hiện lời nhắc (chưa tính là trả lời); điền số gõ `04a` thì nhắc định dạng; sau khi nộp: khóa lựa chọn, đổi đáp án vô tác dụng, hiện đúng/sai (có chữ và dấu ✓/✗, không chỉ màu), đáp án đúng và giải thích **dù đúng hay sai**; trước khi cất cờ `knowCards` chưa ghi; cất thì ghi **đúng bit** của thẻ (không lệch chỉ số), cuộn biến mất, báo số thẻ.
- **Đóng trước khi cất** (Esc ở máy tính, chạm nền ở điện thoại): thẻ CHƯA nhặt (cuộn còn, cờ chưa ghi); mở lại thì hỏi lại từ đầu, không nhớ đáp án.
- **Enter:** Enter nộp rồi Enter lặp liền sau không cất thẻ và không chuyển bước (hộp còn mở, cờ chưa ghi); tiêu điểm sang "Cất vào sổ", Enter lần sau mới cất.
- **Tạm dừng:** mở hộp rồi giữ phím W 1,5 giây, người chơi đứng yên (máy tính).
- **Đủ 4 thẻ:** bài học của làng mở (open), hai màn sau vẫn khóa theo thứ tự; không còn cuộn; không phát sinh điểm, xu, Trang Sổ Vàng, không có trường lưu đáp án trong cookie.
- **Xem lại thẻ đã nhặt** (menu "Em có biết?"): hiện ví dụ, câu hỏi, đáp án và giải thích, không ô gõ, không nút Kiểm tra/Cất; đóng không làm mất thẻ.
- **Tải lại** sau khi cất: cuộn vẫn biến mất, biển vẫn mở. **Bản đồ nhỏ:** khách mới có đủ 16 ký hiệu thẻ chưa nhặt; sau khi cất và tải lại, bản đồ chỉ còn đúng ký hiệu của các thẻ chưa nhặt (chưa đo riêng ngay lúc cất, chỉ đo sau tải lại).
- **`/ban-do`** (1366×768 và 360×800): đọc hết giới thiệu làng và nút "Đọc thẻ Em có biết" (5 thẻ Khắc Dấu) không có câu hỏi và **không đánh dấu nhặt thẻ** (cờ giữ nguyên).
- **Tiến độ cũ giữ nguyên:** cờ cũ (2 thẻ Làng Dệt) giữ nguyên, chỉ còn 2 cuộn; đã xong bài học 1 từ trước thì coi như đủ thẻ, không còn cuộn.
- **Tự hoàn thành** (bản dev, `ac = 4095`): cả 3 biển mỗi làng hiện xong nhưng đủ 4 cuộn thẻ vẫn chưa nhặt, cờ `knowCards` vẫn 0 (5 kiểm đạt).
- **Chữ to + Giảm chuyển động, nội dung dài (thẻ Làng Giấy số 4) ở màn thấp:** hộp cuộn được, nút Kiểm tra và Cất vào sổ cuộn tới được và đủ lớn; không hoạt ảnh nào trong hộp; Tab đưa tiêu điểm vào trong hộp; Chữ to làm tiêu đề thẻ to hơn (24 → 27,6 px).
- **Số kiểm:** 1366×768 248 + 13 (Chữ to) đạt, 360×800 235 đạt, 844×390 229 đạt, bản dev 5 đạt. Tệp `ket-qua-p6b.json` còn 1 mục lỗi ở 1366×768: là bộ đo bấm quá sớm trong phần Chữ to (hộp bỏ qua cú bấm trong 450 ms đầu, đúng thiết kế); đã sửa bộ đo (chờ 0,9 giây như người đọc) và chạy lại riêng phần đó: `ket-qua-p6b-chu-to-1366.json` đạt 13/13.

## Bảng tổng hợp các lượt kiểm tra P6b

| Tệp log / Lượt kiểm | Môi trường / Kích thước | Số ca kiểm tra | Kết quả | Nguyên nhân & Hành động xử lý |
|---|---|---|---|---|
| `ket-qua-p6b.json` (Lượt đầy đủ ban đầu) | Bản build preview probe<br>• 1366×768<br>• 360×800<br>• 844×390 | 726 ca | 725 đạt<br>1 lỗi | **1 lỗi ở 1366×768 (phần Chữ to):** Do bộ đo tự động gửi phím quá sớm trước khi hộp thẻ ổn định (`Waiting for selector [data-testid="ket-qua"] failed`). Giữ nguyên log cũ làm minh chứng thực tế, không sửa tệp. |
| `ket-qua-p6b-chu-to-1366.json` (Chạy lại Chữ to) | Bản build preview probe<br>• 1366×768 | 13 ca | 13/13 đạt | Sửa bộ đo chờ 0,9s để mô phỏng đúng thao tác đọc của học sinh. Chạy lại riêng phần Chữ to 1366×768: đạt 100%. |
| `ket-qua-p6b-dev-tu-hoan-thanh.json` (Bản dev) | Bản dev probe (`ac=4095`) | 5 ca | 5/5 đạt | Xác minh cờ tự hoàn thành không biến thẻ chưa nhặt thành đã nhặt. |
| `ket-qua-p6b-regression.json` (Hồi quy Enter & Click ma) | Bản build preview probe<br>• 1366×768 (Desktop)<br>• 360×800 (Mobile Touch)<br>• 844×390 (Landscape Touch) | 14 ca | 14/14 đạt | **Kiểm chứng hoàn thiện bổ sung:**<br>1. Giữ Enter 1200ms (> 1s) sau khi nộp bài: hộp vẫn mở, thẻ tuyệt đối không tự cất. Chỉ khi nhả Enter (`keyup`) và nhấn Enter chu kỳ mới thì thẻ mới được cất.<br>2. Chạm giữ nút ✋ 650ms rồi nhấc tay: hộp mở sạch sẽ ở `phase=ask`, không chọn nhầm đáp án, không có click ma.<br>3. Chạm thật bên trong dialog nhận ngay tức thì không bị trễ.<br>4. Toàn luồng chạm trên màn hình thấp 844×390 hoạt động hoàn hảo. |

## Hoàn thiện rà soát P6b (Enter lặp, Click ma, Đối chiếu Bitcoin)
1. **Enter giữ / lặp:**
   - Thay thế việc chỉ so thời gian đơn thuần bằng cơ chế theo dõi chu kỳ phím (`enterDown`, `spaceDown`, `enterReleasedAfterFeedback`, `spaceReleasedAfterFeedback`).
   - Khi nộp bài bằng Enter, `enterReleasedAfterFeedback` đặt thành `false`. Nút "Cất vào sổ" (`saveBtn`) bắt `onKeyDown`, chặn mọi sự kiện repeat (`e.repeat`) và các sự kiện khi chưa có `keyup`.
   - Trong `collect(e)`, nếu click đến từ bàn phím (`e.detail === 0`) khi chưa nhả phím, hủy bỏ thao tác ngay lập tức.
   - Giữ chuột và chạm (`e.detail > 0`) hoạt động độc lập, không bị ảnh hưởng bởi trạng thái phím.
2. **Cú click ma khi mở thẻ:**
   - Phòng vệ theo chuỗi sự kiện con trỏ: Dialog theo dõi `pointerDownInside`.
   - Khi dialog mount, `pointerDownInside` là `false`. Nếu cử chỉ chạm bắt đầu trước khi dialog mở (ví dụ ngón tay ấn trên canvas/nút ✋) rồi mới nhấc tay trên dialog, cú click ma phát sinh không có `pointerdown` bên trong dialog $\to$ hàm `swallowEarlyClick` phát hiện `!pointerDownInside.current` và nuốt chửng ngay lập tức, bất kể thời gian giữ là bao lâu.
   - Khi người dùng thực hiện cú chạm thật bên trong dialog: `pointerdown` phát sinh bên trong dialog $\to$ `pointerDownInside` chuyển thành `true` $\to$ các cú chạm tiếp theo nhận tức thì mà không cần chờ độ trễ 450ms.
3. **Đối chiếu nguồn chính thức Bitcoin:**
   - Đọc đối chiếu trực tiếp BIP 340 (Taproot Schnorr Signatures) và Bitcoin Developer Guide (Wallets - Key Formats):
     - Khóa riêng 256-bit: số nguyên trong khoảng $[1, n-1]$ trên `secp256k1` với $n \approx 1,15792 \times 10^{77}$ (gần $2^{256}$ khả năng, xấp xỉ $1,16 \times 10^{77}$).
     - Hai kiểu chữ ký: ECDSA truyền thống và Schnorr (BIP 340, Taproot 2021) trên cùng đường cong secp256k1.
     - Giả định duyệt hết $10^{18}$ khóa/s trong $3,7 \times 10^{51}$ năm là ví dụ minh họa toán học trực quan về độ an toàn của khóa 256-bit cho học sinh THPT, phân biệt rõ ràng với mô hình thu nhỏ $5^x \bmod 23$ trong bài học.
   - Bổ sung chú thích trích dẫn chi tiết trong `packages/core/src/content/knowQuiz.ts`.

## Lỗi thật tìm thấy khi kiểm DOM và đã sửa
1. **Cú click ma khi chạm mở hộp** (điện thoại): nút bàn tay mở hộp bằng `pointerdown`, nhấc tay sinh thêm một `click` rơi vào hộp vừa hiện và chọn nhầm một phương án. Sửa: hộp bỏ qua mọi cú bấm trong 450 ms đầu (theo `event.timeStamp`).
2. **Enter lặp:** so thời điểm sự kiện thay vì đồng hồ hẹn giờ (máy chậm làm hẹn giờ trễ).
3. **`/ban-do` và Làng Khắc Dấu:** tổng số thẻ cần nhặt ở `/ban-do` lấy từ số thẻ của bài (5) thay vì số cuộn (4), nên sau khi bỏ cơ chế "đọc là ghi đủ bit" làng này sẽ bị chặn vĩnh viễn; đổi sang `knowCollectibleTotal` (= số câu hỏi = 4).
4. **Quy tắc đã đổi ở `/ban-do`:** trước P6b đọc đủ thẻ ở `/ban-do` ghi đủ bit `knowCards` (qua `markAllKnowCards`); theo yêu cầu "không tự đánh dấu nhặt thẻ" đã bỏ. Hệ quả: người chơi chỉ vào được bài khi nhặt đủ thẻ ở làng 3D (bảng làng ở `/ban-do` nói rõ điều này); cần chủ dự án xác nhận đây đúng ý.

## Kiểm logic (`pnpm test`)
`lib/knowQuiz.test.ts`, `content/knowQuiz.test.ts`, `apps/hub/src/knowQuizDialog.test.tsx`: 16 khóa thẻ khớp chỉ số cuộn thật; 13 câu ABCD đúng đáp án (A:4, B:3, C:4, D:2) và 3 câu điền số 44, 19, 288 khớp logic sẵn có; chuẩn hóa điền số (trống, sai định dạng, số 0 đầu, dấu phân cách, chữ số không phải ASCII); máy trạng thái (chọn, khóa sau nộp, nộp lặp giữ nguyên, trả lời sai vẫn cất được); cất lặp không ghi trùng, chỉ có trường `knowCards`; tiến độ cũ và tự hoàn thành không biến thẻ chưa nhặt thành đã nhặt; nội dung thẻ gốc đã sửa (Bitcoin, một chiều, mất khóa, địa chỉ ví, Làng Giấy thẻ 4, Làng Bạc); không viết cứng tên phản diện; ô điền số là `type="text"`, `inputMode="numeric"`.

## Bundle
JS hub (bản build có `VITE_PROBE`, cùng cờ): 2.792.997 → 2.821.201 byte (**+28.204 byte, +1,0%**; phần lớn là chữ nội dung 16 câu và thẻ đã sửa, phần còn lại là hộp `KnowQuizDialog`).

## Chưa xác minh
- **Supabase thật và tài khoản đăng nhập:** chỉ kiểm khách thật (cookie). Đường tài khoản dùng cùng `progress.markKnowCard` (đã có test hợp bit khi gộp) nhưng chưa chạy với Supabase thật.
- **Thiết bị thật:** điện thoại và máy tính bảng thật (chạm, bàn phím số, bàn phím ảo che hộp, Safari/iPhone, trình đọc màn hình); chỉ có chạm giả lập.
- **Khóa chuột thật:** máy đo dùng khóa chuột giả; dòng nhắc "E: …" ở máy tính ẩn khi phiên tạm dừng nên không đọc được bằng DOM (phím E vẫn mở đúng).
- **Quyền giáo viên bằng trình duyệt** (cần tài khoản); tự hoàn thành chỉ kiểm trên bản dev với khách.
- Không chạy lại bộ đo 3D GL phần mềm và FPS; không đổi hình học hay vật liệu 3D trong P6b.

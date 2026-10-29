# P2a — lời khen khi nộp đúng: kiểm thao tác thật trên bản production (28/10/2026)

## Phạm vi

- Phản hồi dùng chung ở `LessonPage2D` cho màn 1/4/7/10 (12 trạm). Hai cụm pháo hoa CSS (24 hạt, 700 ms) và lời khen 1800 ms, chữ ở `content/lessonPraise.ts`. Đợt mới thay đợt cũ.
- Không đổi công thức, luật, điểm, tiến độ, âm thanh hay phản ứng nhân vật. `playCorrect/playWrong` vẫn báo người nghe thường như cũ; chỉ có người nghe "lần nộp" (lời khen) bị lọc.

## Vị trí lời khen

Dải khen cao 36 px nằm ở **đầu khung `.lesson-screen`, ngoài vùng cuộn** (`.lesson-scroll`), luôn chiếm chỗ nên không làm nhảy bố cục. Hộp phản hồi (`fixed`) bị giới hạn trong `.lesson-window` nằm dưới dải khen, nên không che lời khen. Dải không bắt chuột/chạm, không focus, không tự cuộn.

## Cách kiểm (tách hai loại)

| Loại | Script | Nội dung |
|---|---|---|
| **Thao tác thật** | `scripts/p2a-real-check.mjs` (+ `scripts/lib/p2a-*.mjs`) | Chuột, chạm, bàn phím và kéo/thả thật lên DOM của bản production. **Không** gọi `sound`/`onAnswer`. Đáp án mong đợi tính độc lập từ chữ hiện trên trang (công thức mã trang, `5^x mod 23`, `2^x mod 1.000.003`, ghép cây Merkle, so hai sổ…). |
| **Tín hiệu** | `scripts/p2a-check.mjs` | Phát đúng/sai qua đối tượng `sound` của bản build để thử gộp trùng và vòng đời. Không phải nộp bài thật. Kết quả: `signal-measurements.json`. |

Môi trường: Chrome headless (Chromium 1243), bản build `VITE_MERGED=true VITE_ASSETS_URL=http://localhost:5180`, chạy `vite preview` cổng 4180; riêng mục StrictMode chạy `pnpm dev:hub`. Ba cỡ: 1366×768 (chuột), 360×800 và 844×390 (chạm; `Touchscreen.tap`). Chạy bằng `--deep`: trước mỗi lần nộp đúng cuộn vùng bài xuống tận đáy nếu cuộn được.

## Kết quả thao tác thật (số đo: `real-measurements.json`)

Chạy đủ 3 cỡ, **tất cả đạt**: 129 nhóm kiểm, 516 thao tác nộp/bấm (111 thao tác phải khen, 405 thao tác không được khen), mỗi thao tác khen sinh đúng **1** đợt.

Mỗi trạm: kiểu nộp, kết quả mong đợi → thực tế (mọi cỡ màn hình giống nhau).

| Màn / trạm | Thao tác | Mong đợi → thực tế |
|---|---|---|
| 1 Dễ | ô trống; mã sai (nút); mã sai (Enter); mã đúng (Enter); mã đúng (nút); đúng liên tiếp; sai hai lần rồi đúng | trống/sai 0; mỗi lần đúng 1 (5 lần) |
| 1 Trung bình | hoạt cảnh Tí sửa trộm (tiếng sai tự phát); trống; sai; đúng (Enter/nút) ×3; câu suy ngẫm: chọn, "Chốt" | hoạt cảnh 0; suy ngẫm 0; mỗi lần đúng 1 |
| 1 Khó | sai (chỉ rung); đúng (Enter/nút) ×4; chờ hết 60 giây; câu suy ngẫm | sai 0; đúng 1; suy ngẫm 0 |
| 4 Dễ | Máy tính mã trang nhập 57, 36; Đồng ý/Từ chối đúng; sai; Enter hoặc nút để sang vòng | máy tính 0; quyết định đúng 1 (4 lần), sai 0 |
| 4 Trung bình | so hai sổ (tính độc lập 3 trang khớp + mã mới); như trạm Dễ | giống trạm Dễ |
| 4 Khó | em tạo trang: ô trống, mã sai, mã đúng (Enter), ghi trang gian + xác nhận; bỏ phiếu đúng/sai cho trang của node khác | tạo trang thật đúng 1; gian 0; lật mở của lượt em tạo 0; bỏ phiếu: khen **đúng khi phiếu của em đúng**, kể cả trang bị loại |
| 7 Dễ | ký; kéo thả / chạm / nút đưa thẻ vào máy tự quét (hai lần); phần 2 kiểm khi chưa đặt thẻ; đặt 2 thẻ đúng; kiểm lại không thẻ mới; đặt thẻ bẫy; đặt nốt đúng | máy tự quét 0; phần 2: trống 0, 2 đúng 1, lặp 0, có sai 0, xong 1 |
| 7 Trung bình | dùng Máy xác minh (8 lần, công cụ); chọn Thật/Giả; nộp sai; nộp đúng 4/4 (hộp mở) | máy xác minh 0; nộp sai 0; nộp đúng 1 |
| 7 Khó | tự thử x sai ×3, x đúng; chọn dự đoán; phần 2 gõ x sai (Enter), x đúng; máy dò ×3; "Thử rút 50 xu"; đáp án sai/đúng; biến thể "Để máy thử lần lượt" | tự đúng 1; máy tự dò 0; ý kiến 0; câu hỏi đúng 1, sai 0 |
| 10 Dễ | ô trống; sai; ghép ngược; đúng (Enter/nút) ×5 | trống/sai 0; đúng 1 (5 lần) |
| 10 Trung bình | hoạt cảnh dựng cây; T12, T34, gốc (trống, sai, đúng Enter/nút); soi ô (giống, khác ở nút giữa, lá bị sửa) | soi giống/khác 0; **chỉ lá bị sửa 1**; tiếng sai của hoạt cảnh sửa trộm không xóa lời khen |
| 10 Khó | nhấn kiểm khi trống; 3 mảnh đúng (chưa đủ ô); đặt nhầm chỗ; đặt đúng hai ô còn lại (kéo bằng chuột, chạm trên điện thoại) | 0, 0, 0, đúng cuối 1 |

Kiểm kèm theo mỗi lần khen (đều đạt): dải khen nằm trọn trong khung nhìn (top ≥ 0, bottom ≤ cao khung), không chồng lên vùng bài, `pointer-events: none`, chiều cao 36 px và vị trí khung không đổi trước/sau, không có `pageerror`/`console.error`.

### Cuộn sâu và hộp phản hồi

- Cả **111/111** lần nộp đúng được thực hiện khi vùng bài đã cuộn ≥ 100 px (`scrollBefore`), 99/111 vẫn ≥ 100 px ngay sau khi nộp; 27 đợt khen xuất hiện **cùng lúc** hộp phản hồi đang mở (màn 4 Dễ/Trung bình, màn 7 Trung bình).
- `real-shots.json` ghi từng ảnh: vị trí cuộn, hộp mở hay không, số hạt, câu khen. Lớn nhất 104.885 byte (< 300 KB).
- Ảnh `thuc-man<M>-tram<T>-<tên>-<cỡ>.jpg` chụp **ngay sau** thao tác nộp thật (60 ms; ảnh có hộp đợi 750 ms cho hộp trượt vào xong). `*-hop-*`: hộp phản hồi đang mở; `*-giam-chuyen-dong-*`: cài đặt Giảm chuyển động (chỉ có chữ). Ví dụ: `thuc-man7-tram1-hop-360x800.jpg`, `thuc-man4-tram0-hop-844x390.jpg`.
- **Giới hạn thật:** ở 1366×768 một số trang vừa khung nên không cuộn được (xem `scrollMax` trong `real-shots.json`, ví dụ `thuc-man10-tram0-lan1-1366x768.jpg` 564/564 là đã ở đáy).

### Vòng đời, âm, giảm chuyển động (mỗi màn, 3 cỡ; đạt 90/90)

| Kiểm | Kết quả |
|---|---|
| Tắt âm | vẫn có khen và 24 hạt, **0** nốt nhạc phát ra; bật âm có nốt nhạc (đối chứng) |
| Giảm chuyển động trong cài đặt | chỉ có chữ, 0 hạt |
| Giảm chuyển động của hệ điều hành (`prefers-reduced-motion`) | chỉ có chữ, 0 hạt |
| Đổi media sang giảm chuyển động giữa chừng | hạt 24 → 0, chữ còn |
| Đổi trạm khi đang khen | lời khen và hạt biến mất ngay, 2,3 giây sau không khen lại |
| Rời bài (SPA) khi đang khen | vùng khen bị gỡ, không lỗi, không dựng lại |
| `FeedbackSheet` render lại khi hộp ĐÚNG đang mở (đổi cỡ khung 4 lần → callback mới mỗi lần) | số đợt khen 1 → 1 trên cả **production** và **dev StrictMode**. Ở lượt P2a đầu nốt nhạc vẫn phát lại 8 lần (2 nốt × 4); **đã sửa ở lượt sau** (0 lần, xem mục `FeedbackSheet`) |

## Lỗi tìm ra khi kiểm thật và đã sửa

So sánh với bản build trước sửa (`truoc-khi-sua.log`, cùng script, 1366×768; bản gốc không đạt 16 mục):

1. **Chữ lộ ra trang** `// isolate: …` (chú thích mã đặt nhầm trong JSX của `LessonPage2D`) hiện trên mọi trạm. Sửa thành chú thích JSX.
2. **Màn 7 Dễ phần 2:** bấm "Kiểm tra kết quả" khi chưa đặt thẻ (hoặc không có thẻ mới) vẫn khen. Chỉ khen khi có thẻ mới được khóa đúng; âm và phản ứng giữ nguyên (`{ answer: null }`).
3. **Màn 7 Trung bình:** kết quả "chữ ký hợp lệ" của Máy xác minh (công cụ) bị tính là câu trả lời. Chuyển thành tín hiệu không nộp bài.
4. **Màn 7 Khó:** trả lời đúng ở phần 3 ("Không ai cả") và dò đúng ở phần 2 không có tín hiệu khen vì trạm chỉ gọi `playLevelComplete`. Thêm `emitSubmission(true)` (chỉ người nghe lần nộp, không đổi âm hay nhân vật).
5. **Màn 10 Trung bình:** hoạt cảnh sửa trộm gọi `playWrong()` 700 ms sau khi soi trúng nên xóa lời khen. Ba tiếng của hoạt cảnh chuyển thành `{ answer: null }`.
6. `FeedbackSheet` chỉ nhớ "đã báo" theo trạng thái mở nên mất lần nộp nếu đúng/sai đổi khi hộp còn mở. Tách `announceOnce` (hàm thuần, có test).
7. Trạm Khó màn 4: logic "phiếu em đúng không" tách thành `voteWasRight` và có test chứng minh độc lập với việc trang được nhận (đủ 4 tổ hợp đúng/sai × nhận/loại; lần chạy thật cũng gặp đủ 4).

## Ghi nhận ngoài phạm vi (không sửa)

- Màn 3 nút "?" đè chữ "Soi công thức" (ghi nhận từ trước).
- Màn 4 Khó hai node không đủ cọc "bỏ lượt" không gặp trong các lần chạy; logic đó chưa được kiểm qua DOM (khen không đụng tới).
- Hai lỗi `FeedbackSheet` ghi nhận ở lượt P2a đầu (Enter đóng hộp ngay; âm và phản ứng nhân vật phát lại khi cha render lại) **đã sửa ở lượt sau**, xem mục dưới.

## Sửa `FeedbackSheet` sau P2a (hai lỗi, cùng ngày)

Tệp sửa: `packages/core/src/ui/FeedbackSheet.tsx`, `feedbackAnnounce.ts`, `feedbackAnnounce.test.ts`; kiểm: `scripts/p2a-feedback-check.mjs`. Không đổi luật, công thức, điểm, tiến độ, loại âm, tư thế nhân vật, hiệu ứng khen.

1. **Enter nộp không đóng hộp vừa mở.** Phím Enter nộp đáp án kích luôn nghe-phím của hộp (effect chạy đồng bộ trong cùng sự kiện), nên hộp sai đóng ngay. Giờ `enterContinues` chỉ nhận keydown **không phải phím lặp** và **sau thời điểm hộp báo lần nộp** (`event.timeStamp > openedAt`); mọi Enter vẫn bị chặn mặc định để nút "Tiếp" đang giữ focus không bị bấm thêm. Em phải thả phím rồi nhấn Enter lần nữa mới tiếp tục; giữ phím (key repeat) không làm gì; bấm nút Tiếp bằng chuột/chạm bình thường.
2. **Không phát lại âm và phản ứng nhân vật.** Trước đây effect phụ thuộc `onContinue` (hàm mới mỗi lần cha render) nên chạy lại và phát lại âm. Giờ tách hai effect: báo lần nộp phụ thuộc `[isOpen, isCorrect, khóa nội dung]` (`submissionKey`, `shouldAnnounce`), phím Enter dùng ref tới `onContinue` mới nhất. Mỗi lần nộp phát **đúng một lần** `sound.playCorrect()`/`playWrong()` như trước P2a (không còn tham số `answer`); hộp đóng rồi mở lại, hoặc đúng/sai/nội dung đổi lúc hộp mở là lần nộp mới, nên hai lần liên tiếp cùng đúng hay cùng sai đều phát đủ.

### Test hồi quy

- `feedbackAnnounce.test.ts` (hàm thuần): render lại 6 lần một lần nộp → 1 lần phát; hai lần cùng sai và hai lần cùng đúng (đóng giữa chừng) → 2 lần; đúng/sai hoặc nội dung đổi lúc mở → lần nộp mới; khóa khác nhau ở mọi trường; Enter nộp (nhấn trước hoặc đúng lúc mở) không tiếp tục, key repeat không tiếp tục, nhấn mới sau khi mở thì tiếp tục, lần nộp mới làm mới mốc.
- **DOM thật bằng bàn phím** (`p2a-feedback-check.mjs`, bàn phím `keyboard.down/up` và chuột/chạm thật; không gọi `sound`/`onAnswer`), mỗi bài một trạm có hộp phản hồi: màn 1 Dễ (Enter trong ô nhập), màn 4 Dễ (Enter trên nút Đồng ý/Từ chối), màn 7 Trung bình (Enter trên nút nộp thẩm định), màn 10 Dễ (Enter trong ô ghép cặp); 3 cỡ; trên **production** (96 kiểm) và **dev StrictMode** (120 kiểm), đạt hết. Mỗi trạm kiểm:
  - Enter nộp: hộp còn mở sau 600 ms;
  - cha render lại 5 lần (đổi cỡ khung): hộp còn mở, **0 nốt nhạc phát thêm**; ở dev thêm đo người nghe `onAnswer` (chính đường phản ứng nhân vật): **0 lần báo thêm**;
  - nhấn Enter mới: hộp đóng; giữ Enter + 8 key repeat: hộp vẫn mở, thả rồi nhấn lại: đóng;
  - bấm nút Tiếp bằng chuột/chạm: hộp đóng; ba lần nộp liên tiếp mỗi lần phát âm một lần (số nốt lần 1 và 3 cùng loại bằng nhau).
- **Đối chứng bản trước sửa** (`feedback-keyboard-truoc-khi-sua.json`, cùng script, 1366×768): **12/32 kiểm không đạt**: hộp đóng ngay khi Enter nộp (màn 1, 10), giữ Enter làm đóng (cả bốn bài), cha render lại làm phát thêm 5 lần âm (màn 4, 7).
- Hồi quy lời khen P2a sau sửa: `p2a-real-check.mjs` chạy lại ở 1366×768 và 844×390 (trạm, vòng đời, hộp phản hồi, dev StrictMode): 86 nhóm, 0 lỗi; `p2a-check.mjs` (tín hiệu) đạt.
- Số đo từng kiểm: `feedback-keyboard-production.json`, `feedback-keyboard-dev.json`.

### Chưa xác minh (lượt này)

Bàn phím vật lý trên thiết bị thật, bàn phím ảo, Safari/iPhone, trình đọc màn hình; các lần nộp bằng Enter trong trạm có hộp mà tôi chưa dùng làm phương tiện (màn 1 Trung bình/Khó, màn 4 Trung bình, màn 7 Dễ, màn 10 Trung bình/Khó) dùng chung `FeedbackSheet` nên chịu cùng quy tắc nhưng không được lái riêng; phản ứng nhân vật ở bản production chỉ kiểm gián tiếp qua nốt nhạc (không có hook vào module), ở dev đo trực tiếp.

## Kiểm tra bắt buộc

`pnpm test --maxWorkers=2`: **2123 pass, 1 skipped** (193 file pass, 1 skipped; sau cả hai lượt, gồm test `feedbackAnnounce`, `emitSubmission`, `voteWasRight`). `pnpm typecheck` đạt. `pnpm check:text` sạch (428 file). `pnpm build` đạt (5 app, `VITE_MERGED=true`).

## Chưa xác minh

Thiết bị thật, Safari/iPhone, bàn phím ảo, trình đọc màn hình, FPS điện thoại; chưa deploy. Chưa dựng lại baseline bundle (số bundle P2a trong `bundle-*.json` giữ như bản ghi cũ; các sửa lần này chỉ thêm vài byte).

## Tệp

`real-measurements.json` (từng thao tác: mong đợi/thực tế, cuộn, bố cục, nốt nhạc), `real-shots.json`, `signal-measurements.json`, `truoc-khi-sua.log`, `feedback-keyboard-*.json`, 57 ảnh `thuc-*.jpg`, `build.log`, `typecheck.log` (lượt mới), `bundle-*.json` (bản ghi cũ).

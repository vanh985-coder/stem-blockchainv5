# P3a — vào độc lập cả 4 làng (29/10/2026)

## Làm gì

Cả 4 cổng làng mở từ đầu cho học sinh đăng nhập và khách. Một nguồn: `computeUnlock().villageOpen` luôn `[true, true, true, true]`; cảnh thế giới (`gateStates`), `/ban-do` (`unlock.levels`) và đường dẫn trực tiếp (`LevelGuard`) cùng đọc nguồn này.

- **Trong làng giữ nguyên thứ tự:** thẻ "Em có biết?" (chặn ở lớp thế giới và `/ban-do`) → bài học → game 1 → game 2. Màn đầu mỗi làng (1, 4, 7, 10) mở; màn sau khóa, lý do chỉ nhắc màn cùng làng.
- **Không tự hoàn thành gì:** mở cổng không đặt màn xong, thẻ, sao, xu hay Trang Sổ Vàng.
- **Trang Sổ Vàng** vẫn theo điều kiện cũ (xong màn `ready` cuối của làng) và đếm liền từ Làng Giấy: chơi làng sau trước thì chưa có trang, các trang tới cùng lúc khi làng còn thiếu xong. Không còn "mở làng kế tiếp".
- **Cao trào** vẫn ở sau màn 12, chỉ chiếu khi đã đủ 4 trang (`MiniGameFinale.ready`): chơi màn 12 khi còn làng chưa xong thì đi thẳng tới màn kết quả; chiếu khi chơi lại màn 12 sau khi đủ 4 trang. **Tự chọn** (để không chiếu "ghép đủ 4 trang" khi mới có 0 đến 3 trang).
- **Tắt hiệu ứng mở cổng** (then gỗ và dây đỏ rơi, `GATE_OPENING_CEREMONY = false`); mã và cờ `gateOpenSeen` đã lưu được giữ nguyên.
- **Sửa chữ còn đòi xong làng trước** (tất cả ở `packages/core/src/content/`): lời Bi 0 và 1 trang, lời cảnh trao trang ("ghé làng khác"), `nhiemVuXong`, `congDong`, truyện số 5 ("cổng làng đóng hết"), Hướng dẫn chơi (bỏ trang "cổng chưa mở", trang cổng nói cả bốn cổng đều mở; bỏ ảnh `cong-dong` khỏi danh sách và `guide-capture.mjs`).
- **Không đổi** công thức, luật chơi, mốc điểm; không sửa tiến độ đã lưu (chỉ đổi cách tính mở khóa, không đặt lại dữ liệu).

## Kết quả kiểm (`node scripts/p3a-check.mjs`, bản build có cầu nối đo, Chrome headless, WebGL phần mềm)

**111 kiểm đạt** (1366×768: 37, 360×800: 37, 844×390: 37). Chi tiết `ket-qua.json`; ảnh `anh.json` (24 ảnh, lớn nhất 164.272 byte). Chuột ở 1366×768, chạm giả lập (`Touchscreen.tap`) ở hai cỡ còn lại; đi bộ qua cổng bằng phím (Shift + W) ở cả 3 cỡ. Tiến độ cũ đặt bằng cookie khách đúng định dạng của ứng dụng.

| Yêu cầu | Kết quả |
|---|---|
| Khách mới vào cả 4 làng | `/ban-do`: mỗi làng bài học Mở, game 1 và 2 Khóa; lý do khóa chỉ nhắc màn cùng làng; xem cả 4 làng không ghi trang/xu/màn nào (cookie `gp=0, c=0`, không `lv`) |
| Qua cổng ở thế giới | bản đồ lớn: 4/4 ký hiệu cổng "mở"; đi bộ từ cách cổng 3 qua cổng vào đủ 4 làng (`__worldInside` đúng làng) |
| URL trực tiếp | `/lang/<làng>/man/<bài học>` vào được ở cả 4 làng; `/man/<game 1>` còn khóa, nhắc màn bài học |
| Thẻ chưa đủ | bài học chưa có nút Vào khi chưa đọc thẻ (cả 4 làng); đủ thẻ thì Vào được, hai game vẫn khóa |
| Xong làng sau trước | cookie Bạc xong 10 đến 12: Bạc 3 màn Xong, Trang Sổ Vàng 0/4 (kể cả của Bạc), 3 làng còn lại vẫn như mới, cookie không đổi (`gp=0`, đúng 3 màn), URL Làng Giấy vẫn vào được |
| Tiến độ cũ | `gp=2` và 6 màn xong: 2 trang hiện, Dệt 3 màn Xong, Khắc Dấu bài học Mở; tải lại vẫn `gp=2`, 6 màn |

Test hồi quy (vitest): `progress/independentVillages.test.ts` (9 ca: khách/học sinh mới, mở cổng không tự trao gì, thứ tự trong làng, xong làng sau trước, đảo thứ tự cả 12 màn, đảo một phần, tiến độ đã lưu/cookie/gộp, giáo viên), `unlock.test.ts` và `marketQuest.test.ts` viết lại theo luật mới, `progress.test.ts`, `guide.test.tsx`, `dialogues.test.ts`.

## Lệnh bắt buộc

`pnpm test --maxWorkers=2`: **2147 pass, 1 skipped** (196 file). `pnpm typecheck` đạt; `pnpm check:text` sạch (430 file); `pnpm build` đạt (`build.log`, `typecheck.log`).

## Bundle (build thường, tổng JS hub)

P2b 2.774.099 → P3a **2.773.527 byte** (−572; gzip 860.705 → 860.518). Không thêm chunk. Không sửa dựng cảnh 3D nên không đo FPS.

## Chưa xác minh

- **Tài khoản thật (Supabase):** máy đo không có khóa nên chưa thử đăng nhập học sinh mới, đồng bộ `game_state` và tài khoản giáo viên. Phần này chỉ được kiểm bằng test (`computeUnlock`, `recordLevelResult`, `mergeProgress`, mã hóa cookie) và bằng cookie khách; quyền giáo viên chỉ kiểm bằng test (`isTeacher` mở mọi màn, cổng mở hết).
- Thiết bị thật, Safari/iPhone, joystick cảm ứng (đi qua cổng chỉ thử bằng phím); chạm chỉ giả lập bằng Chrome.
- Sau lượt kiểm production chỉ đổi thêm một câu chữ Hướng dẫn chơi và test của nó (không ảnh hưởng 111 kiểm); `pnpm test`, `pnpm build` đã chạy lại sau đổi.
- Cao trào khi chơi màn 12 trước: chỉ kiểm bằng logic (`ready`), chưa chạy ván thật ở trình duyệt.
- Cảnh trao Trang Sổ Vàng khi các trang tới cùng lúc (ví dụ 0 → 4): mỗi làng vẫn chiếu khi em vào làng đó như cũ; chưa quan sát bằng tay ở trình duyệt.

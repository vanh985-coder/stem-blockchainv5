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

---

# P3a hoàn thiện — trao Trang Sổ Vàng và cao trào (29/10/2026)

## Vấn đề và cách làm

Sau `28fe810`, cao trào chỉ chiếu khi đủ 4 trang, nên màn 12 xong trước thì phải chơi lại màn 12 mới xem được. Nay:

- **Không chơi lại màn 12.** `progress/climaxState.ts`: `canWatchClimax` (đủ 4 trang và đã chơi màn 12), `climaxPending` (xem được và chưa có cờ `climaxSeen`). Khi đủ trang về sau, cảnh "đang chờ" hiện ở ba chỗ, đều là thao tác của em (không tự ngắt ván hay hộp phản hồi): (1) màn kết quả của game vừa làm đủ trang: lời báo và nút "Xem cảnh cuối"; (2) bảng Làng Bạc ở `/ban-do`: nút "Xem cảnh cuối" (đã chiếu thì "Xem lại cảnh cuối"); (3) dòng nhiệm vụ ở chợ: "Cảnh cuối đang chờ em…".
- **Mở thẳng cảnh:** `/lang/lang-bac/man/12?canh=cuoi` (`openClimax`/`climaxPath`), chiếu cảnh không vào game, hết cảnh hay "Bỏ qua" thì về `/ban-do`. Chưa đủ điều kiện thì địa chỉ này chỉ hiện thẻ bắt đầu màn 12 (không chiếu, không nói "đủ 4 trang").
- **Giữ nguyên:** thứ tự thường vẫn tự chiếu sau ván rồi mới tới màn kết quả; cờ `climaxSeen` (ghi khi hết hay "Bỏ qua", tải lại giữa cảnh thì chưa ghi); xem lại không ghi gì; số trang không đổi.
- **Tự chọn:** bước d (cảnh trao trang) có ở lần xem đầu của mọi tài khoản và ở lần xem lại (trước đây bỏ khi đã có trang 4 trước ván); một cờ duy nhất quyết định nên không trao hai lần.
- **Lỗi bắt được khi kiểm thật và đã sửa:** xem cảnh từ nút, hết cảnh thì cờ `climaxSeen` đổi, `award` đổi giữa lúc đang chiếu, bước d biến mất làm `ClimaxScene` lỗi (React #520, tự phục hồi). Nay chụp lúc vào trang (`Man12.tsx`) và `stepAt` kẹp chỉ số (test ở `climaxFlow.test.ts`).
- Không đổi công thức, luật, điểm, điều kiện nội bộ; chữ mới ở `content/climax.ts`.

## Kiểm DOM thật trên production (`node scripts/p3a-climax-check.mjs`)

Bản build có cầu nối đo; tiến độ đầu vào đặt bằng cookie khách (đúng định dạng ứng dụng) để giảm thời gian; **hoàn thành màn và mở cao trào đều qua thao tác thật**: chơi thật màn 6 (diều: bắt đầu, để diều rơi tới hết tim, xem kết quả) và màn 12 (leo cây: nhảy bằng phím cách hay chạm, bấm hộp thoại của game tới hết), bấm nút xem cảnh, lật từng lượt bằng nút "Tiếp". **120 kiểm đạt** (1366×768: 40, 360×800: 40, 844×390: 40; màn 6 ở 360×800 chơi sau khi xoay ngang máy vì màn 6 chỉ chơi khung ngang). 27 ảnh mới (lớn nhất 162.762 byte); chi tiết `ket-qua-cao-trao.json`, `anh-cao-trao.json`.

| Kịch bản | Kết quả |
|---|---|
| **A. Thứ tự thường** (11 màn đầu xong, 3 trang) | trước màn 12 chưa có nút xem cảnh cuối; chơi xong màn 12 thì cảnh tự chiếu, không hiện màn kết quả cùng lúc; đủ 4 bước (truyện, cảnh dưới gốc đa, truyện, trao trang) đúng thứ tự, bước trao trang nói "đủ 4 trang"; sang màn kết quả có "Xem lại cảnh cuối"; tiến độ: 4 trang, cờ đã chiếu, màn 12 đã ghi; xem lại không ghi thêm gì; bảng Làng Bạc đổi sang "Xem lại" |
| **A2. Tải lại giữa cảnh** | trang 4 và kết quả màn 12 còn, cờ chưa ghi; sau tải lại bảng Làng Bạc có "Xem cảnh cuối"; xem hết từ nút, về `/ban-do`, cờ ghi đúng một lần |
| **B. Màn 12 xong trước, làm nốt màn 6, xem từ màn kết quả** | trước đủ trang: bảng Làng Bạc không có nút, `/man/12?canh=cuoi` không chiếu và không nói "đủ 4 trang"; chơi thật màn 6: trang 1 → 4, kết quả màn 12 giữ nguyên; màn kết quả có lời báo và nút "Xem cảnh cuối", không hộp thoại chồng; bấm nút: đủ 4 bước, hết cảnh về `/ban-do`, cờ ghi, màn 12 không bị chơi lại; xem lại không ghi gì |
| **C. Như B, xem từ bảng Làng Bạc sau tải lại** | tải lại ngay sau màn kết quả vẫn đủ tiến độ; bảng Làng Bạc có "Xem cảnh cuối"; xem đủ 4 bước; cờ và số trang đúng; không còn lỗi trang |
| **D. Nhiều trang cùng lúc (2, 3, 4)** | sau màn 6: `gp` 1 → 4; vào Làng Dệt rồi Khắc Dấu ở thế giới: mỗi làng đúng 1 hộp trao trang (không chồng), cờ trao trang cả hai được ghi (không mất, không thêm); tải lại và vào lại Dệt: không chiếu lại; ở chợ dòng nhiệm vụ nhắc "Cảnh cuối đang chờ em" |

## Test và lệnh bắt buộc

Test hồi quy mới: `progress/climaxState.test.ts` (6 ca: thứ tự thường, màn 12 xong trước, đủ trang về sau mà kết quả màn 12 giữ nguyên, đã chiếu, chưa chơi màn 12 dù có 4 trang cũ, đường dẫn), `ban-do/parts.test.tsx` (nút ở bảng Làng Bạc: chưa đủ không có, chờ, đã chiếu), `climaxFlow.test.ts` (`stepAt`).
`pnpm test --maxWorkers=2`: **2157 pass, 1 skipped** (197 file); `pnpm typecheck` đạt; `pnpm check:text` sạch (431 file); `pnpm build` đạt. Bundle hub 2.774.688 byte (trước 2.773.527, +1.161; gzip 860.614).

## Chưa xác minh

- Tài khoản Supabase thật (không có khóa ở máy đo): chỉ kiểm bằng test và cookie khách; đồng bộ cờ `climaxSeen` giữa máy đã có test hợp cờ từ trước.
- Thiết bị thật, Safari/iPhone; chạm giả lập bằng Chrome; màn 6 ở 360×800 phải xoay ngang như thật.
- Máy 3D phần mềm chậm: thời gian từng bước chỉ để tham khảo.
- Ghi chú yêu cầu: mục "hướng dẫn focus và làm thử cho cả 12 màn" không có trong `TRANG-THAI.md` trên nhánh này (đã tìm theo "focus", "làm thử", "12 màn"; chỉ có ghi chú focus của màn 8 ở P1a, giữ nguyên). Nếu mục đó nằm ở bản bạn đang sửa, hãy thêm lại; tôi không tự tạo nội dung mới cho mục đó.

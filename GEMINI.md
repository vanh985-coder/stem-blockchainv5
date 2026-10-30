# Giấc mơ Sổ Chung — hướng dẫn bàn giao cho Gemini

Tài liệu này bàn giao công việc từ Claude Code sang Gemini (30/10/2026). **Nguồn tiến độ chính là `docs/specs/TRANG-THAI.md`**; tài liệu này chỉ tóm tắt và chỉ ra việc tiếp theo, không chép lại số liệu dài. Gặp chỗ hai tài liệu lệch nhau thì tin `TRANG-THAI.md` và mã nguồn, rồi báo chủ dự án.

> Lưu ý: `CLAUDE.md` (dòng đầu) vẫn ghi "`GEMINI.md` đã bỏ". Chủ dự án đã yêu cầu tạo lại tệp này để bàn giao; dòng đó của `CLAUDE.md` chưa được sửa (việc bàn giao này chỉ thêm tài liệu). `CLAUDE.md` là bản quy tắc đầy đủ nhất cho AI code, `AGENTS.md` là bản ngắn hơn; nếu khác nhau thì theo `CLAUDE.md`.

## 1. Dự án, cấu trúc, thứ tự đọc

**Giấc mơ Sổ Chung**: game phiêu lưu 3D trên web dạy blockchain cho học sinh THPT. 12 màn ở 4 làng (Giấy, Dệt, Khắc Dấu, Bạc: mỗi làng một bài học và hai game), có chợ phiên là thế giới mở, đăng nhập Supabase, trang giáo viên. Học sinh xưng "em".

Cấu trúc (pnpm monorepo):
- `apps/hub`: web chính, đã gộp cả 4 làng khi `VITE_MERGED=true` (mẫu `deploy/.env.example`); `apps/lang-*`: vỏ chạy riêng từng làng.
- `packages/core`: giao diện, động cơ 3D, đăng nhập, tiến độ, câu hỏi, logic 4 bài (`lessons/`), toàn bộ chữ hiển thị (`content/`).
- `packages/village-*`: nội dung từng làng (trang bài học, game, route).
- `supabase/`: migrations SQL, edge functions. `assets-build/`: đồ họa đã nén (commit); `assets/` là bản gốc, không đưa lên Git.
- `docs/`: spec, báo cáo kiểm (`docs/screenshots/<bước>/`), `docs/DEPLOY.md`.
- `scripts/`: script kiểm bằng trình duyệt (`pNN-check.mjs`) và xuất tài liệu; dùng `puppeteer-core`.

Thứ tự đọc: `CLAUDE.md` → `docs/specs/TRANG-THAI.md` → `docs/specs/00-HUONG-DAN-DU-AN.md` → đúng file spec của việc được giao. Spec 03 (`03-dong-co-3d-giao-dien-chung.md`) là nền tảng cho mọi màn. Luật và số liệu 4 bài học: `docs/specs/giai-doan-1/`. Nội dung thẻ "Em có biết?" tương tác: `docs/specs/P6-NOI-DUNG-THE-TUONG-TAC.md`. Triển khai: `docs/DEPLOY.md`.

## 2. Quy tắc bắt buộc (tóm tắt; chi tiết ở `CLAUDE.md` mục 5, 7, 8, 9)

- **Làm đúng spec**, không thêm tính năng ngoài spec. Chỗ spec chưa nói thì chọn phương án hợp lý nhất và ghi rõ là "tự chọn" trong báo cáo.
- **Chữ tiếng Việt**: có dấu, xưng "em" với học sinh. MỌI chữ hiển thị nằm trong `packages/core/src/content/`, không viết chữ tiếng Việt thẳng trong component (`pnpm check:text` phải sạch). Chữ trong mã dev viết tiếng Anh. Không có chữ trong ảnh.
- **Tên nhân vật**: dùng chỗ giữ tên `{phanDien}`, `{bacAn}`, `{cuBinh}`, `{coChi}`, `{chuDung}`, `{thayLinh}`, `{ten}`/`{Ten}` (qua `fmt()`); tên lấy từ `content/characters.ts`. KHÔNG viết cứng tên phản diện.
- **Logic bài học**: dùng lại logic trong `packages/core/src/lessons/` (ví dụ `pageCode`, `modPow`, `buildTree`), không viết lại công thức. Mọi hàm logic game là hàm thuần, có test vitest. Không đổi số liệu bài học.
- **Đồ họa**: tải theo `manifest.json` từ `VITE_ASSETS_URL`; thiếu file thì hiện hình thay thế, không lỗi trang. Khi đổi đồ họa gốc: `pnpm assets:build` rồi commit `assets-build/`.
- **Hiệu năng 3D**: mức Thấp ≥ 30 fps trên điện thoại tầm trung; không tạo object mới trong `useFrame`; rời cảnh thì dispose. Lớp HTML phủ lên cảnh 3D (HUD, bản đồ, hộp) không dùng `box-shadow`/`text-shadow`/`filter` mới. Ngân sách tam giác và cách đo: `CLAUDE.md` mục 9.
- **Cài đặt**: tôn trọng "Chữ to" (cỡ chữ theo rem) và "Giảm chuyển động" (không nhấp nháy, không hiệu ứng bay). Giáo viên thấy mọi thứ và không bị chặn.
- **Tiến độ**: lưu ở `game_state.data` (tài khoản) và cookie `sc_guest` (chơi thử, trường viết tắt ở `progress/compact.ts`). Thêm cờ mới thì sửa cả `compact.ts`, `merge.ts`, `manager.ts` và có test.
- **Supabase**: chỉ dùng anon key ở frontend; không tắt RLS; đổi cơ sở dữ liệu bằng file migration MỚI. **HỎI chủ dự án TRƯỚC mọi thay đổi về server, Cloudflare, Supabase (migration, edge function, RLS, khóa, DNS, cache). KHÔNG deploy.**
- **Bí mật**: để trong `.env.local`, không commit, không in ra chat/log/file/ảnh chụp. Không thêm server riêng, quảng cáo hay công cụ theo dõi.
- **Làm game mới / thêm làng**: theo mẫu ở `CLAUDE.md` mục 7 và 8 (config, logic thuần, bot cân bằng, `MiniGameLevel`, chặn lỗi 3D, nạp trước).
- **Môi trường Windows** (máy chủ dự án): shell có thể là Git Bash hoặc PowerShell; tránh heredoc dài và dấu huyền/nháy lồng trong lệnh; tên file không phân biệt hoa thường; tắt server nền (5173–5177, 5180, 5190…) và xóa `dist-probe*` sau khi đo (`CLAUDE.md` mục 11).

### Lệnh kiểm bắt buộc trước khi commit
`pnpm test --maxWorkers=2` · `pnpm typecheck` · `pnpm check:text` · `pnpm build` (cả bốn phải đạt; test timeout cũng là lỗi). Các lệnh khác: `pnpm dev:hub` (5173), `pnpm dev:assets` (5180), `pnpm assets:build`, `pnpm rls:check`, `pnpm guide:capture`. Cách đo bản build (`VITE_PROBE`, `vite preview`, các cầu nối `window.__*`) ở `CLAUDE.md` mục 9–10. Kiểm DOM bản build: các script `scripts/pNN-check.mjs` (mẫu mới nhất `scripts/p6b-check.mjs`, ghi rõ cách chạy ở đầu tệp).

Quy trình git của dự án (`CLAUDE.md` mục 12): chỉ commit khi bốn lệnh trên đạt; message tiếng Việt dạng `<gói>: <việc đã làm>`; chỉ push nhánh đang làm; KHÔNG force-push, KHÔNG sửa lịch sử đã push, không commit `.env*`, `assets/`, `dist-*`. Merge vào `main` chỉ khi chủ dự án đã cho phép (xem mục 5, bước cuối).

## 3. Git hiện tại (cập nhật sau khi merge, 30/10/2026)

- **Đã merge vào `main`:** pull request #3 (https://github.com/vanh985-coder/stem-blockchainv5/pull/3), commit merge `3973d46`, theo yêu cầu của chủ dự án. `main` nay gồm P4, P5 (PR #1, #2), P6a, P6b và `GEMINI.md` (commit `d14458e` là commit cuối của nhánh trước khi merge; P6b là `e86123b`). Các kiểm bắt buộc đã chạy trên mã P6b trước khi merge, **không chạy lại sau khi merge**.
- **Nhánh làm việc:** `claude/wonderful-dijkstra-x092dj`, đã đặt lại theo `main` sau merge (mọi commit của nhánh đã nằm trong `main`); việc mới thì làm tiếp trên nhánh này hoặc nhánh mới từ `main`, rồi tạo pull request như trước.
- **Chưa deploy gì.** Việc merge `main` không có nghĩa là đã triển khai lên máy chủ.
- **Working tree:** sạch tại thời điểm cập nhật (không có thay đổi chưa commit của người dùng).
- Công cụ GitHub của phiên Claude là các công cụ MCP (không có `gh`); các lần merge đều làm bằng tạo PR rồi gộp bằng công cụ đó.

## 4. P6b — đã triển khai gì (chi tiết: `docs/screenshots/p6b/BAO-CAO.md`, mục "P6b" của `TRANG-THAI.md`, spec 03 mục 3.9 "Thẻ có ví dụ và câu hỏi")

**Đã triển khai:** khi nhặt cuộn "Em có biết?" trong làng, hộp `packages/core/src/ui/KnowQuizDialog.tsx` (một hộp cuộn được) đi theo luồng: nội dung thẻ → ví dụ → trả lời một lần → đáp án đúng và giải thích (hiện cả khi trả lời sai) → "Cất vào sổ". 16 thẻ nhặt được (4 mỗi làng): 13 câu ABCD (giữ thứ tự A–D) và 3 câu điền số (44, 19, 288; ô văn bản `inputMode="numeric"`, chuẩn hóa ở `lib/knowQuiz.ts`). Chữ ở `content/knowQuiz.ts`; 16 thẻ gốc đã sửa cùng ví dụ trong `content/lessons/bai-1.ts` … `bai-4.ts` theo `P6-NOI-DUNG-THE-TUONG-TAC.md`. Thẻ thứ 5 của Làng Khắc Dấu chỉ đọc, không có cuộn, không có câu hỏi. Chỉ ghi `knowCards` khi bấm "Cất vào sổ"; đóng trước đó thì chưa nhặt; không lưu đáp án; không điểm, xu, sao, tim. Thẻ đã nhặt xem lại ở menu "Em có biết?" (chế độ `review`).

**Kiểm đã đạt (xem báo cáo để biết số liệu):**
- `pnpm test --maxWorkers=2` 2266 đạt, 5 bỏ qua; `pnpm typecheck`, `pnpm check:text`, `pnpm build` đạt (trên mã commit `e86123b`).
- Test logic mới: `lib/knowQuiz.test.ts`, `content/knowQuiz.test.ts`, `apps/hub/src/knowQuizDialog.test.tsx`.
- Kiểm DOM bản build (`scripts/p6b-check.mjs`) bằng **khách thật** (cookie `sc_guest`): trả lời và cất đủ 16 thẻ ở 1366×768 (chuột + bàn phím), 360×800 và 844×390 (chạm giả lập), có đúng và sai; đóng trước khi cất; xem lại; tải lại; `/ban-do`; tiến độ cũ; Chữ to và Giảm chuyển động ở màn thấp; tự hoàn thành trên bản dev.
- Bundle hub JS +28.204 byte (+1,0%, bản build có `VITE_PROBE`). Không chạy lại bộ đo 3D vì không đổi hình học hay vật liệu.

**Giới hạn chưa xác minh:** Supabase thật và đường tài khoản đăng nhập (chỉ khách thật); điện thoại/máy tính bảng thật (bàn phím số ảo, Safari/iPhone, trình đọc màn hình); khóa chuột thật (máy đo dùng khóa chuột giả nên dòng nhắc "E:" ở máy tính ẩn); quyền giáo viên bằng trình duyệt. Máy đo chạy GL phần mềm (2–6 khung/giây), nên số FPS không dùng để kết luận 30 fps trên điện thoại thật.

**Điều chỉnh đã làm trong P6b cần giữ (quyết định của chủ dự án): `/ban-do` chỉ là phần ĐỌC.** Giới thiệu làng và nút "Đọc thẻ Em có biết" ở `/ban-do` không có câu hỏi và **không tự ghi nhận nhặt thẻ** (trước P6b, đọc đủ thì ghi đủ bit `knowCards` qua `markAllKnowCards`; đã bỏ). Bảng làng ở `/ban-do` vẫn chặn bài học tới khi nhặt đủ thẻ ở làng 3D và nói rõ điều đó; số thẻ cần nhặt dùng `knowCollectibleTotal` (= 4 mỗi làng, không phải số thẻ của bài: Làng Khắc Dấu có 5 thẻ nhưng chỉ 4 cuộn). **Không hoàn nguyên quyết định này** khi chưa hỏi chủ dự án.

## 5. Các việc đã hoàn thành trong đợt tiếp nối (30/10/2026)

1. **Ba sửa ưu tiên đã xong và kiểm đạt:**
   - (a) Nút "Tự động hoàn thành" cả màn tại mọi trạm (Dễ, Trung bình, Khó) của 4 bài học và ở thẻ bắt đầu / hộp "?" khi đang chơi của cả 8 game (commit `ce4564c`).
   - (b) Bố cục đối chiếu trái–phải: Màn 4 (Bài 2 Làng Dệt) trạm "So sổ trước khi duyệt" chia 2 cột rõ ràng, tận dụng chiều ngang, điện thoại hẹp xếp 1 cột dọc (commit `936f24e`).
   - (c) Phóng to máy tính Màn 8: Máy tính mod trong Màn 8 đạt chuẩn tối thiểu 16 CSS px chữ và 44 CSS px chiều cao ô nhập thực tế sau scale, giữ nguyên công thức và logic game (commit `7684c96`).
2. **Rà Enter giữ/lặp và click ma của `KnowQuizDialog`:**
   - Xử lý chu kỳ phím chuẩn qua `enterDown`, `spaceDown`, `enterReleasedAfterFeedback`, `spaceReleasedAfterFeedback`: khi nộp bài bằng Enter, giữ phím Enter liên tục > 1s (kể cả sau 400ms và 1200ms) hộp vẫn mở, cờ `knowCards` chưa ghi, tuyệt đối không tự cất thẻ. Bắt buộc phải thả phím (`keyup`) rồi nhấn Enter chu kỳ mới thì mới cất thẻ.
   - Xử lý click ma theo chuỗi sự kiện con trỏ (`pointerDownInside`): cử chỉ chạm bắt đầu từ trước khi dialog mount (ví dụ ngón tay ấn nút ✋ trong `WalkControls`) khi nhấc tay trên dialog sẽ bị chặn lập tức do thiếu `pointerdown` bên trong dialog. Thao tác chạm thật bên trong dialog được chấp nhận tức thì mà không cần chờ độ trễ 450ms.
3. **Đối chiếu nguồn Bitcoin:**
   - Đọc đối chiếu trực tiếp BIP 340 (Taproot Schnorr Signatures) và Bitcoin Developer Guide (Wallets: Key Formats & Private Key):
     - Khóa riêng 256-bit trong khoảng $[1, n-1]$ trên `secp256k1` với $n \approx 1,16 \times 10^{77}$.
     - Hai kiểu chữ ký ECDSA và Schnorr song hành.
     - Giả định duyệt hết $10^{18}$ khóa/s trong $3,7 \times 10^{51}$ năm là ví dụ minh họa trực quan cho học sinh THPT, phân biệt rõ ràng với mô hình đồ chơi $5^x \bmod 23$ của bài học.
   - Bổ sung chú thích nguồn chi tiết trong `packages/core/src/content/knowQuiz.ts`.
4. **Tổng hợp bảng kiểm P6b minh bạch:**
   - Đã dựng bảng phân loại rõ ràng trong `docs/screenshots/p6b/BAO-CAO.md`: đối chiếu tệp `ket-qua-p6b.json` (725/726 đạt, 1 lỗi bộ đo do bấm sớm khi Chữ to), `ket-qua-p6b-chu-to-1366.json` (13/13 đạt), `ket-qua-p6b-dev-tu-hoan-thanh.json` (5/5 đạt), và `ket-qua-p6b-regression.json` (14/14 đạt).
5. **Kiểm tra chất lượng và merge main:**
   - Chạy 4 lệnh bắt buộc: `pnpm test --maxWorkers=2` (2267 pass, 5 skipped), `pnpm typecheck` (10 app/pkg pass), `pnpm check:text` (437 files clean), `pnpm build` (toàn bộ apps build thành công).
   - Kiểm tra hồi quy Puppeteer `scripts/p6b-regression-check.mjs` đạt 14/14 tests.
   - Merge vào nhánh `main` theo sự cho phép của chủ dự án.
6. **P7a — hoàn thành bản chơi được Màn 5 "Đập {phanDien}" bằng 2D (30/10/2026):**
   - Xây dựng 4 làn dọc 2D lấy cảm hứng Talking Tom, phong cách dải lụa truyền thống Làng Dệt.
   - Phân biệt 2 loại chuột: Chuột thường (4 biến thể: thường, đổi làn, nhanh, to) và Chuột câu hỏi mang biểu tượng **DẤU HỎI VÀNG LỚN ❓**, hào quang sáng rực, nhãn accessibility nổi bật.
   - Vùng đập [6.5, 9.0] có viền sáng, 4 nút đập chân làn D F J K (chiều cao ≥ 48px), bàn Sổ Chung ở đáy với 8 chấm tròn vết mực. Chuột lọt +1 mực, chuột câu hỏi đúng xoá 2 mực.
   - Cơ chế tạm dừng: dừng mọi chuyển động và đồng hồ khi mở câu hỏi hoặc mở hộp "?". Chống click ma (`pointerDownInside`, `stopPropagation`), đập chuột không bị kích hoạt đúp khi chạm giữ.
   - Giữ nguyên nút Tự hoàn thành (ẩn với khách release, hiện và hoạt động trên bản dev/teacher, dừng ván và không cộng điểm/sao/xu/sổ vàng).
   - 4 lệnh kiểm tra bắt buộc đều đạt: `check:text` sạch 437 files, `typecheck` 10 packages pass, `pnpm test --maxWorkers=2` 2275 tests pass (bổ sung test mới `whack2d.test.ts` đạt 8/8 tests), `pnpm build` đạt (chunk Màn 5 giảm từ 91 kB Three.js xuống **20.75 kB**).
   - Kiểm tra Puppeteer trên 1366×768, 360×800, 844×390 đạt đầy đủ, 27 ảnh chụp minh chứng lưu tại `docs/screenshots/p7a/BAO-CAO-P7A.md`.

7. **P7b — hoàn thiện và kiểm lối chơi Đập Chuột 2D Màn 5 (30/10/2026):**
   - Thống nhất quy tắc điều khiển giữa mọi phương thức thao tác (chạm chuột trên làn, nút chân làn, phím D/F/J/K hoặc 1/2/3/4): toàn bộ đều tuân thủ chặt chẽ vùng đập $[6.5, 9.0]$. Đập ngoài vùng đập bị trượt gió (`sound.playWhoosh()`), chuột không bị mất, hiển thị nhắc nhở.
   - Chuột thường tính 1 lần; chuột to yêu cầu 2 lần kích hoạt riêng biệt (cooldown 140ms, chặn repeat/giữ phím). Nhiều chuột cùng làn ưu tiên đập con thấp nhất trong vùng đập (`lowestInZone`); chuột đổi làn nhận đòn chính xác tại làn mới (sau khi qua pos 5.0).
   - Chống click ma triệt để bằng `onClickCapture` ở capture phase trên overlay modal câu hỏi: chạm giữ chuột câu hỏi > 600ms nhấc tay không bị chọn nhầm đáp án ở cả 3 kích thước 1366×768, 360×800, 844×390; bàn phím Space/Enter vẫn hoạt động trơn tru.
   - Xử lý Enter giữ/lặp: gắn event listener `keydown`/`keyup` cho Enter trong modal; giữ Enter > 1s không tự "Chơi tiếp", bắt buộc thả phím rồi nhấn lại mới tiếp tục.
   - Đo trực tiếp dừng thời gian và đối tượng đứng yên 100% khi mở "?" hoặc mở câu hỏi ($t_0 = t_1$), tiếp tục ván chạy mượt mà không nhảy cóc thời gian (reset mốc `lastTickTime`).
   - Rà soát luật: Không có kết thúc ván do hết giờ (`EndReason = 'complete' | 'ink'`), chỉ kết thúc khi đầy 8 vết mực hoặc xong 10 trùm; đồng hồ lịch chạy qua 118s ván vẫn tiếp tục nếu chưa đầy mực.
   - Kiểm tra các ca câu hỏi: Trả lời sai (cộng 1 vết mực, không cộng điểm trùm, Tí né chạy xuống sổ); Hết giờ câu hỏi (timeout đếm ngược về 0s, hiện cảnh báo "Hết giờ rồi!", đáp án đúng, cộng 1 vết mực).
   - Kiểm tra chuyển trạng thái kết thúc ván có probe hỗ trợ (probe-assisted): Đặt trạng thái gần kết thúc rồi thao tác qua giao diện thật để chuyển sang màn kết quả thua (đầy 8 mực) và thắng (xong 10 trùm); bấm "Chơi lại" reset sạch ván mới.
   - Kiểm tra tự hoàn thành: Xác minh trong cookie `sc_guest` chỉ ghi nhận cờ `ac = 16`, bản ghi Màn 5 là `[0, 0, 0, 0]`, xu và Trang Sổ Vàng không thay đổi.
   - Cân bằng bot: bot 300 ván seed 1-300 (`whackBalance.test.ts`) đạt 9/9 tests, giữ nguyên mốc điểm 1650 / 2650 / 3100 (ghi rõ giới hạn: bot chạy logic thuần `tapGap = 0.15s`, chưa đo lường độ khó thao tác cơ học của cooldown 140ms trên component UI).
   - 4 lệnh kiểm tra bắt buộc đạt sạch: `check:text` sạch 437 files, `typecheck` 10 packages pass, `pnpm test --maxWorkers=2` 2282 tests pass (`whack2d.test.ts` 15/15 pass), `pnpm build` đạt (toàn bộ 5 apps build thành công; chunk `Man5` 22.17 kB). Bỏ khẳng định võ đoán 60 FPS / rò bộ nhớ khi chưa đo chuyên sâu.
   - Kiểm tra Puppeteer `scripts/p7b-check.mjs` và `scripts/p7b-extra-check.mjs`: 31 ảnh minh chứng lưu tại `docs/screenshots/p7b/BAO-CAO-P7B.md`.

8. **P7c — làm lại đồ họa 2D Màn 5 bằng bộ 15 ảnh hoạt hình (30/10/2026):**
   - Tích hợp bộ 15 ảnh hoạt hình chuẩn trong `assets/man5-2d/` bám sát ảnh mẫu tham khảo `assets/references/man5-whack-reference.png` qua quy trình assets build (`scripts/assets-build.mjs`). Nén thành công 15 ảnh sang WebP trong `assets-build/man5-2d/` (tổng 596.7 kB, giảm hơn 25 lần so với 15.2 MB ảnh PNG gốc).
   - Tái cấu trúc khung game: sử dụng `fixed inset-0 z-20` bao trùm toàn màn hình trình duyệt, xóa bỏ hoàn toàn hiện tượng game bị co ở nửa trên trang và khoảng nền kem trống lớn phía dưới.
   - Sân chơi lớn, cân đối, tận dụng tối đa chiều cao PC: tỉ lệ chiếm chiều cao sân chơi đạt **> 91%** trên mọi độ phân giải PC (91.1% ở 1366×768, 92.1% ở 1536×864, 93.7% ở 1920×1080), không phát sinh thanh cuộn thừa (`docScrollHeight === windowHeight`).
   - Dựng cấu trúc từng lớp độc lập: Nền phô mai vàng `background-pc`, hai cột gỗ sồi đinh tán `wood-border` (cột phải lật gương `scale-x-[-1]`), 4 làn hoa văn sao (`lane-blue`, `lane-yellow`, `lane-red`, `lane-green`), Hero cầm búa (`hero-idle` / `hero-hit` chung điểm neo căn đáy, vung búa 180ms), cuốn Sổ Chung `book` với 8 chấm mực dàn đều trên 2 trang sách mở (`px-10` đến `px-24`), 4 nút đập chân làn D F J K màu ăn khớp làn (cao 46–56px).
   - 5 Sprite Chuột hoạt hình 2D sinh động: Chuột thường, chuột nhanh (⚡), chuột đổi làn (⇄), chuột to (2 vạch máu), chuột câu hỏi (biểu tượng ❓ vàng lớn nhấp nháy).
   - Bảo toàn toàn vẹn cơ chế P7b: Vùng đập [6.5, 9.0], cooldown 140ms, tạm dừng 100% thời gian khi mở câu hỏi/?, chống click ma ở capture phase, chống Enter lặp, tự hoàn thành không trao thưởng gian lận.
   - 4 lệnh kiểm tra bắt buộc đạt sạch: `check:text` sạch 437 files, `typecheck` 10 packages pass, `pnpm test --maxWorkers=2` 2282 tests pass, `pnpm build` đạt (toàn bộ 5 apps build thành công; chunk `Man5` 26.49 kB).
   - Đo lường và kiểm tra Puppeteer `scripts/p7c-check.mjs` và `scripts/p7c-user-preview.mjs`: Lưu ảnh chụp màn hình minh chứng tại `docs/screenshots/p7c/BAO-CAO-P7C.md` và `docs/screenshots/p7c/man5-preview-*.png`.
   - Đã xử lý hoàn thiện chế độ Giảm chuyển động (`reducedMotion`: tắt bounce ❓, pulse ⚡ và vùng đập), xác minh container fixed không che các lớp phủ modal/result, và bản chạy riêng Làng Dệt (5175) tải ảnh WebP đầy đủ.
   - **Nghiệm thu:** Chủ dự án đã xem và duyệt đồ họa Màn 5 (30/10/2026). Sẵn sàng bắt đầu P8a.
9. **P8a — cơ chế hướng dẫn focus và làm thử dùng chung, tích hợp mẫu Màn 1 trạm Dễ (30/10/2026):**
   - Xây dựng cơ chế dùng chung `TutorialSpotlight` (`packages/core/src/ui/TutorialSpotlight.tsx`): 4 khối che backdrop chuẩn xác bao quanh vùng target, viền sáng highlight, định vị tooltip thông minh (tự động đảo vị trí `top`/`bottom` không che mục tiêu và không tràn màn hình), focus trap bàn phím Tab, bám sát target khi cuộn và đổi kích thước.
   - Xử lý chu kỳ phím Enter chống kích hoạt đúp: nộp bài bằng Enter tại ô nhập không tự ý kích hoạt chuyển tiếp hoặc bắt đầu bài thật; bắt buộc thả phím `keyup` rồi nhấn Enter chu kỳ mới mới tiếp tục.
   - Tích hợp mẫu tại Màn 1 trạm Dễ (`packages/village-lang-giay/src/bai-1/Easy.tsx`) qua 6 bước: Giới thiệu mục tiêu ngắn -> Focus vùng số 12 và 5 -> Focus công thức gợi ý -> Focus ô nhập và cho học sinh tự gõ -> Focus nút Kiểm tra -> Phản hồi kết quả (đúng: xác nhận mã 29 và hiện nút "Bắt đầu chơi thật"; sai: báo lỗi, giải thích công thức và hiện nút "Thử lại").
   - Tách biệt hoàn toàn làm thử khỏi tiến độ thật: dữ liệu mẫu cố định 12 & 5, không gọi `record()`, không tính giờ/xu/sao/tiến độ/Trang Sổ Vàng. Bắt đầu bài thật bấm giờ sạch từ đầu.
   - Nút "💡 Hướng dẫn" trên giao diện cho phép xem lại giữa bài; khi đóng quay lại đúng trạng thái bài đang làm dở.
   - Toàn bộ nội dung hiển thị nằm trong `packages/core/src/content/tutorial.ts`, xưng "em", định dạng biến qua `fmt()`.
   - 4 lệnh kiểm tra bắt buộc đạt sạch: `check:text` sạch 438 files, `typecheck` 10 packages pass, `pnpm test --maxWorkers=2` 2294 tests pass (thêm test mới `TutorialSpotlight.test.tsx` và `man1EasyTutorial.test.tsx`), `pnpm build` đạt (toàn bộ 5 apps build thành công).
   - Đo lường và kiểm tra Puppeteer `scripts/p8a-check.mjs`: Đạt cả 3 kích thước 1366×768, 360×800, 844×390 (21 ảnh chụp minh chứng lưu tại `docs/screenshots/p8a/` và `BAO-CAO-P8A.md`). Xác minh tiến độ không đổi (`progressUnchangedAfterPractice = true`), Enter không kích hoạt đúp (`enterHoldSafe = true`), bài thật hoàn thành bình thường sau hướng dẫn (`realStationDoneNormally = true`).

## 6. Việc để sau (không làm trước khi chủ dự án giao)

- **P8b:** nhân rộng hướng dẫn focus & làm thử cho các trạm và màn còn lại sau khi chủ dự án đánh giá và duyệt mẫu Màn 1 trạm Dễ.
- **Việc dời từ mốc 3 và hội làng làm CUỐI mốc 4**, theo thứ tự ở mục "Việc dời từ mốc 3" của `TRANG-THAI.md`: deploy bản gộp (15b), kiểm tra toàn bộ (G2), thử với 5–10 học sinh, hội làng (`FESTIVAL_LAUNCHED` hiện `false`).
- Chưa làm theo lời giao trước đó: sửa nút "?" ở màn 3, HUD che tên biển trong một số góc nhìn (ví dụ dòng nhiệm vụ che biển trái ở Làng Bạc), vòng tích che số cây đa đã được thu nhỏ ở P5.

## 7. Supabase, triển khai và giới hạn thiết bị thật

- **Supabase thật CHƯA nghiệm thu.** Các kiểm quyền và RLS đã làm trên Postgres biệt lập (`scripts/db-test-p3b.sh`) và máy chủ giả (`scripts/p3b-api-check.mjs`), không phải dự án Supabase thật.
- **Migration production chưa áp dụng:** `supabase/migrations/0003_auto_complete.sql` (cờ tự hoàn thành, chỉ teacher/admin được đặt) **chưa chạy trên Supabase thật** và cần chủ dự án chạy TRƯỚC khi triển khai; `pnpm rls:check` có ca mới chưa chạy được. Máy chủ chưa có cột thì nút tự hoàn thành vô hiệu kèm thông báo (đã kiểm với máy chủ giả). Không áp migration production nếu chưa được phép.
- **Lỗ hổng có từ trước, chưa sửa:** học sinh tự sửa được `completed`/`played`/`stars`/`best_score`/`coins`/`golden_pages` của mình qua API (xem mục P3b của `TRANG-THAI.md`); cần xử lý trước khi dùng thật.
- **Triển khai:** mốc 2 và toàn bộ mốc 3 (và mọi việc sau) chưa deploy; bước 15b (khôi phục `cloudflared`, Docker, deploy theo `docs/DEPLOY.md`, Cache Rule) vẫn chưa làm; server có thể đang lỗi 530. KHÔNG deploy khi chưa được phép.
- **Thiết bị thật:** mọi lượt kiểm tới nay là Chrome headless với GL phần mềm và chạm giả lập; điện thoại/máy tính bảng thật, Safari/iPhone, khóa chuột thật, trình đọc màn hình chưa kiểm. Không dùng FPS của GL phần mềm để kết luận hiệu năng trên điện thoại thật.

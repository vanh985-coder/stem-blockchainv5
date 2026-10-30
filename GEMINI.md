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

## 3. Git hiện tại (lúc bàn giao)

- **Nhánh làm việc:** `claude/wonderful-dijkstra-x092dj` (đã push, cùng `origin/claude/wonderful-dijkstra-x092dj`).
- **Commit gần nhất của việc trước khi thêm tài liệu này:** `e86123b` "core: P6b tích hợp ví dụ và câu hỏi cho 16 thẻ Em có biết …". Commit chứa `GEMINI.md` nằm ngay sau đó trên cùng nhánh (xem `git log`).
- **`origin/main`:** `73268de` (commit "a" của chủ dự án, nằm sau merge của PR #2 `c0b921b`). Nhánh làm việc **hơn `main` đúng 3 commit** (`79a372a` P6a bản nháp, `49168dc` P6a bản rà, `e86123b` P6b), **không tụt sau `main`**.
- **CHƯA merge vào `main`.** PR #1 và PR #2 (P4, P5, Excel lời thoại) đã merge trước đó; ba commit trên chưa có PR. Chưa deploy gì.
- **Working tree:** sạch (không có thay đổi chưa commit của người dùng) tại thời điểm đọc, trước khi thêm tài liệu này.
- Công cụ GitHub của phiên Claude là các công cụ MCP (không có `gh`); các lần merge trước làm bằng tạo PR rồi gộp bằng công cụ đó.

## 4. P6b — đã triển khai gì (chi tiết: `docs/screenshots/p6b/BAO-CAO.md`, mục "P6b" của `TRANG-THAI.md`, spec 03 mục 3.9 "Thẻ có ví dụ và câu hỏi")

**Đã triển khai:** khi nhặt cuộn "Em có biết?" trong làng, hộp `packages/core/src/ui/KnowQuizDialog.tsx` (một hộp cuộn được) đi theo luồng: nội dung thẻ → ví dụ → trả lời một lần → đáp án đúng và giải thích (hiện cả khi trả lời sai) → "Cất vào sổ". 16 thẻ nhặt được (4 mỗi làng): 13 câu ABCD (giữ thứ tự A–D) và 3 câu điền số (44, 19, 288; ô văn bản `inputMode="numeric"`, chuẩn hóa ở `lib/knowQuiz.ts`). Chữ ở `content/knowQuiz.ts`; 16 thẻ gốc đã sửa cùng ví dụ trong `content/lessons/bai-1.ts` … `bai-4.ts` theo `P6-NOI-DUNG-THE-TUONG-TAC.md`. Thẻ thứ 5 của Làng Khắc Dấu chỉ đọc, không có cuộn, không có câu hỏi. Chỉ ghi `knowCards` khi bấm "Cất vào sổ"; đóng trước đó thì chưa nhặt; không lưu đáp án; không điểm, xu, sao, tim. Thẻ đã nhặt xem lại ở menu "Em có biết?" (chế độ `review`).

**Kiểm đã đạt (xem báo cáo để biết số liệu):**
- `pnpm test --maxWorkers=2` 2266 đạt, 5 bỏ qua; `pnpm typecheck`, `pnpm check:text`, `pnpm build` đạt (trên mã commit `e86123b`).
- Test logic mới: `lib/knowQuiz.test.ts`, `content/knowQuiz.test.ts`, `apps/hub/src/knowQuizDialog.test.tsx`.
- Kiểm DOM bản build (`scripts/p6b-check.mjs`) bằng **khách thật** (cookie `sc_guest`): trả lời và cất đủ 16 thẻ ở 1366×768 (chuột + bàn phím), 360×800 và 844×390 (chạm giả lập), có đúng và sai; đóng trước khi cất; xem lại; tải lại; `/ban-do`; tiến độ cũ; Chữ to và Giảm chuyển động ở màn thấp; tự hoàn thành trên bản dev.
- Bundle hub JS +28.204 byte (+1,0%, bản build có `VITE_PROBE`). Không chạy lại bộ đo 3D vì không đổi hình học hay vật liệu.

**Giới hạn chưa xác minh:** Supabase thật và đường tài khoản đăng nhập (chỉ khách thật); điện thoại/máy tính bảng thật (bàn phím số ảo, Safari/iPhone, trình đọc màn hình); khóa chuột thật (máy đo dùng khóa chuột giả nên dòng nhắc "E:" ở máy tính ẩn); quyền giáo viên bằng trình duyệt. Máy đo chạy GL phần mềm (2–6 khung/giây), nên số FPS không dùng để kết luận 30 fps trên điện thoại thật.

**Điều chỉnh đã làm trong P6b cần giữ (quyết định của chủ dự án): `/ban-do` chỉ là phần ĐỌC.** Giới thiệu làng và nút "Đọc thẻ Em có biết" ở `/ban-do` không có câu hỏi và **không tự ghi nhận nhặt thẻ** (trước P6b, đọc đủ thì ghi đủ bit `knowCards` qua `markAllKnowCards`; đã bỏ). Bảng làng ở `/ban-do` vẫn chặn bài học tới khi nhặt đủ thẻ ở làng 3D và nói rõ điều đó; số thẻ cần nhặt dùng `knowCollectibleTotal` (= 4 mỗi làng, không phải số thẻ của bài: Làng Khắc Dấu có 5 thẻ nhưng chỉ 4 cuộn). **Không hoàn nguyên quyết định này** khi chưa hỏi chủ dự án.

## 5. Việc Gemini tiếp tục, theo thứ tự

1. **Xác minh và hoàn thiện ba sửa ưu tiên** do chủ dự án nêu: (a) nút "Tự động hoàn thành" ở mọi độ khó/vòng; (b) bố cục đối chiếu trái–phải; (c) phóng to máy tính ở màn 8. **Mô tả chi tiết ba việc này không có trong `TRANG-THAI.md`** (người bàn giao không có thêm tư liệu): hãy hỏi chủ dự án để lấy yêu cầu chính xác, rồi đối chiếu với mã hiện có, KHÔNG đoán. Chỗ mã liên quan để bắt đầu: nút tự hoàn thành (P3b: `ui/AutoComplete.tsx`, `progress/record.ts` `autoCompleteLevel`/`autoLevels`, các trang trạm của 4 bài và thẻ bắt đầu/hộp "?" của game; mục P3b của `TRANG-THAI.md`); bố cục so sánh hai bên có thể ở trạm "So sổ trước khi duyệt" của Bài 2 (màn 4, `packages/village-lang-det/src/bai-2/`) và các trạm đối chiếu khác; máy tính mod màn 8 ở `packages/village-lang-khac-dau/src/` (mục P1 (12) của `TRANG-THAI.md`). Xác minh bằng bản build trước khi sửa, báo rõ cái nào đã đạt, cái nào chưa.
2. **Rà Enter giữ/lặp và click ma của `KnowQuizDialog`.** Hiện dùng hai khoảng chặn theo thời gian (450 ms đầu bỏ qua mọi cú bấm; 400 ms đầu sau khi nộp thì nút "Cất vào sổ" bỏ qua cú bấm; so theo `event.timeStamp`). Đây chỉ là biện pháp thực dụng, **không coi là bằng chứng đã xử lý đầy đủ**: cần rà các trường hợp giữ phím Enter (`event.repeat`, keydown/keyup), nhấn Enter khi tiêu điểm vừa chuyển sang nút khác, chạm trên thiết bị thật (cú click ma sau `pointerdown` của nút bàn tay trong `WalkControls`), bàn phím ảo, và đề xuất cách chắc hơn (ví dụ gắn theo chuỗi sự kiện con trỏ thay vì thời gian). Kiểm bằng thiết bị thật nếu có.
3. **Đọc đối chiếu nguồn Bitcoin** do chủ dự án cung cấp: https://developer.bitcoin.org/devguide/wallets.html và https://bips.dev/340/. Người code trước **chưa đọc lại nội dung hai trang** (chỉ ghi nguồn vào `content/knowQuiz.ts` và tài liệu P6). Hãy kiểm từng khẳng định trong thẻ Làng Khắc Dấu số 3: "gần 2^256 khả năng, xấp xỉ 1,16 × 10^77" (lưu ý số khóa riêng hợp lệ hơi nhỏ hơn 2^256), "ECDSA và Schnorr", 3,7 × 10^51 năm là thời gian giả định để duyệt hết ở tốc độ giả định 10^18 khóa mỗi giây; sửa chữ nếu nguồn không khớp.
4. **Tổng hợp lượt kiểm lỗi và lượt chạy lại của P6b cho rõ.** Báo cáo hiện gộp nhiều lượt: lượt đầu phát hiện lỗi thật (click ma khi chạm, chặn Enter lặp theo hẹn giờ, tổng thẻ `/ban-do` của Làng Khắc Dấu) và nhiều lỗi của bộ đo (Bi đứng gần cuộn nên phím E mở lời Bi, bấm quá sớm trước khi hộp hết chặn, chữ in hoa của `innerText`, số lần bấm hộp giới thiệu). `docs/screenshots/p6b/ket-qua-p6b.json` còn đúng 1 mục lỗi ở 1366×768 (bộ đo bấm quá sớm trong phần Chữ to); phần đó chạy lại riêng, đạt 13/13 ở `ket-qua-p6b-chu-to-1366.json`; bản dev ở `ket-qua-p6b-dev-tu-hoan-thanh.json` (5 đạt). Hãy dựng một bảng rõ: lượt nào, lỗi gì (lỗi mã hay lỗi bộ đo), sửa gì, lượt chạy lại nào đạt, thay vì ghép nhiều tệp.
5. **Chạy kiểm phù hợp trên mã cuối, rồi hoàn tất merge `main`** theo ủy quyền của chủ dự án: sau các bước 1–4, chạy `pnpm test --maxWorkers=2`, `pnpm typecheck`, `pnpm check:text`, `pnpm build` và lượt kiểm DOM liên quan trên bản build mã cuối; cập nhật `TRANG-THAI.md`; chỉ merge vào `main` khi chủ dự án xác nhận bằng lời (như hai lần trước, qua pull request). **Không ghi "đã merge" nếu chưa merge.**

## 6. Việc để sau (không làm trước khi chủ dự án giao)

- **P7:** làm lại màn 5 (Làng Dệt) thành game đập chuột 2D kiểu Whack-a-Mole; cần ảnh mẫu của chủ dự án. Chi tiết ở bảng ưu tiên của `TRANG-THAI.md`.
- **P8:** hướng dẫn focus và làm thử cho **cả 12 màn** (đã duyệt, chưa triển khai, làm thành bước riêng sau khi chốt lối chơi màn 2, 3, 5). Mục P8 của `TRANG-THAI.md` phải được giữ nguyên.
- **Việc dời từ mốc 3 và hội làng làm CUỐI mốc 4**, theo thứ tự ở mục "Việc dời từ mốc 3" của `TRANG-THAI.md`: deploy bản gộp (15b), kiểm tra toàn bộ (G2), thử với 5–10 học sinh, hội làng (`FESTIVAL_LAUNCHED` hiện `false`).
- Chưa làm theo lời giao trước đó: sửa nút "?" ở màn 3, HUD che tên biển trong một số góc nhìn (ví dụ dòng nhiệm vụ che biển trái ở Làng Bạc), vòng tích che số cây đa đã được thu nhỏ ở P5.

## 7. Supabase, triển khai và giới hạn thiết bị thật

- **Supabase thật CHƯA nghiệm thu.** Các kiểm quyền và RLS đã làm trên Postgres biệt lập (`scripts/db-test-p3b.sh`) và máy chủ giả (`scripts/p3b-api-check.mjs`), không phải dự án Supabase thật.
- **Migration production chưa áp dụng:** `supabase/migrations/0003_auto_complete.sql` (cờ tự hoàn thành, chỉ teacher/admin được đặt) **chưa chạy trên Supabase thật** và cần chủ dự án chạy TRƯỚC khi triển khai; `pnpm rls:check` có ca mới chưa chạy được. Máy chủ chưa có cột thì nút tự hoàn thành vô hiệu kèm thông báo (đã kiểm với máy chủ giả). Không áp migration production nếu chưa được phép.
- **Lỗ hổng có từ trước, chưa sửa:** học sinh tự sửa được `completed`/`played`/`stars`/`best_score`/`coins`/`golden_pages` của mình qua API (xem mục P3b của `TRANG-THAI.md`); cần xử lý trước khi dùng thật.
- **Triển khai:** mốc 2 và toàn bộ mốc 3 (và mọi việc sau) chưa deploy; bước 15b (khôi phục `cloudflared`, Docker, deploy theo `docs/DEPLOY.md`, Cache Rule) vẫn chưa làm; server có thể đang lỗi 530. KHÔNG deploy khi chưa được phép.
- **Thiết bị thật:** mọi lượt kiểm tới nay là Chrome headless với GL phần mềm và chạm giả lập; điện thoại/máy tính bảng thật, Safari/iPhone, khóa chuột thật, trình đọc màn hình chưa kiểm. Không dùng FPS của GL phần mềm để kết luận hiệu năng trên điện thoại thật.

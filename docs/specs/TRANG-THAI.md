# TRẠNG THÁI DỰ ÁN — Giấc mơ Sổ Chung

Cuối mỗi cửa sổ chat, người code cập nhật file này theo kết quả đã xác minh. Bạn thay bản cũ trong project claude.ai và trong repo (`docs/specs/TRANG-THAI.md`).

## Thông tin chung

| Mục | Giá trị |
|---|---|
| Web thật | https://stem-block.blockchainptit.com (hub) |
| Subdomain | `sb-lang-giay`, `sb-lang-det`, `sb-lang-khac-dau`, `sb-lang-bac` (trang bài học và game) · đồ họa `sb-assets` |
| Hosting | Windows Server, Docker Desktop (WSL2) + Caddy, cổng 18081–18086; Cloudflare Tunnel (dịch vụ Windows). `docs/DEPLOY.md` mục (h) deploy, (i) luật cache |
| Supabase | Project `zlqxwbgcyudybxaynluf` (Singapore), migrations 0001, 0002; Edge Function `teacher-reset-password` |
| Tài khoản thử | Giáo viên `gva`, `gvb`; học sinh `thu01`, `thu02` |
| Người code | **Claude Code**, đọc **`CLAUDE.md`** (từ lượt sửa `FeedbackSheet` sau P2a). **Tự commit và tự push nhánh đang làm lên `origin`** khi `pnpm test`, `pnpm typecheck`, `pnpm check:text`, `pnpm build` đạt, không cần hỏi lại (từ P2b; thay cho "không push" trước đây). Không force-push, không tự merge vào `main`. P1a, P1b, P2a do Codex (đọc `AGENTS.md`) viết ban đầu, P2a hoàn thiện bởi Claude Code |
| Ảnh chụp kiểm tra | Lưu vào `docs/screenshots/<bước>/` (< 300 KB mỗi ảnh); P1a: `docs/screenshots/p1a/` |

## Tiến độ

| Mốc | Trạng thái |
|---|---|
| 0–2 | ✅ Xong (mốc 2 chưa deploy) |
| 3. Nhân rộng | ✅ **Chốt.** Đủ 12 màn, cả 4 làng dựng to, **đã gộp web** (≈2086 test xanh). Việc còn dở dời xuống **cuối mốc 4** |
| 4. Trau chuốt | **P1a, P1b, P2a, P2b, P3a, P3b đã xong và kiểm đạt (P3b chưa có Supabase thật)** (chi tiết dưới). Sau các việc ưu tiên mới tới "Việc để sau"; **cuối mốc** là các việc dời từ mốc 3 và hội làng |

**⚠️ 15b vẫn chưa làm:** server có thể đang 530, mốc 2 và toàn bộ mốc 3 (≈60 commit, mới nhất `2bd76bf`) chưa push, chưa chạy trên máy thật. Cách làm: khôi phục `cloudflared` + Docker, deploy theo `DEPLOY.md` (h), Cache Rule (i), thử trên điện thoại.

## Ưu tiên mốc 4 (theo thứ tự; "mặc định" là cách hiểu đã chốt nếu chủ dự án không sửa)

| Bước | Việc (số trong danh sách của chủ dự án) | Buổi |
|---|---|---|
| P1 | Sửa nhanh giao diện: (8a) đồng hồ màn 3 to rõ; (9) cột tre màn 6 (Làng Dệt) nét hơn; (12) máy tính mod màn 8 hiện sẵn trên màn hình; (13) cây ở trạm Khó bài 10 vừa khung, không phải cuộn; (10) máy tính ở trạm Dễ/Trung bình **màn 4 – Làng Dệt (Bài 2)** đổi sang kiểu ModCalculator màn 8–9, tính `(X × 2 + c) mod 100`; **không phải Bài 4/màn 10 – Làng Bạc** | 1 |
| P2 | (5) Pháo hoa + lời khen khi trả lời đúng ở 4 trang bài học (màn 1, 4, 7, 10); "Giảm chuyển động" thì chỉ hiện lời khen. (4) Vị trí thẻ "Em có biết?" chưa nhặt hiện trên bản đồ lớn, bản đồ nhỏ và `/ban-do`, cả khi đang ở ngoài làng | 1 |
| P3 | (6) Mở khóa tự do: mọi cổng làng mở từ đầu. Mặc định: trong mỗi làng vẫn giữ thứ tự thẻ → bài học → 2 game; Trang Sổ Vàng vẫn trao như cũ; cao trào vẫn sau màn 12. (2) Nút "Tự động hoàn thành": mặc định CHỈ hiện cho tài khoản giáo viên và bản dev, ghi màn là đã xong với cờ "tự hoàn thành", không cộng sao/xu, trang giáo viên thấy rõ cờ này | 2 |
| P4 | (7) Màn 2 nhanh hơn: mặc định +20% tốc độ mọi vòng, chạy lại bot, chỉnh mốc nếu cần. (8b) Màn 3 bỏ vòng 3, còn 2 vòng: vòng "giữ sổ" (Tí tráo trang) đang ở vòng 3 → mặc định chuyển cơ chế tráo trang vào cuối vòng 2 để không mất bài học phát hiện sửa lén; đặt lại mốc | 1 |
| P5 | (1) Biển chọn màn trong làng làm thành cột sáng giống cuộn "Em có biết?" (mỗi màn một cột, màu theo trạng thái, giữ chữ tên màn) | 1 |
| P6 | (3) Sau khi đọc thẻ "Em có biết?": 1 ví dụ ngắn + 1 câu hỏi ABCD (hoặc điền số). Mặc định: trả lời sai vẫn nhận thẻ, hiện giải thích. Claude soạn 16 câu (4 làng × 4 thẻ), chủ dự án duyệt trước khi code | 1–2 |
| P7 | (11) Làm lại màn 5 thành game đập chuột 2D kiểu Whack-a-Mole (My Talking Tom): lưới hang, chuột thường và chuột câu hỏi (đập trúng thì hiện câu hỏi). Cần ảnh mẫu của chủ dự án. Logic + bot + cảnh + hướng dẫn mới | 3–4 |
| P8 | **Hướng dẫn focus và làm thử cho cả 12 màn** (yêu cầu đã được chủ dự án duyệt, CHƯA triển khai, xem mục ngay dưới). Làm thành bước riêng SAU KHI chốt thay đổi lối chơi màn 2, 3, 5 (P4, P7) | 2–3 |

Tổng khoảng 10–12 buổi. Sau đó mới tới các việc dời từ mốc 3 và hội làng.

### P8 — Hướng dẫn focus và làm thử cho cả 12 màn (đã duyệt, chưa triển khai)

- Làm tối phần còn lại của màn hình, làm nổi vùng cần chú ý, hiện lời nhắc ngắn.
- Cho học sinh thực hành một tình huống ngắn theo từng bước.
- Lần đầu vào màn tự hiện; có nút "Bỏ qua"; mở lại được qua "Hướng dẫn chơi".
- Lượt thử dùng dữ liệu riêng: không mất tim, không chạy giờ của lượt chính, không cộng điểm, không ghi hoàn thành.
- Hỗ trợ chuột/bàn phím và cảm ứng; "Giảm chuyển động" thì đứng yên.
- Mọi chữ nằm trong `packages/core/src/content/`.
- Làm thành bước riêng sau khi chốt thay đổi lối chơi màn 2, 3, 5 (P4, P7). **Không triển khai trong P3b.**

## P1a — đã xác minh (28/10/2026)

**Người code: Codex, đã đọc `AGENTS.md`.** Chỉ sửa bốn điểm giao diện:
- Màn 3: đồng hồ cao 44 px, chữ 35,50 px ở 1366×768 / 24 px ở 844×390; thanh trên không đè thẻ, chú thích vòng giữ sổ dời xuống dưới chuỗi.
- Màn 6: ảnh nguồn thân tre chỉ khoảng 20 px, nghiêng và mềm nét; thay thân bằng canvas nét hơn (256×1164), giữ tỉ lệ thân/tấm, kích thước cột, UV và toàn bộ va chạm. Vẫn tải qua manifest, có hình thay thế khi thiếu ảnh.
- Màn 8: máy tính hiện sẵn, không tự focus/bật bàn phím; không che lưới 4×4 cả khi nhập sai. Focus nhập thì dừng đồng hồ tráo, rời focus thì chạy lại; úp thẻ sai và nút gợi ý/tạm dừng đã kiểm. Phép tính dùng lại `publicKey`, màn 9 vẫn có nút mở/đóng như cũ.
- Màn 10, trạm Khó: đủ 15 ô cây trong khung, không cuộn ngang; màn hẹp xếp lá xen kẽ hai hàng, vùng đặt tối thiểu 44×44 px. Nút Kiểm tra không còn dính đáy che lá. Không đổi số, thứ tự hay quan hệ cây.

**Giữ nguyên luật, vòng, công thức, điểm, tiến độ; chưa thay máy tính màn 4 hay máy tính trạm Dễ/Trung bình bài 4.**

**Kiểm tra:** `pnpm test --maxWorkers=2`: **2094 pass, 1 skipped** (190 file pass, 1 skipped); `pnpm typecheck`, `pnpm check:text` (423 file), `pnpm build` (5 app) đều đạt. Các lượt `pnpm test` mặc định từng timeout ở mô phỏng nặng cũ (`man11Anim`, `kiteLogic`); không tăng timeout hay sửa luật để né lỗi.

**Bản build:** kiểm 1366×768 bằng chuột, 360×800 và 844×390 bằng chạm giả lập. Màn 3/6 ở khung dọc vẫn nhắc xoay ngang và dừng theo spec. Màn 8/10 chơi dọc được; đặt/lật thẻ bằng thao tác thật, không có `pageerror`. **12 ảnh** ở `docs/screenshots/p1a/`, ảnh lớn nhất **179.792 byte** (<300.000). Báo cáo, script kiểm lại và số đo: `docs/screenshots/p1a/README.md`, `measurements.json`, `bundle.json`, `scripts/p1a-check.mjs`.

**FPS màn 6:** Chrome 156.0.8078.49, Windows/Intel UHD, Thấp, mẫu ngắn lúc chơi 433 khung: 1366×768 **144,160 FPS / 3003,6 ms**, khung lâu nhất 7,3 ms; 844×390 giả lập chạm **144,156 FPS / 3003,7 ms**, khung lâu nhất 7,1 ms. Không phải đo cả ván hay điện thoại thật.

**Bundle hub production:** JS chính **237,40 kB**, gzip **74,58 kB**; lõi 3D tải lười **1016,12 kB**, gzip **271,87 kB** (gzip `node:zlib`, kB = 1000 byte; đây là từng chunk, không phải tổng tải trang). Build vẫn cảnh báo chunk 3D >500 kB.

**Chưa xác minh:** thiết bị thật, Safari/iPhone, bàn phím ảo, đa chạm và ngưỡng 30 FPS trên điện thoại tầm trung. Chưa deploy/push. Phần máy tính còn lại của P1 để bước sau, không làm trong P1a.

## P1b — đã xác minh (28/10/2026)

- Chỉ thêm máy tính mã trang cho Dễ/Trung bình màn 4 – Làng Dệt. `PageCodeCalculator` trong core dùng kiểu bảng giấy/viền gỗ, ô nhập và kết quả trực tiếp như ModCalculator; gọi `pageCode`, không sao chép công thức lũy thừa. X/c khởi đầu trống, học sinh tự nhập; không nhận dữ liệu đề hay tự chọn đáp án.
- Giữ nguyên đề, luật, tim, sao, tiến độ và trạm Khó; không sửa component máy tính màn 8–9. Kết quả P1a phía trên giữ nguyên như bản ghi lịch sử.
- `pnpm test --maxWorkers=2`: **2105 pass, 1 skipped**, 191 file pass/1 skipped. `pnpm typecheck`, `pnpm check:text` (425 file), `pnpm build` (5 app) đạt. Test trình bày máy tính màn 8–9 vẫn đạt trong bộ test; không kiểm lại trình duyệt màn 8–9 vì không sửa component đó.
- Chrome headless local dev (`VITE_MERGED=true`, `VITE_PROBE=true`), 1366×768 chuột, 360×800 và 844×390 chạm giả lập; cả hai trạm: ô trống không hiện kết quả, nhập 57/36 ra 50, Tab chuyển ô, nhập sai có lời nhắc, bấm Đồng ý mở phản hồi; không có `pageerror`. Máy tính nằm trong luồng nội dung, không phủ đề/nút, màn nhỏ cuộn dọc như cũ. 6 ảnh toàn trang ở `docs/screenshots/p1b/`, lớn nhất **141347 byte** (<300 KB). Script: `scripts/p1b-check.mjs`.
- Không sửa 3D, không đo FPS mới. Bundle hub: chunk máy tính **1,84 kB / gzip 0,98 kB**, JS chính **237,40 kB / gzip 75,36 kB** (số Vite build); cảnh báo chunk 3D >500 kB vẫn còn.
- Chưa xác minh: thiết bị thật, bàn phím ảo, Safari/iPhone, giao diện trên bản production (build đạt nhưng tương tác chạy dev), toàn bộ 5 vòng bằng thao tác thật (script dùng cầu nối dev để chuyển sang Trung bình). Chưa push/deploy.

## P2a — đã xác minh (28/10/2026)

- Lời khen và pháo hoa CSS dùng chung cho màn 1/4/7/10 (`LessonPraise`, `praiseSession`, chữ ở `content/lessonPraise.ts`). Dải khen cao 36 px nằm **ngoài vùng cuộn**, trên `.lesson-window`: luôn thấy khi cuộn sâu hoặc mở hộp phản hồi, không tự cuộn, không focus, không bắt chuột/chạm, không đổi bố cục. Giảm chuyển động (cài đặt hoặc hệ điều hành) chỉ còn chữ.
- Không đổi công thức, luật, điểm, tiến độ, âm thanh, phản ứng nhân vật. Thêm `emitSubmission`, `voteWasRight`, `announceOnce` (có test).
- **Kiểm thao tác thật** trên bản production (`scripts/p2a-real-check.mjs`): chuột/chạm/phím/kéo thả thật, 12 trạm, 3 cỡ (1366×768, 360×800, 844×390): 129 nhóm, 516 thao tác (111 khen đúng 1 đợt, 405 không khen), vòng đời (tắt âm, giảm chuyển động cài đặt và hệ điều hành, đổi media giữa chừng, đổi trạm, rời bài) 90/90, `FeedbackSheet` render lại trên production và dev StrictMode không phát trùng. Tách riêng khỏi kiểm tín hiệu `scripts/p2a-check.mjs`. Chi tiết, bảng thao tác và 57 ảnh (lớn nhất 104.885 byte) ở `docs/screenshots/p2a/README.md`.
- **Lỗi tìm ra khi kiểm thật và đã sửa:** chữ `// isolate…` lộ ra mọi trang bài; màn 7 Dễ khen khi bấm kiểm tra chưa đặt thẻ; màn 7 Trung bình khen theo kết quả của Máy xác minh; màn 7 Khó trả lời đúng (phần 2, 3) không có khen; màn 10 Trung bình hoạt cảnh sửa trộm xóa lời khen; `FeedbackSheet` mất lần nộp khi đúng/sai đổi lúc hộp mở. Bản trước sửa không đạt 16 mục (`truoc-khi-sua.log`).
- `pnpm test --maxWorkers=2`: **2117 pass, 1 skipped**; `pnpm typecheck`, `pnpm check:text` (428 file), `pnpm build` (5 app, `VITE_MERGED=true`) đạt.
- Hai lỗi `FeedbackSheet` thấy ở lượt này (Enter đóng hộp ngay; âm và phản ứng nhân vật phát lại khi cha render lại) **đã sửa ở mục dưới**.
- Chưa xác minh: thiết bị thật, Safari/iPhone, bàn phím ảo, trình đọc màn hình, FPS điện thoại; ở 1366×768 vài trang vừa khung nên không cuộn được. Chưa push/deploy. Không làm P2b bản đồ thẻ.

## Sửa FeedbackSheet sau P2a — đã xác minh (28/10/2026)

- **Người code: Claude Code, đọc `CLAUDE.md`.** Chỉ sửa hai lỗi của `FeedbackSheet`, không đổi luật, công thức, điểm, tiến độ, loại âm, tư thế nhân vật, hiệu ứng khen. Kết quả P1a, P1b, P2a phía trên giữ nguyên.
- **Enter nộp không đóng hộp vừa mở:** hộp chỉ tiếp tục khi có lần nhấn Enter mới sau lúc hộp mở, không phải phím giữ/key repeat (`enterContinues`); nút Tiếp bằng chuột/chạm vẫn bình thường.
- **Không phát lại âm và phản ứng nhân vật:** mỗi lần nộp báo đúng một lần theo khóa nội dung (`submissionKey`, `shouldAnnounce`); cha render lại, callback đổi, effect nối lại (StrictMode) không phát lại; hai lần nộp liên tiếp cùng đúng hoặc cùng sai vẫn phát đủ.
- Test hồi quy: `feedbackAnnounce.test.ts`. Kiểm DOM thật bằng bàn phím (`scripts/p2a-feedback-check.mjs`) ở cả bốn bài (màn 1, 4, 7, 10), 3 cỡ: production 96 kiểm, dev StrictMode 120 kiểm, đạt hết; bản trước sửa không đạt 12/32. Chạy lại bộ kiểm lời khen P2a: 86 nhóm, 0 lỗi. Chi tiết ở `docs/screenshots/p2a/README.md` (mục "Sửa FeedbackSheet sau P2a").
- `pnpm test --maxWorkers=2`: **2123 pass, 1 skipped**; `pnpm typecheck`, `pnpm check:text` (428 file), `pnpm build` (5 app) đạt.
- Chưa xác minh: bàn phím vật lý/ảo trên thiết bị thật, Safari/iPhone, trình đọc màn hình; phản ứng nhân vật ở bản production chỉ kiểm gián tiếp qua nốt nhạc (đo trực tiếp ở dev). Không làm P2b, không sửa nút "?" màn 3.

## P2b — thẻ "Em có biết?" chưa nhặt trên bản đồ — đã xác minh (28/10/2026)

- **Người code: Claude Code, đọc `CLAUDE.md`; từ bước này tự commit và tự push nhánh đang làm lên `origin` khi `pnpm test`, `pnpm typecheck`, `pnpm check:text`, `pnpm build` đạt** (không force-push, không tự merge vào `main`; luật mới ở `CLAUDE.md` mục 12, thay cho "không push"). Đã push `6cfd1e3` (sửa `FeedbackSheet`; `c78bdff` đã có trên origin) trước khi làm P2b.
- Hiện hình thoi vàng cho mọi thẻ chưa nhặt: **bản đồ lớn** (cả 4 làng), **bản đồ nhỏ** (chỉ vẽ thẻ trong vòng, hướng bắc và xoay) và **`/ban-do`**. Một nguồn dữ liệu `LOCAL_VILLAGES[...].scrolls` đổi bằng `placeVillage`. Nhặt xong biểu tượng biến mất, tải lại khớp tiến độ lưu. Chữ ở `content/minimap.ts` (`banDoThe`).
- **Hoàn thiện `/ban-do` (sau `149da52`):** bản trước đặt thẻ quanh điểm làng rồi đẩy ra mép chữ tên làng nên không đúng vị trí (0/16; lệch hướng 24° ở 360×800). Nay ảnh vẽ tay chỉ để chọn làng; chọn làng thì bảng làng có **vùng bản đồ làng phóng to** (`VillageScrollMap.tsx`, tải lười) vẽ từ bố cục thật bằng `villageMapData()` (`buildMapGeometry` + `project`), thẻ đúng tọa độ không dịch, số 1 đến 4 sát hình, tên khu và chú thích ở danh sách dưới bản đồ (không nhãn nào đè bản đồ). Không dựng 3D. Đã xóa `ScrollMarks`, `layoutScrollIcons`, `banDoPoint`. Spec 03 mục 3.9, spec 04 mục 7 và `CLAUDE.md` mục 6 đã cập nhật.
- Kiểm `scripts/p2b-check.mjs` (bản build có cầu nối đo, 3 cỡ, chuột/chạm giả lập): **410 kiểm đạt**. Đủ 16 thẻ (4 làng × 4); tọa độ từng thẻ so với dữ liệu thật `__world` (sai < 0,01 đơn vị khung, < 0,75 px trên màn hình); một phần/đủ thẻ; chọn làng khác; phông tải muộn (trì hoãn 2,5 s) không lệch; chữ to + giảm chuyển động; nhặt thật rồi tải lại; khách mới không mang thẻ người trước; bản đồ lớn/nhỏ giữ nguyên đạt. 32 ảnh (lớn nhất 162.036 byte) và báo cáo ở `docs/screenshots/p2b/`.
- `pnpm test --maxWorkers=2`: **2138 pass, 1 skipped**; `pnpm typecheck`, `pnpm check:text` (430 file), `pnpm build` đạt. Bundle hub 2.774.099 byte (trước P2b 2.764.071); chunk lười `VillageScrollMap` 3.594 byte (1.521 gzip). Không sửa dựng 3D nên không đo FPS.
- Chưa xác minh: thiết bị thật/Safari, **đổi tài khoản Supabase thật (không có khóa ở máy đo; chỉ kiểm khách mới thấy lại 16 thẻ)**, nhặt thẻ bằng nút bàn tay trên cảm ứng, giáo viên; chưa hỏi có ẩn thẻ của làng chưa mở không.

## P3a — vào độc lập cả 4 làng — đã xác minh (29/10/2026)

- **Người code: Claude Code, đọc `CLAUDE.md`, tự commit và push khi 4 lệnh đạt.**
- Cả 4 cổng làng mở từ đầu cho học sinh đăng nhập và khách (`computeUnlock().villageOpen` luôn true; một nguồn cho cổng ở thế giới, `/ban-do`, URL trực tiếp). Trong làng giữ thứ tự thẻ "Em có biết?" → bài học → game 1 → game 2. Mở cổng không tự hoàn thành màn, không tự nhận thẻ, sao, xu, Trang Sổ Vàng. Giáo viên giữ quyền cũ.
- Trang Sổ Vàng vẫn theo điều kiện cũ và đếm liền từ Làng Giấy (chơi làng sau trước thì chưa có trang, tới cùng lúc khi làng còn thiếu xong). Cao trào vẫn sau màn 12, chỉ chiếu khi đủ 4 trang (`MiniGameFinale.ready`; **tự chọn**). Hiệu ứng mở cổng tắt (`GATE_OPENING_CEREMONY = false`), tiến độ cũ và cờ `gateOpenSeen` giữ nguyên, không đặt lại dữ liệu.
- Đã sửa chữ còn đòi xong làng trước (lời Bi, cảnh trao trang, `nhiemVuXong`, `congDong`, truyện số 5, Hướng dẫn chơi); spec 03 mục 6, spec 04 (mục 5, 5b, `/ban-do`), `COT-TRUYEN`, `CLAUDE.md` đã cập nhật.
- Kiểm `scripts/p3a-check.mjs` (bản build có cầu nối đo, 3 cỡ, chuột/chạm giả lập): **111 kiểm đạt**: khách mới vào cả 4 làng (`/ban-do`, đi bộ qua cổng, URL trực tiếp), thứ tự trong làng và điều kiện thẻ giữ nguyên, làng Bạc xong trước không trao trang và không đổi tiến độ, tiến độ cũ (2 trang, 6 màn) giữ nguyên sau tải lại. 24 ảnh (lớn nhất 164.272 byte), báo cáo ở `docs/screenshots/p3a/`.
- `pnpm test --maxWorkers=2`: **2147 pass, 1 skipped**; `pnpm typecheck`, `pnpm check:text` (430 file), `pnpm build` đạt. Bundle hub 2.773.527 byte (trước 2.774.099). Không sửa dựng 3D nên không đo FPS.
- Chưa xác minh: **tài khoản Supabase thật** (không có khóa ở máy đo; chỉ kiểm bằng test và cookie khách, quyền giáo viên chỉ bằng test), thiết bị thật/Safari, joystick cảm ứng, cao trào khi chơi màn 12 trước ở trình duyệt, cảnh trao trang khi các trang tới cùng lúc. Chưa làm nút tự động hoàn thành; chưa sửa nút "?" màn 3.

## P3a hoàn thiện — trao Trang Sổ Vàng và cao trào — đã xác minh (29/10/2026)

- **Người code: Claude Code, đọc `CLAUDE.md`, tự commit và push khi 4 lệnh đạt.** Chỉ hoàn thiện luồng trao trang và cao trào sau `28fe810`; không đổi công thức, luật, điểm, điều kiện nội bộ; chưa làm nút tự động hoàn thành.
- **Bỏ yêu cầu chơi lại màn 12 để xem cao trào.** `climaxState.ts` (`canWatchClimax`, `climaxPending`): cảnh chỉ chiếu khi đủ 4 trang và đã chơi màn 12 (không nói "đủ 4 trang" khi chưa đủ). Màn 12 xong trước: kết quả vẫn ghi; khi đủ trang về sau, cảnh đang chờ hiện ở màn kết quả của game vừa làm đủ trang (nút "Xem cảnh cuối"), ở bảng Làng Bạc trên `/ban-do` và ở dòng nhiệm vụ ở chợ; nút mở `/lang/lang-bac/man/12?canh=cuoi` chiếu thẳng cảnh, hết cảnh về `/ban-do`. Thứ tự thường vẫn tự chiếu sau ván. Không tự ngắt ván hay hộp phản hồi. Cờ `climaxSeen` (ghi khi hết hay "Bỏ qua"), xem lại không ghi, bước trao trang chỉ một lượt cho lần xem đầu (**tự chọn**: có ở lần xem đầu của mọi tài khoản).
- Lỗi bắt được khi kiểm thật và đã sửa: cờ đổi giữa lúc chiếu làm bước d biến mất, `ClimaxScene` lỗi (tự phục hồi); nay chụp lúc vào trang và `stepAt` kẹp chỉ số.
- Kiểm DOM thật (`scripts/p3a-climax-check.mjs`, bản build có cầu nối đo, tiến độ đầu vào bằng cookie, chơi thật màn 6 và màn 12, 3 cỡ): **120 kiểm đạt**: thứ tự thường (+ tải lại giữa cảnh), màn 12 xong trước rồi làm nốt làng và xem từ màn kết quả hay từ bảng Làng Bạc sau tải lại, nhiều trang (2, 3, 4) cùng lúc: mỗi cảnh trao trang đúng một lần, không chồng, không mất, tải lại không chiếu lại. 27 ảnh (lớn nhất 162.762 byte), báo cáo ở `docs/screenshots/p3a/`.
- `pnpm test --maxWorkers=2`: **2157 pass, 1 skipped**; `pnpm typecheck`, `pnpm check:text` (431 file), `pnpm build` đạt. Bundle hub 2.774.688 byte (+1.161). Spec 03 mục 6, spec 04, spec 08 "Cảnh cao trào" đã cập nhật.
- Chưa xác minh: tài khoản Supabase thật, thiết bị thật/Safari, chạm chỉ giả lập (màn 6 ở 360×800 chơi sau khi xoay ngang). **Mục "hướng dẫn focus và làm thử cho cả 12 màn" không có trong bản `TRANG-THAI.md` của nhánh này nên không sửa được; nếu nằm ở bản khác của bạn thì cần thêm lại.** Chưa sửa nút "?" màn 3.

## P3b — nút "Tự hoàn thành" cho đủ 12 màn — đã xác minh bằng bản dev và test, CHƯA có Supabase thật (29/10/2026)

- **Người code: Claude Code, đọc `CLAUDE.md`, tự commit và push khi 4 lệnh đạt.** Không triển khai "Hướng dẫn focus và làm thử" (P8, đã ghi ở bảng ưu tiên và mục P8 phía trên, chưa làm).
- Nút chỉ cho giáo viên/admin và bản dev; học sinh/khách ở bản phát hành không có nút. Đủ 12 màn (bài học: thanh đầu trang; game: thẻ bắt đầu và hộp "?" giữa ván). Chỉ ghi cờ `auto` (cột `level_progress.auto_completed`, cookie dev `ac`) qua luồng lưu hiện có; không điểm, sao, huy chương, xu; không đổi thành tích thật; bấm lặp không tạo bản ghi trùng; chơi thật sau đó lưu bình thường.
- **Quy tắc phần thưởng (chốt, không tự trao thêm):** cờ cho đi tiếp theo điều kiện mở màn hiện có; KHÔNG tính Trang Sổ Vàng và KHÔNG mở cao trào (cần hoàn thành thật). Thẻ "Em có biết?" coi như đủ khi bài học đã tự hoàn thành.
- **Quyền do máy chủ quyết:** migration mới `0003_auto_complete.sql` (**chưa chạy, cần chủ dự án chạy TRƯỚC khi triển khai**): cột, trigger chỉ cho teacher/admin đặt cờ, `class_progress` trả `auto_completed`. Frontend không gửi cờ khi chưa được phép; chỉ gửi cột khi `true`. `pnpm rls:check` có thêm ca (3b), (9), chưa chạy được.
- Trang giáo viên phân biệt "⏭ Tự hoàn thành" với hoàn thành thật (bảng, CSV, chi tiết, chú thích). Spec 02 (đồng bộ), 03 mục 6, 09 và `CLAUDE.md` đã cập nhật.
- Kiểm DOM thật (`scripts/p3b-check.mjs`, 3 cỡ): **bản dev 222 kiểm đạt** (đủ 12 màn, bấm lặp, giữa ván, chơi thật sau, đủ 12 màn không trang/xu/cao trào, tải lại); **bản phát hành 42 kiểm đạt** (khách không thấy nút ở 12 màn, cookie giả bị bỏ qua). 30 ảnh (lớn nhất 162.266 byte) ở `docs/screenshots/p3b/`.
- `pnpm test --maxWorkers=2`: **2185 pass, 1 skipped**; `pnpm typecheck`, `pnpm check:text` (432 file), `pnpm build` đạt. Bundle hub 2.781.350 byte (+6.662).
- **Bổ sung tương thích và kiểm quyền (29/10/2026):** cờ đi đường đẩy riêng với tiến độ thật; máy chủ chưa chạy 0003 thì nút vô hiệu kèm thông báo, tiến độ thật vẫn đồng bộ, không báo đã lưu khi bị từ chối. Thẻ "Em có biết?": tự hoàn thành chỉ bỏ điều kiện chặn, không ghi đã nhặt. Migration 0003 + RLS kiểm trên **PostgreSQL biệt lập (không phải Supabase thật)** bằng `scripts/db-test-p3b.sh`: 51/51 đạt; chi tiết `docs/screenshots/p3b/KIEM-SUPABASE.md`. `pnpm rls:check` chưa chạy được (thiếu `.env.local`/dự án TEST): **phần quyền máy chủ CHƯA nghiệm thu**.
- **Nghiệm thu DOM với máy chủ GIẢ (29/10/2026, sau 477e195):** `scripts/p3b-api-check.mjs`, bản build phát hành, 3 cỡ, **156 kiểm đạt**, 45 ảnh: chưa có cột; có cột nhưng từ chối quyền; mất mạng tạm thời (không kết luận nhầm thiếu migration, không khóa vĩnh viễn, thử lại không ghi trùng); lưu thành công; phản hồi cũ đến muộn không hoàn lại cờ đã lưu; tiến độ chơi thật vẫn đồng bộ khi đường cờ lỗi (bằng bản ghi chờ đẩy, không chơi game thật). Sửa 3 lỗi tìm được (thăm dò đến muộn ghi đè; thăm dò treo giữ nút; ghi chú bị bóp hẹp ở thanh đầu bài học và thẻ game 844×390). Dev `p3b-check` (levels, double, mid) 207 kiểm đạt. `pnpm test --maxWorkers=2`: 2199 đạt, 4 bỏ qua (3 của `teacher/dbRows.test.ts`, chạy khi có `P3B_ROWS_JSON`/`P3B_ERR_FILE` và đã đạt khi chạy với dữ liệu thật; 1 của `footprintGen.test.ts`, không liên quan P3b, chỉ chạy khi đặt `GEN_FOOTPRINTS`). **Đây KHÔNG phải kiểm quyền Supabase thật: trạng thái "chưa nghiệm thu Supabase thật" giữ nguyên.** Điều kiện phải xong trước khi triển khai chức năng cho giáo viên: dự án Supabase TEST + `pnpm rls:check` đạt (xem `docs/screenshots/p3b/KIEM-SUPABASE.md`). Không áp migration production.
- **Cần xử lý trước khi dùng thật (có từ trước, chưa sửa):** học sinh tự sửa được `completed`/`played`/`stars`/`best_score`/`coins`/`golden_pages` của mình qua API.
- **Chưa xác minh:** tài khoản giáo viên thật và Supabase thật (migration, trigger, `rls:check`, trang giáo viên với dữ liệu thật); kiểm quyền chỉ bằng test; thiết bị thật/Safari.

## Việc dời từ mốc 3 (làm CUỐI mốc 4, theo thứ tự)

1. **15b deploy bản gộp:** `git pull`, `VITE_MERGED=true` trong `deploy/.env`, dựng lại theo `DEPLOY.md` mục (j); kiểm hub 200, 4 địa chỉ làng cũ trả 302 giữ đường dẫn; thử trên điện thoại. Quay về: mục (j) cách 1 hoặc 2.
2. **G2 kiểm tra toàn bộ** (spec 10 mục 3, bỏ hội làng): đã làm dở (thông tin trang, kiểm manifest 151 mục đủ, script chơi trọn bản khách, đo bộ nhớ 3 màn × 10, ảnh 4 cỡ màn hình). Còn: kết quả chơi trọn, giáo viên, RLS, rà chữ, chủ dự án tự kiểm Google/iPhone/điện thoại.
3. **Thử với 5–10 học sinh** (spec 10 mục 4), gom lỗi sửa.
4. **Hội làng** (spec 10 mục 1), làm sau cùng; bật `FESTIVAL_LAUNCHED`.

## Quyết định đã chốt ở mốc 3

**Cách làm:** hoàn thiện **từng làng một** (2 game của làng xong → dựng làng to). Bỏ đo FPS trên máy thật; lag thì người dùng báo (tên máy, chỗ, mức chất lượng).

**Luật chung cho mọi game** (spec 03 mục 3.8, 6):
- Thẻ bắt đầu có "Hướng dẫn chơi" (phần riêng của game); nút **"?"** trong lúc chơi tạm dừng thật, hiện câu nhắc theo trạng thái (`hintFor` chỉ trả khoá, **không lộ đáp án**); màn kết quả có "Chơi tiếp".
- **Mọi chữ hướng dẫn game nằm trong `packages/core/src/content/huongDanGame.ts`** (luật, điều khiển, trang, câu nhắc) để chủ dự án tự sửa.
- Lũy thừa viết chỉ số trên: `formatPower` + `rich()`, trong content ghi `5^^x^^`.
- Nút "Bắt đầu", nút "tiếp" của QuizCard luôn cố định ở đáy; `VnDialog` màn thấp (≤ 500px) xếp 2 cột; hộp thoại trên cảnh 3D dùng viền nâu đậm, không bóng đổ/nhoè.
- `check:text` chỉ bắt đúng chữ "Tí" (không bắt "Tính", "Tím").
- **Mốc điểm:** màn 9, 11, 12 đặt **theo nghĩa** (ghi nghĩa trong spec); các màn khác dùng quy tắc phân vị bot (Đồng = p25 bot trung bình, Bạc = p75, Vàng = p10 bot giỏi). Mốc "tạm" sẽ chỉnh khi học sinh chơi thật.

**Từng màn** (chi tiết trong spec 06, 07, 08):
- **Màn 5 Đập Tí:** làn dài 10, vùng đập [6,5; 9]; sổ chịu **8 vết**, trả lời đúng **xoá 2 vết**; đồng hồ lịch dừng trong lượt trùm. Mốc tạm **1650/2650/3100**.
- **Màn 6 Diều:** **5 tim**; mọi cặp khe được kiểm `passable` (bộ sinh cũ có 8% khe không qua nổi); khe 1 cao 3,16. Mốc tạm **240/340/440**.
- **Màn 8 Lật thẻ:** mốc 300/550/750; `ModCalculator` dùng chung (màn 9).
- **Màn 9 Chữa gà:** 3 làn, nhãn bẫy = số khuôn, viên thuốc luôn trúng gà đã chọn. Mốc theo nghĩa **300/500/700**.
- **Màn 11 Ghép lá:** điểm lá +1, ô cây +50, xong cây +200 + 20×lượt dư; lượt **12/15/15**; mốc theo nghĩa **1150/1550/1850** = xong 1/2/3 cây.
- **Màn 12 Leo cây:** người chơi treo ở x = 0, cặp tay nắm trượt cùng nhau như ray; mã rút gọn vòng 3–4 sinh riêng; 2 đồng mỗi khoảng, chỉ nhặt khi leo ngay lần bật đầu. Mốc theo nghĩa **250/450/570**. Tư thế **`hang` dựng bằng code** (clip trong file sai).
- **Cao trào** sau màn 12 (ảnh 10 → lời Tí, cụ Bình → ảnh 11 → thầy Linh trao trang). **Trang Sổ Vàng 4 chỉ trao sau màn 12**; đã bỏ trao trang tạm sau màn 10; cờ `climaxSeen`.

**Gộp web (G1, commit `ae89a4b`, `904e45f`):** hub nhận 4 làng dưới `/lang/<id>` (tải lười), `VITE_MERGED=true` điều hướng nội bộ, không tải lại trang; Caddy chuyển 4 subdomain cũ về web chính giữ nguyên đường dẫn (`deploy/Caddyfile`, bản cũ `Caddyfile.truoc-gop`). **Sửa rò bộ nhớ lớn:** three giữ renderer cũ qua listener `dispose` của texture dùng chung (59 renderer sau 8 vòng); `three/rendererRelease.ts` gỡ listener khi renderer bị dispose → heap đứng yên. **Khi nâng cấp three.js phải kiểm lại `rendererRelease`.**

**Làng to** (spec 06, 07 mục "Cảnh làng"): bán kính 125, lũy tre, 4 thẻ rải ở 4 khu, thẻ xa nhất ≤ 240 đường đi.
- **Dệt:** sân đình gạch, bãi phơi vải, xóm khung cửi (≤ 8 khung cả thế giới), ao nhuộm, chợ vải, ruộng dâu ở rìa.
- **Khắc Dấu:** sân máy soi dấu (thân đồng, ánh kim nướng vào màu đỉnh, không dùng envMap), xưởng khắc dấu, đình có bảng 6 mẫu dấu công khai (lấy từ bài 3, tên phản diện qua `{phanDien}`), trạm đưa thư có bồ câu, bãi đá, chuồng gà gần cổng.
- Dùng chung `villageKit.ts`, `villageChecks.ts`; `layoutHills` đẩy đồi lấn vào làng ra xa; cỏ trong làng phủ đúng tâm (sửa lỗi lộ nền ruộng, cả Làng Giấy).
- **Bạc:** CÂY GỘP SỔ ở giữa (cây đa + 15 thẻ gỗ ghi số đúng ví dụ bài 4: lá 3 7 5 2 6 1 4 8 → 37 52 61 48 → 422 658 → gốc 4878, chữ vẽ ở bước chuẩn bị), thầy Linh dưới gốc; quầy đổi bạc (xâu tiền, thỏi bạc, cân đòn); bến sông trên một nhánh sông nhỏ trong làng (cầu tàu, thuyền, lái buôn); nhà giữ sổ (sổ đóng chỉ); ao sen.
- Cảnh mở đầu: ảnh truyện và hộp thoại được tải, giải mã trước khi tới gần cổng.
- **Bài học về khựng (L4, L6):** không thêm chương trình shader mới, không dùng envMap; vẽ texture chữ/hình và biên dịch shader ở **bước chuẩn bị làng**, không làm trong khung dựng vùng.

**Ngân sách đã đo** (Thấp / Vừa / Cao, tam giác xấu nhất): Dệt 222k / 936k / 1,12M; Khắc Dấu ≈ 204k / 813k / 1,02M; Bạc 211k / 959k / 1,14M. Vùng làng thêm 3–6 MB. Bộ nhớ vào ra làng đứng yên. **Mức Vừa chỉ vẽ nhà, lều, tre ở xa trong tầm 260** (sương đã phủ kín từ ~300).

## Việc để sau / cần theo dõi

- **Màn 3:** nút “?” đè chữ “Soi công thức”; ghi nhận để sửa riêng, không sửa trong P2a.

- Sau gộp web, số nút DOM nhích 588 → 598 ở 2 vòng cuối một lượt đo; theo dõi.
- Bạc mức Vừa: 1 trong 5 lượt có 1 khung 55,6 ms. Số đo Bạc mức Thấp/Cao chạy trên bản trước khi đặt tầm 260 (đường mã hai mức này không đổi).
- Khắc Dấu mức Vừa/Cao còn 1 khung 55–64 ms khi cảnh mở đầu hiện lần đầu (shader có texture dùng lần đầu). Dệt có khung 51–72 ms ở giây thứ ~8 khi vào làng (có từ trước L4).
- Mốc tạm màn 5, 6; bot ngẫu nhiên màn 11 vẫn xong cả 3 cây 51%.
- Màn 5: học sinh khá nhỏ (74px ở khung 360), mép bảng câu hỏi chạm trùm ở làn 2.
- Cao trào: tư thế buồn của Tí còn nhẹ, chân dung Tí cười lúc hối lỗi, cảnh 3D bước b còn tĩnh.
- Nước ao (Giấy, Dệt) là mặt phẳng; 2/3 bàn đá ở xưởng còn trơn; đá kiểu khối nhiều cạnh.
- **Repo Git phình** vì `assets-build/`: cân nhắc Git LFS. Docker Desktop chỉ chạy khi có người đăng nhập Windows.
- Trước khi dùng thật: xoá `test_rls_*`, `thu01`, `thu02`. Supabase miễn phí tự dừng sau ~1 tuần không dùng.
- Từ mốc 1: admin chưa xoá được học sinh khỏi lớp (migration `members_delete`); chữ đậm trong `rich()` mất màu riêng.
- Thư mục rỗng `D:\Users` (Claude Code lỡ tạo ngoài repo) có thể xoá tay.

## Tải lên project claude.ai

Từ `docs/specs/` trong repo: 00, 01, 03, 04, 06, 07, 08, 10 (đều đã được Claude Code sửa trong mốc 3) và file này. Người code hiện tại là **Claude Code**, đọc **CLAUDE.md**, tự commit và tự push nhánh đang làm khi kiểm tra đạt (không force-push, không tự merge vào `main`).

## Câu mở đầu cho cửa sổ tiếp theo

```
Tiếp tục mốc 4 (trau chuốt). Đọc CLAUDE.md, tự commit và tự push nhánh đang làm khi kiểm tra đạt (không force-push, không tự merge vào main). Đọc TRANG-THAI.md: P1a và P1b đã xong, không làm lại. Yêu cầu 10 là máy tính màn 4 – Làng Dệt, không phải Bài 4/màn 10 – Làng Bạc. Chờ lời giao việc tiếp theo. Các việc dời từ mốc 3 và hội làng để cuối mốc 4.
```

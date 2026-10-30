# P3b — nút "Tự hoàn thành" cho đủ 12 màn (29/10/2026)

## Làm gì

- **Ai thấy nút:** chỉ giáo viên/admin (`canSeeTeacherPage`) và bản dev (`import.meta.env.DEV`): `canUseAutoComplete(role, dev)`. Học sinh và khách ở bản phát hành không có nút (kể cả bản đo `VITE_PROBE`, không phải bản dev).
- **Đủ 12 màn:** bài học (nút trên thanh đầu trang, có dạng biểu tượng ở màn hẹp) và game (thẻ bắt đầu, và hộp "?" lúc đang chơi: ván đang tạm dừng). Bấm: chỉ ghi cờ qua luồng lưu tiến độ hiện có rồi hiện khung "Đã tự hoàn thành" (Chơi tiếp / Chơi thật màn này / Về làng). Khung game đã gỡ nên đồng hồ và vật lý dừng; không `onFinish`, không chấm điểm, không thưởng.
- **Cờ là gì:** `LevelProgress.auto` (cột `level_progress.auto_completed`, cookie dev: trường `ac`). KHÔNG đổi `played`, `completed`, `stars`, `best_score`; không tạo điểm, sao, huy chương, xu hay Trang Sổ Vàng. Màn đã xong thật hoặc đã có cờ thì không đặt lại (bấm lặp không tạo bản ghi trùng). Chơi thật sau đó lưu bình thường, cờ không ghi đè thành tích; xong thật thì màn hiện "Xong" thật.
- **Quy tắc với phần thưởng (ghi trước khi làm, không tự trao thêm):** cờ cho đi tiếp theo điều kiện mở màn hiện có (màn kế trong làng mở; thứ tự trong làng giữ nguyên) nhưng KHÔNG tính vào Trang Sổ Vàng (trang chỉ tính từ màn xong thật + số đã lưu) và KHÔNG mở cao trào (cần đủ 4 trang thật và màn 12 chơi thật). Tự hoàn thành đủ 12 màn: 0 trang, 0 xu, không nút "Xem cảnh cuối". Thẻ "Em có biết?" của làng coi như đã xong khi bài học đã tự hoàn thành (như "đã xong bài học" hiện có).
- **Quyền, máy chủ quyết:** migration mới `supabase/migrations/0003_auto_complete.sql` (CHƯA chạy ở đâu, cần chủ dự án chạy): thêm cột, trigger `protect_auto_completed` chỉ cho `teacher`/`admin` đặt cờ (học sinh ghi cờ thì lỗi), `class_progress` trả thêm `auto_completed`. Frontend KHÔNG gửi cờ nếu chưa được phép (manager bỏ cờ khỏi phần đẩy và khỏi tính mở khóa), và chỉ gửi `auto_completed` khi `true` (bảng chưa migration vẫn chạy). `pnpm rls:check` có thêm ca (3b) học sinh bị chặn và (9) giáo viên đặt được; **chưa chạy được** (không có Supabase).
- **Trang giáo viên:** ô "⏭ Tự hoàn thành" khác hoàn thành thật (sao/mốc); đã chơi dở mà còn cờ thì thêm hậu tố; có chú thích và chữ trong CSV; chi tiết học sinh ghi rõ.
- Mọi chữ ở `content/autoComplete.ts` và `content/teacher.ts`.

## Kiểm DOM thật (`node scripts/p3b-check.mjs --mode=dev|prod`, chuột ở 1366×768, chạm giả lập ở hai cỡ còn lại)

| Bản | Kết quả |
|---|---|
| **Dev** (có nút) | **222 kiểm đạt** (74 mỗi cỡ): đủ 12 màn có nút (bài học ở thanh đầu, game ở thẻ bắt đầu); bấm: khung "Đã tự hoàn thành"; tiến độ chỉ có cờ (dòng toàn số 0, xu 0, trang 0, màn khác không đổi); màn kế trong làng vào được, màn sau nữa vẫn khóa; tải lại và `/ban-do` ghi "Tự hoàn thành" (không số sao); bấm 3 lần liên tiếp: đúng 1 cờ, 1 dòng, xu 0; tải lại không còn nút; **giữa ván** màn 6, 11, 12 qua hộp "?": ván gỡ ngay, không màn kết quả, không ghi gì; **chơi thật** màn 6 sau tự hoàn thành: kết quả thật ghi bình thường, cờ không cản; **đủ 12 màn** tự hoàn thành lần lượt: 12 cờ, 0 xu, 0 trang, bảng Làng Bạc không có "Xem cảnh cuối" |
| **Phát hành** (probe, không phải dev) | **42 kiểm đạt** (14 mỗi cỡ): khách KHÔNG thấy nút ở cả 12 màn; cookie giả có cờ cả 12 màn bị bỏ qua (màn 12 vẫn khóa, `/ban-do` không hiện nhãn "Tự hoàn thành") |

Ảnh: 30 ảnh (lớn nhất 162.266 byte) ở thư mục này (`dev-*`: nút, khung sau khi bấm, hộp "?" giữa ván, `/ban-do`, chơi thật sau, đủ 12 màn; `prod-khong-co-nut-*`). Chi tiết: `ket-qua-dev.json`, `ket-qua-prod.json`, `anh-*.json`.

## Test (vitest) và lệnh bắt buộc

Mới: `progress/autoComplete.test.ts` (23 ca: đủ 12 màn chỉ ghi cờ, bấm lặp, không ghi đè thành tích thật, mở màn kế, KHÔNG trao trang/cao trào, bỏ qua khi chưa được phép, chơi thật sau, mã hóa cookie, hàng Supabase, gộp, manager: không đẩy cờ của học sinh, đẩy một bản ghi của giáo viên, tải lại, quyền thấy nút, trang giáo viên), `apps/hub/src/autoComplete.test.tsx` (nút, khung, bảng làng). `pnpm test --maxWorkers=2`: **2185 pass, 1 skipped** (199 file); `pnpm typecheck` đạt; `pnpm check:text` sạch (432 file); `pnpm build` đạt. Bundle hub: tổng JS **2.781.350 byte** (gzip 863.024), trước P3b 2.774.688 (+6.662).

## Kiểm DOM bản phát hành với máy chủ GIẢ (sau commit 477e195, 29/10/2026)

**Đây KHÔNG phải kiểm quyền Supabase thật.** `node scripts/p3b-api-check.mjs` mở bản BUILD phát hành (không phải dev; khóa trong bản build là chuỗi giả `mock-anon-key-not-real`) đăng nhập là giáo viên, nói chuyện với `scripts/lib/mock-supabase.mjs` (máy chủ giả bắt chước tối thiểu PostgREST/GoTrue; không RLS, trigger hay JWT thật). Mã lỗi giả (42703 thiếu cột, P0001 từ chối) lấy từ PostgreSQL thật qua `scripts/db-test-p3b.sh`. Cách chạy ở đầu file script.

**156 kiểm đạt** (52 mỗi cỡ: 1366×768, 360×800, 844×390; 45 ảnh `api-*.jpg`, lớn nhất 157.958 byte; chi tiết `ket-qua-api-gia.json`, `anh-api-gia.json`). Tiến độ chơi thật được mô phỏng bằng bản ghi bài 4 "đã chơi dở" chờ đẩy trên máy (không chơi game thật).

| Tình huống | Kết quả xác minh |
|---|---|
| Máy chủ chưa có cột (thăm dò 42703) | Nút vô hiệu, ghi rõ "máy chủ chưa hỗ trợ… tiến độ chơi thật vẫn lưu"; bấm không hiện khung "Đã tự hoàn thành", máy chủ không nhận bản ghi cờ nào; bài 4 chờ đẩy vẫn lên máy chủ (không mang cờ); tải lại: `/ban-do` không màn nào ghi "Tự hoàn thành"; nút vẫn vô hiệu |
| Thăm dò báo có cột nhưng lúc ghi báo 42703 | Thông báo chưa hỗ trợ, nút vô hiệu, không khung thành công; tiến độ thật cùng lượt đẩy vẫn lên; cờ bị gỡ khỏi máy (đúng 1 lần thử); tải lại không còn cờ |
| Có cột, máy chủ từ chối quyền ghi (P0001) | Thông báo "máy chủ không cho tài khoản này dùng" (khác với chưa hỗ trợ và mất mạng), nút vô hiệu, không báo đã lưu; tiến độ thật cùng lượt vẫn lên; cờ không còn sau tải lại và không có hiệu lực ở `/ban-do`; bấm lại sau tải lại vẫn bị từ chối, không cờ nào lên |
| Mất mạng tạm thời (mọi yêu cầu đứt) | Khung hiện kèm "Chưa lưu được lên máy chủ (có thể mất mạng)", KHÔNG nói thiếu migration hay bị từ chối; sang màn 2 nút vẫn dùng được (không khóa vĩnh viễn); có mạng lại: cờ tự lên đúng 1 lần, thêm hai lần sự kiện `online` vẫn 1 lần; hàng chỉ có cờ (không điểm/sao/xu/trang); xóa dữ liệu máy rồi tải lại: cờ lấy từ máy chủ |
| Thăm dò lỗi mạng rồi đường ghi cờ lỗi tạm thời | Trạng thái "chưa biết": nút không khóa; nói rõ chưa lưu; hết lỗi: lưu đúng 1 lần, không ghi trùng |
| Lưu thành công | Khung không kèm cảnh báo; bấm 3 lần liên tiếp: 1 lần ghi, 1 hàng; hàng chỉ có cờ; xu 0, trang 0; tải lại: màn 1 hết nút, `/ban-do` ghi "Tự hoàn thành" từ máy chủ; không ghi thêm |
| Phản hồi thăm dò cũ (báo thiếu cột) đến muộn 14 giây sau khi cờ đã lưu thành công | Khung thành công còn nguyên, không thông báo chưa hỗ trợ, nút ở màn sau vẫn dùng được, cờ ở máy chủ và máy còn nguyên, chỉ 1 lần ghi |

Lưu ý đúng phạm vi: giáo viên/admin thấy mọi màn đã mở nên không quan sát được "màn kế mở" ở DOM; hiệu lực của cờ được kiểm bằng nhãn "Tự hoàn thành" ở `/ban-do` (và bằng test `computeUnlock`).

**Lỗi tìm thấy và đã sửa khi kiểm:** (1) phản hồi thăm dò đến muộn có thể ghi đè trạng thái "có hỗ trợ" thành "chưa hỗ trợ" sau khi cờ đã lưu (nay chỉ ghi khi còn "chưa biết"; test mới trong `autoComplete.test.ts`); (2) thăm dò treo làm nút bấm treo theo (nay dùng chung một lần thăm dò và chờ tối đa 3 giây rồi cứ ghi, lần đẩy tự phân loại lỗi); (3) ghi chú của nút bị bóp thành cột chữ hẹp (360×800, ở thanh đầu bài học, và còn hiện lặp hai lần) và ở thẻ bắt đầu game 844×390 (nay hiện một chỗ, đủ rộng, dưới thanh đầu / xuống dòng riêng).

Chạy lại sau sửa: `p3b-check.mjs --mode=dev --only=levels,double,mid` **207 kiểm đạt** (3 cỡ).

**Kiểm hồi quy chốt (sau commit 445752a, mã cuối, 3 cỡ):** `--mode=dev --only=real,all12` **15 kiểm đạt** (chơi thật sau tự hoàn thành; đủ 12 màn không trang/xu/cao trào); `--mode=prod` (bản build phát hành, có `VITE_PROBE`, không phải dev) **42 kiểm đạt** (khách không thấy nút ở 12 màn; cookie giả có cờ cả 12 màn bị bỏ qua, màn 12 vẫn khóa, `/ban-do` không hiện "Tự hoàn thành"). Kết quả: `ket-qua-dev-hoi-quy.json`, `ket-qua-prod-hoi-quy.json` (ảnh `dev-*`, `prod-*` được chụp lại). Quyền Supabase thật vẫn CHƯA nghiệm thu.

## Chưa xác minh

- **Bổ sung (tương thích và kiểm quyền):** cờ đi đường đẩy riêng, nút vô hiệu khi máy chủ chưa chạy 0003; migration 0003 kiểm trên PostgreSQL biệt lập 51/51 đạt (không phải Supabase thật), xem `KIEM-SUPABASE.md` (cách chạy, điều kiện còn thiếu, `pnpm rls:check` thoát mã 2 vì thiếu `.env.local`).
- **Tài khoản giáo viên thật và Supabase:** không có môi trường nên chưa kiểm ở trình duyệt với tài khoản giáo viên, chưa chạy migration 0003 và `pnpm rls:check`. Đã kiểm bằng test: quyền thấy nút (`canUseAutoComplete`), manager không đẩy cờ khi chưa được phép và đẩy đúng một bản ghi khi được phép, hàng Supabase, trang giáo viên; nút giáo viên được kiểm gián tiếp bằng bản dev. **Chạy migration 0003 TRƯỚC khi triển khai bản này**: học sinh không bị ảnh hưởng (không bao giờ gửi cột mới), nhưng nếu giáo viên bấm nút khi cột chưa có thì lần đẩy tiến độ chứa cờ đó lỗi (cột không tồn tại) và tiến độ của chính tài khoản giáo viên đó chưa đồng bộ được cho tới khi chạy migration.
- Học sinh vẫn có thể tự sửa `completed`/`played` của chính mình qua API (đã vậy từ trước, spec 02 mục 4 ghi chú); migration chỉ chặn cờ tự hoàn thành, không đổi điều đó.
- Thiết bị thật, Safari/iPhone; chạm giả lập bằng Chrome; màn 6 ở 360×800 chơi sau khi xoay ngang.

## Hoàn thiện truy cập nút "Tự hoàn thành cả màn" ở mọi trạm và mọi vòng (30/10/2026)

### 1. Nội dung đã làm
- **Phạm vi hiển thị rõ ràng trên giao diện:** Đổi nhãn nút thành `"Tự hoàn thành cả màn"` (`content/autoComplete.ts`), cập nhật ghi chú giải thích rõ phạm vi: hoàn thành toàn bộ màn này (không phải riêng câu, trạm hay vòng hiện tại); màn kế tiếp sẽ mở theo luật, không nhận sao/xu/Trang Sổ Vàng.
- **Truy cập ở mọi trạm bài học:** 4 bài học (Màn 1, 4, 7, 10) có nút ở thanh đầu trang (`header`), truy cập được tại mọi trạm (Dễ, Trung bình, Khó).
- **Truy cập ở mọi vòng game:** 8 game (Màn 2, 3, 5, 6, 8, 9, 11, 12) có nút ở thẻ bắt đầu (`the-bat-dau`) và trong hộp "?" (`hop-goi-y`) khi đang chơi. Nút "?" được nâng lên lớp `z-[35]` trong `MiniGameLevel.tsx` để luôn nổi trên các overlay giữa ván (như câu hỏi trắc nghiệm `z-30` của Màn 2), đảm bảo mở được hộp gợi ý ở mọi vòng. Hộp "?" mở rộng `max-w-lg` và `sm:flex-wrap` tránh tràn nút ở màn ngang (844×390).
- **Chặn bấm lặp tức thời:** Bổ sung cờ `busy` vào `AutoCompleteButton` (`disabled={blocked !== null || busy}`) vô hiệu hóa nút ngay trong mili-giây đầu tiên khi bấm, phối hợp cùng cơ chế guard `'noop'` ở manager.
- **Dừng mô phỏng khi tự hoàn thành giữa ván:** Khi bấm tự hoàn thành trong hộp "?", component game được gỡ khỏi cây DOM, đồng hồ và mô phỏng dừng ngay lập tức; không gọi `onFinish`, không chấm điểm hay phát sinh thưởng.

### 2. Bảng tổng hợp 12 màn chuẩn xác theo Content và Config thực tế
| Màn | Tên màn | Loại | Các độ khó / trạm / vòng | Vị trí truy cập nút |
|---|---|---|---|---|
| Màn 1 | "Trang nối trang" (Bài 1) | Bài học 2D | 3 trạm: Dễ (Nối trang), Trung bình (Sửa lén), Khó (Đổi thứ tự) | Thanh đầu trang (`header`), hiện ở mọi trạm |
| Màn 2 | "Đuổi theo {phanDien}" | Game chạy 3D (Runner 3D) | 4 vòng (25s/vòng, tốc độ 12 -> 21.6; giữa các vòng có câu hỏi trắc nghiệm dừng màn hình QuizOverlay `z-30`) | Thẻ bắt đầu + Hộp "?" giữa ván (`z-[35]`, mở được ở mọi vòng và cả khi câu hỏi dừng màn hình mở) |
| Màn 3 | "Ghép lại cuốn sổ" | Game ghép trang 2D | 2 vòng: Vòng 1 (ghép 5 trang thật), Vòng 2 (ghép 7 trang + đoạn giữ sổ 45s phát hiện tráo trang) | Thẻ bắt đầu + Hộp "?" giữa ván (mọi vòng và cả đoạn giữ sổ) |
| Màn 4 | "Cả làng cùng giữ sổ" (Bài 2) | Bài học 2D | 3 trạm: Dễ (Đa số thắng), Trung bình (So sổ trước khi duyệt), Khó (Đặt cọc ghi sổ) | Thanh đầu trang (`header`), hiện ở mọi trạm |
| Màn 5 | "Đập {phanDien}" | Game 4 làn 3D (bảo vệ cuốn sổ, gõ chuột theo làn, chặn trùm bằng câu hỏi; P7 2D chưa làm) | 1 ván sinh chuột liên tục (0-120s) kèm các lượt trùm trắc nghiệm; sổ chịu tối đa 8 vết mực | Thẻ bắt đầu + Hộp "?" giữa ván (mọi lúc và cả lúc lượt trùm xuất hiện) |
| Màn 6 | "Diều đưa sổ" | Game bay 2.5D | 4 cổng làng (sau khe 6, 12, 18, 24 của tổng 24 khe; mỗi cổng có câu hỏi trắc nghiệm 20s; 5 tim) | Thẻ bắt đầu + Hộp "?" giữa ván (mọi lúc bay và cả khi dừng ở cổng trả lời) |
| Màn 7 | "Khuôn riêng, mẫu chung" (Bài 3) | Bài học 2D | 3 trạm: Dễ (Khuôn và mẫu), Trung bình (Soi dấu giả), Khó (Ký phân tán) | Thanh đầu trang (`header`), hiện ở mọi trạm |
| Màn 8 | "Lật thẻ tìm cặp khóa" | Game lật thẻ 2D (Memory) | 3 vòng: Vòng 1 (4 cặp), Vòng 2 (6 cặp), Vòng 3 (8 cặp + tráo thẻ mỗi 20s) | Thẻ bắt đầu + Hộp "?" giữa ván (mọi vòng) |
| Màn 9 | "Chữa đàn gà" | Game chạy 3 làn 2D | 3 đợt/vòng (trước mỗi đợt có nạp thuốc, đợt 3 có gà trùm cuối đường) | Thẻ bắt đầu + Hộp "?" giữa ván (cả giai đoạn nạp thuốc và lúc chạy đập gà trùm) |
| Màn 10 | "Cây gộp sổ" (Bài 4) | Bài học 2D | 3 trạm: Dễ (Gộp cặp tính gốc Merkle), Trung bình (Tìm lá bị sửa lén), Khó (Bằng chứng Merkle đường dẫn) | Thanh đầu trang (`header`), hiện ở mọi trạm |
| Màn 11 | "Ghép lá cây sổ" | Game ghép 3 (Match-3) 2D | 3 cây Merkle (Cây 1: 4 ô lá - 12 lượt; Cây 2: 8 ô lá - 15 lượt; Cây 3: 8 ô lá - 15 lượt) | Thẻ bắt đầu + Hộp "?" giữa ván (mọi cây Merkle) |
| Màn 12 | "Leo cây tìm lá giả" | Game leo cây 2.5D | 4 vòng / 4 chặng leo (8/16/32/64 lá, depth 3/4/5/6) | Thẻ bắt đầu + Hộp "?" giữa ván (mọi chặng leo) |

### 3. Kết quả kiểm tra DOM (local Chrome headless)
- **Bản Dev (`scripts/p3b-check.mjs --mode=dev --size=0,1,2`):** **324/324 kiểm đạt** (108 mỗi cỡ: 1366×768, 360×800, 844×390):
  - Đủ 12 màn có nút: 4 bài học ở thanh đầu trang, 8 game ở thẻ bắt đầu.
  - Cả 12 trạm của 4 bài học (mỗi bài 3 trạm Dễ, Trung bình, Khó) đều có nút truy cập được.
  - Cả 8 game đều mở được hộp "?" giữa ván và có nút tự hoàn thành dừng ván ngay.
  - Bấm lặp 3 lần liên tiếp: chỉ ghi 1 cờ, không tạo bản ghi trùng.
  - Chơi thật sau tự hoàn thành: thành tích thật được ghi nhận bình thường.
  - Chuỗi tự hoàn thành cả 12 màn: không nhận nhầm Trang Sổ Vàng, xu hay cao trào.
- **Bản Phát hành (`scripts/p3b-check.mjs --mode=prod --size=0,1,2 --url=http://localhost:5190`):** **78/78 kiểm đạt** (26 mỗi cỡ):
  - Khách ở bản phát hành KHÔNG thấy nút ở bất kỳ màn nào trong 12 màn và 12 trạm bài học.
  - Cookie giả mạo mang cờ tự hoàn thành bị bỏ qua, màn 12 vẫn khóa theo đúng tiến độ thật.

### 4. Bổ sung mức độ bao phủ kiểm tra các vòng game (`scripts/p-game-rounds-check.mjs`)
Bộ kiểm thử tự động `node scripts/p-game-rounds-check.mjs` chạy 16 ca bao phủ toàn bộ 8 game (2 ca mỗi game: vòng đầu/trạng thái bình thường và vòng cuối/trạng thái overlay đặc biệt):
- **Thao tác thật tại tọa độ:** Không chỉ dựa vào sự tồn tại của DOM hay `z-index`, script mô phỏng `touchscreen.tap` / `mouse.click` trực tiếp vào tọa độ trung tâm của nút `[data-testid="nut-goi-y"]`.
- **Hộp "?" nổi phía trên lớp active:** Xác nhận hộp `[data-testid="hop-goi-y"]` mở đè lên các overlay câu hỏi giữa ván (`QuizOverlay` `z-30` ở Màn 2), câu hỏi cổng làng (Màn 6), trạng thái trùm (Màn 5), giữ sổ 45s (Màn 3), nạp đạn (Màn 9), vòng cuối tráo thẻ (Màn 8), cây 3 (Màn 11), depth 6 (Màn 12).
- **Dừng ván ngay lập tức:** Bấm nút `[data-testid="nut-tu-hoan-thanh"]` bên trong hộp "?"; xác minh khung chơi và nút "?" bị gỡ hoàn toàn khỏi DOM, hiển thị khung `[data-testid="da-tu-hoan-thanh"]`.
- **Kết quả:** **64/64 kiểm đạt** (4 tiêu chí × 16 ca; chi tiết tại `docs/screenshots/p3b/ket-qua-vong-game.json`).

### 5. Giới hạn chưa xác minh
- Tài khoản Supabase production thật và migration 0003 trên server thật (vẫn giữ nguyên trạng thái chưa nghiệm thu Supabase thật; không tự áp migration production).

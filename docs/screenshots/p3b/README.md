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

Chạy lại sau sửa: `p3b-check.mjs --mode=dev --only=levels,double,mid` **207 kiểm đạt** (3 cỡ). Các kịch bản dev còn lại (`real`, `all12`) và bản phát hành cho khách (`--mode=prod`) không đổi logic và chưa chạy lại.

## Chưa xác minh

- **Bổ sung (tương thích và kiểm quyền):** cờ đi đường đẩy riêng, nút vô hiệu khi máy chủ chưa chạy 0003; migration 0003 kiểm trên PostgreSQL biệt lập 51/51 đạt (không phải Supabase thật), xem `KIEM-SUPABASE.md` (cách chạy, điều kiện còn thiếu, `pnpm rls:check` thoát mã 2 vì thiếu `.env.local`).
- **Tài khoản giáo viên thật và Supabase:** không có môi trường nên chưa kiểm ở trình duyệt với tài khoản giáo viên, chưa chạy migration 0003 và `pnpm rls:check`. Đã kiểm bằng test: quyền thấy nút (`canUseAutoComplete`), manager không đẩy cờ khi chưa được phép và đẩy đúng một bản ghi khi được phép, hàng Supabase, trang giáo viên; nút giáo viên được kiểm gián tiếp bằng bản dev. **Chạy migration 0003 TRƯỚC khi triển khai bản này**: học sinh không bị ảnh hưởng (không bao giờ gửi cột mới), nhưng nếu giáo viên bấm nút khi cột chưa có thì lần đẩy tiến độ chứa cờ đó lỗi (cột không tồn tại) và tiến độ của chính tài khoản giáo viên đó chưa đồng bộ được cho tới khi chạy migration.
- Học sinh vẫn có thể tự sửa `completed`/`played` của chính mình qua API (đã vậy từ trước, spec 02 mục 4 ghi chú); migration chỉ chặn cờ tự hoàn thành, không đổi điều đó.
- Thiết bị thật, Safari/iPhone; chạm giả lập bằng Chrome; màn 6 ở 360×800 chơi sau khi xoay ngang.

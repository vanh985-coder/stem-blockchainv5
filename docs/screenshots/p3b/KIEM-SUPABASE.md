# Kiểm migration 0003 và quyền (P3b) — cách chạy và kết quả

## Đã làm được: kiểm trên PostgreSQL biệt lập (KHÔNG phải Supabase thật)

`bash scripts/db-test-p3b.sh` tạo cơ sở dữ liệu mới `p3b_test`, dựng "vỏ Supabase" tối thiểu (`supabase/tests/00_stub_supabase.sql`: vai trò `anon`/`authenticated`, `auth.users`, `auth.uid()` đọc `request.jwt.claim.sub`), áp `0001`, `0002`, chạy pha 1 (`10_p3b_before.sql`, TRƯỚC 0003), áp `0003`, chạy pha 2 (`20_p3b_after.sql`), áp `0003` lần nữa (phải êm), in từng kiểm tra, rồi xóa cơ sở dữ liệu thử. Không đụng Supabase production.

```bash
docker run --rm -d --name p3b-pg -e POSTGRES_PASSWORD=pw -p 55432:5432 postgres:16
```

```bash
PGHOST=localhost PGPORT=55432 PGUSER=postgres PGPASSWORD=pw bash scripts/db-test-p3b.sh
```

Postgres cài sẵn trên máy: `PSQL_PREFIX="runuser -u postgres --" bash scripts/db-test-p3b.sh`. Supabase local (`supabase start`, cổng 54322): thêm `SKIP_STUB=1`.

**Kết quả thực tế (29/10/2026, PostgreSQL 16, 1 lượt): 51/51 kiểm đạt.** Gồm: dữ liệu cũ nguyên vẹn sau 0003; cột `boolean not null default false`; RLS vẫn bật; giáo viên và admin đặt/bật/tắt được cờ (INSERT, UPDATE, upsert) mà `played`/`completed`/`stars`/`best_score`/xu/trang không đổi; học sinh INSERT, UPDATE, upsert ON CONFLICT, xóa rồi chèn lại, INSERT…SELECT đặt cờ đều lỗi `P0001`; học sinh vẫn ghi tiến độ thật bình thường; học sinh không đổi `role` của mình thành teacher/admin (`protect_profile`) và sau khi thử vẫn không đặt được cờ; học sinh khác không đọc/sửa/chèn tiến độ người khác; giáo viên chỉ đọc học sinh trong lớp mình, không sửa của học sinh; `class_progress` có thêm cột `auto_completed`, chỉ chủ lớp và admin nhận dữ liệu. Máy chủ chưa áp 0003 báo `42703` khi gửi cột mới (lỗi thật lưu để test mã phân loại).

Hai test vitest dùng dữ liệu thật từ lượt chạy này (bỏ qua khi thiếu biến môi trường):

```bash
P3B_ROWS_JSON=/tmp/p3b_class_progress.json P3B_ERR_FILE=/tmp/p3b_err_missing_column.txt pnpm vitest run packages/core/src/teacher/dbRows.test.ts
```

## CHƯA nghiệm thu (điều kiện còn thiếu)

Lượt trên chỉ chứng minh SQL của migration, trigger và RLS. Chưa kiểm được: PostgREST (cách `upsert`/`select('*')` đi qua API thật), GoTrue và JWT thật (`auth.uid()` ở đây là giả), tài khoản giáo viên thật, trang giáo viên và CSV với dữ liệu từ API thật. `pnpm rls:check` thoát mã 2: "Thiếu VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY hoặc VITE_USERNAME_EMAIL_DOMAIN trong .env.local" (không có `.env.local` hay dự án Supabase TEST trên máy này). **Phần quyền máy chủ chưa được ghi là đã nghiệm thu.**

Để nghiệm thu: tạo dự án Supabase TEST (không dùng production), áp `0001`, `0002`, `0003` ở SQL Editor, tạo hai tài khoản giáo viên rồi đặt `.env.local` (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_USERNAME_EMAIL_DOMAIN, TEST_TEACHER_A_USER/_PASS, TEST_TEACHER_B_USER/_PASS), chạy `pnpm rls:check`; ca (3b) phải báo học sinh bị chặn, ca (9) giáo viên đặt được. Ghi kết quả vào `TRANG-THAI.md`.

## Cần xử lý trước khi dùng thật (có từ trước P3b, chưa sửa)

Học sinh vẫn tự sửa được `completed`, `played`, `stars`, `best_score`, `coins`, `golden_pages` của chính mình qua API (RLS cho ghi hàng của mình; migration 0003 chỉ chặn cờ tự hoàn thành). Cần trigger hoặc hàm máy chủ kiểm trước khi bảng điểm được dùng để chấm điểm thật.

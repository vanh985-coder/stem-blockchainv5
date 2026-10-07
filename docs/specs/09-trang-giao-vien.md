# SPEC 09 — TRANG GIÁO VIÊN

**Làm ở mốc 1.**

**Nằm ở** `apps/hub`, route `/giao-vien`. Chỉ hiện với tài khoản có `role` là `teacher` hoặc `admin` (spec 02).

## 1. Chức năng

**Danh sách lớp:**
- Nút "Tạo lớp": nhập tên lớp, gọi `create_class`.
- Sau khi tạo, hiện **mã lớp 6 ký tự** thật to, có nút "Sao chép", kèm lời dặn: "Học sinh vào Hồ sơ → Nhập mã lớp → Vào lớp."

**Trang một lớp**, gồm 3 tab:

| Tab | Nội dung |
|---|---|
| **Tiến độ** | Bảng: mỗi hàng một học sinh, mỗi cột một màn (1–12), thêm cột Trang Sổ Vàng (0–4), tổng sao, lần chơi gần nhất |
| **Câu hỏi** | Mỗi câu một hàng: nội dung câu, số lượt trả lời, tỉ lệ đúng; câu có tỉ lệ đúng thấp nhất xếp trên cùng |
| **Học sinh** | Danh sách, có nút "Đặt lại mật khẩu" (chỉ cho tài khoản tên đăng nhập) và "Xóa khỏi lớp" (hỏi xác nhận) |

**Ký hiệu trong ô của bảng tiến độ:**
- Chưa chơi: ô trống.
- Bài học: số sao (★ 0–3) của từng trạm Dễ / Trung bình / Khó.
- Game: ✓ nếu đã chơi, kèm mốc đồng / bạc / vàng nếu đạt.

**Tab Tiến độ còn có:**
- Ô tìm theo tên.
- Lọc "Chưa xong làng …".
- Nút **"Xuất CSV"**: file UTF-8 có BOM để Excel đọc đúng tiếng Việt.

**Bấm vào tên một học sinh:** xem chi tiết sao từng trạm, điểm cao nhất từng game, và tỉ lệ trả lời đúng.

**Quyền riêng tư:** giáo viên chỉ thấy tên hiển thị, không thấy email.

## 2. Dữ liệu — `supabase/migrations/0002_teacher.sql`

```sql
create or replace function public.class_progress(cid uuid)
returns table (student_id uuid, display_name text, level_id smallint, played boolean,
               completed boolean, stars jsonb, best_score int, updated_at timestamptz,
               golden_pages smallint)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, lp.level_id, lp.played, lp.completed, lp.stars,
         lp.best_score, lp.updated_at, gs.golden_pages
  from class_members m
  join profiles p on p.id = m.student_id
  left join level_progress lp on lp.user_id = p.id
  left join game_state gs on gs.user_id = p.id
  where m.class_id = cid
    and (public.is_class_teacher(cid) or public.my_role() = 'admin');
$$;

create or replace function public.class_quiz_stats(cid uuid)
returns table (question_id text, total bigint, correct bigint)
language sql stable security definer set search_path = public as $$
  select qa.question_id, count(*), count(*) filter (where qa.correct)
  from quiz_answers qa
  join class_members m on m.student_id = qa.user_id and m.class_id = cid
  where public.is_class_teacher(cid) or public.my_role() = 'admin'
  group by qa.question_id
  order by (count(*) filter (where qa.correct))::float / count(*) asc;
$$;
```

**Nội dung câu hỏi:** lấy từ `packages/core/src/content/questions.ts` theo `question_id`.

## 3. Đặt lại mật khẩu — Edge Function `teacher-reset-password`

**Đầu vào:** `{ studentId, newPassword }`, gửi kèm token đăng nhập của giáo viên.

**Các bước:**
1. Đọc người gọi từ token. Nếu không đăng nhập thì trả lỗi 401.
2. Dùng client có service role, kiểm tra học sinh có thuộc một lớp do người gọi làm giáo viên không. Không thuộc thì trả lỗi 403.
3. Kiểm tra email của học sinh có đuôi `@hs.ten-mien.vn` không (tức tài khoản tên đăng nhập). Tài khoản Google thì trả lỗi: "Tài khoản Google không có mật khẩu để đặt lại."
4. `newPassword` phải có ít nhất 8 ký tự.
5. Gọi `auth.admin.updateUserById(studentId, { password: newPassword })`.
6. Trả kết quả thành công.

**Không ghi mật khẩu vào log.** Triển khai bằng `supabase functions deploy teacher-reset-password`.

**Trên giao diện:**
- Giáo viên nhập mật khẩu mới, hoặc bấm "Tạo ngẫu nhiên" để tạo mật khẩu 8 ký tự dễ đọc (không có 0/O, 1/l).
- Đặt xong, hiện mật khẩu mới **một lần** để đọc cho học sinh.

## Checklist nghiệm thu

- [ ] Giáo viên tạo lớp và thấy mã lớp. Học sinh nhập mã thì vào lớp.
- [ ] Bảng tiến độ đúng với tiến độ thật của học sinh thử. Xuất CSV mở bằng Excel không lỗi dấu.
- [ ] Tab Câu hỏi hiện đúng tỉ lệ đúng.
- [ ] Đặt lại mật khẩu được cho tài khoản tên đăng nhập. Tài khoản Google báo đúng lỗi.
- [ ] Giáo viên A không thấy lớp và học sinh của giáo viên B. Học sinh không vào được `/giao-vien`.

-- P3b: cờ "tự hoàn thành" cho giáo viên/admin (và bản dev). Chạy trong Supabase SQL Editor sau 0002_teacher.sql.
--
-- Cờ chỉ ghi nhận "màn này được bấm tự hoàn thành để đi tiếp". Nó KHÔNG phải kết quả chơi: không đổi played, completed, stars, best_score,
-- không tạo xu, không tạo Trang Sổ Vàng. Chơi thật sau đó vẫn lưu bình thường vào các cột cũ.
--
-- Quyền do MÁY CHỦ quyết, không tin frontend: chỉ người có vai trò teacher/admin (my_role) mới đặt được cờ.
-- auth.uid() rỗng = sửa từ Table Editor/SQL Editor (quyền chủ dự án) → cho phép, như protect_profile ở 0001.

alter table public.level_progress
  add column if not exists auto_completed boolean not null default false;

create or replace function public.protect_auto_completed() returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null and coalesce(public.my_role(), '') not in ('teacher', 'admin') then
    if tg_op = 'INSERT' and new.auto_completed then
      raise exception 'Chỉ giáo viên mới dùng được tự hoàn thành';
    elsif tg_op = 'UPDATE' and new.auto_completed is distinct from old.auto_completed then
      raise exception 'Chỉ giáo viên mới dùng được tự hoàn thành';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_protect_auto_completed on public.level_progress;
create trigger trg_protect_auto_completed before insert or update on public.level_progress
for each row execute function public.protect_auto_completed();

-- Trang giáo viên: thêm cột auto_completed để phân biệt hoàn thành thật và tự hoàn thành.
-- Đổi cột trả về nên phải xóa hàm cũ rồi tạo lại.
drop function if exists public.class_progress(uuid);
create function public.class_progress(cid uuid)
returns table (student_id uuid, display_name text, level_id smallint, played boolean,
               completed boolean, stars jsonb, best_score int, updated_at timestamptz,
               golden_pages smallint, auto_completed boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, lp.level_id, lp.played, lp.completed, lp.stars,
         lp.best_score, lp.updated_at, gs.golden_pages, lp.auto_completed
  from class_members m
  join profiles p on p.id = m.student_id
  left join level_progress lp on lp.user_id = p.id
  left join game_state gs on gs.user_id = p.id
  where m.class_id = cid
    and (public.is_class_teacher(cid) or public.my_role() = 'admin');
$$;

-- ===== Bảng =====
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  username text unique check (username ~ '^[a-z0-9_]{3,20}$'),
  role text not null default 'student' check (role in ('student','teacher','admin')),
  character_id text not null default 'hoc-sinh-nam',
  created_at timestamptz not null default now()
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  join_code text not null unique check (join_code ~ '^[A-Z0-9]{6}$'),
  created_at timestamptz not null default now()
);

create table public.class_members (
  class_id uuid references public.classes(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, student_id)
);

create table public.level_progress (
  user_id uuid references public.profiles(id) on delete cascade,
  level_id smallint check (level_id between 1 and 12),
  played boolean not null default false,
  completed boolean not null default false,
  stars jsonb not null default '{}'::jsonb,      -- bài học: {"de":3,"tb":2,"kho":1}; game: {"game":2}
  best_score integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, level_id)
);

create table public.game_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  golden_pages smallint not null default 0 check (golden_pages between 0 and 4),
  coins integer not null default 0 check (coins >= 0),
  data jsonb not null default '{}'::jsonb,       -- cờ truyện, cài đặt, đồ mặc…
  updated_at timestamptz not null default now()
);

create table public.quiz_answers (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  level_id smallint not null check (level_id between 0 and 12),  -- 0 = thử thách cuối
  question_id text not null,
  correct boolean not null,
  created_at timestamptz not null default now()
);

-- ===== Hàm hỗ trợ (security definer để tránh vòng lặp RLS) =====
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function public.is_class_teacher(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from classes where id = cid and teacher_id = auth.uid());
$$;

create or replace function public.is_class_member(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from class_members where class_id = cid and student_id = auth.uid());
$$;

create or replace function public.is_teacher_of(student uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from class_members m join classes c on c.id = m.class_id
    where m.student_id = student and c.teacher_id = auth.uid()
  );
$$;

-- ===== Tạo hồ sơ khi có tài khoản mới =====
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name, username)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
                  nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
                  'Học sinh'), 40),
    new.raw_user_meta_data->>'username'
  );
  insert into game_state (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ===== Không cho tự đổi vai trò hoặc tên đăng nhập =====
-- auth.uid() rỗng = sửa từ Table Editor/SQL Editor (quyền chủ dự án) → cho phép.
-- Người dùng gọi qua API luôn có auth.uid(); RLS đã chặn khách chưa đăng nhập.
create or replace function public.protect_profile() returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null
     and (new.role is distinct from old.role or new.username is distinct from old.username)
     and coalesce(public.my_role(), '') <> 'admin' then
    raise exception 'Không được đổi vai trò hoặc tên đăng nhập';
  end if;
  return new;
end $$;

create trigger trg_protect_profile before update on public.profiles
for each row execute function public.protect_profile();

-- ===== Vào lớp bằng mã, tạo lớp =====
create or replace function public.join_class(code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'Cần đăng nhập'; end if;
  select id into cid from classes where join_code = upper(trim(code));
  if cid is null then raise exception 'Mã lớp không đúng'; end if;
  insert into class_members (class_id, student_id) values (cid, auth.uid())
  on conflict do nothing;
  return cid;
end $$;

create or replace function public.create_class(class_name text) returns public.classes
language plpgsql security definer set search_path = public as $$
declare c public.classes; code text;
begin
  if coalesce(public.my_role(), '') not in ('teacher','admin') then
    raise exception 'Chỉ giáo viên mới tạo được lớp';
  end if;
  loop
    code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from classes where join_code = code);
  end loop;
  insert into classes (teacher_id, name, join_code)
  values (auth.uid(), class_name, code) returning * into c;
  return c;
end $$;

-- ===== RLS =====
alter table public.profiles       enable row level security;
alter table public.classes        enable row level security;
alter table public.class_members  enable row level security;
alter table public.level_progress enable row level security;
alter table public.game_state     enable row level security;
alter table public.quiz_answers   enable row level security;

create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_teacher_of(id) or public.my_role() = 'admin');
create policy profiles_update on public.profiles for update
  using (id = auth.uid() or public.my_role() = 'admin')
  with check (id = auth.uid() or public.my_role() = 'admin');

create policy classes_select on public.classes for select
  using (teacher_id = auth.uid() or public.is_class_member(id) or public.my_role() = 'admin');
create policy classes_write on public.classes for update
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy classes_delete on public.classes for delete
  using (teacher_id = auth.uid());
-- Tạo lớp chỉ qua create_class()

create policy members_select on public.class_members for select
  using (student_id = auth.uid() or public.is_class_teacher(class_id) or public.my_role() = 'admin');
create policy members_delete on public.class_members for delete
  using (student_id = auth.uid() or public.is_class_teacher(class_id));
-- Thêm thành viên chỉ qua join_class()

create policy lp_own on public.level_progress for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy lp_teacher on public.level_progress for select
  using (public.is_teacher_of(user_id) or public.my_role() = 'admin');

create policy gs_own on public.game_state for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy gs_teacher on public.game_state for select
  using (public.is_teacher_of(user_id) or public.my_role() = 'admin');

create policy qa_insert on public.quiz_answers for insert
  with check (user_id = auth.uid());
create policy qa_select on public.quiz_answers for select
  using (user_id = auth.uid() or public.is_teacher_of(user_id) or public.my_role() = 'admin');

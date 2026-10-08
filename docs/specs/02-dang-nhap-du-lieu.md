# SPEC 02 — ĐĂNG NHẬP & DỮ LIỆU (mốc 1)

## Mục tiêu

- **Cách đăng nhập:** học sinh đăng nhập bằng **Google** hoặc bằng **tên đăng nhập và mật khẩu**.
- **Một lần cho mọi nơi:** đăng nhập ở web chính hay ở bất kỳ subdomain làng nào thì cũng dùng được ở mọi nơi khác.
- **Lưu lên máy chủ:** tiến độ được lưu lên Supabase, để giáo viên xem được (spec 09).
- **Chơi thử không cần tài khoản:** vẫn được, nhưng tiến độ chỉ lưu trên máy.

## 1. Thiết lập Supabase (bạn tự làm, khoảng 30 phút)

1. **Tạo project** trên supabase.com, vùng **Southeast Asia (Singapore)**. Lưu lại `Project URL` và `anon key`.
2. **Bật đăng nhập Google:**
   1. Vào Google Cloud Console, tạo **OAuth consent screen** (External, tên app, email hỗ trợ).
   2. Tạo **OAuth Client ID** loại Web application. Authorized redirect URI là `https://<project>.supabase.co/auth/v1/callback`.
   3. Dán Client ID và Secret vào Supabase, mục **Authentication → Providers → Google**.
   4. **Chuyển consent screen sang "In production"** (Publish app). Nếu để mặc định "Testing" thì chỉ tài khoản test mới đăng nhập được: bạn thử thấy chạy, nhưng tới lớp học sinh bị chặn. Với quyền cơ bản (tên, email) thường không phải chờ Google duyệt.
3. **Bật Email provider** (cho tài khoản thường):
   - **tắt "Confirm email"**;
   - độ dài mật khẩu tối thiểu 8.
4. **Authentication → URL Configuration:**
   - **Site URL:** `https://ten-mien.vn`.
   - **Redirect URLs:** `https://ten-mien.vn/**`, `https://*.ten-mien.vn/**`, `http://localhost:5173/**` … `http://localhost:5177/**`.
5. **Chạy migration** (mục 3) bằng Supabase CLI: `supabase db push`, hoặc dán vào SQL Editor.
6. **Tài khoản admin:** sau khi tự đăng ký tài khoản của bạn, vào **Table Editor → profiles**, đổi `role` của bạn thành `admin`.

## 2. Đăng nhập trong code (`packages/core/src/auth`)

### Client dùng chung

Dùng `createBrowserClient` của `@supabase/ssr`, lưu phiên đăng nhập bằng cookie trên tên miền cha. Nhờ vậy đăng nhập một lần là dùng được cho mọi subdomain:

```ts
createBrowserClient(url, anonKey, {
  cookieOptions: {
    domain: import.meta.env.VITE_COOKIE_DOMAIN || undefined, // để trống trên localhost
    path: '/', sameSite: 'lax', secure: location.protocol === 'https:',
  },
});
```

### Tài khoản thường (tên đăng nhập)

- **Quy tắc tên:** 3–20 ký tự, chỉ gồm `a-z`, `0-9`, `_`.
- **Email nội bộ:** khi đăng ký, tạo email `<ten>@hs.ten-mien.vn`. Học sinh không bao giờ thấy email này.
- **Đăng ký:** gọi `signUp`, kèm metadata `{ username, display_name }`.
- **Đăng nhập:** gọi `signInWithPassword` với email nội bộ.
- **Quên mật khẩu:** giáo viên đặt lại giúp (spec 09). Không gửi email.

### Google

- Gọi `signInWithOAuth({ provider: 'google', options: { redirectTo: location.href } })`.
- Tên hiển thị lấy từ tên tài khoản Google; học sinh sửa được.

### Các trang (nằm trong hub; vỏ làng mượn lại)

| Route | Nội dung |
|---|---|
| `/dang-nhap` | Nút lớn "Đăng nhập bằng Google"; bên dưới là ô tên đăng nhập, mật khẩu và nút "Đăng nhập"; liên kết "Tạo tài khoản" và "Chơi thử không cần tài khoản" |
| `/dang-ky` | Tên đăng nhập, tên hiển thị, mật khẩu, nhập lại mật khẩu, ô "Tôi đã đọc Quyền riêng tư"; nút "Tạo tài khoản" |
| `/ho-so` | Đổi tên hiển thị, chọn nhân vật (nam/nữ nếu có model), ô "Nhập mã lớp" và nút "Vào lớp", nút "Đăng xuất" |
| `/quyen-rieng-tu` | Thông báo quyền riêng tư (mục 6) |

**Thông báo lỗi** phải nói rõ chuyện gì xảy ra và cách xử lý:
- "Tên đăng nhập này đã có người dùng. Em thử tên khác nhé."
- "Sai tên đăng nhập hoặc mật khẩu. Quên mật khẩu thì nhờ thầy cô đặt lại."

## 3. Cơ sở dữ liệu — `supabase/migrations/0001_init.sql`

```sql
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
```

## 4. Đồng bộ tiến độ (`packages/core/src/progress`)

**Dữ liệu trên máy luôn ghi rõ của ai.** Đây là bắt buộc, vì máy ở phòng máy trường có nhiều học sinh dùng chung.

**Key lưu trong `localStorage` (chỉ cho tài khoản đăng nhập):**
- Tài khoản: `sochung.v3.u.<userId>`.
- Mỗi bản lưu ghi thêm trường `owner` (= `userId`). Code **không bao giờ** đọc hay đẩy dữ liệu của chủ khác.
- Tiến độ chơi thử **không** nằm ở `localStorage`, mà ở cookie `sc_guest` (xem bên dưới).

**Khi mở app (đã đăng nhập):**
1. **Kéo về trước:** tải `level_progress` và `game_state` của tài khoản từ Supabase.
2. **Gộp:** gộp với bản trên máy của **đúng tài khoản đó**, bằng `mergeProgress`.
3. **Ghi lại và đẩy lên:** ghi kết quả vào máy, rồi đẩy lên những gì máy có mà server chưa có.

Chưa kéo về xong thì không đẩy gì lên.

**Khi chơi:**
- Ghi vào máy ngay.
- Đang đăng nhập thì cứ sau 2 giây không có thay đổi mới, đẩy lên (`upsert`).
- Mất mạng thì xếp hàng chờ, có mạng lại thì tự gửi.

**Vì đang dùng subdomain (bắt buộc làm):** `localStorage` của mỗi tên miền con là riêng, chỉ **cookie** mới dùng chung được giữa hub và các làng.

**Xong một màn thì lưu ngay, không đợi 2 giây:**
- Hiện "Đang lưu…", đẩy lên server, **chờ xong** mới cho bấm "Về bản đồ", "Về chợ" hay "Về làng".
- Quá 5 giây hoặc mất mạng: ghi bản tóm tắt tiến độ vào cookie `sc_pending` (tên miền cha `VITE_COOKIE_DOMAIN`), rồi mới cho rời trang. Trang nào mở ra cũng đọc `sc_pending`, đẩy lên khi có mạng, xong thì xóa.

**Tiến độ chơi thử lưu trong cookie `sc_guest`** trên tên miền cha, **không** dùng `localStorage`, để bản đồ ở hub đọc được tiến độ chơi ở làng.
- **Dạng gọn:** `{"v":1,"lv":{"1":[1,1,3,2,1]},"gp":1,"c":40}`, gồm: đã chơi, xong, sao ba trạm (hoặc mốc điểm), Trang Sổ Vàng, xu. Cả 12 màn dưới 1 KB, dưới giới hạn 4 KB của cookie.
- **Thuộc tính cookie:** `Path=/; SameSite=Lax; Secure`; giữ 180 ngày.
- Mọi quy tắc "tách theo chủ" ở trên áp dụng y nguyên. Khi đăng nhập thì hỏi gộp; gộp hay không đều xóa `sc_guest`.
- **Đường lui:** nếu chưa kịp làm phần cookie, ẩn nút "Chơi thử" ở mốc 1 (trên lớp học sinh đều đăng nhập).

**Gộp dữ liệu** (`mergeProgress(local, remote)`, hàm thuần, có test):

| Dữ liệu | Cách gộp |
|---|---|
| Sao từng trạm, `best_score` | Lấy giá trị lớn hơn |
| `played`, `completed` | Bên nào là `true` thì lấy `true` |
| `golden_pages` | Lấy giá trị lớn hơn |
| `coins`, `data` | Lấy bản có `updated_at` mới hơn |

**Chơi thử rồi mới đăng nhập:**
- **Không tự gộp.** Nếu cookie `sc_guest` có tiến độ, hỏi: "Trên máy này có tiến độ chơi thử. Gộp vào tài khoản của em không? Nếu đây không phải tiến độ của em, chọn Không gộp."
- **Gộp:** gộp vào tài khoản, rồi xóa bản chơi thử.
- **Không gộp:** xóa bản chơi thử.
- Cả hai trường hợp đều xóa bản chơi thử, để học sinh sau ngồi cùng máy không bị hỏi lại.

**Đăng xuất:** xóa `sochung.v3.u.<userId>` trên máy, rồi mới thoát phiên.

**Câu trả lời trắc nghiệm:** mỗi câu ghi một dòng vào `quiz_answers` (chơi thử thì không ghi).

**Thanh trên cùng khi chơi thử:** "Em đang chơi thử, tiến độ chỉ lưu trên máy này", kèm nút "Đăng nhập để lưu".

**Ghi chú:** dữ liệu do trình duyệt tự ghi, nên một học sinh rành kỹ thuật có thể tự sửa điểm của mình. Với game học tập thì chấp nhận được.

## 5. Vai trò

| Vai trò | Được làm gì | Cách có vai trò |
|---|---|---|
| `student` | Chơi, xem tiến độ của mình, vào lớp bằng mã | Mặc định khi tạo tài khoản |
| `teacher` | Tạo lớp, xem tiến độ học sinh trong lớp mình, đặt lại mật khẩu (spec 09) | Đăng ký như thường, rồi nhờ admin đổi `role` thành `teacher` trong Table Editor |
| `admin` | Tất cả | Chính bạn |

## 6. Quyền riêng tư

Học sinh THPT phần lớn chưa đủ 18 tuổi, nên **thu ít dữ liệu nhất có thể**:
- **Chỉ lưu:** tên hiển thị, tên đăng nhập hoặc email Google, tiến độ, câu trả lời trắc nghiệm.
- **Không hỏi:** ngày sinh, số điện thoại, trường, ảnh.
- **Giáo viên** chỉ thấy tên hiển thị và tiến độ, không thấy email.
- **Trang `/quyen-rieng-tu`** nói rõ (lời lẽ đơn giản):
  - lưu những gì, để làm gì, ai xem được;
  - học sinh muốn xóa tài khoản thì nhờ thầy cô hoặc liên hệ email của nhóm.
- **Không gắn công cụ quảng cáo hay theo dõi** nào.

## Test

- **Tách dữ liệu theo chủ:**

| Tình huống | Kết quả mong đợi |
|---|---|
| A đăng nhập, chơi, đăng xuất; B đăng nhập trên cùng máy | Không có dữ liệu nào của A bị đẩy lên tài khoản B |
| Có bản chơi thử, B đăng nhập, chọn "Không gộp" | Tiến độ của B không đổi; bản chơi thử bị xóa |
| Có bản chơi thử, chọn "Gộp" | Tiến độ được gộp vào; bản chơi thử bị xóa |
| Đăng xuất | `sochung.v3.u.<id>` không còn |
| Mở app, server có `coins` mới hơn bản trên máy | Lấy theo server; không đẩy bản cũ đè lên |

- **`mergeProgress`:**

| Tình huống | Kết quả mong đợi |
|---|---|
| Sao `{de:2}` gộp với `{de:3, tb:1}` | `{de:3, tb:1}` |
| `completed` false gộp với true | `true` |
| `coins` lấy bản mới hơn | Bản có `updated_at` lớn hơn thắng |

- **Thử RLS** (ghi kết quả vào phần tóm tắt cuối):
  1. Học sinh A không đọc được tiến độ của học sinh B.
  2. Giáo viên đọc được tiến độ học sinh trong lớp mình, không đọc được học sinh lớp khác.
  3. Học sinh gọi `update profiles set role = 'teacher'` thì bị lỗi.
  4. `join_class` với mã sai báo "Mã lớp không đúng".

## Checklist nghiệm thu

- [ ] Đăng nhập Google và đăng nhập bằng tên đều chạy, trên cả hub lẫn một subdomain làng.
- [ ] Đăng nhập ở hub, mở subdomain làng: vẫn đang đăng nhập.
- [ ] Chơi thử rồi đăng nhập: có hỏi trước khi gộp.
- [ ] Hai học sinh dùng chung máy: tiến độ không lẫn sang nhau.
- [ ] Xong màn 1 ở làng rồi về bản đồ ngay: bản đồ thấy màn 1 đã xong. Thử cả khi chơi thử lẫn khi đăng nhập.
- [ ] Rút mạng ngay lúc vừa xong màn: tiến độ nằm trong `sc_pending`, có mạng lại thì tự đẩy lên.
- [ ] Tắt mạng vẫn chơi được; bật mạng lại thì tiến độ tự đẩy lên.
- [ ] 4 bài thử RLS đều đúng như mong đợi.

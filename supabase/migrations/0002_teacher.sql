-- Bước 12: dữ liệu cho trang giáo viên (spec 09 mục 2). Chạy trong Supabase SQL Editor sau 0001_init.sql.

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

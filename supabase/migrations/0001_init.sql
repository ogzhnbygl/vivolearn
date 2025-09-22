-- VivoLearn initial schema and RLS policies

begin;

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

create type public.user_role as enum ('student', 'instructor', 'admin');
create type public.enrollment_status as enum ('requested', 'approved', 'rejected');
create type public.quiz_attempt_status as enum ('in_progress', 'submitted', 'graded');

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role user_role not null default 'student',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated
before update on public.profiles
for each row execute procedure public.touch_updated_at();

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references public.profiles(id) on delete set null,
  title text not null,
  slug text unique,
  description text,
  summary text,
  cover_image_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_courses_updated
before update on public.courses
for each row execute procedure public.touch_updated_at();

create table public.course_sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(course_id, order_index)
);

create trigger trg_course_sections_updated
before update on public.course_sections
for each row execute procedure public.touch_updated_at();

create table public.course_runs (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  label text,
  enrollment_limit integer,
  access_start timestamptz not null,
  access_end timestamptz,
  application_start timestamptz,
  application_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_course_runs_updated
before update on public.course_runs
for each row execute procedure public.touch_updated_at();

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  section_id uuid not null references public.course_sections(id) on delete cascade,
  title text not null,
  slug text,
  video_url text not null,
  content text,
  order_index integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(section_id, order_index)
);

create trigger trg_lessons_updated
before update on public.lessons
for each row execute procedure public.touch_updated_at();

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_run_id uuid not null references public.course_runs(id) on delete cascade,
  status enrollment_status not null default 'requested',
  receipt_no text not null,
  note text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id, course_run_id)
);

create trigger trg_enrollments_updated
before update on public.enrollments
for each row execute procedure public.touch_updated_at();

create table public.progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_run_id uuid not null references public.course_runs(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  is_completed boolean not null default false,
  last_viewed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id, course_run_id, lesson_id)
);

create trigger trg_progress_updated
before update on public.progress
for each row execute procedure public.touch_updated_at();

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  title text not null,
  description text,
  passing_score integer not null default 0,
  duration_seconds integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_quizzes_updated
before update on public.quizzes
for each row execute procedure public.touch_updated_at();

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  prompt text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(quiz_id, order_index)
);

create trigger trg_quiz_questions_updated
before update on public.quiz_questions
for each row execute procedure public.touch_updated_at();

create table public.quiz_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  text text not null,
  is_correct boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_quiz_options_updated
before update on public.quiz_options
for each row execute procedure public.touch_updated_at();

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status quiz_attempt_status not null default 'in_progress',
  score integer,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  graded_at timestamptz,
  answers jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_quiz_attempts_updated
before update on public.quiz_attempts
for each row execute procedure public.touch_updated_at();

create index idx_course_sections_course_id on public.course_sections(course_id);
create index idx_course_runs_course_id on public.course_runs(course_id);
create index idx_lessons_course_id on public.lessons(course_id);
create index idx_enrollments_course_run_id on public.enrollments(course_run_id);
create index idx_enrollments_student_id on public.enrollments(student_id);
create index idx_progress_student_lesson on public.progress(student_id, lesson_id);
create index idx_quizzes_lesson_id on public.quizzes(lesson_id);
create index idx_quiz_questions_quiz_id on public.quiz_questions(quiz_id);
create index idx_quiz_options_question_id on public.quiz_options(question_id);
create index idx_quiz_attempts_quiz_id on public.quiz_attempts(quiz_id);

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_sections enable row level security;
alter table public.course_runs enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.progress enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_options enable row level security;
alter table public.quiz_attempts enable row level security;

-- Profiles policies
create policy "Profiles are viewable" on public.profiles
  for select using ((select auth.role()) = 'authenticated');

create policy "Users manage own profile" on public.profiles
  for update using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Admins manage profiles" on public.profiles
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'admin'
    )
  );

-- Courses policies
create policy "Courses readable by authenticated" on public.courses
  for select using ((select auth.role()) in ('authenticated', 'anon'));

create policy "Instructors create courses" on public.courses
  for insert with check (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('instructor', 'admin')
    )
  );

create policy "Owners manage courses" on public.courses
  for update using (
    instructor_id = (select auth.uid())
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'admin'
    )
  )
  with check (
    instructor_id = (select auth.uid())
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'admin'
    )
  );

-- Course sections policies
create policy "Sections readable" on public.course_sections
  for select using (
    exists (
      select 1 from public.courses c
      where c.id = course_id
        and (
          c.instructor_id = (select auth.uid())
          or exists (
            select 1 from public.enrollments e
            join public.course_runs cr on cr.id = e.course_run_id
            where e.student_id = (select auth.uid())
              and e.status = 'approved'
              and cr.course_id = c.id
          )
          or exists (
            select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'
          )
        )
    )
  );

create policy "Sections insert by owners" on public.course_sections
  for insert with check (
    exists (
      select 1 from public.courses c
      where c.id = course_id
        and (
          c.instructor_id = (select auth.uid())
          or exists (
            select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'
          )
        )
    )
  );

create policy "Sections update by owners" on public.course_sections
  for update using (
    exists (
      select 1 from public.courses c
      where c.id = course_id
        and (
          c.instructor_id = (select auth.uid())
          or exists (
            select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.courses c
      where c.id = course_id
        and (
          c.instructor_id = (select auth.uid())
          or exists (
            select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'
          )
        )
    )
  );

create policy "Sections delete by owners" on public.course_sections
  for delete using (
    exists (
      select 1 from public.courses c
      where c.id = course_id
        and (
          c.instructor_id = (select auth.uid())
          or exists (
            select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'
          )
        )
    )
  );

-- Course runs policies
create policy "Course runs readable" on public.course_runs
  for select using ((select auth.role()) in ('authenticated', 'anon'));

create policy "Owners manage course runs" on public.course_runs
  for insert with check (
    exists (
      select 1 from public.courses c
      where c.id = course_id
        and (c.instructor_id = (select auth.uid())
          or exists (
            select 1 from public.profiles p
            where p.id = (select auth.uid()) and p.role = 'admin'
          ))
    )
  );

create policy "Owners update course runs" on public.course_runs
  for update using (
    exists (
      select 1 from public.courses c
      where c.id = course_id
        and (c.instructor_id = (select auth.uid())
          or exists (
            select 1 from public.profiles p
            where p.id = (select auth.uid()) and p.role = 'admin'
          ))
    )
  )
  with check (
    exists (
      select 1 from public.courses c
      where c.id = course_id
        and (c.instructor_id = (select auth.uid())
          or exists (
            select 1 from public.profiles p
            where p.id = (select auth.uid()) and p.role = 'admin'
          ))
    )
  );

-- Lessons policies
create policy "Lessons readable with access" on public.lessons
  for select using (
    exists (
      select 1
      from public.course_sections cs
      join public.courses c on c.id = cs.course_id
      where cs.id = section_id
        and (
          c.instructor_id = (select auth.uid())
          or exists (
            select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'
          )
        )
    )
    or exists (
      select 1
      from public.enrollments e
      join public.course_runs cr on cr.id = e.course_run_id
      where e.student_id = (select auth.uid())
        and e.status = 'approved'
        and cr.course_id = (
          select cs.course_id from public.course_sections cs where cs.id = section_id
        )
        and (cr.access_start is null or now() >= cr.access_start)
        and (cr.access_end is null or now() <= cr.access_end)
    )
  );

create policy "Owners manage lessons" on public.lessons
  for insert with check (
    exists (
      select 1 from public.course_sections cs
      join public.courses c on c.id = cs.course_id
      where cs.id = section_id
        and (
          c.instructor_id = (select auth.uid())
          or exists (
            select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'
          )
        )
    )
  );

create policy "Owners update lessons" on public.lessons
  for update using (
    exists (
      select 1 from public.courses c
      where c.id = course_id
        and (c.instructor_id = (select auth.uid())
          or exists (
            select 1 from public.profiles p
            where p.id = (select auth.uid()) and p.role = 'admin'
          ))
    )
  )
  with check (
    exists (
      select 1 from public.courses c
      where c.id = course_id
        and (c.instructor_id = (select auth.uid())
          or exists (
            select 1 from public.profiles p
            where p.id = (select auth.uid()) and p.role = 'admin'
          ))
    )
  );

-- Enrollments policies
create policy "Students view own enrollments" on public.enrollments
  for select using (student_id = (select auth.uid()));

create policy "Instructors view enrollments" on public.enrollments
  for select using (
    exists (
      select 1
      from public.course_runs cr
      join public.courses c on c.id = cr.course_id
      where cr.id = course_run_id
        and (
          c.instructor_id = (select auth.uid())
          or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
        )
    )
  );

create policy "Students create enrollment requests" on public.enrollments
  for insert with check (
    student_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('student', 'instructor')
    )
  );

create policy "Instructors update enrollment status" on public.enrollments
  for update using (
    exists (
      select 1
      from public.course_runs cr
      join public.courses c on c.id = cr.course_id
      where cr.id = course_run_id
        and (
          c.instructor_id = (select auth.uid())
          or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
        )
    )
  );

-- Progress policies
create policy "Students view own progress" on public.progress
  for select using (student_id = (select auth.uid()));

create policy "Instructors view learner progress" on public.progress
  for select using (
    exists (
      select 1
      from public.course_runs cr
      join public.courses c on c.id = cr.course_id
      where cr.id = course_run_id
        and (
          c.instructor_id = (select auth.uid())
          or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
        )
    )
  );

create policy "Students manage own progress" on public.progress
  for insert with check (student_id = (select auth.uid()));

create policy "Students update own progress" on public.progress
  for update using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));

-- Quizzes policies
create policy "Quizzes readable with access" on public.quizzes
  for select using (
    exists (
      select 1 from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = lesson_id
        and (
          c.instructor_id = (select auth.uid())
          or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
        )
    )
    or exists (
      select 1
      from public.enrollments e
      join public.course_runs cr on cr.id = e.course_run_id
      join public.lessons l on l.course_id = cr.course_id
      where e.student_id = (select auth.uid())
        and e.status = 'approved'
        and l.id = lesson_id
        and (cr.access_start is null or now() >= cr.access_start)
        and (cr.access_end is null or now() <= cr.access_end)
    )
  );

create policy "Owners manage quizzes" on public.quizzes
  for insert with check (
    exists (
      select 1 from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = lesson_id
        and (
          c.instructor_id = (select auth.uid())
          or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
        )
    )
  );

create policy "Owners update quizzes" on public.quizzes
  for update using (
    exists (
      select 1 from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = lesson_id
        and (
          c.instructor_id = (select auth.uid())
          or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
        )
    )
  )
  with check (
    exists (
      select 1 from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = lesson_id
        and (
          c.instructor_id = (select auth.uid())
          or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
        )
    )
  );

-- Quiz questions policies
create policy "Questions readable with access" on public.quiz_questions
  for select using (
    exists (
      select 1 from public.quizzes q
      join public.lessons l on l.id = q.lesson_id
      join public.courses c on c.id = l.course_id
      where q.id = quiz_id
        and (
          c.instructor_id = (select auth.uid())
          or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
        )
    )
    or exists (
      select 1 from public.quiz_attempts qa
      where qa.quiz_id = quiz_id and qa.student_id = (select auth.uid())
    )
  );

create policy "Owners manage questions" on public.quiz_questions
  for insert with check (
    exists (
      select 1 from public.quizzes q
      join public.lessons l on l.id = q.lesson_id
      join public.courses c on c.id = l.course_id
      where q.id = quiz_id
        and (
          c.instructor_id = (select auth.uid())
          or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
        )
    )
  );

create policy "Owners update questions" on public.quiz_questions
  for update using (
    exists (
      select 1 from public.quizzes q
      join public.lessons l on l.id = q.lesson_id
      join public.courses c on c.id = l.course_id
      where q.id = quiz_id
        and (
          c.instructor_id = (select auth.uid())
          or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
        )
    )
  )
  with check (
    exists (
      select 1 from public.quizzes q
      join public.lessons l on l.id = q.lesson_id
      join public.courses c on c.id = l.course_id
      where q.id = quiz_id
        and (
          c.instructor_id = (select auth.uid())
          or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
        )
    )
  );

-- Quiz options policies
create policy "Options readable with access" on public.quiz_options
  for select using (
    exists (
      select 1 from public.quiz_questions qq
      join public.quizzes q on q.id = qq.quiz_id
      join public.lessons l on l.id = q.lesson_id
      join public.courses c on c.id = l.course_id
      where qq.id = question_id
        and (
          c.instructor_id = (select auth.uid())
          or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
        )
    )
    or exists (
      select 1 from public.quiz_attempts qa
      where qa.quiz_id = (
        select qq.quiz_id from public.quiz_questions qq where qq.id = question_id
      )
        and qa.student_id = (select auth.uid())
    )
  );

create policy "Owners manage options" on public.quiz_options
  for insert with check (
    exists (
      select 1 from public.quiz_questions qq
      join public.quizzes q on q.id = qq.quiz_id
      join public.lessons l on l.id = q.lesson_id
      join public.courses c on c.id = l.course_id
      where qq.id = question_id
        and (
          c.instructor_id = (select auth.uid())
          or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
        )
    )
  );

create policy "Owners update options" on public.quiz_options
  for update using (
    exists (
      select 1 from public.quiz_questions qq
      join public.quizzes q on q.id = qq.quiz_id
      join public.lessons l on l.id = q.lesson_id
      join public.courses c on c.id = l.course_id
      where qq.id = question_id
        and (
          c.instructor_id = (select auth.uid())
          or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
        )
    )
  )
  with check (
    exists (
      select 1 from public.quiz_questions qq
      join public.quizzes q on q.id = qq.quiz_id
      join public.lessons l on l.id = q.lesson_id
      join public.courses c on c.id = l.course_id
      where qq.id = question_id
        and (
          c.instructor_id = (select auth.uid())
          or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
        )
    )
  );

-- Quiz attempts policies
create policy "Students view own attempts" on public.quiz_attempts
  for select using (student_id = (select auth.uid()));

create policy "Instructors view attempts" on public.quiz_attempts
  for select using (
    exists (
      select 1
      from public.quizzes q
      join public.lessons l on l.id = q.lesson_id
      join public.courses c on c.id = l.course_id
      where q.id = quiz_id
        and (
          c.instructor_id = (select auth.uid())
          or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
        )
    )
  );

create policy "Students start attempts" on public.quiz_attempts
  for insert with check (
    student_id = (select auth.uid())
    and exists (
      select 1
      from public.enrollments e
      join public.course_runs cr on cr.id = e.course_run_id
      join public.lessons l on l.course_id = cr.course_id
      join public.quizzes q on q.lesson_id = l.id
      where q.id = quiz_id
        and e.student_id = (select auth.uid())
        and e.status = 'approved'
    )
  );

create policy "Students update own attempts" on public.quiz_attempts
  for update using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));

create policy "Instructors grade attempts" on public.quiz_attempts
  for update using (
    exists (
      select 1
      from public.quizzes q
      join public.lessons l on l.id = q.lesson_id
      join public.courses c on c.id = l.course_id
      where q.id = quiz_id
        and (
          c.instructor_id = (select auth.uid())
          or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
        )
    )
  );

commit;

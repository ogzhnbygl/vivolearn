begin;

-- Helper functions to avoid repeated auth lookups inside policies
create or replace function public.current_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid();
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select auth.role();
$$;

create or replace function public.current_user_has_any_role(target_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = public.current_user_id()
      and p.role = any(target_roles)
  );
$$;

create or replace function public.current_user_has_role(target_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_has_any_role(array[target_role]);
$$;

-- Profiles policies
alter policy "Profiles are viewable" on public.profiles
  using ((select public.current_user_role()) = 'authenticated');

drop policy if exists "Users manage own profile" on public.profiles;
drop policy if exists "Admins manage profiles" on public.profiles;

create policy "Manage profiles" on public.profiles
  for update
  using (
    (select public.current_user_id()) = id
    or (select public.current_user_has_role('admin'))
  )
  with check (
    (select public.current_user_id()) = id
    or (select public.current_user_has_role('admin'))
  );

-- Courses policies
alter policy "Courses readable by authenticated" on public.courses
  using ((select public.current_user_role()) in ('authenticated', 'anon'));

alter policy "Instructors create courses" on public.courses
  with check (
    (select public.current_user_has_any_role(ARRAY['instructor','admin']))
  );

alter policy "Owners manage courses" on public.courses
  using (
    instructor_id = (select public.current_user_id())
    or (select public.current_user_has_role('admin'))
  )
  with check (
    instructor_id = (select public.current_user_id())
    or (select public.current_user_has_role('admin'))
  );

-- Course sections policies
alter policy "Sections readable" on public.course_sections
  using (
    exists (
      select 1
      from public.courses c
      where c.id = course_id
        and (
          c.instructor_id = (select public.current_user_id())
          or exists (
            select 1
            from public.enrollments e
            join public.course_runs cr on cr.id = e.course_run_id
            where e.student_id = (select public.current_user_id())
              and e.status = 'approved'
              and cr.course_id = c.id
          )
          or (select public.current_user_has_role('admin'))
        )
    )
  );

alter policy "Sections insert by owners" on public.course_sections
  with check (
    exists (
      select 1
      from public.courses c
      where c.id = course_id
        and (
          c.instructor_id = (select public.current_user_id())
          or (select public.current_user_has_role('admin'))
        )
    )
  );

alter policy "Sections update by owners" on public.course_sections
  using (
    exists (
      select 1
      from public.courses c
      where c.id = course_id
        and (
          c.instructor_id = (select public.current_user_id())
          or (select public.current_user_has_role('admin'))
        )
    )
  )
  with check (
    exists (
      select 1
      from public.courses c
      where c.id = course_id
        and (
          c.instructor_id = (select public.current_user_id())
          or (select public.current_user_has_role('admin'))
        )
    )
  );

alter policy "Sections delete by owners" on public.course_sections
  using (
    exists (
      select 1
      from public.courses c
      where c.id = course_id
        and (
          c.instructor_id = (select public.current_user_id())
          or (select public.current_user_has_role('admin'))
        )
    )
  );

-- Course runs policies
alter policy "Course runs readable" on public.course_runs
  using ((select public.current_user_role()) in ('authenticated', 'anon'));

alter policy "Owners manage course runs" on public.course_runs
  with check (
    exists (
      select 1
      from public.courses c
      where c.id = course_id
        and (
          c.instructor_id = (select public.current_user_id())
          or (select public.current_user_has_role('admin'))
        )
    )
  );

alter policy "Owners update course runs" on public.course_runs
  using (
    exists (
      select 1
      from public.courses c
      where c.id = course_id
        and (
          c.instructor_id = (select public.current_user_id())
          or (select public.current_user_has_role('admin'))
        )
    )
  )
  with check (
    exists (
      select 1
      from public.courses c
      where c.id = course_id
        and (
          c.instructor_id = (select public.current_user_id())
          or (select public.current_user_has_role('admin'))
        )
    )
  );

-- Lessons policies
alter policy "Lessons readable with access" on public.lessons
  using (
    exists (
      select 1
      from public.course_sections cs
      join public.courses c on c.id = cs.course_id
      where cs.id = section_id
        and (
          c.instructor_id = (select public.current_user_id())
          or (select public.current_user_has_role('admin'))
        )
    )
    or exists (
      select 1
      from public.enrollments e
      join public.course_runs cr on cr.id = e.course_run_id
      where e.student_id = (select public.current_user_id())
        and e.status = 'approved'
        and cr.course_id = (
          select cs.course_id from public.course_sections cs where cs.id = section_id
        )
        and (cr.access_start is null or now() >= cr.access_start)
        and (cr.access_end is null or now() <= cr.access_end)
    )
  );

alter policy "Owners manage lessons" on public.lessons
  with check (
    exists (
      select 1
      from public.course_sections cs
      join public.courses c on c.id = cs.course_id
      where cs.id = section_id
        and (
          c.instructor_id = (select public.current_user_id())
          or (select public.current_user_has_role('admin'))
        )
    )
  );

alter policy "Owners update lessons" on public.lessons
  using (
    exists (
      select 1
      from public.courses c
      where c.id = course_id
        and (
          c.instructor_id = (select public.current_user_id())
          or (select public.current_user_has_role('admin'))
        )
    )
  )
  with check (
    exists (
      select 1
      from public.courses c
      where c.id = course_id
        and (
          c.instructor_id = (select public.current_user_id())
          or (select public.current_user_has_role('admin'))
        )
    )
  );

-- Enrollments policies
drop policy if exists "Students view own enrollments" on public.enrollments;
drop policy if exists "Instructors view enrollments" on public.enrollments;

create policy "Access enrollments" on public.enrollments
  for select
  using (
    student_id = (select public.current_user_id())
    or exists (
      select 1
      from public.course_runs cr
      join public.courses c on c.id = cr.course_id
      where cr.id = course_run_id
        and (
          c.instructor_id = (select public.current_user_id())
          or (select public.current_user_has_role('admin'))
        )
    )
  );

alter policy "Students create enrollment requests" on public.enrollments
  with check (
    student_id = (select public.current_user_id())
    and (select public.current_user_has_any_role(ARRAY['student','instructor']))
  );

alter policy "Instructors update enrollment status" on public.enrollments
  using (
    exists (
      select 1
      from public.course_runs cr
      join public.courses c on c.id = cr.course_id
      where cr.id = course_run_id
        and (
          c.instructor_id = (select public.current_user_id())
          or (select public.current_user_has_role('admin'))
        )
    )
  );

-- Progress policies
drop policy if exists "Students view own progress" on public.progress;
drop policy if exists "Instructors view learner progress" on public.progress;

create policy "Access progress" on public.progress
  for select
  using (
    student_id = (select public.current_user_id())
    or exists (
      select 1
      from public.course_runs cr
      join public.courses c on c.id = cr.course_id
      where cr.id = course_run_id
        and (
          c.instructor_id = (select public.current_user_id())
          or (select public.current_user_has_role('admin'))
        )
    )
  );

alter policy "Students manage own progress" on public.progress
  with check (student_id = (select public.current_user_id()));

alter policy "Students update own progress" on public.progress
  using (student_id = (select public.current_user_id()))
  with check (student_id = (select public.current_user_id()));

-- Quizzes policies
alter policy "Quizzes readable with access" on public.quizzes
  using (
    exists (
      select 1
      from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = lesson_id
        and (
          c.instructor_id = (select public.current_user_id())
          or (select public.current_user_has_role('admin'))
        )
    )
    or exists (
      select 1
      from public.enrollments e
      join public.course_runs cr on cr.id = e.course_run_id
      join public.lessons l on l.course_id = cr.course_id
      where e.student_id = (select public.current_user_id())
        and e.status = 'approved'
        and l.id = lesson_id
        and (cr.access_start is null or now() >= cr.access_start)
        and (cr.access_end is null or now() <= cr.access_end)
    )
  );

alter policy "Owners manage quizzes" on public.quizzes
  with check (
    exists (
      select 1
      from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = lesson_id
        and (
          c.instructor_id = (select public.current_user_id())
          or (select public.current_user_has_role('admin'))
        )
    )
  );

alter policy "Owners update quizzes" on public.quizzes
  using (
    exists (
      select 1
      from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = lesson_id
        and (
          c.instructor_id = (select public.current_user_id())
          or (select public.current_user_has_role('admin'))
        )
    )
  )
  with check (
    exists (
      select 1
      from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = lesson_id
        and (
          c.instructor_id = (select public.current_user_id())
          or (select public.current_user_has_role('admin'))
        )
    )
  );

-- Quiz questions policies
alter policy "Questions readable with access" on public.quiz_questions
  using (
    exists (
      select 1
      from public.quizzes q
      join public.lessons l on l.id = q.lesson_id
      join public.courses c on c.id = l.course_id
      where q.id = quiz_id
        and (
          c.instructor_id = (select public.current_user_id())
          or (select public.current_user_has_role('admin'))
        )
    )
    or exists (
      select 1
      from public.quiz_attempts qa
      where qa.quiz_id = quiz_id
        and qa.student_id = (select public.current_user_id())
    )
  );

alter policy "Owners manage questions" on public.quiz_questions
  with check (
    exists (
      select 1
      from public.quizzes q
      join public.lessons l on l.id = q.lesson_id
      join public.courses c on c.id = l.course_id
      where q.id = quiz_id
        and (
          c.instructor_id = (select public.current_user_id())
          or (select public.current_user_has_role('admin'))
        )
    )
  );

alter policy "Owners update questions" on public.quiz_questions
  using (
    exists (
      select 1
      from public.quizzes q
      join public.lessons l on l.id = q.lesson_id
      join public.courses c on c.id = l.course_id
      where q.id = quiz_id
        and (
          c.instructor_id = (select public.current_user_id())
          or (select public.current_user_has_role('admin'))
        )
    )
  )
  with check (
    exists (
      select 1
      from public.quizzes q
      join public.lessons l on l.id = q.lesson_id
      join public.courses c on c.id = l.course_id
      where q.id = quiz_id
        and (
          c.instructor_id = (select public.current_user_id())
          or (select public.current_user_has_role('admin'))
        )
    )
  );

-- Quiz options policies
alter policy "Options readable with access" on public.quiz_options
  using (
    exists (
      select 1
      from public.quiz_questions qq
      join public.quizzes q on q.id = qq.quiz_id
      join public.lessons l on l.id = q.lesson_id
      join public.courses c on c.id = l.course_id
      where qq.id = question_id
        and (
          c.instructor_id = (select public.current_user_id())
          or (select public.current_user_has_role('admin'))
        )
    )
    or exists (
      select 1
      from public.quiz_attempts qa
      where qa.quiz_id = (
        select qq.quiz_id from public.quiz_questions qq where qq.id = question_id
      )
        and qa.student_id = (select public.current_user_id())
    )
  );

alter policy "Owners manage options" on public.quiz_options
  with check (
    exists (
      select 1
      from public.quiz_questions qq
      join public.quizzes q on q.id = qq.quiz_id
      join public.lessons l on l.id = q.lesson_id
      join public.courses c on c.id = l.course_id
      where qq.id = question_id
        and (
          c.instructor_id = (select public.current_user_id())
          or (select public.current_user_has_role('admin'))
        )
    )
  );

alter policy "Owners update options" on public.quiz_options
  using (
    exists (
      select 1
      from public.quiz_questions qq
      join public.quizzes q on q.id = qq.quiz_id
      join public.lessons l on l.id = q.lesson_id
      join public.courses c on c.id = l.course_id
      where qq.id = question_id
        and (
          c.instructor_id = (select public.current_user_id())
          or (select public.current_user_has_role('admin'))
        )
    )
  )
  with check (
    exists (
      select 1
      from public.quiz_questions qq
      join public.quizzes q on q.id = qq.quiz_id
      join public.lessons l on l.id = q.lesson_id
      join public.courses c on c.id = l.course_id
      where qq.id = question_id
        and (
          c.instructor_id = (select public.current_user_id())
          or (select public.current_user_has_role('admin'))
        )
    )
  );

-- Quiz attempts policies
drop policy if exists "Students view own attempts" on public.quiz_attempts;
drop policy if exists "Instructors view attempts" on public.quiz_attempts;

create policy "Access quiz attempts" on public.quiz_attempts
  for select
  using (
    student_id = (select public.current_user_id())
    or exists (
      select 1
      from public.quizzes q
      join public.lessons l on l.id = q.lesson_id
      join public.courses c on c.id = l.course_id
      where q.id = quiz_id
        and (
          c.instructor_id = (select public.current_user_id())
          or (select public.current_user_has_role('admin'))
        )
    )
  );

drop policy if exists "Students update own attempts" on public.quiz_attempts;
drop policy if exists "Instructors grade attempts" on public.quiz_attempts;

create policy "Modify quiz attempts" on public.quiz_attempts
  for update
  using (
    student_id = (select public.current_user_id())
    or exists (
      select 1
      from public.quizzes q
      join public.lessons l on l.id = q.lesson_id
      join public.courses c on c.id = l.course_id
      where q.id = quiz_id
        and (
          c.instructor_id = (select public.current_user_id())
          or (select public.current_user_has_role('admin'))
        )
    )
  )
  with check (
    student_id = (select public.current_user_id())
    or exists (
      select 1
      from public.quizzes q
      join public.lessons l on l.id = q.lesson_id
      join public.courses c on c.id = l.course_id
      where q.id = quiz_id
        and (
          c.instructor_id = (select public.current_user_id())
          or (select public.current_user_has_role('admin'))
        )
    )
  );

alter policy "Students start attempts" on public.quiz_attempts
  with check (
    student_id = (select public.current_user_id())
    and exists (
      select 1
      from public.enrollments e
      join public.course_runs cr on cr.id = e.course_run_id
      join public.lessons l on l.course_id = cr.course_id
      join public.quizzes q on q.lesson_id = l.id
      where q.id = quiz_id
        and e.student_id = (select public.current_user_id())
        and e.status = 'approved'
    )
  );

commit;

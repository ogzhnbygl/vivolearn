-- Allow anonymous visitors to list published courses and run information
begin;

alter policy "Courses readable by authenticated" on public.courses
  using (auth.role() in ('authenticated', 'anon'));

alter policy "Course runs readable" on public.course_runs
  using (auth.role() in ('authenticated', 'anon'));

commit;

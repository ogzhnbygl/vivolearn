begin;

create table if not exists public.course_sections (
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

alter table public.course_sections enable row level security;

alter table public.lessons
  add column if not exists section_id uuid;

create index if not exists idx_course_sections_course_id on public.course_sections(course_id);

-- create a default section for existing courses and assign lessons
with inserted_sections as (
  insert into public.course_sections (course_id, title, order_index)
  select id, 'Genel', 0
  from public.courses c
  where not exists (
    select 1 from public.course_sections cs where cs.course_id = c.id
  )
  returning id, course_id
)
update public.lessons l
set section_id = cs.id
from (
  select distinct on (course_id) id, course_id
  from (
    select id, course_id from inserted_sections
    union all
    select
      cs.id,
      cs.course_id
    from public.course_sections cs
  ) x
) cs
where l.section_id is null and l.course_id = cs.course_id;

alter table public.lessons
  alter column section_id set not null,
  add constraint lessons_section_id_fkey foreign key (section_id) references public.course_sections(id) on delete cascade;

alter table public.lessons
  drop constraint if exists lessons_course_id_order_index_key;

alter table public.lessons
  add constraint lessons_section_id_order_index_key unique (section_id, order_index);

-- RLS policies for course_sections
create policy "Sections readable" on public.course_sections
  for select using (
    exists (
      select 1 from public.courses c
      where c.id = course_id
        and (
          c.instructor_id = auth.uid()
          or exists (
            select 1 from public.enrollments e
            join public.course_runs cr on cr.id = e.course_run_id
            where e.student_id = auth.uid()
              and e.status = 'approved'
              and cr.course_id = c.id
          )
          or exists (
            select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
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
          c.instructor_id = auth.uid()
          or exists (
            select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
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
          c.instructor_id = auth.uid()
          or exists (
            select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.courses c
      where c.id = course_id
        and (
          c.instructor_id = auth.uid()
          or exists (
            select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
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
          c.instructor_id = auth.uid()
          or exists (
            select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
          )
        )
    )
  );

-- Adjust lessons policies to reference sections
alter policy "Lessons readable with access" on public.lessons
  using (
    exists (
      select 1
      from public.course_sections cs
      join public.courses c on c.id = cs.course_id
      where cs.id = section_id
        and (
          c.instructor_id = auth.uid()
          or exists (
            select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
          )
        )
    )
    or exists (
      select 1
      from public.enrollments e
      join public.course_runs cr on cr.id = e.course_run_id
      where e.student_id = auth.uid()
        and e.status = 'approved'
        and cr.course_id = (
          select cs.course_id from public.course_sections cs where cs.id = section_id
        )
        and (cr.access_start is null or now() >= cr.access_start)
        and (cr.access_end is null or now() <= cr.access_end)
    )
  );

drop policy if exists "Owners manage lessons" on public.lessons;

create policy "Owners manage lessons" on public.lessons
  for insert with check (
    exists (
      select 1 from public.course_sections cs
      join public.courses c on c.id = cs.course_id
      where cs.id = section_id
        and (
          c.instructor_id = auth.uid()
          or exists (
            select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
          )
        )
    )
  );

commit;

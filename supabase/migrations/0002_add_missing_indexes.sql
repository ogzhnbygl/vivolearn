-- Add indexes to cover foreign keys flagged by Supabase Performance Advisor
-- Date: 2025-09-23

begin;

-- Covering index for courses.instructor_id (was reported unindexed)
create index if not exists idx_courses_instructor_id on public.courses(instructor_id);

-- Covering indexes for progress table (course_run_id and lesson_id were reported unindexed)
create index if not exists idx_progress_course_run_id on public.progress(course_run_id);
create index if not exists idx_progress_lesson_id on public.progress(lesson_id);

-- Covering index for quiz_attempts.student_id (was reported unindexed)
create index if not exists idx_quiz_attempts_student_id on public.quiz_attempts(student_id);

commit;

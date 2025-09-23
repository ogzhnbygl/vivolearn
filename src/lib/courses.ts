import { getSupabaseServerComponentClient } from "@/lib/supabase-server";
import type { Tables } from "@/lib/database.types";

type LessonSummary = Pick<
  Tables<"lessons">,
  "id" | "title" | "order_index" | "is_published" | "video_url" | "section_id" | "content"
>;

export type CourseSectionWithLessons = Tables<"course_sections"> & {
  lessons: LessonSummary[];
};

export type CourseWithRelations = Tables<"courses"> & {
  instructor?: Pick<Tables<"profiles">, "id" | "full_name" | "email"> | null;
  course_runs: Tables<"course_runs">[];
  sections: CourseSectionWithLessons[];
};

export async function getPublishedCourses() {
  try {
    const supabase = getSupabaseServerComponentClient();
    // Fetch courses with minimal related data to avoid heavy lateral JSON queries
    const { data, error } = await supabase
      .from("courses")
      .select(
        `id, title, slug, summary, cover_image_url, is_published, created_at, instructor:profiles!courses_instructor_id_fkey(id, full_name, email)`
      )
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Kurslar alınırken hata oluştu: ${error.message}`);
    }

    // Return courses as lightweight objects. Full sections/lessons are loaded by getCourseDetail when needed.
    const result = (data ?? []) as unknown as CourseWithRelations[];
    return result.filter((course) => course.is_published);
  } catch (err) {
    console.error("Supabase kurs sorgusu hatası", err);
    return [];
  }
}

export function partitionCoursesByRunState(courses: CourseWithRelations[]) {
  const now = new Date();
  const open: CourseWithRelations[] = [];
  const upcoming: CourseWithRelations[] = [];
  const past: CourseWithRelations[] = [];

  courses.forEach((course) => {
    const runs = course.course_runs ?? [];

    const hasOpenRun = runs.some((run) => {
      const start = new Date(run.access_start);
      const end = run.access_end ? new Date(run.access_end) : null;
      return start <= now && (!end || end >= now);
    });

    const hasUpcomingRun = runs.some((run) => new Date(run.access_start) > now);

    if (hasOpenRun) {
      open.push(course);
    } else if (hasUpcomingRun) {
      upcoming.push(course);
    } else {
      past.push(course);
    }
  });

  return { open, upcoming, past };
}

export async function getCourseDetail(courseId: string) {
  const supabase = getSupabaseServerComponentClient();

  // 1) Fetch base course + instructor
  const { data: courseData, error: courseError } = await supabase
    .from("courses")
    .select(
      "id, title, slug, description, summary, cover_image_url, is_published, created_at, updated_at, instructor:profiles!courses_instructor_id_fkey(id, full_name, email)"
    )
    .eq("id", courseId)
    .single();

  if (courseError || !courseData) {
    throw new Error(`Kurs detayı alınamadı: ${courseError?.message ?? "not found"}`);
  }

  // 2) Fetch course runs (lightweight fields)
  const { data: runsData } = await supabase
    .from("course_runs")
    .select("id, course_id, label, access_start, access_end, application_start, application_end, enrollment_limit")
    .eq("course_id", courseId)
    .order("access_start", { ascending: false });

  // 3) Fetch course sections
  const { data: sectionsData } = await supabase
    .from("course_sections")
    .select("id, course_id, title, order_index")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });

  const sectionIds = (sectionsData ?? []).map((s: any) => s.id);

  // 4) Fetch published lessons for the sections in one query
  let lessonsData: any[] = [];
  if (sectionIds.length > 0) {
    const { data: ldata } = await supabase
      .from("lessons")
      .select("id, course_id, section_id, title, order_index, is_published, video_url, content")
      .in("section_id", sectionIds)
      .eq("is_published", true)
      .order("order_index", { ascending: true });
    lessonsData = ldata ?? [];
  }

  const sectionsWithLessons = (sectionsData ?? []).map((section: any) => ({
    ...section,
    lessons: (lessonsData ?? []).filter((l) => l.section_id === section.id),
  }));

  return {
    ...(courseData as any),
    course_runs: runsData ?? [],
    course_sections: sectionsWithLessons,
  } as Tables<"courses"> & {
    instructor: Pick<Tables<"profiles">, "id" | "full_name" | "email"> | null;
    course_runs: Tables<"course_runs">[];
    course_sections: (Tables<"course_sections"> & { lessons: Tables<"lessons">[] })[];
  };
}

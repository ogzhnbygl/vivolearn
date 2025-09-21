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
    const { data, error } = await supabase
      .from("courses")
      .select(
        "*, course_runs(*), course_sections(*, lessons(*)), instructor:profiles!courses_instructor_id_fkey(id, full_name, email)"
      )
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Kurslar alınırken hata oluştu: ${error.message}`);
    }

    const result = (data ?? []).map((course) => ({
      ...(course as unknown as CourseWithRelations),
      sections: ((course as unknown as CourseWithRelations).sections ?? []).map((section) => ({
        ...section,
        lessons: (section.lessons ?? []).filter((lesson) => lesson.is_published),
      })),
    })) as CourseWithRelations[];

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
  const { data, error } = await supabase
    .from("courses")
    .select(
      "*, course_runs(*), course_sections(*, lessons(*)), instructor:profiles!courses_instructor_id_fkey(id, full_name, email)"
    )
    .eq("id", courseId)
    .single();

  if (error) {
    throw new Error(`Kurs detayı alınamadı: ${error.message}`);
  }

  const typedData = data as Tables<"courses"> & {
    instructor: Pick<Tables<"profiles">, "id" | "full_name" | "email"> | null;
    course_runs: Tables<"course_runs">[];
    course_sections: (Tables<"course_sections"> & { lessons: Tables<"lessons">[] })[];
  };

  return {
    ...typedData,
    course_sections: (typedData.course_sections ?? []).map((section) => ({
      ...section,
      lessons: (section.lessons ?? []).filter((lesson) => lesson.is_published),
    })),
  };
}

import { getSupabaseServerComponentClient } from "@/lib/supabase-server";
import type { Tables } from "@/lib/database.types";

export type LessonDetail = Tables<"lessons"> & {
  course: Tables<"courses"> & {
    instructor?: Pick<Tables<"profiles">, "id" | "full_name" | "email"> | null;
    course_runs: Tables<"course_runs">[];
    course_sections: (Tables<"course_sections"> & {
      lessons: Pick<Tables<"lessons">, "id" | "title" | "order_index" | "is_published" | "video_url">[];
    })[];
  };
  section: Tables<"course_sections">;
  quizzes: (Tables<"quizzes"> & {
    quiz_questions: (Tables<"quiz_questions"> & {
      quiz_options: Tables<"quiz_options">[];
    })[];
  })[];
};

export async function getLessonDetail(lessonId: string) {
  const supabase = getSupabaseServerComponentClient();
  const { data, error } = await supabase
    .from("lessons")
    .select(
      "*, course:courses(*, course_runs(*), course_sections(*, lessons(id, title, order_index, is_published, video_url)), instructor:profiles!courses_instructor_id_fkey(id, full_name, email)), section:course_sections(*), quizzes(*, quiz_questions(*, quiz_options(*)))"
    )
    .eq("id", lessonId)
    .single();

  if (error) {
    throw new Error(`Ders detayı alınamadı: ${error.message}`);
  }

  return data as LessonDetail;
}

import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { Tables } from "@/lib/database.types";

export type LessonDetail = Tables<"lessons"> & {
  course: Tables<"courses"> & {
    instructor?: Pick<Tables<"profiles">, "id" | "full_name" | "email"> | null;
    course_runs: Tables<"course_runs">[];
  };
  quizzes: (Tables<"quizzes"> & {
    quiz_questions: (Tables<"quiz_questions"> & {
      quiz_options: Tables<"quiz_options">[];
    })[];
  })[];
};

export async function getLessonDetail(lessonId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("lessons")
    .select(
      "*, course:courses(*, course_runs(*), instructor:profiles!courses_instructor_id_fkey(id, full_name, email)), quizzes(*, quiz_questions(*, quiz_options(*)))"
    )
    .eq("id", lessonId)
    .single();

  if (error) {
    throw new Error(`Ders detayı alınamadı: ${error.message}`);
  }

  return data as LessonDetail;
}

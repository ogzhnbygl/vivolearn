import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { formatDateRange } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QuizAttemptForm, type QuizData } from "@/components/quiz/quiz-attempt-form";
import type { Tables } from "@/lib/database.types";

interface LessonQuizPageProps {
  params: Promise<{ id: string }>;
}

export default async function LessonQuizAttemptPage({ params }: LessonQuizPageProps) {
  const { id } = await params;
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect(`/login?redirectTo=/lessons/${id}/quiz`);
  }

  const supabase = getSupabaseServerClient();
  const { data: lessonData } = await supabase
    .from("lessons")
    .select(
      "*, course:courses(id, title, instructor_id, course_runs(*)), quizzes(*, quiz_questions(*, quiz_options(*)))"
    )
    .eq("id", id)
    .single();

  if (!lessonData) {
    redirect("/courses");
  }

  const lesson = lessonData as Tables<"lessons"> & {
    course: Tables<"courses"> & {
      course_runs: Tables<"course_runs">[];
    };
    quizzes: QuizData[];
  };

  const quiz = lesson.quizzes[0];
  if (!quiz) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quiz henüz hazır değil</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Eğitmen bu ders için quiz eklediğinde bildirim alacaksınız.
          </p>
        </CardContent>
      </Card>
    );
  }

  const courseRunIds = lesson.course.course_runs.map((run) => run.id);
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("*, course_runs(*)")
    .eq("student_id", profile.id)
    .in("course_run_id", courseRunIds)
    .eq("status", "approved")
    .maybeSingle();

  const activeEnrollment = enrollment as (Tables<"enrollments"> & {
    course_runs: Tables<"course_runs">;
  }) | null;

  if (!activeEnrollment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quiz için yetkiniz yok</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Bu kursa onaylı kaydınız olması gerekir. Kurs sayfasından başvurunuzu kontrol edin.
          </p>
        </CardContent>
      </Card>
    );
  }

  const now = new Date();
  const accessStart = new Date(activeEnrollment.course_runs.access_start);
  const accessEnd = activeEnrollment.course_runs.access_end
    ? new Date(activeEnrollment.course_runs.access_end)
    : null;

  if (!(accessStart <= now && (!accessEnd || accessEnd >= now))) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quiz erişim süresi dışında</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Quiz {formatDateRange(
              activeEnrollment.course_runs.access_start,
              activeEnrollment.course_runs.access_end
            )} aralığında açıktır.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { data: attemptData } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("quiz_id", quiz.id)
    .eq("student_id", profile.id)
    .maybeSingle();

  const attempt = attemptData as Tables<"quiz_attempts"> | null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{quiz.title}</CardTitle>
            <Badge variant="outline">Başarı eşiği: {quiz.passing_score}</Badge>
          </div>
          <p className="text-sm text-slate-600">{quiz.description ?? "Quiz açıklaması"}</p>
        </CardHeader>
      </Card>
      <QuizAttemptForm
        quiz={quiz}
        courseRunId={activeEnrollment.course_run_id}
        lessonId={lesson.id}
        existingAttempt={attempt}
      />
    </div>
  );
}

import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getCurrentProfile } from "@/lib/auth";
import { CreateQuizForm } from "@/components/instructor/create-quiz-form";
import { CreateQuizQuestionForm } from "@/components/instructor/create-quiz-question-form";
import { CreateQuizOptionForm } from "@/components/instructor/create-quiz-option-form";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/lib/database.types";

interface LessonQuizPageProps {
  params: Promise<{ id: string }>;
}

export default async function LessonQuizPage({ params }: LessonQuizPageProps) {
  const { id } = await params;
  const profile = await getCurrentProfile();

  if (!profile || (profile.role !== "instructor" && profile.role !== "admin")) {
    redirect("/profile");
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("lessons")
    .select(
      "*, course:courses(id, title, instructor_id), quizzes(*, quiz_questions(*, quiz_options(*)))"
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    redirect("/instructor");
  }

  const lesson = data as Tables<"lessons"> & {
    course: Pick<Tables<"courses">, "id" | "title" | "instructor_id">;
    quizzes: (Tables<"quizzes"> & {
      quiz_questions: (Tables<"quiz_questions"> & {
        quiz_options: Tables<"quiz_options">[];
      })[];
    })[];
  };

  if (lesson.course.instructor_id !== profile.id && profile.role !== "admin") {
    redirect("/instructor");
  }

  const quiz = lesson.quizzes[0] ?? null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{lesson.title} · Quiz Yönetimi</CardTitle>
          <p className="text-sm text-slate-600">Kurs: {lesson.course.title}</p>
        </CardHeader>
      </Card>

      {!quiz ? (
        <Card>
          <CardHeader>
            <CardTitle>Quiz Oluştur</CardTitle>
            <p className="text-sm text-slate-600">Quiz olmayan derslerde öğrenciler ilerleyemez.</p>
          </CardHeader>
          <CardContent>
            <CreateQuizForm lessonId={lesson.id} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{quiz.title}</CardTitle>
                <Badge variant="outline">Eşik: {quiz.passing_score}</Badge>
              </div>
              <p className="text-sm text-slate-600">{quiz.description ?? "Açıklama belirtilmemiş."}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-xl border border-primary-100 bg-white/60 p-4">
                <h3 className="text-lg font-semibold text-primary-900">Yeni Soru</h3>
                <CreateQuizQuestionForm quizId={quiz.id} />
              </div>

              <div className="space-y-4">
                {quiz.quiz_questions.length === 0 ? (
                  <p className="text-sm text-slate-500">Henüz soru eklenmedi.</p>
                ) : (
                  quiz.quiz_questions
                    .slice()
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((question) => (
                      <Card key={question.id} className="border-l-4 border-l-primary-400">
                        <CardHeader>
                          <CardTitle className="text-base">Soru {question.order_index + 1}</CardTitle>
                          <p className="text-sm text-slate-600">{question.prompt}</p>
                        </CardHeader>
                        <CardContent>
                          <CreateQuizOptionForm questionId={question.id} options={question.quiz_options} />
                        </CardContent>
                      </Card>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

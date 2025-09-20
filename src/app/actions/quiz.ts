"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { getSupabaseServerActionClient } from "@/lib/supabase-server";

interface CreateQuizPayload {
  lessonId: string;
  title: string;
  description?: string;
  passingScore: number;
  durationSeconds: number | null;
}

export async function createQuizForLessonAction({
  lessonId,
  title,
  description,
  passingScore,
  durationSeconds,
}: CreateQuizPayload) {
  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== "instructor" && profile.role !== "admin")) {
    return { error: "Quiz oluşturma yetkiniz yok." };
  }

  const supabase = getSupabaseServerActionClient();
  const { data: lessonInfo, error: lessonError } = await supabase
    .from("lessons")
    .select("course_id, course:courses(instructor_id)")
    .eq("id", lessonId)
    .single();

  type LessonOwnerInfo = {
    course_id: string;
    course: { instructor_id: string | null } | null;
  };

  const typedLessonInfo = lessonInfo as LessonOwnerInfo | null;

  if (lessonError || !typedLessonInfo) {
    return { error: "Ders bulunamadı." };
  }

  if (typedLessonInfo.course?.instructor_id !== profile.id && profile.role !== "admin") {
    return { error: "Bu ders için yetkiniz yok." };
  }

  const { count } = await supabase
    .from("quizzes")
    .select("id", { count: "exact", head: true })
    .eq("lesson_id", lessonId);

  if ((count ?? 0) > 0) {
    return { error: "Bu ders için zaten bir quiz bulunuyor." };
  }

  const { error } = await supabase.from("quizzes").insert({
    lesson_id: lessonId,
    title,
    description,
    passing_score: passingScore,
    duration_seconds: durationSeconds,
  });

  if (error) {
    return { error: "Quiz oluşturulamadı: " + error.message };
  }

  revalidatePath(`/instructor/lessons/${lessonId}/quiz`);
  revalidatePath(`/lessons/${lessonId}`);
  return { success: true } as const;
}

interface CreateQuizQuestionPayload {
  quizId: string;
  prompt: string;
  orderIndex?: number;
}

export async function createQuizQuestionAction({ quizId, prompt, orderIndex }: CreateQuizQuestionPayload) {
  if (!prompt.trim()) {
    return { error: "Soru metni zorunludur." };
  }

  const supabase = getSupabaseServerActionClient();
  const { error } = await supabase.from("quiz_questions").insert({
    quiz_id: quizId,
    prompt,
    order_index: orderIndex ?? 0,
  });

  if (error) {
    return { error: "Soru eklenemedi: " + error.message };
  }

  const lessonId = await getLessonIdForQuiz(quizId);
  revalidatePath(`/instructor/lessons/${lessonId}/quiz`);
  return { success: true } as const;
}

interface CreateQuizOptionPayload {
  questionId: string;
  text: string;
  isCorrect: boolean;
}

export async function createQuizOptionAction({ questionId, text, isCorrect }: CreateQuizOptionPayload) {
  if (!text.trim()) {
    return { error: "Seçenek metni zorunludur." };
  }

  const supabase = getSupabaseServerActionClient();
  const { error } = await supabase.from("quiz_options").insert({
    question_id: questionId,
    text,
    is_correct: isCorrect,
  });

  if (error) {
    return { error: "Seçenek eklenemedi: " + error.message };
  }

  const lessonId = await getLessonIdForQuestion(questionId);
  revalidatePath(`/instructor/lessons/${lessonId}/quiz`);
  return { success: true } as const;
}

interface ToggleOptionPayload {
  optionId: string;
  isCorrect: boolean;
}

export async function toggleQuizOptionCorrectAction({ optionId, isCorrect }: ToggleOptionPayload) {
  const supabase = getSupabaseServerActionClient();
  const { data, error } = await supabase
    .from("quiz_options")
    .update({ is_correct: isCorrect })
    .eq("id", optionId)
    .select("question_id")
    .single();

  if (error || !data) {
    return { error: "Seçenek güncellenemedi." };
  }

  const lessonId = await getLessonIdForQuestion(data.question_id);
  revalidatePath(`/instructor/lessons/${lessonId}/quiz`);
  return { success: true } as const;
}

interface SubmitQuizAttemptPayload {
  quizId: string;
  courseRunId: string;
  lessonId: string;
  answers: Record<string, string>;
}

type SubmitQuizAttemptResult =
  | { error: string }
  | { success: true; score: number; passed: boolean };

export async function submitQuizAttemptAction({
  quizId,
  courseRunId,
  lessonId,
  answers,
}: SubmitQuizAttemptPayload): Promise<SubmitQuizAttemptResult> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { error: "Giriş yapmalısınız." };
  }

  const supabase = getSupabaseServerActionClient();

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", profile.id)
    .eq("course_run_id", courseRunId)
    .eq("status", "approved")
    .maybeSingle();

  if (!enrollment) {
    return { error: "Bu quiz için erişim yetkiniz yok." };
  }

  const { data: quizData } = await supabase
    .from("quizzes")
    .select("passing_score, quiz_questions(id, quiz_options(id, is_correct))")
    .eq("id", quizId)
    .single();

  if (!quizData) {
    return { error: "Quiz bulunamadı." };
  }

  const questions = quizData.quiz_questions ?? [];
  if (questions.length === 0) {
    return { error: "Quiz için soru tanımlanmamış." };
  }

  const total = questions.length;
  let correct = 0;
  for (const question of questions) {
    const answerOptionId = answers[question.id];
    if (!answerOptionId) {
      return { error: "Tüm sorular cevaplanmalıdır." };
    }
    const option = question.quiz_options.find((opt) => opt.id === answerOptionId);
    if (!option) {
      return { error: "Geçersiz seçenek seçildi." };
    }
    if (option.is_correct) {
      correct += 1;
    }
  }

  const score = Math.round((correct / total) * 100);
  const passed = score >= quizData.passing_score;

  const { error } = await supabase
    .from("quiz_attempts")
    .upsert(
      {
        quiz_id: quizId,
        student_id: profile.id,
        status: "submitted",
        answers,
        score,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "quiz_id,student_id" }
    );

  if (error) {
    return { error: "Quiz sonucu kaydedilemedi: " + error.message };
  }

  revalidatePath(`/lessons/${lessonId}`);
  revalidatePath(`/lessons/${lessonId}/quiz`);
  revalidatePath("/profile");
  return { success: true, score, passed };
}

async function getLessonIdForQuiz(quizId: string) {
  const supabase = getSupabaseServerActionClient();
  const { data } = await supabase
    .from("quizzes")
    .select("lesson_id")
    .eq("id", quizId)
    .single();
  return data?.lesson_id ?? "";
}

async function getLessonIdForQuestion(questionId: string) {
  const supabase = getSupabaseServerActionClient();
  const { data } = await supabase
    .from("quiz_questions")
    .select("quiz:quiz_id(lesson_id)")
    .eq("id", questionId)
    .single();
  type QuestionInfo = {
    quiz: { lesson_id: string | null } | null;
  };

  const typedData = data as QuestionInfo | null;
  return typedData?.quiz?.lesson_id ?? "";
}

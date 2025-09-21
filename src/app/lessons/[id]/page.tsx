import { notFound } from "next/navigation";
import { Container } from "@/components/layout/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getLessonDetail, type LessonDetail } from "@/lib/lessons";
import {
  getSupabaseServerComponentClient,
  getSupabaseServiceRoleClient,
} from "@/lib/supabase-server";
import { getCurrentProfile } from "@/lib/auth";
import { formatDateRange, normalizeGoogleDriveUrl } from "@/lib/utils";
import type { Tables } from "@/lib/database.types";
import { LessonProgressActions } from "@/components/lesson-progress-actions";
import Link from "next/link";

interface LessonPageProps {
  params: Promise<{ id: string }>;
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { id } = await params;

  let lesson: LessonDetail | null = null;
  let unauthorized = false;

  try {
    lesson = await getLessonDetail(id);
  } catch {
    const serviceClient = getSupabaseServiceRoleClient();
    const { data } = await serviceClient
      .from("lessons")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (!data) {
      notFound();
    }

    unauthorized = true;
  }

  if (unauthorized || !lesson) {
    return (
      <Container className="flex flex-col gap-6 py-20 text-center text-slate-600">
        <h1 className="text-2xl font-semibold text-primary-900">Derse erişiminiz yok</h1>
        <p>Bu dersi görüntülemek için ilgili kursa kayıt olup eğitmen onayı almanız gerekir.</p>
        <Button asChild variant="secondary" className="mx-auto">
          <Link href="/courses">Kurslara Dön</Link>
        </Button>
      </Container>
    );
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    return (
      <Container className="flex flex-col gap-6 py-20 text-center text-slate-600">
        <h1 className="text-2xl font-semibold text-primary-900">Giriş yapmalısınız</h1>
        <p>Ders içeriklerini görüntülemek için hesabınıza giriş yapın.</p>
        <div className="mx-auto flex gap-2">
          <Button asChild variant="secondary">
            <Link href="/login">Giriş Yap</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Kayıt Ol</Link>
          </Button>
        </div>
      </Container>
    );
  }

  const supabase = getSupabaseServerComponentClient();
  const courseRunIds = lesson.course.course_runs.map((run) => run.id);
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("*, course_runs(*)")
    .eq("student_id", profile.id)
    .in("course_run_id", courseRunIds)
    .maybeSingle();

  const typedEnrollment = enrollment as (Tables<"enrollments"> & {
    course_runs: Tables<"course_runs">;
  }) | null;

  if (!typedEnrollment || typedEnrollment.status !== "approved") {
    return (
      <Container className="flex flex-col gap-6 py-20 text-center text-slate-600">
        <h1 className="text-2xl font-semibold text-primary-900">Başvurunuz onaylanmadı</h1>
        <p>Derse erişebilmek için eğitmen onayını beklemelisiniz.</p>
        <Button asChild variant="secondary" className="mx-auto">
          <Link href={`/courses/${lesson.course_id}`}>Kurs Detayı</Link>
        </Button>
      </Container>
    );
  }

  const now = new Date();
  const accessStart = new Date(typedEnrollment.course_runs.access_start);
  const accessEnd = typedEnrollment.course_runs.access_end
    ? new Date(typedEnrollment.course_runs.access_end)
    : null;

  const isWithinWindow = accessStart <= now && (!accessEnd || accessEnd >= now);

  if (!isWithinWindow) {
    return (
      <Container className="flex flex-col gap-6 py-20 text-center text-slate-600">
        <h1 className="text-2xl font-semibold text-primary-900">Erişim süresi dışındasınız</h1>
        <p>
          Bu ders {formatDateRange(typedEnrollment.course_runs.access_start, typedEnrollment.course_runs.access_end)}
          {" "}
          tarihleri arasında erişime açıktır.
        </p>
      </Container>
    );
  }

  const { data: progressRow } = await supabase
    .from("progress")
    .select("*")
    .eq("student_id", profile.id)
    .eq("lesson_id", lesson.id)
    .eq("course_run_id", typedEnrollment.course_run_id)
    .maybeSingle();

  const progress = (progressRow as Tables<"progress"> | null) ?? null;

  const quiz = lesson.quizzes[0];

  return (
    <Container className="flex flex-col gap-10">
      <header className="space-y-2">
        <Badge variant="outline" className="uppercase tracking-wide">
          {lesson.course.title}
        </Badge>
        <h1 className="text-3xl font-semibold text-primary-900">{lesson.title}</h1>
        <p className="text-sm text-slate-600">{lesson.content ?? "Ders özeti hazırlanıyor."}</p>
      </header>

      <section className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="overflow-hidden rounded-2xl border border-primary-100 bg-black/5 shadow">
          <iframe
            src={normalizeGoogleDriveUrl(lesson.video_url)}
            title={lesson.title}
            className="aspect-video w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Ders İlerleme</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <p>
              <span className="font-medium">Eğitmen:</span> {" "}
              {lesson.course.instructor?.full_name ?? lesson.course.instructor?.email ?? "Belirlenecek"}
            </p>
            <p>
              <span className="font-medium">Erişim dönemi:</span> {" "}
              {formatDateRange(
                typedEnrollment.course_runs.access_start,
                typedEnrollment.course_runs.access_end
              )}
            </p>
            <LessonProgressActions
              lessonId={lesson.id}
              courseRunId={typedEnrollment.course_run_id}
              initialState={{
                isCompleted: progress?.is_completed ?? false,
                lastViewedAt: progress?.last_viewed_at ?? null,
              }}
            />
          </CardContent>
        </Card>
      </section>

      {quiz ? (
        <section className="grid gap-4">
          <h2 className="text-2xl font-semibold text-primary-900">Quiz</h2>
          <Card>
            <CardHeader>
              <CardTitle>{quiz.title}</CardTitle>
              <p className="text-sm text-slate-600">{quiz.description ?? "Quiz açıklaması"}</p>
            </CardHeader>
            <CardContent className="flex items-center justify-between text-sm text-slate-600">
              <div>
                <p>
                  <span className="font-medium">Başarı eşiği:</span> {quiz.passing_score} puan
                </p>
                {quiz.duration_seconds && (
                  <p>
                    <span className="font-medium">Süre:</span> {Math.round(quiz.duration_seconds / 60)} dk
                  </p>
                )}
              </div>
              <Button asChild>
                <Link href={`/lessons/${lesson.id}/quiz`}>Quiz&apos;e Başla</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      ) : (
        <section className="rounded-xl border border-dashed border-primary-200 bg-white/60 p-6 text-sm text-slate-500">
          Bu ders için quiz henüz tanımlanmadı.
        </section>
      )}
    </Container>
  );
}

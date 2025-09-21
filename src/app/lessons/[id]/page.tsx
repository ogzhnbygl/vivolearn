import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth";
import { getLessonDetail, type LessonDetail } from "@/lib/lessons";
import {
  getSupabaseServerComponentClient,
  getSupabaseServiceRoleClient,
} from "@/lib/supabase-server";
import { cn, formatDateRange, normalizeGoogleDriveUrl } from "@/lib/utils";
import type { Tables } from "@/lib/database.types";

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
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-200">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-semibold text-white">Derse erişiminiz yok</h1>
          <p className="text-sm text-slate-400">
            Bu dersi görüntülemek için ilgili kursa kayıt olup eğitmen onayı almanız gerekir.
          </p>
          <Button asChild variant="secondary">
            <Link href="/courses">Kurslara Dön</Link>
          </Button>
        </div>
      </div>
    );
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-200">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-semibold text-white">Giriş yapmalısınız</h1>
          <p className="text-sm text-slate-400">
            Ders içeriklerini görüntülemek için hesabınıza giriş yapın.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button asChild variant="secondary">
              <Link href="/login">Giriş Yap</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Kayıt Ol</Link>
            </Button>
          </div>
        </div>
      </div>
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

  const typedEnrollment = enrollment as
    | (Tables<"enrollments"> & { course_runs: Tables<"course_runs"> })
    | null;

  if (!typedEnrollment || typedEnrollment.status !== "approved") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-200">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-semibold text-white">Başvurunuz onaylanmadı</h1>
          <p className="text-sm text-slate-400">
            Derse erişebilmek için eğitmen onayını beklemelisiniz.
          </p>
          <Button asChild variant="secondary">
            <Link href={`/courses/${lesson.course_id}`}>Kurs Detayı</Link>
          </Button>
        </div>
      </div>
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-200">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-semibold text-white">Erişim süresi dışındasınız</h1>
          <p className="text-sm text-slate-400">
            Bu ders {formatDateRange(
              typedEnrollment.course_runs.access_start,
              typedEnrollment.course_runs.access_end
            )} tarihleri arasında erişime açıktır.
          </p>
        </div>
      </div>
    );
  }

  const { data: progressRows } = await supabase
    .from("progress")
    .select("*")
    .eq("student_id", profile.id)
    .eq("course_run_id", typedEnrollment.course_run_id);

  const progressMap = new Map<string, Tables<"progress">>();
  (progressRows ?? []).forEach((row) => {
    progressMap.set(row.lesson_id, row as Tables<"progress">);
  });
  const quiz = lesson.quizzes[0];
  const courseLessons = (lesson.course.lessons ?? [])
    .slice()
    .filter((lessonItem) => lessonItem.is_published || lessonItem.id === lesson.id)
    .sort((a, b) => a.order_index - b.order_index);

  const renderLessonList = () =>
    courseLessons.map((lessonItem, index) => {
      const isActive = lessonItem.id === lesson.id;
      const completed = progressMap.get(lessonItem.id)?.is_completed ?? false;

      return (
        <Link
          key={lessonItem.id}
          href={`/lessons/${lessonItem.id}`}
          prefetch={false}
          aria-current={isActive ? "page" : undefined}
          className={cn(
            "group block rounded-xl border px-4 py-3 text-sm transition",
            isActive
              ? "pointer-events-none border-primary-500 bg-primary-500/20 text-white shadow-lg"
              : "border-white/10 bg-white/[0.08] text-slate-100 hover:border-primary-400 hover:bg-primary-500/10"
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "mt-1 flex h-5 w-5 items-center justify-center rounded-full border-2 text-[10px] font-semibold transition",
                completed
                  ? "border-primary-400 bg-primary-400 text-slate-900"
                  : "border-slate-500 text-transparent"
              )}
            >
              ✓
            </div>
            <div className="flex-1">
              <p className={cn("text-sm font-medium", isActive ? "text-white" : "text-slate-100")}
              >
                {index + 1}. {lessonItem.title}
              </p>
              <p className="text-xs text-slate-400">
                {isActive
                  ? "Şu an izleniyor"
                  : completed
                  ? "Tamamlandı"
                  : lessonItem.is_published
                  ? "Hazır"
                  : "Taslak"}
              </p>
            </div>
          </div>
        </Link>
      );
    });

  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-50">
      <div className="flex flex-1 flex-col">
        <div className="relative overflow-hidden bg-black">
          <div className="aspect-video w-full">
            <iframe
              src={normalizeGoogleDriveUrl(lesson.video_url)}
              title={lesson.title}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>

        <div className="flex flex-1 flex-col bg-white text-slate-900 shadow-xl">
          <div className="px-8 pt-8">
            <Badge variant="outline" className="mb-4 border-primary-200 bg-primary-50 text-primary-700">
              {lesson.course.title}
            </Badge>
            <h1 className="text-3xl font-semibold text-slate-900">{lesson.title}</h1>
            <p className="mt-1 text-sm text-slate-600">
              Eğitmen: {lesson.course.instructor?.full_name ?? lesson.course.instructor?.email ?? "Belirlenecek"}
            </p>
            <div className="mt-6 flex flex-wrap gap-6 text-sm font-semibold text-slate-500">
              <span className="border-b-2 border-primary-600 pb-2 text-primary-600">Genel Bakış</span>
              <span className="pb-2">Notlar</span>
              <span className="pb-2">Duyurular</span>
              <span className="pb-2">Yorumlar</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8">
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-slate-900">Ders özeti</h2>
              <p className="text-base leading-7 text-slate-600">
                {lesson.content ?? "Bu ders için içerik özeti yakında paylaşılacak."}
              </p>
            </section>

            {quiz ? (
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{quiz.title}</h3>
                    <p className="text-sm text-slate-600">{quiz.description ?? "Quiz açıklaması yakında."}</p>
                  </div>
                  <Button asChild className="w-fit">
                    <Link href={`/lessons/${lesson.id}/quiz`}>Quiz&apos;e Başla</Link>
                  </Button>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
                  <span>
                    <span className="font-medium text-slate-900">Başarı eşiği:</span> {quiz.passing_score} puan
                  </span>
                  {quiz.duration_seconds && (
                    <span>
                      <span className="font-medium text-slate-900">Süre:</span> {Math.round(quiz.duration_seconds / 60)} dk
                    </span>
                  )}
                </div>
              </section>
            ) : (
              <section className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                Bu ders için quiz henüz tanımlanmadı.
              </section>
            )}

            <section className="lg:hidden">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">Kurs içeriği</h3>
              <div className="space-y-2">{renderLessonList()}</div>
            </section>
          </div>
        </div>
      </div>

      <aside className="hidden w-80 flex-col border-l border-slate-800 bg-slate-950/80 text-slate-100 lg:flex">
        <div className="border-b border-white/10 px-6 py-5">
          <p className="text-xs uppercase tracking-wide text-slate-400">Kurs içeriği</p>
          <p className="text-lg font-semibold text-white">{courseLessons.length} ders</p>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-4 space-y-2">{renderLessonList()}</div>
      </aside>
    </div>
  );
}

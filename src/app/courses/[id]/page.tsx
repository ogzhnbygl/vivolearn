import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateRange } from "@/lib/utils";
import { getCourseDetail } from "@/lib/courses";
import { getSupabaseServerComponentClient } from "@/lib/supabase-server";
import { getCurrentProfile } from "@/lib/auth";
import type { Tables } from "@/lib/database.types";
import { CourseApplicationForm } from "@/components/course-application-form";

interface CoursePageProps {
  params: Promise<{ id: string }>;
}

export default async function CourseDetailPage({ params }: CoursePageProps) {
  const { id } = await params;
  const course = await getCourseDetail(id).catch(() => null);

  if (!course) {
    notFound();
  }

  const profile = await getCurrentProfile();
  const supabase = getSupabaseServerComponentClient();
  const courseRun = course.course_runs[0] ?? null;
  let existingEnrollment: (Tables<"enrollments"> & {
    course_runs: Tables<"course_runs">;
  }) | null = null;

  if (profile && courseRun) {
    const { data } = await supabase
      .from("enrollments")
      .select("*, course_runs(*)")
      .eq("student_id", profile.id)
      .eq("course_run_id", courseRun.id)
      .maybeSingle();

    existingEnrollment = data as typeof existingEnrollment;
  }

  let progressRows: Tables<"progress">[] = [];
  if (profile) {
    const lessonIds = course.lessons.map((lesson) => lesson.id);
    if (lessonIds.length > 0) {
      const { data } = await supabase
        .from("progress")
        .select("*")
        .eq("student_id", profile.id)
        .in("lesson_id", lessonIds);
      progressRows = (data ?? []) as Tables<"progress">[];
    }
  }

  const publishedLessons = course.lessons
    .slice()
    .sort((a, b) => a.order_index - b.order_index);

  const startLessonId = (() => {
    if (progressRows.length > 0) {
      const sorted = progressRows
        .slice()
        .sort((a, b) => {
          const aTimestamp = new Date(a.last_viewed_at ?? a.updated_at ?? a.created_at).getTime();
          const bTimestamp = new Date(b.last_viewed_at ?? b.updated_at ?? b.created_at).getTime();
          return bTimestamp - aTimestamp;
        });
      return sorted[0]?.lesson_id ?? publishedLessons[0]?.id ?? null;
    }
    return publishedLessons[0]?.id ?? null;
  })();

  return (
    <Container className="flex flex-col gap-10">
      <section className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-3xl">{course.title}</CardTitle>
              <Badge variant={course.is_published ? "success" : "warning"}>
                {course.is_published ? "Yayında" : "Taslak"}
              </Badge>
            </div>
            <p className="text-sm text-slate-600">
              {course.description ?? "Kurs açıklaması en kısa sürede eklenecek."}
            </p>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <p>
              <span className="font-medium">Sorumlu eğitmen:</span> {" "}
              {course.instructor?.full_name ?? course.instructor?.email ?? "Belirlenecek"}
            </p>
            <p>
              <span className="font-medium">Ders sayısı:</span> {course.lessons.length}
            </p>
            {courseRun ? (
              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-medium">Başvuru aralığı:</span> {" "}
                  {courseRun.application_start
                    ? formatDateRange(courseRun.application_start, courseRun.application_end)
                    : "Belirlenmedi"}
                </p>
                <p>
                  <span className="font-medium">Erişim aralığı:</span> {" "}
                  {formatDateRange(courseRun.access_start, courseRun.access_end)}
                </p>
                {typeof courseRun.enrollment_limit === "number" && (
                  <p>
                    <span className="font-medium">Kontenjan:</span> {courseRun.enrollment_limit}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Başvuru ve erişim tarihleri henüz belirlenmedi.
              </p>
            )}
          </CardContent>
        </Card>
        <CourseApplicationForm
          courseRun={courseRun}
          profile={profile}
          courseId={course.id}
          existingEnrollment={existingEnrollment}
        />
      </section>

      <section id="lessons" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-primary-900">Ders İçeriği</h2>
            <p className="text-sm text-slate-500">{publishedLessons.length} ders</p>
          </div>
          {startLessonId && (
            <Button
              asChild
              className="bg-primary-600 text-white hover:bg-primary-700"
            >
              <Link href={`/lessons/${startLessonId}`} prefetch={false}>
                Derslere Başla
              </Link>
            </Button>
          )}
        </div>
        {publishedLessons.length === 0 ? (
          <p className="rounded-xl border border-dashed border-primary-200 bg-white/60 p-6 text-sm text-slate-500">
            Ders içerikleri henüz eklenmedi.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {publishedLessons.map((lesson, index) => (
              <li key={lesson.id}>
                <Link
                  href={`/lessons/${lesson.id}`}
                  prefetch={false}
                  className="flex items-center justify-between gap-4 px-5 py-4 text-sm transition hover:bg-primary-50/70"
                >
                  <div>
                    <p className="font-medium text-slate-800">
                      {index + 1}. {lesson.title}
                    </p>
                    <p className="text-xs text-slate-500">Ders süresi yakında</p>
                  </div>
                  <span className="text-xs uppercase tracking-wide text-primary-600">
                    İzle →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {courseRun ? null : (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-primary-900">Takvim Bilgisi Eksik</h2>
          <p className="rounded-xl border border-dashed border-primary-200 bg-white/60 p-6 text-sm text-slate-500">
            Eğitmen bu kurs için başvuru ve erişim tarihlerini henüz belirlemedi.
          </p>
        </section>
      )}
    </Container>
  );
}

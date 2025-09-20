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
  let existingEnrollment: (Tables<"enrollments"> & {
    course_runs: Tables<"course_runs">;
  }) | null = null;

  if (profile) {
    const { data } = await supabase
      .from("enrollments")
      .select("*, course_runs(*)")
      .eq("student_id", profile.id)
      .in(
        "course_run_id",
        course.course_runs.map((run) => run.id)
      )
      .maybeSingle();

    existingEnrollment = data as typeof existingEnrollment;
  }

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
            <p>
              <span className="font-medium">Aktif dönem sayısı:</span> {course.course_runs.length}
            </p>
          </CardContent>
        </Card>
        <CourseApplicationForm
          courseRuns={course.course_runs}
          profile={profile}
          courseId={course.id}
          existingEnrollment={existingEnrollment}
        />
      </section>

      <section id="lessons" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-primary-900">Ders İçeriği</h2>
          <span className="text-sm text-slate-500">{course.lessons.length} ders</span>
        </div>
        {course.lessons.length === 0 ? (
          <p className="rounded-xl border border-dashed border-primary-200 bg-white/60 p-6 text-sm text-slate-500">
            Ders içerikleri henüz eklenmedi.
          </p>
        ) : (
          <div className="grid gap-4">
            {course.lessons
              .slice()
              .sort((a, b) => a.order_index - b.order_index)
              .map((lesson) => (
                <Card key={lesson.id} className="border-l-4 border-l-primary-400">
                  <CardHeader className="flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{lesson.title}</CardTitle>
                      <p className="text-sm text-slate-600">
                        {lesson.content?.slice(0, 120) ?? "Özet yakında"}
                      </p>
                    </div>
                    <Button asChild variant="secondary" className="mt-2">
                      <Link href={`/lessons/${lesson.id}`}>Dersi Gör</Link>
                    </Button>
                  </CardHeader>
                </Card>
              ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-primary-900">Dönemler ve Erişim Süreleri</h2>
        {course.course_runs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-primary-200 bg-white/60 p-6 text-sm text-slate-500">
            Bu kurs için henüz dönem tanımlanmadı.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {course.course_runs
              .slice()
              .sort((a, b) => new Date(a.access_start).getTime() - new Date(b.access_start).getTime())
              .map((run) => {
                const now = new Date();
                const accessStart = new Date(run.access_start);
                const accessEnd = run.access_end ? new Date(run.access_end) : null;
                const isActive = accessStart <= now && (!accessEnd || accessEnd >= now);
                const isUpcoming = accessStart > now;

                return (
                  <Card key={run.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{run.label ?? "Yeni dönem"}</CardTitle>
                        <Badge variant={isActive ? "success" : isUpcoming ? "warning" : "outline"}>
                          {isActive ? "Aktif" : isUpcoming ? "Yakında" : "Tamamlandı"}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600">
                        {formatDateRange(run.access_start, run.access_end)}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-slate-600">
                      {run.application_start && (
                        <p>
                          <span className="font-medium">Başvuru:</span> {" "}
                          {formatDateRange(run.application_start, run.application_end)}
                        </p>
                      )}
                      {typeof run.enrollment_limit === "number" && (
                        <p>
                          <span className="font-medium">Kontenjan:</span> {run.enrollment_limit}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}
      </section>
    </Container>
  );
}

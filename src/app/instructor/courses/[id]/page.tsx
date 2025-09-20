import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateLessonForm } from "@/components/instructor/create-lesson-form";
import { CreateCourseRunForm } from "@/components/instructor/create-course-run-form";
import { ApplicationDecisionButtons } from "@/components/instructor/application-decision-buttons";
import { getSupabaseServerComponentClient } from "@/lib/supabase-server";
import { getCurrentProfile } from "@/lib/auth";
import { formatDateRange } from "@/lib/utils";
import type { Tables } from "@/lib/database.types";

interface InstructorCoursePageProps {
  params: Promise<{ id: string }>;
}

export default async function InstructorCoursePage({ params }: InstructorCoursePageProps) {
  const { id } = await params;
  const profile = await getCurrentProfile();

  if (!profile || (profile.role !== "instructor" && profile.role !== "admin")) {
    redirect("/profile");
  }

  const supabase = getSupabaseServerComponentClient();
  const { data, error } = await supabase
    .from("courses")
    .select(
      "*, lessons(*, quizzes(*)), course_runs(*, enrollments:enrollments(*, student:profiles!enrollments_student_id_fkey(id, full_name, email)))"
    )
    .eq("id", id)
    .single();

  if (error) {
    notFound();
  }

  const course = data as Tables<"courses"> & {
    lessons: (Tables<"lessons"> & { quizzes: Tables<"quizzes">[] })[];
    course_runs: (Tables<"course_runs"> & {
      enrollments: (Tables<"enrollments"> & {
        student: Pick<Tables<"profiles">, "id" | "full_name" | "email">;
      })[];
    })[];
  };

  if (course.instructor_id !== profile.id && profile.role !== "admin") {
    redirect("/instructor");
  }

  const pendingEnrollments = course.course_runs.flatMap((run) =>
    run.enrollments.filter((enrollment) => enrollment.status === "requested").map((enrollment) => ({
      enrollment,
      run,
    }))
  );

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">{course.title}</CardTitle>
            <Badge variant={course.is_published ? "success" : "warning"}>
              {course.is_published ? "Yayında" : "Taslak"}
            </Badge>
          </div>
          <p className="text-sm text-slate-600">{course.summary ?? "Kısa açıklama eklenmemiş."}</p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 text-sm text-slate-600">
          <div>
            <p className="font-medium">Açıklama</p>
            <p>{course.description ?? "Detaylı açıklama henüz eklenmedi."}</p>
          </div>
          <div>
            <p className="font-medium">Toplam ders</p>
            <p>{course.lessons.length}</p>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Yeni Ders Ekle</CardTitle>
            <p className="text-sm text-slate-600">
              Google Drive embed URL&apos;si ve ders sırasını belirtin.
            </p>
          </CardHeader>
          <CardContent>
            <CreateLessonForm courseId={course.id} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Yeni Dönem Oluştur</CardTitle>
            <p className="text-sm text-slate-600">
              Başvuru ve erişim tarihlerini belirleyerek öğrenci kayıtlarını açın.
            </p>
          </CardHeader>
          <CardContent>
            <CreateCourseRunForm courseId={course.id} />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4" id="lessons">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-primary-900">Dersler</h2>
          <span className="text-sm text-slate-500">{course.lessons.length} ders</span>
        </div>
        {course.lessons.length === 0 ? (
          <p className="rounded-xl border border-dashed border-primary-200 bg-white/60 p-6 text-sm text-slate-500">
            Henüz ders eklenmedi.
          </p>
        ) : (
          <div className="grid gap-4">
            {course.lessons
              .slice()
              .sort((a, b) => a.order_index - b.order_index)
              .map((lesson) => (
                <Card key={lesson.id} className="border-l-4 border-l-primary-400">
                  <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle>{lesson.title}</CardTitle>
                      <p className="text-sm text-slate-600">
                        {lesson.content?.slice(0, 120) ?? "Özet eklenmedi."}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={lesson.is_published ? "success" : "warning"}>
                        {lesson.is_published ? "Yayında" : "Taslak"}
                      </Badge>
                      <Button asChild size="sm" variant="secondary">
                        <Link href={`/instructor/lessons/${lesson.id}/quiz`}>
                          Quiz Yönetimi
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="text-xs text-slate-500">
                    {lesson.quizzes.length > 0
                      ? `${lesson.quizzes.length} quiz var`
                      : "Quiz henüz eklenmedi"}
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-primary-900">Dönemler</h2>
        {course.course_runs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-primary-200 bg-white/60 p-6 text-sm text-slate-500">
            Henüz dönem tanımlanmadı.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {course.course_runs
              .slice()
              .sort((a, b) => new Date(a.access_start).getTime() - new Date(b.access_start).getTime())
              .map((run) => (
                <Card key={run.id}>
                  <CardHeader>
                    <CardTitle>{run.label ?? "Yeni dönem"}</CardTitle>
                    <p className="text-sm text-slate-600">
                      {formatDateRange(run.access_start, run.access_end)}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-slate-600">
                    <p>
                      <span className="font-medium">Başvuru penceresi:</span> {" "}
                      {run.application_start
                        ? formatDateRange(run.application_start, run.application_end)
                        : "Belirlenmedi"}
                    </p>
                    <p>
                      <span className="font-medium">Başvuru sayısı:</span> {run.enrollments.length}
                    </p>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-primary-900">Bekleyen Başvurular</h2>
        {pendingEnrollments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-primary-200 bg-white/60 p-6 text-sm text-slate-500">
            Bekleyen başvuru bulunmuyor.
          </p>
        ) : (
          <div className="grid gap-4">
            {pendingEnrollments.map(({ enrollment, run }) => (
              <Card key={enrollment.id}>
                <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle>{enrollment.student.full_name ?? enrollment.student.email}</CardTitle>
                    <p className="text-sm text-slate-600">
                      {run.label ?? "Dönem"} · Dekont: {enrollment.receipt_no}
                    </p>
                  </div>
                  <ApplicationDecisionButtons
                    enrollmentId={enrollment.id}
                    currentStatus={enrollment.status}
                  />
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

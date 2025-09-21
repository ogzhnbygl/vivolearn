import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CurriculumBuilder } from "@/components/instructor/curriculum-builder";
import { UpdateCourseScheduleForm } from "@/components/instructor/update-course-schedule-form";
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
      "*, course_sections(*, lessons(*, quizzes(*))), course_runs(*, enrollments:enrollments(*, student:profiles!enrollments_student_id_fkey(id, full_name, email)))"
    )
    .eq("id", id)
    .single();

  if (error) {
    notFound();
  }

  const course = data as Tables<"courses"> & {
    course_sections: (Tables<"course_sections"> & {
      lessons: (Tables<"lessons"> & { quizzes: Tables<"quizzes">[] })[];
    })[];
    course_runs: (Tables<"course_runs"> & {
      enrollments: (Tables<"enrollments"> & {
        student: Pick<Tables<"profiles">, "id" | "full_name" | "email">;
      })[];
    })[];
  };

  if (course.instructor_id !== profile.id && profile.role !== "admin") {
    redirect("/instructor");
  }

  const courseRun = course.course_runs[0] ?? null;
  const pendingEnrollments = courseRun
    ? courseRun.enrollments
        .filter((enrollment) => enrollment.status === "requested")
        .map((enrollment) => ({ enrollment, run: courseRun }))
    : [];

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
            <p>
              {course.course_sections.reduce((acc, section) => acc + (section.lessons?.length ?? 0), 0)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Müfredat Yapısı</CardTitle>
          <p className="text-sm text-slate-600">
            Bölümleri ve dersleri sürükleyip bırakarak yeniden sıralayın, içerikleri düzenleyin.
          </p>
        </CardHeader>
        <CardContent>
          <CurriculumBuilder
            courseId={course.id}
            sections={(course.course_sections ?? []).map((section) => ({
              ...section,
              lessons: section.lessons ?? [],
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kurs Takvimi</CardTitle>
          <p className="text-sm text-slate-600">
            Başvuru ve erişim tarihlerini düzenleyerek öğrenci başvurularını yönetin.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {courseRun ? (
            <>
              <div className="rounded-lg border border-primary-100 bg-primary-50/50 p-4 text-sm text-primary-900">
                <p>
                  <span className="font-medium">Başvuru:</span> {" "}
                  {courseRun.application_start
                    ? formatDateRange(courseRun.application_start, courseRun.application_end)
                    : "Belirlenmedi"}
                </p>
                <p>
                  <span className="font-medium">Erişim:</span> {" "}
                  {formatDateRange(courseRun.access_start, courseRun.access_end)}
                </p>
                {typeof courseRun.enrollment_limit === "number" && (
                  <p>
                    <span className="font-medium">Kontenjan:</span> {courseRun.enrollment_limit}
                  </p>
                )}
              </div>
              <UpdateCourseScheduleForm courseId={course.id} courseRun={courseRun} />
            </>
          ) : (
            <p className="rounded-lg border border-dashed border-primary-200 bg-white/60 p-4 text-sm text-slate-600">
              Bu kurs için takvim henüz oluşturulmadı. Kursu yeniden oluşturarak veya destek ekibiyle iletişime
              geçerek takvim oluşturun.
            </p>
          )}
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="text-xlfont-semibold text-primary-900">Bekleyen Başvurular</h2>
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
                      Takvim: {formatDateRange(run.access_start, run.access_end)} · Dekont: {enrollment.receipt_no}
                    </p>
                  </div>
                  <ApplicationDecisionButtons enrollmentId={enrollment.id} currentStatus={enrollment.status} />
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

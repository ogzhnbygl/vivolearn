import { redirect } from "next/navigation";
import { Container } from "@/components/layout/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth";
import { getSupabaseServerComponentClient } from "@/lib/supabase-server";
import { formatDateRange } from "@/lib/utils";
import Link from "next/link";
import type { Tables } from "@/lib/database.types";

export const metadata = {
  title: "Profil | VivoLearn",
};

export default async function ProfilePage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login?redirectTo=/profile");
  }

  const supabase = getSupabaseServerComponentClient();
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(
      "*, course_runs(*, course:courses(*, lessons(*, quizzes(*))))"
    )
    .eq("student_id", profile.id)
    .order("created_at", { ascending: false });

  const { data: progressRows } = await supabase
    .from("progress")
    .select("*")
    .eq("student_id", profile.id);

  const progressByLesson = new Map<string, Tables<"progress">>();
  (progressRows ?? []).forEach((row) => {
    progressByLesson.set(`${row.course_run_id}-${row.lesson_id}`, row as Tables<"progress">);
  });

  const typedEnrollments = (enrollments ?? []) as (Tables<"enrollments"> & {
    course_runs: Tables<"course_runs"> & {
      course: Tables<"courses"> & {
        lessons: (Tables<"lessons"> & { quizzes: Tables<"quizzes">[] })[];
      };
    };
  })[];

  return (
    <Container className="flex flex-col gap-10">
      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profil Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p>
              <span className="font-medium">Ad Soyad:</span> {profile.full_name ?? "Belirtilmemiş"}
            </p>
            <p>
              <span className="font-medium">E-posta:</span> {profile.email}
            </p>
            <p>
              <span className="font-medium">Rol:</span> {roleLabel(profile.role)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary-50 to-white">
          <CardHeader>
            <CardTitle>Hızlı Bağlantılar</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-primary-700">
            <Link href="/courses" className="hover:underline">
              Açık kursları keşfet
            </Link>
            <Link href="/instructor" className="hover:underline">
              Eğitmen paneline git
            </Link>
            {profile.role === "admin" && (
              <Link href="/admin/users" className="hover:underline">
                Admin kullanıcı yönetimi
              </Link>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-primary-900">Başvurularım & Derslerim</h2>
          <Button asChild variant="secondary">
            <Link href="/courses">Yeni kurslara bak</Link>
          </Button>
        </div>
        {typedEnrollments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-primary-200 bg-white/60 p-6 text-sm text-slate-500">
            Henüz bir kursa başvurmadınız. Kurs listesinden uygun programı seçerek başvuru yapabilirsiniz.
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {typedEnrollments.map((enrollment) => {
              const lessons = enrollment.course_runs.course.lessons;
              const completedCount = lessons.filter((lesson) =>
                progressByLesson.get(`${enrollment.course_run_id}-${lesson.id}`)?.is_completed
              ).length;

              const quizzes = lessons.flatMap((lesson) => lesson.quizzes ?? []);
              const hasCompletedAllTheory = completedCount === lessons.length && lessons.length > 0;

              return (
                <Card key={enrollment.id} className="h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl">
                        {enrollment.course_runs.course.title}
                      </CardTitle>
                      <Badge variant={statusVariant(enrollment.status)}>
                        {statusLabel(enrollment.status)}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      {formatDateRange(
                        enrollment.course_runs.access_start,
                        enrollment.course_runs.access_end
                      )}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-slate-600">
                    <p>
                      <span className="font-medium">Ders ilerlemesi:</span> {completedCount}/{lessons.length}
                    </p>
                    <p>
                      <span className="font-medium">Quiz sayısı:</span> {quizzes.length}
                    </p>
                    <p>
                      <span className="font-medium">Uygulama dersi uygunluğu:</span>{" "}
                      {hasCompletedAllTheory ? "Teorik dersler tamamlandı" : "Tüm dersleri tamamlayın"}
                    </p>
                    <div className="flex gap-2">
                      <Button asChild size="sm">
                        <Link href={`/courses/${enrollment.course_runs.course_id}`}>Kurs sayfası</Link>
                      </Button>
                      <Button
                        asChild
                        size="sm"
                        variant="secondary"
                        disabled={!hasCompletedAllTheory || enrollment.status !== "approved"}
                      >
                        <Link href={`/courses/${enrollment.course_runs.course_id}#lessons`}>
                          Derslere devam et
                        </Link>
                      </Button>
                    </div>
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

function roleLabel(role: Tables<"profiles">["role"]) {
  switch (role) {
    case "admin":
      return "Admin";
    case "instructor":
      return "Eğitmen";
    default:
      return "Öğrenci";
  }
}

function statusLabel(status: Tables<"enrollments">["status"]) {
  switch (status) {
    case "approved":
      return "Onaylandı";
    case "rejected":
      return "Reddedildi";
    default:
      return "Beklemede";
  }
}

function statusVariant(status: Tables<"enrollments">["status"]) {
  switch (status) {
    case "approved":
      return "success" as const;
    case "rejected":
      return "danger" as const;
    default:
      return "warning" as const;
  }
}

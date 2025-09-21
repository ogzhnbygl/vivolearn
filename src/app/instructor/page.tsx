import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { getSupabaseServerComponentClient } from "@/lib/supabase-server";
import { formatDateRange } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/lib/database.types";

export default async function InstructorDashboard() {
  const profile = await getCurrentProfile();
  const supabase = getSupabaseServerComponentClient();

  const { data } = await supabase
    .from("courses")
    .select(
      "*, course_runs(*, enrollments:enrollments(*)), lessons(*)"
    )
    .order("created_at", { ascending: false })
    .match(
      profile?.role === "admin"
        ? {}
        : {
            instructor_id: profile?.id ?? "",
          }
    );

  const courses = (data ?? []) as (Tables<"courses"> & {
    course_runs: (Tables<"course_runs"> & { enrollments: Tables<"enrollments">[] })[];
    lessons: Tables<"lessons">[];
  })[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-primary-900">Kurslarım</h2>
        <Button asChild>
          <Link href="/instructor/courses/new">Yeni Kurs Oluştur</Link>
        </Button>
      </div>

      {courses.length === 0 ? (
        <p className="rounded-xl border border-dashed border-primary-200 bg-white/60 p-6 text-sm text-slate-500">
          Henüz bir kurs oluşturmamışsınız. Yeni kurs oluşturarak dersleri eklemeye başlayın.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {courses.map((course) => {
            const totalEnrollments = course.course_runs.reduce(
              (acc, run) => acc + run.enrollments.length,
              0
            );
            const approvedEnrollments = course.course_runs.reduce(
              (acc, run) => acc + run.enrollments.filter((en) => en.status === "approved").length,
              0
            );
            const schedule = course.course_runs[0] ?? null;

            return (
              <Card key={course.id} className="h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{course.title}</CardTitle>
                    <Badge variant={course.is_published ? "success" : "warning"}>
                      {course.is_published ? "Yayında" : "Taslak"}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    {schedule ? formatDateRange(schedule.access_start, schedule.access_end) : "Takvim bekleniyor"}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-600">
                  <p>
                    <span className="font-medium">Ders sayısı:</span> {course.lessons.length}
                  </p>
                  <p>
                    <span className="font-medium">Toplam başvuru:</span> {totalEnrollments}
                  </p>
                  <p>
                    <span className="font-medium">Onaylanan öğrenci:</span> {approvedEnrollments}
                  </p>
                  <div className="flex gap-2">
                    <Button asChild size="sm">
                      <Link href={`/instructor/courses/${course.id}`}>Yönet</Link>
                    </Button>
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/courses/${course.id}`}>Önizleme</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { getCurrentProfile } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApplicationDecisionButtons } from "@/components/instructor/application-decision-buttons";
import { formatDateRange } from "@/lib/utils";
import type { Tables } from "@/lib/database.types";

export const metadata = {
  title: "Başvurular | Eğitmen Paneli",
};

export default async function InstructorApplicationsPage() {
  const profile = await getCurrentProfile();
  const supabase = getSupabaseServerClient();

  const { data } = await supabase
    .from("enrollments")
    .select(
      "*, student:profiles(id, full_name, email), course_runs(*, course:courses(title, instructor_id))"
    )
    .eq("status", "requested")
    .order("created_at", { ascending: true });

  const enrollments = (data ?? []) as (Tables<"enrollments"> & {
    student: Pick<Tables<"profiles">, "id" | "full_name" | "email">;
    course_runs: Tables<"course_runs"> & {
      course: Pick<Tables<"courses">, "title" | "instructor_id">;
    };
  })[];

  const filtered = enrollments.filter(
    (item) => profile?.role === "admin" || item.course_runs.course.instructor_id === profile?.id
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-primary-900">Bekleyen Başvurular</h2>
      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-primary-200 bg-white/60 p-6 text-sm text-slate-500">
          Şu anda değerlendirilmesi gereken başvuru bulunmuyor.
        </p>
      ) : (
        <div className="grid gap-4">
          {filtered.map((enrollment) => (
            <Card key={enrollment.id}>
              <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>{enrollment.student.full_name ?? enrollment.student.email}</CardTitle>
                  <p className="text-sm text-slate-600">
                    {enrollment.course_runs.course.title} · {formatDateRange(
                      enrollment.course_runs.access_start,
                      enrollment.course_runs.access_end
                    )}
                  </p>
                  <p className="text-xs text-slate-500">Dekont: {enrollment.receipt_no}</p>
                </div>
                <ApplicationDecisionButtons
                  enrollmentId={enrollment.id}
                  currentStatus={enrollment.status}
                />
              </CardHeader>
              <CardContent className="text-xs text-slate-500">
                Başvuru zamanı: {new Date(enrollment.created_at).toLocaleString("tr-TR")}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

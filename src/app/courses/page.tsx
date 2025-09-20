import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateRange } from "@/lib/utils";
import { getPublishedCourses } from "@/lib/courses";

export const metadata = {
  title: "Kurslar | VivoLearn",
};

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const courses = await getPublishedCourses();

  return (
    <Container className="flex flex-col gap-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-primary-900">Tüm Kurslar</h1>
        <p className="text-sm text-slate-600">
          Fakülteler tarafından açılan teorik derslerin tamamı. Kayıt dönemleri, içerik ve eğitmen
          bilgileri aşağıdadır.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => {
          const nextRun = course.course_runs
            .slice()
            .sort((a, b) => new Date(a.access_start).getTime() - new Date(b.access_start).getTime())[0];

          return (
            <Card key={course.id} className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{course.title}</CardTitle>
                  <Badge variant={course.is_published ? "success" : "warning"}>
                    {course.is_published ? "Yayında" : "Taslak"}
                  </Badge>
                </div>
                <p className="text-sm text-slate-600">
                  {course.summary ?? course.description?.slice(0, 120) ?? "Kurs açıklaması hazırlanıyor"}
                </p>
              </CardHeader>
              <CardContent className="flex h-full flex-col justify-between gap-4 text-sm text-slate-600">
                <div className="space-y-2">
                  <p>
                    <span className="font-medium">Eğitmen:</span> {" "}
                    {course.instructor?.full_name ?? course.instructor?.email ?? "Belirlenecek"}
                  </p>
                  <p>
                    <span className="font-medium">Takvim:</span> {" "}
                    {nextRun
                      ? formatDateRange(nextRun.access_start, nextRun.access_end)
                      : "Takvim yakında"}
                  </p>
                  <p>
                    <span className="font-medium">Dönem sayısı:</span> {course.course_runs.length}
                  </p>
                </div>
                <Button asChild variant="secondary">
                  <Link href={`/courses/${course.id}`}>Kurs Detayı</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </Container>
  );
}

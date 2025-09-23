import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateRange } from "@/lib/utils";
import { getPublishedCourses, partitionCoursesByRunState } from "@/lib/courses";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const courses = await getPublishedCourses();
  const { open, upcoming, past } = partitionCoursesByRunState(courses);

  return (
    <Container className="flex flex-col gap-12">
      <section className="grid gap-6 rounded-3xl bg-white/70 p-10 shadow-xl ring-1 ring-primary-100">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Badge variant="outline" className="uppercase tracking-wide">
              Medeniyet Üniversitesi
            </Badge>
            <h1 className="text-3xl font-semibold text-primary-900 md:text-4xl">
              VivoLearn ile teorik dersleri online tamamlayın
            </h1>
            <p className="max-w-2xl text-base text-slate-600">
              Fakülte ve programlar için hazırlanan içerikleri izleyin, quizlerle kendinizi
              değerlendirin ve uygulama derslerine katılmaya hazır olun.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/courses">Tüm Kursları İncele</Link>
          </Button>
        </div>
      </section>

      <CourseSection title="Açık Kurslar" emptyText="Şu anda açık kurs bulunmuyor" courses={open} />
      <CourseSection title="Yakında Başlayacak" emptyText="Yeni kurs takvimleri yakında yüklenecek" courses={upcoming} />
      <CourseSection title="Tamamlanmış Programlar" emptyText="Tamamlanmış kurs bulunmuyor" courses={past} />
    </Container>
  );
}

interface CourseSectionProps {
  title: string;
  emptyText: string;
  courses: Awaited<ReturnType<typeof getPublishedCourses>>;
}

function CourseSection({ title, emptyText, courses }: CourseSectionProps) {
  return (
    <section className="space-y-6 pb-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold text-primary-900">{title}</h2>
        <Link
          href="/courses"
          className="text-sm font-medium text-primary-600 transition hover:text-primary-700"
        >
          Tümünü gör
        </Link>
      </div>
      {courses.length === 0 ? (
        <p className="rounded-xl border border-dashed border-primary-200 bg-white/60 p-6 text-sm text-slate-500">
          {emptyText}
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="group block h-full focus-visible:outline-none"
              prefetch={false}
            >
              <Card className="h-full rounded-2xl border border-white/0 bg-white/80 shadow-md transition duration-200 group-hover:-translate-y-1 group-hover:border-primary-200 group-hover:bg-primary-50/90">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-primary-900">
                    {course.title}
                  </CardTitle>
                  <p className="text-sm text-slate-500">
                    {course.summary ?? course.description?.slice(0, 120) ?? "Detaylar yakında"}
                  </p>
                </CardHeader>
                <CardContent className="flex h-full flex-col gap-4 text-sm text-slate-600">
                  <div className="space-y-2">
                    <p>
                      <span className="font-medium text-slate-800">Sorumlu Eğitmen:</span> {" "}
                      {course.instructor?.full_name ?? "Belirlenecek"}
                    </p>
                    <p>
                      <span className="font-medium text-slate-800">Erişim aralığı:</span> {" "}
                        {Array.isArray(course.course_runs) && course.course_runs.length > 0
                          ? formatDateRange(
                              course.course_runs[0]?.access_start,
                              course.course_runs[0]?.access_end
                            )
                          : "Takvim yakında"}
                    </p>
                  </div>
                  <div className="mt-auto flex items-center gap-2 text-xs uppercase tracking-wide text-primary-600 transition group-hover:text-primary-700">
                    Kurs detaylarını görüntüleyin
                    <span aria-hidden>→</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

import { CreateCourseForm } from "@/components/instructor/create-course-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Yeni Kurs Oluştur | VivoLearn",
};

export default function NewCoursePage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Kurs Detayları</CardTitle>
          <p className="text-sm text-slate-600">
            Temel bilgileri doldurun. Ders ve quiz eklemelerinin yanı sıra kurs takvimini bu formdan yönetebilirsiniz.
          </p>
        </CardHeader>
        <CardContent>
          <CreateCourseForm />
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import type { Tables } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { applyToCourseAction } from "@/app/actions/courses";
import Link from "next/link";

interface CourseApplicationFormProps {
  courseId: string;
  courseRun: Tables<"course_runs"> | null;
  profile: Tables<"profiles"> | null;
  existingEnrollment: (Tables<"enrollments"> & { course_runs: Tables<"course_runs"> }) | null;
}

function isApplicationOpen(run: Tables<"course_runs">) {
  const now = new Date();
  const start = run.application_start ? new Date(run.application_start) : new Date(run.access_start);
  const endCandidate = run.application_end ?? run.access_end;
  const end = endCandidate ? new Date(endCandidate) : null;

  return start <= now && (!end || now <= end);
}

export function CourseApplicationForm({
  courseId,
  courseRun,
  profile,
  existingEnrollment,
}: CourseApplicationFormProps) {
  const [receiptNo, setReceiptNo] = useState(existingEnrollment?.receipt_no ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!profile) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Kursa başvur</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          <p>Başvuru yapabilmek için giriş yapmalısınız.</p>
          <div className="flex gap-2">
            <Button asChild variant="secondary">
              <Link href="/login">Giriş Yap</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Kayıt Ol</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!courseRun) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Başvuru Takvimi Bekleniyor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          <p>
            Bu kurs için başvuru ve erişim tarihleri henüz tanımlanmadı. Eğitmen takvimi belirledikten sonra
            başvuru yapabilirsiniz.
          </p>
        </CardContent>
      </Card>
    );
  }

  const statusLabel = existingEnrollment
    ? existingEnrollment.status === "approved"
      ? "Başvurunuz onaylandı"
      : existingEnrollment.status === "requested"
      ? "Başvurunuz değerlendiriliyor"
      : "Başvurunuz reddedildi"
    : null;

  const isApproved = existingEnrollment?.status === "approved";
  const approvalDate = existingEnrollment?.decided_at
    ? new Date(existingEnrollment.decided_at).toLocaleString("tr-TR")
    : null;

  if (isApproved) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Başvuru Durumu</CardTitle>
          <p className="text-sm text-green-600">Başvurunuz onaylandı</p>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          <p>
            <span className="font-medium">Dahil olduğunuz takvim:</span> {" "}
            {existingEnrollment.course_runs.label ?? "Güncel takvim"}
          </p>
          <p>
            <span className="font-medium">Başvuru zamanı:</span> {" "}
            {new Date(existingEnrollment.created_at).toLocaleString("tr-TR")}
          </p>
          {approvalDate && (
            <p>
              <span className="font-medium">Onay tarihi:</span> {" "}
              {approvalDate}
            </p>
          )}
          <p className="rounded-lg border border-green-200 bg-green-50/60 p-4 text-green-700">
            Eğitim süreci başladı. Dersleri izlemek için kurs içeriğine geri dönebilirsiniz.
          </p>
        </CardContent>
      </Card>
    );
  }

  const openForApplication = isApplicationOpen(courseRun);
  const applicationWindow = courseRun.application_start
    ? `${new Date(courseRun.application_start).toLocaleString("tr-TR")} - ${
        courseRun.application_end ? new Date(courseRun.application_end).toLocaleString("tr-TR") : "Süre belirtilmedi"
      }`
    : "Başvuru tarihleri belirlenmedi";
  const accessWindow = `${new Date(courseRun.access_start).toLocaleString("tr-TR")} - ${
    courseRun.access_end ? new Date(courseRun.access_end).toLocaleString("tr-TR") : "Süre belirtilmedi"
  }`;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Başvuru Formu</CardTitle>
        {statusLabel && <p className="text-sm text-slate-600">{statusLabel}</p>}
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-slate-600">
        <div className="rounded-lg border border-primary-100 bg-white/60 p-4 text-sm text-slate-600">
          <p>
            <span className="font-medium">Başvuru aralığı:</span> {applicationWindow}
          </p>
          <p>
            <span className="font-medium">Erişim aralığı:</span> {accessWindow}
          </p>
          {typeof courseRun.enrollment_limit === "number" && (
            <p>
              <span className="font-medium">Kontenjan:</span> {courseRun.enrollment_limit}
            </p>
          )}
        </div>
        {openForApplication || existingEnrollment ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              setMessage(null);
              setError(null);

              startTransition(async () => {
                const formData = new FormData(event.currentTarget);
                const receipt = formData.get("receiptNo") as string;

                const result = await applyToCourseAction({
                  courseId,
                  courseRunId: courseRun.id,
                  receiptNo: receipt,
                });

                if (result.error) {
                  setError(result.error);
                } else {
                  setMessage("Başvurunuz alınmıştır. Onaylandığında e-posta ile bilgilendirileceksiniz.");
                }
              });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="receiptNo">Dekont Numarası</Label>
              <Input
                id="receiptNo"
                name="receiptNo"
                required
                placeholder="Örn. 2024-000123"
                value={receiptNo}
                onChange={(event) => setReceiptNo(event.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Gönderiliyor..." : "Başvuru Yap"}
            </Button>
            {message && <p className="text-sm text-green-600">{message}</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        ) : (
          <p className="rounded-lg border border-dashed border-primary-200 bg-white/60 p-4">
            Başvuru süreci henüz açık değil. Takvimde belirtilen tarihler arasında başvuru yapabilirsiniz.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

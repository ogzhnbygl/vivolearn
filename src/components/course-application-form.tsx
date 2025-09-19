"use client";

import { useMemo, useState, useTransition } from "react";
import type { Tables } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { applyToCourseAction } from "@/app/actions/courses";
import Link from "next/link";

interface CourseApplicationFormProps {
  courseId: string;
  courseRuns: Tables<"course_runs">[];
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
  courseRuns,
  profile,
  existingEnrollment,
}: CourseApplicationFormProps) {
  const [receiptNo, setReceiptNo] = useState(existingEnrollment?.receipt_no ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const openRuns = useMemo(() => courseRuns.filter((run) => isApplicationOpen(run)), [courseRuns]);

  const [selectedRun, setSelectedRun] = useState<string>(
    existingEnrollment?.course_run_id ?? openRuns[0]?.id ?? courseRuns[0]?.id ?? ""
  );

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

  const statusLabel = existingEnrollment
    ? existingEnrollment.status === "approved"
      ? "Başvurunuz onaylandı"
      : existingEnrollment.status === "requested"
      ? "Başvurunuz değerlendiriliyor"
      : "Başvurunuz reddedildi"
    : null;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Başvuru Formu</CardTitle>
        {statusLabel && <p className="text-sm text-slate-600">{statusLabel}</p>}
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-slate-600">
        {openRuns.length === 0 ? (
          <p className="rounded-lg border border-dashed border-primary-200 bg-white/60 p-4">
            Aktif başvuru dönemi bulunmuyor. Yeni dönem açıldığında bilgilendirileceksiniz.
          </p>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              setMessage(null);
              setError(null);

              startTransition(async () => {
                const formData = new FormData(event.currentTarget);
                const courseRunId = formData.get("courseRunId") as string;
                const receipt = formData.get("receiptNo") as string;

                const result = await applyToCourseAction({
                  courseId,
                  courseRunId,
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
              <Label htmlFor="courseRunId">Dönem</Label>
              <select
                id="courseRunId"
                name="courseRunId"
                className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                value={selectedRun}
                onChange={(event) => setSelectedRun(event.target.value)}
              >
                {openRuns.map((run) => (
                  <option key={run.id} value={run.id}>
                    {run.label ?? "Yeni dönem"} ({new Date(run.access_start).toLocaleDateString("tr-TR")})
                  </option>
                ))}
              </select>
            </div>
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
        )}
      </CardContent>
    </Card>
  );
}

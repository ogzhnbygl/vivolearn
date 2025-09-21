"use client";

import { useState, useTransition } from "react";
import { updateCourseScheduleAction } from "@/app/actions/courses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Tables } from "@/lib/database.types";

interface UpdateCourseScheduleFormProps {
  courseId: string;
  courseRun: Tables<"course_runs">;
}

const toDateTimeLocalString = (value: string | null): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (num: number) => String(num).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export function UpdateCourseScheduleForm({ courseId, courseRun }: UpdateCourseScheduleFormProps) {
  const [accessStart, setAccessStart] = useState(toDateTimeLocalString(courseRun.access_start));
  const [accessEnd, setAccessEnd] = useState(toDateTimeLocalString(courseRun.access_end));
  const [applicationStart, setApplicationStart] = useState(
    toDateTimeLocalString(courseRun.application_start)
  );
  const [applicationEnd, setApplicationEnd] = useState(toDateTimeLocalString(courseRun.application_end));
  const [enrollmentLimit, setEnrollmentLimit] = useState(
    courseRun.enrollment_limit ? String(courseRun.enrollment_limit) : ""
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage(null);
        setError(null);

        startTransition(async () => {
          const result = await updateCourseScheduleAction({
            courseId,
            courseRunId: courseRun.id,
            accessStart,
            accessEnd,
            applicationStart,
            applicationEnd,
            enrollmentLimit: enrollmentLimit ? Number(enrollmentLimit) : null,
          });

          if (result.error) {
            setError(result.error);
            return;
          }

          setMessage("Takvim bilgileri güncellendi.");
        });
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="accessStartEdit">Erişim Başlangıcı</Label>
          <Input
            id="accessStartEdit"
            type="datetime-local"
            required
            value={accessStart}
            onChange={(event) => setAccessStart(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="accessEndEdit">Erişim Bitişi</Label>
          <Input
            id="accessEndEdit"
            type="datetime-local"
            value={accessEnd}
            onChange={(event) => setAccessEnd(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="applicationStartEdit">Başvuru Başlangıcı</Label>
          <Input
            id="applicationStartEdit"
            type="datetime-local"
            value={applicationStart}
            onChange={(event) => setApplicationStart(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="applicationEndEdit">Başvuru Bitişi</Label>
          <Input
            id="applicationEndEdit"
            type="datetime-local"
            value={applicationEnd}
            onChange={(event) => setApplicationEnd(event.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="enrollmentLimitEdit">Kontenjan (opsiyonel)</Label>
        <Input
          id="enrollmentLimitEdit"
          type="number"
          min={1}
          value={enrollmentLimit}
          onChange={(event) => setEnrollmentLimit(event.target.value)}
          placeholder="Örn. 50"
        />
      </div>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Güncelleniyor..." : "Takvimi Kaydet"}
        </Button>
        {message && <p className="text-sm text-green-600">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </form>
  );
}

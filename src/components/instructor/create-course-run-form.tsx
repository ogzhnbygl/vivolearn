"use client";

import { useState, useTransition } from "react";
import { createCourseRunAction } from "@/app/actions/courses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateCourseRunFormProps {
  courseId: string;
}

export function CreateCourseRunForm({ courseId }: CreateCourseRunFormProps) {
  const [label, setLabel] = useState("");
  const [accessStart, setAccessStart] = useState("");
  const [accessEnd, setAccessEnd] = useState("");
  const [applicationStart, setApplicationStart] = useState("");
  const [applicationEnd, setApplicationEnd] = useState("");
  const [enrollmentLimit, setEnrollmentLimit] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setMessage(null);
        startTransition(async () => {
          const result = await createCourseRunAction({
            courseId,
            label,
            accessStart,
            accessEnd,
            applicationStart,
            applicationEnd,
            enrollmentLimit: enrollmentLimit ? Number(enrollmentLimit) : null,
          });

          if (result.error) {
            setError(result.error);
          } else {
            setMessage("Dönem başarıyla oluşturuldu.");
            setLabel("");
            setAccessStart("");
            setAccessEnd("");
            setApplicationStart("");
            setApplicationEnd("");
            setEnrollmentLimit("");
          }
        });
      }}
    >
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="label">Dönem Adı</Label>
        <Input
          id="label"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Örn. 2024 Güz"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="accessStart">Erişim Başlangıcı</Label>
        <Input
          id="accessStart"
          type="datetime-local"
          required
          value={accessStart}
          onChange={(event) => setAccessStart(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="accessEnd">Erişim Bitişi</Label>
        <Input
          id="accessEnd"
          type="datetime-local"
          value={accessEnd}
          onChange={(event) => setAccessEnd(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="applicationStart">Başvuru Başlangıcı</Label>
        <Input
          id="applicationStart"
          type="datetime-local"
          value={applicationStart}
          onChange={(event) => setApplicationStart(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="applicationEnd">Başvuru Bitişi</Label>
        <Input
          id="applicationEnd"
          type="datetime-local"
          value={applicationEnd}
          onChange={(event) => setApplicationEnd(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="enrollmentLimit">Kontenjan</Label>
        <Input
          id="enrollmentLimit"
          type="number"
          min={1}
          value={enrollmentLimit}
          onChange={(event) => setEnrollmentLimit(event.target.value)}
          placeholder="Örn. 50"
        />
      </div>
      <div className="md:col-span-2 flex flex-col gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Kaydediliyor..." : "Dönem Ekle"}
        </Button>
        {message && <p className="text-sm text-green-600">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </form>
  );
}

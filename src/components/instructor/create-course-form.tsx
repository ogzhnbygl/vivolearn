"use client";

import { useState, useTransition } from "react";
import { createCourseAction } from "@/app/actions/courses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function CreateCourseForm() {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [accessStart, setAccessStart] = useState("");
  const [accessEnd, setAccessEnd] = useState("");
  const [applicationStart, setApplicationStart] = useState("");
  const [applicationEnd, setApplicationEnd] = useState("");
  const [enrollmentLimit, setEnrollmentLimit] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setMessage(null);
        startTransition(async () => {
          const result = await createCourseAction({
            title,
            summary,
            description,
            coverImageUrl,
            isPublished,
            accessStart,
            accessEnd,
            applicationStart,
            applicationEnd,
            enrollmentLimit: enrollmentLimit ? Number(enrollmentLimit) : null,
          });

          if (result.error) {
            setError(result.error);
          } else {
            setMessage("Kurs oluşturuldu. Dersleri ve içerikleri eklemeye başlayabilirsiniz.");
            setTitle("");
            setSummary("");
            setDescription("");
            setCoverImageUrl("");
            setIsPublished(false);
            setAccessStart("");
            setAccessEnd("");
            setApplicationStart("");
            setApplicationEnd("");
            setEnrollmentLimit("");
          }
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="title">Kurs Başlığı</Label>
        <Input
          id="title"
          name="title"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Örn. İç Hastalıkları Teorik Dersleri"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="summary">Kısa Özet</Label>
        <Input
          id="summary"
          name="summary"
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          placeholder="Programın kısa açıklaması"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Detaylı Açıklama</Label>
        <Textarea
          id="description"
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Bu kursun hedefleri, modülleri ve beklentileri"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="coverImage">Kapak Görseli (opsiyonel)</Label>
        <Input
          id="coverImage"
          name="coverImage"
          value={coverImageUrl}
          onChange={(event) => setCoverImageUrl(event.target.value)}
          placeholder="https://drive.google.com/..."
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
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
            required
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
      </div>
      <div className="space-y-2">
        <Label htmlFor="enrollmentLimit">Kontenjan (opsiyonel)</Label>
        <Input
          id="enrollmentLimit"
          type="number"
          min={1}
          value={enrollmentLimit}
          onChange={(event) => setEnrollmentLimit(event.target.value)}
          placeholder="Örn. 50"
        />
      </div>
      <label className="flex items-center gap-3 text-sm text-slate-600">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300"
          checked={isPublished}
          onChange={(event) => setIsPublished(event.target.checked)}
        />
        Kursu yayınla (öğrenciler tarafından görülebilir)
      </label>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Kaydediliyor..." : "Kurs Oluştur"}
      </Button>
      {message && <p className="text-sm text-green-600">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}

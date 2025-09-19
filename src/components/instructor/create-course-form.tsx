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
          });

          if (result.error) {
            setError(result.error);
          } else {
            setMessage("Kurs oluşturuldu. Ders ve dönem eklemeye başlayabilirsiniz.");
            setTitle("");
            setSummary("");
            setDescription("");
            setCoverImageUrl("");
            setIsPublished(false);
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

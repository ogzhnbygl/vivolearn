"use client";

import { useState, useTransition } from "react";
import { createLessonAction } from "@/app/actions/courses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface CreateLessonFormProps {
  courseId: string;
}

export function CreateLessonForm({ courseId }: CreateLessonFormProps) {
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [content, setContent] = useState("");
  const [orderIndex, setOrderIndex] = useState<string>("0");
  const [isPublished, setIsPublished] = useState(true);
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
          const result = await createLessonAction({
            courseId,
            title,
            videoUrl,
            content,
            orderIndex: Number(orderIndex),
            isPublished,
          });

          if (result.error) {
            setError(result.error);
          } else {
            setMessage("Ders eklendi.");
            setTitle("");
            setVideoUrl("");
            setContent("");
            setOrderIndex("0");
            setIsPublished(true);
          }
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="lessonTitle">Ders Başlığı</Label>
        <Input
          id="lessonTitle"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="videoUrl">Video URL (Google Drive embed)</Label>
        <Input
          id="videoUrl"
          value={videoUrl}
          onChange={(event) => setVideoUrl(event.target.value)}
          required
          placeholder="https://drive.google.com/file/d/.../preview"
        />
        <p className="text-xs text-slate-500">
          Google Drive bağlantıları otomatik olarak embed formatına dönüştürülür. Paylaşım ayarını
          &quot;Bağlantıya sahip herkes&quot; olacak şekilde güncellediğinizden emin olun.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="lessonContent">Ders Özeti</Label>
        <Textarea
          id="lessonContent"
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="orderIndex">Sıra</Label>
        <Input
          id="orderIndex"
          type="number"
          min={0}
          value={orderIndex}
          onChange={(event) => setOrderIndex(event.target.value)}
        />
      </div>
      <label className="flex items-center gap-3 text-sm text-slate-600">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300"
          checked={isPublished}
          onChange={(event) => setIsPublished(event.target.checked)}
        />
        Yayınlandı
      </label>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Kaydediliyor..." : "Ders Ekle"}
      </Button>
      {message && <p className="text-sm text-green-600">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}

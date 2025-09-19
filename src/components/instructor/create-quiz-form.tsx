"use client";

import { useState, useTransition } from "react";
import { createQuizForLessonAction } from "@/app/actions/quiz";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface CreateQuizFormProps {
  lessonId: string;
}

export function CreateQuizForm({ lessonId }: CreateQuizFormProps) {
  const [title, setTitle] = useState("Quiz");
  const [description, setDescription] = useState("");
  const [passingScore, setPassingScore] = useState<string>("70");
  const [duration, setDuration] = useState<string>("");
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
          const result = await createQuizForLessonAction({
            lessonId,
            title,
            description,
            passingScore: Number(passingScore),
            durationSeconds: duration ? Number(duration) * 60 : null,
          });

          if (result.error) {
            setError(result.error);
          } else {
            setMessage("Quiz oluşturuldu. Soru ekleyebilirsiniz.");
          }
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="quizTitle">Başlık</Label>
        <Input
          id="quizTitle"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="quizDescription">Açıklama</Label>
        <Textarea
          id="quizDescription"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="passingScore">Başarı eşiği</Label>
        <Input
          id="passingScore"
          type="number"
          min={0}
          max={100}
          value={passingScore}
          onChange={(event) => setPassingScore(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="duration">Süre (dakika)</Label>
        <Input
          id="duration"
          type="number"
          min={0}
          value={duration}
          onChange={(event) => setDuration(event.target.value)}
          placeholder="Opsiyonel"
        />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Oluşturuluyor..." : "Quiz Oluştur"}
      </Button>
      {message && <p className="text-sm text-green-600">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}

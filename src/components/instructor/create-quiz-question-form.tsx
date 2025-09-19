"use client";

import { useState, useTransition } from "react";
import { createQuizQuestionAction } from "@/app/actions/quiz";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface CreateQuizQuestionFormProps {
  quizId: string;
}

export function CreateQuizQuestionForm({ quizId }: CreateQuizQuestionFormProps) {
  const [prompt, setPrompt] = useState("");
  const [orderIndex, setOrderIndex] = useState<string>("0");
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
          const result = await createQuizQuestionAction({
            quizId,
            prompt,
            orderIndex: Number(orderIndex),
          });

          if (result.error) {
            setError(result.error);
          } else {
            setMessage("Soru eklendi. Şık ekleyebilirsiniz.");
            setPrompt("");
            setOrderIndex(String(Number(orderIndex) + 1));
          }
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="questionPrompt">Soru Metni</Label>
        <Textarea
          id="questionPrompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="questionOrder">Sıra</Label>
        <Input
          id="questionOrder"
          type="number"
          min={0}
          value={orderIndex}
          onChange={(event) => setOrderIndex(event.target.value)}
        />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Kaydediliyor..." : "Soru Ekle"}
      </Button>
      {message && <p className="text-sm text-green-600">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}

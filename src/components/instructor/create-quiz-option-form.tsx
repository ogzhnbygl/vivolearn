"use client";

import { useState, useTransition } from "react";
import { createQuizOptionAction, toggleQuizOptionCorrectAction } from "@/app/actions/quiz";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Tables } from "@/lib/database.types";

interface CreateQuizOptionFormProps {
  questionId: string;
  options: Tables<"quiz_options">[];
}

export function CreateQuizOptionForm({ questionId, options }: CreateQuizOptionFormProps) {
  const [text, setText] = useState("");
  const [isCorrect, setIsCorrect] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          setMessage(null);
          startTransition(async () => {
            const result = await createQuizOptionAction({
              questionId,
              text,
              isCorrect,
            });

            if (result.error) {
              setError(result.error);
            } else {
              setMessage("Seçenek eklendi.");
              setText("");
              setIsCorrect(false);
            }
          });
        }}
      >
        <div className="space-y-2">
          <Label htmlFor={`option-${questionId}`}>Seçenek Metni</Label>
          <Input
            id={`option-${questionId}`}
            value={text}
            onChange={(event) => setText(event.target.value)}
            required
          />
        </div>
        <label className="flex items-center gap-3 text-sm text-slate-600">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            checked={isCorrect}
            onChange={(event) => setIsCorrect(event.target.checked)}
          />
          Doğru seçenek
        </label>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Kaydediliyor..." : "Seçenek Ekle"}
        </Button>
        {message && <p className="text-xs text-green-600">{message}</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </form>
      <div className="space-y-2">
        {options.map((option) => (
          <div key={option.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <span>{option.text}</span>
            <Button
              type="button"
              size="sm"
              variant={option.is_correct ? "primary" : "secondary"}
              onClick={() =>
                startTransition(async () => {
                  await toggleQuizOptionCorrectAction({
                    optionId: option.id,
                    isCorrect: !option.is_correct,
                  });
                })
              }
            >
              {option.is_correct ? "Doğru" : "Doğru yap"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

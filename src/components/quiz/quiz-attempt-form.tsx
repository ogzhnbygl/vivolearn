"use client";

import { useState, useTransition } from "react";
import { submitQuizAttemptAction } from "@/app/actions/quiz";
import { Button } from "@/components/ui/button";
import { Tables } from "@/lib/database.types";

export interface QuizData {
  id: string;
  title: string;
  description: string | null;
  passing_score: number;
  quiz_questions: (Tables<"quiz_questions"> & {
    quiz_options: Tables<"quiz_options">[];
  })[];
}

interface QuizAttemptFormProps {
  quiz: QuizData;
  courseRunId: string;
  lessonId: string;
  existingAttempt: Tables<"quiz_attempts"> | null;
}

export function QuizAttemptForm({ quiz, courseRunId, lessonId, existingAttempt }: QuizAttemptFormProps) {
  const initialSelections = (existingAttempt?.answers as Record<string, string> | null) ?? {};
  const [answers, setAnswers] = useState<Record<string, string>>(initialSelections);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(
    existingAttempt && existingAttempt.score !== null
      ? { score: existingAttempt.score, passed: existingAttempt.score >= quiz.passing_score }
      : null
  );
  const [isPending, startTransition] = useTransition();

  const isSubmitted = existingAttempt?.status === "submitted" && result !== null;

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setStatusMessage(null);
        startTransition(async () => {
          const actionResult = await submitQuizAttemptAction({
            quizId: quiz.id,
            courseRunId,
            lessonId,
            answers,
          });

          if ("error" in actionResult) {
            setError(actionResult.error);
          } else {
            setResult({ score: actionResult.score, passed: actionResult.passed });
            setStatusMessage(
              actionResult.passed
                ? "Tebrikler, quiz başarıyla tamamlandı."
                : "Quiz tekrar denemesi önerilir."
            );
          }
        });
      }}
    >
      <div className="space-y-4">
        {quiz.quiz_questions
          .slice()
          .sort((a, b) => a.order_index - b.order_index)
          .map((question) => (
            <div key={question.id} className="rounded-xl border border-primary-100 bg-white/70 p-4">
              <p className="text-sm font-medium text-primary-900">
                Soru {question.order_index + 1}: {question.prompt}
              </p>
              <div className="mt-3 space-y-2">
                {question.quiz_options.map((option) => (
                  <label key={option.id} className="flex items-center gap-3 text-sm text-slate-600">
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={option.id}
                      disabled={isSubmitted || isPending}
                      checked={answers[question.id] === option.id}
                      onChange={(event) => {
                        if (isSubmitted) return;
                        setAnswers((prev) => ({ ...prev, [question.id]: event.target.value }));
                      }}
                      required
                    />
                    {option.text}
                  </label>
                ))}
              </div>
            </div>
          ))}
      </div>
      <div className="space-y-2 text-sm text-slate-600">
        <Button type="submit" disabled={isPending || isSubmitted}>
          {isSubmitted ? "Quiz tamamlandı" : isPending ? "Gönderiliyor..." : "Quiz&apos;i Gönder"}
        </Button>
        {result && (
          <p className={`text-sm ${result.passed ? "text-green-600" : "text-red-600"}`}>
            Puanınız: {result.score} · Gerekli: {quiz.passing_score}
          </p>
        )}
        {statusMessage && <p className="text-sm text-green-600">{statusMessage}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </form>
  );
}

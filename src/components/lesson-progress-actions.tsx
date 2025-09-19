"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/lib/database.types";
import { updateLessonProgressAction } from "@/app/actions/progress";

interface LessonProgressActionsProps {
  lessonId: string;
  courseRunId: string;
  initialState: {
    isCompleted: boolean;
    lastViewedAt: string | null;
  };
}

type ProgressState = Pick<Tables<"progress">, "is_completed" | "last_viewed_at">;

export function LessonProgressActions({
  lessonId,
  courseRunId,
  initialState,
}: LessonProgressActionsProps) {
  const [state, setState] = useState<ProgressState>({
    is_completed: initialState.isCompleted,
    last_viewed_at: initialState.lastViewedAt,
  });
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const markProgress = (completed: boolean) => {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await updateLessonProgressAction({
        lessonId,
        courseRunId,
        completed,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setState({
        is_completed: completed,
        last_viewed_at: result.lastViewedAt ?? new Date().toISOString(),
      });
      setMessage(completed ? "Ders tamamlandı olarak işaretlendi" : "Ders tamamlanmadı olarak güncellendi");
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="sm"
          variant={state.is_completed ? "secondary" : "primary"}
          onClick={() => markProgress(true)}
          disabled={isPending || state.is_completed}
        >
          Tamamlandı olarak işaretle
        </Button>
        {state.is_completed && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => markProgress(false)}
            disabled={isPending}
          >
            Geri al
          </Button>
        )}
      </div>
      <p className="text-xs text-slate-500">
        Son izlenme: {state.last_viewed_at ? new Date(state.last_viewed_at).toLocaleString("tr-TR") : "-"}
      </p>
      {message && <p className="text-xs text-green-600">{message}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

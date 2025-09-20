"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { getSupabaseServerActionClient } from "@/lib/supabase-server";

interface UpdateLessonProgressPayload {
  lessonId: string;
  courseRunId: string;
  completed: boolean;
}

export async function updateLessonProgressAction({
  lessonId,
  courseRunId,
  completed,
}: UpdateLessonProgressPayload) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { error: "Giriş yapmalısınız." };
  }

  const supabase = getSupabaseServerActionClient();
  const timestamp = new Date().toISOString();

  const { error } = await supabase
    .from("progress")
    .upsert(
      {
        student_id: profile.id,
        lesson_id: lessonId,
        course_run_id: courseRunId,
        is_completed: completed,
        last_viewed_at: timestamp,
        completed_at: completed ? timestamp : null,
      },
      { onConflict: "student_id,course_run_id,lesson_id" }
    );

  if (error) {
    return { error: "İlerleme güncellenemedi: " + error.message };
  }

  revalidatePath(`/lessons/${lessonId}`);
  revalidatePath(`/profile`);
  return { success: true, lastViewedAt: timestamp } as const;
}

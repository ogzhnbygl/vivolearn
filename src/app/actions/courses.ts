"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

interface CreateCoursePayload {
  title: string;
  summary?: string;
  description?: string;
  coverImageUrl?: string;
  isPublished: boolean;
}

export async function createCourseAction(payload: CreateCoursePayload) {
  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== "instructor" && profile.role !== "admin")) {
    return { error: "Kurs oluşturma yetkiniz yok." };
  }

  if (!payload.title.trim()) {
    return { error: "Başlık zorunludur." };
  }

  const supabase = getSupabaseServerClient();
  const slugBase = slugify(payload.title);
  const slug = `${slugBase}-${Date.now().toString(36)}`;

  const { error } = await supabase.from("courses").insert({
    title: payload.title,
    summary: payload.summary,
    description: payload.description,
    cover_image_url: payload.coverImageUrl,
    is_published: payload.isPublished,
    instructor_id: profile.id,
    slug,
  });

  if (error) {
    return { error: "Kurs kaydedilemedi: " + error.message };
  }

  revalidatePath("/instructor");
  revalidatePath("/courses");
  return { success: true } as const;
}

interface CreateCourseRunPayload {
  courseId: string;
  label?: string;
  accessStart: string;
  accessEnd?: string;
  applicationStart?: string;
  applicationEnd?: string;
  enrollmentLimit: number | null;
}

export async function createCourseRunAction(payload: CreateCourseRunPayload) {
  if (!payload.accessStart) {
    return { error: "Erişim başlangıç tarihi zorunludur." };
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("course_runs").insert({
    course_id: payload.courseId,
    label: payload.label,
    access_start: new Date(payload.accessStart).toISOString(),
    access_end: payload.accessEnd ? new Date(payload.accessEnd).toISOString() : null,
    application_start: payload.applicationStart
      ? new Date(payload.applicationStart).toISOString()
      : null,
    application_end: payload.applicationEnd ? new Date(payload.applicationEnd).toISOString() : null,
    enrollment_limit: payload.enrollmentLimit,
  });

  if (error) {
    return { error: "Dönem oluşturulamadı: " + error.message };
  }

  revalidatePath(`/instructor/courses/${payload.courseId}`);
  revalidatePath(`/courses/${payload.courseId}`);
  return { success: true } as const;
}

interface CreateLessonPayload {
  courseId: string;
  title: string;
  videoUrl: string;
  content?: string;
  orderIndex?: number;
  isPublished: boolean;
}

export async function createLessonAction(payload: CreateLessonPayload) {
  if (!payload.title.trim() || !payload.videoUrl.trim()) {
    return { error: "Başlık ve video adresi zorunludur." };
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("lessons").insert({
    course_id: payload.courseId,
    title: payload.title,
    video_url: payload.videoUrl,
    content: payload.content,
    order_index: payload.orderIndex ?? 0,
    is_published: payload.isPublished,
  });

  if (error) {
    return { error: "Ders eklenemedi: " + error.message };
  }

  revalidatePath(`/instructor/courses/${payload.courseId}`);
  revalidatePath(`/courses/${payload.courseId}`);
  return { success: true } as const;
}

interface UpdateEnrollmentStatusPayload {
  enrollmentId: string;
  status: "approved" | "rejected";
}

export async function updateEnrollmentStatusAction({ enrollmentId, status }: UpdateEnrollmentStatusPayload) {
  const supabase = getSupabaseServerClient();
  const { error, data } = await supabase
    .from("enrollments")
    .update({ status, decided_at: new Date().toISOString() })
    .eq("id", enrollmentId)
    .select("course_run_id")
    .single();

  if (error) {
    return { error: "Başvuru güncellenemedi: " + error.message };
  }

  if (data) {
    const { data: courseRun } = await supabase
      .from("course_runs")
      .select("course_id")
      .eq("id", data.course_run_id)
      .single();

    if (courseRun) {
      revalidatePath(`/instructor/courses/${courseRun.course_id}`);
      revalidatePath(`/courses/${courseRun.course_id}`);
    }
  }

  revalidatePath("/instructor/applications");
  revalidatePath("/profile");
  return { success: true } as const;
}

interface ApplyToCoursePayload {
  courseId: string;
  courseRunId: string;
  receiptNo: string;
}

export async function applyToCourseAction({ courseId, courseRunId, receiptNo }: ApplyToCoursePayload) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { error: "Başvuru yapabilmek için giriş yapmalısınız." };
  }

  if (!receiptNo.trim()) {
    return { error: "Dekont numarası zorunludur." };
  }

  const supabase = getSupabaseServerClient();

  const { data: runData, error: runError } = await supabase
    .from("course_runs")
    .select("course_id, access_start, access_end, application_start, application_end")
    .eq("id", courseRunId)
    .single();

  if (runError || !runData || runData.course_id !== courseId) {
    return { error: "Seçilen dönem bulunamadı." };
  }

  const now = new Date();
  const appStart = runData.application_start ? new Date(runData.application_start) : new Date(runData.access_start);
  const appEnd = runData.application_end
    ? new Date(runData.application_end)
    : runData.access_end
    ? new Date(runData.access_end)
    : null;

  if (appStart > now || (appEnd && now > appEnd)) {
    return { error: "Başvuru dönemi dışında işlem yapılamaz." };
  }

  const { error } = await supabase
    .from("enrollments")
    .upsert(
      {
        student_id: profile.id,
        course_run_id: courseRunId,
        receipt_no: receiptNo,
        status: "requested",
        decided_at: null,
      },
      { onConflict: "student_id,course_run_id" }
    );

  if (error) {
    return { error: "Başvuru kaydedilemedi: " + error.message };
  }

  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/profile");
  revalidatePath(`/instructor/courses/${courseId}`);
  revalidatePath("/instructor/applications");
  return { success: true } as const;
}

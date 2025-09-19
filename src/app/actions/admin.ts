"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { Tables } from "@/lib/database.types";

type UserRole = Tables["public"]["Enums"]["user_role"];

interface UpdateUserRolePayload {
  userId: string;
  role: UserRole;
}

export async function updateUserRoleAction({ userId, role }: UpdateUserRolePayload) {
  const admin = await getCurrentProfile();
  if (!admin || admin.role !== "admin") {
    return { error: "Yetkiniz yok." };
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (error) {
    return { error: "Rol güncellenemedi: " + error.message };
  }

  revalidatePath("/admin/users");
  return { success: true } as const;
}

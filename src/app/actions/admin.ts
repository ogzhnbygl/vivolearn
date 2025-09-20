"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { getSupabaseServerActionClient } from "@/lib/supabase-server";
import type { Database } from "@/lib/database.types";

type UserRole = Database["public"]["Enums"]["user_role"];

interface UpdateUserRolePayload {
  userId: string;
  role: UserRole;
}

export async function updateUserRoleAction({ userId, role }: UpdateUserRolePayload) {
  const admin = await getCurrentProfile();
  if (!admin || admin.role !== "admin") {
    return { error: "Yetkiniz yok." };
  }

  const supabase = getSupabaseServerActionClient();
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

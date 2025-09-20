"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { getSupabaseServerActionClient } from "@/lib/supabase-server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TablesUpdate } from "@/lib/database.types";

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

  const supabase = getSupabaseServerActionClient() as unknown as SupabaseClient<Database>;
  const updates: TablesUpdate<"profiles"> = { role };
  const { error } = await supabase
    .from("profiles")
    .update(updates as TablesUpdate<"profiles">)
    .eq("id", userId);

  if (error) {
    return { error: "Rol güncellenemedi: " + error.message };
  }

  revalidatePath("/admin/users");
  return { success: true } as const;
}

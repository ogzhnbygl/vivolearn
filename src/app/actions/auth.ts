"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  getSupabaseServerActionClient,
  getSupabaseServiceRoleClient,
} from "@/lib/supabase-server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TablesInsert } from "@/lib/database.types";

export interface AuthFormState {
  error: string | null;
}

export async function signInAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = (formData.get("email") ?? "").toString().trim();
  const password = (formData.get("password") ?? "").toString();
  const redirectToValue = (formData.get("redirectTo") ?? "").toString().trim();
  const redirectTarget = redirectToValue || undefined;

  if (!email || !password) {
    return { error: "E-posta ve şifre zorunludur." };
  }

  const supabase = getSupabaseServerActionClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Giriş başarısız: " + error.message };
  }

  revalidatePath("/");
  redirect(redirectTarget ?? "/profile");
}

interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
}

export async function registerAction({ fullName, email, password }: RegisterPayload) {
  if (password.length < 6) {
    return { error: "Şifre en az 6 karakter olmalıdır." };
  }

  const supabase = getSupabaseServerActionClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: "Kayıt başarısız: " + error.message };
  }

  const user = data.user;
  if (!user) {
    return { error: "Kullanıcı oluşturulamadı." };
  }

  const serviceClient = getSupabaseServiceRoleClient() as unknown as SupabaseClient<Database>;
  const profileInsert: TablesInsert<"profiles"> = {
    id: user.id,
    email: user.email!,
    full_name: fullName,
  };
  const { error: profileError } = await serviceClient
    .from("profiles")
    .upsert(profileInsert);

  if (profileError) {
    return { error: "Profil kaydı başarısız: " + profileError.message };
  }

  revalidatePath("/");
  redirect("/profile");
}

export async function signOutAction() {
  const supabase = getSupabaseServerActionClient();
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/");
}

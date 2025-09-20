"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  getSupabaseServerActionClient,
  getSupabaseServiceRoleClient,
} from "@/lib/supabase-server";

interface SignInPayload {
  email: string;
  password: string;
  redirectTo?: string;
}

export async function signInAction({ email, password, redirectTo }: SignInPayload) {
  const supabase = getSupabaseServerActionClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Giriş başarısız: " + error.message };
  }

  revalidatePath("/");
  redirect(redirectTo ?? "/profile");
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

  const serviceClient = getSupabaseServiceRoleClient();
  const { error: profileError } = await serviceClient.from("profiles").upsert({
    id: user.id,
    email: user.email!,
    full_name: fullName,
  });

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

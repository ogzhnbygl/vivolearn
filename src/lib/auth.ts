import type { Session, User } from "@supabase/supabase-js";
import type { Tables } from "./database.types";
import { getSupabaseServerClient } from "./supabase-server";

type Profile = Tables<"profiles">;

export async function getAuthSession(): Promise<Session | null> {
  const supabase = getSupabaseServerClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error("Supabase session error", error.message);
    return null;
  }

  return session;
}

export async function getAuthenticatedUser(): Promise<User | null> {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("Supabase getUser error", error.message);
    return null;
  }

  return user;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return null;
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Supabase profile fetch error", error.message);
    return null;
  }

  return data;
}

export function hasRole(profile: Profile | null, roles: Profile["role"][]) {
  if (!profile) return false;
  return roles.includes(profile.role);
}

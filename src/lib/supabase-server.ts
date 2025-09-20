import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

type Client = SupabaseClient<Database>;

type CookieStore = ReturnType<typeof cookies>;

type CookieAdapter = NonNullable<Parameters<typeof createServerClient<Database>>>[2]["cookies"];

function getEnvOrThrow(key: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }

  return value;
}

function createCookieAdapter(cookieStore: CookieStore, allowWrite: boolean): CookieAdapter {
  return {
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      if (!allowWrite) {
        return;
      }

      cookiesToSet.forEach(({ name, value, options }) => {
        cookieStore.set(name, value, options);
      });
    },
  };
}

const getSupabaseUrl = () =>
  getEnvOrThrow("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);

const getSupabaseAnonKey = () =>
  getEnvOrThrow("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export function getSupabaseServiceRoleClient(): Client {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getEnvOrThrow(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Server componentlarda (layout, page vb.) kullanılmalı. Cookie yazmaz.
 */
export function getSupabaseServerComponentClient(): Client {
  const cookieStore = cookies();
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: createCookieAdapter(cookieStore, false),
  });
}

/**
 * Server action veya Route Handler içinde kullanılmalı. Cookie yazmayı destekler.
 */
export function getSupabaseServerActionClient(): Client {
  const cookieStore = cookies();
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: createCookieAdapter(cookieStore, true),
  });
}

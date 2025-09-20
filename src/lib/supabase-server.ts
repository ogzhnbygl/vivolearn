import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any>;

type CookieAdapter = NonNullable<Parameters<typeof createServerClient<Database>>>[2]["cookies"];

function getEnvOrThrow(key: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }

  return value;
}

type CookieStoreMethods = {
  getAll: () => { name: string; value: string }[];
  set: (name: string, value: string, options?: Record<string, unknown>) => void;
};

function createCookieAdapter(allowWrite: boolean): CookieAdapter {
  return {
    getAll() {
      const store = cookies() as unknown as CookieStoreMethods;
      return store.getAll();
    },
    setAll(cookiesToSet) {
      if (!allowWrite) {
        return;
      }

      cookiesToSet.forEach(({ name, value, options }) => {
        const store = cookies() as unknown as CookieStoreMethods;
        store.set(name, value, options);
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
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: createCookieAdapter(false),
  }) as unknown as Client;
}

/**
 * Server action veya Route Handler içinde kullanılmalı. Cookie yazmayı destekler.
 */
export function getSupabaseServerActionClient(): Client {
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: createCookieAdapter(true),
  }) as unknown as Client;
}

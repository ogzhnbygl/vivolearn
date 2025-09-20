"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

const createTypedBrowserClient = (supabaseUrl: string, supabaseAnonKey: string) =>
  createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);

type BrowserClient = ReturnType<typeof createTypedBrowserClient>;

let client: BrowserClient | null = null;

export function getSupabaseBrowserClient(): BrowserClient {
  if (!client) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        "Supabase environment variables are not configured on the client."
      );
    }

    client = createTypedBrowserClient(supabaseUrl, supabaseAnonKey);
  }

  return client;
}

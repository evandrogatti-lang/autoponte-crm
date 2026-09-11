import { createBrowserClient } from "@supabase/ssr";
import { assertSupabaseEnvironmentAlignment } from "./supabase-environment";

export function createAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const expectedProjectRef = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF;
  if (!url || !key || !expectedProjectRef) throw new Error("A autenticação ainda não foi configurada neste ambiente.");
  assertSupabaseEnvironmentAlignment({ authUrl: url, expectedProjectRef, publishableKey: key });
  return createBrowserClient(url, key);
}

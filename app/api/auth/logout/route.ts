import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentAppUser } from "../../../app-auth";
import { recordAudit } from "../../../../lib/access-control";
import { PASSWORD_FLOW_COOKIE } from "../../../../lib/auth-flow";

export async function POST(request: Request) {
  const actor = await getCurrentAppUser();
  const store = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (values) => values.forEach(({ name, value, options }) => store.set(name, value, options)),
      },
    });
    await supabase.auth.signOut({ scope: "local" });
  }
  store.delete(PASSWORD_FLOW_COOKIE);
  if (actor) {
    try { await recordAudit(actor, "auth.logout", "session", "", { method: "POST" }); } catch { /* Logout must never depend on auditing. */ }
  }
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Clear-Site-Data", '"cache", "storage"');
  return response;
}

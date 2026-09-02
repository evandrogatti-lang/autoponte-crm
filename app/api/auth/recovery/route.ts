import { createClient } from "@supabase/supabase-js";
import { getPasswordRedirectUrl } from "../../../../lib/auth-flow";

export async function POST(request: Request) {
  const generic = "Se o e-mail estiver cadastrado, você receberá um link para definir uma nova senha.";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const body = await request.json() as { email?: unknown };
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!url || !key || !email.includes("@")) return Response.json({ message: generic });
  try {
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: getPasswordRedirectUrl() });
  } catch { /* Keep the response indistinguishable and free of provider details. */ }
  return Response.json({ message: generic });
}

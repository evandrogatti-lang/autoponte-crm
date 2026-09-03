import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { crmUsers } from "../../../../db/schema";
import { recordAudit } from "../../../../lib/access-control";
import { PASSWORD_FLOW_COOKIE } from "../../../../lib/auth-flow";
import { isPasswordRateLimit } from "../../../../lib/auth-password-errors";
import { assertServerSupabaseEnvironment } from "../../../../lib/supabase-environment";

function failure(code: string, error: string, status: number) {
  return Response.json({ code, error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const store = await cookies();
  if (store.get(PASSWORD_FLOW_COOKIE)?.value !== "pending") {
    return failure("recovery_state_missing", "Link inválido ou expirado. Solicite um novo link.", 400);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return failure("auth_unavailable", "Não foi possível concluir a definição da senha.", 503);
  try {
    assertServerSupabaseEnvironment({ requireDatabase: true });
  } catch {
    return failure("environment_mismatch", "Não foi possível concluir a definição da senha.", 503);
  }
  const body = await request.json() as { password?: unknown };
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 8) return failure("password_policy", "Não foi possível concluir a definição da senha.", 400);
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (values) => values.forEach(({ name, value, options }) => store.set(name, value, options)),
    },
  });
  const { data: current } = await supabase.auth.getUser();
  if (!current.user?.email) return failure("recovery_session_invalid", "Link inválido ou expirado. Solicite um novo link.", 401);
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (isPasswordRateLimit(error)) {
      return failure("rate_limit", "Muitas tentativas. Aguarde alguns minutos e tente novamente.", 429);
    }
    return failure("password_update_failed", "Não foi possível concluir a definição da senha.", 400);
  }
  const email = current.user.email.toLowerCase();
  try {
    await getDb().update(crmUsers).set({ status: "active", updatedAt: new Date() })
      .where(and(eq(crmUsers.email, email), eq(crmUsers.status, "invited")));
    await recordAudit({ email, displayName: email }, "auth.password_set", "crm_user", "", { flowCompleted: true });
  } catch { /* Auth completion must not expose database details. */ }
  store.delete(PASSWORD_FLOW_COOKIE);
  await supabase.auth.signOut({ scope: "local" });
  return Response.json({ message: "Senha atualizada", redirectTo: "/login" }, { headers: { "Cache-Control": "no-store" } });
}

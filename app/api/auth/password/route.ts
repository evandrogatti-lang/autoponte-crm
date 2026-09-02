import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { crmUsers } from "../../../../db/schema";
import { recordAudit } from "../../../../lib/access-control";
import { PASSWORD_FLOW_COOKIE } from "../../../../lib/auth-flow";

export async function POST(request: Request) {
  const store = await cookies();
  if (store.get(PASSWORD_FLOW_COOKIE)?.value !== "pending") {
    return Response.json({ error: "Link inválido, expirado ou já utilizado. Solicite um novo link." }, { status: 400 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return Response.json({ error: "Autenticação indisponível." }, { status: 503 });
  const body = await request.json() as { password?: unknown };
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 8) return Response.json({ error: "A senha deve ter pelo menos 8 caracteres." }, { status: 400 });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (values) => values.forEach(({ name, value, options }) => store.set(name, value, options)),
    },
  });
  const { data: current } = await supabase.auth.getUser();
  if (!current.user?.email) return Response.json({ error: "Link inválido ou expirado. Solicite um novo link." }, { status: 401 });
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return Response.json({ error: "Não foi possível atualizar a senha. Solicite um novo link." }, { status: 400 });
  const email = current.user.email.toLowerCase();
  try {
    await getDb().update(crmUsers).set({ status: "active", updatedAt: new Date() })
      .where(and(eq(crmUsers.email, email), eq(crmUsers.status, "invited")));
    await recordAudit({ email, displayName: email }, "auth.password_set", "crm_user", "", { flowCompleted: true });
  } catch { /* Auth completion must not expose database details. */ }
  store.delete(PASSWORD_FLOW_COOKIE);
  await supabase.auth.signOut({ scope: "local" });
  return Response.json({ message: "Senha atualizada" }, { headers: { "Cache-Control": "no-store" } });
}

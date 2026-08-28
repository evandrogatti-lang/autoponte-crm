import { getChatGPTUser } from "../chatgpt-auth";
import { requireAnyPermission, type AccessActor } from "../../lib/access-control";

export type ApiActor = AccessActor & { fullName: string | null };

export async function authorizeApi(permissions: readonly string[] = []): Promise<ApiActor | Response> {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Não autorizado." }, { status: 401 });

  const actor: ApiActor = { email: user.email, displayName: user.displayName, fullName: user.fullName };
  if (!permissions.length) return actor;

  try {
    await requireAnyPermission(actor, permissions);
    return actor;
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Acesso negado." }, { status: 403 });
  }
}

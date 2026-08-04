import { getChatGPTUser } from "../../../chatgpt-auth";

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return new Response("Não autorizado", { status: 401 });
  const key = new URL(request.url).searchParams.get("key") ?? "";
  if (!key.startsWith("trade-ins/") || key.includes("..")) return new Response("Imagem inválida", { status: 400 });
  const { env } = await import("cloudflare:workers");
  const object = await env.BUCKET.get(key);
  if (!object) return new Response("Imagem não encontrada", { status: 404 });
  return new Response(object.body, { headers: { "Content-Type": object.httpMetadata?.contentType ?? "image/jpeg", "Cache-Control": "private, max-age=300" } });
}

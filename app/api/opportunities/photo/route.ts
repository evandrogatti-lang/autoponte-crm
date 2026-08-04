import { getChatGPTUser } from "../../../chatgpt-auth";
import { downloadVehiclePhoto } from "../../../../lib/supabase-server";
export async function GET(request: Request) {
  const user = await getChatGPTUser(); if (!user) return new Response("Não autorizado", { status: 401 });
  const key = new URL(request.url).searchParams.get("key") ?? "";
  if ((!key.startsWith("trade-ins/") && !key.startsWith("consignments/")) || key.includes("..")) return new Response("Imagem inválida", { status: 400 });
  const object = await downloadVehiclePhoto(key); if (!object.ok || !object.body) return new Response("Imagem não encontrada", { status: 404 });
  return new Response(object.body, { headers: { "Content-Type": object.headers.get("content-type") ?? "image/jpeg", "Cache-Control": "private, max-age=300" } });
}

import { getChatGPTUser } from "../../../chatgpt-auth";
import { BR_STATES, filterCitiesByPrefix, normalizeUf } from "../../../../lib/locations/br-locations";

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Não autorizado." }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const uf = normalizeUf(params.get("uf") ?? "");
  if (!BR_STATES.some((item) => item.code === uf)) {
    return Response.json({ error: "UF inválida." }, { status: 400 });
  }

  const query = (params.get("q") ?? "").trim();
  const limitRaw = Number(params.get("limit") ?? 120);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(300, Math.floor(limitRaw)) : 120;
  const cities = filterCitiesByPrefix(uf, query, limit);
  return Response.json({ uf, cities });
}


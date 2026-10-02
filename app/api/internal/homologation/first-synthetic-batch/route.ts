import { executeFirstSyntheticBatch, HomologationExecutionError } from "../../../../../lib/tenant-vehicle/homologation-executor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  // Cookie-authenticated mutations must originate from this application.
  const url = new URL(request.url);
  if (request.headers.get("origin") !== url.origin || url.search) {
    return Response.json({ error: "Homologation request rejected." }, { status: 403, headers });
  }
  let payload: unknown;
  try {
    const body = await request.text();
    if (body.length > 1024) throw new Error();
    payload = body.trim() ? JSON.parse(body) : {};
  } catch {
    return Response.json({ error: "Homologation request rejected." }, { status: 400, headers });
  }
  try {
    return Response.json(await executeFirstSyntheticBatch(payload), { headers });
  } catch (error) {
    const status = error instanceof HomologationExecutionError ? error.status : 403;
    // Do not serialize DB errors, SQL arguments, cookies, or environment configuration.
    return Response.json({ error: "DECISION REQUIRED: homologation execution rejected." }, { status, headers });
  }
}

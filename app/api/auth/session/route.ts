import { getCurrentAppUser } from "../../../app-auth";

export async function GET() {
  const user = await getCurrentAppUser();
  return user
    ? Response.json({ authenticated: true }, { headers: { "Cache-Control": "no-store" } })
    : Response.json({ authenticated: false }, { status: 401, headers: { "Cache-Control": "no-store" } });
}

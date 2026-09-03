import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { PASSWORD_FLOW_COOKIE } from "../../../../lib/auth-flow";
import { assertServerSupabaseEnvironment } from "../../../../lib/supabase-environment";

export async function GET(request: NextRequest) {
  const invalid = new URL("/nova-senha?status=invalid", request.url);
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (!tokenHash || (type !== "recovery" && type !== "invite")) return NextResponse.redirect(invalid, 303);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.redirect(invalid, 303);

  try {
    assertServerSupabaseEnvironment();
  } catch {
    return NextResponse.redirect(invalid, 303);
  }

  const response = NextResponse.redirect(new URL("/nova-senha", request.url), 303);
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => values.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) return NextResponse.redirect(invalid, 303);

  response.cookies.set(PASSWORD_FLOW_COOKIE, "pending", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 30 * 60,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { PASSWORD_FLOW_COOKIE } from "./lib/auth-flow";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname !== "/nova-senha") return NextResponse.next();
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.next();

  const target = request.nextUrl.clone();
  target.search = "";
  const response = NextResponse.redirect(target);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    target.searchParams.set("status", "invalid");
    return NextResponse.redirect(target);
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => values.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const invalid = NextResponse.redirect(new URL("/nova-senha?status=invalid", request.url));
    response.cookies.getAll().forEach((cookie) => invalid.cookies.set(cookie));
    return invalid;
  }
  response.cookies.set(PASSWORD_FLOW_COOKIE, "pending", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 30 * 60,
  });
  return response;
}

export const config = { matcher: ["/nova-senha"] };

import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname !== "/nova-senha") return NextResponse.next();
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.next();
  return NextResponse.redirect(new URL("/nova-senha?status=invalid", request.url), 303);
}

export const config = { matcher: ["/nova-senha"] };

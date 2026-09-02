import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("logout is POST-only, invalidates Supabase and cannot be blocked by audit", () => {
  const route = read("app/api/auth/logout/route.ts");
  assert.match(route, /export async function POST/);
  assert.doesNotMatch(route, /export async function GET/);
  assert.match(route, /auth\.signOut\(\{ scope: "local" \}\)/);
  assert.match(route, /catch \{ \/\* Logout must never depend on auditing/);
  assert.match(route, /NextResponse\.redirect\(new URL\("\/login"/);
});

test("protected access blocks a pending password flow and inactive CRM users", () => {
  const auth = read("app/app-auth.ts");
  assert.match(auth, /PASSWORD_FLOW_COOKIE/);
  assert.match(auth, /redirect\("\/nova-senha"\)/);
  assert.match(auth, /row\?\.status === "active"/);
  assert.match(auth, /row\?\.status === "invited"/);
  assert.match(auth, /redirect\("\/acesso-negado"\)/);
});

test("password links are exchanged server-side and cannot be reused", () => {
  const proxy = read("proxy.ts");
  const password = read("app/api/auth/password/route.ts");
  assert.match(proxy, /exchangeCodeForSession\(code\)/);
  assert.match(proxy, /PASSWORD_FLOW_COOKIE, "pending"/);
  assert.match(proxy, /status=invalid/);
  assert.match(password, /value !== "pending"/);
  assert.match(password, /store\.delete\(PASSWORD_FLOW_COOKIE\)/);
  assert.match(password, /auth\.signOut/);
});

test("invite and recovery use the centralized Preview password URL", () => {
  const urls = read("lib/auth-flow.ts");
  const invite = read("app/api/configuracoes/usuarios/route.ts");
  const recovery = read("app/api/auth/recovery/route.ts");
  assert.match(urls, /autoponte-crm-git-codex-mission-control-cockpit-auto-ponte\.vercel\.app/);
  assert.match(urls, /return `\$\{getPublicAppUrl\(\)\}\/nova-senha`/);
  assert.match(invite, /getPasswordRedirectUrl\(\)/);
  assert.match(recovery, /getPasswordRedirectUrl\(\)/);
});

test("navigation hides settings without admin context and exposes secure logout", () => {
  const shell = read("components/crm/CRMAppShell.tsx");
  assert.match(shell, /item\.href !== "\/configuracoes" \|\| canManageSettings/);
  assert.match(shell, /action="\/api\/auth\/logout" method="POST"/);
  assert.match(shell, /Sair com segurança/);
  assert.match(shell, /window\.addEventListener\("focus"/);
});

test("direct non-admin settings access has a controlled response", () => {
  const settings = read("app/configuracoes/page.tsx");
  assert.match(settings, /catch \{ redirect\("\/acesso-negado"\); \}/);
  assert.match(read("app/acesso-negado/page.tsx"), /Acesso negado/);
});

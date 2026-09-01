import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("unauthenticated Case requests return 401 and pages redirect to AutoPonte login", () => {
  const auth = read("app/app-auth.ts");
  assert.match(auth, /supabase\.auth\.getUser\(\)/);
  assert.match(auth, /redirect\(`\/login\?return_to=/);
  assert.doesNotMatch(auth, /signin-with-chatgpt/);
  assert.match(read("app/crm/page.tsx"), /requireCurrentAppUser\("\/crm"\)/);
  for (const route of ["app/api/cases/route.ts", "app/api/cases/[id]/route.ts"]) {
    const source = read(route);
    assert.match(source, /getCurrentAppUser\(\)/);
    assert.match(source, /status:401/);
  }
});

test("authenticated Case users still require seller_operations.manage", () => {
  const accessControl = read("lib/access-control.ts");
  const requirePermissionBody = accessControl.slice(accessControl.indexOf("export async function requirePermission"));
  assert.doesNotMatch(requirePermissionBody, /requireSystemAdmin\(/);
  for (const file of [
    "app/api/cases/route.ts",
    "app/api/cases/[id]/route.ts",
    "app/casos/page.tsx",
    "app/casos/[id]/page.tsx",
    "app/crm/page.tsx",
  ]) {
    assert.match(read(file), /requirePermission\(\w+,\s*"seller_operations\.manage"\)/);
  }
  for (const route of ["app/api/cases/route.ts", "app/api/cases/[id]/route.ts"]) {
    assert.match(read(route), /status:forbidden\?403:|\?403:fallback/);
  }
});

test("system admin access requires a pre-existing active admin and never bootstraps one", () => {
  const accessControl = read("lib/access-control.ts");
  const start = accessControl.indexOf("export async function requireSystemAdmin");
  const end = accessControl.indexOf("export async function recordAudit");
  const requireSystemAdminBody = accessControl.slice(start, end);

  // Empty crm_users and an authenticated but unknown user both follow !user denial.
  assert.match(requireSystemAdminBody, /if \(!user\) throw new Error\("Você não tem permissão para administrar acessos\."\)/);
  assert.doesNotMatch(requireSystemAdminBody, /insert\(|role_admin|randomUUID|bootstrap/i);

  // Only an existing active user whose joined role is admin is accepted.
  assert.match(requireSystemAdminBody, /eq\(crmRoles\.id, user\.roleId\)/);
  assert.match(requireSystemAdminBody, /eq\(crmRoles\.code, "admin"\)/);
  assert.match(requireSystemAdminBody, /if \(!role \|\| user\.status !== "active"\) throw/);
  assert.match(requireSystemAdminBody, /return user/);
});

test("Case access no longer depends on ChatGPT identity headers", () => {
  for (const file of [
    "app/api/cases/route.ts",
    "app/api/cases/[id]/route.ts",
    "app/casos/page.tsx",
    "app/casos/[id]/page.tsx",
    "app/crm/page.tsx",
  ]) {
    const source = read(file);
    assert.doesNotMatch(source, /getChatGPTUser|requireChatGPTUser|signin-with-chatgpt/);
  }
});

test("login return path is constrained to local non-login URLs", () => {
  const auth = read("app/app-auth.ts");
  const form = read("app/login/AuthForm.tsx");
  assert.match(auth, /!value\.startsWith\("\/"\).*value\.startsWith\("\/\/"\)/);
  assert.match(auth, /url\.origin !== "https:\/\/app\.local"[\s\S]*url\.pathname === "\/login"/);
  assert.match(form, /url\.origin === window\.location\.origin[\s\S]*url\.pathname !== "\/login"/);
});

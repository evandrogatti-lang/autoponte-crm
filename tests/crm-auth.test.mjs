import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const read = (file) => readFileSync(new URL(`../app/${file}`, import.meta.url), "utf8");
function load(source, dependencies) {
  const exports = {};
  const script = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  runInNewContext(script, { exports, URL, encodeURIComponent, process: { env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://synthetic.example", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "synthetic-key",
  } }, require: (name) => { assert.ok(name in dependencies, `unexpected import: ${name}`); return dependencies[name]; } });
  return exports;
}
function authHarness(user = null, error = null) {
  let lookups = 0;
  const redirect = (url) => { throw new Error(`REDIRECT ${url}`); };
  const canonical = load(read("app-auth.ts"), {
    "@supabase/ssr": { createServerClient: () => ({ auth: { getUser: async () => {
      lookups += 1; return { data: { user }, error };
    } } }) },
    "next/headers": { cookies: async () => ({ getAll: () => [] }) },
    "next/navigation": { redirect },
  });
  const bridge = load(read("chatgpt-auth.ts"), { "./app-auth": canonical, "next/navigation": { redirect } });
  return { canonical, bridge, lookups: () => lookups };
}

test("AP-CRM-001C: unauthenticated CRM guard redirects to Supabase login with return_to", async () => {
  const { bridge } = authHarness();
  for (const destination of ["/crm", "/leads", "/matches", "/oportunidades/fixture?tab=notes#history", "/veiculos", "/clientes"]) {
    await assert.rejects(bridge.requireChatGPTUser(destination), {
      message: `REDIRECT /login?return_to=${encodeURIComponent(destination)}`,
    });
  }
  assert.equal(await bridge.getChatGPTUser(), null);
  assert.doesNotMatch(read("chatgpt-auth.ts"), /signin-with-chatgpt|oai-authenticated|headers\(/);
});

test("AP-CRM-001C: invalid login return destinations fall back to CRM", () => {
  const { bridge } = authHarness();
  for (const destination of ["https://other.example", "//other.example", "/login", "/login?return_to=/crm", ""]) {
    assert.equal(bridge.chatGPTSignInPath(destination), "/login?return_to=%2Fcrm");
  }
});

test("AP-CRM-001C: valid Supabase session reaches CRM using the existing caller identity shape", async () => {
  const { bridge, canonical, lookups } = authHarness({ email: "USER@EXAMPLE.TEST", user_metadata: { full_name: "Synthetic User" } });
  const result = await bridge.requireChatGPTUser("/crm");
  assert.deepEqual({ ...result }, { displayName: "Synthetic User", email: "user@example.test", fullName: "Synthetic User" });
  assert.deepEqual(Object.keys(result), ["displayName", "email", "fullName"]);
  assert.equal(lookups(), 1);
  assert.equal((await canonical.requireCurrentAppUser("/casos")).source, "supabase");
});

test("AP-CRM-001C: rejected sessions remain unauthenticated and Cases retains its login flow", async () => {
  const { bridge, canonical } = authHarness({ email: "fixture@example.test" }, new Error("invalid session"));
  assert.equal(await bridge.getChatGPTUser(), null);
  await assert.rejects(bridge.requireChatGPTUser("/crm"), { message: "REDIRECT /login?return_to=%2Fcrm" });
  await assert.rejects(canonical.requireCurrentAppUser("/casos"), { message: "REDIRECT /login?return_to=%2Fcasos" });
  assert.match(read("login/page.tsx"), /return_to.*returnTo/);
  assert.match(read("login/AuthForm.tsx"), /signInWithPassword/);
  assert.match(read("login/AuthForm.tsx"), /router\.replace\(safeReturnPath\(returnTo\)\)/);
});

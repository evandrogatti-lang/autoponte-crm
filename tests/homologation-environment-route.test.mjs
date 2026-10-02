import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

function route({ user = null, authError = false, denied = false } = {}) {
  const calls = [];
  const exports = {};
  const dependencies = {
    "../../../../app-auth": { getCurrentAppUser: async () => {
      calls.push("auth");
      if (authError) throw new Error("fictional-secret-auth-error");
      return user;
    } },
    "../../../../../lib/tenant-vehicle/homologation-environment": { assertHomologationEnvironment: () => {
      calls.push("guard");
      if (denied) throw new Error("fictional-secret-database-url");
    } },
  };
  const source = readFileSync(new URL("../app/api/internal/homologation/environment/route.ts", import.meta.url), "utf8");
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, Response, process: { env: { VERCEL_DEPLOYMENT_ID: "dpl_fixture", VERCEL_REGION: "cdg1" } },
    require: name => { assert.ok(name in dependencies, `Unexpected dependency: ${name}`); return dependencies[name]; },
  });
  return { GET: exports.GET, calls };
}

test("unauthenticated probe is rejected before environment inspection", async () => {
  const r = route();
  assert.equal((await r.GET()).status, 401);
  assert.deepEqual(r.calls, ["auth"]);
});

test("unverified environment and auth failures return sanitized no-store denials", async () => {
  for (const config of [{ user: { id: "fixture" }, denied: true }, { authError: true }]) {
    const response = await route(config).GET();
    assert.equal(response.status, 403);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(await response.text(), '{"error":"Unverified homologation environment."}');
  }
});

test("authenticated successful probe reports only approved non-secret identity evidence", async () => {
  const r = route({ user: { id: "private-actor-fixture" } });
  const response = await r.GET();
  assert.equal(response.status, 200);
  assert.deepEqual(r.calls, ["auth", "guard"]);
  const body = await response.json();
  assert.equal(body.result, "REAL_PREVIEW_ENVIRONMENT_GUARD_PASS");
  assert.equal(body.batchExecuted, false);
  assert.equal(body.identitiesAgree, true);
  assert.equal(body.authProject, body.persistence.project);
  assert.ok(!JSON.stringify(body).includes("private-actor-fixture"));
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

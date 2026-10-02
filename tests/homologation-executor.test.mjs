import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { sql as postgresSql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

const tenant = "03824f9e-0924-435e-8b20-50b8ea52774b";
const units = [
  ["phase2-p2-01-vehicle", null], ["phase2-p2-02-vehicle", null], ["pilot-p1-01-vehicle", null],
  ["phase2-p2-03-vehicle", "phase2-p2-03-opportunity"], ["pilot-p1-02-vehicle", "pilot-p1-02-opportunity"],
];
const validEnv = {
  VERCEL: "1", VERCEL_ENV: "preview", VERCEL_PROJECT_ID: "prj_5jiXHFrJuH7jfRp5WlANvmRpoIdU",
  VERCEL_GIT_COMMIT_REF: "fix/crm-runtime-integration", VERCEL_DEPLOYMENT_ID: "dpl_test", VERCEL_REGION: "cdg1",
  NEXT_PUBLIC_SUPABASE_URL: "https://prcmlynykncfgzwluoef.supabase.co",
  DATABASE_URL: "postgresql://postgres.prcmlynykncfgzwluoef:fictional@aws-1-eu-west-3.pooler.supabase.com:5432/postgres",
};
function compile(file, dependencies, globals = {}) {
  const exports = {};
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, URL, Date, ...globals, require: name => { assert.ok(name in dependencies, name); return dependencies[name]; } });
  return exports;
}

function executor(options = {}) {
  let persisted = { roots: [], links: [] };
  const calls = [];
  const statements = [];
  let writes = 0;
  let transactions = 0;
  let rolledBack = 0;
  const envGuard = compile("lib/tenant-vehicle/homologation-environment.ts", {}, { process: { env: { ...validEnv, ...options.env } } });
  const db = {
    transaction: async callback => {
      transactions++;
      calls.push("begin");
      const draft = structuredClone(persisted);
      const tx = { execute: async query => {
        const compiled = options.realSql ? new PgDialect().sqlToQuery(query) : query;
        const text = compiled.sql ?? compiled.text;
        const v = compiled.params ?? compiled.values;
        statements.push(text);
        if (text.includes("pg_advisory_xact_lock")) { calls.push("lock"); return []; }
        if (text.includes("assert_vehicle_registry_actor")) {
          calls.push("db-actor");
          assert.deepEqual(v, [tenant, "member", "user"]);
          if (options.dbActorRevoked) throw new Error("actor revoked");
          return [];
        }
        if (text.includes("source_negotiation_id as alias")) {
          calls.push("sources");
          return units.map(([id, alias]) => ({ id, alias: options.badAlias && alias ? "unapproved" : alias }));
        }
        if (text.includes("from public.trade_ins")) return units.filter(([, a]) => a).map(([, id]) => ({ id, tenantId: options.aliasTenant ?? tenant }));
        if (text.includes("from public.tenant_vehicles")) return draft.roots;
        if (text.includes("from public.tenant_vehicle_source_links")) return draft.links;
        if (text.includes("register_tenant_vehicle")) {
          assert.equal(v[1], tenant);
          assert.equal(v[4], null);
          assert.equal(v[5], "qualification");
          assert.ok(v[6].length <= 1000);
          draft.roots.push({ id: v[0], tenantId: v[1], specificationId: v[4], status: v[5], creatorId: v[2], creatorUserId: v[3], reason: v[6] });
        } else if (text.includes("confirm_tenant_vehicle_source")) {
          assert.ok(!draft.links.some(link => (link.inventoryId ?? link.tradeInId) === v[5]), "unique source backstop");
          draft.links.push({ id: randomUUID(), tenantId: v[0], vehicleId: v[3], inventoryId: v[4] === "inventory" ? v[5] : null,
            tradeInId: v[4] === "trade_in" ? v[5] : null, consignmentId: null, actorId: v[1], reason: v[6] });
        } else throw new Error(`Unexpected SQL: ${text}`);
        calls.push("write");
        writes++;
        if (writes === options.failAfterWrite) throw new Error("synthetic failure");
        return [];
      } };
      try {
        const result = await callback(tx);
        if (options.corruptFinalState) throw new Error("commit failure");
        persisted = draft;
        calls.push("commit");
        return result;
      } catch (error) { rolledBack++; calls.push("rollback"); throw error; }
    },
  };
  const service = compile("lib/tenant-vehicle/homologation-executor.ts", {
    "node:crypto": { randomUUID }, "drizzle-orm": { sql: options.realSql ? postgresSql : Object.assign((strings, ...values) => ({ text: strings.join("?"), values }), { param: value => value }) },
    "../../app/app-auth": { getCurrentAppUser: async () => { calls.push("auth"); return options.unauthenticated ? null : { id: "user" }; } },
    "../../db": { getDb: () => db },
    "../tenant-runtime": { resolveTenantContext: async requested => {
      calls.push("tenant");
      assert.equal(requested, tenant);
      if (options.inactiveMembership) throw new Error("Inactive Membership");
      return { userId: options.contextUser ?? "user", membershipId: "member", tenantId: options.contextTenant ?? tenant, roles: options.roles ?? ["owner"] };
    } },
    "./homologation-environment": { assertHomologationEnvironment: () => { calls.push("guard"); envGuard.assertHomologationEnvironment(); } },
  });
  return { service, calls, statements, state: () => persisted, stats: () => ({ writes, transactions, rolledBack }), mutate: fn => fn(persisted) };
}

test("real Drizzle PostgreSQL rendering binds source arrays as parameters, never records", async () => {
  const x = executor({ realSql: true });
  await x.service.executeFirstSyntheticBatch();
  const arrayQueries = x.statements.filter(statement => statement.includes("any("));
  assert.ok(arrayQueries.length >= 4);
  for (const statement of arrayQueries) {
    assert.ok(!statement.includes("any(("), statement);
    assert.match(statement, /any\(\$\d+::text\[\]\)/);
  }
  assert.equal(x.stats().writes, 12);
});

test("authenticated owner executes exactly the fixed 5-root/7-link manifest atomically", async () => {
  const x = executor();
  const result = await x.service.executeFirstSyntheticBatch();
  assert.equal(result.result, "EXECUTED");
  assert.equal(result.vehicles.length, 5);
  assert.deepEqual(x.calls.slice(0, 7), ["auth", "guard", "tenant", "begin", "lock", "db-actor", "sources"]);
  assert.deepEqual(x.stats(), { writes: 12, transactions: 1, rolledBack: 0 });
  assert.equal(x.state().roots.length, 5);
  assert.equal(x.state().links.length, 7);
  for (const [inventory, alias] of units) {
    const link = x.state().links.find(l => l.inventoryId === inventory);
    if (alias) assert.equal(x.state().links.find(l => l.tradeInId === alias).vehicleId, link.vehicleId);
    const root = x.state().roots.find(r => r.id === link.vehicleId);
    const p = JSON.parse(root.reason);
    assert.equal(p.realPhysicalVehicleVerified, false);
    assert.equal(p.nature, "synthetic_homologation");
    assert.equal(p.tenant, tenant);
    assert.equal(p.userId, "user");
    assert.equal(p.membershipId, "member");
    assert.ok(Number.isFinite(Date.parse(p.timestamp)));
  }
});

test("manager is authorized and no actor is accepted from the client", async () => {
  const x = executor({ roles: ["manager"] });
  assert.equal((await x.service.executeFirstSyntheticBatch()).result, "EXECUTED");
});

for (const [name, options] of [
  ["unauthenticated", { unauthenticated: true }], ["seller", { roles: ["seller"] }],
  ["inactive Membership", { inactiveMembership: true }], ["wrong Tenant", { contextTenant: "other" }],
  ["actor mismatch", { contextUser: "other" }], ["Production", { env: { VERCEL_ENV: "production" } }],
  ["wrong branch", { env: { VERCEL_GIT_COMMIT_REF: "main" } }], ["wrong project", { env: { VERCEL_PROJECT_ID: "other" } }],
  ["wrong Auth", { env: { NEXT_PUBLIC_SUPABASE_URL: "https://other.supabase.co" } }],
  ["wrong database", { env: { DATABASE_URL: "postgresql://other:fictional@other:5432/postgres" } }],
  ["missing metadata", { env: { VERCEL_DEPLOYMENT_ID: undefined } }],
]) test(`rejects ${name} before opening the batch transaction`, async () => {
  const x = executor(options);
  await assert.rejects(x.service.executeFirstSyntheticBatch());
  assert.equal(x.stats().transactions, 0);
  assert.equal(x.stats().writes, 0);
});

for (const payload of [{ tenantId: tenant }, { membershipId: "member" }, { userId: "user" }, { sourceId: units[0][0] },
  { tenantVehicleId: "invented" }, { manifest: units }, [], null]) {
  test(`rejects client overrides ${JSON.stringify(payload)}`, async () => {
    const x = executor();
    await assert.rejects(x.service.executeFirstSyntheticBatch(payload));
    assert.equal(x.stats().transactions, 0);
  });
}

test("actor revocation and source/alias inconsistencies abort before writes", async () => {
  for (const options of [{ dbActorRevoked: true }, { badAlias: true }, { aliasTenant: "other" }]) {
    const x = executor(options);
    await assert.rejects(x.service.executeFirstSyntheticBatch());
    assert.equal(x.stats().writes, 0);
    assert.equal(x.stats().rolledBack, 1);
  }
});

test("failure at every one of the 12 writes rolls back all roots and mappings", async () => {
  for (let failAfterWrite = 1; failAfterWrite <= 12; failAfterWrite++) {
    const x = executor({ failAfterWrite });
    await assert.rejects(x.service.executeFirstSyntheticBatch());
    assert.deepEqual(x.state(), { roots: [], links: [] });
    assert.equal(x.stats().rolledBack, 1);
  }
});

test("re-execution returns the canonical batch with zero additional writes", async () => {
  const x = executor();
  const first = await x.service.executeFirstSyntheticBatch();
  const before = structuredClone(x.state());
  const repeated = await x.service.executeFirstSyntheticBatch();
  assert.equal(repeated.result, "ALREADY_EXECUTED");
  assert.equal(JSON.stringify(repeated.vehicles), JSON.stringify(first.vehicles));
  assert.deepEqual(x.state(), before);
  assert.equal(x.stats().writes, 12);
});

test("partial roots, links, aliases, foreign ownership and provenance all fail closed", async () => {
  const corruptions = [
    s => s.links.pop(), s => s.roots.pop(), s => { s.links = []; }, s => { s.roots = []; },
    s => { s.links[0].tenantId = "other"; }, s => { s.roots[0].tenantId = "other"; },
    s => { s.roots[0].reason = "invalid provenance"; }, s => { s.links[0].reason = "invalid provenance"; },
    s => { s.links.find(l => l.tradeInId).vehicleId = s.roots[0].id; },
    s => { s.roots[0].status = "available"; }, s => { s.roots[0].specificationId = "inferred"; },
  ];
  for (const corrupt of corruptions) {
    const x = executor();
    await x.service.executeFirstSyntheticBatch();
    x.mutate(corrupt);
    const before = structuredClone(x.state());
    await assert.rejects(x.service.executeFirstSyntheticBatch());
    assert.equal(x.stats().writes, 12);
    assert.deepEqual(x.state(), before);
  }
});

function postRoute(x) {
  return compile("app/api/internal/homologation/first-synthetic-batch/route.ts", {
    "../../../../../lib/tenant-vehicle/homologation-executor": x.service,
  }, { Response });
}
function request(body = "{}", origin = "https://preview.example.test", search = "") {
  return new Request(`https://preview.example.test/api/internal/homologation/first-synthetic-batch${search}`, {
    method: "POST", headers: { origin, "Content-Type": "application/json" }, body,
  });
}

test("POST rejects CSRF, query parameters and malformed/oversized bodies without invoking executor", async () => {
  const x = executor();
  const endpoint = postRoute(x);
  for (const req of [request("{}", "https://other.test"), request("{}", "", "?tenantId=other"),
    request("broken JSON"), request(" ".repeat(1025))]) {
    assert.ok((await endpoint.POST(req)).status >= 400);
  }
  assert.equal(x.calls.length, 0);
});

test("POST client identity/manifest overrides are denied before transaction", async () => {
  for (const key of ["tenantId", "userId", "membershipId", "sourceId", "tenantVehicleId", "manifest"]) {
    const x = executor();
    const response = await postRoute(x).POST(request(JSON.stringify({ [key]: "override" })));
    assert.equal(response.status, 400);
    assert.equal(x.stats().transactions, 0);
  }
});

test("POST auth and environment failures are sanitized; transaction failures rollback", async () => {
  for (const options of [{ unauthenticated: true }, { roles: ["seller"] }, { inactiveMembership: true },
    { env: { VERCEL_ENV: "production" } }, { failAfterWrite: 7 }]) {
    const x = executor(options);
    const response = await postRoute(x).POST(request());
    assert.ok(response.status >= 400);
    assert.equal(await response.text(), '{"error":"DECISION REQUIRED: homologation execution rejected."}');
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.deepEqual(x.state(), { roots: [], links: [] });
  }
});

test("POST success and replay return one canonical batch", async () => {
  const x = executor();
  const endpoint = postRoute(x);
  assert.equal((await endpoint.POST(request())).status, 200);
  assert.equal((await (await endpoint.POST(request())).json()).result, "ALREADY_EXECUTED");
  assert.equal(x.stats().writes, 12);
});

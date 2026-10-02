import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function compile(file, dependencies = {}) {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, Set, require: name => {
    assert.ok(name in dependencies, name);
    return dependencies[name];
  } });
  return exports;
}
const contract = compile("lib/commercial-identity/contracts.ts");
const tenant = compile("lib/tenant-context.ts");
const source = (origin, customerId) => ({ origin, customerId });

test("confirmed sources agree; Customer may have multiple origins", () => {
  for (const sources of [[source("customer", "A")], [source("profile", "A"), source("lead", "A"), source("match", "A")]]) {
    const result = contract.resolveConfirmedIdentity(sources);
    assert.equal(result.state, "RESOLVED");
    assert.equal(result.customerId, "A");
  }
});
test("unknown identity never becomes a confirmed or rejected identity", () => {
  for (const sources of [[], [source("profile", null)], [source("customer", "A"), source("lead", null)]]) {
    const result = contract.resolveConfirmedIdentity(sources);
    assert.equal(result.state, "UNRESOLVED");
    assert.equal(result.customerId, null);
  }
});
test("disagreement takes precedence over unresolved origins", () => {
  assert.equal(contract.resolveConfirmedIdentity([source("profile", "A"), source("lead", "B"), source("other", null)]).state, "CONFLICT");
});
test("stale confirmation survives query wrappers; authorization is not conflict", () => {
  assert.equal(contract.isIdentityConflict({ cause: { code: "40001" } }), true);
  assert.equal(contract.isIdentityConflict({ cause: { code: "42501" } }), false);
  const cycle = {}; cycle.cause = cycle;
  assert.equal(contract.isIdentityConflict(cycle), false);
});

function service({ rows = [], accessError, databaseError } = {}) {
  const queries = [];
  const db = {
    transaction: async callback => callback(db),
    execute: async query => {
      queries.push(query);
      if (databaseError) throw databaseError;
      return rows.shift() ?? [];
    },
  };
  const identityService = compile("lib/commercial-identity/service.ts", {
    "drizzle-orm": { sql: (parts, ...values) => ({ text: parts.join("?"), values }) },
    "../../db": { getDb: () => db },
    "../tenant-context": tenant,
    "../tenant-runtime": { resolveTenantContext: async requested => {
      if (accessError || (requested && requested !== "tenant-A")) throw new tenant.TenantAccessError("Denied");
      return { tenantId: "tenant-A", membershipId: "member-A", userId: "user-A" };
    } },
    "./contracts": contract,
  });
  return { module: identityService, queries };
}
test("Match resolves only through its authorized profile; optional Lead must agree", async () => {
  const { module, queries } = service({ rows: [[{ buyerProfileId: "profile" }], [{ customerId: "A" }], [{ id: "lead" }], [{ customerId: "A" }]] });
  assert.equal((await module.resolveCommercialIdentity({ matchId: "match", leadId: "lead" })).state, "RESOLVED");
  assert.ok(queries.every(query => query.values.includes("tenant-A")));
  assert.ok(queries[0].text.includes("join public.buyer_profiles"));
});
test("unresolved Match and disagreeing Lead block resolution", async () => {
  assert.equal((await service({ rows: [[{ buyerProfileId: "profile" }], [{ customerId: null }]] }).module.resolveCommercialIdentity({ matchId: "match" })).state, "UNRESOLVED");
  assert.equal((await service({ rows: [[{ customerId: "A" }], [{ id: "lead" }], [{ customerId: "B" }]] }).module.resolveCommercialIdentity({ buyerProfileId: "profile", leadId: "lead" })).state, "CONFLICT");
});
test("selected Customer requires supplied origins to have agreeing confirmed links", async () => {
  assert.equal((await service({ rows: [[{ id: "A" }], [{ customerId: null }]] }).module.resolveCommercialIdentity({ customerId: "A", buyerProfileId: "profile" })).state, "UNRESOLVED");
  assert.equal((await service({ rows: [[{ id: "A" }], [{ customerId: "B" }]] }).module.resolveCommercialIdentity({ customerId: "A", buyerProfileId: "profile" })).state, "CONFLICT");
});
test("Tenant/access failure throws instead of returning CONFLICT", async () => {
  const denied = service({ accessError: true });
  await assert.rejects(denied.module.resolveCommercialIdentity({ matchId: "match" }), tenant.TenantAccessError);
  assert.equal(denied.queries.length, 0);
  await assert.rejects(service().module.resolveCommercialIdentity({ buyerProfileId: "foreign" }), tenant.TenantAccessError);
});
test("confirmation uses authenticated Membership and explicit expectation/provenance", async () => {
  const { module, queries } = service({ rows: [[{ eventId: "event" }]] });
  assert.equal((await module.confirmCommercialIdentity({ kind: "lead", originId: "lead", customerId: "A", expectedCustomerId: null, reason: " explicit confirmation ", source: "manual" })).eventId, "event");
  assert.deepEqual(Array.from(queries[0].values), ["lead", "lead", "A", null, "tenant-A", "member-A", "user-A", "explicit confirmation", "manual"]);
  await assert.rejects(service({ databaseError: { cause: { code: "40001" } } }).module.confirmCommercialIdentity({ kind: "lead", originId: "lead", customerId: "A", expectedCustomerId: null, reason: "confirm", source: "manual" }), contract.IdentityConflictError);
});

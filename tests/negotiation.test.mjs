import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { getTableConfig } from "drizzle-orm/pg-core";
import { PgDialect } from "drizzle-orm/pg-core";
import { negotiations } from "../db/negotiation-schema.ts";

function compile(file, dependencies = {}) {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, Set, Object, require: name => {
    assert.ok(name in dependencies, name);
    return dependencies[name];
  } });
  return exports;
}
const contract = compile("lib/negotiation/contracts.ts");
const input = { customerId: "customer", responsibleMembershipId: "seller", origin: "manual" };
test("all manual channels allow resolved Customer without Lead, Match or vehicle", () => {
  for (const origin of contract.manualOrigins) contract.validateCreateNegotiation({ ...input, origin });
});
test("Customer and assignee are mandatory; supplied references cannot be empty", () => {
  for (const key of ["customerId", "responsibleMembershipId"]) {
    for (const value of [undefined, null, "", " ", 1]) {
      assert.throws(() => contract.validateCreateNegotiation({ ...input, [key]: value }));
    }
  }
  for (const key of ["tenantId", "leadId", "buyerProfileId"]) {
    assert.throws(() => contract.validateCreateNegotiation({ ...input, [key]: "" }));
  }
});
test("Match initiation, client actor/lifecycle and vehicle fallbacks cannot enter the primitive", () => {
  for (const origin of ["match_manual", "match_automated", "unknown"]) {
    assert.throws(() => contract.validateCreateNegotiation({ ...input, origin }));
  }
  for (const key of ["matchId", "createdByMembershipId", "vehicleId", "tenantVehicleId", "storeId", "stage", "lifecycle", "closureReason"]) {
    assert.throws(() => contract.validateCreateNegotiation({ ...input, [key]: "forged" }));
  }
});

function service({ denied = false, databaseError, result = [], persisted = { id: "uuid", tenantId: "tenant-A", customerId: "customer" } } = {}) {
  const queries = [], filters = [], selections = [];
  const transactionOptions = [];
  let transactions = 0;
  const db = {
    transaction: async (callback, options) => { transactions++; transactionOptions.push(options); return callback(db); },
    execute: async query => { queries.push(query); if (databaseError) throw databaseError; return result; },
    select: () => ({ from: table => {
      selections.push(table);
      return { where: async filter => { filters.push(filter); return persisted ? [persisted] : []; } };
    } }),
  };
  const negotiationService = compile("lib/negotiation/service.ts", {
    "node:crypto": { randomUUID: () => "uuid" },
    "drizzle-orm": { sql: (parts, ...values) => ({ text: parts.join("?"), values }), eq: (column, value) => ({ column, value }), and: (...conditions) => conditions },
    "../../db": { getDb: () => db },
    "../../db/negotiation-schema": { negotiations: { id: "id", tenantId: "tenantId" } },
    "../tenant-runtime": { resolveTenantContext: async requested => {
      if (denied || (requested && requested !== "tenant-A")) throw new Error("Denied");
      return { tenantId: "tenant-A", membershipId: "creator", userId: "auth-user" };
    } },
    "./contracts": contract,
  });
  return { module: negotiationService, queries, filters, selections, transactionOptions, transactions: () => transactions };
}
test("creation derives creator and Tenant from authentication and reads the inserted row in its transaction", async () => {
  const s = service();
  assert.equal((await s.module.createNegotiation({ ...input, leadId: "lead", buyerProfileId: "profile" })).id, "uuid");
  assert.equal(s.transactions(), 1);
  assert.deepEqual(Array.from(s.queries[0].values), ["uuid", "tenant-A", "creator", "auth-user", "seller", "customer", "lead", "profile", "manual"]);
  assert.match(s.queries[0].text, /create_manual_negotiation/);
  assert.deepEqual(s.filters[0].map(condition => condition.value), ["uuid", "tenant-A"]);
});
test("invalid input, foreign Tenant or authentication failure performs no persistence", async () => {
  for (const [s, value] of [[service(), { ...input, customerId: null }], [service(), { ...input, tenantId: "foreign" }], [service({ denied: true }), input]]) {
    await assert.rejects(s.module.createNegotiation(value));
    assert.equal(s.queries.length, 0);
  }
});
test("database integrity and authorization failures cannot return a created Negotiation", async () => {
  for (const code of ["23503", "23514", "42501", "23505"]) {
    const error = Object.assign(new Error("Rejected"), { code });
    const s = service({ databaseError: error });
    await assert.rejects(s.module.createNegotiation(input), value => value === error);
    assert.equal(s.selections.length, 0);
  }
  await assert.rejects(service({ persisted: null }).module.createNegotiation(input));
});
test("read uses validated Tenant and does not reveal foreign or missing rows", async () => {
  const s = service({ persisted: null });
  assert.equal(await s.module.readNegotiation("foreign-or-missing"), null);
  assert.deepEqual(s.filters[0].map(condition => condition.value), ["foreign-or-missing", "tenant-A"]);
  assert.equal(s.queries.length, 0);
  await assert.rejects(s.module.readNegotiation("id", "foreign"));
});
test("physical schema has same-Tenant FKs and nullable canonical vehicle for manual qualification", () => {
  const config = getTableConfig(negotiations);
  for (const field of ["tenant_id", "customer_id", "responsible_membership_id", "created_by_membership_id"]) {
    assert.equal(config.columns.find(column => column.name === field).notNull, true);
  }
  for (const field of ["lead_id", "buyer_profile_id", "match_id", "closure_reason", "tenant_vehicle_id"]) {
    assert.equal(config.columns.find(column => column.name === field).notNull, false);
  }
  assert.ok(config.columns.every(column => column.name === "tenant_vehicle_id" || !/vehicle|store|score|confidence|case_id/.test(column.name)));
  assert.equal(config.enableRLS, true);
  for (const target of ["customer", "lead", "profile", "responsible", "creator", "vehicle"]) {
    const fk = config.foreignKeys.find(fk => fk.getName() === `negotiations_${target}_same_tenant_fkey`);
    assert.ok(fk);
    assert.equal(fk.reference().columns[0].name, "tenant_id");
    assert.equal(fk.reference().foreignColumns[0].name, "tenant_id");
  }
  const dialect = new PgDialect();
  const active = config.indexes.find(index => index.config.name === "negotiations_active_match_key").config;
  assert.equal(active.unique, true);
  assert.match(dialect.sqlToQuery(active.where).sql, /active.*formalized/);
  assert.deepEqual(active.columns.map(column => column.name), ["tenant_id", "match_id"]);
});

test("Match initiation rejects caller-owned identity, vehicle, actor and state", () => {
  const value = { matchId: "match", responsibleMembershipId: "seller" };
  contract.validateStartNegotiationFromMatch(value);
  for (const key of ["customerId", "buyerProfileId", "tenantVehicleId", "createdByMembershipId", "origin", "stage", "lifecycle"]) {
    assert.throws(() => contract.validateStartNegotiationFromMatch({ ...value, [key]: "forged" }));
  }
  for (const key of ["matchId", "responsibleMembershipId"]) {
    assert.throws(() => contract.validateStartNegotiationFromMatch({ ...value, [key]: "" }));
  }
});

test("Match initiation preserves typed gate failures and authenticated Tenant", async () => {
  for (const hint of contract.initiationFailures) {
    const s = service({ databaseError: { cause: { code: "23514", hint } } });
    await assert.rejects(s.module.startNegotiationFromMatch({ matchId: "match", responsibleMembershipId: "seller", leadId: "lead" }), error => error.code === hint);
    assert.deepEqual(Array.from(s.queries[0].values), ["uuid", "tenant-A", "creator", "auth-user", "seller", "match", "lead"]);
    assert.equal(s.transactions(), 1);
  }
  const denied = service({ denied: true });
  await assert.rejects(denied.module.startNegotiationFromMatch({ matchId: "match", responsibleMembershipId: "seller" }));
  assert.equal(denied.queries.length, 0);
});

test("Match initiation returns the persisted identity and created/existing indicator", async () => {
  for (const created of [true, false]) {
    const s = service({ result: [{ negotiation_id: "canonical", created }] });
    const result = await s.module.startNegotiationFromMatch({ matchId: "match", responsibleMembershipId: "seller" });
    assert.equal(result.negotiationId, "canonical");
    assert.equal(result.created, created);
    assert.equal(s.transactions(), 1);
    assert.equal(s.transactionOptions[0].isolationLevel, "read committed");
    assert.deepEqual(Array.from(s.queries[0].values), ["uuid", "tenant-A", "creator", "auth-user", "seller", "match", null]);
  }
  await assert.rejects(service().module.startNegotiationFromMatch({ matchId: "match", responsibleMembershipId: "seller" }));
});

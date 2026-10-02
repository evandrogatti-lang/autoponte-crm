import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { getTableConfig } from "drizzle-orm/pg-core";
import { tenantVehicles, vehicleSpecifications, tenantVehicleSourceLinks } from "../db/tenant-vehicle-schema.ts";

function compile(file, dependencies = {}) {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, Object, Set, require: name => { assert.ok(name in dependencies, name); return dependencies[name]; } });
  return exports;
}
const contracts = compile("lib/tenant-vehicle/contracts.ts");
const tenant = compile("lib/tenant-context.ts");
const registration = { registrationReason: "Reviewed physical vehicle ownership" };
test("technical identity may remain absent without fabricating FIPE/catalog identity", () => {
  for (const vehicleSpecificationId of [undefined, null, "curated-specification"]) {
    contracts.validateVehicleInput({ ...registration, vehicleSpecificationId }, false);
  }
  for (const key of ["fipeCode", "brand", "plate", "legacyVehicleId", "createdByMembershipId"]) {
    assert.throws(() => contracts.validateVehicleInput({ ...registration, [key]: "inferred" }, false));
  }
});
test("registration and explicit source mapping require bounded review and supported references", () => {
  for (const registrationReason of ["", " ", null, "a".repeat(1001)]) {
    assert.throws(() => contracts.validateVehicleInput({ registrationReason }, false));
  }
  assert.throws(() => contracts.validateVehicleInput({ ...registration, status: "sold" }, false));
  const mapping = { tenantVehicleId: "canonical", sourceId: "source", sourceType: "inventory", reason: "Reviewed ownership" };
  contracts.validateVehicleInput(mapping, true);
  for (const change of [{ reason: "" }, { sourceType: "fipe" }, { sourceId: "" }, { tenantVehicleId: "" }, { tenantId: "" }, { inferredTenantId: "forged" }]) {
    assert.throws(() => contracts.validateVehicleInput({ ...mapping, ...change }, true));
  }
});
function service({ rows = [], stored = { id: "generated", tenantId: "tenant-A", vehicleSpecificationId: null }, denied = false, error } = {}) {
  const queries = [], filters = [];
  let transactions = 0;
  const db = {
    transaction: async callback => { transactions++; return callback(db); },
    execute: async query => { queries.push(query); if (error) throw error; return rows.shift() ?? []; },
    select: () => ({ from: () => ({ where: async filter => { filters.push(filter); return stored ? [stored] : []; } }) }),
  };
  const vehicleService = compile("lib/tenant-vehicle/service.ts", {
    "node:crypto": { randomUUID: () => "generated" },
    "drizzle-orm": { sql: (parts, ...values) => ({ text: parts.join("?"), values }), eq: (column, value) => ({ column, value }), and: (...clauses) => clauses },
    "../../db": { getDb: () => db },
    "../../db/tenant-vehicle-schema": { tenantVehicles: { id: "id", tenantId: "tenantId" } },
    "../tenant-context": tenant,
    "../tenant-runtime": { resolveTenantContext: async requested => {
      if (denied || (requested && requested !== "tenant-A")) throw new tenant.TenantAccessError("Denied");
      return { tenantId: "tenant-A", membershipId: "actor", userId: "authenticated-user" };
    } },
    "./contracts": contracts,
  });
  return { vehicleService, queries, filters, transactions: () => transactions };
}
test("registration derives Tenant/creator, defaults qualification, and never reads legacy vehicles", async () => {
  const s = service();
  const row = await s.vehicleService.registerTenantVehicle(registration);
  assert.equal(row.vehicleSpecificationId, null);
  assert.equal(s.transactions(), 1);
  assert.deepEqual(Array.from(s.queries[0].values), ["generated", "tenant-A", "actor", "authenticated-user", null, "qualification", registration.registrationReason]);
  assert.equal(s.queries.length, 1);
  assert.match(s.queries[0].text, /register_tenant_vehicle/);
  assert.deepEqual(s.filters[0].map(c => c.value), ["generated", "tenant-A"]);
});
test("registration rejects invalid input, authorization and DB FK errors without returning persisted success", async () => {
  for (const [s, input] of [[service(), { ...registration, brand: "inferred" }], [service({ denied: true }), registration], [service(), { ...registration, tenantId: "foreign" }]]) {
    await assert.rejects(s.vehicleService.registerTenantVehicle(input));
    assert.equal(s.queries.length, 0);
  }
  for (const code of ["23503", "23514", "42501"]) {
    await assert.rejects(service({ error: Object.assign(new Error("Rejected"), { code }) }).vehicleService.registerTenantVehicle(registration));
  }
});
test("canonical read uses validated Tenant and hides absent/foreign rows", async () => {
  const s = service({ stored: null });
  assert.equal(await s.vehicleService.readTenantVehicle("missing"), null);
  assert.deepEqual(s.filters[0].map(c => c.value), ["missing", "tenant-A"]);
  await assert.rejects(s.vehicleService.readTenantVehicle("id", "foreign"));
});
test("mapping is a separate explicit command with authenticated Membership and review reason", async () => {
  const s = service({ rows: [[{ linkId: "confirmed" }]] });
  const result = await s.vehicleService.confirmTenantVehicleSource({ tenantVehicleId: "canonical", sourceType: "inventory", sourceId: "legacy", reason: " Explicit review " });
  assert.equal(result.linkId, "confirmed");
  assert.deepEqual(Array.from(s.queries[0].values), ["tenant-A", "actor", "authenticated-user", "canonical", "inventory", "legacy", "Explicit review"]);
});
test("unknown mappings remain unresolved without creating canonical rows", async () => {
  const s = service({ rows: [[]] });
  const result = await s.vehicleService.resolveMatchTenantVehicle("match");
  assert.equal(result.state, "UNRESOLVED");
  assert.equal(result.tenantVehicleId, null);
  assert.equal(result.actionable, false);
  assert.match(s.queries[0].text, /resolve_match_vehicle/);
  assert.deepEqual(Array.from(s.queries[0].values), ["tenant-A", "match"]);
});
test("shared resolver preserves explicit vehicle and unresolved technical identity", async () => {
  for (const actionable of [true, false]) {
    const s = service({ rows: [[{ vehicle_id: "canonical", specification_id: null, actionable }]] });
    const result = await s.vehicleService.resolveMatchTenantVehicle("match");
    assert.equal(result.state, "RESOLVED");
    assert.equal(result.vehicleSpecificationId, null);
    assert.equal(result.actionable, actionable);
    assert.equal(s.transactions(), 1);
  }
});
test("shared resolver authorization rejection retains the public access error", async () => {
  for (const error of [{ code: "42501" }, { cause: { code: "42501" } }]) {
    await assert.rejects(service({ error }).vehicleService.resolveMatchTenantVehicle("foreign"), tenant.TenantAccessError);
  }
  const error = new Error("Database unavailable");
  await assert.rejects(service({ error }).vehicleService.resolveMatchTenantVehicle("match"), value => value === error);
});
test("canonical schema separates global technical facts and tenant-owned physical identity", () => {
  const global = getTableConfig(vehicleSpecifications), physical = getTableConfig(tenantVehicles), links = getTableConfig(tenantVehicleSourceLinks);
  assert.ok(global.columns.every(c => !/tenant|plate|chassis|price|owner|membership|partner|store|fipe/.test(c.name)));
  assert.equal(physical.columns.find(c => c.name === "tenant_id").notNull, true);
  assert.equal(physical.columns.find(c => c.name === "vehicle_specification_id").notNull, false);
  assert.ok(physical.columns.every(c => !/brand|model|fuel|transmission|legacy/.test(c.name)));
  for (const config of [global, physical, links]) assert.equal(config.enableRLS, true);
  for (const name of ["vehicle", "actor", "lead"]) {
    const fk = links.foreignKeys.find(f => f.getName() === `tenant_vehicle_links_${name}_same_tenant_fkey`);
    assert.equal(fk.reference().columns[0].name, "tenant_id");
  }
  assert.equal(links.indexes.filter(i => i.config.unique).length, 3);
});

import assert from "node:assert/strict";
import test from "node:test";
import { assertHomologationEnvironment } from "../lib/tenant-vehicle/homologation-environment.ts";

// Fictional password; no real configuration or credentials are loaded by tests.
const valid = {
  VERCEL: "1", VERCEL_ENV: "preview", VERCEL_TARGET_ENV: "preview",
  VERCEL_PROJECT_ID: "prj_5jiXHFrJuH7jfRp5WlANvmRpoIdU",
  VERCEL_GIT_COMMIT_REF: "fix/crm-runtime-integration",
  VERCEL_DEPLOYMENT_ID: "dpl_test123", VERCEL_REGION: "cdg1",
  NEXT_PUBLIC_SUPABASE_URL: "https://prcmlynykncfgzwluoef.supabase.co",
  DATABASE_URL: "postgresql://postgres.prcmlynykncfgzwluoef:fictional-test-password@aws-1-eu-west-3.pooler.supabase.com:5432/postgres",
};

test("accepts only the independently consistent approved Preview context", () => {
  assert.doesNotThrow(() => assertHomologationEnvironment(valid));
  assert.doesNotThrow(() => assertHomologationEnvironment({ ...valid, DATABASE_URL: `${valid.DATABASE_URL}?sslmode=require` }));
});

for (const [label, override] of [
  ["Production", { VERCEL_ENV: "production" }],
  ["local runtime", { VERCEL: "0" }],
  ["wrong branch", { VERCEL_GIT_COMMIT_REF: "main" }],
  ["wrong project", { VERCEL_PROJECT_ID: "prj_other" }],
  ["unknown project", { VERCEL_PROJECT_ID: undefined }],
  ["contradictory target", { VERCEL_TARGET_ENV: "production" }],
  ["wrong Auth project", { NEXT_PUBLIC_SUPABASE_URL: "https://other.supabase.co" }],
  ["Auth URL credentials", { NEXT_PUBLIC_SUPABASE_URL: "https://secret@prcmlynykncfgzwluoef.supabase.co" }],
  ["malformed Auth URL", { NEXT_PUBLIC_SUPABASE_URL: "secret-invalid-url" }],
  ["wrong pooler host", { DATABASE_URL: valid.DATABASE_URL.replace("eu-west-3", "eu-west-1") }],
  ["wrong database project", { DATABASE_URL: valid.DATABASE_URL.replace("postgres.prcmlynykncfgzwluoef", "postgres.other") }],
  ["transaction pooler port", { DATABASE_URL: valid.DATABASE_URL.replace(":5432", ":6543") }],
  ["wrong database name", { DATABASE_URL: valid.DATABASE_URL.replace("/postgres", "/other") }],
  ["connection override", { DATABASE_URL: `${valid.DATABASE_URL}?host=other` }],
  ["duplicate connection option", { DATABASE_URL: `${valid.DATABASE_URL}?sslmode=require&sslmode=require` }],
  ["malformed database URL", { DATABASE_URL: "secret-invalid-url" }],
] as const) {
  test(`rejects ${label} without emitting input values`, () => {
    assert.throws(() => assertHomologationEnvironment({ ...valid, ...override }), error => {
      assert.ok(error instanceof Error);
      assert.equal(error.message, "Synthetic homologation execution denied: unverified environment.");
      assert.equal(error.cause, undefined);
      assert.ok(!error.stack?.includes("fictional-test-password"));
      assert.ok(!error.stack?.includes("secret-invalid-url"));
      return true;
    });
  });
}

test("rejects every missing required verification field", () => {
  for (const key of Object.keys(valid).filter(key => key !== "VERCEL_TARGET_ENV")) {
    assert.throws(() => assertHomologationEnvironment({ ...valid, [key]: undefined }));
  }
});

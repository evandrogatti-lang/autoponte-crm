import assert from "node:assert/strict";
import test from "node:test";
import {
  assertSupabaseEnvironmentAlignment,
  getAuthProjectRef,
  getDatabaseProjectRef,
} from "../lib/supabase-environment.ts";

const TESTE2 = "prcmlynykncfgzwluoef";
const OTHER = "jwglftqsnvzximybealt";

test("extracts the project ref from Auth, direct DB and pooled DB URLs", () => {
  assert.equal(getAuthProjectRef(`https://${TESTE2}.supabase.co`), TESTE2);
  assert.equal(getDatabaseProjectRef(`postgresql://postgres:secret@db.${TESTE2}.supabase.co:5432/postgres`), TESTE2);
  assert.equal(getDatabaseProjectRef(`postgresql://postgres.${TESTE2}:secret@aws-0-eu-west-3.pooler.supabase.com:6543/postgres`), TESTE2);
});

test("accepts an environment fully aligned to teste2", () => {
  assert.equal(assertSupabaseEnvironmentAlignment({
    authUrl: `https://${TESTE2}.supabase.co`,
    databaseUrl: `postgresql://postgres.${TESTE2}:secret@aws-0-eu-west-3.pooler.supabase.com:6543/postgres`,
    expectedProjectRef: TESTE2,
  }), TESTE2);
});

test("fails closed when Auth and database point to different projects", () => {
  assert.throws(() => assertSupabaseEnvironmentAlignment({
    authUrl: `https://${TESTE2}.supabase.co`,
    databaseUrl: `postgresql://postgres.${OTHER}:secret@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
    expectedProjectRef: TESTE2,
  }), /Configuração Supabase bloqueada/);
});

test("fails closed when the expected project is missing or malformed", () => {
  assert.throws(() => assertSupabaseEnvironmentAlignment({
    authUrl: `https://${TESTE2}.supabase.co`,
    expectedProjectRef: "",
  }), /Referência esperada/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function trigger(executor) {
  const exports = {};
  const source = readFileSync(new URL("../app/internal/homologation/first-synthetic-batch/page.tsx", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  runInNewContext(`${compiled}\nexports.trigger = execute;`, { exports, require: name => {
    if (name === "next/navigation") return { redirect: url => { throw { redirect: url }; } };
    if (name.endsWith("homologation-executor")) return { executeFirstSyntheticBatch: executor };
    return {};
  } });
  return exports.trigger;
}

test("trigger passes no client-controlled identity or manifest to the validated executor", async () => {
  let calls = 0;
  const action = trigger(async payload => {
    calls++;
    assert.equal(JSON.stringify(payload), "{}");
    return { result: "EXECUTED" };
  });
  await assert.rejects(action(new FormData()), error => error.redirect.endsWith("?result=EXECUTED"));
  assert.equal(calls, 1);
  for (const field of ["tenantId", "membershipId", "userId", "sourceId", "tenantVehicleId", "manifest"]) {
    const form = new FormData();
    form.set(field, "unapproved");
    await assert.rejects(action(form), error => error.redirect.endsWith("?result=rejected"));
  }
  assert.equal(calls, 1);
});

test("trigger does not expose executor failures or retry them", async () => {
  let calls = 0;
  const action = trigger(async () => { calls++; throw new Error("sensitive internal detail"); });
  await assert.rejects(action(new FormData()), error => error.redirect === "/internal/homologation/first-synthetic-batch?result=rejected");
  assert.equal(calls, 1);
});

test("trigger preserves the validated executor's already-executed result", async () => {
  const action = trigger(async () => ({ result: "ALREADY_EXECUTED" }));
  await assert.rejects(action(new FormData()), error => error.redirect.endsWith("?result=ALREADY_EXECUTED"));
});

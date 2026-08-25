import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { evaluateMatchDecision } from "../lib/match-decision.ts";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("protected CRM auth fails closed and never fabricates an administrator", () => {
  const auth = read("app/chatgpt-auth.ts");
  assert.doesNotMatch(auth, /AUTOPONTE_ADMIN_(NAME|EMAIL)/);
  assert.match(auth, /supabase\.auth\.getUser\(\)/);
  assert.match(auth, /eq\(crmUsers\.status, "active"\)/);
  assert.match(auth, /redirect\(`\/login\?return_to=/);
  for (const page of ["app/crm/page.tsx", "app/casos/page.tsx", "app/matches/page.tsx"]) {
    assert.match(read(page), /requireChatGPTUser/);
  }
});

test("normal Match inspection includes only explicitly HARD-eligible candidates", () => {
  const page = read("app/matches/page.tsx");
  assert.match(page, /where\(eq\(vehicleMatches\.hardConstraintPass,true\)\)/);
  assert.doesNotMatch(page, /isNull\(vehicleMatches\.hardConstraintPass\)/);
});

test("proposal UI and transactional service both reject HARD-ineligible candidates", () => {
  const workspace = read("app/casos/[id]/CaseWorkspace.tsx");
  const service = read("lib/commercial-cases/service.ts");
  assert.match(workspace, /eligibleMatches=matches\.filter\(match=>match\.hardConstraintPass!==false\)/);
  assert.match(workspace, /matchId:eligibleMatches\[0\]\.id/);
  assert.match(service, /if\(match\.hardConstraintPass===false\)throw new CaseOperationError/);
});

test("SOFT deviation stays eligible and Match Fit remains separate from Opportunity", () => {
  const decision = evaluateMatchDecision(
    { budgetMax: 130000, priceTolerance: .05, vehicleTypes: ["SUV"], preferredModels: ["HR-V"], preferredBrands: ["Toyota"], minYear: 2021, maxMileage: 50000, transmission: "Automático", useCase: "family" },
    { label: "Honda HR-V", price: 120000, mileage: 57000, brand: "Honda", model: "HR-V", type: "SUV", transmission: "Automático", year: 2022 },
    81,
  );
  assert.equal(decision.hardConstraintPass, true);
  assert.ok(decision.softDeviations.length > 0);
  assert.equal(decision.matchFitScore, 81);
  assert.notEqual(decision.opportunityScore, decision.matchFitScore);
  const page = read("app/matches/page.tsx");
  assert.match(page, /<span>Match Fit<\/span>/);
  assert.match(page, /Oportunidade:/);
  assert.match(page, /scoring_version/);
  assert.match(page, /evaluation_run_id/);
});

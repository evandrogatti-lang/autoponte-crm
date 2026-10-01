import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const engineSource = readFileSync(new URL("../lib/match-engine.ts", import.meta.url), "utf8");
const scorerSource = readFileSync(new URL("../lib/match-score.ts", import.meta.url), "utf8");
const scorerExports = {};
runInNewContext(ts.transpileModule(scorerSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: scorerExports });

// Select only the consumer and its local helpers; never load database modules.
const parsed = ts.createSourceFile("engine.ts", engineSource, ts.ScriptTarget.ES2022, true);
const selected = ["draftMessage", "toLegacyProfile", "prepareVehicleMatch", "createMatchesForVehicle"].map((name) => {
  const matches = parsed.statements.filter((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.equal(matches.length, 1);
  return matches[0].getText(parsed).replace(/^export /, "");
}).join("\n");
const consumerScript = ts.transpileModule(selected, {
  compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022 },
}).outputText;

const vehicle = { sourceType: "catalog", sourceId: "synthetic-vehicle", label: "SUV Sintético",
  price: 10800, city: "Cidade B", year: 2020, mileage: 20000, type: "SUV",
  transmission: "Automático", useCases: ["Trabalho"] };
const row = { id: "synthetic-buyer", name: "Pessoa Inventada", whatsapp: "", email: "", city: "Cidade A",
  budgetMax: 10000, vehicleTypes: '["SUV"]', preferredModels: "", minYear: 2020,
  maxMileage: 10000, transmission: "Manual", fuel: "", useCase: "Trabalho",
  purchaseTimeline: "", alertsConsent: true };

async function runConsumer(rows, inputVehicle, legacy = false) {
  const inserted = []; const evaluated = []; const queries = [];
  const db = {
    select: () => ({ from: (table) => ({ where: (condition) => { queries.push({ table, condition }); return rows; } }) }),
    insert: (table) => ({ values: (values) => ({ onConflictDoNothing: () => { inserted.push({ table, values }); } }) }),
  };
  const context = {
    getDb: () => db, buyerProfiles: { status: "buyer-status" }, vehicleMatches: "matches",
    eq: (field, value) => ({ field, value }), crypto: { randomUUID: () => "synthetic-match-id" },
    evaluateBuyerVehicle: (profile, item) => {
      evaluated.push(profile.id);
      return scorerExports.evaluateBuyerVehicle(profile, item);
    },
    scoreBuyerVehicle: scorerExports.scoreBuyerVehicle,
  };
  const script = legacy ? consumerScript.replace("evaluateBuyerVehicle(profile, vehicle)", "scoreBuyerVehicle(profile, vehicle)") : consumerScript;
  const consumer = runInNewContext(`${script}\ncreateMatchesForVehicle;`, context);
  const count = await consumer(inputVehicle);
  return JSON.parse(JSON.stringify({ count, inserted, evaluated, queries }));
}

test("AP-MATCH-015: aggregate consumer preserves threshold, row order, reasons and exact persistence shape", async () => {
  const rows = [row, { ...row, id: "at-threshold", transmission: "Automático", useCase: "", alertsConsent: false },
    { ...row, id: "complete", budgetMax: 10800, city: "Cidade B", maxMileage: 20000, transmission: "Automático" }];
  const before = structuredClone({ rows, vehicle });
  const actual = await runConsumer(rows, vehicle);
  const previous = await runConsumer(rows, vehicle, true);
  assert.deepEqual(actual.evaluated, rows.map((item) => item.id));
  assert.deepEqual({ ...actual, evaluated: [] }, previous);
  assert.equal(actual.count, 2); // 54 excluded, 55 included, 95 included.
  assert.deepEqual(actual.inserted.map((item) => item.values.score), [55, 95]);
  assert.deepEqual(actual.inserted.map((item) => item.values.buyerProfileId), ["at-threshold", "complete"]);
  assert.deepEqual(actual.inserted.map((item) => item.values.status), ["internal_only", "review_pending"]);
  assert.equal(actual.inserted[0].values.reasons, JSON.stringify(["próximo do orçamento", "categoria preferida", "ano compatível", "câmbio desejado"]));
  assert.deepEqual(Object.keys(actual.inserted[0].values), ["id", "buyerProfileId", "sourceType", "sourceId", "vehicleLabel", "vehiclePrice", "score", "reasons", "messageDraft", "status"]);
  assert.deepEqual(actual.queries, [{ table: { status: "buyer-status" }, condition: { field: "buyer-status", value: "active" } }]);
  assert.deepEqual(await runConsumer(rows, vehicle), actual);
  assert.deepEqual({ rows, vehicle }, before);
});

test("AP-MATCH-015: incomplete vehicle evidence preserves permissive legacy insertion", async () => {
  const rows = [{ ...row, transmission: "Automático", useCase: "" }];
  const missing = { ...vehicle, transmission: undefined };
  const actual = await runConsumer(rows, missing);
  const previous = await runConsumer(rows, missing, true);
  assert.deepEqual({ ...actual, evaluated: [] }, previous);
  assert.equal(actual.count, 1);
  assert.equal(actual.inserted[0].values.score, 55);
  assert.equal(JSON.parse(actual.inserted[0].values.reasons).at(-1), "câmbio desejado");
  assert.deepEqual(await runConsumer(rows, missing), actual);
});

test("AP-MATCH-015: empty active-buyer selection remains a no-op", async () => {
  const actual = await runConsumer([], vehicle);
  assert.equal(actual.count, 0);
  assert.deepEqual(actual.evaluated, []);
  assert.deepEqual(actual.inserted, []);
});

function boundaryAdapter() {
  return runInNewContext(`${consumerScript}\n({ prepareVehicleMatch, toLegacyProfile });`,
    { crypto: { randomUUID: () => "synthetic-match-id" } });
}

test("AP-MATCH-016: CRM preparation retains semantic evidence without changing persistence fields", () => {
  const { prepareVehicleMatch, toLegacyProfile } = boundaryAdapter();
  const profile = toLegacyProfile({ ...row, transmission: "Automático", useCase: "" });
  const missing = { ...vehicle, type: undefined, label: "SUV Sintético", transmission: undefined };
  const evaluation = scorerExports.evaluateBuyerVehicle(profile, missing);
  const before = structuredClone(evaluation);
  const prepared = prepareVehicleMatch(profile, missing, evaluation);
  assert.deepEqual(Object.keys(prepared), ["ruleResults", "values"]);
  assert.equal(prepared.ruleResults, evaluation.ruleResults);
  assert.equal(prepared.ruleResults[1].outcome, "matched");
  assert.equal(prepared.ruleResults[1].vehicleDataSource, "inferred");
  assert.equal(prepared.ruleResults[5].outcome, "missing_vehicle_data");
  assert.equal(prepared.ruleResults[6].outcome, "no_preference");
  const legacy = scorerExports.scoreBuyerVehicle(profile, missing);
  assert.equal(prepared.values.score, legacy.score);
  assert.equal(prepared.values.reasons, JSON.stringify(legacy.reasons));
  assert.deepEqual(Object.keys(prepared.values), ["id", "buyerProfileId", "sourceType", "sourceId", "vehicleLabel", "vehiclePrice", "score", "reasons", "messageDraft", "status"]);
  // Evidence comes from rule outcomes/provenance even when legacy text is unrelated.
  const changedText = { ...evaluation, reasons: ["unrelated legacy text"],
    ruleResults: evaluation.ruleResults.map((item) => ({ ...item, reason: "unrelated legacy text" })) };
  const changedPrepared = prepareVehicleMatch(profile, missing, changedText);
  assert.equal(changedPrepared.ruleResults, changedText.ruleResults);
  assert.equal(changedPrepared.ruleResults[5].outcome, "missing_vehicle_data");
  assert.equal(changedPrepared.ruleResults[1].vehicleDataSource, "inferred");
  assert.equal(changedPrepared.values.reasons, JSON.stringify(changedText.reasons));
  assert.deepEqual(JSON.parse(JSON.stringify(evaluation)), JSON.parse(JSON.stringify(before)));
  assert.deepEqual(JSON.parse(JSON.stringify(prepareVehicleMatch(profile, missing, evaluation))), JSON.parse(JSON.stringify(prepared)));
});

test("AP-MATCH-016: one CRM handoff per accepted Match preserves generation and evidence identity", async () => {
  const rows = [row, { ...row, id: "accepted", transmission: "Automático", useCase: "" }];
  const db = { select: () => ({ from: () => ({ where: () => rows }) }),
    insert: () => ({ values: (values) => ({ onConflictDoNothing: () => { inserted.push(values); } }) }) };
  const inserted = []; const evaluations = []; const handoffs = [];
  const context = { getDb: () => db, buyerProfiles: { status: "status" }, vehicleMatches: "matches",
    eq: () => ({}), crypto: { randomUUID: () => "synthetic-match-id" },
    evaluateBuyerVehicle: (profile, item) => {
      const result = scorerExports.evaluateBuyerVehicle(profile, item);
      evaluations.push(result);
      return result;
    } };
  const consumer = runInNewContext(`${consumerScript}\ncreateMatchesForVehicle;`, context);
  const originalPrepare = context.prepareVehicleMatch;
  context.prepareVehicleMatch = (profile, item, evaluation) => {
    const result = originalPrepare(profile, item, evaluation);
    handoffs.push({ evaluation, result });
    return result;
  };
  assert.equal(await consumer(vehicle), 1);
  assert.equal(evaluations.length, 2);
  assert.equal(handoffs.length, 1);
  assert.equal(handoffs[0].evaluation, evaluations[1]);
  assert.equal(handoffs[0].result.ruleResults, evaluations[1].ruleResults);
  assert.equal(inserted[0], handoffs[0].result.values);
  assert.equal(inserted[0].score, 55);
  assert.ok(!Object.hasOwn(inserted[0], "ruleResults"));
  assert.ok(!Object.hasOwn(inserted[0], "coverage"));
  assert.ok(!Object.hasOwn(inserted[0], "explanation"));
});

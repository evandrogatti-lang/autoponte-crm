import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../lib/match-score.ts", import.meta.url), "utf8");
const declarations = new Map([
  ["BuyerProfile", ts.SyntaxKind.TypeAliasDeclaration],
  ["MatchableVehicle", ts.SyntaxKind.TypeAliasDeclaration],
  ["MatchRuleId", ts.SyntaxKind.TypeAliasDeclaration],
  ["LegacyMatchRuleResult", ts.SyntaxKind.TypeAliasDeclaration],
  ["MatchRuleOutcome", ts.SyntaxKind.TypeAliasDeclaration],
  ["MatchCoverage", ts.SyntaxKind.TypeAliasDeclaration],
  ["MatchExplanationItem", ts.SyntaxKind.TypeAliasDeclaration],
  ["MatchExplanation", ts.SyntaxKind.TypeAliasDeclaration],
  ["explainMatchRules", ts.SyntaxKind.FunctionDeclaration],
  ["MatchRuleResult", ts.SyntaxKind.TypeAliasDeclaration],
  ["usableText", ts.SyntaxKind.FunctionDeclaration],
  ["usableNumber", ts.SyntaxKind.FunctionDeclaration],
  ["semanticResult", ts.SyntaxKind.FunctionDeclaration],
  ["validCategoryInput", ts.SyntaxKind.FunctionDeclaration],
  ["aggregateMatchCoverage", ts.SyntaxKind.FunctionDeclaration],
  ["normalize", ts.SyntaxKind.FunctionDeclaration],
  ["parseTypes", ts.SyntaxKind.FunctionDeclaration],
  ["guessedType", ts.SyntaxKind.FunctionDeclaration],
  ["evaluateBudget", ts.SyntaxKind.FunctionDeclaration],
  ["evaluateYear", ts.SyntaxKind.FunctionDeclaration],
  ["evaluateMileage", ts.SyntaxKind.FunctionDeclaration],
  ["evaluateCity", ts.SyntaxKind.FunctionDeclaration],
  ["evaluateUseCase", ts.SyntaxKind.FunctionDeclaration],
  ["evaluateTransmission", ts.SyntaxKind.FunctionDeclaration],
  ["evaluateModelCategory", ts.SyntaxKind.FunctionDeclaration],
  ["evaluateBuyerVehicleRules", ts.SyntaxKind.FunctionDeclaration],
  ["scoreBuyerVehicle", ts.SyntaxKind.FunctionDeclaration],
]);

// Select actual declarations, never imports or database-writing functions.
// This is a dependency guard for this known source, not a general JS sandbox.
function isolateScorer(text, entryPoint = "scoreBuyerVehicle") {
  assert.ok(["scoreBuyerVehicle", "evaluateBuyerVehicleRules", "aggregateMatchCoverage", "explainMatchRules"].includes(entryPoint));
  const parsed = ts.createSourceFile("match.ts", text, ts.ScriptTarget.ES2022, true);
  assert.equal(parsed.parseDiagnostics.length, 0, "source must parse");
  const selected = [];
  for (const [name, kind] of declarations) {
    const matches = parsed.statements.filter((node) => node.name?.text === name);
    assert.equal(matches.length, 1, `expected one declaration: ${name}`);
    assert.equal(matches[0].kind, kind, `unsupported declaration: ${name}`);
    selected.push(matches[0].getText(parsed));
  }
  const isolated = ts.createSourceFile("isolated.ts", selected.join("\n"), ts.ScriptTarget.ES2022, true);
  const options = { noLib: true, noResolve: true, target: ts.ScriptTarget.ES2022 };
  const host = {
    getSourceFile: (name) => name === "isolated.ts" ? isolated : undefined,
    getDefaultLibFileName: () => "", writeFile: () => {},
    getCurrentDirectory: () => "", getDirectories: () => [],
    fileExists: (name) => name === "isolated.ts", readFile: () => undefined,
    getCanonicalFileName: (name) => name, useCaseSensitiveFileNames: () => true,
    getNewLine: () => "\n",
  };
  const checker = ts.createProgram(["isolated.ts"], options, host).getTypeChecker();
  function guard(node) {
    assert.ok(!ts.isImportDeclaration(node) && !ts.isImportEqualsDeclaration(node)
      && !ts.isNewExpression(node) && !ts.isThis(node)
      && node.kind !== ts.SyntaxKind.ImportKeyword, "unsupported source dependency");
    if (ts.isIdentifier(node)) {
      const parent = node.parent;
      const propertyName = (ts.isPropertyAccessExpression(parent) && parent.name === node)
        || ((ts.isPropertySignature(parent) || ts.isPropertyAssignment(parent)) && parent.name === node);
      if (!propertyName && !checker.getSymbolAtLocation(node)) {
        assert.ok(["JSON", "Math", "Number", "Array"].includes(node.text), `unexpected dependency: ${node.text}`);
      }
    }
    ts.forEachChild(node, guard);
  }
  guard(isolated);
  const printer = ts.createPrinter();
  const script = isolated.statements.map((node) => {
    const modifiers = node.modifiers?.filter((modifier) => modifier.kind !== ts.SyntaxKind.ExportKeyword);
    const plain = ts.isFunctionDeclaration(node)
      ? ts.factory.updateFunctionDeclaration(node, modifiers, node.asteriskToken, node.name,
        node.typeParameters, node.parameters, node.type, node.body)
      : ts.factory.updateTypeAliasDeclaration(node, modifiers, node.name, node.typeParameters, node.type);
    return printer.printNode(ts.EmitHint.Unspecified, plain, isolated);
  }).join("\n");
  const compiled = ts.transpileModule(script, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
    reportDiagnostics: true,
  });
  assert.deepEqual(compiled.diagnostics ?? [], [], "transpilation diagnostics");
  return runInNewContext(`${compiled.outputText}\n${entryPoint};`, Object.create(null), {
    timeout: 1000, contextCodeGeneration: { strings: false, wasm: false },
  });
}

const scoreBuyerVehicle = isolateScorer(source);
const baseProfile = {
  id: "synthetic-buyer", name: "Pessoa Inventada", whatsapp: "", email: "",
  city: "Cidade A", budget_max: 10000, vehicle_types: '["SUV"]', preferred_models: "",
  min_year: 2020, max_mileage: 10000, transmission: "Manual", fuel: "Gasolina",
  use_case: "Trabalho", purchase_timeline: "", alerts_consent: 0,
};
const baseVehicle = {
  sourceType: "catalog", sourceId: "synthetic-vehicle", label: "Veículo Inventado",
  price: 20000, city: "Cidade B", year: 2010, mileage: 20000,
  type: "Hatch", transmission: "Automático", fuel: "Diesel", useCases: [],
};
function expectMatch(profileChanges, vehicleChanges, score, reasons) {
  const profile = structuredClone({ ...baseProfile, ...profileChanges });
  const vehicle = structuredClone({ ...baseVehicle, ...vehicleChanges });
  const before = structuredClone({ profile, vehicle });
  for (let repeat = 0; repeat < 3; repeat += 1) {
    const actual = scoreBuyerVehicle(profile, vehicle);
    assert.equal(actual.score, score);
    // VM arrays have another realm's prototype; compare their values locally.
    assert.deepEqual(Array.from(actual.reasons), reasons);
    assert.deepEqual({ profile, vehicle }, before);
  }
}

test("fully compatible and incompatible pairs retain exact ordered reasons", () => {
  expectMatch({ preferred_models: "Inventado" }, {
    price: 10000, city: "Cidade A", year: 2020, mileage: 10000,
    transmission: "Manual", useCases: ["Trabalho"],
  }, 100, ["dentro do orçamento", "modelo solicitado", "ano compatível",
    "quilometragem compatível", "na mesma cidade", "câmbio desejado", "adequado ao uso informado"]);
  expectMatch({}, {}, 0, []);
  expectMatch({}, { price: 10800, type: "SUV", year: 2020 }, 47,
    ["próximo do orçamento", "categoria preferida", "ano compatível"]);
});

for (const [price, score, reason] of [
  [10000, 25, "dentro do orçamento"], [10001, 12, "próximo do orçamento"],
  [10800, 12, "próximo do orçamento"], [10801, 0, undefined],
]) {
  test(`isolated budget boundary: ${price}`, () => expectMatch({}, { price }, score, reason ? [reason] : []));
}

test("model matching normalizes accents/case, trims and accepts each separator", () => {
  for (const separator of [",", ";", "/"]) {
    expectMatch({ preferred_models: `Ausente${separator}  INVÉNTADO ` }, {}, 25, ["modelo solicitado"]);
  }
  expectMatch({ preferred_models: "Ve" }, {}, 0, []);
  expectMatch({ preferred_models: "Ausente" }, { type: "SUV" }, 20, ["categoria preferida"]);
  expectMatch({ preferred_models: "Inventado" }, { type: "SUV" }, 25, ["modelo solicitado"]);
  expectMatch({ vehicle_types: '["HÁTCH"]' }, {}, 20, ["categoria preferida"]);
  expectMatch({}, {}, 0, []);
});

test("label-based category guesses and explicit type precedence", () => {
  for (const [label, category] of [
    ["SUV inventado", "SUV"], ["Sedan inventado", "Sedan"], ["Civic", "Sedan"],
    ["Corolla", "Sedan"], ["Hatch inventado", "Hatch"], ["Pickup", "Picape"],
    ["Picape", "Picape"], ["Veículo Inventado", "Outro"],
  ]) {
    expectMatch({ vehicle_types: JSON.stringify([category]) }, { label, type: undefined }, 20, ["categoria preferida"]);
  }
  expectMatch({}, { label: "SUV", type: "Hatch" }, 0, []);
});

for (const [name, profile, vehicle, score, reasons] of [
  ["year equal", {}, { year: 2020 }, 15, ["ano compatível"]],
  ["year above", {}, { year: 2021 }, 15, ["ano compatível"]],
  ["year below", {}, { year: 2019 }, 0, []],
  ["mileage equal", {}, { mileage: 10000 }, 12, ["quilometragem compatível"]],
  ["mileage below", {}, { mileage: 9999 }, 12, ["quilometragem compatível"]],
  ["mileage above", {}, { mileage: 10001 }, 0, []],
  ["city normalized", { city: "Cídade A" }, { city: "CIDADE A" }, 8, ["na mesma cidade"]],
  ["city whitespace preserved", {}, { city: "Cidade A " }, 0, []],
  ["transmission normalized", { transmission: "Automático" }, {}, 8, ["câmbio desejado"]],
  ["use normalized", { use_case: "Família" }, { useCases: ["FAMILIA"] }, 7, ["adequado ao uso informado"]],
  ["absent use cases", {}, { useCases: undefined }, 0, []],
  ["empty profile use", { use_case: "" }, { useCases: [""] }, 0, []],
]) {
  test(`isolated factor: ${name}`, () => expectMatch(profile, vehicle, score, reasons));
}

test("legacy permissive missing-value behavior remains characterized", () => {
  for (const vehicle_types of ["", "not JSON", "[]"]) {
    expectMatch({ vehicle_types }, {}, 20, ["categoria preferida"]);
  }
  expectMatch({ min_year: 0 }, {}, 15, ["ano compatível"]);
  expectMatch({ max_mileage: 0 }, {}, 12, ["quilometragem compatível"]);
  expectMatch({}, { transmission: undefined }, 8, ["câmbio desejado"]);
  expectMatch({ transmission: "Indiferente" }, {}, 8, []);
  expectMatch({ transmission: "indiferente" }, {}, 0, []);
});

test("fuel, contact consent and source metadata do not affect legacy scoring", () => {
  expectMatch({ fuel: "Diesel", alerts_consent: 1 }, { sourceType: "trade_in" }, 0, []);
  expectMatch({ fuel: "Diesel" }, { sourceType: "consignment" }, 0, []);
});

test("source guards reject missing, duplicate, unsupported and external declarations", () => {
  assert.throws(() => isolateScorer(source.replace("function normalize(", "function renamed(")), /expected one declaration/);
  assert.throws(() => isolateScorer(`${source}\nfunction normalize() {}`), /expected one declaration/);
  assert.throws(() => isolateScorer(source.replace("function normalize(value: string)", "class normalize")), /unsupported declaration|source must parse/);
  assert.throws(() => isolateScorer(source.replace("let score = 0", "let score = getDb()")), /unexpected dependency: getDb/);
  assert.throws(() => isolateScorer(source.replace("let score = 0", "let score = process.exit()")), /unexpected dependency: process/);
  assert.throws(() => isolateScorer(source.replace("let score = 0", "let score = import('database')")), /unsupported source dependency/);
});

// AP-MATCH-010: exercise the structured entry point without changing legacy assertions.
const evaluateBuyerVehicleRules = isolateScorer(source, "evaluateBuyerVehicleRules");
const ruleIds = ["budget", "model_category", "year", "mileage", "city", "transmission", "use_case"];
function structuredResults(profileChanges = {}, vehicleChanges = {}) {
  const profile = structuredClone({ ...baseProfile, ...profileChanges });
  const vehicle = structuredClone({ ...baseVehicle, ...vehicleChanges });
  const before = structuredClone({ profile, vehicle });
  const results = evaluateBuyerVehicleRules(profile, vehicle);
  const plain = Array.from(results, (result) => ({ ...result }));
  assert.deepEqual(plain.map((result) => result.ruleId), ruleIds);
  assert.equal(new Set(plain.map((result) => result.ruleId)).size, 7);
  assert.deepEqual({ profile, vehicle }, before);
  assert.deepEqual(Array.from(evaluateBuyerVehicleRules(profile, vehicle), (result) => ({ ...result })), plain);
  const legacy = scoreBuyerVehicle(profile, vehicle);
  assert.deepEqual(Object.keys(legacy), ["score", "reasons"]);
  assert.equal(legacy.score, Math.min(100, plain.reduce((sum, result) => sum + result.points, 0)));
  assert.deepEqual(Array.from(legacy.reasons), plain.flatMap((result) => result.reason === undefined ? [] : [result.reason]));
  // AP-MATCH-010's assertions continue checking the original fields independently.
  return plain.map(({ ruleId, eligible, points, reason }) => reason === undefined
    ? { ruleId, eligible, points } : { ruleId, eligible, points, reason });
}

test("AP-MATCH-010: all eligible rules expose exact contributions and ordered explanations", () => {
  const results = structuredResults({ preferred_models: "Inventado" }, {
    price: 10000, city: "Cidade A", year: 2020, mileage: 10000,
    transmission: "Manual", useCases: ["Trabalho"],
  });
  assert.deepEqual(results, [
    { ruleId: "budget", eligible: true, points: 25, reason: "dentro do orçamento" },
    { ruleId: "model_category", eligible: true, points: 25, reason: "modelo solicitado" },
    { ruleId: "year", eligible: true, points: 15, reason: "ano compatível" },
    { ruleId: "mileage", eligible: true, points: 12, reason: "quilometragem compatível" },
    { ruleId: "city", eligible: true, points: 8, reason: "na mesma cidade" },
    { ruleId: "transmission", eligible: true, points: 8, reason: "câmbio desejado" },
    { ruleId: "use_case", eligible: true, points: 7, reason: "adequado ao uso informado" },
  ]);
});

test("AP-MATCH-010: every nonmatching rule remains visible with zero points and no reason", () => {
  assert.deepEqual(structuredResults(), ruleIds.map((ruleId) => ({ ruleId, eligible: false, points: 0 })));
});

test("AP-MATCH-010: mixed results aggregate only contributions and preserve sparse reason order", () => {
  const results = structuredResults({ transmission: "Indiferente" }, { price: 10800, type: "SUV", year: 2020 });
  assert.deepEqual(results.map((result) => result.eligible), [true, true, true, false, false, true, false]);
  assert.deepEqual(results.map((result) => result.points), [12, 20, 15, 0, 0, 8, 0]);
  assert.deepEqual(results.flatMap((result) => result.reason === undefined ? [] : [result.reason]),
    ["próximo do orçamento", "categoria preferida", "ano compatível"]);
});

test("AP-MATCH-010: budget boundaries retain their structured eligibility and reasons", () => {
  for (const [price, eligible, points, reason] of [
    [10000, true, 25, "dentro do orçamento"], [10001, true, 12, "próximo do orçamento"],
    [10800, true, 12, "próximo do orçamento"], [10801, false, 0, undefined],
  ]) {
    const expected = { ruleId: "budget", eligible, points };
    if (reason !== undefined) expected.reason = reason;
    assert.deepEqual(structuredResults({}, { price })[0], expected);
  }
});

test("AP-MATCH-010: model precedence and unrestricted-category fallbacks share one result", () => {
  assert.deepEqual(structuredResults({ preferred_models: "Inventado" }, { type: "SUV" })[1],
    { ruleId: "model_category", eligible: true, points: 25, reason: "modelo solicitado" });
  for (const vehicle_types of ['["SUV"]', "[]", "", "not JSON"]) {
    assert.deepEqual(structuredResults({ preferred_models: "Ausente", vehicle_types }, { type: "SUV" })[1],
      { ruleId: "model_category", eligible: true, points: 20, reason: "categoria preferida" });
  }
});

test("AP-MATCH-010: permissive missing values mean legacy eligibility, not verified suitability", () => {
  const results = structuredResults({ min_year: 0, max_mileage: 0, city: "", use_case: "" },
    { city: "", transmission: undefined, useCases: undefined });
  assert.deepEqual(results.slice(2, 6), [
    { ruleId: "year", eligible: true, points: 15, reason: "ano compatível" },
    { ruleId: "mileage", eligible: true, points: 12, reason: "quilometragem compatível" },
    { ruleId: "city", eligible: true, points: 8, reason: "na mesma cidade" },
    { ruleId: "transmission", eligible: true, points: 8, reason: "câmbio desejado" },
  ]);
  assert.deepEqual(results[6], { ruleId: "use_case", eligible: false, points: 0 });
  for (const transmission of [undefined, ""]) {
    assert.deepEqual(structuredResults({}, { transmission })[5],
      { ruleId: "transmission", eligible: true, points: 8, reason: "câmbio desejado" });
  }
  assert.deepEqual(structuredResults({ transmission: "Indiferente" })[5],
    { ruleId: "transmission", eligible: true, points: 8 });
  assert.deepEqual(structuredResults({ transmission: "indiferente" })[5],
    { ruleId: "transmission", eligible: false, points: 0 });
});

test("AP-MATCH-010: normalization, non-trimming and use-case short-circuiting are preserved", () => {
  const results = structuredResults({ city: "Cídade A", use_case: "Família" },
    { city: "CIDADE A", useCases: ["FAMILIA", null] });
  assert.equal(results[4].eligible, true);
  assert.deepEqual(results[6], { ruleId: "use_case", eligible: true, points: 7, reason: "adequado ao uso informado" });
  const spaced = structuredResults({ use_case: "Trabalho " }, { city: "Cidade A ", useCases: ["Trabalho"] });
  assert.equal(spaced[4].eligible, false);
  assert.equal(spaced[6].eligible, false);
  assert.equal(structuredResults({ use_case: "" }, { useCases: [null] })[6].eligible, false);
});

test("AP-MATCH-010: malformed category shapes retain existing exceptions", () => {
  for (const vehicle_types of ["null", "{}", '"SUV"', "[1]"]) {
    const profile = { ...baseProfile, vehicle_types };
    assert.throws(() => evaluateBuyerVehicleRules(profile, baseVehicle));
    assert.throws(() => scoreBuyerVehicle(profile, baseVehicle));
  }
});

const aggregateMatchCoverage = isolateScorer(source, "aggregateMatchCoverage");
function semanticResults(profileChanges = {}, vehicleChanges = {}) {
  return Array.from(evaluateBuyerVehicleRules({ ...baseProfile, ...profileChanges },
    { ...baseVehicle, ...vehicleChanges }), (result) => ({ ...result }));
}

test("AP-MATCH-011: every rule has a semantic outcome independent of legacy eligibility", () => {
  const rejected = semanticResults({}, { useCases: ["Lazer"] });
  assert.deepEqual(rejected.map((result) => result.outcome), ruleIds.map(() => "not_matched"));
  const matched = semanticResults({ preferred_models: "Inventado" }, {
    price: 10000, year: 2020, mileage: 10000, city: "Cidade A", transmission: "Manual", useCases: ["Trabalho"],
  });
  assert.deepEqual(matched.map((result) => result.outcome), ruleIds.map(() => "matched"));
  assert.deepEqual({ ...aggregateMatchCoverage(matched) }, {
    totalRules: 7, evaluatedRules: 7, matchedRules: 7, notMatchedRules: 0, neutralRules: 0,
    missingBuyerDataRules: 0, missingVehicleDataRules: 0, notApplicableRules: 0, inferredDataRules: 1,
  });
});

test("AP-MATCH-011: approved sentinels are neutral even with unavailable vehicle data", () => {
  // The legacy empty preference short-circuits even an unusable vehicle collection.
  assert.equal(semanticResults({ use_case: "" }, { useCases: {} })[6].outcome, "no_preference");
  for (const max_mileage of [0, 999999]) {
    for (const vehicle_types of ["[]", ""]) {
      const profile = { min_year: 0, max_mileage, vehicle_types, use_case: "", transmission: "Indiferente" };
      const vehicle = { label: "", type: undefined, year: 0, mileage: Number.NaN, transmission: undefined, useCases: undefined };
      const results = semanticResults(profile, vehicle);
      assert.deepEqual([1, 2, 3, 5, 6].map((index) => results[index].outcome), Array(5).fill("no_preference"));
      assert.deepEqual([1, 2, 5, 6].map((index) => results[index].points), [20, 15, 8, 0]);
      const score = scoreBuyerVehicle({ ...baseProfile, ...profile }, { ...baseVehicle, ...vehicle });
      assert.equal(score.score, max_mileage === 0 ? 55 : 43);
      assert.deepEqual(Object.keys(score), ["score", "reasons"]);
      const coverage = aggregateMatchCoverage(results);
      assert.equal(coverage.neutralRules, 5);
      assert.equal(coverage.missingVehicleDataRules, 0);
    }
  }
});

test("AP-MATCH-011: missing buyer data wins over missing vehicle data", () => {
  const results = semanticResults({ budget_max: Number.NaN, min_year: -1, max_mileage: -1,
    city: "", transmission: "", use_case: " ", vehicle_types: "broken JSON" },
  { price: 0, year: 0, mileage: -1, city: "", transmission: undefined, useCases: undefined, label: "", type: undefined });
  assert.deepEqual(results.map((result) => result.outcome), ruleIds.map(() => "missing_buyer_data"));
  assert.equal(aggregateMatchCoverage(results).missingBuyerDataRules, 7);
  assert.equal(results[1].points, 20); // Invalid JSON still receives legacy unrestricted-category points.
  assert.equal(results[5].points, 8); // Missing transmission remains permissive numerically.
});

test("AP-MATCH-011: meaningful preferences with missing vehicle facts are classified separately", () => {
  const results = semanticResults({}, { price: 0, year: 0, mileage: Number.NaN,
    city: "", transmission: "", useCases: [], label: "", type: undefined });
  assert.deepEqual(results.map((result) => result.outcome), ruleIds.map(() => "missing_vehicle_data"));
  assert.equal(results[0].points, 25);
  assert.equal(results[5].points, 8);
  assert.equal(aggregateMatchCoverage(results).missingVehicleDataRules, 7);
  assert.equal(semanticResults({}, { mileage: 0 })[3].outcome, "matched"); // Zero mileage is usable.
});

test("AP-MATCH-011: inferred categories count as evaluated and preserve their source", () => {
  const inferred = semanticResults({}, { type: undefined, label: "SUV inventado" });
  assert.equal(inferred[1].outcome, "matched");
  assert.equal(inferred[1].vehicleDataSource, "inferred");
  assert.equal(aggregateMatchCoverage(inferred).inferredDataRules, 1);
  const explicit = semanticResults({}, { type: "SUV", label: "Hatch" });
  assert.equal(explicit[1].outcome, "matched");
  assert.equal(explicit[1].vehicleDataSource, "explicit");
  assert.equal(aggregateMatchCoverage(explicit).inferredDataRules, 0);
  const unknown = semanticResults({}, { type: undefined, label: "Veículo inventado" });
  assert.equal(unknown[1].outcome, "not_matched");
  assert.equal(unknown[1].vehicleDataSource, "inferred");
});

test("AP-MATCH-011: unrestricted category fallback does not claim a requested model matched", () => {
  const results = semanticResults({ vehicle_types: "[]", preferred_models: "Ausente" });
  assert.equal(results[1].outcome, "not_matched");
  assert.equal(results[1].eligible, true);
  assert.equal(results[1].points, 20);
  assert.equal(results[1].reason, "categoria preferida");
  assert.equal(aggregateMatchCoverage(results).neutralRules, 0);
  assert.equal(semanticResults({ vehicle_types: "[]", preferred_models: "Inventado" })[1].outcome, "matched");
});

test("AP-MATCH-011: coverage is pure, deterministic, exhaustive and handles empty/not-applicable input", () => {
  const results = semanticResults({ min_year: 0, transmission: "Indiferente" }, { city: "", useCases: ["Lazer"] });
  const before = structuredClone(results);
  results.forEach(Object.freeze);
  Object.freeze(results);
  const first = { ...aggregateMatchCoverage(results) };
  assert.deepEqual({ ...aggregateMatchCoverage(results) }, first);
  assert.deepEqual(results, before);
  assert.equal(first.totalRules, first.evaluatedRules + first.neutralRules + first.missingBuyerDataRules
    + first.missingVehicleDataRules + first.notApplicableRules);
  assert.equal(first.evaluatedRules, first.matchedRules + first.notMatchedRules);
  assert.equal(first.neutralRules, 2);
  assert.equal(first.missingVehicleDataRules, 1);
  assert.deepEqual({ ...aggregateMatchCoverage([]) }, { totalRules: 0, evaluatedRules: 0, matchedRules: 0,
    notMatchedRules: 0, neutralRules: 0, missingBuyerDataRules: 0, missingVehicleDataRules: 0, notApplicableRules: 0, inferredDataRules: 0 });
  assert.equal(aggregateMatchCoverage([{ ruleId: "use_case", eligible: false, points: 0, outcome: "not_applicable" }]).notApplicableRules, 1);
  // None of the seven current rules has a product-approved not-applicable branch.
  assert.ok(results.every((result) => result.outcome !== "not_applicable"));
});

const explainMatchRules = isolateScorer(source, "explainMatchRules");
const plainExplanation = (results) => JSON.parse(JSON.stringify(explainMatchRules(results, aggregateMatchCoverage(results))));

test("AP-MATCH-012: semantic outcomes select explanations independently of points and legacy text", () => {
  const outcomes = ["matched", "not_matched", "no_preference", "missing_buyer_data", "missing_vehicle_data", "not_applicable", "matched"];
  const results = ruleIds.map((ruleId, index) => ({ ruleId, outcome: outcomes[index], eligible: false,
    points: 0, reason: "unrelated legacy text", ...(index === 1 ? { vehicleDataSource: "inferred" } : {}) }));
  const explanation = plainExplanation(results);
  assert.deepEqual(explanation.positives.map((item) => item.ruleId), ["budget", "use_case"]);
  assert.deepEqual(explanation.negatives.map((item) => item.ruleId), ["model_category"]);
  assert.deepEqual(explanation.neutral.map((item) => item.ruleId), ["year"]);
  assert.deepEqual(explanation.missingData.map((item) => item.outcome), ["missing_buyer_data", "missing_vehicle_data"]);
  assert.deepEqual(explanation.notApplicable.map((item) => item.ruleId), ["transmission"]);
  assert.deepEqual(explanation.inferredData.map((item) => item.ruleId), ["model_category"]);
  assert.equal(explanation.positives[0].text, "Orçamento: compatível com a preferência informada.");
  assert.equal(explanation.negatives[0].text, "Modelo/categoria: não compatível com a preferência informada.");
  assert.equal(explanation.neutral[0].text, "Ano mínimo: sem preferência do comprador.");
  assert.equal(explanation.missingData[0].text, "Quilometragem máxima: dados do comprador ausentes ou inválidos.");
  assert.equal(explanation.missingData[1].text, "Cidade: dados do veículo indisponíveis.");
  assert.equal(explanation.inferredData[0].text, "Modelo/categoria: dados do veículo inferidos do rótulo.");
  assert.equal(explanation.notApplicable[0].text, "Câmbio: regra não aplicável.");
});

test("AP-MATCH-012: explanations preserve input order and are pure and deterministic", () => {
  const results = semanticResults({ preferred_models: "Inventado" }, {
    price: 10000, year: 2020, mileage: 10000, city: "Cidade A", transmission: "Manual", useCases: ["Trabalho"],
  }).reverse();
  const coverage = Object.freeze({ ...aggregateMatchCoverage(results) });
  const before = structuredClone(results);
  results.forEach(Object.freeze);
  Object.freeze(results);
  const first = explainMatchRules(results, coverage);
  assert.deepEqual(Array.from(first.positives, (item) => item.ruleId), [...ruleIds].reverse());
  assert.deepEqual(JSON.parse(JSON.stringify(first)), JSON.parse(JSON.stringify(explainMatchRules(results, coverage))));
  assert.deepEqual(results, before);
  assert.deepEqual({ ...first.coverage }, coverage);
  assert.notEqual(first.coverage, coverage);
  first.coverage.totalRules = 100;
  assert.equal(coverage.totalRules, 7);
});

test("AP-MATCH-012: coverage is descriptive passthrough with stable summary and empty output", () => {
  const results = semanticResults({ min_year: 0, transmission: "Indiferente" }, { city: "", useCases: ["Lazer"] });
  const explanation = plainExplanation(results);
  assert.deepEqual(explanation.coverage, { ...aggregateMatchCoverage(results) });
  assert.equal(explanation.summary, "0 regras compatíveis; 4 regras não compatíveis; 4 de 7 regras avaliadas com dados disponíveis.");
  const empty = plainExplanation([]);
  assert.equal(empty.summary, "0 regras compatíveis; 0 regras não compatíveis; 0 de 0 regras avaliadas com dados disponíveis.");
  for (const key of ["positives", "negatives", "neutral", "missingData", "inferredData", "notApplicable"]) assert.deepEqual(empty[key], []);
});

test("AP-MATCH-012: explanation adapter leaves legacy score, reasons and public keys unchanged", () => {
  const profile = { ...baseProfile, vehicle_types: "[]", preferred_models: "Ausente", transmission: "Indiferente" };
  const vehicle = { ...baseVehicle };
  const before = scoreBuyerVehicle(profile, vehicle);
  const results = Array.from(evaluateBuyerVehicleRules(profile, vehicle), (result) => ({ ...result }));
  const explanation = plainExplanation(results);
  assert.equal(explanation.negatives.find((item) => item.ruleId === "model_category").outcome, "not_matched");
  assert.equal(results[1].points, 20);
  assert.deepEqual(scoreBuyerVehicle(profile, vehicle), before);
  assert.deepEqual(Object.keys(before), ["score", "reasons"]);
  assert.equal(before.score, 28);
  assert.deepEqual(Array.from(before.reasons), ["categoria preferida"]);
});

// AP-MATCH-013: exercise scoring, semantics, coverage and explanations together.
const completeVehicle = { price: 10000, type: "SUV", year: 2020, mileage: 10000,
  city: "Cidade A", transmission: "Manual", useCases: ["Trabalho"] };
const completeReasons = ["dentro do orçamento", "categoria preferida", "ano compatível",
  "quilometragem compatível", "na mesma cidade", "câmbio desejado", "adequado ao uso informado"];
const scenarioCases = [
  { name: "strong complete-data match", profile: {}, vehicle: {}, score: 95, reasons: completeReasons,
    outcomes: ["matched", "matched", "matched", "matched", "matched", "matched", "matched"], counts: [7, 7, 0, 0, 0, 0, 0] },
  { name: "high legacy score with incomplete evidence", profile: {}, vehicle: { price: 0, transmission: undefined }, score: 95, reasons: completeReasons,
    outcomes: ["missing_vehicle_data", "matched", "matched", "matched", "matched", "missing_vehicle_data", "matched"], counts: [5, 5, 0, 0, 0, 2, 0] },
  { name: "several no-preference fields", profile: { vehicle_types: "[]", min_year: 0, max_mileage: 0, transmission: "Indiferente", use_case: "" }, vehicle: {}, score: 88, reasons: completeReasons.slice(0, 5),
    outcomes: ["matched", "no_preference", "no_preference", "no_preference", "matched", "no_preference", "no_preference"], counts: [2, 2, 0, 5, 0, 0, 0] },
  { name: "inferred vehicle category", profile: {}, vehicle: { type: undefined, label: "SUV Sintético" }, score: 95, reasons: completeReasons,
    outcomes: ["matched", "matched", "matched", "matched", "matched", "matched", "matched"], counts: [7, 7, 0, 0, 0, 0, 1] },
  { name: "missing buyer budget", profile: { budget_max: Number.NaN }, vehicle: {}, score: 70, reasons: completeReasons.slice(1),
    outcomes: ["missing_buyer_data", "matched", "matched", "matched", "matched", "matched", "matched"], counts: [6, 6, 0, 0, 1, 0, 0] },
  { name: "missing vehicle year with meaningful preference", profile: {}, vehicle: { year: 0 }, score: 80, reasons: completeReasons.filter((_, index) => index !== 2),
    outcomes: ["matched", "matched", "missing_vehicle_data", "matched", "matched", "matched", "matched"], counts: [6, 6, 0, 0, 0, 1, 0] },
  { name: "mixed positive and negative rules", profile: {}, vehicle: { price: 10801, year: 2010, transmission: "Automático" }, score: 47,
    reasons: ["categoria preferida", "quilometragem compatível", "na mesma cidade", "adequado ao uso informado"],
    outcomes: ["not_matched", "matched", "not_matched", "matched", "matched", "not_matched", "matched"], counts: [7, 4, 3, 0, 0, 0, 0] },
  { name: "borderline moderate compatibility", profile: {}, vehicle: { price: 10800, mileage: 20000, city: "Cidade B", transmission: "Automático", useCases: ["Lazer"] }, score: 47,
    reasons: ["próximo do orçamento", "categoria preferida", "ano compatível"],
    outcomes: ["matched", "matched", "matched", "not_matched", "not_matched", "not_matched", "not_matched"], counts: [7, 3, 4, 0, 0, 0, 0] },
];
for (const scenario of scenarioCases) {
  test(`AP-MATCH-013: ${scenario.name}`, () => {
    const profile = { ...baseProfile, ...scenario.profile };
    const vehicle = { ...baseVehicle, ...completeVehicle, ...scenario.vehicle };
    const before = structuredClone({ profile, vehicle });
    const results = Array.from(evaluateBuyerVehicleRules(profile, vehicle), (result) => ({ ...result }));
    const coverage = { ...aggregateMatchCoverage(results) };
    const explanation = plainExplanation(results);
    const legacy = scoreBuyerVehicle(profile, vehicle);
    assert.equal(legacy.score, scenario.score);
    assert.deepEqual(Array.from(legacy.reasons), scenario.reasons);
    assert.deepEqual(Object.keys(legacy), ["score", "reasons"]);
    assert.deepEqual(results.map((result) => result.outcome), scenario.outcomes);
    const [evaluatedRules, matchedRules, notMatchedRules, neutralRules, missingBuyerDataRules, missingVehicleDataRules, inferredDataRules] = scenario.counts;
    assert.deepEqual(coverage, { totalRules: 7, evaluatedRules, matchedRules, notMatchedRules, neutralRules,
      missingBuyerDataRules, missingVehicleDataRules, notApplicableRules: 0, inferredDataRules });
    assert.deepEqual(explanation.coverage, coverage);
    const categories = { positives: ["matched"], negatives: ["not_matched"], neutral: ["no_preference"],
      missingData: ["missing_buyer_data", "missing_vehicle_data"], notApplicable: ["not_applicable"] };
    for (const [category, outcomes] of Object.entries(categories)) {
      assert.deepEqual(explanation[category].map((item) => item.ruleId),
        results.filter((result) => outcomes.includes(result.outcome)).map((result) => result.ruleId));
      assert.ok(explanation[category].every((item) => outcomes.includes(item.outcome)));
    }
    assert.equal(explanation.inferredData.length, inferredDataRules);
    if (inferredDataRules) {
      assert.equal(results[1].vehicleDataSource, "inferred");
      assert.equal(explanation.inferredData[0].ruleId, "model_category");
      assert.equal(explanation.inferredData[0].text, "Modelo/categoria: dados do veículo inferidos do rótulo.");
    }
    assert.equal(explanation.summary, `${matchedRules} regras compatíveis; ${notMatchedRules} regras não compatíveis; ${evaluatedRules} de 7 regras avaliadas com dados disponíveis.`);
    assert.deepEqual(plainExplanation(results), explanation);
    assert.deepEqual({ profile, vehicle }, before);
  });
}
for (const [price, budgetFit, points, reason, text] of [
  [9999, "within_budget", 25, "dentro do orçamento", "Orçamento: dentro do orçamento informado."],
  [10000, "within_budget", 25, "dentro do orçamento", "Orçamento: dentro do orçamento informado."],
  [10001, "near_budget", 12, "próximo do orçamento", "Orçamento: acima do valor informado, mas próximo do orçamento."],
  [10800, "near_budget", 12, "próximo do orçamento", "Orçamento: acima do valor informado, mas próximo do orçamento."],
  [10801, "outside_budget", 0, undefined, "Orçamento: acima do orçamento informado."],
]) {
  test(`AP-MATCH-013: budget wording at price ${price}`, () => {
    const results = semanticResults({}, { price });
    assert.equal(results[0].budgetFit, budgetFit);
    assert.equal(results[0].points, points);
    assert.equal(results[0].reason, reason);
    const explanation = plainExplanation(results);
    const category = points ? explanation.positives : explanation.negatives;
    assert.equal(category.find((item) => item.ruleId === "budget").text, text);
    expectMatch({}, { price }, points, reason === undefined ? [] : [reason]);
  });
}

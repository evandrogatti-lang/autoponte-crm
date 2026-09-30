import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../lib/match-score.ts", import.meta.url), "utf8");
const declarations = new Map([
  ["BuyerProfile", ts.SyntaxKind.TypeAliasDeclaration],
  ["MatchableVehicle", ts.SyntaxKind.TypeAliasDeclaration],
  ["normalize", ts.SyntaxKind.FunctionDeclaration],
  ["parseTypes", ts.SyntaxKind.FunctionDeclaration],
  ["guessedType", ts.SyntaxKind.FunctionDeclaration],
  ["evaluateBudget", ts.SyntaxKind.FunctionDeclaration],
  ["evaluateYear", ts.SyntaxKind.FunctionDeclaration],
  ["scoreBuyerVehicle", ts.SyntaxKind.FunctionDeclaration],
]);

// Select actual declarations, never imports or database-writing functions.
// This is a dependency guard for this known source, not a general JS sandbox.
function isolateScorer(text) {
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
        assert.ok(["JSON", "Math"].includes(node.text), `unexpected dependency: ${node.text}`);
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
  return runInNewContext(`${compiled.outputText}\nscoreBuyerVehicle;`, Object.create(null), {
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

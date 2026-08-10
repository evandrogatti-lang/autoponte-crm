import assert from "node:assert/strict";
import test from "node:test";
import { evaluateOpportunity } from "../lib/ade";
import { buildMissionControl } from "../lib/mission-control/mapper";
import { parseOpportunityCommand } from "../lib/opportunities/domain";
import { buildMailtoUrl, buildWhatsAppUrl, cleanContactText, formatBrazilianPhone, normalizeBrazilianPhone, normalizeEmail } from "../lib/contact";
import type { TradeInRow } from "../lib/mission-control/model";
import { buildDesiredVehicleLabel, buildFipeModelGroups, desiredVehicleSearchScope } from "../lib/vehicles/desired-profile";

const NOW = new Date("2026-08-05T12:00:00.000Z");

function row(overrides: Partial<TradeInRow> = {}): TradeInRow {
  return {
    id: "op-1",
    name: "Cliente real",
    city: "São Bernardo do Campo",
    brand: "Toyota",
    model: "Corolla",
    year: "2021",
    desiredVehicle: "Jeep Compass",
    estimatedMin: 98000,
    estimatedMax: 108000,
    referencePrice: 116000,
    mileage: 52000,
    condition: "good",
    status: "qualified",
    leadCategory: "hot",
    nextFollowUp: "2026-08-05T15:00:00.000Z",
    lastContactAt: "2026-08-05T10:00:00.000Z",
    notes: "Cliente confirmou interesse",
    createdAt: new Date("2026-08-02T12:00:00.000Z"),
    ...overrides,
  };
}

test("Mission Control vazio não injeta dados demonstrativos", () => {
  const model = buildMissionControl([], NOW);
  assert.equal(model.opportunities.length, 0);
  assert.equal(model.activeCount, 0);
  assert.equal(model.activeValue, 0);
  assert.equal(model.tradeInCount, 0);
});

test("oportunidade perdida recebe 0% e não entra no pipeline ativo", () => {
  const signals = {
    id: "lost-1",
    status: "lost",
    stage: "closed" as const,
    leadCategory: "hot",
    estimatedMin: 98000,
    estimatedMax: 108000,
    referencePrice: 116000,
    createdAt: "2026-08-02T12:00:00.000Z",
    desiredVehicle: "Jeep Compass",
  };
  const assessment = evaluateOpportunity(signals, NOW);
  assert.equal(assessment.dna.chance, 0);
  assert.equal(assessment.dna.priorityScore, 0);

  const model = buildMissionControl([row({ status: "lost" })], NOW);
  assert.equal(model.activeCount, 0);
  assert.equal(model.conversion, 0);
  assert.equal(model.flow.stages.find((stage) => stage.key === "closed")?.count, 0);
});

test("somente negócio fechado recebe 100% e conta conversão", () => {
  const model = buildMissionControl([row({ status: "closed" })], NOW);
  assert.equal(model.opportunities[0].probability, 100);
  assert.equal(model.conversion, 100);
  assert.equal(model.flow.stages.find((stage) => stage.key === "closed")?.count, 1);
});

test("comandos operacionais são validados e normalizados", () => {
  assert.deepEqual(parseOpportunityCommand({ action: "stage", status: "proposal" }), { action: "stage", status: "proposal" });
  assert.deepEqual(parseOpportunityCommand({ action: "contact", channel: " WhatsApp ", summary: " Falou com cliente " }), { action: "contact", channel: "WhatsApp", summary: "Falou com cliente" });
  const next = parseOpportunityCommand({ action: "next_action", label: " Retornar ", dueAt: "2026-08-06T10:00:00.000Z" });
  assert.equal(next.action, "next_action");
  if (next.action === "next_action") assert.equal(next.label, "Retornar");
  assert.throws(() => parseOpportunityCommand({ action: "stage", status: "invalid" }), /Etapa inválida/);
});

test("margem e recomendações vêm de registros reais", () => {
  const model = buildMissionControl([row()], NOW);
  assert.equal(model.opportunities.length, 1);
  assert.equal(model.opportunities[0].name, "Cliente real");
  assert.equal(model.opportunities[0].marginPotential, 13000);
  assert.equal(model.recommendations[0].opportunityId, "op-1");
});


test("contatos nulos ou inválidos nunca geram links operacionais", () => {
  assert.equal(cleanContactText("NULL"), "");
  assert.equal(normalizeBrazilianPhone("(11) 99999-9999"), "5511999999999");
  assert.equal(formatBrazilianPhone("5511999999999"), "+55 (11) 99999-9999");
  assert.equal(buildWhatsAppUrl("NULL"), null);
  assert.equal(buildWhatsAppUrl("5511999999999"), "https://wa.me/5511999999999");
  assert.equal(normalizeEmail(" CLIENTE@EXAMPLE.COM "), "cliente@example.com");
  assert.equal(buildMailtoUrl("undefined"), null);
});

test("edição do cliente exige contato válido e normaliza os dados", () => {
  const command = parseOpportunityCommand({
    action: "edit_client",
    name: " Cliente Real ",
    whatsapp: "(11) 98888-7777",
    email: " CLIENTE@EXAMPLE.COM ",
    city: " São Bernardo do Campo ",
  });
  assert.equal(command.action, "edit_client");
  if (command.action === "edit_client") {
    assert.equal(command.whatsapp, "5511988887777");
    assert.equal(command.email, "cliente@example.com");
  }
  assert.throws(() => parseOpportunityCommand({
    action: "edit_client",
    name: "Cliente",
    whatsapp: "NULL",
    email: "",
    city: "SBC",
  }), /ao menos um canal/);
});

test("demanda estruturada aceita marca, modelo opcional e versão opcional", () => {
  const command = parseOpportunityCommand({
    action: "edit_demand",
    desiredVehicle: {
      brandCode: "21",
      brand: "Honda",
      modelKey: "hr-v",
      model: "HR-V",
      versionCode: "",
      version: "",
      yearMin: 2021,
      yearMax: 2024,
      priceMin: 120000,
      priceMax: 155000,
    },
  });
  assert.equal(command.action, "edit_demand");
  if (command.action === "edit_demand") {
    assert.equal(command.desiredVehicle.model, "HR-V");
    assert.equal(command.desiredVehicle.version, "");
  }
  assert.throws(() => parseOpportunityCommand({
    action: "edit_demand",
    desiredVehicle: {
      brandCode: "21",
      brand: "Honda",
      modelKey: "hr-v",
      model: "HR-V",
      versionCode: "",
      version: "",
      yearMin: 2025,
      yearMax: 2021,
      priceMin: 120000,
      priceMax: 155000,
    },
  }), /ano mínimo não pode ser maior/i);
});


test("catálogo FIPE separa modelo e versão sem texto livre", () => {
  const groups = buildFipeModelGroups([
    { codigo: "1", nome: "HR-V EX 1.8 Flexone 16V 5p Aut." },
    { codigo: "2", nome: "HR-V EXL 1.8 Flexone 16V 5p Aut." },
    { codigo: "3", nome: "HR-V Touring 1.5 TB 16V 5p Aut." },
    { codigo: "4", nome: "COROLLA CROSS XRE 2.0 16V Flex Aut." },
    { codigo: "5", nome: "COROLLA CROSS XRX 2.0 16V Flex Aut." },
  ]);
  assert.equal(groups.find((group) => group.label === "HR-V")?.versions.length, 3);
  assert.equal(groups.find((group) => group.label === "COROLLA CROSS")?.versions.length, 2);

  const demand = {
    brandCode: "21",
    brand: "Honda",
    modelKey: "hr-v",
    model: "HR-V",
    versionCode: "",
    version: "",
    yearMin: 2021,
    yearMax: 2024,
    priceMin: 120000,
    priceMax: 155000,
  };
  assert.equal(desiredVehicleSearchScope(demand), "model");
  assert.match(buildDesiredVehicleLabel(demand), /Honda HR-V/);
  assert.match(buildDesiredVehicleLabel(demand), /todas as versões/);
});

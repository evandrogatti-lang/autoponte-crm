import assert from "node:assert/strict";
import {
  buildDesiredVehicleLabel,
  buildFipeModelGroups,
  desiredVehicleSearchScope,
} from "../lib/vehicles/desired-profile.ts";

const groups = buildFipeModelGroups([
  { codigo: "1", nome: "HR-V EX 1.8 Flexone 16V 5p Aut." },
  { codigo: "2", nome: "HR-V EXL 1.8 Flexone 16V 5p Aut." },
  { codigo: "3", nome: "HR-V Touring 1.5 TB 16V 5p Aut." },
  { codigo: "4", nome: "COROLLA CROSS XRE 2.0 16V Flex Aut." },
  { codigo: "5", nome: "COROLLA CROSS XRX 2.0 16V Flex Aut." },
]);

assert.equal(groups.find((group) => group.label === "HR-V")?.versions.length, 3);
assert.equal(groups.find((group) => group.label === "COROLLA CROSS")?.versions.length, 2);

const modelDemand = {
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

assert.equal(desiredVehicleSearchScope(modelDemand), "model");
assert.match(buildDesiredVehicleLabel(modelDemand), /Honda HR-V/);
assert.match(buildDesiredVehicleLabel(modelDemand), /todas as versões/);
assert.match(buildDesiredVehicleLabel(modelDemand), /2021–2024/);

const versionDemand = { ...modelDemand, versionCode: "3", version: "HR-V Touring 1.5 TB 16V 5p Aut." };
assert.equal(desiredVehicleSearchScope(versionDemand), "version");
assert.match(buildDesiredVehicleLabel(versionDemand), /Honda HR-V Touring/);
assert.doesNotMatch(buildDesiredVehicleLabel(versionDemand), /todas as versões/);

const brandDemand = { ...modelDemand, modelKey: "", model: "", priceMin: 0 };
assert.equal(desiredVehicleSearchScope(brandDemand), "brand");
assert.match(buildDesiredVehicleLabel(brandDemand), /todos os modelos/);
assert.match(buildDesiredVehicleLabel(brandDemand), /até R\$/);

console.log("Vehicle Demand FIPE Layer: 10 validações aprovadas.");

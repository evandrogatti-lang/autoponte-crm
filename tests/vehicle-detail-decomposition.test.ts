import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("detalhe veicular delega painéis de resumo e readiness", () => {
  const page = readFileSync("app/veiculos/[id]/page.tsx", "utf8");
  const panels = readFileSync("features/vehicle-registry/components/VehicleDetailPanels.tsx", "utf8");
  assert.match(page, /<VehicleHeroSummary/);
  assert.match(page, /<VehicleOperationalPanel/);
  assert.match(panels, /ATIVIDADE OPERACIONAL ATUAL/);
  assert.match(panels, /Próxima ação operacional/);
});

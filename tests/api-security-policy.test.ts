import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const authenticatedRoutes = [
  "app/api/atendimento/route.ts",
  "app/api/cases/route.ts",
  "app/api/cases/[id]/route.ts",
  "app/api/configuracoes/usuarios/route.ts",
  "app/api/locations/cities/route.ts",
  "app/api/opportunities/route.ts",
  "app/api/opportunities/[id]/route.ts",
  "app/api/opportunities/photo/route.ts",
  "app/api/partners/route.ts",
  "app/api/seller-profiles/route.ts",
  "app/api/vehicles/route.ts",
  "app/api/vehicles/[id]/evidence/route.ts",
  "app/api/vehicles/[id]/lifecycle/route.ts",
];

const permissionedMutations = [
  "app/api/atendimento/route.ts",
  "app/api/cases/[id]/route.ts",
  "app/api/configuracoes/usuarios/route.ts",
  "app/api/opportunities/route.ts",
  "app/api/opportunities/[id]/route.ts",
  "app/api/partners/route.ts",
  "app/api/seller-profiles/route.ts",
  "app/api/vehicles/route.ts",
  "app/api/vehicles/[id]/evidence/route.ts",
  "app/api/vehicles/[id]/lifecycle/route.ts",
];

test("rotas internas declaram autenticação", () => {
  for (const route of authenticatedRoutes) {
    const source = readFileSync(route, "utf8");
    assert.match(source, /authorizeApi|requirePermission|requireSystemAdmin|getChatGPTUser/, route);
  }
});

test("mutações internas declaram autorização", () => {
  for (const route of permissionedMutations) {
    const source = readFileSync(route, "utf8");
    assert.match(source, /authorizeApi\(\[|requirePermission|requireSystemAdmin/, route);
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import { matchesClientNamePrefix, normalizeClientName } from "../lib/clients/search.ts";
import { resolveOpportunityView } from "../lib/opportunities/view-preference.ts";

test("busca de clientes normaliza acentos e usa prefixo nominal", () => {
  assert.equal(normalizeClientName(" João "), "joao");
  assert.equal(matchesClientNamePrefix("Ana Rodrigues", "ana"), true);
  assert.equal(matchesClientNamePrefix("João Silva", "joao"), true);
  assert.equal(matchesClientNamePrefix("Juliana Ribeiro", "ana"), false);
});

test("preferência de visualização migra valores legados e usa detalhes como fallback", () => {
  assert.equal(resolveOpportunityView("compact"), "details");
  assert.equal(resolveOpportunityView("table"), "list");
  assert.equal(resolveOpportunityView("cards"), "cards");
  assert.equal(resolveOpportunityView("invalid"), "details");
  assert.equal(resolveOpportunityView(null), "details");
});

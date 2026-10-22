import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as React from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

function compile(file, dependencies) {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: name => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  } });
  return exports;
}

function createPresentation(activeTab) {
  return compile("features/opportunity-workspace/components/OpportunityWorkspace.tsx", {
  "react/jsx-runtime": jsx,
  react: activeTab === undefined ? React : { ...React, useState: () => [activeTab, () => {}] },
  "next/image": { default: () => null },
  "next/link": { default: props => React.createElement("a", props) },
  "next/navigation": { useRouter: () => ({ refresh() {} }) },
  "../../../lib/opportunities": {},
  "../../../lib/contact": {},
  "./OpportunityWorkspace.module.css": { default: {} },
  "../../vehicle-demand": {},
  "../../contact": {},
  "../../../lib/vehicles/desired-profile": {},
  });
}
const presentation = createPresentation();

const sections = Object.fromEntries([
  "events", "notes", "communications", "tasks", "nextAction", "documentRequests", "approvals", "objections", "checkout",
].map(key => [key, { state: "UNRESOLVED", reason: "CANONICAL_PERSISTENCE_NOT_ESTABLISHED" }]));

function workspace() {
  return { negotiation: {
    id: "canonical-negotiation", tenantId: "tenant-A", customerId: "customer-A",
    leadId: null, buyerProfileId: null, matchId: null, tenantVehicleId: null,
    responsibleMembershipId: "seller-membership", createdByMembershipId: "creator-membership",
    origin: "manual", stage: "contact", lifecycle: "active", closureReason: null,
    createdAt: new Date("2026-10-01T12:00:00Z"), updatedAt: new Date("2026-10-02T12:00:00Z"),
    closedAt: null, formalizedAt: null,
  }, sections };
}

class TenantAccessError extends Error {}
function route({ result = workspace(), error, unauthenticated = false } = {}) {
  const reads = [], auth = [];
  const pageModule = compile("app/negociacoes/[negotiationId]/page.tsx", {
    "react/jsx-runtime": jsx,
    "next/navigation": { notFound: () => { throw new Error("NOT_FOUND"); } },
    "../../app-auth": { requireCurrentAppUser: async returnTo => {
      auth.push(returnTo);
      if (unauthenticated) throw new Error("LOGIN_REDIRECT");
    } },
    "../../../features/opportunity-workspace": presentation,
    "../../../lib/negotiation/service": { readNegotiationWorkspace: async (...args) => {
      reads.push(args);
      if (error) throw error;
      return result;
    } },
    "../../../lib/tenant-context": { TenantAccessError },
  });
  return { page: id => pageModule.default({ params: Promise.resolve({ negotiationId: id }) }), reads, auth };
}

test("explicit canonical route ID reaches the server read boundary and Workspace unchanged", async () => {
  const data = workspace();
  const r = route({ result: data });
  const element = await r.page(data.negotiation.id);
  assert.equal(r.reads.length, 1);
  assert.deepEqual(Array.from(r.reads[0]), [data.negotiation.id]);
  assert.equal(r.auth[0], "/negociacoes/canonical-negotiation");
  assert.equal(element.props.canonicalData, data);
  assert.equal("initialData" in element.props, false);
  const html = renderToStaticMarkup(element);
  assert.match(html, /canonical-negotiation/);
  assert.match(html, /seller-membership/);
  assert.match(html, /contact/);
  assert.match(html, /active/);
  assert.equal((html.match(/data-state="UNRESOLVED"/g) ?? []).length, 9);
  assert.doesNotMatch(html, /<input|<textarea|<select|Salvar|legacy notes|legacy action/);
});

test("canonical view excludes accidental legacy commercial values and keeps nullable references", () => {
  const data = workspace();
  Object.assign(data.negotiation, { notes: "legacy notes", status: "won", nextAction: "legacy action" });
  const html = renderToStaticMarkup(React.createElement(presentation.OpportunityWorkspace, { canonicalData: data }));
  assert.doesNotMatch(html, /legacy notes|legacy action|>won</);
  assert.match(html, /Não vinculado/);
  assert.match(html, /Informação ainda não disponível/);
  assert.equal(data.negotiation.matchId, null);
  assert.equal(data.negotiation.tenantVehicleId, null);
});

test("missing and foreign roots and denied tenant context share not-found presentation", async () => {
  for (const options of [{ result: null }, { error: new TenantAccessError("Denied") }]) {
    const r = route(options);
    await assert.rejects(r.page("opaque-id"), /NOT_FOUND/);
    assert.equal(r.reads.length, 1);
  }
});

test("canonical linked references and lifecycle dates render without resolving legacy records", async () => {
  const data = workspace();
  Object.assign(data.negotiation, {
    id: "canonical-id-with-<markup>-and-a-long-reference",
    matchId: "explicit-match", leadId: "explicit-lead", buyerProfileId: "explicit-profile",
    tenantVehicleId: "explicit-vehicle", lifecycle: "closed", closureReason: "lost",
    closedAt: new Date("2026-10-03T12:00:00Z"),
  });
  const r = route({ result: data });
  const html = renderToStaticMarkup(await r.page(data.negotiation.id));
  assert.deepEqual(Array.from(r.reads[0]), [data.negotiation.id]);
  assert.equal(r.auth[0], `/negociacoes/${encodeURIComponent(data.negotiation.id)}`);
  assert.match(html, /explicit-match/);
  assert.match(html, /2026-10-03T12:00:00.000Z/);
  assert.match(html, /closed/);
  assert.match(html, /lost/);
  assert.match(html, /&lt;markup&gt;/);
  assert.doesNotMatch(html, /<markup>/);
  assert.equal((html.match(/data-state="UNRESOLVED"/g) ?? []).length, 9);
  for (const [tab, expected] of [
    ["Cliente", /customer-A.*explicit-profile/], ["Demanda", /explicit-lead/],
    ["Veículo", /explicit-vehicle/], ["Troca", /Informação ainda não disponível/],
    ["Financeiro", /Checkout/], ["Arquivos", /Solicitações de documentos/],
  ]) {
    const view = createPresentation(tab);
    const tabHtml = renderToStaticMarkup(React.createElement(view.OpportunityWorkspace, { canonicalData: data }));
    assert.match(tabHtml, expected, tab);
    assert.doesNotMatch(tabHtml, /<input|<textarea|<select|Salvar|api\/opportunities/);
  }
});

test("invalid or missing ID and unauthenticated requests do not reach canonical data", async () => {
  for (const id of [undefined, null, "", " ", 1]) {
    const r = route();
    await assert.rejects(r.page(id), /NOT_FOUND/);
    assert.equal(r.reads.length, 0);
  }
  const r = route({ unauthenticated: true });
  await assert.rejects(r.page("canonical-negotiation"), /LOGIN_REDIRECT/);
  assert.equal(r.reads.length, 0);
});

test("unexpected infrastructure errors remain errors rather than fake not-found data", async () => {
  const error = new Error("Database unavailable");
  await assert.rejects(route({ error }).page("canonical-negotiation"), value => value === error);
});

test("legacy route and paused disclosure work remain isolated from canonical routing", () => {
  const legacyPage = readFileSync(new URL("../app/oportunidades/[id]/page.tsx", import.meta.url), "utf8");
  const component = readFileSync(new URL("../features/opportunity-workspace/components/OpportunityWorkspace.tsx", import.meta.url), "utf8");
  assert.match(legacyPage, /getOpportunityWorkspace\(id\)/);
  assert.match(legacyPage, /initialData=\{opportunity\}/);
  for (const disclosure of ["Ver explicação", "Editar dados do cliente", "Editar demanda"]) assert.ok(component.includes(disclosure));
  assert.ok(component.includes('mutate("edit_client"'));
  assert.ok(component.includes('mutate("edit_demand"'));
});

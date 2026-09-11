import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  commercialLabels,
  commercialRoutes,
  leadQualificationHref,
  negotiationHref,
  withSearchParams,
} from "../lib/commercial-navigation.ts";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("commercial names and destinations have one canonical definition", () => {
  assert.deepEqual(commercialLabels, {
    lead: "Lead",
    qualification: "Qualificação",
    match: "Match",
    negotiation: "Negociação",
    sale: "Venda",
  });
  assert.equal(commercialRoutes.newLead, "/leads/novo");
  assert.equal(commercialRoutes.match, "/matches");
  assert.equal(commercialRoutes.negotiations, "/negociacoes");
  assert.equal(commercialRoutes.funnel, "/funil");
  assert.equal(leadQualificationHref("lead 1"), "/leads/lead%201");
  assert.equal(negotiationHref("case/1"), "/negociacoes/case%2F1");
  assert.equal(withSearchParams("/matches", { stage: "qualified", tag: ["a b", "c"] }), "/matches?stage=qualified&tag=a+b&tag=c");
});

test("legacy commercial routes are compatibility redirects only", () => {
  assert.match(read("app/oportunidades/page.tsx"), /redirect\(withSearchParams\(commercialRoutes\.match, await searchParams\)\)/);
  assert.match(read("app/oportunidades/nova/page.tsx"), /redirect\(withSearchParams\(commercialRoutes\.newLead, await searchParams\)\)/);
  assert.match(read("app/oportunidades/[id]/page.tsx"), /redirect\(withSearchParams\(leadQualificationHref\(id\), await searchParams\)\)/);
  assert.match(read("app/casos/page.tsx"), /redirect\(withSearchParams\(commercialRoutes\.negotiations, await searchParams\)\)/);
  assert.match(read("app/casos/[id]/page.tsx"), /redirect\(withSearchParams\(negotiationHref\(id\), await searchParams\)\)/);
});

test("legacy Opportunity APIs keep their JSON, status, and authentication contracts", () => {
  const collection = read("app/api/opportunities/route.ts");
  const item = read("app/api/opportunities/[id]/route.ts");
  assert.match(collection, /getChatGPTUser\(\)/);
  assert.match(collection, /status:\s*401/);
  assert.match(collection, /Response\.json\(\{ id: result\.id, href: `\/oportunidades\/\$\{result\.id\}` \}, \{ status: 201 \}\)/);
  assert.match(item, /export async function GET/);
  assert.match(item, /export async function PATCH/);
  assert.match(item, /getChatGPTUser\(\)/);
  assert.match(item, /status:\s*401/);
  assert.match(item, /status:\s*404/);
  assert.doesNotMatch(`${collection}\n${item}`, /redirect\(/);
});

test("dynamic legacy IDs resolve the same persisted entities", () => {
  const opportunityService = read("lib/opportunities/service.ts");
  const oldOpportunity = read("app/oportunidades/[id]/page.tsx");
  const newLead = read("app/leads/[id]/page.tsx");
  assert.match(opportunityService, /from\(tradeIns\)\.where\(eq\(tradeIns\.id, id\)\)/);
  assert.match(oldOpportunity, /leadQualificationHref\(id\)/);
  assert.match(newLead, /getOpportunityWorkspace\(id\)/);

  const caseSchema = read("db/pilot-schema.ts");
  const caseService = read("lib/commercial-cases/service.ts");
  const oldCase = read("app/casos/[id]/page.tsx");
  const negotiation = read("app/negociacoes/[id]/page.tsx");
  assert.match(caseSchema, /commercialCases = pgTable\("commercial_cases", \{ id:text\("id"\)\.primaryKey\(\)/);
  assert.match(caseService, /eq\(commercialCases\.id,caseId\),eq\(commercialCases\.pilotCode,caseId\)/);
  assert.match(oldCase, /negotiationHref\(id\)/);
  assert.match(negotiation, /getCommercialCase\(id\)/);
});

test("canonical lead routes reuse the existing persisted workflow", () => {
  const create = read("app/leads/novo/page.tsx");
  const qualification = read("app/leads/[id]/page.tsx");
  const form = read("features/opportunity-create/components/OpportunityCreateForm.tsx");
  const api = read("app/api/opportunities/route.ts");
  assert.match(create, /requireSellerOperations\(commercialRoutes\.newLead\)/);
  assert.match(create, /<OpportunityCreateForm\s*\/>/);
  assert.match(form, /fetch\("\/api\/opportunities", \{/);
  assert.match(form, /method: "POST"/);
  assert.match(form, /if \(!response\.ok \|\| !result\.id\) throw new Error/);
  assert.match(form, /router\.push\(leadQualificationHref\(result\.id\)\)/);
  assert.match(api, /parseManualOpportunityInput\(await request\.json\(\)\)/);
  assert.match(api, /createManualOpportunity\(input,/);
  assert.match(api, /status: 400/);
  assert.match(api, /status: 500/);
  assert.match(qualification, /getOpportunityWorkspace\(id\)/);
  assert.match(qualification, /<OpportunityWorkspace/);
});

test("Funnel, Match, and Negotiation keep distinct destinations", () => {
  const funnel = read("app/funil/page.tsx");
  const matches = read("app/matches/page.tsx");
  assert.match(funnel, /commercialRoutes\.match/);
  assert.match(funnel, /negotiationHref\(item\.id\)/);
  assert.match(funnel, /commercialRoutes\.qualification/);
  assert.match(matches, /commercialRoutes\.matchIntake/);
});

test("trade evaluation and Match CTAs point to real persisted flows", () => {
  const home = read("app/page.tsx");
  const tradeApi = read("app/api/trade-in/route.ts");
  const matchIntake = read("app/atendimento/page.tsx");
  const matchApi = read("app/api/buyer-profiles/route.ts");
  const matchList = read("app/matches/page.tsx");
  assert.match(home, /<section className="trade-section" id="troca">/);
  assert.match(home, /onSubmit=\{submitTradeIn\}/);
  assert.match(home, /fetch\("\/api\/trade-in"/);
  assert.match(tradeApi, /export async function POST/);
  assert.match(matchList, /href=\{commercialRoutes\.matchIntake\}/);
  assert.match(matchIntake, /fetch\("\/api\/buyer-profiles"/);
  assert.match(matchApi, /insert\(buyerProfiles\)/);
  assert.match(matchApi, /createMatchesForBuyer\(profile\)/);
  assert.match(matchApi, /status:\s*201/);
});

test("new canonical destinations retain authentication and authorization", () => {
  assert.match(read("app/leads/novo/page.tsx"), /requireSellerOperations\(commercialRoutes\.newLead\)/);
  assert.match(read("app/leads/[id]/page.tsx"), /requireSellerOperations\(leadQualificationHref\(id\)\)/);
  assert.match(read("app/negociacoes/page.tsx"), /requirePermission\(user,\s*"seller_operations\.manage"\)/);
  assert.match(read("app/negociacoes/[id]/page.tsx"), /requirePermission\(user,\s*"seller_operations\.manage"\)/);
});

test("altered navigation surfaces do not expose legacy Opportunities or Cases destinations", () => {
  const surfaces = [
    "app/apdl/page.tsx",
    "app/clientes/page.tsx",
    "app/funil/page.tsx",
    "app/leads/page.tsx",
    "app/matches/page.tsx",
    "app/propostas/page.tsx",
    "app/recomendacoes/page.tsx",
    "app/relatorios/page.tsx",
    "app/trocas/page.tsx",
    "components/crm/OpportunityViewToggle.tsx",
    "components/mission-control/PipelineLive.tsx",
    "components/mission-control/QuickActions.tsx",
    "components/mission-control/Shell.tsx",
    "features/mission-control/components/FlowEngineV2.tsx",
    "features/mission-control/components/MissionControl.tsx",
  ];
  const source = surfaces.map(read).join("\n");
  assert.doesNotMatch(source, /["'`]\/oportunidades(?:\/|["'`])/);
  assert.doesNotMatch(source, /["'`]\/casos(?:\/|["'`])/);
  assert.doesNotMatch(source, />\s*(?:Oportunidades|Cases)\s*</i);
});

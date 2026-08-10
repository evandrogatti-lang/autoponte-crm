import { existsSync, readFileSync } from "node:fs";
import ts from "typescript";

const files = [
  "lib/contact.ts",
  "lib/vehicles/desired-profile.ts",
  "lib/vehicles/fipe-validation.ts",
  "lib/opportunities/create.ts",
  "app/api/opportunities/route.ts",
  "features/opportunity-create/components/OpportunityCreateForm.tsx",
  "features/vehicle-demand/components/DesiredVehicleSelector.tsx",
  "features/opportunity-create/index.ts",
  "app/oportunidades/nova/page.tsx",
  "app/clientes/page.tsx",
  "app/matches/page.tsx",
  "app/oportunidades/page.tsx",
  "features/mission-control/components/MissionControl.tsx",
  "features/opportunity-workspace/components/OpportunityWorkspace.tsx",
];

function check(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`✓ ${message}`);
}

for (const file of files) {
  check(existsSync(file), `${file} existe`);
  const result = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      strict: true,
      isolatedModules: true,
    },
    fileName: file,
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  check(errors.length === 0, `${file} transpila sem erro de sintaxe`);
}

const mission = readFileSync("features/mission-control/components/MissionControl.tsx", "utf8");
const opportunities = readFileSync("app/oportunidades/page.tsx", "utf8");
const form = readFileSync("features/opportunity-create/components/OpportunityCreateForm.tsx", "utf8");
const api = readFileSync("app/api/opportunities/route.ts", "utf8");
const clients = readFileSync("app/clientes/page.tsx", "utf8");
const workspace = readFileSync("features/opportunity-workspace/components/OpportunityWorkspace.tsx", "utf8");
const contact = readFileSync("lib/contact.ts", "utf8");
const matches = readFileSync("app/matches/page.tsx", "utf8");

check(mission.includes('["Clientes", "/clientes"'), "menu Clientes aponta para /clientes");
check(!mission.includes('/crm#clientes'), "âncora inativa de Clientes foi removida");
check(mission.includes('href="/oportunidades/nova"'), "botão Nova oportunidade abre o cadastro");
check(opportunities.includes('/oportunidades/nova'), "lista vazia oferece cadastro real");
check(form.includes('fetch("/api/opportunities"'), "formulário persiste pela API");
check(form.includes('consentConfirmed'), "cadastro exige confirmação de consentimento");
check(form.includes('DesiredVehicleSelector'), "cadastro usa seleção estruturada de veículo desejado");
check(api.includes('createManualOpportunity'), "API usa o serviço persistente de criação");
check(clients.includes('buyerProfiles') && clients.includes('tradeIns'), "Clientes consolida perfis e oportunidades reais");
check(contact.includes('buildWhatsAppUrl') && contact.includes('normalizeBrazilianPhone'), "links de contato usam normalização central");
check(workspace.includes('WhatsApp não informado') && workspace.includes('action: "edit_client"'), "workspace bloqueia contato inválido e permite correção");
check(workspace.includes('action: "edit_demand"') && workspace.includes('DesiredVehicleSelector'), "workspace corrige demanda sem texto livre");
check(workspace.includes('!contactSummary.trim()'), "registro de contato exige resumo operacional");
check(matches.includes('WhatsApp válido não informado'), "Match não abre WhatsApp sem número válido");

console.log("\nOperational UI smoke test aprovado.");

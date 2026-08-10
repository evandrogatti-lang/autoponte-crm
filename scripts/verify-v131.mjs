import { readFileSync, existsSync } from "node:fs";

const required = [
  "features/vehicle-trade/components/TradeInFipeSelector.tsx",
  "lib/vehicles/trade-in-fipe-validation.ts",
  "features/opportunity-create/components/OpportunityCreateForm.tsx",
  "features/opportunity-workspace/components/OpportunityWorkspace.tsx",
];
for (const file of required) {
  if (!existsSync(file)) throw new Error(`Arquivo ausente: ${file}`);
}
const create = readFileSync("features/opportunity-create/components/OpportunityCreateForm.tsx", "utf8");
const workspace = readFileSync("features/opportunity-workspace/components/OpportunityWorkspace.tsx", "utf8");
const css = readFileSync("features/opportunity-workspace/components/OpportunityWorkspace.module.css", "utf8");
const validation = readFileSync("lib/vehicles/trade-in-fipe-validation.ts", "utf8");
if (!create.includes("TradeInFipeSelector")) throw new Error("FIPE da troca não conectada ao cadastro.");
if (!validation.includes("resolveTradeInFipe")) throw new Error("Validação server-side da FIPE da troca ausente.");
if (!workspace.includes("buildGmailComposeUrl")) throw new Error("Ação de e-mail web não instalada.");
if (!workspace.includes("whatsappAction")) throw new Error("Ação visual do WhatsApp não instalada.");
if (!css.includes("compact operational workspace")) throw new Error("Layout compacto não instalado.");
console.log("V1.3.1 structure verified.");

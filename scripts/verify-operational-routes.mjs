import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [
  ["app/oportunidades/page.tsx", ["/oportunidades/${item.id}", "/oportunidades/nova"]],
  ["app/oportunidades/nova/page.tsx", ["OpportunityCreateForm"]],
  ["app/oportunidades/[id]/page.tsx", ["getOpportunityWorkspace", "OpportunityWorkspace"]],
  ["app/api/opportunities/route.ts", ["export async function POST", "href: `/oportunidades/${result.id}`"]],
  ["app/api/opportunities/[id]/route.ts", ["export async function GET", "export async function PATCH"]],
  ["features/opportunity-workspace/components/OpportunityWorkspace.tsx", ["buildWhatsAppUrl", "/api/opportunities/${encodeURIComponent(data.id)}"]],
  ["features/mission-control/components/MissionControl.tsx", ["href=\"/oportunidades/nova\"", "href={`/oportunidades/${item.id}`}"]],
];

let failed = false;
for (const [relative, markers] of checks) {
  const absolute = path.join(root, ...relative.split("/"));
  if (!fs.existsSync(absolute)) {
    console.error(`FALTA: ${relative}`);
    failed = true;
    continue;
  }
  const source = fs.readFileSync(absolute, "utf8");
  for (const marker of markers) {
    if (!source.includes(marker)) {
      console.error(`MARCADOR AUSENTE em ${relative}: ${marker}`);
      failed = true;
    }
  }
  if (!failed) console.log(`OK: ${relative}`);
}

if (failed) process.exit(1);
console.log("ROTAS OPERACIONAIS PRESENTES E LIGADAS.");

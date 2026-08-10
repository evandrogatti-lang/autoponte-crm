import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "app/clientes/page.tsx",
  "app/globals.css",
  "features/opportunity-workspace/components/OpportunityWorkspace.tsx",
  "features/opportunity-workspace/components/OpportunityWorkspace.module.css",
];
for (const file of required) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) throw new Error(`Arquivo ausente: ${file}`);
}
const clients = fs.readFileSync(path.join(root, "app/clientes/page.tsx"), "utf8");
const workspace = fs.readFileSync(path.join(root, "features/opportunity-workspace/components/OpportunityWorkspace.tsx"), "utf8");
const globalCss = fs.readFileSync(path.join(root, "app/globals.css"), "utf8");
const workspaceCss = fs.readFileSync(path.join(root, "features/opportunity-workspace/components/OpportunityWorkspace.module.css"), "utf8");
const checks = [
  [clients.includes("client-dense-shell"), "layout compacto de Clientes"],
  [clients.includes("RECOMENDAÇÃO EXPLICADA"), "recomendação explicada em Clientes"],
  [clients.includes("Por que agora:"), "contexto obrigatório em Clientes"],
  [workspace.includes("recommendationContext"), "contexto de recomendação no Workspace"],
  [workspace.includes("IMPACTO ESPERADO"), "impacto esperado no Workspace"],
  [workspace.includes("EVIDÊNCIAS"), "evidências no Workspace"],
  [globalCss.includes("V1.4 — compact client workspace"), "CSS compacto de Clientes"],
  [workspaceCss.includes("V1.4 — explained recommendations"), "CSS de recomendações explicadas"],
];
for (const [ok, label] of checks) if (!ok) throw new Error(`Verificação falhou: ${label}`);
console.log(`UI V1.4 verificada: ${checks.length} critérios aprovados.`);

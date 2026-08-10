import fs from "node:fs";
const required = [
  "app/trocas/page.tsx","app/propostas/page.tsx","app/financeiro/page.tsx","app/relatorios/page.tsx","app/configuracoes/page.tsx","components/crm/CoreShell.tsx","components/crm/CoreShell.module.css","components/mission-control/Shell.tsx"
];
let ok = true;
for (const p of required) { if (!fs.existsSync(p)) { console.error("MISSING", p); ok = false; } }
const shell = fs.readFileSync("components/mission-control/Shell.tsx", "utf8");
for (const href of ["/clientes","/veiculos","/trocas","/propostas","/parceiros","/financeiro","/relatorios","/configuracoes"]) {
  if (!shell.includes(`href: "${href}"`)) { console.error("NAV MISSING", href); ok = false; }
}
if (!ok) process.exit(1);
console.log("Core Stabilization V1: arquivos e navegacao verificados.");

import fs from "node:fs";
const required = [
  "app/veiculos/page.tsx",
  "app/veiculos/novo/page.tsx",
  "app/veiculos/[id]/page.tsx",
  "features/vehicle-registry/components/InventoryShell.tsx",
  "features/vehicle-registry/components/VehicleRegistry.module.css",
];
for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`Arquivo ausente: ${file}`);
}
const page = fs.readFileSync("app/veiculos/page.tsx", "utf8");
for (const token of ["Estoque de Veículos", "Voltar ao CRM", "Cadastrar parceiro", "Cadastrar veículo", "InventoryShell"]) {
  if (!page.includes(token)) throw new Error(`Validação falhou: ${token}`);
}
console.log("Inventory CRM Layout V1.8: arquivos e navegação validados.");

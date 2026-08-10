import fs from "node:fs";
const required = [
  "app/veiculos/page.tsx",
  "app/veiculos/novo/page.tsx",
  "app/veiculos/[id]/page.tsx",
  "app/api/vehicles/route.ts",
  "features/vehicle-registry/components/VehicleCreateForm.tsx",
  "db/vehicle-schema.ts",
];
for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`Arquivo ausente: ${file}`);
}
const form = fs.readFileSync("features/vehicle-registry/components/VehicleCreateForm.tsx", "utf8");
for (const marker of ["VehicleFipeSelector", "sourceType", "askingPrice", "Cadastrar veículo"]) {
  if (!form.includes(marker)) throw new Error(`Marcador ausente no formulário: ${marker}`);
}
console.log("Vehicle Registry V1.5 verificado.");

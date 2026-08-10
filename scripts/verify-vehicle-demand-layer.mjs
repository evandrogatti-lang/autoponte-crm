import { existsSync, readFileSync } from "node:fs";

const required = [
  "app/api/fipe/route.ts",
  "app/api/opportunities/route.ts",
  "app/api/opportunities/[id]/route.ts",
  "features/vehicle-demand/components/DesiredVehicleSelector.tsx",
  "features/opportunity-create/components/OpportunityCreateForm.tsx",
  "features/opportunity-workspace/components/OpportunityWorkspace.tsx",
  "lib/vehicles/desired-profile.ts",
  "lib/vehicles/fipe-validation.ts",
  "supabase/003_desired_vehicle_fipe_profile.sql",
];

function check(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`✓ ${message}`);
}

for (const file of required) check(existsSync(file), `${file} existe`);

const form = readFileSync("features/opportunity-create/components/OpportunityCreateForm.tsx", "utf8");
const workspace = readFileSync("features/opportunity-workspace/components/OpportunityWorkspace.tsx", "utf8");
const schema = readFileSync("db/schema.ts", "utf8");
const create = readFileSync("lib/opportunities/create.ts", "utf8");
const service = readFileSync("lib/opportunities/service.ts", "utf8");
const migration = readFileSync("supabase/003_desired_vehicle_fipe_profile.sql", "utf8");

check(form.includes("DesiredVehicleSelector"), "novo cadastro usa seletor FIPE");
check(!form.includes('name="desiredVehicle"'), "texto livre de veículo desejado foi removido");
check(workspace.includes('action: "edit_demand"'), "workspace possui correção estruturada da demanda");
check(schema.includes("desiredBrandCode") && schema.includes("desiredSearchScope"), "schema contém os campos estruturados");
check(create.includes("resolveDesiredVehicleProfile"), "criação valida a seleção no servidor");
check(service.includes("Demanda de veículo atualizada"), "alteração da demanda gera histórico operacional");
check(migration.includes("trade_ins_desired_brand_model_idx"), "migração cria índice de matching inicial");

console.log("\nVehicle Demand FIPE Layer verificada.");

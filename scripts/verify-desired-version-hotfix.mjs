import fs from "node:fs";
import path from "node:path";

const file = path.resolve("features/vehicle-demand/components/DesiredVehicleSelector.tsx");
if (!fs.existsSync(file)) throw new Error(`Arquivo não encontrado: ${file}`);
const source = fs.readFileSync(file, "utf8");
const required = [
  "codigo: String(option.codigo)",
  "const selectedCode = String(event.target.value)",
  "String(version.codigo) === selectedCode",
  "versionCode: option ? String(option.codigo) : \"\"",
];
for (const token of required) {
  if (!source.includes(token)) throw new Error(`Verificação falhou: ${token}`);
}
console.log("OK: seleção e persistência da versão FIPE normalizadas como string.");

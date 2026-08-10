import fs from "node:fs";
const checks = [
  ["lib/contact.ts", "normalizeInternationalPhone"],
  ["features/contact/components/InternationalPhoneField.tsx", "Código DDI"],
  ["features/opportunity-create/components/OpportunityCreateForm.tsx", "phoneDdi"],
  ["features/opportunity-workspace/components/OpportunityWorkspace.tsx", "clientPhoneDdi"],
  ["lib/opportunities/create.ts", "normalizeInternationalPhone"],
  ["lib/opportunities/domain.ts", "normalizeInternationalPhone"],
];
for (const [file, token] of checks) {
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes(token)) throw new Error(`${file}: token ausente ${token}`);
}
console.log("International phone layer: OK");

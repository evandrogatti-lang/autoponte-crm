import fs from 'node:fs';
const form = fs.readFileSync('features/opportunity-create/components/OpportunityCreateForm.tsx','utf8');
const css = fs.readFileSync('features/opportunity-create/components/OpportunityCreateForm.module.css','utf8');
const demand = fs.readFileSync('features/vehicle-demand/components/DesiredVehicleSelector.module.css','utf8');
const checks = [
  [form.includes('styles.clientGrid'), 'grade compacta do cliente ausente'],
  [form.includes('styles.commercialGrid'), 'grade comercial compacta ausente'],
  [css.includes('grid-template-columns'), 'CSS de grade compacta ausente'],
  [demand.includes('minmax(150px,.8fr)'), 'grade FIPE proporcional ausente'],
];
for (const [ok,msg] of checks) if (!ok) throw new Error(msg);
console.log('Compact Form V1.4.1 validado.');

const actions = [
  ["Nova oportunidade", "/oportunidades"],
  ["Avaliar troca", "/atendimento"],
  ["Buscar match", "/matches"],
  ["Abrir consignação", "/consignacao"],
  ["Ver catálogo APDL", "/apdl"],
];

export function QuickActions() {
  return <nav className="mc-quick-actions" aria-label="Ações rápidas">
    <span>AÇÕES RÁPIDAS</span>
    {actions.map(([label,href])=><a key={label} href={href}>{label}<b>→</b></a>)}
  </nav>;
}

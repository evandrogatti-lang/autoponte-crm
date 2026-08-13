import Link from "next/link";

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
    {actions.map(([label,href])=><Link key={label} href={href}>{label}<b>→</b></Link>)}
  </nav>;
}

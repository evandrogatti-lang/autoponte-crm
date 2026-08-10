import type { ReactNode } from "react";
import { CommandPalette, EnterpriseSidebar } from "../apdl";

const navigation = [
  { label: "Mission Control", href: "/crm", active: true },
  { label: "Clientes", href: "/clientes" },
  { label: "Oportunidades", href: "/oportunidades" },
  { label: "Estoque", href: "/veiculos" },
  { label: "Trocas", href: "/trocas" },
  { label: "Propostas", href: "/propostas" },
  { label: "Parceiros", href: "/parceiros" },
  { label: "Financeiro", href: "/financeiro" },
  { label: "Relatórios", href: "/relatorios" },
  { label: "Configurações", href: "/configuracoes" },
  { label: "Correspondências IA", href: "/matches" },
  { label: "Catálogo APDL", href: "/apdl" },
];

export function MissionControlShell({ children }: { children: ReactNode }) {
  return <main className="mc-shell">
    <EnterpriseSidebar items={navigation}/>
    <section className="mc-stage">
      <header className="mc-topbar">
        <CommandPalette/>
        <div className="mc-topbar-actions">
          <a className="ap-button ap-button--secondary" href="/matches">Correspondências IA</a>
          <a className="ap-button ap-button--primary" href="/oportunidades/nova">Nova oportunidade</a>
        </div>
      </header>
      <div className="mc-content">{children}</div>
    </section>
  </main>;
}





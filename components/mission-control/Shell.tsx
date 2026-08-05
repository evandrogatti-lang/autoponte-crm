import type { ReactNode } from "react";
import { CommandPalette, EnterpriseSidebar } from "../apdl";

const navigation = [
  { label: "Mission Control", href: "/crm", active: true },
  { label: "Oportunidades", href: "/oportunidades" },
  { label: "Clientes", href: "/crm#clientes" },
  { label: "Estoque", href: "/crm#estoque" },
  { label: "Trocas", href: "/oportunidades" },
  { label: "Match IA", href: "/matches" },
  { label: "Financeiro", href: "/crm#financeiro" },
  { label: "Catálogo APDL", href: "/apdl" },
];

export function MissionControlShell({ children }: { children: ReactNode }) {
  return <main className="mc-shell">
    <EnterpriseSidebar items={navigation}/>
    <section className="mc-stage">
      <header className="mc-topbar">
        <CommandPalette/>
        <div className="mc-topbar-actions">
          <a className="ap-button ap-button--secondary" href="/matches">Match IA</a>
          <a className="ap-button ap-button--primary" href="/oportunidades">Nova oportunidade</a>
        </div>
      </header>
      <div className="mc-content">{children}</div>
    </section>
  </main>;
}

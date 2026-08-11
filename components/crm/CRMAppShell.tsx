"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./CRMAppShell.module.css";

type NavItem = {
  label: string;
  href: string;
  icon: string;
};

type NavGroup = {
  title?: string;
  items: NavItem[];
};

const NAVIGATION: NavGroup[] = [
  {
    items: [
      { label: "Central de Operações", href: "/crm", icon: "grid" },
    ],
  },
  {
    title: "COMERCIAL",
    items: [
      { label: "Potenciais clientes", href: "/leads", icon: "target" },
      { label: "Clientes", href: "/clientes", icon: "users" },
      { label: "Oportunidades", href: "/oportunidades", icon: "target" },
      { label: "Propostas", href: "/propostas", icon: "file" },
    ],
  },
  {
    title: "VEÍCULOS",
    items: [
      { label: "Estoque", href: "/veiculos", icon: "car" },
      { label: "Trocas", href: "/trocas", icon: "swap" },
      { label: "Correspondências IA", href: "/matches", icon: "spark" },
    ],
  },
  {
    title: "REDE",
    items: [
      { label: "Parceiros", href: "/parceiros", icon: "store" },
    ],
  },
  {
    title: "GESTÃO",
    items: [
      { label: "Financeiro", href: "/financeiro", icon: "wallet" },
      { label: "Relatórios", href: "/relatorios", icon: "chart" },
      { label: "Recomendações IA", href: "/recomendacoes", icon: "bulb" },
    ],
  },
  {
    title: "SISTEMA",
    items: [
      { label: "Configurações", href: "/configuracoes", icon: "settings" },
    ],
  },
];

const MOBILE_PRIMARY_HREFS = [
  "/crm",
  "/clientes",
  "/oportunidades",
  "/veiculos",
];

const MANAGED_PREFIXES = [
  "/crm",
  "/busca",
  "/clientes",
  "/leads",
  "/oportunidades",
  "/veiculos",
  "/estoque",
  "/trocas",
  "/propostas",
  "/parceiros",
  "/financeiro",
  "/relatorios",
  "/configuracoes",
  "/recomendacoes",
  "/matches",
  ];


function isManaged(pathname: string) {
  return MANAGED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function activeFor(pathname: string, href: string) {
  if (href === "/crm") return pathname === "/crm";
  if (href === "/veiculos") {
    return (
      pathname === "/estoque" ||
      pathname === "/veiculos" ||
      pathname.startsWith("/veiculos/")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
  }

 
function Icon({ name }: { name: string }) {
  const common = {
    width: 19,
    height: 19,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "users") return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
  if (name === "car") return <svg {...common}><path d="M3 13l2-5h14l2 5"/><path d="M5 13h14a2 2 0 0 1 2 2v3H3v-3a2 2 0 0 1 2-2Z"/><circle cx="6.5" cy="17" r="1"/><circle cx="17.5" cy="17" r="1"/></svg>;
  if (name === "swap") return <svg {...common}><path d="M7 7h11l-3-3M17 17H6l3 3M18 7l3 3-3 3M6 17l-3-3 3-3"/></svg>;
  if (name === "file") return <svg {...common}><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></svg>;
  if (name === "store") return <svg {...common}><path d="M3 9l2-5h14l2 5"/><path d="M5 13v8h14v-8M8 21v-5h8v5"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/></svg>;
  if (name === "wallet") return <svg {...common}><path d="M3 6h15a3 3 0 0 1 3 3v9H3z"/><path d="M3 6V4h13v2M16 12h5"/><circle cx="17" cy="12" r=".7" fill="currentColor"/></svg>;
  if (name === "chart") return <svg {...common}><path d="M4 20V10M10 20V4M16 20v-7M22 20V7"/></svg>;
  if (name === "settings") return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2.83 2.83-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21h-4v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06-2.83-2.83.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3v-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06 2.83-2.83.06.06A1.65 1.65 0 0 0 8.92 4a1.65 1.65 0 0 0 1-1.51V2h4v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06 2.83 2.83-.06.06A1.65 1.65 0 0 0 19.4 9c.12.37.46.63.85.64H21v4h-.75c-.39.01-.73.27-.85.64Z"/></svg>;
  if (name === "grid") return <svg {...common}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
  if (name === "bulb") return <svg {...common}><path d="M9 18h6M10 22h4"/><path d="M8.5 15.5A6 6 0 1 1 15.5 15.5c-.9.7-1.5 1.4-1.5 2.5h-4c0-1.1-.6-1.8-1.5-2.5Z"/></svg>;
  if (name === "spark") return <svg {...common}><path d="M12 3l1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3Z"/><path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14Z"/></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/></svg>;
}

export function CRMAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const managed = isManaged(pathname);
  const globalSearchRef = useRef<HTMLInputElement>(null);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
  const handleShortcut = (event: KeyboardEvent) => {
    if (
      event.key === "/" &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      const target = event.target as HTMLElement;

      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      event.preventDefault();
      globalSearchRef.current?.focus();
    }
  };

  window.addEventListener("keydown", handleShortcut);

  return () => {
    window.removeEventListener("keydown", handleShortcut);
  };
}, []);

useEffect(() => {
  if (!managed) return;
  

  const sidebar = sidebarRef.current;
  if (!sidebar) return;

  const saved = sessionStorage.getItem("autoponte-sidebar-scroll");

  if (saved) {
    requestAnimationFrame(() => {
      sidebar.scrollTop = Number(saved);
    });
  }

  const saveScroll = () => {
    sessionStorage.setItem(
      "autoponte-sidebar-scroll",
      String(sidebar.scrollTop)
    );
  };

  sidebar.addEventListener("scroll", saveScroll, { passive: true });

  
  
  return () => {
    saveScroll();
    sidebar.removeEventListener("scroll", saveScroll);
  };
}, [managed, pathname]);

const mobilePrimaryItems = NAVIGATION
  .flatMap((group) => group.items)
  .filter((item) =>
    MOBILE_PRIMARY_HREFS.includes(item.href)
  );

const mobileMoreItems = NAVIGATION
  .flatMap((group) => group.items)
  .filter((item) =>
    !MOBILE_PRIMARY_HREFS.includes(item.href)
  );

if (!managed) return <>{children}</>;


  return (
    <div className={styles.shell}>
     
		<aside ref={sidebarRef} className={styles.sidebar}>
        <a href="/crm" className={styles.brand} aria-label="AutoPonte Veículos">
          <span className={styles.brandMark}>A</span>
          <span>
            <strong>AutoPonte</strong>
            <small>VEÍCULOS</small>
          </span>
        </a>

       <nav className={styles.nav}>
  {NAVIGATION.map((group, groupIndex) => (
    <div
      className={styles.group}
      key={`${group.title || "main"}-${groupIndex}`}
    >
      {group.title ? (
        <p className={styles.groupTitle}>{group.title}</p>
      ) : null}

      {group.items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className={
            activeFor(pathname, item.href)
              ? styles.active
              : ""
          }
        >
          <span className={styles.icon}>
            <Icon name={item.icon} />
          </span>

          <span>{item.label}</span>
        </a>
      ))}
    </div>
  ))}
</nav>

          <div className={styles.footer}>
          <span className={styles.user}>AP</span>
          <span>
            <strong>AutoPonte</strong>
            <small>Operação comercial</small>
          </span>
        </div>
      </aside>

      <section className={styles.stage}>
        <header className={styles.topbar}>
          <div>
            <div className={styles.breadcrumb}>AutoPonte CRM</div>
            <div className={styles.routeLabel}>
              {NAVIGATION.flatMap(group => group.items).find(item => activeFor(pathname, item.href))?.label || "Operação"}
            </div>
          </div>

          <form
                className={styles.globalSearch}
                 method="GET"
                action="/busca"
>
          <span>⌕</span>

              <input
                ref={globalSearchRef}
                type="search"
                name="q"
                aria-label="Busca global"
                placeholder="Buscar clientes, veículos, placas..."
  />

              <button
                 type="submit"
                  aria-label="Buscar"
                   title="Buscar"
  >
    🔍
              </button>
            </form>

          <div className={styles.actions}>
            <a href="/recomendacoes">Recomendações IA</a>
            <a href="/oportunidades/nova" className={styles.primary}>+ Nova oportunidade</a>
          </div>
        </header>

        <div className={styles.content}>{children}</div>
      </section>
    </div>
  );
}



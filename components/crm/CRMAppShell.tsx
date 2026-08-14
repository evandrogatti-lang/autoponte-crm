"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
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

  if (name === "users") return <svg {...common} aria-hidden="true" focusable="false"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
  if (name === "car") return <svg {...common} aria-hidden="true" focusable="false"><path d="M3 13l2-5h14l2 5"/><path d="M5 13h14a2 2 0 0 1 2 2v3H3v-3a2 2 0 0 1 2-2Z"/><circle cx="6.5" cy="17" r="1"/><circle cx="17.5" cy="17" r="1"/></svg>;
  if (name === "swap") return <svg {...common} aria-hidden="true" focusable="false"><path d="M7 7h11l-3-3M17 17H6l3 3M18 7l3 3-3 3M6 17l-3-3 3-3"/></svg>;
  if (name === "file") return <svg {...common} aria-hidden="true" focusable="false"><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></svg>;
  if (name === "store") return <svg {...common} aria-hidden="true" focusable="false"><path d="M3 9l2-5h14l2 5"/><path d="M5 13v8h14v-8M8 21v-5h8v5"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/></svg>;
  if (name === "wallet") return <svg {...common} aria-hidden="true" focusable="false"><path d="M3 6h15a3 3 0 0 1 3 3v9H3z"/><path d="M3 6V4h13v2M16 12h5"/><circle cx="17" cy="12" r=".7" fill="currentColor"/></svg>;
  if (name === "chart") return <svg {...common} aria-hidden="true" focusable="false"><path d="M4 20V10M10 20V4M16 20v-7M22 20V7"/></svg>;
  if (name === "settings") return <svg {...common} aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2.83 2.83-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21h-4v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06-2.83-2.83.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3v-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06 2.83-2.83.06.06A1.65 1.65 0 0 0 8.92 4a1.65 1.65 0 0 0 1-1.51V2h4v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06 2.83 2.83-.06.06A1.65 1.65 0 0 0 19.4 9c.12.37.46.63.85.64H21v4h-.75c-.39.01-.73.27-.85.64Z"/></svg>;
  if (name === "grid") return <svg {...common} aria-hidden="true" focusable="false"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
  if (name === "bulb") return <svg {...common} aria-hidden="true" focusable="false"><path d="M9 18h6M10 22h4"/><path d="M8.5 15.5A6 6 0 1 1 15.5 15.5c-.9.7-1.5 1.4-1.5 2.5h-4c0-1.1-.6-1.8-1.5-2.5Z"/></svg>;
  if (name === "spark") return <svg {...common} aria-hidden="true" focusable="false"><path d="M12 3l1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3Z"/><path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14Z"/></svg>;
  return <svg {...common} aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/></svg>;
}

export function CRMAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const managed = isManaged(pathname);
  const globalSearchRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [isAppleTouch, setIsAppleTouch] = useState(false);
  const mobileMoreButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileMorePanelRef = useRef<HTMLDivElement | null>(null);
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
      if (isAppleTouch) {
        setMobileSearchOpen(true);
      } else {
        globalSearchRef.current?.focus();
      }
    }
  };

  window.addEventListener("keydown", handleShortcut);

  return () => {
    window.removeEventListener("keydown", handleShortcut);
  };
}, [isAppleTouch]);

useEffect(() => {
  const appleMobile = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const iPadDesktopMode = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  setIsAppleTouch(appleMobile || iPadDesktopMode);
}, []);

useEffect(() => {
  if (!mobileSearchOpen) return;

  const focusId = requestAnimationFrame(() => mobileSearchRef.current?.focus());
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" || event.key === "Esc") setMobileSearchOpen(false);
  };
  window.addEventListener("keydown", onKeyDown);

  return () => {
    cancelAnimationFrame(focusId);
    window.removeEventListener("keydown", onKeyDown);
  };
}, [mobileSearchOpen]);

useEffect(() => {
  if (!managed) return;

  const sidebar = sidebarRef.current;
  if (!sidebar) return;

  // Avoid restoring or persisting sidebar scroll on narrow mobile viewports
  // to prevent inappropriate scroll persistence when the sidebar becomes
  // a bottom bar.
  const isMobile = typeof window !== "undefined" && window.matchMedia && window.matchMedia('(max-width:760px)').matches;
  if (!isMobile) {
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
  }

  return () => {};
}, [managed, pathname]);

// Close mobile more panel on route change
useEffect(() => {
  // always close on route change (no dependency on mobileMoreOpen)
  const id = requestAnimationFrame(() => setMobileMoreOpen(false));
  return () => cancelAnimationFrame(id);
}, [pathname]);

// Handle Esc key and click outside when mobileMoreOpen
useEffect(() => {
  if (!mobileMoreOpen) return;

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" || e.key === "Esc") {
      setMobileMoreOpen(false);
      // return focus to button
      requestAnimationFrame(() => mobileMoreButtonRef.current?.focus());
    }
  };

  const onClick = (e: MouseEvent) => {
    const panel = mobileMorePanelRef.current;
    const btn = mobileMoreButtonRef.current;
    const target = e.target as Node;
    if (panel && !panel.contains(target) && btn && !btn.contains(target)) {
      setMobileMoreOpen(false);
    }
  };

  window.addEventListener("keydown", onKey);
  window.addEventListener("click", onClick, true);

  return () => {
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("click", onClick, true);
  };
}, [mobileMoreOpen]);

// Close panel on hashchange (e.g., /crm#agenda)
useEffect(() => {
  const onHash = () => setMobileMoreOpen(false);
  window.addEventListener("hashchange", onHash);
  return () => window.removeEventListener("hashchange", onHash);
}, []);

// Close panel when leaving mobile breakpoint
useEffect(() => {
  if (typeof window === "undefined" || !window.matchMedia) return;
  const mq = window.matchMedia('(max-width:760px)');

  const changeListener = (ev: Event) => {
    const mqlEvent = ev as MediaQueryListEvent;
    if (!mqlEvent.matches) setMobileMoreOpen(false);
  };

  // modern browsers: addEventListener
  if (typeof (mq as MediaQueryList & EventTarget).addEventListener === "function") {
    (mq as MediaQueryList & EventTarget).addEventListener("change", changeListener);
    return () => (mq as MediaQueryList & EventTarget).removeEventListener("change", changeListener);
  }

  // legacy: addListener
  if (typeof mq.addListener === "function") {
    const legacyListener = (e: MediaQueryListEvent) => { if (!e.matches) setMobileMoreOpen(false); };
    mq.addListener(legacyListener);
    return () => mq.removeListener(legacyListener);
  }

  return () => {};
}, []);

// primary mobile items are used implicitly by MOBILE_PRIMARY_HREFS; no separate variable needed

const mobileMoreItems = NAVIGATION
  .flatMap((group) => group.items)
  .filter((item) =>
    !MOBILE_PRIMARY_HREFS.includes(item.href)
  );

if (!managed) return <>{children}</>;

const mobileSearchModal = mobileSearchOpen && typeof document !== "undefined"
  ? createPortal(
      <div
        className={styles.mobileSearchOverlay}
        role="presentation"
        onClick={(event) => {
          if (event.target === event.currentTarget) setMobileSearchOpen(false);
        }}
      >
        <section className={styles.mobileSearchDialog} role="dialog" aria-modal="true" aria-label="Busca global">
          <div className={styles.mobileSearchHeader}>
            <strong>Buscar</strong>
            <button type="button" aria-label="Fechar busca" onClick={() => setMobileSearchOpen(false)}>×</button>
          </div>
          <form className={styles.mobileSearchForm} method="GET" action="/busca">
            <input
              ref={mobileSearchRef}
              type="search"
              name="q"
              aria-label="Busca global"
              placeholder="Buscar clientes, veículos, placas..."
            />
            <button type="submit" aria-label="Buscar" title="Buscar">🔍</button>
          </form>
        </section>
      </div>,
      document.body
    )
  : null;


  return <>
    <div className={`${styles.shell} ${isAppleTouch ? styles.appleTouch : ""}`}>
     
    <aside ref={sidebarRef} className={styles.sidebar}>
        <Link href="/crm" className={styles.brand} aria-label="AutoPonte Veículos">
          <span className={styles.brandMark}>A</span>
          <span>
            <strong>AutoPonte</strong>
            <small>VEÍCULOS</small>
          </span>
        </Link>

       <nav className={styles.nav}>
  {NAVIGATION.map((group, groupIndex) => (
    <div
      className={styles.group}
      key={`${group.title || "main"}-${groupIndex}`}
    >
      {group.title ? (
        <p className={styles.groupTitle}>{group.title}</p>
      ) : null}

      {group.items.map((item) => {
        const isActive = activeFor(pathname, item.href);
        const isMobileSecondary = !MOBILE_PRIMARY_HREFS.includes(item.href);
        const classNames = [isActive ? styles.active : null, isMobileSecondary ? styles.mobileSecondary : null].filter(Boolean).join(" ");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={classNames}
            aria-current={isActive ? "page" : undefined}
            onClick={() => setMobileMoreOpen(false)}
          >
            <span className={styles.icon}>
              <Icon name={item.icon} />
            </span>

            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  ))}
  
  
  { /* end nav items */ }

  {/* mobile more button placed inside the nav so it becomes the fifth grid item on mobile */}
  {/* end nav items */}

  {/* Inject mobileMoreButton as the last direct child of nav so it occupies the fifth column in mobile grid */}

  <button
    ref={mobileMoreButtonRef}
    type="button"
    className={styles.mobileMoreButton}
    aria-expanded={mobileMoreOpen}
    aria-controls="mobile-more-panel"
    aria-label={mobileMoreOpen ? "Fechar mais opções" : "Abrir mais opções"}
    onClick={() => setMobileMoreOpen((s) => !s)}
  >
    <span className={styles.icon}><Icon name="grid" /></span>
    <span>Mais</span>
  </button>

</nav>

        <nav
          id="mobile-more-panel"
          ref={mobileMorePanelRef}
          className={styles.mobileMorePanel}
          aria-label="Mais opções de navegação"
          style={{ display: mobileMoreOpen ? undefined : "none" }}
        >
          {mobileMoreItems.map((item) => {
            const isActive = activeFor(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMoreOpen(false)}
                className={isActive ? styles.mobileMoreActive : ""}
              >
                <span className={styles.icon}><Icon name={item.icon} /></span>
                <span>{item.label}</span>
              </Link>
            );
          })}
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

          <button
            type="button"
            className={styles.mobileSearchTrigger}
            aria-label="Abrir busca global"
            onClick={() => setMobileSearchOpen(true)}
          >
            <span>Buscar clientes, veículos, placas...</span>
            <span aria-hidden="true">🔍</span>
          </button>

          <div className={styles.actions}>
            <Link href="/recomendacoes">Recomendações IA</Link>
            <Link href="/oportunidades/nova" className={styles.primary}>+ Nova oportunidade</Link>
          </div>
        </header>

        <div className={styles.content}>{children}</div>
      </section>
    </div>
    {mobileSearchModal}
  </>;
}



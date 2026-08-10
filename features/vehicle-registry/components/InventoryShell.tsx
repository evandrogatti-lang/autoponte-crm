 "use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import styles from "./VehicleRegistry.module.css";

  type InventoryShellProps = {
    children: ReactNode;
    active?: "inventory" | "partners";
    breadcrumb?: ReactNode;
  };

  export function InventoryShell({
    children,
    breadcrumb,
  }: InventoryShellProps) {
    const searchRef = useRef<HTMLInputElement>(null);

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
      searchRef.current?.focus();
    }
  };

  window.addEventListener("keydown", handleShortcut);

  return () => {
    window.removeEventListener("keydown", handleShortcut);
  };
}, []);

    return (
      <div className={styles.workspace}>
        <header className={styles.appHeader}>
          <div className={styles.breadcrumb}>
            {breadcrumb ?? (
              <>
                <a href="/crm">Central de Operações</a>
                <b>›</b>
                <span>Estoque</span>
              </>
            )}
          </div>

          <form
  className={styles.globalSearch}
  method="GET"
  action="/busca"
>
  <span>⌕</span>

  <input
    ref={searchRef}
    type="search"
    name="q"
    aria-label="Busca global"
    placeholder="Buscar clientes, veículos, placas..."
  />

  <button type="submit" aria-label="Buscar" title="Buscar">
  🔍
</button>
</form>

          <div className={styles.headerIcons}>
            <a href="/crm" title="Notificações">●</a>
            <a href="/crm" title="Ajuda">?</a>
            <span className={styles.avatar}>EG</span>
          </div>
        </header>

        <div className={styles.content}>{children}</div>
      </div>
    );
  }
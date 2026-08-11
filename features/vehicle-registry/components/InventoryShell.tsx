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
        

        <div className={styles.content}>{children}</div>
      </div>
    );
  }
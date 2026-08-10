import type { ReactNode } from "react";
import styles from "./CoreShell.module.css";

export function CoreShell({
  children,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  activeHref: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <main className={styles.shell}>
      <section className={styles.stage}>
        <header className={styles.topbar}>
          <div />
          <div className={styles.topActions}>{actions}</div>
        </header>

        <div className={styles.content}>
          <div className={styles.pageHeader}>
            <div>
              <span className={styles.eyebrow}>AUTOPONTE CRM</span>
              <h1>{title}</h1>
              {subtitle && <p>{subtitle}</p>}
            </div>

           </div>

          {children}
        </div>
      </section>
    </main>
  );
}

export const coreStyles = styles;
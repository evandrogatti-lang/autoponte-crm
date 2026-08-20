"use client";

import { useEffect, useState } from "react";
import styles from "./home-vision.module.css";

type Theme = "light" | "slate" | "dark";

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const page = document.querySelector(`main.${styles.page}`);
    if (!(page instanceof HTMLElement)) return;

    page.classList.remove(styles.themeSlate, styles.themeDark);
    if (theme === "slate") page.classList.add(styles.themeSlate);
    if (theme === "dark") page.classList.add(styles.themeDark);

    return () => page.classList.remove(styles.themeSlate, styles.themeDark);
  }, [theme]);

  return (
    <div className={styles.themeBar} aria-label="Comparar aparência">
      <button type="button" className={theme === "light" ? styles.themeActive : ""} onClick={() => setTheme("light")}>Claro</button>
      <button type="button" className={theme === "slate" ? styles.themeActive : ""} onClick={() => setTheme("slate")}>Intermediário</button>
      <button type="button" className={theme === "dark" ? styles.themeActive : ""} onClick={() => setTheme("dark")}>Dark</button>
    </div>
  );
}

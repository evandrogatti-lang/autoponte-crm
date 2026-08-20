"use client";

import { useEffect, useState } from "react";
import styles from "./home-vision.module.css";

type Theme = "light" | "slate" | "dark";
const storageKey = "autoponte-home-theme";

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved === "light" || saved === "slate" || saved === "dark") setTheme(saved);
  }, []);

  useEffect(() => {
    const body = document.body;
    body.classList.remove("apThemeSlate", "apThemeDark");
    if (theme === "slate") body.classList.add("apThemeSlate");
    if (theme === "dark") body.classList.add("apThemeDark");
    window.localStorage.setItem(storageKey, theme);
    return () => body.classList.remove("apThemeSlate", "apThemeDark");
  }, [theme]);

  return (
    <div className={styles.themeBar} aria-label="Comparar aparência">
      <button type="button" className={theme === "light" ? styles.themeActive : ""} onClick={() => setTheme("light")}>Claro</button>
      <button type="button" className={theme === "slate" ? styles.themeActive : ""} onClick={() => setTheme("slate")}>Intermediário</button>
      <button type="button" className={theme === "dark" ? styles.themeActive : ""} onClick={() => setTheme("dark")}>Dark</button>
    </div>
  );
}

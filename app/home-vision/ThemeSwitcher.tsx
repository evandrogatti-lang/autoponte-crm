"use client";

import { useEffect, useState } from "react";
import styles from "./home-vision.module.css";

type Theme = "light" | "slate" | "dark";

const bodyClasses: Record<Theme, string> = {
  light: "apThemeLight",
  slate: "apThemeSlate",
  dark: "apThemeDark",
};

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const body = document.body;
    Object.values(bodyClasses).forEach((name) => body.classList.remove(name));
    body.classList.add(bodyClasses[theme]);
    return () => body.classList.remove(bodyClasses[theme]);
  }, [theme]);

  return (
    <div className={styles.themeBar} aria-label="Comparar aparência">
      <button type="button" className={theme === "light" ? styles.themeActive : ""} onClick={() => setTheme("light")}>Claro</button>
      <button type="button" className={theme === "slate" ? styles.themeActive : ""} onClick={() => setTheme("slate")}>Intermediário</button>
      <button type="button" className={theme === "dark" ? styles.themeActive : ""} onClick={() => setTheme("dark")}>Dark</button>
    </div>
  );
}

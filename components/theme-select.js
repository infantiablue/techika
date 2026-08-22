"use client";

import { useEffect, useState } from "react";

const storageKey = "theme";
const nextTheme = { system: "dark", dark: "light", light: "system" };

function ThemeIcon({ theme }) {
  if (theme === "dark") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 15.3A8.5 8.5 0 0 1 8.7 3.5 8.5 8.5 0 1 0 20.5 15.3Z" /></svg>;
  if (theme === "light") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="1" /><path d="M8 21h8m-4-4v4" /></svg>;
}

export function ThemeSelect() {
  const [theme, setTheme] = useState("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem(storageKey);
    if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (theme === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    if (theme === "system") localStorage.removeItem(storageKey);
    else localStorage.setItem(storageKey, theme);
  }, [ready, theme]);

  const next = nextTheme[theme];
  return <button className="theme-select" type="button" aria-label={`Theme: ${theme}. Change to ${next}.`} title={`Theme: ${theme}. Click for ${next}.`} onClick={() => setTheme(next)}><ThemeIcon theme={theme} /></button>;
}

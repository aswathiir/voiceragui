"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
}>({ theme: "dark", setTheme: () => {} });

function applyTheme(t: Theme) {
  const html = document.documentElement;
  html.classList.remove("dark", "light");
  html.classList.add(t);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  // On mount, read stored preference
  useEffect(() => {
    const stored = (localStorage.getItem("vr_theme") as Theme) ?? "dark";
    setThemeState(stored);
    applyTheme(stored);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("vr_theme", t);
    applyTheme(t);
  };

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

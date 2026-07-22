"use client";

import { Sun, Moon, Settings } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useRouter } from "next/navigation";

export function Docks() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  return (
    <div className="inline-flex rounded-xl overflow-hidden relative bg-white/8 dark:bg-black/30 backdrop-blur-md border border-white/10 dark:border-white/8">
      <button
        onClick={() => setTheme("light")}
        className={`px-3.5 py-2 flex items-center gap-2 transition-all duration-200 text-sm border-r border-white/8 group focus:outline-none ${
          theme === "light"
            ? "bg-white/15 text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
        }`}
        aria-label="Light mode"
      >
        <Sun className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
        <span className="select-none hidden sm:inline">Light</span>
      </button>

      <button
        onClick={() => setTheme("dark")}
        className={`px-3.5 py-2 flex items-center gap-2 transition-all duration-200 text-sm border-r border-white/8 group focus:outline-none ${
          theme === "dark"
            ? "bg-white/15 text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
        }`}
        aria-label="Dark mode"
      >
        <Moon className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
        <span className="select-none hidden sm:inline">Dark</span>
      </button>

      <button
        onClick={() => router.push("/dashboard/settings")}
        className="px-3.5 py-2 flex items-center gap-2 transition-all duration-200 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 group focus:outline-none"
        aria-label="Settings"
      >
        <Settings className="w-4 h-4 transition-transform duration-200 group-hover:rotate-45" />
        <span className="select-none hidden sm:inline">Settings</span>
      </button>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Sun, Moon, Settings } from "lucide-react";
import { Phone, Clock, MessageSquare, BarChart2 } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "@/lib/theme";
import { InteractiveMenu } from "@/components/ui/modern-mobile-menu";

const NAV_ITEMS = [
  { label: "Call", icon: Phone, href: "/dashboard/call" },
  { label: "History", icon: Clock, href: "/dashboard/history" },
  { label: "Chat", icon: MessageSquare, href: "/dashboard/chat" },
  { label: "Logs", icon: BarChart2, href: "/dashboard/logs" },
];

export function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  // Map pathname to InteractiveMenu index
  const activeIdx = NAV_ITEMS.findIndex((n) => path === n.href);

  const handleMenuSelect = (i: number, item: { href?: string }) => {
    if (item.href) router.push(item.href);
  };

  return (
    <>
    <aside className="hidden lg:flex w-56 flex-shrink-0 flex-col h-full border-r border-border bg-card">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
          </div>
          <span className="font-display font-semibold text-sm text-foreground tracking-tight">
            VoiceRAG
          </span>
          <span
            className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500"
            style={{ boxShadow: "0 0 5px rgba(52,211,153,0.7)" }}
          />
        </div>
      </div>

      {/* Interactive nav */}
      <div className="flex-1 flex flex-col p-4 gap-1 overflow-y-auto">
        <p className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-widest px-1 pb-2">
          Navigation
        </p>

        {/* Desktop link list */}
        <div className="space-y-0.5">
          {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
            const active = path === href;
            return (
              <Link key={href} href={href}>
                <motion.div
                  whileHover={{ x: 1 }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all border ${
                    active
                      ? "bg-primary/10 text-primary border-primary/15"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 stroke-[1.5] ${active ? "text-primary" : "text-muted-foreground"}`}
                  />
                  <span>{label}</span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Footer — theme + signout */}
      <div className="p-4 border-t border-border space-y-3">
        {/* Theme dock */}
        <div className="flex rounded-xl overflow-hidden border border-border bg-muted/30">
          <button
            onClick={() => setTheme("light")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs transition-all ${
              theme === "light"
                ? "bg-card text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sun className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>Light</span>
          </button>
          <div className="w-px bg-border" />
          <button
            onClick={() => setTheme("dark")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs transition-all ${
              theme === "dark"
                ? "bg-card text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Moon className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>Dark</span>
          </button>
          <div className="w-px bg-border" />
          <Link href="/dashboard/settings">
            <button className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs text-muted-foreground hover:text-foreground transition-all">
              <Settings className="w-3.5 h-3.5 stroke-[1.5]" />
            </button>
          </Link>
        </div>

        <Link href="/">
          <motion.div
            whileHover={{ x: 1 }}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4 stroke-[1.5]" />
            Sign Out
          </motion.div>
        </Link>
      </div>
    </aside>

    {/* Mobile bottom nav */}
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex justify-center px-3 py-2 bg-card/95 backdrop-blur border-t border-border">
      <InteractiveMenu
        items={NAV_ITEMS}
        activeIndex={activeIdx === -1 ? 0 : activeIdx}
        onSelect={handleMenuSelect}
      />
    </nav>
    </>
  );
}

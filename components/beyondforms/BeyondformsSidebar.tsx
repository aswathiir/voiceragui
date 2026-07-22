"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Database,
  Settings2,
  Phone,
  PhoneCall,
  CalendarCheck,
  Gauge,
  CreditCard,
  Users,
  BarChart2,
  Activity,
  SlidersHorizontal,
  LogOut,
  UserCheck,
  Search,
  ChevronLeft,
  MoreVertical,
  ShieldCheck,
} from "lucide-react";
import { useAuthStore } from "@/lib/stores/authStore";

const SPRING = "cubic-bezier(0.25, 1.1, 0.4, 1)";

const ADMIN_NAV = [
  { label: "Overview", icon: LayoutDashboard, href: "/admin/overview" },
  { label: "Organizations", icon: Users, href: "/admin/customers" },
  { label: "Live Calls", icon: Activity, href: "/admin/calls" },
  { label: "Limits", icon: SlidersHorizontal, href: "/admin/limits" },
  { label: "Audit Log", icon: ShieldCheck, href: "/admin/audit" },
];

const CUSTOMER_NAV = [
  { label: "Home", icon: LayoutDashboard, href: "/dashboard/home" },
  { label: "Knowledge Base", icon: Database, href: "/dashboard/knowledge" },
  { label: "Configure", icon: Settings2, href: "/dashboard/configure" },
  { label: "Callers", icon: UserCheck, href: "/dashboard/users" },
  { label: "Calls", icon: Phone, href: "/dashboard/calls" },
  { label: "Live Call", icon: PhoneCall, href: "/dashboard/livecall" },
  { label: "Appointments", icon: CalendarCheck, href: "/dashboard/appointments" },
  { label: "Live Usage", icon: Gauge, href: "/dashboard/usage" },
  { label: "Analytics", icon: BarChart2, href: "/dashboard/analytics" },
  { label: "Billing", icon: CreditCard, href: "/dashboard/billing" },
];

interface Props {
  role: "super_admin" | "customer";
}

export function BeyondformsSidebar({ role }: Props) {
  const path = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const nav = role === "super_admin" ? ADMIN_NAV : CUSTOMER_NAV;
  const [collapsed, setCollapsed] = useState(false);
  const [q, setQ] = useState("");

  const isActive = (href: string) => path === href || path.startsWith(href + "/");
  const filtered = q ? nav.filter((n) => n.label.toLowerCase().includes(q.toLowerCase())) : nav;

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const railBtn = (active: boolean) =>
    `flex items-center justify-center rounded-lg size-10 min-w-10 transition-colors ${
      active ? "bg-cyan-400/15 text-cyan-400" : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
    }`;

  return (
    <>
      <div className="hidden lg:flex h-full">
        {/* ── Icon rail ── */}
        <aside className="bg-transparent backdrop-blur-md flex flex-col gap-2 items-center p-3 w-16 h-full border-r border-white/10">
          <div className="mb-2 size-10 flex items-center justify-center">
            <div className="w-8 h-8 rounded-lg bg-cyan-400 text-black font-bold text-xs flex items-center justify-center shadow-[0_0_14px_rgba(251,146,60,0.4)]">
              BF
            </div>
          </div>
          <div className="flex flex-col gap-1.5 w-full items-center">
            {nav.map(({ label, icon: Icon, href }) => (
              <Link key={href} href={href} title={label}>
                <div className={railBtn(isActive(href))}>
                  <Icon className="w-[18px] h-[18px]" />
                </div>
              </Link>
            ))}
          </div>
          <div className="flex-1" />
          <button onClick={handleLogout} title="Sign out" className={railBtn(false)}>
            <LogOut className="w-[18px] h-[18px]" />
          </button>
          <div className="size-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[10px] font-bold text-neutral-200">
            {(user?.name ?? "U").slice(0, 1).toUpperCase()}
          </div>
        </aside>

        {/* ── Detail panel (collapsible) ── */}
        <aside
          className="bg-transparent backdrop-blur-md flex flex-col gap-4 border-r border-white/10 overflow-hidden transition-all duration-500"
          style={{ width: collapsed ? 0 : 288, transitionTimingFunction: SPRING }}
        >
          <div className="flex flex-col gap-4 p-4 w-72 h-full">
            {/* Brand + collapse */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-[16px] leading-tight bg-gradient-to-r from-white via-cyan-300 to-orange-500 bg-clip-text text-transparent">
                  BeyondForms
                </p>
                <p className="text-[11px] text-neutral-500">
                  {role === "super_admin" ? "Super Admin" : user?.name ?? "Organization"}
                </p>
              </div>
              <button
                onClick={() => setCollapsed(true)}
                aria-label="Collapse"
                className="flex items-center justify-center rounded-lg size-9 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="bg-white/5 h-10 rounded-lg flex items-center px-2 border border-white/10">
              <Search className="w-4 h-4 text-neutral-500 shrink-0" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                className="flex-1 bg-transparent outline-none text-[14px] text-neutral-100 placeholder:text-neutral-500 px-2"
              />
            </div>

            {/* Nav */}
            <div className="flex flex-col w-full overflow-y-auto gap-0.5">
              <p className="text-[12px] text-neutral-500 px-3 py-2 uppercase tracking-wide">Menu</p>
              {filtered.map(({ label, icon: Icon, href }) => {
                const active = isActive(href);
                return (
                  <Link key={href} href={href}>
                    <motion.div
                      whileHover={{ x: 1 }}
                      className={`h-10 rounded-lg flex items-center px-3 gap-3 cursor-pointer transition-colors ${
                        active ? "bg-cyan-400/15 text-cyan-400" : "text-neutral-200 hover:bg-neutral-800"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="text-[14px] truncate">{label}</span>
                    </motion.div>
                  </Link>
                );
              })}
            </div>

            {/* User footer */}
            <div className="w-full mt-auto pt-3 border-t border-neutral-800">
              <div className="flex items-center gap-2 px-1">
                <div className="size-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[11px] font-bold text-neutral-200">
                  {(user?.name ?? "U").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] text-neutral-100 truncate">{user?.name}</p>
                  <p className="text-[11px] text-neutral-500 truncate">{user?.email}</p>
                </div>
                <button onClick={handleLogout} className="ml-auto size-8 rounded-md flex items-center justify-center hover:bg-neutral-800 text-neutral-400" aria-label="Sign out">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Re-expand tab when collapsed */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            aria-label="Expand"
            className="self-center -ml-px flex items-center justify-center w-4 h-16 rounded-r-lg bg-neutral-900 border border-l-0 border-neutral-800 text-neutral-400 hover:text-cyan-400"
          >
            <ChevronLeft className="w-3 h-3 rotate-180" />
          </button>
        )}
      </div>

      {/* ── Mobile notch nav (unchanged) ── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-2 pb-2 pt-6 bg-gradient-to-t from-black via-black/95 to-transparent">
        <div className="relative flex items-end rounded-2xl bg-black/90 backdrop-blur-xl border border-neutral-800 px-1 overflow-x-auto">
          {nav.map(({ label, icon: Icon, href }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href} className="flex-1 min-w-[52px]">
                <div className="relative flex flex-col items-center justify-end pt-1.5 pb-1.5 gap-0.5">
                  {active ? (
                    <motion.div
                      layoutId="bf-notch"
                      transition={{ type: "spring", stiffness: 400, damping: 28 }}
                      className="relative -mt-6 mb-0.5 w-11 h-11 rounded-full bg-cyan-400 text-black flex items-center justify-center border-4 border-black shadow-[0_0_18px_rgba(251,146,60,0.45)]"
                    >
                      <Icon className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    <div className="w-11 h-8 flex items-center justify-center text-neutral-400 hover:text-neutral-100 transition-colors">
                      <Icon className="w-[18px] h-[18px]" />
                    </div>
                  )}
                  <span className={`text-[8px] font-semibold uppercase tracking-wide leading-none whitespace-nowrap ${active ? "text-cyan-400" : "text-neutral-500"}`}>
                    {label.split(" ")[0]}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

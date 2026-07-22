"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";
import { Sidebar } from "@/components/ui/sidebar";
import { BeyondformsSidebar } from "@/components/beyondforms/BeyondformsSidebar";
import { useAuthStore } from "@/lib/stores/authStore";
import { useAdminStore } from "@/lib/stores/adminStore";
import { useCallStore } from "@/lib/stores/callStore";
import { ShaderAnimation } from "@/components/ui/shader-animation";

const BF_PATHS = [
  "/dashboard/home",
  "/dashboard/knowledge",
  "/dashboard/configure",
  "/dashboard/users",
  "/dashboard/calls",
  "/dashboard/livecall",
  "/dashboard/appointments",
  "/dashboard/usage",
  "/dashboard/analytics",
  "/dashboard/billing",
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, impersonatedBy, stopImpersonation } = useAuthStore();
  const hydrateAdminData = useAdminStore((s) => s.hydrate);
  const hydrateCalls = useCallStore((s) => s.hydrate);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const isBF = BF_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  useEffect(() => {
    // Only fetch once a session cookie can actually exist — calling this
    // before login guarantees a 401 from the now-auth-gated /api/admin/*
    // routes. Re-runs once isAuthenticated flips true after login.
    if (isBF && hydrated && isAuthenticated) {
      hydrateAdminData();
      hydrateCalls();
    }
  }, [isBF, hydrated, isAuthenticated, hydrateAdminData, hydrateCalls]);

  useEffect(() => {
    if (!hydrated || !isBF) return;
    if (!isAuthenticated) {
      router.push("/login");
    } else if (user?.role === "super_admin") {
      router.push("/admin/overview");
    }
  }, [hydrated, isBF, isAuthenticated, user, router]);

  if (isBF) {
    if (!hydrated) return null;

    if (!isAuthenticated || user?.role === "super_admin") {
      return (
        <div className="flex h-screen items-center justify-center neural-bg">
          <p className="text-sm text-muted-foreground">Redirecting…</p>
        </div>
      );
    }

    return (
      <div className="relative flex h-screen overflow-hidden flex-col neural-bg">
        {/* Animated shader backdrop — behind all content, non-interactive */}
        <div className="pointer-events-none fixed inset-0 z-0 opacity-30">
          <ShaderAnimation />
        </div>
        {impersonatedBy && (
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 px-4 py-2 text-xs sm:text-sm font-medium text-foreground flex-shrink-0 glass-panel border-b border-cyan-400/20">
            <ArrowLeftRight className="w-4 h-4 text-cyan-400" />
            <span>
              {impersonatedBy.name} is viewing as <strong>{user?.name}</strong>
            </span>
            <button
              onClick={() => {
                stopImpersonation();
                router.push("/admin/customers");
              }}
              className="ml-1 px-3 py-1 rounded-lg text-xs font-semibold bg-cyan-400 text-black hover:bg-cyan-300 transition-colors"
            >
              Return to Admin
            </button>
          </div>
        )}
        <div className="relative z-10 flex flex-1 overflow-hidden">
          <BeyondformsSidebar role="customer" />
          <main className="flex-1 overflow-auto pb-20 lg:pb-0">{children}</main>
        </div>
      </div>
    );
  }

  // Original VoiceRAG layout for non-BeyondForms pages
  return (
    <div className="flex h-screen overflow-hidden neural-bg">
      <Sidebar />
      <main className="flex-1 overflow-auto pb-20 lg:pb-0">{children}</main>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/authStore";
import { useAdminStore } from "@/lib/stores/adminStore";
import { useCallStore } from "@/lib/stores/callStore";
import { BeyondformsSidebar } from "@/components/beyondforms/BeyondformsSidebar";
import { ShaderAnimation } from "@/components/ui/shader-animation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore();
  const hydrateAdminData = useAdminStore((s) => s.hydrate);
  const hydrateCalls = useCallStore((s) => s.hydrate);
  const router = useRouter();
  // Wait for Zustand to rehydrate from localStorage before making routing decisions
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    // Only fetch once a session cookie can actually exist — calling this
    // before login guarantees a 401 from the now-auth-gated /api/admin/*
    // routes. Re-runs once isAuthenticated flips true after login.
    if (hydrated && isAuthenticated) {
      hydrateAdminData();
      hydrateCalls();
    }
  }, [hydrated, isAuthenticated, hydrateAdminData, hydrateCalls]);

  useEffect(() => {
    if (!hydrated) return; // don't redirect before localStorage is read
    if (!isAuthenticated) {
      router.push("/login");
    } else if (user?.role !== "super_admin") {
      router.push("/dashboard/home");
    }
  }, [hydrated, isAuthenticated, user, router]);

  // Show nothing while hydrating to avoid flash of "Redirecting…"
  if (!hydrated) return null;

  if (!isAuthenticated || user?.role !== "super_admin") {
    return (
      <div className="flex h-screen items-center justify-center neural-bg">
        <p className="text-sm text-muted-foreground">Redirecting…</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen overflow-hidden neural-bg">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-30">
        <ShaderAnimation />
      </div>
      <BeyondformsSidebar role="super_admin" />
      <main className="flex-1 overflow-auto pb-20 lg:pb-0">{children}</main>
    </div>
  );
}

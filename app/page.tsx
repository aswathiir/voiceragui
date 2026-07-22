"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/authStore";

export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && user?.role === "super_admin") {
      router.replace("/admin/overview");
    } else if (isAuthenticated && user?.role === "customer") {
      router.replace("/dashboard/home");
    } else {
      router.replace("/login");
    }
  }, [isAuthenticated, user, router]);

  return (
    <div className="flex h-screen items-center justify-center" style={{ backgroundColor: "#F5F7FA" }}>
      <p className="text-sm" style={{ color: "#64748B" }}>Loading…</p>
    </div>
  );
}

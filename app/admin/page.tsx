"use client";

import { redirect } from "next/navigation";

export default function AdminRoot() {
  redirect("/admin/overview");
}

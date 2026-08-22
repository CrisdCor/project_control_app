"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-md border border-border bg-white px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-neutral-50"
    >
      Cerrar sesión
    </button>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { InactivityLogout } from "@/components/layout/inactivity-logout";

export default async function AppLayout({ children }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, email, area, cargo, role, photo_url")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <>
      <InactivityLogout />
      <AppShell profile={profile}>{children}</AppShell>
    </>
  );
}


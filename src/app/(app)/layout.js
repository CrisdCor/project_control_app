import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";

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
    .select("id, name, email, area_id, cargo, role, photo_url")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <>
      <AppShell profile={profile}>{children}</AppShell>
    </>
  );
}


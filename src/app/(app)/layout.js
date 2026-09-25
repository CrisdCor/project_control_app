import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { FloatingNav } from "@/components/layout/floating-nav";
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
    <div className="flex h-screen flex-col">
      <InactivityLogout />
      <Header profile={profile} />
      <main className="flex-1 overflow-y-auto">
        <div className="content-max h-full px-5 py-4">{children}</div>
      </main>
      <FloatingNav profile={profile} />
    </div>
  );
}


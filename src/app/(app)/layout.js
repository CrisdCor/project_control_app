import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

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
    .select("id, name, email, area, role, photo_url")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="flex h-screen flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar profile={profile} />
        <main className="flex-1 overflow-y-auto">
          <div className="content-max px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { FloatingNav } from "@/components/layout/floating-nav";

export function AppShell({ profile, children }) {
  const [navStyle, setNavStyle] = useState("floating");

  useEffect(() => {
    const stored = window.localStorage.getItem("nav-style");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === "sidebar" || stored === "floating") setNavStyle(stored);
  }, []);

  function toggleNavStyle() {
    setNavStyle((prev) => {
      const next = prev === "floating" ? "sidebar" : "floating";
      window.localStorage.setItem("nav-style", next);
      return next;
    });
  }

  if (navStyle === "sidebar") {
    return (
      <div className="flex h-screen flex-col">
        <Header profile={profile} navStyle={navStyle} onToggleNavStyle={toggleNavStyle} />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar profile={profile} />
          <main className="flex-1 overflow-y-auto">
            <div className="content-max h-full px-5 py-4">{children}</div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <Header profile={profile} navStyle={navStyle} onToggleNavStyle={toggleNavStyle} />
      <main className="flex-1 overflow-y-auto">
        <div className="content-max h-full px-5 py-4">{children}</div>
      </main>
      <FloatingNav profile={profile} />
    </div>
  );
}

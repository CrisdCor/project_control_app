"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({ profile, children }) {
  const [sidebarOn, setSidebarOn] = useState(false);
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const storedSidebar = window.localStorage.getItem("sidebar-on");
    const storedTheme = window.localStorage.getItem("theme");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (storedSidebar === "1") setSidebarOn(true);
    if (storedTheme === "dark") setTheme("dark");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  function toggleSidebar() {
    setSidebarOn((prev) => {
      const next = !prev;
      window.localStorage.setItem("sidebar-on", next ? "1" : "0");
      return next;
    });
  }

  function toggleTheme() {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      window.localStorage.setItem("theme", next);
      return next;
    });
  }

  return (
    <div className="flex h-screen flex-col">
      <Header
        profile={profile}
        sidebarOn={sidebarOn}
        onToggleSidebar={toggleSidebar}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <div className="flex flex-1 overflow-hidden">
        {sidebarOn && (
          <Sidebar
            profile={profile}
            sidebarOn={sidebarOn}
            onToggleSidebar={toggleSidebar}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        )}
        <main className="flex-1 overflow-y-auto">
          <div className="content-max h-full px-5 py-4">{children}</div>
        </main>
      </div>
    </div>
  );
}

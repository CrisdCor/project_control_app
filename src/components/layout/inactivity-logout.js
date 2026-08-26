"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos sin actividad

export function InactivityLogout() {
  const router = useRouter();
  const timerRef = useRef(null);

  useEffect(() => {
    async function handleTimeout() {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    }

    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(handleTimeout, TIMEOUT_MS);
    }

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [router]);

  return null;
}

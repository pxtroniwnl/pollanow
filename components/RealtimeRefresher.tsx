"use client";
// Se suscribe a los cambios de las tablas en vivo y refresca los Server
// Components (router.refresh()) para que la UI se actualice sola.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";

const TABLES = ["matches", "standings", "scoring", "group_probabilities", "overall_probabilities", "tournament_meta"];

export function RealtimeRefresher() {
  const router = useRouter();
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return;
    }
    const supabase = createBrowserClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 400); // debounce
    };
    const channel = supabase.channel("pollanow-live");
    for (const table of TABLES) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, refresh);
    }
    channel.subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [router]);
  return null;
}

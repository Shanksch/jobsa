import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar.js";
import { fetchHealth } from "../lib/api.js";
import { useQuery } from "@tanstack/react-query";
import { Toaster } from "@jobsa/ui";
import { supabase } from "../lib/supabase.js";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 10000, // Refresh health status every 10s
  });

  const connected = health?.status === "healthy";

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Toast Notifications */}
      <Toaster position="top-right" closeButton richColors />

      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main app body */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header bar */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-sm">Dashboard Overview</span>
          </div>

          <div className="flex items-center gap-4">
            {/* System health indicator */}
            <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium shadow-sm">
              <div
                className={`size-2 rounded-full transition-colors duration-500 ${
                  connected
                    ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                    : "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]"
                }`}
              />
              <span className="text-muted-foreground text-[11px]">
                {connected ? "Backend: Connected" : "Backend: Offline"}
              </span>
            </div>
            {/* Logout button */}
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto px-6 py-8 md:px-8">
          <div className="mx-auto max-w-5xl w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}

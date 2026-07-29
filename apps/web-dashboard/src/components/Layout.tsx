import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar.js";
import { fetchHealth } from "../lib/api.js";
import { useQuery } from "@tanstack/react-query";
import { Toaster } from "@jobsa/ui";
import { supabase } from "../lib/supabase.js";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 10000, // Refresh health status every 10s
  });

  const connected = health?.status === "healthy";

  const [isDark, setIsDark] = React.useState(() => {
    return document.documentElement.classList.contains("dark");
  });

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.theme = 'light';
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.theme = 'dark';
      setIsDark(true);
    }
  };

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
            <span className="font-semibold text-sm tracking-tight">Overview</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center size-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Toggle theme"
            >
              {isDark ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
              )}
            </button>
            {/* System health indicator */}
            <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium shadow-sm">
              <div
                className={`size-2 rounded-full transition-colors duration-500 ${connected
                  ? "bg-primary shadow-[0_0_6px_rgba(0,229,153,0.5)]"
                  : "bg-destructive shadow-[0_0_6px_rgba(239,68,68,0.5)]"
                  }`}
              />
              <span className="text-muted-foreground text-[11px]">
                {connected ? "Connected" : "Offline"}
              </span>
            </div>
            {/* Logout button */}
            <button
              onClick={() => {
                navigate("/");
                void supabase.auth.signOut();
              }}
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Content area */}
        <main key={location.pathname} className="flex-1 overflow-y-auto px-6 py-8 md:px-8 animate-slide-up">
          <div className="mx-auto max-w-5xl w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}

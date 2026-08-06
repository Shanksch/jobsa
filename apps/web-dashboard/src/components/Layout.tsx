import * as React from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar.js";
import { fetchHealth } from "../lib/api.js";
import { useQuery } from "@tanstack/react-query";
import { Toaster, cn } from "@jobsa/ui";
import { Menu, Moon, Sun } from "lucide-react";
import { MobileNav } from "./MobileNav.js";
import { motion } from "framer-motion";
import { useTheme } from "../contexts/ThemeContext.js";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const { data: health, refetch, isFetching } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 10000, // Refresh health status every 10s
  });

  const connected = health?.status === "healthy";

  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  // Close mobile menu when route changes
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-[100dvh] bg-background text-foreground selection:bg-primary/20">
      {/* Toast Notifications */}
      <Toaster position="top-right" closeButton richColors theme={isDark ? "dark" : "light"} />

      {/* Desktop Sidebar navigation */}
      <Sidebar />
      
      {/* Mobile Drawer navigation */}
      <MobileNav isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      {/* Main app body */}
      <div className="flex-1 flex flex-col min-w-0 bg-muted/10 relative">
        {/* Top Header bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/60 bg-background/70 px-4 md:px-8 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex size-9 items-center justify-center rounded-xl bg-card border border-border md:hidden text-foreground hover:bg-muted transition-colors shadow-sm"
            >
              <Menu className="size-5" />
            </button>
            <span className="font-semibold text-sm tracking-tight text-muted-foreground hidden md:inline-block">Overview</span>
          </div>

          <div className="flex items-center gap-3">
            {/* System health indicator (Premium pill) */}
            <button 
              onClick={() => refetch()}
              disabled={isFetching}
              title={connected ? "System Active" : "Click to wake up backend"}
              className="hidden md:flex items-center gap-2 rounded-full border border-border/50 bg-card/50 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-md cursor-pointer hover:bg-muted/50 transition-colors disabled:cursor-default"
            >
              <span className="flex size-2 relative">
                {(connected || isFetching) && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75" />}
                <span className={cn("relative inline-flex size-2 rounded-full", connected ? "bg-primary" : (isFetching ? "bg-amber-500" : "bg-destructive"))} />
              </span>
              <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                {isFetching ? "Waking Up..." : (connected ? "System Active" : "Offline")}
              </span>
            </button>

            <div className="h-4 w-px bg-border mx-1 hidden md:block" />

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center size-9 rounded-full bg-card border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-all shadow-sm active:scale-95"
              title="Toggle theme"
            >
              {isDark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
            </button>
          </div>
        </header>

        {/* Content area */}
        <main key={location.pathname} className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 lg:p-10 relative">
          <motion.div 
            initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
            className="mx-auto w-full max-w-6xl"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

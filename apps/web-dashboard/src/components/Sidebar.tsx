import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  User,
  FileText,
  GraduationCap,
  Briefcase,
  Sliders,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Chrome,
} from "lucide-react";
import { cn, Logo } from "@jobsa/ui";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../contexts/AuthContext.js";
import { isExtensionInstalled, CHROME_WEBSTORE_URL } from "../lib/extension.js";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Profile", path: "/profile", icon: User },
  { label: "Resumes", path: "/resumes", icon: FileText },
  { label: "Knowledge Base", path: "/knowledge", icon: GraduationCap },
  { label: "Applications", path: "/applications", icon: Briefcase },
  { label: "Settings", path: "/settings", icon: Sliders },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [extensionConnected, setExtensionConnected] = React.useState(false);
  
  React.useEffect(() => {
    isExtensionInstalled().then(setExtensionConnected);
  }, []);
  
  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    return localStorage.getItem("jobsa-sidebar-collapsed") === "true";
  });

  const toggleCollapse = () => {
    const newValue = !isCollapsed;
    setIsCollapsed(newValue);
    localStorage.setItem("jobsa-sidebar-collapsed", String(newValue));
  };

  const userEmail = session?.user?.email || "user@example.com";

  return (
    <motion.aside 
      initial={false}
      animate={{ width: isCollapsed ? 80 : 256 }}
      transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      className="hidden md:flex border-r border-border bg-card/40 flex-col shrink-0 relative shadow-[1px_0_10px_rgba(0,0,0,0.02)] z-30"
    >
      {/* Collapse Toggle */}
      <button 
        onClick={toggleCollapse}
        className="absolute -right-3 top-6 flex size-6 items-center justify-center rounded-full border border-border bg-background shadow-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors z-40"
      >
        {isCollapsed ? <ChevronRight className="size-3" /> : <ChevronLeft className="size-3" />}
      </button>

      {/* Brand logo */}
      <div className={cn("flex h-16 items-center border-b border-border transition-all duration-300", isCollapsed ? "justify-center px-0" : "px-6 gap-3")}>
        <div className="flex items-center justify-center shrink-0">
          <Logo className={cn("transition-all duration-300", isCollapsed ? "size-10" : "size-9")} />
        </div>
        {!isCollapsed && (
          <motion.span 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="font-semibold text-lg tracking-tight whitespace-nowrap"
          >
            Job<span className="text-primary">SA</span>
          </motion.span>
        )}
      </div>

      {/* Nav items list */}
      <nav className="flex-1 space-y-1.5 px-3 py-6 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                "flex items-center rounded-xl transition-all duration-200 cursor-pointer group relative",
                isCollapsed ? "justify-center py-3 px-0" : "gap-3 px-3 py-2.5",
                isActive
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground font-medium hover:bg-muted/80 hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.div 
                  layoutId="sidebar-active-indicator"
                  className={cn("absolute left-0 bg-primary rounded-r-full", isCollapsed ? "w-1 h-6" : "w-1 h-6")}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <Icon className={cn("shrink-0 transition-colors", isCollapsed ? "size-5" : "size-[18px]", isActive ? "text-primary" : "group-hover:text-foreground")} />
              
              {!isCollapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom info section */}
      <div className="p-4 border-t border-border bg-card/80">
        {!isCollapsed ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 px-1">
              <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0">
                <span className="text-xs font-bold text-primary">
                  {userEmail.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground truncate leading-tight">
                  {userEmail}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  Pro Plan
                </p>
              </div>
            </div>
            
            {extensionConnected ? (
              <div className="flex w-full items-center gap-2 rounded-lg bg-emerald-500/10 px-2 py-1.5 text-xs font-semibold text-emerald-600 border border-emerald-500/20">
                <Chrome className="size-4 shrink-0" />
                Extension Connected
              </div>
            ) : (
              <a 
                href={CHROME_WEBSTORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center gap-2 rounded-lg bg-primary/10 px-2 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
              >
                <Chrome className="size-4 shrink-0" />
                Install Extension
              </a>
            )}

            <button
              onClick={() => {
                navigate("/");
                void supabase.auth.signOut();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors group cursor-pointer"
            >
              <LogOut className="size-4 shrink-0 group-hover:text-destructive" />
              Sign out
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0 cursor-pointer" title={userEmail}>
              <span className="text-xs font-bold text-primary">
                {userEmail.charAt(0).toUpperCase()}
              </span>
            </div>
            
            {extensionConnected ? (
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" title="Extension Connected">
                <Chrome className="size-4" />
              </div>
            ) : (
              <a 
                href={CHROME_WEBSTORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                title="Install Extension"
              >
                <Chrome className="size-4" />
              </a>
            )}

            <button
              onClick={() => {
                navigate("/");
                void supabase.auth.signOut();
              }}
              title="Sign out"
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        )}
      </div>
    </motion.aside>
  );
}

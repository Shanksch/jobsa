import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  User,
  FileText,
  GraduationCap,
  Briefcase,
  Sliders,
  LogOut,
  X,
} from "lucide-react";
import { cn, Logo } from "@jobsa/ui";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "../contexts/AuthContext.js";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Profile", path: "/profile", icon: User },
  { label: "Resumes", path: "/resumes", icon: FileText },
  { label: "Knowledge Base", path: "/knowledge", icon: GraduationCap },
  { label: "Applications", path: "/applications", icon: Briefcase },
  { label: "Settings", path: "/settings", icon: Sliders },
];

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { session } = useAuth();
  
  const userEmail = session?.user?.email || "user@example.com";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm md:hidden"
          />
          
          {/* Slide-over */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="fixed inset-y-0 left-0 z-50 w-3/4 max-w-sm border-r border-border bg-card/95 p-6 shadow-2xl flex flex-col md:hidden"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex h-10 items-center gap-2">
                <Logo className="size-8" />
                <span className="font-semibold text-lg tracking-tight">
                  Job<span className="text-primary">SA</span>
                </span>
              </div>
              <button 
                onClick={onClose}
                className="rounded-full p-2 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-2">
              {navItems.map((item, i) => {
                const Icon = item.icon;
                const isActive = item.path === "/" 
                  ? location.pathname === "/" 
                  : location.pathname.startsWith(item.path);

                return (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 + 0.1, duration: 0.3 }}
                  >
                    <Link
                      to={item.path}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted/80 hover:text-foreground cursor-pointer group",
                        isActive
                          ? "bg-primary/10 text-primary hover:bg-primary/15 border border-primary/10"
                          : "text-muted-foreground border border-transparent"
                      )}
                    >
                      <Icon className={cn("size-5 shrink-0", isActive ? "text-primary" : "group-hover:text-foreground")} />
                      {item.label}
                    </Link>
                  </motion.div>
                );
              })}
            </nav>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-auto border-t border-border pt-6 pb-2"
            >
              <div className="flex items-center gap-3 px-2 mb-6">
                <div className="size-9 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                  <span className="text-xs font-bold text-primary">
                    {userEmail.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {userEmail}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    Pro Plan
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  navigate("/");
                  void supabase.auth.signOut();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors group cursor-pointer"
              >
                <LogOut className="size-5 shrink-0 group-hover:text-destructive" />
                Sign out
              </button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

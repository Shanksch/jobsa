import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  User,
  FileText,
  GraduationCap,
  Briefcase,
  Sliders,
} from "lucide-react";
import { cn } from "@jobsa/ui";

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

  return (
    <aside className="w-64 border-r border-border bg-card/60 flex flex-col shrink-0">
      {/* Brand logo */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-6">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
          J
        </div>
        <span className="font-semibold text-base tracking-tight">
          Job<span className="text-primary">SA</span>
        </span>
      </div>

      {/* Nav items list */}
      <nav className="flex-1 space-y-1 px-4 py-6">
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
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground cursor-pointer",
                isActive
                  ? "bg-primary/10 text-primary hover:bg-primary/15"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom info section */}
      <div className="p-4 border-t border-border bg-muted/20">
        <p className="text-[10px] text-muted-foreground text-center font-mono">
          JobSA Copilot v0.1.0
        </p>
      </div>
    </aside>
  );
}

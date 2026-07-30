import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Briefcase, Calendar, CheckCircle2, TrendingUp, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Badge, Skeleton } from "@jobsa/ui";
import { api } from "../lib/api.js";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { type: "spring", stiffness: 300, damping: 24 } 
  }
};

export function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["app-stats"],
    queryFn: api.applications.stats,
  });

  const { data: apps, isLoading: appsLoading } = useQuery({
    queryKey: ["recent-apps"],
    queryFn: () => api.applications.list({ limit: 5 }),
  });

  const recentApps = apps || [];

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-10"
    >
      {/* Page Title */}
      <motion.div variants={itemVariants} className="flex flex-col gap-2 mb-10">
        <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Monitor your application lifecycle, interview conversions, and overall job hunt progress in real-time.
        </p>
      </motion.div>

      {/* Grid of stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Total Applications
              </CardTitle>
              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Briefcase className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black tabular-nums tracking-tighter">
                {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.total || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">All time count</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Applied This Week
              </CardTitle>
              <div className="size-8 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-500">
                <Calendar className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black tabular-nums tracking-tighter">
                {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.this_week || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">Past 7 days activity</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Interview Rate
              </CardTitle>
              <div className="size-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                <TrendingUp className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black tabular-nums tracking-tighter">
                {statsLoading ? <Skeleton className="h-8 w-16" /> : `${stats?.interview_rate || 0.0}%`}
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">Converted submissions</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Offers Received
              </CardTitle>
              <div className="size-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <CheckCircle2 className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black tabular-nums tracking-tighter text-emerald-600 dark:text-emerald-400">
                {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.by_status?.offer || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">Total offers</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main split */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Recent Applications list */}
        <motion.div variants={itemVariants} className="md:col-span-2 flex flex-col h-full">
          <Card className="flex-1 flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/40">
              <div>
                <CardTitle className="text-lg font-bold">Recent Applications</CardTitle>
                <p className="text-xs text-muted-foreground mt-1 font-medium">Your latest job submissions</p>
              </div>
              <Link to="/applications" className="text-xs text-primary hover:text-primary/80 font-bold uppercase tracking-wider flex items-center gap-1 group">
                View all
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
              </Link>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
              {appsLoading ? (
                <div className="p-6 space-y-4">
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              ) : recentApps.length === 0 ? (
                <div className="text-center py-12 px-4 flex-1 flex flex-col items-center justify-center">
                  <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground/50">
                    <Briefcase className="size-6" />
                  </div>
                  <p className="text-sm text-foreground font-semibold mb-1">No applications yet</p>
                  <p className="text-xs text-muted-foreground mb-4 max-w-xs">Start tracking your job hunt by adding your first application.</p>
                  <Link to="/applications" className="text-xs bg-primary text-primary-foreground font-bold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-primary-glow">
                    Add Application
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {recentApps.map((app, i) => (
                    <motion.div 
                      key={app.id} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + (i * 0.05) }}
                      className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group cursor-pointer"
                    >
                      <div className="min-w-0 pr-4">
                        <p className="text-sm font-bold truncate text-foreground group-hover:text-primary transition-colors">
                          {app.role}
                        </p>
                        <p className="text-xs text-muted-foreground truncate font-medium mt-0.5">
                          {app.company}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {app.match_score !== undefined && app.match_score !== null && (
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md hidden sm:inline-block">
                            {Math.round(app.match_score * 100)}% Match
                          </span>
                        )}
                        <Badge
                          variant={
                            app.status === "offer"
                              ? "success"
                              : app.status === "interview"
                              ? "info"
                              : app.status === "rejected"
                              ? "destructive"
                              : "secondary"
                          }
                          className="min-w-[80px] justify-center"
                        >
                          {app.status}
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Column: Quick Links */}
        <motion.div variants={itemVariants} className="flex flex-col gap-4">
          <Card className="flex-1">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-lg font-bold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex flex-col gap-3">
              <Link
                to="/resumes"
                className="group flex items-center justify-between rounded-2xl border border-border/50 bg-background p-4 hover:border-primary/30 hover:shadow-glass transition-all duration-300"
              >
                <div className="text-left">
                  <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">Resumes Manager</p>
                  <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Upload and parse PDFs</p>
                </div>
                <div className="size-8 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                  <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Link>

              <Link
                to="/profile"
                className="group flex items-center justify-between rounded-2xl border border-border/50 bg-background p-4 hover:border-primary/30 hover:shadow-glass transition-all duration-300"
              >
                <div className="text-left">
                  <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">Update Profile</p>
                  <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Personal details & status</p>
                </div>
                <div className="size-8 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                  <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Link>

              <Link
                to="/knowledge"
                className="group flex items-center justify-between rounded-2xl border border-border/50 bg-background p-4 hover:border-primary/30 hover:shadow-glass transition-all duration-300"
              >
                <div className="text-left">
                  <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">Knowledge Base</p>
                  <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Skills & certifications</p>
                </div>
                <div className="size-8 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                  <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}

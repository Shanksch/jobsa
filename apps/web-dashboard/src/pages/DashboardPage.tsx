import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Briefcase, Calendar, CheckCircle2, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@jobsa/ui";
import { api } from "../lib/api.js";

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
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome to JobSA</h1>
        <p className="text-muted-foreground mt-1">
          Monitor your application lifecycle and metrics in real-time.
        </p>
      </div>

      {/* Grid of stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Applications
            </CardTitle>
            <Briefcase className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats?.total || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">All time count</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Applied This Week
            </CardTitle>
            <Calendar className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats?.this_week || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Past 7 days activity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Interview Rate
            </CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : `${stats?.interview_rate || 0.0}%`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Converted submissions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Offers Received
            </CardTitle>
            <CheckCircle2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {statsLoading ? "..." : stats?.by_status?.offer || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total offers</p>
          </CardContent>
        </Card>
      </div>

      {/* Main split */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Recent Applications list */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Recent Applications</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Your latest applications</p>
            </div>
            <Link to="/applications" className="text-xs text-primary hover:underline font-medium">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {appsLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading list...</p>
            ) : recentApps.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No applications found.</p>
                <Link to="/applications" className="text-xs text-primary hover:underline font-medium mt-1 inline-block">
                  Add your first application
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentApps.map((app) => (
                  <div key={app.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate text-foreground">{app.role}</p>
                      <p className="text-xs text-muted-foreground truncate">{app.company}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {app.match_score !== undefined && app.match_score !== null && (
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">
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
                      >
                        {app.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Profile status or Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Link
              to="/resumes"
              className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="text-left">
                <p className="text-xs font-semibold">Resumes Manager</p>
                <p className="text-[10px] text-muted-foreground">Upload and parse PDF resumes</p>
              </div>
              <span className="text-primary text-xs font-bold">→</span>
            </Link>

            <Link
              to="/profile"
              className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="text-left">
                <p className="text-xs font-semibold">Update Profile</p>
                <p className="text-[10px] text-muted-foreground">Personal details & work authorization</p>
              </div>
              <span className="text-primary text-xs font-bold">→</span>
            </Link>

            <Link
              to="/knowledge"
              className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="text-left">
                <p className="text-xs font-semibold">Knowledge Base</p>
                <p className="text-[10px] text-muted-foreground">Skills, education and certifications</p>
              </div>
              <span className="text-primary text-xs font-bold">→</span>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

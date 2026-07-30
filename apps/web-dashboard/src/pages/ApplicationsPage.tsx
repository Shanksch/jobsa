import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Trash2, ExternalLink, Briefcase, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  DataTable,
  Column,
  Button,
  Badge,
  Select,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Textarea,
  Skeleton
} from "@jobsa/ui";
import { api } from "../lib/api.js";
import type { ApplicationListItem } from "@jobsa/shared";

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

export function ApplicationsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [selectedAppId, setSelectedAppId] = React.useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [editNotes, setEditNotes] = React.useState("");
  const [editStatus, setEditStatus] = React.useState("");

  const { data: apps, isLoading } = useQuery({
    queryKey: ["applications", statusFilter, search],
    queryFn: () => api.applications.list({ status: statusFilter || undefined, search: search || undefined }),
  });

  const { data: selectedApp, isLoading: selectedLoading } = useQuery({
    queryKey: ["application", selectedAppId],
    queryFn: () => api.applications.get(selectedAppId!),
    enabled: !!selectedAppId,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.applications.update(id, data),
    onSuccess: () => {
      toast.success("Application updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["application", selectedAppId] });
      setDetailsOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update application.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.applications.delete,
    onSuccess: () => {
      toast.success("Application record deleted.");
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      setDetailsOpen(false);
      setSelectedAppId(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete application.");
    },
  });

  const handleRowClick = (app: ApplicationListItem) => {
    setSelectedAppId(app.id);
    setDetailsOpen(true);
  };

  React.useEffect(() => {
    if (selectedApp) {
      setEditNotes(selectedApp.notes || "");
      setEditStatus(selectedApp.status);
    }
  }, [selectedApp]);

  const handleUpdateSubmit = () => {
    if (!selectedAppId) return;
    updateMutation.mutate({
      id: selectedAppId,
      data: { status: editStatus, notes: editNotes },
    });
  };

  const handleDelete = () => {
    if (!selectedAppId) return;
    if (confirm("Are you sure you want to delete this application record?")) {
      deleteMutation.mutate(selectedAppId);
    }
  };

  const columns: Column<ApplicationListItem>[] = [
    {
      header: "Company",
      accessorKey: "company",
      className: "font-bold text-foreground",
    },
    {
      header: "Role / Position",
      accessorKey: "role",
      className: "font-medium",
    },
    {
      header: "ATS",
      accessorKey: "ats_platform",
      cell: (row) => <span className="capitalize text-muted-foreground font-medium">{row.ats_platform || "N/A"}</span>,
    },
    {
      header: "Status",
      cell: (row) => (
        <Badge
          variant={
            row.status === "offer"
              ? "success"
              : row.status === "interview"
              ? "info"
              : row.status === "rejected"
              ? "destructive"
              : "secondary"
          }
          className="min-w-[90px] justify-center"
        >
          {row.status}
        </Badge>
      ),
    },
    {
      header: "Match",
      cell: (row) =>
        row.match_score !== undefined && row.match_score !== null ? (
          <span className="font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md text-[11px] uppercase tracking-wider">
            {Math.round(row.match_score * 100)}%
          </span>
        ) : (
          <span className="text-muted-foreground font-semibold">-</span>
        ),
    },
    {
      header: "Applied Date",
      cell: (row) => (
        <span className="text-muted-foreground font-medium">
          {row.applied_at
            ? new Date(row.applied_at).toLocaleDateString()
            : new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: "",
      className: "text-right",
      cell: () => <ChevronRight className="size-4 text-muted-foreground ml-auto opacity-50" />
    }
  ];

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-10"
    >
      {/* Title */}
      <motion.div variants={itemVariants} className="flex flex-col gap-2 mb-10">
        <h1 className="text-4xl font-bold tracking-tight">Application Memory</h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Review details of jobs you've applied to. The Chrome extension automatically captures your applications and syncs them here.
        </p>
      </motion.div>

      {/* Filter / Search Bar */}
      <motion.div variants={itemVariants}>
        <Card className="border-border/60 bg-card/60 backdrop-blur-xl">
          <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:max-w-md group">
              <Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search by company or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-border/60 bg-background/50 pl-10 pr-4 py-2 text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary focus-visible:bg-background"
              />
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <Select
                className="w-full sm:w-48 h-11"
                options={[
                  { label: "All Statuses", value: "" },
                  { label: "Draft", value: "draft" },
                  { label: "Applied", value: "applied" },
                  { label: "Interviewing", value: "interview" },
                  { label: "Rejected", value: "rejected" },
                  { label: "Offer Received", value: "offer" },
                ]}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Applications Table */}
      <motion.div variants={itemVariants}>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : !apps || apps.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center h-[400px] rounded-3xl border-2 border-dashed border-border/60 bg-card/20 hover:bg-card/40 transition-colors duration-300">
            <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-5">
              <Briefcase className="size-8 text-muted-foreground/60" />
            </div>
            <h3 className="font-bold text-xl mb-2">No applications found</h3>
            <p className="text-sm text-muted-foreground font-medium max-w-sm leading-relaxed mb-6">
              Use the JobSA Chrome Extension on supported job boards to automatically track your applications here.
            </p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={apps}
            onRowClick={handleRowClick}
            emptyMessage="No job applications found matching your criteria."
            className="border-none shadow-xl shadow-black/5 bg-card/80 backdrop-blur-xl"
          />
        )}
      </motion.div>

      {/* Details / Edit Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-0 gap-0 border-border/50 bg-background/95 backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
          {selectedLoading || !selectedApp ? (
            <div className="p-8 space-y-6">
              <Skeleton className="h-8 w-2/3" />
              <div className="grid grid-cols-2 gap-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <>
              <DialogHeader className="p-8 pb-6 border-b border-border/40 bg-muted/10 relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-sky-500 to-emerald-500" />
                <DialogTitle className="text-2xl font-bold flex flex-col gap-1 tracking-tight">
                  <span className="text-foreground">{selectedApp.role}</span>
                  <span className="text-muted-foreground text-lg font-medium">{selectedApp.company}</span>
                </DialogTitle>
                <DialogDescription className="mt-2 text-xs font-semibold uppercase tracking-widest">
                  Application Record
                </DialogDescription>
              </DialogHeader>

              <div className="p-8 space-y-8 text-sm text-foreground/90">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Application Status</label>
                    <Select
                      className="w-full bg-background/50 h-11"
                      options={[
                        { label: "Draft", value: "draft" },
                        { label: "Applied", value: "applied" },
                        { label: "Interviewing", value: "interview" },
                        { label: "Rejected", value: "rejected" },
                        { label: "Offer", value: "offer" },
                      ]}
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Platform Detected</label>
                    <div className="h-11 flex items-center px-4 bg-muted/30 rounded-xl border border-border/40 font-semibold capitalize">
                      {selectedApp.ats_platform || "Unknown"}
                    </div>
                  </div>
                </div>

                {selectedApp.posting_url && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Original Job Posting</label>
                    <a 
                      href={selectedApp.posting_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="group flex items-center gap-2 p-3 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted hover:border-primary/30 transition-all text-xs font-medium text-foreground overflow-hidden"
                    >
                      <ExternalLink className="size-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="truncate">{selectedApp.posting_url}</span>
                    </a>
                  </div>
                )}

                {/* Generated Answers */}
                {selectedApp.generated_answers && Object.keys(selectedApp.generated_answers).length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-border/40">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                      <span className="size-2 rounded-full bg-primary animate-pulse" />
                      AI Generated Form Answers
                    </label>
                    <div className="rounded-2xl border border-border/50 bg-background shadow-glass-inset overflow-hidden">
                      <div className="divide-y divide-border/40">
                        {Object.entries(selectedApp.generated_answers).map(([question, answer], index) => (
                          <div key={index} className="p-4 hover:bg-muted/10 transition-colors">
                            <p className="font-bold text-xs text-foreground mb-1.5 leading-relaxed">{question}</p>
                            <p className="text-muted-foreground text-[13px] whitespace-pre-wrap leading-relaxed">{answer}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-4 border-t border-border/40">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Personal Notes</label>
                  <Textarea
                    placeholder="Enter interview notes, follow-ups, timeline details..."
                    className="min-h-[120px] bg-background/50 rounded-2xl resize-y"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter className="flex items-center justify-between p-6 border-t border-border/40 bg-muted/10 rounded-b-[2rem]">
                <Button variant="ghost" onClick={handleDelete} className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0 h-11 px-4">
                  <Trash2 className="size-4 mr-2" /> Delete
                </Button>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setDetailsOpen(false)} className="h-11">
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateSubmit} disabled={updateMutation.isPending} className="h-11 shadow-primary-glow px-8">
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

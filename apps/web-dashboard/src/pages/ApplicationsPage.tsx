import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Eye, Trash2, SlidersHorizontal, FileEdit } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  DataTable,
  Column,
  Button,
  Badge,
  Input,
  Select,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Textarea,
} from "@jobsa/ui";
import { api } from "../lib/api.js";
import type { ApplicationListItem } from "@jobsa/shared";

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
      toast.success("Application updated.");
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
      className: "font-semibold text-foreground",
    },
    {
      header: "Role / Position",
      accessorKey: "role",
    },
    {
      header: "ATS",
      accessorKey: "ats_platform",
      cell: (row) => <span className="capitalize">{row.ats_platform || "N/A"}</span>,
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
        >
          {row.status}
        </Badge>
      ),
    },
    {
      header: "Match Score",
      cell: (row) =>
        row.match_score !== undefined && row.match_score !== null ? (
          <span className="font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">
            {Math.round(row.match_score * 100)}%
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      header: "Applied Date",
      cell: (row) =>
        row.applied_at
          ? new Date(row.applied_at).toLocaleDateString()
          : new Date(row.created_at).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Application Memory</h1>
        <p className="text-muted-foreground mt-1">
          Review details of jobs you've applied to and modify application history.
        </p>
      </div>

      {/* Filter / Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by company or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Select
              className="w-full sm:w-44"
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

      {/* Applications Table */}
      {isLoading ? (
        <div className="text-center py-12 text-sm text-muted-foreground">Loading applications...</div>
      ) : (
        <DataTable
          columns={columns}
          data={apps || []}
          onRowClick={handleRowClick}
          emptyMessage="No job applications found."
        />
      )}

      {/* Details / Edit Drawer Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedLoading || !selectedApp ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Loading details...</div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedApp.role} <span className="text-muted-foreground text-sm font-normal">at</span> {selectedApp.company}
                </DialogTitle>
                <DialogDescription>
                  Review matching details, parsed questions, and generated answers.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4 text-sm leading-relaxed text-foreground/80">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">Status</p>
                    <Select
                      className="mt-1.5"
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
                  <div>
                    <p className="font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">ATS Platform</p>
                    <p className="mt-2.5 font-medium capitalize">{selectedApp.ats_platform || "N/A"}</p>
                  </div>
                </div>

                {selectedApp.posting_url && (
                  <div>
                    <p className="font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">Job Posting URL</p>
                    <a href={selectedApp.posting_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium text-xs break-all block mt-1">
                      {selectedApp.posting_url}
                    </a>
                  </div>
                )}

                {/* Generated Answers */}
                {selectedApp.generated_answers && Object.keys(selectedApp.generated_answers).length > 0 && (
                  <div className="border border-border rounded-lg bg-muted/20 p-4 space-y-3">
                    <p className="font-bold text-xs uppercase text-muted-foreground tracking-wider">AI Generated Answers</p>
                    <div className="divide-y divide-border space-y-3">
                      {Object.entries(selectedApp.generated_answers).map(([question, answer], index) => (
                        <div key={index} className="pt-3 first:pt-0">
                          <p className="font-semibold text-foreground text-xs">{question}</p>
                          <p className="text-muted-foreground mt-1 text-xs whitespace-pre-wrap leading-relaxed">{answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">Personal Notes</p>
                  <Textarea
                    placeholder="Enter interviews logs, follow-up dates, context..."
                    className="mt-1.5 text-xs"
                    rows={4}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter className="flex items-center justify-between border-t border-border pt-4">
                <Button variant="ghost" onClick={handleDelete} className="text-destructive hover:bg-destructive/10 shrink-0">
                  <Trash2 className="size-4 mr-1.5" /> Delete Record
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                    Close
                  </Button>
                  <Button onClick={handleUpdateSubmit} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

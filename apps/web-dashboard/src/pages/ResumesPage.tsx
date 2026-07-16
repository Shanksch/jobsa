import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FileText, Trash2, CheckCircle2, Star, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  Button,
  Badge,
  FileUpload,
  Input,
} from "@jobsa/ui";
import { api } from "../lib/api.js";

export function ResumesPage() {
  const queryClient = useQueryClient();
  const [uploadModalOpen, setUploadModalOpen] = React.useState(false);
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [resumeName, setResumeName] = React.useState("");
  const [isPrimary, setIsPrimary] = React.useState(false);

  const { data: resumes, isLoading } = useQuery({
    queryKey: ["resumes"],
    queryFn: api.resumes.list,
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, name, primary }: { file: File; name: string; primary: boolean }) =>
      api.resumes.upload(file, name, primary),
    onSuccess: () => {
      toast.success("Resume uploaded, parsed, and imported into your profile successfully.");
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
      setUploadModalOpen(false);
      setPendingFile(null);
      setResumeName("");
      setIsPrimary(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to parse resume.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.resumes.delete,
    onSuccess: () => {
      toast.success("Resume deleted.");
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete resume.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.resumes.update(id, data),
    onSuccess: () => {
      toast.success("Resume details updated.");
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update resume.");
    },
  });

  const handleFileSelect = (file: File) => {
    setPendingFile(file);
    // Auto-generate name based on file name minus extension
    const cleanName = file.name.split(".").slice(0, -1).join(" ");
    setResumeName(cleanName || "My Resume");
    setUploadModalOpen(true);
  };

  const handleUploadSubmit = () => {
    if (!pendingFile || !resumeName.trim()) return;
    uploadMutation.mutate({
      file: pendingFile,
      name: resumeName,
      primary: isPrimary,
    });
  };

  const handleSetPrimary = (id: string) => {
    updateMutation.mutate({ id, data: { is_primary: true } });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this resume? This cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Resume Manager</h1>
        <p className="text-muted-foreground mt-1">
          Store multiple targeted resumes. Best-matching templates will be recommended during application.
        </p>
      </div>

      {/* Grid: Uploader (left) & List (right) */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Upload Zone */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Upload New Resume</CardTitle>
            <CardDescription>Drag and drop a PDF or DOCX file.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileUpload
              onFileSelect={handleFileSelect}
              isLoading={uploadMutation.isPending}
            />
            {pendingFile && (
              <div className="space-y-4 pt-4 border-t border-border mt-4">
                <Input
                  label="Resume Label"
                  placeholder="e.g. AI / ML Resume"
                  value={resumeName}
                  onChange={(e) => setResumeName(e.target.value)}
                  disabled={uploadMutation.isPending}
                />
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="make-primary"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                    disabled={uploadMutation.isPending}
                    className="size-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="make-primary" className="text-sm font-medium text-foreground cursor-pointer">
                    Set as Primary Resume
                  </label>
                </div>
                <Button
                  className="w-full"
                  onClick={handleUploadSubmit}
                  disabled={!resumeName.trim() || uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? "Parsing & Uploading..." : "Upload & Parse"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumes List */}
        <div className="md:col-span-2 space-y-4">
          {isLoading ? (
            <div className="text-center py-12 text-sm text-muted-foreground">Loading resumes...</div>
          ) : !resumes || resumes.length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-12 border-dashed border-2 text-center h-[280px]">
              <FileText className="size-12 text-muted-foreground mb-4 opacity-40" />
              <h3 className="font-semibold text-lg">No resumes uploaded yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Upload your first resume on the left to start extracting career details automatically.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {resumes.map((resume) => (
                <Card key={resume.id} className="relative flex flex-col justify-between overflow-hidden">
                  {resume.is_primary && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-bl">
                      Primary
                    </div>
                  )}

                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 truncate">
                      <FileText className="size-4 text-primary shrink-0" />
                      {resume.name}
                    </CardTitle>
                    <CardDescription className="text-xs truncate">{resume.file_name}</CardDescription>
                  </CardHeader>

                  <CardContent className="pb-4">
                    <p className="text-[11px] text-muted-foreground">
                      Size: {(resume.file_size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Uploaded: {new Date(resume.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>

                  <CardFooter className="pt-0 border-t border-border flex items-center justify-between bg-muted/20 py-2">
                    <div className="flex gap-1.5">
                      <Link to={`/resumes/${resume.id}`}>
                        <Button variant="ghost" size="icon" className="size-7 hover:bg-background shadow-none">
                          <Eye className="size-3.5" />
                        </Button>
                      </Link>
                      {!resume.is_primary && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSetPrimary(resume.id)}
                          className="size-7 hover:bg-background shadow-none"
                          title="Mark as primary"
                        >
                          <Star className="size-3.5 text-amber-500" />
                        </Button>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(resume.id)}
                      className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive shadow-none"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FileText, Trash2, Star, Eye, UploadCloud, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  Button,
  FileUpload,
  Input,
  Skeleton,
} from "@jobsa/ui";
import { api } from "../lib/api.js";

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

export function ResumesPage() {
  const queryClient = useQueryClient();
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
    const cleanName = file.name.split(".").slice(0, -1).join(" ");
    setResumeName(cleanName || "My Resume");
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
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-10"
    >
      {/* Title */}
      <motion.div variants={itemVariants} className="flex flex-col gap-2 mb-10">
        <h1 className="text-4xl font-bold tracking-tight">Resume Manager</h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Store multiple targeted resumes. Best-matching templates will be recommended when applying. Our AI automatically extracts your career history to enrich your profile.
        </p>
      </motion.div>

      {/* Grid: Uploader (left) & List (right) */}
      <div className="grid gap-6 md:grid-cols-3 items-start">
        {/* Upload Zone */}
        <motion.div variants={itemVariants} className="md:col-span-1">
          <Card className="h-fit sticky top-24">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <UploadCloud className="size-5 text-primary" />
                Upload Resume
              </CardTitle>
              <CardDescription className="text-xs font-medium">Drag and drop a PDF or DOCX file.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <FileUpload
                onFileSelect={handleFileSelect}
                isLoading={uploadMutation.isPending}
              />
              {pendingFile && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-4 pt-4 border-t border-border/40 overflow-hidden"
                >
                  <Input
                    label="Resume Label"
                    placeholder="e.g. AI / ML Resume"
                    value={resumeName}
                    onChange={(e) => setResumeName(e.target.value)}
                    disabled={uploadMutation.isPending}
                  />
                  <div className="flex items-center gap-2 bg-muted/30 p-3 rounded-xl border border-border/40 hover:bg-muted/50 transition-colors cursor-pointer group" onClick={() => setIsPrimary(!isPrimary)}>
                    <input
                      type="checkbox"
                      id="make-primary"
                      checked={isPrimary}
                      onChange={(e) => setIsPrimary(e.target.checked)}
                      disabled={uploadMutation.isPending}
                      className="size-4 rounded-md border-border text-primary focus:ring-primary focus:ring-offset-background cursor-pointer"
                    />
                    <label htmlFor="make-primary" className="text-xs font-semibold text-foreground cursor-pointer group-hover:text-primary transition-colors flex-1 select-none">
                      Set as Primary Resume
                    </label>
                  </div>
                  <Button
                    className="w-full shadow-primary-glow"
                    onClick={handleUploadSubmit}
                    disabled={!resumeName.trim() || uploadMutation.isPending}
                  >
                    {uploadMutation.isPending ? "Parsing..." : "Upload & Parse"}
                  </Button>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Resumes List */}
        <motion.div variants={itemVariants} className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Your Resumes</h2>
            <span className="text-xs font-bold text-muted-foreground/60">{resumes?.length || 0} Total</span>
          </div>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-44 w-full" />
              ))}
            </div>
          ) : !resumes || resumes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center h-[300px] rounded-3xl border-2 border-dashed border-border/60 bg-card/20 hover:bg-card/40 hover:border-primary/30 transition-all duration-300 group">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
                <FileText className="size-8 text-muted-foreground/60 group-hover:text-primary transition-colors" />
              </div>
              <h3 className="font-bold text-lg mb-2">No resumes yet</h3>
              <p className="text-xs text-muted-foreground font-medium max-w-[250px] leading-relaxed">
                Upload your first resume to automatically extract your skills, experience, and education.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {resumes.map((resume, i) => (
                <motion.div 
                  key={resume.id} 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + (i * 0.05), type: "spring", stiffness: 300, damping: 25 }}
                  className="group"
                >
                  <Card className="flex flex-col justify-between h-full group-hover:-translate-y-1 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20">
                    {resume.is_primary && (
                      <div className="absolute top-4 right-4 bg-primary/10 text-primary border border-primary/20 text-[9px] uppercase tracking-widest font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm z-10 backdrop-blur-md">
                        <Star className="size-3 fill-primary" />
                        Primary
                      </div>
                    )}

                    <CardHeader className="pb-3 pt-6 pr-24 border-b border-border/20 bg-muted/10 group-hover:bg-primary/[0.02] transition-colors">
                      <CardTitle className="text-base font-bold flex items-center gap-2 truncate group-hover:text-primary transition-colors">
                        <FileText className="size-5 text-primary shrink-0 opacity-80" />
                        {resume.name}
                      </CardTitle>
                      <CardDescription className="text-xs truncate font-medium mt-1">{resume.file_name}</CardDescription>
                    </CardHeader>

                    <CardContent className="pt-4 pb-4 flex-1">
                      <div className="flex justify-between items-center bg-background rounded-xl p-3 border border-border/40 shadow-sm">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60 mb-0.5">Size</span>
                          <span className="text-xs font-semibold text-foreground">{(resume.file_size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                        <div className="w-px h-8 bg-border/60 mx-2" />
                        <div className="flex flex-col text-right">
                          <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60 mb-0.5">Uploaded</span>
                          <span className="text-xs font-semibold text-foreground">{new Date(resume.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-0 pb-4 px-4 flex items-center justify-between gap-2">
                      <div className="flex gap-2 w-full">
                        <Link to={`/resumes/${resume.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full text-xs hover:bg-primary/5 hover:text-primary hover:border-primary/20 bg-background group/btn">
                            <Eye className="size-3.5 group-hover/btn:scale-110 transition-transform" />
                            View
                          </Button>
                        </Link>
                        {!resume.is_primary && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleSetPrimary(resume.id)}
                            className="size-9 shrink-0 hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/30 bg-background group/star"
                            title="Set as primary"
                          >
                            <Star className="size-4 text-muted-foreground group-hover/star:text-amber-500 group-hover/star:scale-110 transition-all" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(resume.id)}
                          className="size-9 shrink-0 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 bg-background group/trash"
                          title="Delete resume"
                        >
                          <Trash2 className="size-4 text-muted-foreground group-hover/trash:text-destructive group-hover/trash:scale-110 transition-all" />
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

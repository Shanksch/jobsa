import * as React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Download, FileText, Database, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Skeleton
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

export function ResumeDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: resume, isLoading, isError } = useQuery({
    queryKey: ["resume", id],
    queryFn: () => api.resumes.get(id!),
    enabled: !!id,
  });

  const queryClient = useQueryClient();
  const [isImporting, setIsImporting] = React.useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !resume) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <FileText className="size-8 text-destructive" />
        </div>
        <p className="text-lg font-bold">Resume Not Found</p>
        <p className="text-sm text-muted-foreground mt-1 mb-6">We couldn't load the details for this document.</p>
        <Link to="/resumes">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="size-4" /> Back to Resumes
          </Button>
        </Link>
      </div>
    );
  }

  const downloadUrl = api.resumes.getDownloadUrl(resume.id);

  const handleImport = async () => {
    try {
      setIsImporting(true);
      await api.resumes.import(resume.id);
      toast.success("Resume data imported successfully to Knowledge Base!");
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to import resume data.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-10"
    >
      {/* Action Bar */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-background/50 backdrop-blur-xl border border-border/40 p-4 rounded-2xl shadow-sm">
        <Link to="/resumes" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors bg-muted/20 px-4 py-2 rounded-xl hover:bg-primary/5">
          <ArrowLeft className="size-4" /> Back
        </Link>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={handleImport}
            disabled={isImporting || !resume.parsed_sections}
            className="flex-1 sm:flex-none flex items-center gap-2 bg-background hover:border-primary/40 hover:bg-primary/5"
          >
            <Sparkles className="size-4 text-primary" />
            {isImporting ? "Importing..." : "Sync to Knowledge Base"}
          </Button>
          <a href={downloadUrl} download className="flex-1 sm:flex-none">
            <Button className="w-full flex items-center gap-2 shadow-primary-glow">
              <Download className="size-4" /> Download PDF
            </Button>
          </a>
        </div>
      </motion.div>

      {/* Header Info */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between gap-6 items-start sm:items-center bg-card/40 border border-border/40 rounded-[2rem] p-8 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] border border-primary/20">
            <FileText className="size-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{resume.name}</h1>
            <p className="text-sm font-medium text-muted-foreground mt-1">{resume.file_name}</p>
          </div>
        </div>
        <div className="flex gap-6 text-xs uppercase tracking-widest font-bold text-muted-foreground/60 bg-background/50 p-4 rounded-xl border border-border/40">
          <div className="flex flex-col items-end">
            <span className="text-[10px] mb-1">File Size</span>
            <span className="text-foreground">{(resume.file_size / 1024 / 1024).toFixed(2)} MB</span>
          </div>
          <div className="w-px h-8 bg-border/60" />
          <div className="flex flex-col items-end">
            <span className="text-[10px] mb-1">Upload Date</span>
            <span className="text-foreground">{new Date(resume.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </motion.div>

      {/* Detail Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="structured" className="w-full">
          <TabsList className="mb-6 h-12 w-full justify-start bg-muted/20 border border-border/40 p-1 rounded-xl">
            <TabsTrigger value="structured" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider rounded-lg data-[state=active]:shadow-sm">
              <Database className="size-4" /> Structured Sections
            </TabsTrigger>
            <TabsTrigger value="markdown" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider rounded-lg data-[state=active]:shadow-sm">
              <FileText className="size-4" /> Raw Markdown
            </TabsTrigger>
          </TabsList>

          {/* Structured JSON */}
          <TabsContent value="structured" className="mt-0">
            <Card className="border-border/60 bg-card/40 backdrop-blur-xl shadow-sm rounded-[2rem] overflow-hidden">
              <CardHeader className="border-b border-border/40 bg-muted/10 pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Database className="size-5 text-primary" /> AI Parsed Data
                </CardTitle>
                <CardDescription className="text-xs font-medium">These structured objects are passed to the Copilot during application generation.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="bg-[#0D1117] p-6 overflow-x-auto max-h-[600px] overflow-y-auto">
                  <pre className="text-xs font-mono whitespace-pre leading-relaxed text-[#c9d1d9] selection:bg-[#1f6feb]">
                    {JSON.stringify(resume.parsed_sections, null, 2) || "No structured sections found. Try re-uploading."}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Markdown Content */}
          <TabsContent value="markdown" className="mt-0">
            <Card className="border-border/60 bg-card/40 backdrop-blur-xl shadow-sm rounded-[2rem] overflow-hidden">
              <CardHeader className="border-b border-border/40 bg-muted/10 pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <FileText className="size-5 text-primary" /> Raw Extracted Text
                </CardTitle>
                <CardDescription className="text-xs font-medium">The literal text extracted from the PDF before structuring.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="bg-[#0D1117] p-6 overflow-x-auto max-h-[600px] overflow-y-auto">
                  <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed text-[#c9d1d9] selection:bg-[#1f6feb]">
                    {resume.parsed_markdown || "No markdown content extracted."}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}

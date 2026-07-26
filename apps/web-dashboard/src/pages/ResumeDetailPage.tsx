import * as React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Download, FileText, Database } from "lucide-react";
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
} from "@jobsa/ui";
import { api } from "../lib/api.js";

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
    return <div className="text-center py-12 text-sm text-muted-foreground">Loading resume details...</div>;
  }

  if (isError || !resume) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-destructive">Failed to load resume details.</p>
        <Link to="/resumes" className="text-xs text-primary hover:underline font-medium mt-2 inline-block">
          Back to Resumes
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
      // Optionally invalidate knowledge base queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to import resume data.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div className="flex items-center justify-between">
        <Link to="/resumes" className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to Resumes
        </Link>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleImport}
            disabled={isImporting || !resume.parsed_sections}
            className="flex items-center gap-1.5"
          >
            <Database className="size-3.5" />
            {isImporting ? "Importing..." : "Import to Knowledge Base"}
          </Button>
          <a href={downloadUrl} download>
            <Button size="sm" className="flex items-center gap-1.5">
              <Download className="size-3.5" /> Download File
            </Button>
          </a>
        </div>
      </div>

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start bg-card/40 border border-border rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileText className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{resume.name}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{resume.file_name}</p>
          </div>
        </div>
        <div className="text-xs text-muted-foreground space-y-1 sm:text-right font-medium">
          <p>Size: {(resume.file_size / 1024 / 1024).toFixed(2)} MB</p>
          <p>Uploaded: {new Date(resume.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Detail Tabs */}
      <Tabs defaultValue="markdown" className="w-full">
        <TabsList>
          <TabsTrigger value="markdown" className="flex items-center gap-1.5">
            <FileText className="size-3.5" /> Markdown Content
          </TabsTrigger>
          <TabsTrigger value="structured" className="flex items-center gap-1.5">
            <Database className="size-3.5" /> Extracted Sections
          </TabsTrigger>
        </TabsList>

        {/* Markdown Content */}
        <TabsContent value="markdown" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Extracted Markdown representation</CardTitle>
              <CardDescription>This is the markdown text extracted directly from the resume file.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/40 rounded-lg p-5 border border-border overflow-x-auto max-h-[600px] overflow-y-auto">
                <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed text-foreground/80">
                  {resume.parsed_markdown || "No markdown content extracted."}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Structured JSON */}
        <TabsContent value="structured" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Structured JSON Sections</CardTitle>
              <CardDescription>These are the parsed data sections extracted using the LLM parser.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/40 rounded-lg p-5 border border-border overflow-x-auto max-h-[600px] overflow-y-auto">
                <pre className="text-xs font-mono whitespace-pre leading-relaxed text-foreground/80">
                  {JSON.stringify(resume.parsed_sections, null, 2) || "No structured sections found."}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

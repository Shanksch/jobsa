import * as React from "react";
import { UploadCloud, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "../lib/utils.js";
import { Button } from "./button.js";

export interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSizeMB?: number;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

export function FileUpload({
  onFileSelect,
  accept = ".pdf,.docx,.doc",
  maxSizeMB = 10,
  isLoading = false,
  error = null,
  className,
}: FileUploadProps) {
  const [dragActive, setDragActive] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFile = (file: File): boolean => {
    setValidationError(null);

    // Validate type
    const fileExt = `.${file.name.split(".").pop()?.toLowerCase()}`;
    const acceptedTypes = accept.split(",").map((t) => t.trim().toLowerCase());
    if (!acceptedTypes.includes(fileExt)) {
      setValidationError(`Invalid file type. Accepted: ${accept}`);
      return false;
    }

    // Validate size
    if (file.size > maxSizeMB * 1024 * 1024) {
      setValidationError(`File size exceeds limit (${maxSizeMB}MB).`);
      return false;
    }

    return true;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        onFileSelect(file);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        onFileSelect(file);
      }
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={!selectedFile ? onButtonClick : undefined}
        className={cn(
          "relative flex flex-col items-center justify-center min-h-[160px] p-6 text-center border rounded-lg bg-card transition-all duration-200",
          !selectedFile && "cursor-pointer group hover:bg-muted/50",
          dragActive
            ? "border-primary bg-primary/5 shadow-[0_0_15px_rgba(0,229,153,0.1)]"
            : "border-border hover:border-primary/50",
          isLoading && "opacity-60 pointer-events-none"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          style={{ display: 'none' }}
          accept={accept}
          onChange={handleChange}
          disabled={isLoading}
        />

        {selectedFile ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {isLoading ? (
                <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileText className="size-5" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground max-w-[240px] truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            {!isLoading && (
              <div className="flex items-center gap-1.5 mt-1">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span className="text-xs text-emerald-600 font-medium tracking-tight">Ready</span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-3 text-xs h-8"
              onClick={(e) => {
                e.stopPropagation();
                onButtonClick();
              }}
              disabled={isLoading}
            >
              Choose different file
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground group-hover:text-primary transition-colors group-hover:scale-110 duration-200">
              <UploadCloud className="size-5" />
            </div>
            <div className="mt-2">
              <p className="text-sm font-medium text-foreground">
                Click or drag file to upload
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF or DOCX up to {maxSizeMB}MB
              </p>
            </div>
          </div>
        )}
      </div>

      {(validationError || error) && (
        <div className="flex items-center gap-2 mt-2 text-destructive">
          <AlertCircle className="size-4" />
          <span className="text-xs font-medium">{validationError || error}</span>
        </div>
      )}
    </div>
  );
}

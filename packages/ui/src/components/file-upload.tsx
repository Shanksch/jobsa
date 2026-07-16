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
        className={cn(
          "relative flex flex-col items-center justify-center min-h-[180px] p-6 text-center border-2 border-dashed rounded-xl bg-card transition-all duration-200",
          dragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50",
          isLoading && "opacity-60 pointer-events-none"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          onChange={handleChange}
          disabled={isLoading}
        />

        {selectedFile ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {isLoading ? (
                <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileText className="size-6" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground max-w-[240px] truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            {!isLoading && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span className="text-xs text-emerald-600 font-medium">Ready</span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onButtonClick}
              disabled={isLoading}
            >
              Choose different file
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground group-hover:text-primary transition-colors">
              <UploadCloud className="size-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Drag and drop your resume here, or{" "}
                <button
                  type="button"
                  onClick={onButtonClick}
                  className="text-primary hover:underline font-semibold cursor-pointer"
                >
                  browse
                </button>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports PDF, DOCX (Max {maxSizeMB}MB)
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

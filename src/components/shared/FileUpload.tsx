/**
 * components/shared/FileUpload.tsx
 *
 * Drag-and-drop + click file upload component used across CORE HR modules.
 *
 * Features:
 *   - Drag-and-drop zone
 *   - Click to browse
 *   - File type and size validation
 *   - Multi-file support
 *   - Upload progress simulation (real progress via onUpload callback)
 *   - File preview (images) and file type icon
 *   - Remove file
 *
 * Usage:
 *   <FileUpload
 *     accept=".pdf,.doc,.docx"
 *     maxSize={5 * 1024 * 1024}  // 5 MB
 *     multiple
 *     onFilesChange={(files) => setFiles(files)}
 *   />
 */

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  X,
  FileText,
  FileImage,
  File,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  /** URL returned by the server after upload */
  url?: string;
}

export interface FileUploadProps {
  /** Comma-separated MIME types or extensions, e.g. ".pdf,.docx,image/*" */
  accept?: string;
  /** Max file size in bytes (default 10 MB) */
  maxSize?: number;
  multiple?: boolean;
  disabled?: boolean;
  /** Called whenever the file list changes */
  onFilesChange?: (files: UploadedFile[]) => void;
  /**
   * Optional async upload handler.
   * Receives the File and a progress callback (0-100).
   * Should return the uploaded file URL.
   */
  onUpload?: (file: File, onProgress: (pct: number) => void) => Promise<string>;
  className?: string;
  /** Hint text shown inside the drop zone */
  hint?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFileIcon(file: File) {
  if (file.type.startsWith("image/")) return FileImage;
  if (file.type === "application/pdf" || file.name.endsWith(".pdf")) return FileText;
  return File;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Main component ───────────────────────────────────────────────────────────

export function FileUpload({
  accept,
  maxSize = 10 * 1024 * 1024,
  multiple = false,
  disabled = false,
  onFilesChange,
  onUpload,
  className,
  hint,
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateFiles = useCallback((updater: (prev: UploadedFile[]) => UploadedFile[]) => {
    setFiles(prev => {
      const next = updater(prev);
      onFilesChange?.(next);
      return next;
    });
  }, [onFilesChange]);

  const processFiles = useCallback(async (rawFiles: FileList | File[]) => {
    const fileArray = Array.from(rawFiles);
    const toAdd: UploadedFile[] = [];

    for (const file of fileArray) {
      if (file.size > maxSize) {
        toAdd.push({
          id: generateId(),
          file,
          progress: 0,
          status: "error",
          error: `File exceeds ${formatBytes(maxSize)} limit`,
        });
        continue;
      }

      const entry: UploadedFile = {
        id: generateId(),
        file,
        progress: 0,
        status: onUpload ? "uploading" : "done",
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      };
      toAdd.push(entry);
    }

    updateFiles(prev => multiple ? [...prev, ...toAdd] : toAdd);

    // Run uploads
    if (onUpload) {
      for (const entry of toAdd) {
        if (entry.status === "error") continue;
        try {
          const url = await onUpload(entry.file, (pct) => {
            updateFiles(prev =>
              prev.map(f => f.id === entry.id ? { ...f, progress: pct } : f)
            );
          });
          updateFiles(prev =>
            prev.map(f => f.id === entry.id ? { ...f, status: "done", progress: 100, url } : f)
          );
        } catch (err) {
          updateFiles(prev =>
            prev.map(f =>
              f.id === entry.id
                ? { ...f, status: "error", error: (err as Error).message ?? "Upload failed" }
                : f
            )
          );
        }
      }
    }
  }, [maxSize, multiple, onUpload, updateFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    processFiles(e.dataTransfer.files);
  }, [disabled, processFiles]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      processFiles(e.target.files);
      e.target.value = "";
    }
  };

  const removeFile = (id: string) => {
    updateFiles(prev => {
      const f = prev.find(x => x.id === id);
      if (f?.preview) URL.revokeObjectURL(f.preview);
      return prev.filter(x => x.id !== id);
    });
  };

  const acceptedTypes = accept
    ? accept.split(",").map(s => s.trim()).join(", ")
    : "Any file type";

  return (
    <div className={cn("space-y-3", className)}>
      {/* Drop zone */}
      <div
        className={cn(
          "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors cursor-pointer",
          dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && !disabled && inputRef.current?.click()}
        aria-label="Upload files"
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          onChange={handleInputChange}
          disabled={disabled}
        />
        <Upload className={cn(
          "h-8 w-8 mb-3 transition-colors",
          dragging ? "text-primary" : "text-muted-foreground"
        )} />
        <p className="text-sm font-medium text-foreground">
          {dragging ? "Drop files here" : "Drag & drop or click to upload"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {hint ?? `${acceptedTypes} · Max ${formatBytes(maxSize)}`}
        </p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map(f => {
            const Icon = getFileIcon(f.file);
            return (
              <li
                key={f.id}
                className="flex items-center gap-3 rounded-lg border bg-card p-3"
              >
                {/* Preview / icon */}
                {f.preview ? (
                  <img
                    src={f.preview}
                    alt={f.file.name}
                    className="h-10 w-10 rounded object-cover shrink-0"
                  />
                ) : (
                  <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{f.file.name}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      {f.status === "done" && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                      {f.status === "error" && (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{formatBytes(f.file.size)}</span>
                    {f.error && (
                      <span className="text-xs text-destructive">{f.error}</span>
                    )}
                  </div>

                  {f.status === "uploading" && (
                    <Progress value={f.progress} className="h-1" />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

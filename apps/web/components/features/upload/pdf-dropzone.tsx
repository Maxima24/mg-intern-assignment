'use client';

import { FileText, UploadCloud, X } from 'lucide-react';
import { useCallback } from 'react';
import { type FileRejection, useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';

const MAX_BYTES = 10 * 1024 * 1024;

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface PdfDropzoneProps {
  file: File | null;
  onFile: (file: File | null) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}

export function PdfDropzone({ file, onFile, onError, disabled }: PdfDropzoneProps) {
  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      if (rejected.length > 0) {
        const code = rejected[0]?.errors[0]?.code;
        const message =
          code === 'file-too-large'
            ? 'That PDF is larger than 10 MB.'
            : code === 'file-invalid-type'
              ? 'Only PDF files are allowed.'
              : 'That file could not be accepted.';
        onFile(null);
        onError?.(message);
        return;
      }
      if (accepted[0]) onFile(accepted[0]);
    },
    [onFile, onError],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: MAX_BYTES,
    multiple: false,
    disabled,
  });

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-border bg-surface-2 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <FileText className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-xs text-muted-foreground">{humanSize(file.size)}</p>
        </div>
        <button
          type="button"
          onClick={() => onFile(null)}
          disabled={disabled}
          className="rounded-sm p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          aria-label="Remove file"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-surface-2 px-6 py-10 text-center transition-colors',
        isDragActive && 'border-primary bg-primary/5',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <input {...getInputProps()} />
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
        <UploadCloud className="h-5 w-5" />
      </span>
      <p className="text-sm font-medium">
        {isDragActive ? 'Drop the PDF here' : 'Drag a PDF here, or click to browse'}
      </p>
      <p className="text-xs text-muted-foreground">PDF only · up to 10 MB</p>
    </div>
  );
}

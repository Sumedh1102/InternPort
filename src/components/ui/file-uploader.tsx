"use client";

import * as React from "react";
import { deleteObject, ref as storageRef, uploadBytesResumable } from "firebase/storage";
import { FileUp, Paperclip, X } from "lucide-react";

import { firebaseClient } from "@/lib/firebase/client";
import { cn, formatBytes } from "@/lib/utils";

export interface UploadedFile {
  path: string;
  name: string;
  size: number;
  contentType: string;
  url?: string;
}

interface FileUploaderProps {
  id: string;
  /** Storage folder, e.g. `submissions/{submissionId}/` — must match storage.rules. */
  pathPrefix: string;
  accept: readonly string[];
  maxBytes: number;
  maxFiles?: number;
  value: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
}

function safeName(name: string) {
  const cleaned = name.normalize("NFKD").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/-+/g, "-");
  return cleaned.slice(-80) || "file";
}

const EXT: Record<string, string> = {
  "application/pdf": "PDF",
  "application/zip": "ZIP",
  "application/x-zip-compressed": "ZIP",
  "image/png": "PNG",
  "image/jpeg": "JPG",
  "image/webp": "WEBP",
  "text/plain": "TXT",
  "text/markdown": "MD",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
};

/**
 * FileUploader — validates type & size in the browser, uploads straight to Firebase
 * Storage (rules enforce the same limits), and reports storage paths. The server
 * re-validates every path from Storage metadata before saving it.
 */
export function FileUploader({
  id,
  pathPrefix,
  accept,
  maxBytes,
  maxFiles = 1,
  value,
  onChange,
  label = "Upload file",
  hint,
  disabled,
}: FileUploaderProps) {
  const [progress, setProgress] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const types = [...new Set(accept.map((t) => EXT[t] ?? t))].join(", ");

  async function upload(file: File) {
    setError(null);
    if (!accept.includes(file.type)) {
      setError(`“${file.name}” isn't an allowed type (${types}).`);
      return;
    }
    if (file.size > maxBytes) {
      setError(`“${file.name}” is larger than ${formatBytes(maxBytes)}.`);
      return;
    }
    if (value.length >= maxFiles) {
      setError(`You can attach up to ${maxFiles} file${maxFiles === 1 ? "" : "s"}.`);
      return;
    }
    const { storage, auth } = firebaseClient();
    await auth.authStateReady();
    if (!auth.currentUser) {
      setError("Please sign in again to upload files.");
      return;
    }
    const path = `${pathPrefix}${Date.now()}-${safeName(file.name)}`;
    const task = uploadBytesResumable(storageRef(storage, path), file, { contentType: file.type });
    setProgress(0);
    await new Promise<void>((resolve) => {
      task.on(
        "state_changed",
        (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
        (err) => {
          setError(
            err.code === "storage/unauthorized"
              ? "Upload blocked. Check the file type/size or sign in again."
              : "Upload failed. Please try again.",
          );
          setProgress(null);
          resolve();
        },
        () => {
          onChange([...value, { path, name: file.name, size: file.size, contentType: file.type }]);
          setProgress(null);
          resolve();
        },
      );
    });
  }

  async function handleFiles(list: FileList | null) {
    if (!list) return;
    for (const file of Array.from(list)) await upload(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function remove(file: UploadedFile) {
    onChange(value.filter((f) => f.path !== file.path));
    try {
      await deleteObject(storageRef(firebaseClient().storage, file.path));
    } catch {
      // Already removed or not owned (e.g. previously saved) — detaching is enough.
    }
  }

  const full = value.length >= maxFiles;

  return (
    <div className="flex flex-col gap-2">
      {!full && (
        <label
          htmlFor={id}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!disabled) void handleFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-ink bg-paper px-4 py-6 text-center transition hover:bg-lime-soft focus-within:bg-lime-soft",
            dragging && "bg-lime-soft",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          <FileUp className="size-6" aria-hidden />
          <span className="text-sm font-semibold">{label}</span>
          <span className="text-xs text-muted">
            {hint ?? `${types} · up to ${formatBytes(maxBytes)}`}
          </span>
          <input
            ref={inputRef}
            id={id}
            type="file"
            className="sr-only"
            accept={accept.join(",")}
            multiple={maxFiles > 1}
            disabled={disabled || progress !== null}
            onChange={(e) => void handleFiles(e.target.files)}
          />
        </label>
      )}
      {progress !== null && (
        <div className="flex items-center gap-3 text-xs" role="status">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full border-2 border-ink bg-paper">
            <div className="h-full bg-lime" style={{ width: `${progress}%` }} />
          </div>
          <span className="font-mono">{progress}%</span>
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs font-semibold text-red">
          {error}
        </p>
      )}
      {value.length > 0 && (
        <ul className="flex flex-col gap-2">
          {value.map((f) => (
            <li
              key={f.path}
              className="flex items-center gap-3 rounded-xl border-2 border-ink bg-paper px-3 py-2 text-sm"
            >
              <Paperclip className="size-4 shrink-0" aria-hidden />
              {f.url ? (
                <a href={f.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate underline">
                  {f.name}
                </a>
              ) : (
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
              )}
              <span className="shrink-0 font-mono text-xs text-muted">{formatBytes(f.size)}</span>
              <button
                type="button"
                onClick={() => void remove(f)}
                className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-ink hover:bg-red-soft"
                aria-label={`Remove ${f.name}`}
                disabled={disabled}
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

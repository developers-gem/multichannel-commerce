"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Upload, FileSpreadsheet, X, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface CsvUploadProps {
  onUpload: (file: File) => void;
  onDownloadSample: () => void;
  isLoading: boolean;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export default function CsvUpload({
  onUpload,
  onDownloadSample,
  isLoading,
}: CsvUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const validateFile = (file: File): boolean => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Invalid file format. Please select a .csv file.");
      return false;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error("File is too large. Maximum file size allowed is 5 MB.");
      return false;
    }

    return true;
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      } else {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = () => {
    if (!selectedFile) {
      toast.error("Please select a CSV file to upload.");
      return;
    }

    onUpload(selectedFile);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Action Header bar with Download Sample button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">Upload Product CSV</h2>
        <Button
          type="button"
          variant="outline"
          onClick={onDownloadSample}
          className="text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Download Sample CSV
        </Button>
      </div>

      {/* Drag & Drop Box */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !selectedFile && fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
          isDragOver
            ? "border-indigo-500 bg-indigo-50/50"
            : selectedFile
            ? "border-emerald-300 bg-emerald-50/20 cursor-default"
            : "border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
          disabled={isLoading}
        />

        {!selectedFile ? (
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-full bg-indigo-50 p-4 text-indigo-600">
              <Upload className="h-8 w-8" />
            </div>
            <p className="text-sm font-semibold text-slate-800 mt-2">
              Drag & drop your CSV file here, or{" "}
              <span className="text-indigo-600 underline">browse</span>
            </p>
            <p className="text-xs text-slate-500">
              Supports standard `.csv` files up to 5 MB
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full max-w-md bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-900 truncate max-w-[200px] sm:max-w-xs">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-slate-500">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={isLoading}
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveFile();
              }}
              className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Upload Button */}
      {selectedFile && (
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full sm:w-auto min-w-[140px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload CSV
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

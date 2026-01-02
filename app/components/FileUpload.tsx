'use client';

import { useState, useCallback } from 'react';
import { Upload, X, File, Image, FileText, CheckCircle } from 'lucide-react';
import { filesAPI } from '../services/api';

interface FileUploadProps {
  onUploadComplete?: () => void;
}

export default function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<Array<{ file: File; progress: number; status: 'uploading' | 'complete' | 'error'; error?: string }>>([]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    uploadFiles(droppedFiles);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      uploadFiles(selectedFiles);
    }
  }, []);

  const uploadFiles = async (filesToUpload: File[]) => {
    const newFiles = filesToUpload.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const,
    }));

    setFiles(prev => [...prev, ...newFiles]);

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      const fileIndex = files.length + i;

      try {
        await filesAPI.upload(file, (progress) => {
          setFiles(prev => {
            const updated = [...prev];
            if (updated[fileIndex]) {
              updated[fileIndex].progress = progress;
            }
            return updated;
          });
        });

        setFiles(prev => {
          const updated = [...prev];
          if (updated[fileIndex]) {
            updated[fileIndex].status = 'complete';
            updated[fileIndex].progress = 100;
          }
          return updated;
        });

        if (onUploadComplete) {
          onUploadComplete();
        }
      } catch (error: any) {
        setFiles(prev => {
          const updated = [...prev];
          if (updated[fileIndex]) {
            updated[fileIndex].status = 'error';
            updated[fileIndex].error = error.message;
          }
          return updated;
        });
      }
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return Image;
    if (file.type.includes('pdf')) return FileText;
    return File;
  };

  return (
    <div className="w-full">
      {/* Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${isDragging ? 'border-brand bg-brand/5' : 'border-border bg-surface hover:border-brand/50'}`}
      >
        <input
          type="file"
          multiple
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept=".jpg,.jpeg,.png,.gif,.heic,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        />
        
        <Upload className="w-12 h-12 mx-auto mb-4 text-text-tertiary" />
        <h3 className="text-lg font-medium text-text-primary mb-2">
          Drop files here or click to browse
        </h3>
        <p className="text-sm text-text-secondary">
          Supported: Images, PDFs, Documents, Spreadsheets
        </p>
      </div>

      {/* Upload Progress */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((item, index) => {
            const FileIcon = getFileIcon(item.file);
            return (
              <div key={index} className="card p-3 flex items-center gap-3">
                <FileIcon className="w-5 h-5 text-text-tertiary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {item.file.name}
                    </p>
                    {item.status === 'complete' && (
                      <CheckCircle className="w-4 h-4 text-brand flex-shrink-0" />
                    )}
                    {item.status === 'uploading' && (
                      <span className="text-xs text-text-secondary">{Math.round(item.progress)}%</span>
                    )}
                  </div>
                  {item.status === 'uploading' && (
                    <div className="w-full bg-background-tertiary rounded-full h-1.5">
                      <div
                        className="bg-brand h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                  {item.status === 'error' && (
                    <p className="text-xs text-red-400">{item.error}</p>
                  )}
                  {item.status === 'complete' && (
                    <p className="text-xs text-text-tertiary">Upload complete - Processing with AI...</p>
                  )}
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 hover:bg-background-hover rounded transition-colors"
                >
                  <X className="w-4 h-4 text-text-tertiary" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { Upload, X, File, Image, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { filesAPI } from '../services/api';

interface FileUploadProps {
  onUploadComplete?: () => void;
}

export default function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<Array<{ 
    file: File; 
    progress: number; 
    status: 'uploading' | 'complete' | 'error'; 
    error?: string 
  }>>([]);

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
    <div className="w-full space-y-4">
      {/* Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200
          ${isDragging 
            ? 'border-brand bg-brand/5 scale-[1.02]' 
            : 'border-border bg-surface hover:border-brand/50 hover:bg-surface-elevated'
          }`}
      >
        <input
          type="file"
          multiple
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept=".jpg,.jpeg,.png,.gif,.heic,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        />
        
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand/10 flex items-center justify-center">
          <Upload className="w-8 h-8 text-brand" />
        </div>
        
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          {isDragging ? 'Drop files here' : 'Upload your files'}
        </h3>
        
        <p className="text-sm text-text-secondary mb-1">
          Drag and drop or click to browse
        </p>
        
        <p className="text-xs text-text-tertiary">
          Supported: Images, PDFs, Documents, Spreadsheets • Max 50MB per file
        </p>
      </div>

      {/* Upload Progress */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-text-primary">
              Uploading {files.filter(f => f.status !== 'complete').length} of {files.length} files
            </h4>
            {files.every(f => f.status === 'complete') && (
              <button
                onClick={() => setFiles([])}
                className="text-xs text-text-secondary hover:text-text-primary transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="space-y-2">
            {files.map((item, index) => {
              const FileIcon = getFileIcon(item.file);
              return (
                <div 
                  key={index} 
                  className="bg-surface border border-border rounded-lg p-4 hover:border-brand/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-surface-elevated flex items-center justify-center">
                      <FileIcon className="w-5 h-5 text-text-tertiary" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-text-primary truncate pr-4">
                          {item.file.name}
                        </p>
                        
                        {item.status === 'complete' && (
                          <CheckCircle className="w-5 h-5 text-brand flex-shrink-0" />
                        )}
                        {item.status === 'error' && (
                          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        )}
                        {item.status === 'uploading' && (
                          <Loader2 className="w-5 h-5 text-brand animate-spin flex-shrink-0" />
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-text-tertiary mb-2">
                        <span>{(item.file.size / 1024).toFixed(1)} KB</span>
                        {item.status === 'uploading' && (
                          <span className="text-brand font-medium">{Math.round(item.progress)}%</span>
                        )}
                      </div>
                      
                      {item.status === 'uploading' && (
                        <div className="w-full bg-surface-elevated rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-brand h-full rounded-full transition-all duration-300"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      )}
                      
                      {item.status === 'error' && (
                        <p className="text-xs text-red-400 mt-1">{item.error}</p>
                      )}
                      
                      {item.status === 'complete' && (
                        <p className="text-xs text-text-secondary mt-1">
                          ✓ Uploaded • AI processing complete
                        </p>
                      )}
                    </div>
                    
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1.5 hover:bg-surface-elevated rounded transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4 text-text-tertiary" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

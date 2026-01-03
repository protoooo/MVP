'use client';

import { useState, useEffect } from 'react';
import { File as FileType } from '../types';
import { X, Download, Trash2, Calendar, HardDrive, Tag, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { filesAPI } from '../services/api';
import { formatDistanceToNow } from 'date-fns';

interface FilePreviewModalProps {
  file: FileType;
  allFiles?: FileType[];
  onClose: () => void;
  onDelete: () => void;
  onNavigate?: (file: FileType) => void;
}

export default function FilePreviewModal({ file, allFiles = [], onClose, onDelete, onNavigate }: FilePreviewModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  
  const currentIndex = allFiles.findIndex(f => f.id === file.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < allFiles.length - 1;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrevious && onNavigate) {
        onNavigate(allFiles[currentIndex - 1]);
      }
      if (e.key === 'ArrowRight' && hasNext && onNavigate) {
        onNavigate(allFiles[currentIndex + 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [file, allFiles, currentIndex, onClose, onNavigate, hasPrevious, hasNext]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    
    setIsDeleting(true);
    try {
      await filesAPI.delete(file.id);
      onDelete();
      onClose();
    } catch (error) {
      console.error('Error deleting file:', error);
      setIsDeleting(false);
    }
  };

  const formatFileSize = (bytes: number | string): string => {
    const size = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
    
    if (!size || size < 0 || isNaN(size)) return '0 B';
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
    return (size / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isImage = file.file_type.startsWith('image/');
  const isPDF = file.file_type.includes('pdf');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl h-[90vh] bg-surface border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-elevated">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-text-primary truncate">
              {file.original_filename}
            </h2>
            {file.relevance_score && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-brand/10 text-brand border border-brand/20">
                {Math.round(file.relevance_score * 100)}% match
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <a
              href={filesAPI.getDownloadUrl(file.id)}
              download
              className="p-2 hover:bg-surface rounded-lg transition-colors"
              title="Download"
            >
              <Download className="w-5 h-5 text-text-secondary" />
            </a>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="w-5 h-5 text-text-secondary hover:text-red-400" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-text-secondary" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Preview Area */}
          <div className="flex-1 flex items-center justify-center bg-background-tertiary p-8 relative">
            {/* Navigation Arrows */}
            {hasPrevious && onNavigate && (
              <button
                onClick={() => onNavigate(allFiles[currentIndex - 1])}
                className="absolute left-4 p-3 bg-surface border border-border rounded-lg hover:bg-surface-elevated transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-text-primary" />
              </button>
            )}
            
            {hasNext && onNavigate && (
              <button
                onClick={() => onNavigate(allFiles[currentIndex + 1])}
                className="absolute right-4 p-3 bg-surface border border-border rounded-lg hover:bg-surface-elevated transition-colors"
              >
                <ChevronRight className="w-6 h-6 text-text-primary" />
              </button>
            )}

            {/* Preview Content */}
            {isImage ? (
              <img
                src={filesAPI.getDownloadUrl(file.id)}
                alt={file.original_filename}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
            ) : isPDF ? (
              <iframe
                src={filesAPI.getDownloadUrl(file.id)}
                className="w-full h-full rounded-lg border border-border"
                title={file.original_filename}
              />
            ) : (
              <div className="text-center">
                <FileText className="w-24 h-24 text-text-tertiary mx-auto mb-4" />
                <p className="text-text-secondary mb-4">Preview not available for this file type</p>
                <a
                  href={filesAPI.getDownloadUrl(file.id)}
                  download
                  className="btn-primary"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download to view
                </a>
              </div>
            )}
          </div>

          {/* Sidebar with Details */}
          <div className="w-80 border-l border-border bg-surface overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Description */}
              {file.ai_description && (
                <div>
                  <h3 className="text-sm font-semibold text-text-primary mb-2">Description</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {file.ai_description}
                  </p>
                </div>
              )}

              {/* Metadata */}
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-3">Details</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-text-tertiary mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-text-tertiary mb-0.5">Uploaded</p>
                      <p className="text-sm text-text-primary">
                        {formatDistanceToNow(new Date(file.uploaded_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <HardDrive className="w-4 h-4 text-text-tertiary mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-text-tertiary mb-0.5">Size</p>
                      <p className="text-sm text-text-primary">{formatFileSize(file.file_size)}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <FileText className="w-4 h-4 text-text-tertiary mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-text-tertiary mb-0.5">Type</p>
                      <p className="text-sm text-text-primary">{file.file_type}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {file.tags && file.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-text-primary mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {file.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-surface-elevated text-text-secondary border border-border"
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Category */}
              {file.category && (
                <div>
                  <h3 className="text-sm font-semibold text-text-primary mb-2">Category</h3>
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-brand/10 text-brand border border-brand/20">
                    {file.category}
                  </span>
                </div>
              )}

              {/* Extracted Text Preview */}
              {file.extracted_text && (
                <div>
                  <h3 className="text-sm font-semibold text-text-primary mb-2">Extracted Text</h3>
                  <div className="bg-background-tertiary rounded-lg p-3 text-xs text-text-secondary leading-relaxed max-h-40 overflow-y-auto">
                    {file.extracted_text.substring(0, 500)}
                    {file.extracted_text.length > 500 && '...'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer with navigation info */}
        {allFiles.length > 1 && (
          <div className="px-6 py-3 border-t border-border bg-surface-elevated">
            <div className="flex items-center justify-between text-xs text-text-tertiary">
              <span>File {currentIndex + 1} of {allFiles.length}</span>
              <span className="flex items-center gap-4">
                <kbd className="px-2 py-1 bg-surface border border-border rounded text-xs">←</kbd>
                <span>Previous</span>
                <kbd className="px-2 py-1 bg-surface border border-border rounded text-xs">→</kbd>
                <span>Next</span>
                <kbd className="px-2 py-1 bg-surface border border-border rounded text-xs">Esc</kbd>
                <span>Close</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

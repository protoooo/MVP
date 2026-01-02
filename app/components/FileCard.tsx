'use client';

import { File as FileType } from '../types';
import { Download, Trash2, File, Image, FileText, Tag } from 'lucide-react';
import { filesAPI } from '../services/api';
import { formatDistanceToNow } from 'date-fns';

interface FileCardProps {
  file: FileType;
  onDelete?: () => void;
}

export default function FileCard({ file, onDelete }: FileCardProps) {
  const getFileIcon = () => {
    if (file.file_type.startsWith('image/')) return Image;
    if (file.file_type.includes('pdf')) return FileText;
    return File;
  };

  const FileIcon = getFileIcon();

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this file?')) {
      try {
        await filesAPI.delete(file.id);
        if (onDelete) onDelete();
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }
  };

  return (
    <div className="card-hover p-4 group">
      <div className="flex items-start gap-3">
        {/* File Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
          <FileIcon className="w-5 h-5 text-brand" />
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-text-primary truncate mb-1">
            {file.original_filename}
          </h3>
          
          {file.ai_description && (
            <p className="text-xs text-text-secondary mb-2 line-clamp-2">
              {file.ai_description}
            </p>
          )}

          <div className="flex items-center gap-2 text-xs text-text-tertiary mb-2">
            <span>{formatFileSize(file.file_size)}</span>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(file.uploaded_at), { addSuffix: true })}</span>
            {file.relevance_score && (
              <>
                <span>•</span>
                <span className="text-brand">
                  {Math.round(file.relevance_score * 100)}% match
                </span>
              </>
            )}
          </div>

          {/* Tags */}
          {file.tags && file.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {file.tags.slice(0, 5).map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-surface-elevated text-text-secondary border border-border"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
              {file.tags.length > 5 && (
                <span className="text-xs text-text-tertiary px-2 py-0.5">
                  +{file.tags.length - 5} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <a
            href={filesAPI.getDownloadUrl(file.id)}
            download
            className="p-2 hover:bg-background-hover rounded transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4 text-text-tertiary hover:text-brand" />
          </a>
          <button
            onClick={handleDelete}
            className="p-2 hover:bg-background-hover rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4 text-text-tertiary hover:text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

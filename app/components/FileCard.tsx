'use client';

import { File as FileType } from '../types';
import { Download, Trash2, File, Image, FileText, Tag, Calendar, HardDrive, Check } from 'lucide-react';
import { filesAPI } from '../services/api';
import { formatDistanceToNow } from 'date-fns';

interface FileCardProps {
  file: FileType;
  onDelete?: () => void;
  onPreview?: () => void;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
  selectionMode?: boolean;
}

export default function FileCard({ file, onDelete, onPreview, isSelected, onSelect, selectionMode }: FileCardProps) {
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

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this file?')) {
      try {
        await filesAPI.delete(file.id);
        if (onDelete) onDelete();
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }
  };

  const handleClick = () => {
    if (selectionMode && onSelect) {
      onSelect(!isSelected);
    } else if (onPreview) {
      onPreview();
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      onClick={handleClick}
      className={`group relative bg-surface border rounded-xl overflow-hidden transition-all duration-200 ${
        onPreview || selectionMode ? 'cursor-pointer' : ''
      } ${
        isSelected 
          ? 'border-brand shadow-dark-hover ring-2 ring-brand/20' 
          : 'border-border hover:border-brand/50 hover:shadow-dark-hover'
      }`}
    >
      {selectionMode && (
        <div className="absolute top-3 left-3 z-10">
          <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
            isSelected 
              ? 'bg-brand border-brand' 
              : 'bg-surface border-border group-hover:border-brand/50'
          }`}>
            {isSelected && <Check className="w-4 h-4 text-white" />}
          </div>
        </div>
      )}

      {file.relevance_score && !selectionMode && (
        <div className="absolute top-3 right-3 z-10">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-brand/10 text-brand border border-brand/20">
            {Math.round(file.relevance_score * 100)}% match
          </span>
        </div>
      )}

      <div className="h-32 bg-surface-elevated flex items-center justify-center border-b border-border">
        {file.file_type.startsWith('image/') ? (
          <img 
            src={filesAPI.getDownloadUrl(file.id)} 
            alt={file.original_filename}
            className="w-full h-full object-cover"
          />
        ) : (
          <FileIcon className="w-12 h-12 text-text-tertiary" />
        )}
      </div>

      <div className="p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-2 truncate group-hover:text-brand transition-colors">
          {file.original_filename}
        </h3>

        {file.ai_description && (
          <p className="text-xs text-text-secondary mb-3 line-clamp-2 leading-relaxed">
            {file.ai_description}
          </p>
        )}

        {file.tags && file.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {file.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-surface-elevated text-text-secondary border border-border hover:border-brand/30 transition-colors"
              >
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
            {file.tags.length > 3 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs text-text-tertiary">
                +{file.tags.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-text-tertiary mb-4 pb-4 border-b border-border">
          <div className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5" />
            <span>{formatFileSize(file.file_size)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDistanceToNow(new Date(file.uploaded_at), { addSuffix: true })}</span>
          </div>
        </div>

        {!selectionMode && (
          <div className="flex items-center gap-2">
            <a
              href={filesAPI.getDownloadUrl(file.id)}
              download
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-brand text-white hover:bg-brand-600 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
            <button
              onClick={handleDelete}
              className="p-2 rounded-lg text-text-tertiary hover:text-red-400 hover:bg-red-500/10 border border-border hover:border-red-500/30 transition-colors"
              title="Delete file"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { SearchResult } from '../types';
import FileCard from './FileCard';
import { Sparkles, Calendar, FileType as FileTypeIcon, Tag } from 'lucide-react';

interface SearchResultsProps {
  results: SearchResult | null;
  loading?: boolean;
  onFileDeleted?: () => void;
}

export default function SearchResults({ results, loading, onFileDeleted }: SearchResultsProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner w-8 h-8 border-4 border-brand/20 border-t-brand rounded-full" />
      </div>
    );
  }

  if (!results) {
    return null;
  }

  const { results: files, total, query_understanding } = results;

  return (
    <div className="space-y-6">
      {/* Query Understanding */}
      {query_understanding && (
        <div className="card p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-text-primary mb-2">
                Understanding your search
              </h3>
              <div className="flex flex-wrap gap-2 text-xs">
                {query_understanding.intent && (
                  <span className="badge-brand">
                    Intent: {query_understanding.intent}
                  </span>
                )}
                {query_understanding.timeRange && (
                  <span className="badge inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {query_understanding.timeRange.start} - {query_understanding.timeRange.end}
                  </span>
                )}
                {query_understanding.documentTypes.length > 0 && (
                  <>
                    {query_understanding.documentTypes.map((type, idx) => (
                      <span key={idx} className="badge inline-flex items-center gap-1">
                        <FileTypeIcon className="w-3 h-3" />
                        {type}
                      </span>
                    ))}
                  </>
                )}
                {query_understanding.keywords.length > 0 && (
                  <>
                    {query_understanding.keywords.slice(0, 5).map((keyword, idx) => (
                      <span key={idx} className="badge inline-flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {keyword}
                      </span>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">
          {total} {total === 1 ? 'result' : 'results'} found
        </h2>
      </div>

      {/* Files Grid */}
      {files.length > 0 ? (
        <div className="grid gap-4">
          {files.map((file) => (
            <FileCard key={file.id} file={file} onDelete={onFileDeleted} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-text-secondary mb-2">No files found matching your search</p>
          <p className="text-sm text-text-tertiary">
            Try adjusting your search query or upload some files to get started
          </p>
        </div>
      )}
    </div>
  );
}

'use client';

import { SearchResult } from '../types';
import FileCard from './FileCard';
import { Sparkles, Calendar, FileType as FileTypeIcon, Tag, Search, AlertCircle } from 'lucide-react';

interface SearchResultsProps {
  results: SearchResult | null;
  loading?: boolean;
  onFileDeleted?: () => void;
}

export default function SearchResults({ results, loading, onFileDeleted }: SearchResultsProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin w-10 h-10 border-4 border-brand/20 border-t-brand rounded-full mb-4" />
        <p className="text-sm text-text-secondary">Searching with AI...</p>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-full bg-surface-elevated flex items-center justify-center mx-auto mb-4">
          <Search className="w-8 h-8 text-text-tertiary" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">Start searching</h3>
        <p className="text-text-secondary max-w-md mx-auto">
          Use natural language to find your files. Try "tax documents from 2018" or "photos from last month"
        </p>
      </div>
    );
  }

  const { results: files, total, query_understanding } = results;

  return (
    <div className="space-y-6">
      {query_understanding && (
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-brand" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-text-primary mb-3">
                AI Understanding
              </h3>
              <div className="flex flex-wrap gap-2">
                {query_understanding.intent && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand/10 text-brand border border-brand/20">
                    <Sparkles className="w-3 h-3" />
                    {query_understanding.intent}
                  </span>
                )}
                
                {query_understanding.timeRange && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-elevated text-text-primary border border-border">
                    <Calendar className="w-3 h-3" />
                    {query_understanding.timeRange.start} - {query_understanding.timeRange.end}
                  </span>
                )}
                
                {query_understanding.documentTypes.length > 0 && (
                  <>
                    {query_understanding.documentTypes.map((type, idx) => (
                      <span 
                        key={idx} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-elevated text-text-primary border border-border"
                      >
                        <FileTypeIcon className="w-3 h-3" />
                        {type}
                      </span>
                    ))}
                  </>
                )}
                
                {query_understanding.keywords.length > 0 && (
                  <>
                    {query_understanding.keywords.slice(0, 5).map((keyword, idx) => (
                      <span 
                        key={idx} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-elevated text-text-secondary border border-border"
                      >
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

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary mb-1">
            {total} {total === 1 ? 'result' : 'results'} found
          </h2>
          <p className="text-sm text-text-secondary">
            Ranked by relevance using AI reranking
          </p>
        </div>
      </div>

      {files.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {files.map((file) => (
            <FileCard key={file.id} file={file} onDelete={onFileDeleted} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-surface border border-border rounded-xl">
          <div className="w-16 h-16 rounded-full bg-surface-elevated flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-text-tertiary" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">No files found</h3>
          <p className="text-text-secondary mb-6 max-w-md mx-auto">
            We couldn't find any files matching your search. Try adjusting your query or uploading more files.
          </p>
        </div>
      )}
    </div>
  );
}

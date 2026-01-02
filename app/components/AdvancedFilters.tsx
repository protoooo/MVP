'use client';

import { useState } from 'react';
import { Filter, X, Calendar, FileType, HardDrive, Tag as TagIcon } from 'lucide-react';

export interface FilterOptions {
  fileTypes: string[];
  dateRange: { start?: string; end?: string };
  sizeRange: { min?: number; max?: number };
  tags: string[];
  category?: string;
}

interface AdvancedFiltersProps {
  onFilterChange: (filters: FilterOptions) => void;
  availableTags: string[];
  availableCategories: string[];
}

export default function AdvancedFilters({ onFilterChange, availableTags, availableCategories }: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    fileTypes: [],
    dateRange: {},
    sizeRange: {},
    tags: [],
  });

  const fileTypeOptions = [
    { value: 'image', label: 'Images', mime: 'image/' },
    { value: 'pdf', label: 'PDFs', mime: 'pdf' },
    { value: 'document', label: 'Documents', mime: 'doc' },
    { value: 'spreadsheet', label: 'Spreadsheets', mime: 'xls' },
  ];

  const sizeOptions = [
    { value: 'small', label: '< 1 MB', max: 1024 * 1024 },
    { value: 'medium', label: '1-10 MB', min: 1024 * 1024, max: 10 * 1024 * 1024 },
    { value: 'large', label: '> 10 MB', min: 10 * 1024 * 1024 },
  ];

  const datePresets = [
    { label: 'Today', days: 0 },
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 },
  ];

  const handleTypeToggle = (type: string) => {
    const newTypes = filters.fileTypes.includes(type)
      ? filters.fileTypes.filter(t => t !== type)
      : [...filters.fileTypes, type];
    
    const newFilters = { ...filters, fileTypes: newTypes };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleTagToggle = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag];
    
    const newFilters = { ...filters, tags: newTags };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleDatePreset = (days: number) => {
    const end = new Date().toISOString().split('T')[0];
    const start = days === 0 
      ? end 
      : new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const newFilters = { ...filters, dateRange: { start, end } };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleSizeRange = (range: { min?: number; max?: number }) => {
    const newFilters = { ...filters, sizeRange: range };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleCategoryChange = (category: string) => {
    const newFilters = { ...filters, category: category || undefined };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters: FilterOptions = {
      fileTypes: [],
      dateRange: {},
      sizeRange: {},
      tags: [],
    };
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const activeFilterCount = 
    filters.fileTypes.length + 
    filters.tags.length + 
    (filters.dateRange.start ? 1 : 0) + 
    (filters.sizeRange.min || filters.sizeRange.max ? 1 : 0) +
    (filters.category ? 1 : 0);

  return (
    <div className="relative">
      {/* Filter Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${
          activeFilterCount > 0
            ? 'bg-brand/10 text-brand border-brand/30'
            : 'bg-surface text-text-secondary border-border hover:border-brand/30'
        }`}
      >
        <Filter className="w-4 h-4" />
        <span>Filters</span>
        {activeFilterCount > 0 && (
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand text-white text-xs">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Filter Panel */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-96 bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-elevated">
              <h3 className="text-sm font-semibold text-text-primary">Advanced Filters</h3>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-text-secondary hover:text-brand transition-colors"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-surface rounded transition-colors"
                >
                  <X className="w-4 h-4 text-text-tertiary" />
                </button>
              </div>
            </div>

            {/* Filter Content */}
            <div className="max-h-[70vh] overflow-y-auto p-4 space-y-6">
              {/* File Type */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileType className="w-4 h-4 text-text-tertiary" />
                  <h4 className="text-sm font-medium text-text-primary">File Type</h4>
                </div>
                <div className="space-y-2">
                  {fileTypeOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-elevated cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={filters.fileTypes.includes(option.value)}
                        onChange={() => handleTypeToggle(option.value)}
                        className="w-4 h-4 rounded border-border text-brand focus:ring-brand focus:ring-offset-0"
                      />
                      <span className="text-sm text-text-primary">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-text-tertiary" />
                  <h4 className="text-sm font-medium text-text-primary">Date Range</h4>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {datePresets.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => handleDatePreset(preset.days)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                        filters.dateRange.start
                          ? 'bg-surface-elevated text-text-secondary border-border hover:border-brand/30'
                          : 'bg-surface text-text-secondary border-border hover:border-brand/30'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-text-tertiary mb-1 block">From</label>
                    <input
                      type="date"
                      value={filters.dateRange.start || ''}
                      onChange={(e) => {
                        const newFilters = {
                          ...filters,
                          dateRange: { ...filters.dateRange, start: e.target.value }
                        };
                        setFilters(newFilters);
                        onFilterChange(newFilters);
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary text-xs focus:border-brand focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-tertiary mb-1 block">To</label>
                    <input
                      type="date"
                      value={filters.dateRange.end || ''}
                      onChange={(e) => {
                        const newFilters = {
                          ...filters,
                          dateRange: { ...filters.dateRange, end: e.target.value }
                        };
                        setFilters(newFilters);
                        onFilterChange(newFilters);
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary text-xs focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* File Size */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <HardDrive className="w-4 h-4 text-text-tertiary" />
                  <h4 className="text-sm font-medium text-text-primary">File Size</h4>
                </div>
                <div className="space-y-2">
                  {sizeOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-elevated cursor-pointer transition-colors"
                    >
                      <input
                        type="radio"
                        name="size"
                        checked={
                          filters.sizeRange.min === option.min &&
                          filters.sizeRange.max === option.max
                        }
                        onChange={() => handleSizeRange({ min: option.min, max: option.max })}
                        className="w-4 h-4 text-brand focus:ring-brand focus:ring-offset-0"
                      />
                      <span className="text-sm text-text-primary">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Category */}
              {availableCategories.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-text-primary mb-3">Category</h4>
                  <select
                    value={filters.category || ''}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary text-sm focus:border-brand focus:outline-none"
                  >
                    <option value="">All categories</option>
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Tags */}
              {availableTags.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TagIcon className="w-4 h-4 text-text-tertiary" />
                    <h4 className="text-sm font-medium text-text-primary">Tags</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.slice(0, 20).map((tag) => (
                      <button
                        key={tag}
                        onClick={() => handleTagToggle(tag)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all border ${
                          filters.tags.includes(tag)
                            ? 'bg-brand/10 text-brand border-brand/30'
                            : 'bg-surface-elevated text-text-secondary border-border hover:border-brand/30'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

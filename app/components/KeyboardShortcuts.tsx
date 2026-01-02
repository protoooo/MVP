'use client';

import { useEffect, useState } from 'react';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardShortcuts({ isOpen, onClose }: KeyboardShortcutsProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcuts = [
    {
      category: 'General',
      items: [
        { keys: ['⌘', 'K'], description: 'Focus search bar' },
        { keys: ['?'], description: 'Show keyboard shortcuts' },
        { keys: ['Esc'], description: 'Close modal / Clear selection' },
      ],
    },
    {
      category: 'Navigation',
      items: [
        { keys: ['←', '→'], description: 'Navigate between files in preview' },
        { keys: ['1'], description: 'Go to All Files view' },
        { keys: ['2'], description: 'Go to Upload view' },
        { keys: ['3'], description: 'Go to Search view' },
      ],
    },
    {
      category: 'File Actions',
      items: [
        { keys: ['Enter'], description: 'Open file preview' },
        { keys: ['⌘', 'D'], description: 'Download selected file' },
        { keys: ['⌘', 'A'], description: 'Select all files' },
        { keys: ['⌘', 'Shift', 'A'], description: 'Deselect all files' },
        { keys: ['Delete'], description: 'Delete selected files' },
      ],
    },
    {
      category: 'Search & Filters',
      items: [
        { keys: ['⌘', 'F'], description: 'Open advanced filters' },
        { keys: ['⌘', 'Shift', 'C'], description: 'Clear all filters' },
        { keys: ['⌘', 'E'], description: 'Export search results' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl bg-surface border border-border rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
              <Keyboard className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Keyboard Shortcuts</h2>
              <p className="text-xs text-text-secondary mt-0.5">Navigate faster with keyboard commands</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-elevated rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {shortcuts.map((section) => (
              <div key={section.category}>
                <h3 className="text-sm font-semibold text-text-primary mb-4">
                  {section.category}
                </h3>
                <div className="space-y-3">
                  {section.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-4">
                      <span className="text-sm text-text-secondary flex-1">
                        {item.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {item.keys.map((key, keyIdx) => (
                          <span key={keyIdx} className="flex items-center gap-1">
                            <kbd className="px-2.5 py-1.5 bg-surface-elevated border border-border rounded-md text-xs font-medium text-text-primary">
                              {key}
                            </kbd>
                            {keyIdx < item.keys.length - 1 && (
                              <span className="text-text-tertiary text-xs">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface-elevated">
          <p className="text-xs text-text-tertiary text-center">
            Press <kbd className="px-2 py-1 bg-surface border border-border rounded text-xs mx-1">?</kbd> anytime to view this menu
          </p>
        </div>
      </div>
    </div>
  );
}

// Hook to manage keyboard shortcuts
export function useKeyboardShortcuts(callbacks: {
  onSearch?: () => void;
  onNavigateFiles?: () => void;
  onNavigateUpload?: () => void;
  onNavigateSearch?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onOpenFilters?: () => void;
  onClearFilters?: () => void;
  onExport?: () => void;
  onShowShortcuts?: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K - Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        callbacks.onSearch?.();
      }

      // ? - Show shortcuts
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        callbacks.onShowShortcuts?.();
      }

      // Number keys for navigation
      if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
        if (e.key === '1') callbacks.onNavigateFiles?.();
        if (e.key === '2') callbacks.onNavigateUpload?.();
        if (e.key === '3') callbacks.onNavigateSearch?.();
      }

      // Cmd/Ctrl + D - Download
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        callbacks.onDownload?.();
      }

      // Delete key
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return; // Don't intercept if in input field
        }
        e.preventDefault();
        callbacks.onDelete?.();
      }

      // Cmd/Ctrl + A - Select all
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && !e.shiftKey) {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return; // Don't intercept if in input field
        }
        e.preventDefault();
        callbacks.onSelectAll?.();
      }

      // Cmd/Ctrl + Shift + A - Deselect all
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'a') {
        e.preventDefault();
        callbacks.onDeselectAll?.();
      }

      // Cmd/Ctrl + F - Open filters
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        callbacks.onOpenFilters?.();
      }

      // Cmd/Ctrl + Shift + C - Clear filters
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'c') {
        e.preventDefault();
        callbacks.onClearFilters?.();
      }

      // Cmd/Ctrl + E - Export
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        callbacks.onExport?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [callbacks]);
}

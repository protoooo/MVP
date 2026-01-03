'use client';

import { Check, FileText } from 'lucide-react';

export function UploadProgress({
  file,
  progress,
  status
}: {
  file: File;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
}) {
  const steps = [
    'Uploading file',
    'Extracting text',
    'Generating embeddings',
    'Analyzing content',
    'Complete'
  ];

  const currentStep =
    status === 'complete'
      ? 4
      : progress < 30
      ? 0
      : progress < 60
      ? 1
      : progress < 90
      ? 2
      : 3;

  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="flex gap-3 mb-4">
        <div className="w-12 h-12 bg-surface-elevated rounded-lg flex items-center justify-center">
          <FileText className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-text-tertiary">
            {(file.size / 1024).toFixed(1)} KB
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {steps.map((label, idx) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-full border ${
              idx < currentStep ? 'bg-brand border-brand' : 'border-border'
            }`}>
              {idx < currentStep && <Check className="w-3 h-3 text-white" />}
            </div>
            <span className="text-xs">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

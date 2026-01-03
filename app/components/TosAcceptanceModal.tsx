// app/components/TosAcceptanceModal.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X, AlertTriangle } from 'lucide-react';

interface TosAcceptanceModalProps {
  isOpen: boolean;
  onAccept: () => Promise<void>;
  onDecline: () => void;
  loading?: boolean;
}

export default function TosAcceptanceModal({
  isOpen,
  onAccept,
  onDecline,
  loading = false,
}: TosAcceptanceModalProps) {
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAccept = async () => {
    if (!accepted) {
      setError('You must accept the Terms of Service to continue');
      return;
    }

    if (!hasReadTerms) {
      setError('Please confirm you have read the Terms of Service');
      return;
    }

    setError('');
    try {
      await onAccept();
    } catch (err: any) {
      setError(err.message || 'Failed to accept terms');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-lg shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
          <h2 className="text-xl font-semibold text-white">Terms of Service Agreement</h2>
          <button
            onClick={onDecline}
            disabled={loading}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-yellow-200 mb-1">
                  Important: Read Before Accepting
                </p>
                <p className="text-sm text-yellow-100/80">
                  You must read and accept our Terms of Service to use ProtocolLM. 
                  These terms outline your rights and responsibilities.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 text-sm text-gray-300">
            <div>
              <h3 className="font-semibold text-white mb-2">Key Points:</h3>
              <ul className="list-disc ml-6 space-y-2">
                <li>
                  <strong className="text-white">Legal Content Only:</strong> You may only upload legal content. 
                  Any illegal content will be reported to law enforcement.
                </li>
                <li>
                  <strong className="text-white">Your Responsibility:</strong> You are solely responsible for 
                  all content you upload and must ensure it complies with all applicable laws.
                </li>
                <li>
                  <strong className="text-white">Business Plan:</strong> Unlimited storage for $25/month 
                  with a 14-day free trial.
                </li>
                <li>
                  <strong className="text-white">Security:</strong> Your files are encrypted with AES-256 
                  and scanned for viruses/malware.
                </li>
                <li>
                  <strong className="text-white">Privacy:</strong> You retain all rights to your documents. 
                  We only use your content to provide our services.
                </li>
                <li>
                  <strong className="text-white">Termination:</strong> Either party may terminate at any time. 
                  Your data will be deleted within 30 days of termination.
                </li>
              </ul>
            </div>

            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="font-semibold text-red-400 mb-2">⚠️ Zero Tolerance for Illegal Content</p>
              <p className="text-red-300/90">
                ProtocolLM has a zero-tolerance policy for illegal content. Any violations will result in:
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-1 text-red-300/80">
                <li>Immediate account suspension</li>
                <li>Full cooperation with law enforcement</li>
                <li>Disclosure of user data as required by law</li>
              </ul>
            </div>

            <div>
              <p className="text-gray-400">
                For complete details, please read our{' '}
                <Link
                  href="/terms"
                  target="_blank"
                  className="text-brand-400 hover:text-brand-300 underline font-medium"
                >
                  full Terms of Service
                </Link>
                .
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Checkboxes */}
          <div className="mt-6 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={hasReadTerms}
                onChange={(e) => setHasReadTerms(e.target.checked)}
                disabled={loading}
                className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-800 text-brand-600 focus:ring-2 focus:ring-brand-500 focus:ring-offset-0 disabled:opacity-50"
              />
              <span className="text-sm text-gray-300 group-hover:text-white transition-colors select-none">
                I have read and understood the Terms of Service
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                disabled={loading}
                className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-800 text-brand-600 focus:ring-2 focus:ring-brand-500 focus:ring-offset-0 disabled:opacity-50"
              />
              <span className="text-sm text-gray-300 group-hover:text-white transition-colors select-none">
                <strong className="text-white">I accept the Terms of Service</strong> and agree to comply 
                with all terms, including only uploading legal content
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800 flex-shrink-0">
          <button
            onClick={onDecline}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-all disabled:opacity-50"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            disabled={!accepted || !hasReadTerms || loading}
            className="px-6 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-brand-600 to-secondary-600 text-white hover:from-brand-700 hover:to-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Accepting...' : 'Accept & Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}

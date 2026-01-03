'use client';

import { useState, useEffect } from 'react';
import { X, ArrowRight, Check } from 'lucide-react';

interface Step {
  target: string;
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

const ONBOARDING_STEPS: Step[] = [
  {
    target: '.upload-area',
    title: 'Upload Your First Document',
    content: 'Start by uploading documents. We support PDFs, images, Word docs, Excel files, and more!',
    placement: 'bottom'
  },
  {
    target: '.search-bar',
    title: 'Search with Natural Language',
    content: 'Ask questions like "Show me tax documents from 2023" or "Find invoices over $1000"',
    placement: 'bottom'
  },
  {
    target: '.collections-sidebar',
    title: 'Organize with Collections',
    content: 'Create folders to organize your documents by project, year, or any category you need.',
    placement: 'right'
  },
  {
    target: '.chat-button',
    title: 'Chat with Your Documents',
    content: 'Have a conversation! Ask follow-up questions and get instant answers from your files.',
    placement: 'left'
  }
];

export default function OnboardingTour({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasCompleted = localStorage.getItem('onboarding_completed');
    if (!hasCompleted) {
      setTimeout(() => setIsVisible(true), 500);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem('onboarding_completed', 'true');
    setIsVisible(false);
    onComplete();
  };

  if (!isVisible) return null;

  const step = ONBOARDING_STEPS[currentStep];

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />

      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
        <div className="bg-surface border border-border rounded-xl shadow-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-1">
                {step.title}
              </h3>
              <p className="text-sm text-text-secondary">
                {step.content}
              </p>
            </div>
            <button onClick={handleComplete} className="p-2 hover:bg-surface-elevated rounded-lg">
              <X className="w-5 h-5 text-text-secondary" />
            </button>
          </div>

          <div className="flex items-center justify-between mt-6">
            <div className="flex gap-1.5">
              {ONBOARDING_STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full ${
                    idx === currentStep ? 'bg-brand' : 'bg-surface-elevated'
                  }`}
                />
              ))}
            </div>

            <button onClick={handleNext} className="btn-primary flex items-center gap-2">
              {currentStep === ONBOARDING_STEPS.length - 1 ? (
                <>
                  <Check className="w-4 h-4" />
                  Get Started
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

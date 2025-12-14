// components/Onboarding.js - First-time user welcome flow

'use client'
import { useState, useEffect } from 'react'
import { Outfit, Inter } from 'next/font/google'

const outfit = Outfit({ subsets: ['latin'], weight: ['600', '700', '800'] })
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'] })

export default function OnboardingModal({ isOpen, onComplete }) {
  const [step, setStep] = useState(0)

  if (!isOpen) return null

  const steps = [
    {
      title: "Welcome to protocolLM",
      description: "Your compliance assistant for Washtenaw County food safety.",
      icon: "🎉",
      action: "Get Started"
    },
    {
      title: "Take a Photo",
      description: "Snap a picture of your cooler, prep area, or any station. We'll check for violations instantly.",
      icon: "📸",
      action: "Next"
    },
    {
      title: "Ask Questions",
      description: "Type any food safety question. We'll search Washtenaw County regulations and give you the answer.",
      icon: "💬",
      action: "Next"
    },
    {
      title: "You're All Set!",
      description: "Your trial is active. Try uploading a photo or asking a question to get started.",
      icon: "✅",
      action: "Start Using protocolLM"
    }
  ]

  const currentStep = steps[step]

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1)
    } else {
      // Mark onboarding as complete
      localStorage.setItem('onboarding_complete', 'true')
      onComplete()
    }
  }

  const handleSkip = () => {
    localStorage.setItem('onboarding_complete', 'true')
    onComplete()
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[#0A0A0A] border border-white/12 rounded-2xl p-8 shadow-[0_40px_120px_rgba(0,0,0,0.9)]">
        {/* Progress Dots */}
        <div className="flex gap-2 mb-8 justify-center">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all ${
                idx === step 
                  ? 'w-8 bg-white' 
                  : 'w-2 bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="text-6xl text-center mb-4">
          {currentStep.icon}
        </div>

        {/* Title */}
        <h2 className={`text-2xl font-bold text-white text-center mb-3 ${outfit.className}`}>
          {currentStep.title}
        </h2>

        {/* Description */}
        <p className={`text-white/70 text-center mb-8 leading-relaxed ${inter.className}`}>
          {currentStep.description}
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleNext}
            className="w-full bg-white text-black font-bold py-3 px-6 rounded-xl hover:bg-white/90 transition"
          >
            {currentStep.action}
          </button>

          {step < steps.length - 1 && (
            <button
              onClick={handleSkip}
              className="w-full text-white/50 hover:text-white/80 text-sm transition"
            >
              Skip tour
            </button>
          )}
        </div>

        {/* Trial Status */}
        {step === steps.length - 1 && (
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <div className="flex items-center gap-2 text-blue-400 text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>7-day trial active • No credit card required</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Usage in app/page.js:
// 
// const [showOnboarding, setShowOnboarding] = useState(false)
//
// useEffect(() => {
//   const completed = localStorage.getItem('onboarding_complete')
//   if (!completed && session && hasActiveSubscription) {
//     setShowOnboarding(true)
//   }
// }, [session, hasActiveSubscription])
//
// return (
//   <>
//     <OnboardingModal 
//       isOpen={showOnboarding} 
//       onComplete={() => setShowOnboarding(false)} 
//     />
//     {/* rest of your app */}
//   </>
// )

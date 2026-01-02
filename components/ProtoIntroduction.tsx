"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronRight } from "lucide-react";

interface OnboardingData {
  businessType: string;
  challenges: string;
  goals: string;
  teamSize: string;
  timeConsumers: string;
}

interface ProtoIntroductionProps {
  onComplete: (data: OnboardingData) => void;
  onSkip?: () => void;
}

const INTRO_TEXT = `Hi, I'm Proto. 👋

I'm here to grow with your business. Let me tell you what I can do:

✓ Draft professional emails and customer responses
✓ Create staff schedules and manage availability
✓ Analyze contracts, invoices, and documents for issues
✓ Help when you're short-staffed with smart solutions
✓ Coordinate between you and your team on any problem
✓ Work autonomously on complex tasks while keeping you updated

Here's what makes me different: I remember everything we discuss. Every detail about your business, your preferences, your team, your challenges. The more we work together, the better I understand your needs.

Your data stays private and secure - my memory is just for helping you succeed.

Now, let's get to know each other...`;

export default function ProtoIntroduction({ onComplete, onSkip }: ProtoIntroductionProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showQuestions, setShowQuestions] = useState(false);
  const [formData, setFormData] = useState<OnboardingData>({
    businessType: "",
    challenges: "",
    goals: "",
    teamSize: "",
    timeConsumers: "",
  });

  // Character-by-character animation
  useEffect(() => {
    if (currentIndex < INTRO_TEXT.length) {
      const timer = setTimeout(() => {
        setDisplayedText(INTRO_TEXT.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, 20); // 20ms per character for smooth typing effect

      return () => clearTimeout(timer);
    } else {
      // Show questions after intro completes
      setTimeout(() => setShowQuestions(true), 500);
    }
  }, [currentIndex]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(formData);
  };

  const isFormValid = Object.values(formData).every(value => value.trim().length > 0);

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-2xl"
        >
          {/* Proto Avatar */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center justify-center mb-8"
          >
            <div className="relative">
              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 0 0 rgba(99, 102, 241, 0.4)",
                    "0 0 0 20px rgba(99, 102, 241, 0)",
                    "0 0 0 0 rgba(99, 102, 241, 0)",
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center"
              >
                <Sparkles className="w-10 h-10 text-white" />
              </motion.div>
            </div>
          </motion.div>

          {/* Introduction Text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-surface border border-border rounded-2xl p-8 mb-8 shadow-notion-sm"
          >
            <div className="prose prose-sm max-w-none">
              <p className="text-text-primary whitespace-pre-wrap leading-relaxed font-medium">
                {displayedText}
              </p>
            </div>

            {/* Typing indicator while typing */}
            {currentIndex < INTRO_TEXT.length && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-1 mt-4"
              >
                <motion.div
                  className="w-2 h-2 rounded-full bg-indigo-500"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                />
                <motion.div
                  className="w-2 h-2 rounded-full bg-indigo-500"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div
                  className="w-2 h-2 rounded-full bg-indigo-500"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                />
              </motion.div>
            )}
          </motion.div>

          {/* Onboarding Questions */}
          <AnimatePresence>
            {showQuestions && (
              <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                onSubmit={handleSubmit}
                className="bg-surface border border-border rounded-2xl p-8 shadow-notion-sm space-y-6"
              >
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    What type of business do you run?
                  </label>
                  <input
                    type="text"
                    value={formData.businessType}
                    onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                    placeholder="e.g., Coffee shop, Consulting firm, Retail store..."
                    className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-text-primary placeholder:text-text-tertiary text-sm transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    What are your biggest daily challenges?
                  </label>
                  <textarea
                    value={formData.challenges}
                    onChange={(e) => setFormData({ ...formData, challenges: e.target.value })}
                    placeholder="e.g., Scheduling staff, managing inventory, customer complaints..."
                    rows={3}
                    className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-text-primary placeholder:text-text-tertiary text-sm transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    What goals are you working toward?
                  </label>
                  <textarea
                    value={formData.goals}
                    onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                    placeholder="e.g., Increase revenue, reduce costs, improve customer satisfaction..."
                    rows={3}
                    className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-text-primary placeholder:text-text-tertiary text-sm transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    How many people are on your team?
                  </label>
                  <input
                    type="text"
                    value={formData.teamSize}
                    onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                    placeholder="e.g., Just me, 5 employees, 20+ staff..."
                    className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-text-primary placeholder:text-text-tertiary text-sm transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    What takes up most of your time each day?
                  </label>
                  <textarea
                    value={formData.timeConsumers}
                    onChange={(e) => setFormData({ ...formData, timeConsumers: e.target.value })}
                    placeholder="e.g., Responding to emails, doing paperwork, managing staff..."
                    rows={3}
                    className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-text-primary placeholder:text-text-tertiary text-sm transition-all resize-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-4">
                  {onSkip && (
                    <button
                      type="button"
                      onClick={onSkip}
                      className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                    >
                      Skip for now
                    </button>
                  )}
                  <motion.button
                    type="submit"
                    disabled={!isFormValid}
                    whileHover={{ scale: isFormValid ? 1.02 : 1 }}
                    whileTap={{ scale: isFormValid ? 0.98 : 1 }}
                    className={`ml-auto inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium shadow-lg transition-all ${
                      isFormValid
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "bg-background-tertiary text-text-tertiary cursor-not-allowed"
                    }`}
                    style={{
                      boxShadow: isFormValid
                        ? "0 4px 14px 0 rgba(99, 102, 241, 0.4)"
                        : "none",
                    }}
                  >
                    Let's get started
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

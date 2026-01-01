"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Clock, TrendingUp, Mail, FileText, Calendar, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface TrialStatus {
  isInTrial: boolean;
  daysRemaining: number;
  trialEndsAt: string;
  totalHoursSaved: number;
  totalTasksCompleted: number;
  totalEmailsDrafted: number;
  totalReportsGenerated: number;
}

export default function TrialBanner() {
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadTrialStatus();
    
    // Check if banner was dismissed in this session
    const isDismissed = sessionStorage.getItem('trial_banner_dismissed');
    if (isDismissed) {
      setDismissed(true);
    }
  }, []);

  const loadTrialStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile) return;

    // Check if user is in trial
    if (profile.subscription_status === 'trial') {
      const trialEnds = new Date(profile.trial_ends_at);
      const now = new Date();
      const daysRemaining = Math.max(0, Math.ceil((trialEnds.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      setTrialStatus({
        isInTrial: true,
        daysRemaining,
        trialEndsAt: profile.trial_ends_at,
        totalHoursSaved: parseFloat(profile.total_hours_saved || 0),
        totalTasksCompleted: profile.total_tasks_completed || 0,
        totalEmailsDrafted: profile.total_emails_drafted || 0,
        totalReportsGenerated: profile.total_reports_generated || 0,
      });
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('trial_banner_dismissed', 'true');
  };

  if (!trialStatus || !trialStatus.isInTrial || dismissed) {
    return null;
  }

  const urgencyLevel = trialStatus.daysRemaining <= 3 ? 'high' : trialStatus.daysRemaining <= 7 ? 'medium' : 'low';
  const bgColor = urgencyLevel === 'high' ? 'bg-red-50' : urgencyLevel === 'medium' ? 'bg-orange-50' : 'bg-blue-50';
  const borderColor = urgencyLevel === 'high' ? 'border-red-200' : urgencyLevel === 'medium' ? 'border-orange-200' : 'border-blue-200';
  const textColor = urgencyLevel === 'high' ? 'text-red-800' : urgencyLevel === 'medium' ? 'text-orange-800' : 'text-blue-800';
  const accentColor = urgencyLevel === 'high' ? 'text-red-600' : urgencyLevel === 'medium' ? 'text-orange-600' : 'text-blue-600';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`${bgColor} border ${borderColor} rounded-xl p-4 mb-6`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <div className={`p-2 ${urgencyLevel === 'high' ? 'bg-red-100' : urgencyLevel === 'medium' ? 'bg-orange-100' : 'bg-blue-100'} rounded-lg`}>
              <Clock className={`w-6 h-6 ${accentColor}`} />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`font-semibold ${textColor}`}>
                  {trialStatus.daysRemaining} {trialStatus.daysRemaining === 1 ? 'day' : 'days'} left in your free trial
                </h3>
                {urgencyLevel === 'high' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                    Action needed
                  </span>
                )}
              </div>
              
              <p className={`text-sm ${textColor} opacity-90 mb-3`}>
                See what you've accomplished so far - keep it going by subscribing!
              </p>

              {/* Value Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                {trialStatus.totalHoursSaved > 0 && (
                  <div className="bg-white/60 rounded-lg p-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <TrendingUp className={`w-3.5 h-3.5 ${accentColor}`} />
                      <span className="text-xs font-medium text-text-secondary">Time Saved</span>
                    </div>
                    <p className="text-lg font-bold text-text-primary">
                      {trialStatus.totalHoursSaved.toFixed(1)} hrs
                    </p>
                  </div>
                )}

                {trialStatus.totalEmailsDrafted > 0 && (
                  <div className="bg-white/60 rounded-lg p-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Mail className={`w-3.5 h-3.5 ${accentColor}`} />
                      <span className="text-xs font-medium text-text-secondary">Emails Drafted</span>
                    </div>
                    <p className="text-lg font-bold text-text-primary">
                      {trialStatus.totalEmailsDrafted}
                    </p>
                  </div>
                )}

                {trialStatus.totalReportsGenerated > 0 && (
                  <div className="bg-white/60 rounded-lg p-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <FileText className={`w-3.5 h-3.5 ${accentColor}`} />
                      <span className="text-xs font-medium text-text-secondary">Reports</span>
                    </div>
                    <p className="text-lg font-bold text-text-primary">
                      {trialStatus.totalReportsGenerated}
                    </p>
                  </div>
                )}

                {trialStatus.totalTasksCompleted > 0 && (
                  <div className="bg-white/60 rounded-lg p-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Calendar className={`w-3.5 h-3.5 ${accentColor}`} />
                      <span className="text-xs font-medium text-text-secondary">Tasks Done</span>
                    </div>
                    <p className="text-lg font-bold text-text-primary">
                      {trialStatus.totalTasksCompleted}
                    </p>
                  </div>
                )}
              </div>

              {/* Value proposition */}
              <div className="bg-white/60 rounded-lg p-3 mb-3">
                <p className="text-sm font-medium text-text-primary mb-1">
                  💰 Continue for just $25/month
                </p>
                <p className="text-xs text-text-secondary">
                  Keep all your data and progress. Add team members for $10/month each.
                </p>
              </div>

              {/* CTA */}
              <div className="flex items-center gap-3">
                <Link
                  href="/checkout"
                  className={`inline-flex items-center gap-2 px-4 py-2 ${urgencyLevel === 'high' ? 'bg-red-600 hover:bg-red-700' : urgencyLevel === 'medium' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg font-medium text-sm transition`}
                >
                  Subscribe Now - $25/month
                </Link>
                <p className="text-xs text-text-tertiary">
                  Keep all your data and progress
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className={`p-1 ${textColor} hover:opacity-70 transition flex-shrink-0`}
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

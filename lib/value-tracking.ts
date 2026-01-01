/**
 * Value Tracking Utility
 * Tracks user actions that save time/money to demonstrate ROI during trial
 */

import { createClient } from "@/lib/supabase/client";

// Time estimates for different actions (in minutes)
const TIME_SAVED_ESTIMATES = {
  email_drafted: 10,
  schedule_created: 30,
  report_generated: 20,
  resume_screened: 15,
  contract_summarized: 25,
  inventory_analyzed: 20,
  financial_summary: 30,
  task_list_created: 15,
  faq_generated: 20,
  policy_explained: 10,
  onboarding_materials: 45,
  reorder_list: 15,
  expense_categorized: 5,
  customer_response: 8,
  document_comparison: 20,
};

export type ValueEventType = keyof typeof TIME_SAVED_ESTIMATES;

/**
 * Track a value event for the current user
 */
export async function trackValueEvent(
  eventType: ValueEventType,
  agentType: string,
  description: string,
  customTimeSaved?: number
) {
  const supabase = createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('No user found for value tracking');
      return null;
    }

    const timeSaved = customTimeSaved || TIME_SAVED_ESTIMATES[eventType] || 0;

    // Call the database function to track the event
    const { data, error } = await supabase.rpc('track_value_event', {
      p_user_id: user.id,
      p_event_type: eventType,
      p_agent_type: agentType,
      p_time_saved_minutes: timeSaved,
      p_description: description,
    });

    if (error) {
      console.error('Error tracking value event:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception tracking value event:', error);
    return null;
  }
}

/**
 * Get total value delivered to a user
 */
export async function getUserValueSummary() {
  const supabase = createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select(`
        total_hours_saved,
        total_tasks_completed,
        total_emails_drafted,
        total_reports_generated,
        total_documents_processed
      `)
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching value summary:', error);
      return null;
    }

    return profile;
  } catch (error) {
    console.error('Exception fetching value summary:', error);
    return null;
  }
}

/**
 * Show a toast notification when value is delivered
 */
export function showValueNotification(
  eventType: ValueEventType,
  customMessage?: string
) {
  const timeSaved = TIME_SAVED_ESTIMATES[eventType];
  const message = customMessage || `Great! You just saved ~${timeSaved} minutes.`;
  
  // You can implement a toast notification here
  // For now, we'll just log it
  console.log(`[Value Delivered] ${message}`);
  
  return message;
}

/**
 * Calculate estimated monthly value based on usage
 */
export function calculateMonthlyValue(
  hoursSavedSoFar: number,
  daysSinceTrialStart: number,
  hourlyRate: number = 15
): number {
  if (daysSinceTrialStart === 0) return 0;
  
  const dailyAverage = hoursSavedSoFar / daysSinceTrialStart;
  const monthlyHours = dailyAverage * 30;
  const monthlyValue = monthlyHours * hourlyRate;
  
  return Math.round(monthlyValue);
}

/**
 * Get suggested next actions to increase value
 */
export function getSuggestedActions(profile: {
  total_emails_drafted: number;
  total_reports_generated: number;
  total_documents_processed: number;
}) {
  const suggestions = [];

  if (profile.total_emails_drafted === 0) {
    suggestions.push({
      agent: 'Customer Service',
      action: 'Draft your first customer email',
      timeSaved: 10,
      href: '/dashboard/customer-support',
    });
  }

  if (profile.total_reports_generated === 0) {
    suggestions.push({
      agent: 'Finances',
      action: 'Generate a financial summary',
      timeSaved: 30,
      href: '/dashboard/financial',
    });
  }

  if (profile.total_documents_processed === 0) {
    suggestions.push({
      agent: 'Contracts',
      action: 'Summarize a contract or policy',
      timeSaved: 25,
      href: '/dashboard/documents',
    });
  }

  // Always suggest a high-value action
  suggestions.push({
    agent: 'HR',
    action: 'Create an onboarding checklist',
    timeSaved: 45,
    href: '/dashboard/hr',
  });

  return suggestions.slice(0, 3); // Return top 3 suggestions
}

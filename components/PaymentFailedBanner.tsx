"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { CreditCard, AlertTriangle, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

export default function PaymentFailedBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [daysUntilLockout, setDaysUntilLockout] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    checkPaymentStatus();
  }, []);

  const checkPaymentStatus = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("subscription_status, stripe_customer_id")
        .eq("id", user.id)
        .single();

      if (!profile) return;

      // Show banner if subscription is past_due
      if (profile.subscription_status === "past_due") {
        setShowBanner(true);
        // Calculate days remaining (7-day grace period)
        // This would be based on actual payment failure date
        setDaysUntilLockout(7);
      }
    } catch (error) {
      console.error("Error checking payment status:", error);
    }
  };

  const handleUpdatePayment = async () => {
    try {
      // Create Stripe Customer Portal session
      const response = await fetch("/api/checkout/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Error opening customer portal:", error);
    }
  };

  if (!showBanner) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6"
    >
      <div className="flex items-start gap-4">
        <div className="p-2 bg-red-100 rounded-lg">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-red-900 mb-1">
            Payment Failed - Action Required
          </h3>
          
          <p className="text-sm text-red-800 mb-3">
            We couldn't process your payment. You have {daysUntilLockout} days to update your payment method before your account is suspended.
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={handleUpdatePayment}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition active:scale-95"
            >
              <CreditCard className="w-4 h-4" />
              Update Payment Method
              <ExternalLink className="w-3 h-3" />
            </button>
            
            <p className="text-xs text-red-700">
              Don't lose access to your data and automations
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

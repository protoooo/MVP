"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Check } from "lucide-react";

export default function CheckoutPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleCheckout = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError("Failed to start checkout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h2 className="text-xl font-medium text-gray-700">
            Subscribe to get started
          </h2>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-8 space-y-6">
          {/* Plan Details */}
          <div className="text-center pb-6 border-b border-gray-200">
            <div className="text-4xl font-bold text-gray-900 mb-2">$25</div>
            <div className="text-gray-600">per month (base plan)</div>
            <div className="mt-2 text-sm text-gray-600">
              + $10/month per additional team member
            </div>
            <div className="mt-2 inline-block px-4 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
              Base Plan
            </div>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">All 6 specialized agents</span>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">Unlimited document uploads</span>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">Up to 5 team members total</span>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">Automated reports & file generation</span>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">Shared team workspace</span>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">Priority support</span>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-6 rounded-full text-sm font-medium text-white bg-text-primary hover:bg-text-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-text-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                Subscribe Now
              </>
            )}
          </button>

          <p className="text-center text-xs text-gray-500">
            Secure payment powered by Stripe
          </p>

          <button
            onClick={() => router.push("/workspace")}
            className="w-full text-center text-sm text-gray-600 hover:text-gray-900 transition"
          >
            Back to workspace
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Cancel anytime. No hidden fees.
        </p>
      </div>
    </div>
  );
}

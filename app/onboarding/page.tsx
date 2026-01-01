"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Building2, Users, Check } from "lucide-react";

const industries = [
  { value: "bakery", label: "Bakery", description: "Track daily sales, inventory, and waste" },
  { value: "bar", label: "Bar", description: "Manage pour costs, inventory, and revenue" },
  { value: "brewery", label: "Brewery", description: "Monitor production, costs, and distribution" },
  { value: "retail", label: "Retail Shop", description: "Track sales, inventory, and customer metrics" },
  { value: "restaurant", label: "Restaurant", description: "Manage costs, staff, and customer experience" },
  { value: "other", label: "Other", description: "Custom business configuration" },
];

const businessSizes = [
  { value: "1-5", label: "1-5 employees" },
  { value: "6-10", label: "6-10 employees" },
  { value: "11-25", label: "11-25 employees" },
  { value: "26-50", label: "26-50 employees" },
  { value: "50+", label: "50+ employees" },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [businessSize, setBusinessSize] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create/update user profile
      const { error: profileError } = await supabase
        .from("user_profiles")
        .upsert({
          id: user.id,
          business_name: businessName,
          industry,
          business_size: businessSize,
          setup_completed: true,
          onboarding_step: 3,
        });

      if (profileError) throw profileError;

      // Redirect to Stripe checkout
      router.push("/checkout");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to complete onboarding");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h2 className="text-xl font-medium text-gray-700">Let's set up your business</h2>
          <p className="mt-2 text-sm text-gray-600">
            This will help us customize your experience
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                    s <= step
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {s < step ? <Check className="w-5 h-5" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-16 h-1 mx-2 ${
                      s < step ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Business Name */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Building2 className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">
                  What's your business name?
                </h3>
              </div>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="My Business"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              <button
                onClick={() => businessName && setStep(2)}
                disabled={!businessName}
                className="w-full py-3 px-4 rounded-full text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 2: Industry */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  What type of business do you run?
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {industries.map((ind) => (
                  <button
                    key={ind.value}
                    onClick={() => setIndustry(ind.value)}
                    className={`p-4 rounded-lg border-2 text-left transition ${
                      industry === ind.value
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-semibold text-gray-900">{ind.label}</div>
                    <div className="text-xs text-gray-600 mt-1">{ind.description}</div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 px-4 rounded-full text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={() => industry && setStep(3)}
                  disabled={!industry}
                  className="flex-1 py-3 px-4 rounded-full text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Business Size */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Users className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">
                  How many people work at {businessName}?
                </h3>
              </div>
              <div className="space-y-2">
                {businessSizes.map((size) => (
                  <button
                    key={size.value}
                    onClick={() => setBusinessSize(size.value)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition ${
                      businessSize === size.value
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-medium text-gray-900">{size.label}</div>
                  </button>
                ))}
              </div>
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 px-4 rounded-full text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={!businessSize || loading}
                  className="flex-1 py-3 px-4 rounded-full text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? "Completing..." : "Complete Setup"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Building2, Users, Check, Calendar, Mail, Receipt, FileText, Plus, Clock } from "lucide-react";

const industries = [
  { value: "bakery", label: "Bakery / Coffee Shop", description: "Schedules, production, sales tracking" },
  { value: "contractor", label: "Contractor / Trades", description: "Estimates, schedules, invoices" },
  { value: "freelancer", label: "Freelancer / Consultant", description: "Proposals, invoices, time tracking" },
  { value: "restaurant", label: "Restaurant / Bar", description: "Staff schedules, inventory, sales" },
  { value: "retail", label: "Retail Shop", description: "Inventory, sales, customer tracking" },
  { value: "other", label: "Other Business", description: "Custom configuration" },
];

const businessSizes = [
  { value: "solo", label: "Just me (solo entrepreneur)" },
  { value: "2-5", label: "2-5 people" },
  { value: "6-10", label: "6-10 people" },
  { value: "11-25", label: "11-25 people" },
  { value: "26+", label: "26+ people" },
];

const quickWinTasks = [
  {
    icon: Calendar,
    name: "Create this week's schedule",
    time: "Usually takes: 3-4 hours",
    value: "schedule"
  },
  {
    icon: Mail,
    name: "Draft a customer email",
    time: "Usually takes: 20-30 minutes",
    value: "email"
  },
  {
    icon: Receipt,
    name: "Create an invoice",
    time: "Usually takes: 15-20 minutes",
    value: "invoice"
  },
  {
    icon: FileText,
    name: "Write a weekly report",
    time: "Usually takes: 1-2 hours",
    value: "report"
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
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
      return;
    }

    // Check if profile already exists and is complete
    const { data: existingProfile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (existingProfile?.setup_completed) {
      router.push("/workspace");
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    setError("");

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        throw new Error(`Authentication error: ${authError.message}`);
      }

      if (!user) {
        throw new Error("Not authenticated");
      }

      console.log("Creating profile for user:", user.id);

      // First, try to check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      let profileError;

      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from("user_profiles")
          .update({
            business_name: businessName,
            industry,
            business_size: businessSize,
            setup_completed: true,
            onboarding_step: 3,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);
        
        profileError = updateError;
      } else {
        // Insert new profile
        const { error: insertError } = await supabase
          .from("user_profiles")
          .insert({
            id: user.id,
            business_name: businessName,
            industry,
            business_size: businessSize,
            setup_completed: true,
            onboarding_step: 3,
          });
        
        profileError = insertError;
      }

      if (profileError) {
        console.error("Profile operation error:", profileError);
        throw new Error(`Failed to save profile: ${profileError.message}`);
      }

      console.log("Profile saved successfully");

      // Redirect to checkout
      router.push("/checkout");
    } catch (err: unknown) {
      console.error("Onboarding error:", err);
      setError(err instanceof Error ? err.message : "Failed to complete onboarding");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        {step === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Let's save you some time today.</h2>
              <p className="text-lg text-gray-600">
                Pick a task that's eating your hours:
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {quickWinTasks.map((task) => {
                const Icon = task.icon;
                return (
                  <button
                    key={task.value}
                    onClick={() => {
                      setSelectedTask(task.value);
                      setStep(1);
                    }}
                    className="w-full p-5 rounded-xl border-2 border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition text-left group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-indigo-100 group-hover:bg-indigo-200 transition">
                        <Icon className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 mb-1">{task.name}</div>
                        <div className="text-sm text-gray-600">{task.time}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
              
              <button
                onClick={() => setStep(1)}
                className="w-full p-5 rounded-xl border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-gray-100">
                    <Plus className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-700">I'll explore myself</div>
                    <div className="text-sm text-gray-500">Set up workspace first</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {step >= 1 && (
          <>
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
                    className="w-full py-2.5 px-5 rounded-full text-sm font-medium text-white bg-text-primary hover:bg-text-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-text-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
                      className="flex-1 py-2.5 px-5 rounded-full text-sm font-medium text-text-primary bg-background-secondary hover:bg-background-tertiary transition-all border border-border"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => industry && setStep(3)}
                      disabled={!industry}
                      className="flex-1 py-2.5 px-5 rounded-full text-sm font-medium text-white bg-text-primary hover:bg-text-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-text-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
                      className="flex-1 py-2.5 px-5 rounded-full text-sm font-medium text-text-primary bg-background-secondary hover:bg-background-tertiary transition-all border border-border"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleComplete}
                      disabled={!businessSize || loading}
                      className="flex-1 py-2.5 px-5 rounded-full text-sm font-medium text-white bg-text-primary hover:bg-text-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-text-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {loading ? "Completing..." : "Complete Setup"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

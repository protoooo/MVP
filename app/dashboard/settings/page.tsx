"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Settings as SettingsIcon, Building2, CreditCard, Bell, Shield, Save } from "lucide-react";

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [businessSize, setBusinessSize] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profileData } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileData) {
      setProfile(profileData);
      setBusinessName(profileData.business_name || "");
      setIndustry(profileData.industry || "");
      setBusinessSize(profileData.business_size || "");
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("user_profiles")
        .update({
          business_name: businessName,
          industry,
          business_size: businessSize,
        })
        .eq("id", user.id);

      if (error) throw error;

      setMessage("Settings saved successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-4 bg-background-tertiary rounded-xl border border-border">
            <SettingsIcon className="w-8 h-8 text-text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
            <p className="text-text-secondary mt-1">
              Manage your account and business information
            </p>
          </div>
        </div>

        {/* Business Information */}
        <div className="bg-surface rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <Building2 className="w-5 h-5 text-text-secondary" />
            <h2 className="text-lg font-semibold text-text-primary">Business Information</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Business Name
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background-secondary text-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-2 focus:ring-text-secondary focus:border-text-secondary transition"
                placeholder="My Business"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Industry
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:border-text-secondary transition"
              >
                <option value="">Select an industry</option>
                <option value="bakery">Bakery</option>
                <option value="bar">Bar</option>
                <option value="brewery">Brewery</option>
                <option value="retail">Retail Shop</option>
                <option value="restaurant">Restaurant</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Business Size
              </label>
              <select
                value={businessSize}
                onChange={(e) => setBusinessSize(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:border-text-secondary transition"
              >
                <option value="">Select size</option>
                <option value="1-5">1-5 employees</option>
                <option value="6-10">6-10 employees</option>
                <option value="11-25">11-25 employees</option>
                <option value="26-50">26-50 employees</option>
                <option value="50+">50+ employees</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            {message && (
              <p className={`text-sm ${message.includes("success") ? "text-success" : "text-error"}`}>
                {message}
              </p>
            )}
            <button
              onClick={handleSave}
              disabled={loading}
              className="ml-auto inline-flex items-center gap-2 px-5 py-2 bg-text-primary text-white rounded-full text-sm font-medium hover:bg-text-secondary transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Subscription */}
        <div className="bg-surface rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <CreditCard className="w-5 h-5 text-text-secondary" />
            <h2 className="text-lg font-semibold text-text-primary">Subscription</h2>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text-primary">Unlimited Plan</p>
              <p className="text-sm text-text-secondary mt-1">$50/month - All agents, unlimited usage</p>
            </div>
            <span className="px-3 py-1 bg-success-light text-success-dark rounded-full text-sm font-medium">
              Active
            </span>
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-sm text-text-secondary">
              Manage your subscription and billing through Stripe Customer Portal.
            </p>
            <button
              className="mt-4 px-5 py-2 bg-background-secondary text-text-primary rounded-full text-sm font-medium hover:bg-background-tertiary transition border border-border"
              onClick={() => {
                // TODO: Implement Stripe Customer Portal
                alert("Stripe Customer Portal integration coming soon");
              }}
            >
              Manage Billing
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-surface rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-5 h-5 text-text-secondary" />
            <h2 className="text-lg font-semibold text-text-primary">Notifications</h2>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium text-text-primary">Agent Recommendations</p>
                <p className="text-sm text-text-secondary">Get notified when agents have suggestions</p>
              </div>
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-border" />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium text-text-primary">Weekly Reports</p>
                <p className="text-sm text-text-secondary">Receive weekly automation summaries</p>
              </div>
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-border" />
            </label>
          </div>
        </div>

        {/* Account Security */}
        <div className="bg-surface rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-5 h-5 text-text-secondary" />
            <h2 className="text-lg font-semibold text-text-primary">Account Security</h2>
          </div>

          <div className="space-y-4">
            <div>
              <p className="font-medium text-text-primary mb-2">Password</p>
              <button
                className="px-5 py-2 bg-background-secondary text-text-primary rounded-full text-sm font-medium hover:bg-background-tertiary transition border border-border"
                onClick={() => {
                  // TODO: Implement password reset
                  alert("Password reset functionality coming soon");
                }}
              >
                Change Password
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

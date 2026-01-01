"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Users, 
  CreditCard, 
  FileText, 
  TrendingUp, 
  Activity,
  DollarSign,
  Database,
  AlertCircle
} from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalDocuments: number;
  monthlyRevenue: number;
  recentUsers: any[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeSubscriptions: 0,
    totalDocuments: 0,
    monthlyRevenue: 0,
    recentUsers: [],
  });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

  const checkAdminAndLoadData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.log("Not authenticated, redirecting to login");
        router.push("/login");
        return;
      }

      console.log("User authenticated:", user.email);

      // Check if user is admin - with better error handling
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("is_admin, business_name, industry")
        .eq("id", user.id)
        .single();

      console.log("Profile data:", profile);
      console.log("Profile error:", profileError);

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        setError("Could not verify admin status. Please contact support.");
        setLoading(false);
        return;
      }

      if (!profile?.is_admin) {
        console.log("User is not admin, redirecting");
        router.push("/dashboard");
        return;
      }

      console.log("Admin verified, loading dashboard");
      setIsAdmin(true);
      await loadDashboardData();
    } catch (err) {
      console.error("Error in checkAdminAndLoadData:", err);
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      // Get total users count
      const { count: userCount, error: userError } = await supabase
        .from("user_profiles")
        .select("*", { count: "exact", head: true });

      if (userError) console.error("Error counting users:", userError);

      // Get active subscriptions count
      const { count: subCount, error: subError } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      if (subError) console.error("Error counting subscriptions:", subError);

      // Get total documents count
      const { count: docCount, error: docError } = await supabase
        .from("business_documents")
        .select("*", { count: "exact", head: true });

      if (docError) console.error("Error counting documents:", docError);

      // Get recent users
      const { data: recentUsers, error: usersError } = await supabase
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      if (usersError) console.error("Error fetching users:", usersError);

      setStats({
        totalUsers: userCount || 0,
        activeSubscriptions: subCount || 0,
        totalDocuments: docCount || 0,
        monthlyRevenue: (subCount || 0) * 50,
        recentUsers: recentUsers || [],
      });
    } catch (error) {
      console.error("Error loading admin data:", error);
      setError("Error loading dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Show error state
  if (error && !loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md w-full bg-surface rounded-2xl border border-border p-8">
          <AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-text-primary text-center mb-2">
            Access Error
          </h2>
          <p className="text-sm text-text-secondary text-center mb-6">
            {error}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex-1 px-4 py-2 text-sm font-medium bg-background-secondary hover:bg-background-tertiary rounded-lg transition"
            >
              Go to Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-sage-600 hover:bg-sage-700 rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading or return null if not admin
  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-600 mx-auto mb-4"></div>
          <p className="text-sm text-text-secondary">
            {loading ? "Loading admin dashboard..." : "Checking permissions..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sage-100 flex items-center justify-center">
                <Activity className="w-5 h-5 text-sage-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-text-primary">Admin Dashboard</h1>
                <p className="text-xs text-text-tertiary">naiborhood</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary
                bg-background-secondary hover:bg-background-tertiary rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Users */}
            <div className="bg-surface rounded-2xl border border-border p-6 shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-sky-600" />
                </div>
                <span className="text-2xs font-medium text-success bg-success-light px-2 py-1 rounded-full">
                  Active
                </span>
              </div>
              <h3 className="text-2xl font-semibold text-text-primary mb-1">
                {stats.totalUsers}
              </h3>
              <p className="text-sm text-text-secondary">Total Users</p>
            </div>

            {/* Active Subscriptions */}
            <div className="bg-surface rounded-2xl border border-border p-6 shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-sage-100 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-sage-600" />
                </div>
                <span className="text-2xs font-medium text-success bg-success-light px-2 py-1 rounded-full">
                  Active
                </span>
              </div>
              <h3 className="text-2xl font-semibold text-text-primary mb-1">
                {stats.activeSubscriptions}
              </h3>
              <p className="text-sm text-text-secondary">Active Subscriptions</p>
            </div>

            {/* Monthly Revenue */}
            <div className="bg-surface rounded-2xl border border-border p-6 shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-honey-100 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-honey-600" />
                </div>
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <h3 className="text-2xl font-semibold text-text-primary mb-1">
                ${stats.monthlyRevenue.toLocaleString()}
              </h3>
              <p className="text-sm text-text-secondary">Monthly Revenue</p>
            </div>

            {/* Total Documents */}
            <div className="bg-surface rounded-2xl border border-border p-6 shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-lavender-100 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-lavender-600" />
                </div>
                <Database className="w-5 h-5 text-text-tertiary" />
              </div>
              <h3 className="text-2xl font-semibold text-text-primary mb-1">
                {stats.totalDocuments}
              </h3>
              <p className="text-sm text-text-secondary">Documents Uploaded</p>
            </div>
          </div>

          {/* Recent Users */}
          <div className="bg-surface rounded-2xl border border-border shadow-soft">
            <div className="px-6 py-5 border-b border-border-light">
              <h2 className="text-lg font-semibold text-text-primary">Recent Users</h2>
            </div>
            <div className="p-6">
              {stats.recentUsers.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
                  <p className="text-sm text-text-secondary">No users yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.recentUsers.map((user) => (
                    <div 
                      key={user.id} 
                      className="flex items-center justify-between p-4 rounded-xl bg-background-secondary hover:bg-background-tertiary transition"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-sage-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-sage-700">
                            {user.business_name?.[0]?.toUpperCase() || "?"}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-text-primary">
                            {user.business_name || "Unknown Business"}
                          </h4>
                          <p className="text-sm text-text-secondary capitalize">
                            {user.industry || "No industry"} • {user.is_admin ? "Admin" : "User"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-text-primary">
                          {user.business_size || "N/A"}
                        </p>
                        <p className="text-xs text-text-tertiary">
                          {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* System Status */}
          <div className="bg-surface rounded-2xl border border-border p-6 shadow-soft">
            <h2 className="text-lg font-semibold text-text-primary mb-4">System Status</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-background-secondary">
                <span className="text-sm text-text-secondary">Database</span>
                <span className="flex items-center gap-2 text-sm font-medium text-success">
                  <div className="w-2 h-2 rounded-full bg-success"></div>
                  Operational
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-background-secondary">
                <span className="text-sm text-text-secondary">API Services</span>
                <span className="flex items-center gap-2 text-sm font-medium text-success">
                  <div className="w-2 h-2 rounded-full bg-success"></div>
                  Operational
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-background-secondary">
                <span className="text-sm text-text-secondary">Stripe Integration</span>
                <span className="flex items-center gap-2 text-sm font-medium text-success">
                  <div className="w-2 h-2 rounded-full bg-success"></div>
                  Operational
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

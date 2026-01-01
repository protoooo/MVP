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
  recentActivity: any[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeSubscriptions: 0,
    totalDocuments: 0,
    monthlyRevenue: 0,
    recentUsers: [],
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

  const checkAdminAndLoadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push("/login");
      return;
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      router.push("/dashboard");
      return;
    }

    setIsAdmin(true);
    await loadDashboardData();
  };

  const loadDashboardData = async () => {
    try {
      // Get total users
      const { count: userCount } = await supabase
        .from("user_profiles")
        .select("*", { count: "exact", head: true });

      // Get active subscriptions
      const { count: subCount } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      // Get total documents
      const { count: docCount } = await supabase
        .from("business_documents")
        .select("*", { count: "exact", head: true });

      // Get recent users
      const { data: recentUsers } = await supabase
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      setStats({
        totalUsers: userCount || 0,
        activeSubscriptions: subCount || 0,
        totalDocuments: docCount || 0,
        monthlyRevenue: (subCount || 0) * 50,
        recentUsers: recentUsers || [],
        recentActivity: [],
      });
    } catch (error) {
      console.error("Error loading admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (!isAdmin) {
    return null;
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
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-600"></div>
          </div>
        ) : (
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
                              {user.industry || "No industry"}
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
        )}
      </main>
    </div>
  );
}

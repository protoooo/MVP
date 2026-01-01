"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Sparkles, 
  LayoutDashboard, 
  MessageSquare, 
  Users, 
  Package, 
  TrendingUp, 
  FileText, 
  Upload, 
  Settings, 
  LogOut,
  FileUp
} from "lucide-react";
import Link from "next/link";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
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
    setUser(user);

    // Get profile
    const { data: profileData } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    setProfile(profileData);

    // Check if onboarding is completed
    if (profileData && !profileData.setup_completed) {
      router.push("/onboarding");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Customer Support", href: "/dashboard/customer-support", icon: MessageSquare, color: "blue" },
    { name: "HR Assistant", href: "/dashboard/hr", icon: Users, color: "purple" },
    { name: "Inventory Manager", href: "/dashboard/inventory", icon: Package, color: "green" },
    { name: "Financial Analyst", href: "/dashboard/financial", icon: TrendingUp, color: "amber" },
    { name: "Document Reviewer", href: "/dashboard/documents", icon: FileText, color: "red" },
  ];

  const secondaryNavigation = [
    { name: "Upload Documents", href: "/dashboard/uploads", icon: FileUp },
    { name: "Reports", href: "/dashboard/reports", icon: Upload },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-6 border-b border-gray-200">
            <Sparkles className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">naiborhood</h1>
              {profile && (
                <p className="text-xs text-gray-500">{profile.business_name}</p>
              )}
            </div>
          </div>

          {/* Main Navigation */}
          <nav className="flex-1 px-4 py-6 overflow-y-auto">
            <div className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                );
              })}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="space-y-1">
                {secondaryNavigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
                        isActive
                          ? "bg-gray-100 text-gray-900"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>

          {/* User Profile */}
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-blue-700">
                    {user?.email?.[0].toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.email}
                  </p>
                  <p className="text-xs text-gray-500">Unlimited Plan</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-gray-600 transition"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pl-64">
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}

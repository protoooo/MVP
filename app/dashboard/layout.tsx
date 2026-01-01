"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  LayoutDashboard, 
  MessageSquare, 
  Users, 
  Package, 
  TrendingUp, 
  FileText, 
  Upload, 
  Settings, 
  LogOut,
  FileUp,
  ChevronRight
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

    const { data: profileData } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    setProfile(profileData);

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
    { name: "Customer Support", href: "/dashboard/customer-support", icon: MessageSquare, color: "sky" },
    { name: "HR Assistant", href: "/dashboard/hr", icon: Users, color: "lavender" },
    { name: "Inventory Manager", href: "/dashboard/inventory", icon: Package, color: "sage" },
    { name: "Financial Analyst", href: "/dashboard/financial", icon: TrendingUp, color: "honey" },
    { name: "Document Reviewer", href: "/dashboard/documents", icon: FileText, color: "clay" },
  ];

  const secondaryNavigation = [
    { name: "Upload Documents", href: "/dashboard/uploads", icon: FileUp },
    { name: "Reports", href: "/dashboard/reports", icon: Upload },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-surface border-r border-border">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-5 py-5 border-b border-border-light">
            <div>
              <h1 className="text-base font-semibold text-text-primary">Business Automation</h1>
              {profile && (
                <p className="text-xs text-text-tertiary truncate max-w-[200px]">
                  {profile.business_name}
                </p>
              )}
            </div>
          </div>

          {/* Main Navigation */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            <div className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                      isActive
                        ? "bg-background-tertiary text-text-primary shadow-inner-soft"
                        : "text-text-secondary hover:bg-background-hover hover:text-text-primary"
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1">{item.name}</span>
                    {isActive && (
                      <ChevronRight className="w-4 h-4 text-text-primary" />
                    )}
                  </Link>
                );
              })}
            </div>

            <div className="mt-6 pt-6 border-t border-border-light">
              <div className="space-y-1">
                {secondaryNavigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                        isActive
                          ? "bg-background-tertiary text-text-primary"
                          : "text-text-tertiary hover:bg-background-hover hover:text-text-secondary"
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>

          {/* User Profile */}
          <div className="px-3 py-4 border-t border-border-light">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-9 h-9 rounded-full bg-background-tertiary flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-text-primary">
                  {user?.email?.[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {user?.email}
                </p>
                <p className="text-xs text-text-tertiary">Unlimited Plan</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-text-tertiary hover:text-text-primary hover:bg-background-hover rounded-lg transition"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
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

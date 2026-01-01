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
  Brain,
  UsersRound
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
    { name: "Home", href: "/dashboard", icon: LayoutDashboard },
    { name: "Today's Priorities", href: "/dashboard/operations", icon: Brain },
    { name: "Customer Service", href: "/dashboard/customer-support", icon: MessageSquare },
    { name: "Staff & Hiring", href: "/dashboard/hr", icon: Users },
    { name: "Stock & Orders", href: "/dashboard/inventory", icon: Package },
    { name: "Money & Expenses", href: "/dashboard/financial", icon: TrendingUp },
    { name: "Contracts & Papers", href: "/dashboard/documents", icon: FileText },
  ];

  const secondaryNavigation = [
    { name: "Your Team", href: "/dashboard/team", icon: UsersRound },
    { name: "Upload Files", href: "/dashboard/uploads", icon: FileUp },
    { name: "Past Work", href: "/dashboard/reports", icon: Upload },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-60 bg-background-secondary border-r border-border">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-4 py-4 border-b border-border">
            <h1 className="text-sm font-semibold text-text-primary tracking-tight">
              {profile?.business_name || "Your Business"}
            </h1>
            <p className="text-xs text-text-tertiary truncate mt-0.5">
              {profile?.industry || "Business"}
            </p>
          </div>

          {/* Main Navigation */}
          <nav className="flex-1 px-2 py-3 overflow-y-auto">
            <div className="space-y-0.5">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm font-normal transition ${
                      isActive
                        ? "bg-background-hover text-text-primary"
                        : "text-text-secondary hover:bg-background-hover hover:text-text-primary"
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <div className="space-y-0.5">
                {secondaryNavigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm font-normal transition ${
                        isActive
                          ? "bg-background-hover text-text-primary"
                          : "text-text-tertiary hover:bg-background-hover hover:text-text-secondary"
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>

          {/* User Profile */}
          <div className="px-2 py-3 border-t border-border">
            <div className="flex items-center gap-2.5 px-2.5 py-1.5">
              <div className="w-7 h-7 rounded-full bg-background-hover flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-text-primary">
                  {user?.email?.[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text-primary truncate">
                  {user?.email}
                </p>
                <p className="text-2xs text-text-tertiary">$25/month</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-background-hover rounded transition"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pl-60">
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}

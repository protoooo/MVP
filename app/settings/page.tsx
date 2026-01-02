"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings as SettingsIcon, User, Palette, Bell, Building2, ChevronRight } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("workspace");

  const sections = [
    { id: "workspace", label: "Workspace", icon: Building2 },
    { id: "account", label: "Account", icon: User },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "notifications", label: "Notifications", icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Settings</h1>
          <p className="mt-2 text-text-secondary">
            Manage your workspace, account, and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition ${
                    activeSection === section.id
                      ? "bg-indigo-50 text-indigo-900 font-medium"
                      : "text-text-secondary hover:bg-background-secondary"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <section.icon className="w-5 h-5" />
                    <span>{section.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="md:col-span-3">
            <div className="bg-surface border border-border rounded-lg p-6">
              {activeSection === "workspace" && <WorkspaceSettings />}
              {activeSection === "account" && <AccountSettings />}
              {activeSection === "appearance" && <AppearanceSettings />}
              {activeSection === "notifications" && <NotificationSettings />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkspaceSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary mb-4">Workspace Settings</h2>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Workspace Name
          </label>
          <input
            type="text"
            defaultValue="My Workspace"
            className="w-full px-3 py-2 bg-background-secondary border border-border rounded-md text-text-primary focus:outline-none focus:border-indigo-500"
          />
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition">
          Save Changes
        </button>
      </div>
    </div>
  );
}

function AccountSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary mb-4">Account Settings</h2>
      </div>
    </div>
  );
}

function AppearanceSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary mb-4">Appearance</h2>
      </div>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary mb-4">Notifications</h2>
      </div>
    </div>
  );
}

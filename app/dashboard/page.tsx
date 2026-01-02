"use client";

import { useState } from "react";
import SchedulingTab from "./components/SchedulingTab";
import CommsTab from "./components/CommsTab";
import ChecklistsTab from "./components/ChecklistsTab";

type TabType = "scheduling" | "comms" | "checklists";

function TabButton({ 
  active, 
  onClick, 
  children 
}: { 
  active: boolean; 
  onClick: () => void; 
  children: React.ReactNode 
}) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
        active
          ? "border-indigo-600 text-indigo-600"
          : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
      }`}
    >
      {children}
    </button>
  );
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("scheduling");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Business Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your team, schedules, and tasks</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex gap-2 border-b border-gray-200">
            <TabButton 
              active={activeTab === "scheduling"} 
              onClick={() => setActiveTab("scheduling")}
            >
              📅 Scheduling
            </TabButton>
            <TabButton 
              active={activeTab === "comms"} 
              onClick={() => setActiveTab("comms")}
            >
              💬 Communications
            </TabButton>
            <TabButton 
              active={activeTab === "checklists"} 
              onClick={() => setActiveTab("checklists")}
            >
              ✅ Checklists
            </TabButton>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "scheduling" && <SchedulingTab />}
            {activeTab === "comms" && <CommsTab />}
            {activeTab === "checklists" && <ChecklistsTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

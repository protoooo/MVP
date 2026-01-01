"use client";

import { ReactNode } from "react";

interface AgentCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  color: string;
}

export default function AgentCard({ icon, title, description, onClick, color }: AgentCardProps) {
  return (
    <button
      onClick={onClick}
      className={`group relative p-6 rounded-2xl border-2 border-transparent hover:border-${color}-500 bg-white dark:bg-gray-800 shadow-md hover:shadow-xl transition-all duration-300 text-left w-full`}
    >
      <div className={`inline-flex p-3 rounded-xl bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600 dark:text-${color}-400 mb-4 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300 text-sm">{description}</p>
      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-${color}-500 to-${color}-600 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity`}></div>
    </button>
  );
}

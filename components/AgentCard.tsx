"use client";

import { ReactNode } from "react";

interface AgentCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  color: string;
}

const colorStyles = {
  blue: {
    border: "hover:border-blue-500",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-600 dark:text-blue-400",
    gradient: "bg-gradient-to-r from-blue-500 to-blue-600",
  },
  purple: {
    border: "hover:border-purple-500",
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-600 dark:text-purple-400",
    gradient: "bg-gradient-to-r from-purple-500 to-purple-600",
  },
  green: {
    border: "hover:border-green-500",
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-600 dark:text-green-400",
    gradient: "bg-gradient-to-r from-green-500 to-green-600",
  },
  yellow: {
    border: "hover:border-yellow-500",
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-600 dark:text-yellow-400",
    gradient: "bg-gradient-to-r from-yellow-500 to-yellow-600",
  },
  red: {
    border: "hover:border-red-500",
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-600 dark:text-red-400",
    gradient: "bg-gradient-to-r from-red-500 to-red-600",
  },
};

export default function AgentCard({ icon, title, description, onClick, color }: AgentCardProps) {
  const styles = colorStyles[color as keyof typeof colorStyles] || colorStyles.blue;

  return (
    <button
      onClick={onClick}
      className={`group relative p-6 rounded-2xl border-2 border-transparent ${styles.border} bg-white dark:bg-gray-800 shadow-md hover:shadow-xl transition-all duration-300 text-left w-full`}
    >
      <div className={`inline-flex p-3 rounded-xl ${styles.bg} ${styles.text} mb-4 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300 text-sm">{description}</p>
      <div className={`absolute bottom-0 left-0 right-0 h-1 ${styles.gradient} rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity`}></div>
    </button>
  );
}

"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

interface AgentCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  color: string;
  capabilities?: string[];
  index?: number;
}

const colorStyles = {
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    border: "border-blue-200",
    hoverBorder: "hover:border-blue-500",
  },
  purple: {
    bg: "bg-purple-50",
    text: "text-purple-600",
    border: "border-purple-200",
    hoverBorder: "hover:border-purple-500",
  },
  green: {
    bg: "bg-green-50",
    text: "text-green-600",
    border: "border-green-200",
    hoverBorder: "hover:border-green-500",
  },
  amber: {
    bg: "bg-amber-50",
    text: "text-amber-600",
    border: "border-amber-200",
    hoverBorder: "hover:border-amber-500",
  },
  red: {
    bg: "bg-red-50",
    text: "text-red-600",
    border: "border-red-200",
    hoverBorder: "hover:border-red-500",
  },
};

export default function AgentCard({ 
  icon, 
  title, 
  description, 
  onClick, 
  color, 
  capabilities,
  index = 0 
}: AgentCardProps) {
  const styles = colorStyles[color as keyof typeof colorStyles] || colorStyles.blue;

  return (
    <motion.button
      onClick={onClick}
      className={`group relative p-24 rounded-lg border-2 ${styles.border} ${styles.hoverBorder} bg-white shadow-sm text-left w-full transition-colors-smooth`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.1,
        ease: [0.23, 1, 0.32, 1],
      }}
      whileHover={{
        scale: 1.02,
        y: -4,
        transition: { type: "spring", stiffness: 300, damping: 20 },
      }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Icon container */}
      <div className={`inline-flex p-12 rounded-full ${styles.bg} ${styles.text} mb-16 transition-smooth group-hover:scale-110`}>
        {icon}
      </div>
      
      {/* Title */}
      <h3 className="text-xl font-semibold text-text-primary mb-8">{title}</h3>
      
      {/* Description */}
      <p className="text-sm text-text-secondary mb-16 leading-relaxed">{description}</p>
      
      {/* Capabilities badges */}
      {capabilities && capabilities.length > 0 && (
        <div className="flex flex-wrap gap-8 mb-16">
          {capabilities.slice(0, 3).map((capability, idx) => (
            <span
              key={idx}
              className={`inline-flex items-center px-8 py-4 rounded text-xs font-medium ${styles.bg} ${styles.text}`}
            >
              {capability}
            </span>
          ))}
          {capabilities.length > 3 && (
            <span className="inline-flex items-center px-8 py-4 rounded text-xs font-medium bg-background-secondary text-text-tertiary">
              +{capabilities.length - 3} more
            </span>
          )}
        </div>
      )}
      
      {/* Start button */}
      <div className={`inline-flex items-center text-sm font-medium ${styles.text} group-hover:gap-8 transition-all`}>
        Start conversation
        <svg 
          className="w-16 h-16 ml-4 group-hover:translate-x-4 transition-transform" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>

      {/* Hover shadow effect */}
      <div className="absolute inset-0 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
    </motion.button>
  );
}

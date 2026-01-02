"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface CapabilityCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  examples: string[];
  color?: string;
  onClick?: () => void;
}

export default function CapabilityCard({
  icon: Icon,
  title,
  description,
  examples,
  color = "indigo",
  onClick,
}: CapabilityCardProps) {
  const colorClasses = {
    indigo: {
      bg: "bg-indigo-50",
      border: "border-indigo-200",
      icon: "text-indigo-600",
      hover: "hover:border-indigo-400",
    },
    sky: {
      bg: "bg-sky-50",
      border: "border-sky-200",
      icon: "text-sky-600",
      hover: "hover:border-sky-400",
    },
    lavender: {
      bg: "bg-lavender-50",
      border: "border-lavender-200",
      icon: "text-lavender-600",
      hover: "hover:border-lavender-400",
    },
    sage: {
      bg: "bg-sage-50",
      border: "border-sage-200",
      icon: "text-sage-600",
      hover: "hover:border-sage-400",
    },
  };

  const colors = colorClasses[color as keyof typeof colorClasses] || colorClasses.indigo;

  return (
    <motion.button
      onClick={onClick}
      className={`text-left w-full p-4 border ${colors.border} ${colors.bg} rounded-xl ${colors.hover} transition-all hover:shadow-notion-sm`}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg bg-white flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${colors.icon}`} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-primary mb-1">
            {title}
          </h3>
          <p className="text-xs text-text-secondary mb-2 leading-relaxed">
            {description}
          </p>

          {/* Examples */}
          <div className="space-y-1">
            {examples.slice(0, 2).map((example, index) => (
              <div key={index} className="flex items-start gap-1.5">
                <span className="text-xs text-text-tertiary mt-0.5">•</span>
                <p className="text-xs text-text-tertiary leading-relaxed">
                  {example}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.button>
  );
}

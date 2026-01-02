"use client";

import { motion } from "framer-motion";

interface ProtoIconProps {
  className?: string;
  animated?: boolean;
}

/**
 * Proto's custom icon - a chunky, professional animated planet/sphere
 * Similar to GitHub Copilot's thinking icon and Supabase's aesthetic
 */
export default function ProtoIcon({ className = "w-5 h-5", animated = false }: ProtoIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer ring/orbit - chunky style */}
      <motion.ellipse
        cx="12"
        cy="12"
        rx="10"
        ry="10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={
          animated
            ? {
                pathLength: [0, 1, 1, 0],
                opacity: [0, 1, 1, 0],
                rotate: [0, 360],
              }
            : { pathLength: 1, opacity: 1 }
        }
        transition={
          animated
            ? {
                pathLength: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                opacity: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                rotate: { duration: 8, repeat: Infinity, ease: "linear" },
              }
            : {}
        }
        style={{ originX: "50%", originY: "50%" }}
      />

      {/* Inner core - solid chunky planet */}
      <motion.circle
        cx="12"
        cy="12"
        r="6"
        fill="currentColor"
        initial={{ scale: 0.8, opacity: 0.8 }}
        animate={
          animated
            ? {
                scale: [0.8, 1, 0.8],
                opacity: [0.8, 1, 0.8],
              }
            : { scale: 1, opacity: 1 }
        }
        transition={
          animated
            ? {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }
            : {}
        }
      />

      {/* Orbital rings - like planet rings */}
      <motion.ellipse
        cx="12"
        cy="12"
        rx="9"
        ry="3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
        initial={{ rotate: -15 }}
        animate={
          animated
            ? {
                rotate: [345, 705], // -15 to 345 degrees
              }
            : { rotate: -15 }
        }
        transition={
          animated
            ? {
                duration: 6,
                repeat: Infinity,
                ease: "linear",
              }
            : {}
        }
        style={{ originX: "50%", originY: "50%" }}
      />

      {/* Sparkle/glow effect top right */}
      <motion.circle
        cx="16"
        cy="8"
        r="1.5"
        fill="currentColor"
        initial={{ scale: 0, opacity: 0 }}
        animate={
          animated
            ? {
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
              }
            : { scale: 0, opacity: 0 }
        }
        transition={
          animated
            ? {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5,
              }
            : {}
        }
      />

      {/* Secondary sparkle bottom left */}
      <motion.circle
        cx="8"
        cy="16"
        r="1"
        fill="currentColor"
        initial={{ scale: 0, opacity: 0 }}
        animate={
          animated
            ? {
                scale: [0, 1, 0],
                opacity: [0, 0.8, 0],
              }
            : { scale: 0, opacity: 0 }
        }
        transition={
          animated
            ? {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }
            : {}
        }
      />
    </svg>
  );
}

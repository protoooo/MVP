"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Info, Sparkles, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "value";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

let addToastFn: ((toast: Omit<Toast, "id">) => void) | null = null;

export function showToast(
  message: string,
  type: ToastType = "info",
  duration: number = 5000
) {
  if (addToastFn) {
    addToastFn({ message, type, duration });
  }
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    addToastFn = (toast: Omit<Toast, "id">) => {
      const id = `toast_${Date.now()}_${Math.random()}`;
      const newToast = { ...toast, id };
      setToasts((prev) => [...prev, newToast]);

      // Auto-dismiss after duration
      if (toast.duration && toast.duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, toast.duration);
      }
    };

    return () => {
      addToastFn = null;
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case "success":
        return {
          bg: "bg-green-50",
          border: "border-green-200",
          text: "text-green-800",
          icon: <CheckCircle className="w-5 h-5 text-green-600" />,
        };
      case "error":
        return {
          bg: "bg-red-50",
          border: "border-red-200",
          text: "text-red-800",
          icon: <XCircle className="w-5 h-5 text-red-600" />,
        };
      case "value":
        return {
          bg: "bg-purple-50",
          border: "border-purple-200",
          text: "text-purple-800",
          icon: <Sparkles className="w-5 h-5 text-purple-600" />,
        };
      default:
        return {
          bg: "bg-blue-50",
          border: "border-blue-200",
          text: "text-blue-800",
          icon: <Info className="w-5 h-5 text-blue-600" />,
        };
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => {
          const styles = getToastStyles(toast.type);
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`${styles.bg} ${styles.border} border rounded-xl p-4 shadow-lg backdrop-blur-sm`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">{styles.icon}</div>
                <p className={`flex-1 text-sm font-medium ${styles.text}`}>
                  {toast.message}
                </p>
                <button
                  onClick={() => removeToast(toast.id)}
                  className={`flex-shrink-0 ${styles.text} opacity-60 hover:opacity-100 transition`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

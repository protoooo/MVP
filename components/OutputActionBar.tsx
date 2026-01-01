"use client";

import { useState } from "react";
import { Copy, Mail, Download, Share2, Check } from "lucide-react";
import { motion } from "framer-motion";
import { showToast } from "./Toast";

interface OutputActionBarProps {
  content: string;
  title?: string;
  fileType?: "pdf" | "excel" | "word" | "csv" | "json" | "text";
  onDownload?: () => void;
  showEmail?: boolean;
  showShare?: boolean;
}

export default function OutputActionBar({
  content,
  title = "Output",
  fileType = "text",
  onDownload,
  showEmail = true,
  showShare = false,
}: OutputActionBarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      showToast("Copied to clipboard!", "success", 2000);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      showToast("Failed to copy to clipboard", "error");
    }
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(title);
    const body = encodeURIComponent(content);
    const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
    window.location.href = mailtoLink;
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }

    // Default download behavior
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, "-")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast("Downloaded successfully!", "success", 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: content,
        });
        showToast("Shared successfully!", "success", 2000);
      } catch (error) {
        // User cancelled share
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-gray-600">Quick Actions</span>
        
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-green-600">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy</span>
              </>
            )}
          </motion.button>

          {showEmail && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleEmail}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
            >
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">Email</span>
            </motion.button>
          )}

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download</span>
          </motion.button>

          {showShare && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Share</span>
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Link2, Check, Copy, Globe, Users } from "lucide-react";
import type { PermissionLevel } from "@/lib/notion/types";

interface ShareModalProps {
  pageId: string;
  onClose: () => void;
}

export default function ShareModal({ pageId, onClose }: ShareModalProps) {
  const [shareUrl, setShareUrl] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>("can_view");
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadShareSettings();
  }, [pageId]);

  const loadShareSettings = async () => {
    const { data } = await supabase
      .from("shares")
      .select("*")
      .eq("page_id", pageId)
      .single();

    if (data) {
      setShareUrl(data.share_url);
      setIsPublic(data.public);
      setPermissionLevel(data.permission_level);
    } else {
      // Generate new share URL
      const newShareUrl = `${window.location.origin}/share/${pageId}`;
      setShareUrl(newShareUrl);
    }
  };

  const createOrUpdateShare = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("shares")
      .upsert({
        page_id: pageId,
        share_url: shareUrl,
        permission_level: permissionLevel,
        public: isPublic,
        created_by: user.id,
      });

    if (error) {
      console.error("Error updating share:", error);
    }
    setLoading(false);
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inviteUser = async () => {
    if (!inviteEmail) return;
    
    setLoading(true);
    // In a real implementation, this would send an email invite
    // For now, we'll just add the permission
    const { error } = await supabase
      .from("page_permissions")
      .insert({
        page_id: pageId,
        user_id: inviteEmail, // This should be a user ID, not email
        permission_level: permissionLevel,
      });

    if (!error) {
      setInviteEmail("");
    }
    setLoading(false);
  };

  const permissionOptions: { value: PermissionLevel; label: string; description: string }[] = [
    { value: "full_access", label: "Full access", description: "Can edit and share" },
    { value: "can_edit", label: "Can edit", description: "Can edit but not share" },
    { value: "can_comment", label: "Can comment", description: "Can view and comment" },
    { value: "can_view", label: "Can view", description: "Can only view" },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b border-border p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Share this page</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-background-secondary rounded"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Invite People */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Invite people
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="name@example.com"
                className="flex-1 px-3 py-2 bg-background-secondary border border-border rounded-md 
                  text-text-primary text-sm focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={inviteUser}
                disabled={!inviteEmail || loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm 
                  hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Invite
              </button>
            </div>
          </div>

          {/* Share Link */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-text-primary">
                Share link
              </label>
              <button
                onClick={() => {
                  setIsPublic(!isPublic);
                  createOrUpdateShare();
                }}
                className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm transition ${
                  isPublic
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-background-secondary text-text-secondary"
                }`}
              >
                <Globe className="w-4 h-4" />
                {isPublic ? "Public" : "Private"}
              </button>
            </div>

            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2 bg-background-secondary border border-border rounded-md 
                text-text-secondary text-sm truncate">
                {shareUrl}
              </div>
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-background-secondary border border-border rounded-md 
                  hover:bg-background-tertiary transition flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-text-secondary" />
                    <span className="text-sm text-text-secondary">Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Permission Level */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Default permission
            </label>
            <div className="space-y-2">
              {permissionOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setPermissionLevel(option.value);
                    createOrUpdateShare();
                  }}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg border transition ${
                    permissionLevel === option.value
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-border hover:bg-background-secondary"
                  }`}
                >
                  <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    permissionLevel === option.value
                      ? "border-indigo-600"
                      : "border-border"
                  }`}>
                    {permissionLevel === option.value && (
                      <div className="w-2 h-2 rounded-full bg-indigo-600" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-text-primary text-sm">
                      {option.label}
                    </div>
                    <div className="text-xs text-text-tertiary">
                      {option.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          {isPublic && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
              <div className="flex gap-2">
                <Globe className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                <div className="text-sm text-indigo-900">
                  <p className="font-medium mb-1">Anyone with the link can access</p>
                  <p className="text-xs text-indigo-700">
                    This page is publicly accessible to anyone with the link
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:bg-background-secondary rounded-md transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

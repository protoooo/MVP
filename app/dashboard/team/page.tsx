"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Users, Mail, UserPlus, X, Check, Clock, Shield, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

interface WorkspaceMember {
  id: string;
  user_id: string;
  email: string;
  display_name?: string;
  role: string;
  joined_at: string;
}

interface PendingInvite {
  id: string;
  email: string;
  created_at: string;
  expires_at: string;
}

export default function TeamPage() {
  const [workspace, setWorkspace] = useState<any>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const supabase = createClient();

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get workspace
    const { data: workspaceData } = await supabase
      .from("workspaces")
      .select("*")
      .eq("owner_id", user.id)
      .single();

    if (!workspaceData) {
      // Check if user is a member
      const { data: membership } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .single();

      if (membership) {
        const { data: ws } = await supabase
          .from("workspaces")
          .select("*")
          .eq("id", membership.workspace_id)
          .single();
        setWorkspace(ws);
      }
    } else {
      setWorkspace(workspaceData);
    }

    // Get members
    const workspaceId = workspaceData?.id || null;
    if (workspaceId) {
      const { data: membersData } = await supabase
        .from("workspace_members")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("joined_at", { ascending: true });

      setMembers(membersData || []);

      // Get pending invites (only if owner)
      if (workspaceData?.owner_id === user.id) {
        const { data: invitesData } = await supabase
          .from("workspace_invites")
          .select("*")
          .eq("workspace_id", workspaceId)
          .eq("status", "pending")
          .order("created_at", { ascending: false });

        setInvites(invitesData || []);
      }
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !workspace) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if we can add more members
      if (members.length >= workspace.max_members) {
        throw new Error(`Maximum of ${workspace.max_members} team members reached`);
      }

      // Create invite via API
      const response = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspace.id,
          email: inviteEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send invite");
      }

      setSuccess(`Invite sent to ${inviteEmail}`);
      setInviteEmail("");
      loadTeamData();
    } catch (err: any) {
      setError(err.message || "Failed to send invite");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      await supabase
        .from("workspace_invites")
        .update({ status: "cancelled" })
        .eq("id", inviteId);

      setSuccess("Invite cancelled");
      loadTeamData();
    } catch (err: any) {
      setError("Failed to cancel invite");
    }
  };

  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    if (!confirm(`Remove ${memberEmail} from the team?`)) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || workspace?.owner_id !== user.id) {
        throw new Error("Only the workspace owner can remove members");
      }

      await supabase
        .from("workspace_members")
        .delete()
        .eq("id", memberId);

      setSuccess(`Removed ${memberEmail} from team`);
      loadTeamData();
    } catch (err: any) {
      setError(err.message || "Failed to remove member");
    }
  };

  const isOwner = workspace?.owner_id === members.find(m => m.email === workspace?.owner_email)?.user_id;
  const canInvite = members.length < (workspace?.max_members || 5);

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
            <Users className="w-8 h-8 text-purple-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-text-primary">Team Management</h1>
            <p className="text-text-secondary mt-1">
              Manage your team members and collaboration settings
            </p>
          </div>
        </div>

        {/* Team Size */}
        <div className="bg-surface rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-text-primary">Team Size</h3>
              <p className="text-sm text-text-secondary mt-1">
                {members.length} of {workspace?.max_members || 5} seats used
              </p>
            </div>
            <div className="flex items-center gap-2">
              {Array.from({ length: workspace?.max_members || 5 }).map((_, idx) => (
                <div
                  key={idx}
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    idx < members.length
                      ? "bg-purple-100 text-purple-600 border-2 border-purple-300"
                      : "bg-gray-100 text-gray-400 border-2 border-gray-200"
                  }`}
                >
                  {idx < members.length ? <Check className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                </div>
              ))}
            </div>
          </div>
          
          {/* Pricing Info */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="space-y-2">
              {(() => {
                const additionalMembers = Math.max(0, members.length - 1);
                const memberCost = additionalMembers * 10;
                const totalCost = 25 + memberCost;
                
                return (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">Base plan</span>
                      <span className="font-medium text-text-primary">$25/month</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">
                        Team members ({additionalMembers} × $10)
                      </span>
                      <span className="font-medium text-text-primary">
                        ${memberCost}/month
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-base font-semibold pt-2 border-t border-border">
                      <span className="text-text-primary">Total</span>
                      <span className="text-text-primary">
                        ${totalCost}/month
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Invite Member */}
        {isOwner && canInvite && (
          <div className="bg-surface rounded-xl border border-border p-6">
            <h3 className="font-semibold text-text-primary mb-4">Invite Team Member</h3>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Email Address
                </label>
                <div className="flex gap-3">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@example.com"
                    className="flex-1 px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-purple-500"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !inviteEmail}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      Send Invite
                    </div>
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <Check className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              )}
            </form>
          </div>
        )}

        {/* Pending Invites */}
        {isOwner && invites.length > 0 && (
          <div className="bg-surface rounded-xl border border-border p-6">
            <h3 className="font-semibold text-text-primary mb-4">Pending Invites</h3>
            <div className="space-y-3">
              {invites.map((invite) => (
                <motion.div
                  key={invite.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-yellow-600" />
                    <div>
                      <p className="font-medium text-text-primary">{invite.email}</p>
                      <p className="text-xs text-text-secondary">
                        Sent {new Date(invite.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCancelInvite(invite.id)}
                    className="text-sm text-yellow-700 hover:text-yellow-800 font-medium"
                  >
                    Cancel
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Team Members */}
        <div className="bg-surface rounded-xl border border-border p-6">
          <h3 className="font-semibold text-text-primary mb-4">Team Members</h3>
          <div className="space-y-3">
            {members.map((member, idx) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center justify-between p-4 bg-background-secondary rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-text-primary">
                        {member.display_name || member.email}
                      </p>
                      {member.role === "owner" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                          <Shield className="w-3 h-3" />
                          Owner
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-secondary">{member.email}</p>
                    <p className="text-xs text-text-tertiary">
                      Joined {new Date(member.joined_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {isOwner && member.role !== "owner" && (
                  <button
                    onClick={() => handleRemoveMember(member.id, member.email)}
                    className="p-2 text-gray-400 hover:text-red-600 transition"
                    title="Remove member"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-2">How team collaboration works</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>All team members can access all business tools and documents</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>Share reports, tasks, and insights with your team</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>Collaborate on documents and work together on business decisions</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>$25/month base plan + $10/month per team member invited</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

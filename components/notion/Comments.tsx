"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageSquare, Send, Check, X } from "lucide-react";
import type { Comment } from "@/lib/notion/types";
import { formatDistanceToNow } from "date-fns";

interface CommentsProps {
  pageId: string;
  blockId?: string;
}

export default function Comments({ pageId, blockId }: CommentsProps) {
  const [comments, setComments] = useState<(Comment & { user_name?: string })[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadComments();
    
    // Subscribe to new comments
    const channel = supabase
      .channel(`comments:${pageId}${blockId ? `:${blockId}` : ''}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: blockId ? `block_id=eq.${blockId}` : `page_id=eq.${pageId}`
        },
        () => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pageId, blockId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("comments")
        .select(`
          *,
          user_profiles(full_name)
        `)
        .eq("page_id", pageId)
        .is("parent_comment_id", null)
        .order("created_at", { ascending: true });

      if (blockId) {
        query = query.eq("block_id", blockId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setComments(data?.map(c => ({
        ...c,
        user_name: c.user_profiles?.full_name || "Unknown User"
      })) || []);
    } catch (error) {
      console.error("Error loading comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("comments")
        .insert({
          page_id: pageId,
          block_id: blockId,
          user_id: user.id,
          content: newComment,
          resolved: false
        });

      if (error) throw error;

      setNewComment("");
      await loadComments();
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (commentId: string, resolved: boolean) => {
    try {
      const { error } = await supabase
        .from("comments")
        .update({ resolved: !resolved })
        .eq("id", commentId);

      if (error) throw error;
      await loadComments();
    } catch (error) {
      console.error("Error updating comment:", error);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("Delete this comment?")) return;

    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
      await loadComments();
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  return (
    <div className="border-l-2 border-indigo-200 pl-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
        <MessageSquare className="w-4 h-4" />
        <span>Comments</span>
        {comments.length > 0 && (
          <span className="px-2 py-0.5 bg-background-secondary rounded-full text-xs">
            {comments.length}
          </span>
        )}
      </div>

      {/* Comments List */}
      <div className="space-y-3">
        {loading ? (
          <p className="text-sm text-text-tertiary">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-text-tertiary">No comments yet</p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className={`group p-3 rounded-lg border transition
                ${comment.resolved 
                  ? "border-border bg-background-secondary/50 opacity-75" 
                  : "border-border bg-surface"
                }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className="text-sm font-medium text-text-primary">
                    {comment.user_name}
                  </span>
                  <span className="text-xs text-text-tertiary ml-2">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => handleResolve(comment.id, comment.resolved)}
                    className="p-1 hover:bg-background-secondary rounded"
                    title={comment.resolved ? "Unresolve" : "Resolve"}
                  >
                    <Check className={`w-3 h-3 ${comment.resolved ? "text-green-600" : "text-text-tertiary"}`} />
                  </button>
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="p-1 hover:bg-background-secondary rounded"
                    title="Delete"
                  >
                    <X className="w-3 h-3 text-text-tertiary" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-text-primary whitespace-pre-wrap">
                {comment.content}
              </p>
              {comment.resolved && (
                <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Resolved
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* New Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm
            placeholder-text-tertiary focus:outline-none focus:border-indigo-500 resize-none"
          rows={3}
        />
        <button
          type="submit"
          disabled={submitting || !newComment.trim()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium
            hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center gap-2 transition"
        >
          {submitting ? (
            <>Posting...</>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Comment
            </>
          )}
        </button>
      </form>
    </div>
  );
}

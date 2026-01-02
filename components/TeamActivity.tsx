"use client";

import { motion } from "framer-motion";
import { Activity, CheckCircle, Clock, User } from "lucide-react";

interface ActivityItem {
  id: string;
  type: "proto_action" | "user_action" | "team_action";
  user?: string;
  action: string;
  timestamp: Date;
  status?: "in_progress" | "completed" | "pending";
}

interface TeamActivityProps {
  activities: ActivityItem[];
}

export default function TeamActivity({ activities }: TeamActivityProps) {
  const getIcon = (type: ActivityItem['type'], status?: ActivityItem['status']) => {
    if (status === "in_progress") {
      return <Clock className="w-4 h-4 text-warning" />;
    }
    if (status === "completed") {
      return <CheckCircle className="w-4 h-4 text-success" />;
    }
    
    switch (type) {
      case "proto_action":
        return <Activity className="w-4 h-4 text-indigo-600" />;
      case "user_action":
        return <User className="w-4 h-4 text-sky-600" />;
      case "team_action":
        return <User className="w-4 h-4 text-lavender-600" />;
      default:
        return <Activity className="w-4 h-4 text-text-tertiary" />;
    }
  };

  const getTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-6 shadow-notion-sm">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-indigo-600" />
        <h3 className="text-sm font-semibold text-text-primary">Team Activity</h3>
      </div>

      <div className="space-y-3">
        {activities.length === 0 ? (
          <p className="text-sm text-text-tertiary text-center py-8">
            No recent activity
          </p>
        ) : (
          activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-start gap-3 p-3 hover:bg-background-secondary rounded-lg transition"
            >
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {getIcon(activity.type, activity.status)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary">
                  {activity.user && (
                    <span className="font-medium">{activity.user}: </span>
                  )}
                  {activity.action}
                </p>
                <p className="text-xs text-text-tertiary mt-0.5">
                  {getTimeAgo(activity.timestamp)}
                </p>
              </div>

              {/* Status indicator */}
              {activity.status && (
                <div className="flex-shrink-0">
                  {activity.status === "in_progress" && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="w-2 h-2 rounded-full bg-warning"
                    />
                  )}
                  {activity.status === "completed" && (
                    <div className="w-2 h-2 rounded-full bg-success" />
                  )}
                  {activity.status === "pending" && (
                    <div className="w-2 h-2 rounded-full bg-text-tertiary" />
                  )}
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

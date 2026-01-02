"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PageSession } from "@/lib/notion/types";

interface LiveCursorsProps {
  pageId: string;
}

interface UserCursor {
  userId: string;
  userName: string;
  color: string;
  position: { x: number; y: number };
  blockId?: string;
}

export default function LiveCursors({ pageId }: LiveCursorsProps) {
  const [cursors, setCursors] = useState<UserCursor[]>([]);
  const [myColor] = useState(() => {
    const colors = [
      "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", 
      "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E2"
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  });
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`page:${pageId}:cursors`)
      .on('broadcast', { event: 'cursor-move' }, ({ payload }) => {
        updateCursor(payload as UserCursor);
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const activeCursors: UserCursor[] = [];
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            activeCursors.push(presence);
          });
        });
        
        setCursors(activeCursors);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('New users joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('Users left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await channel.track({
              userId: user.id,
              userName: user.email?.split('@')[0] || 'Anonymous',
              color: myColor,
              position: { x: 0, y: 0 },
            });
          }
        }
      });

    const handleMouseMove = (e: MouseEvent) => {
      channel.send({
        type: 'broadcast',
        event: 'cursor-move',
        payload: {
          userId: '', // Will be set from auth
          position: { x: e.clientX, y: e.clientY },
          color: myColor,
        },
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      supabase.removeChannel(channel);
    };
  }, [pageId]);

  const updateCursor = (cursor: UserCursor) => {
    setCursors(prev => {
      const existing = prev.findIndex(c => c.userId === cursor.userId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = cursor;
        return updated;
      }
      return [...prev, cursor];
    });
  };

  return (
    <>
      {cursors.map((cursor) => (
        <div
          key={cursor.userId}
          className="fixed pointer-events-none z-50 transition-transform duration-100"
          style={{
            left: cursor.position.x,
            top: cursor.position.y,
            transform: 'translate(-2px, -2px)',
          }}
        >
          {/* Cursor pointer */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
              fill={cursor.color}
              stroke="white"
              strokeWidth="1"
            />
          </svg>

          {/* User name label */}
          <div
            className="absolute left-5 top-5 px-2 py-1 rounded text-xs text-white whitespace-nowrap"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.userName}
          </div>
        </div>
      ))}
    </>
  );
}

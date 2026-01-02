"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Send, Mic, Pin } from "lucide-react";

interface Message {
  id: string;
  channel: string;
  sender_id: string;
  content: string;
  voice_url?: string;
  transcript?: string;
  is_pinned: boolean;
  created_at: string;
}

export default function CommsTab() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentChannel, setCurrentChannel] = useState("general");
  const [messageInput, setMessageInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    const cleanup = setupRealtimeSubscription();
    return cleanup;
  }, [currentChannel]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function fetchMessages() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("channel", currentChannel)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  }

  function setupRealtimeSubscription() {
    const channel = supabase
      .channel(`messages:${currentChannel}`)
      .on(
        "postgres_changes",
        { 
          event: "INSERT", 
          schema: "public", 
          table: "messages",
          filter: `channel=eq.${currentChannel}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  async function sendMessage() {
    if (!messageInput.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get staff_id for current user
      const { data: staffData } = await supabase
        .from("staff")
        .select("id, business_id")
        .eq("user_id", user.id)
        .single();

      if (!staffData) return;

      const { error } = await supabase
        .from("messages")
        .insert({
          channel: currentChannel,
          sender_id: staffData.id,
          business_id: staffData.business_id,
          content: messageInput,
          is_pinned: false
        });

      if (error) throw error;
      setMessageInput("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }

  async function startRecording() {
    setIsRecording(true);
    // Web Speech API for voice recording would go here
    // For now, we'll just toggle the state
    setTimeout(() => {
      setIsRecording(false);
      // In real implementation, this would transcribe and send
    }, 3000);
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  const channels = ["general", "kitchen-crew", "monday-openers", "management"];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Team Communications</h2>
        
        {/* Channel Switcher */}
        <div className="flex gap-2">
          {channels.map(channel => (
            <button
              key={channel}
              onClick={() => setCurrentChannel(channel)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                currentChannel === channel
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              #{channel}
            </button>
          ))}
        </div>
      </div>

      {/* Message Feed */}
      <div className="bg-white rounded-lg border border-gray-200 flex flex-col" style={{ height: "600px" }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(message => (
            <div key={message.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold">
                {message.sender_id?.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">Team Member</span>
                  <span className="text-xs text-gray-500">
                    {new Date(message.created_at).toLocaleTimeString()}
                  </span>
                  {message.is_pinned && (
                    <Pin className="w-3 h-3 text-yellow-600" />
                  )}
                </div>
                {message.content && (
                  <p className="text-gray-900 mt-1">{message.content}</p>
                )}
                {message.voice_url && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                        <Mic className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm text-gray-600">Voice message</span>
                    </div>
                    {message.transcript && (
                      <p className="text-sm text-gray-700 mt-2 italic">
                        "{message.transcript}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Composer */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
            <button
              onClick={startRecording}
              className={`p-2 rounded-lg transition-colors ${
                isRecording
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Mic className="w-5 h-5" />
            </button>
            <button
              onClick={sendMessage}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

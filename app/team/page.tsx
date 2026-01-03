'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Hash, Send, Plus, Users } from 'lucide-react';
import { subscribeToChannel, unsubscribeFromChannel } from '@/lib/supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface Channel {
  id: number;
  name: string;
  description?: string;
  message_count: number;
  last_message_at?: string;
}

interface Message {
  id: number;
  user_email: string;
  message: string;
  created_at: string;
  is_edited: boolean;
}

export default function TeamPage() {
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const realtimeChannelRef = useRef<any>(null);

  useEffect(() => {
    loadChannels();
  }, []);

  useEffect(() => {
    if (selectedChannel) {
      loadMessages(selectedChannel);
      setupRealtimeSubscription(selectedChannel);
    }

    return () => {
      if (realtimeChannelRef.current) {
        unsubscribeFromChannel(realtimeChannelRef.current);
      }
    };
  }, [selectedChannel]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const setupRealtimeSubscription = (channelId: number) => {
    // Unsubscribe from previous channel
    if (realtimeChannelRef.current) {
      unsubscribeFromChannel(realtimeChannelRef.current);
    }

    // Subscribe to new channel
    const channel = subscribeToChannel(channelId, (newMessage: Message) => {
      setMessages((prev) => [...prev, newMessage]);
    });

    realtimeChannelRef.current = channel;
  };

  const loadChannels = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${API_URL}/api/team/channels`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to load channels');

      const data = await response.json();
      setChannels(data.channels || []);

      // Auto-select first channel
      if (data.channels && data.channels.length > 0) {
        setSelectedChannel(data.channels[0].id);
      }
    } catch (error) {
      console.error('Error loading channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (channelId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/api/team/channels/${channelId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to load messages');

      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChannel || sending) return;

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/api/team/channels/${selectedChannel}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: newMessage }),
        }
      );

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();
      
      // Add message optimistically (will be updated via realtime)
      setMessages((prev) => [...prev, data]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const selectedChannelData = channels.find((ch) => ch.id === selectedChannel);

  return (
    <div className="h-screen bg-gray-950 text-white flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-xl font-bold mb-2">Team Workspace</h1>
          <button className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors">
            <Plus size={16} />
            New Channel
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
          ) : channels.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No channels yet
            </div>
          ) : (
            <div className="py-2">
              {channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => setSelectedChannel(channel.id)}
                  className={`w-full px-4 py-2 flex items-center gap-2 hover:bg-gray-800 transition-colors ${
                    selectedChannel === channel.id ? 'bg-gray-800' : ''
                  }`}
                >
                  <Hash size={16} className="text-gray-500" />
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-medium truncate">
                      {channel.name}
                    </div>
                    {channel.message_count > 0 && (
                      <div className="text-xs text-gray-500">
                        {channel.message_count} messages
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChannel ? (
          <>
            {/* Chat Header */}
            <div className="h-16 bg-gray-900 border-b border-gray-800 flex items-center px-6">
              <Hash size={20} className="text-gray-500 mr-2" />
              <div className="flex-1">
                <h2 className="font-semibold">{selectedChannelData?.name}</h2>
                {selectedChannelData?.description && (
                  <p className="text-sm text-gray-500">
                    {selectedChannelData.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Users size={16} />
                <span>1 member</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((message, index) => {
                  const showDate =
                    index === 0 ||
                    formatDate(messages[index - 1].created_at) !==
                      formatDate(message.created_at);

                  return (
                    <div key={message.id}>
                      {showDate && (
                        <div className="flex items-center justify-center my-4">
                          <div className="bg-gray-800 px-3 py-1 rounded-full text-xs text-gray-400">
                            {formatDate(message.created_at)}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center font-bold text-sm">
                          {message.user_email[0].toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {message.user_email}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatTime(message.created_at)}
                            </span>
                            {message.is_edited && (
                              <span className="text-xs text-gray-600">(edited)</span>
                            )}
                          </div>
                          <div className="text-gray-300">{message.message}</div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={`Message #${selectedChannelData?.name || 'channel'}`}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a channel to start messaging
          </div>
        )}
      </div>
    </div>
  );
}

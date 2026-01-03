'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Mail, MailOpen, Send, Plus } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface Email {
  id: number;
  from_email: string;
  from_name?: string;
  to_emails: string[];
  subject: string;
  body_text: string;
  is_read: boolean;
  received_at: string;
  thread_count?: number;
}

export default function EmailPage() {
  const router = useRouter();
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);

  useEffect(() => {
    loadInbox();
  }, [unreadOnly]);

  const loadInbox = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(
        `${API_URL}/api/email/inbox?unreadOnly=${unreadOnly}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to load inbox');

      const data = await response.json();
      setEmails(data.emails || []);
    } catch (error) {
      console.error('Error loading inbox:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadInbox();
      return;
    }

    setSearching(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/email/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: searchQuery }),
      });

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      setEmails(data.results || []);
    } catch (error) {
      console.error('Error searching emails:', error);
    } finally {
      setSearching(false);
    }
  };

  const markAsRead = async (emailId: number, isRead: boolean) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/email/${emailId}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isRead }),
      });

      setEmails(
        emails.map((email) =>
          email.id === emailId ? { ...email, is_read: isRead } : email
        )
      );
    } catch (error) {
      console.error('Error updating email:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Business Email</h1>
            <button
              onClick={() => setShowCompose(!showCompose)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
            >
              <Plus size={20} />
              Compose
            </button>
          </div>

          {/* Search Bar */}
          <div className="mt-4 flex gap-2">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search emails semantically..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searching}
              className="px-6 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Filters */}
          <div className="mt-3 flex gap-3">
            <button
              onClick={() => setUnreadOnly(!unreadOnly)}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                unreadOnly
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Unread Only
            </button>
          </div>
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg border border-gray-800 max-w-2xl w-full p-6">
            <h2 className="text-xl font-bold mb-4">Compose Email</h2>
            <p className="text-gray-400 mb-4">
              Email composition UI - Connect to email sending API
            </p>
            <button
              onClick={() => setShowCompose(false)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Email List */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading inbox...</div>
        ) : emails.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            {searchQuery ? 'No emails found' : 'Your inbox is empty'}
          </div>
        ) : (
          <div className="space-y-2">
            {emails.map((email) => (
              <div
                key={email.id}
                onClick={() => markAsRead(email.id, true)}
                className={`p-4 rounded-lg border transition-all cursor-pointer ${
                  email.is_read
                    ? 'bg-gray-900 border-gray-800 hover:bg-gray-850'
                    : 'bg-gray-800 border-gray-700 hover:bg-gray-750'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-1">
                      {email.is_read ? (
                        <MailOpen size={20} className="text-gray-500" />
                      ) : (
                        <Mail size={20} className="text-emerald-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`font-medium truncate ${
                            email.is_read ? 'text-gray-400' : 'text-white'
                          }`}
                        >
                          {email.from_name || email.from_email}
                        </span>
                        {email.thread_count && email.thread_count > 1 && (
                          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                            {email.thread_count}
                          </span>
                        )}
                      </div>
                      <div
                        className={`text-sm truncate mb-1 ${
                          email.is_read ? 'text-gray-500' : 'text-gray-300'
                        }`}
                      >
                        {email.subject || '(No subject)'}
                      </div>
                      <div className="text-sm text-gray-600 truncate">
                        {email.body_text?.substring(0, 100)}...
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 whitespace-nowrap">
                    {formatDate(email.received_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

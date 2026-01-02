"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface MentionsInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  workspaceId: string;
}

interface User {
  id: string;
  email: string;
  full_name?: string;
}

export default function MentionsInput({
  value,
  onChange,
  placeholder,
  className,
  workspaceId,
}: MentionsInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (mentionQuery) {
      searchUsers(mentionQuery);
    } else {
      setShowSuggestions(false);
    }
  }, [mentionQuery]);

  const searchUsers = async (query: string) => {
    // In a real implementation, this would search workspace members
    // For now, we'll just get recent users
    const { data } = await supabase
      .from("user_profiles")
      .select("id, email, full_name")
      .ilike("email", `%${query}%`)
      .limit(5);

    if (data) {
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    onChange(newValue);
    setCursorPosition(cursorPos);

    // Check if user is typing a mention
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
    } else {
      setMentionQuery("");
      setShowSuggestions(false);
    }
  };

  const insertMention = (user: User) => {
    const textBeforeCursor = value.slice(0, cursorPosition);
    const textAfterCursor = value.slice(cursorPosition);
    
    // Remove the partial mention query
    const beforeMention = textBeforeCursor.replace(/@(\w*)$/, "");
    const userName = user.full_name || user.email.split("@")[0];
    const newValue = `${beforeMention}@${userName} ${textAfterCursor}`;
    
    onChange(newValue);
    setShowSuggestions(false);
    setMentionQuery("");
    
    // Focus back on textarea
    setTimeout(() => {
      textareaRef.current?.focus();
      const newCursorPos = beforeMention.length + userName.length + 2;
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        break;
      case "Enter":
      case "Tab":
        if (suggestions[selectedIndex]) {
          e.preventDefault();
          insertMention(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowSuggestions(false);
        break;
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />

      {/* Mention Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 bg-surface border border-border rounded-lg shadow-lg overflow-hidden z-50 w-64">
          {suggestions.map((user, index) => (
            <button
              key={user.id}
              onClick={() => insertMention(user)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left transition ${
                index === selectedIndex
                  ? "bg-indigo-50 text-indigo-900"
                  : "hover:bg-background-secondary"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                {(user.full_name || user.email)[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-text-primary truncate">
                  {user.full_name || user.email.split("@")[0]}
                </div>
                <div className="text-xs text-text-tertiary truncate">
                  {user.email}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

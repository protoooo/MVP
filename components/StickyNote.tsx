"use client";

import { useState, useRef } from "react";
import { motion, PanInfo } from "framer-motion";
import { X, Palette } from "lucide-react";

export interface StickyNote {
  id: string;
  content: string;
  color: 'yellow' | 'pink' | 'blue' | 'green';
  position: { x: number; y: number };
  author: string;
  createdAt: Date;
  tags?: string[];
  linkedTo?: string[];
}

interface StickyNoteProps {
  note: StickyNote;
  onUpdate: (id: string, updates: Partial<StickyNote>) => void;
  onDelete: (id: string) => void;
}

const colorStyles = {
  yellow: {
    bg: 'bg-yellow-100',
    border: 'border-yellow-200',
    shadow: 'shadow-yellow-200/50',
  },
  pink: {
    bg: 'bg-pink-100',
    border: 'border-pink-200',
    shadow: 'shadow-pink-200/50',
  },
  blue: {
    bg: 'bg-blue-100',
    border: 'border-blue-200',
    shadow: 'shadow-blue-200/50',
  },
  green: {
    bg: 'bg-green-100',
    border: 'border-green-200',
    shadow: 'shadow-green-200/50',
  },
};

export default function StickyNoteComponent({ note, onUpdate, onDelete }: StickyNoteProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colors = colorStyles[note.color];

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    onUpdate(note.id, {
      position: {
        x: note.position.x + info.offset.x,
        y: note.position.y + info.offset.y,
      },
    });
  };

  const handleColorChange = (color: StickyNote['color']) => {
    onUpdate(note.id, { color });
    setShowColorPicker(false);
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0}
      onDragEnd={handleDragEnd}
      initial={{ 
        x: note.position.x, 
        y: note.position.y,
        rotate: Math.random() * 6 - 3, // Random slight rotation
      }}
      animate={{ 
        x: note.position.x, 
        y: note.position.y,
      }}
      whileHover={{ 
        scale: 1.05, 
        rotate: 2,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.95 }}
      className={`absolute w-48 h-48 ${colors.bg} border ${colors.border} p-4 cursor-move shadow-lg ${colors.shadow}`}
      style={{
        boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowColorPicker(!showColorPicker);
          }}
          className="p-1 hover:bg-black/5 rounded transition"
        >
          <Palette className="w-3 h-3 text-text-secondary" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(note.id);
          }}
          className="p-1 hover:bg-black/5 rounded transition"
        >
          <X className="w-3 h-3 text-text-secondary" />
        </button>
      </div>

      {/* Color picker */}
      {showColorPicker && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-8 left-4 bg-white rounded-lg shadow-notion p-2 flex gap-2 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {(['yellow', 'pink', 'blue', 'green'] as const).map((color) => (
            <button
              key={color}
              onClick={() => handleColorChange(color)}
              className={`w-6 h-6 rounded ${colorStyles[color].bg} border-2 ${
                note.color === color ? 'border-text-primary' : 'border-transparent'
              } hover:scale-110 transition`}
            />
          ))}
        </motion.div>
      )}

      {/* Content */}
      {isEditing ? (
        <textarea
          autoFocus
          value={note.content}
          onChange={(e) => onUpdate(note.id, { content: e.target.value })}
          onBlur={() => setIsEditing(false)}
          className={`w-full h-24 ${colors.bg} text-sm text-text-primary resize-none focus:outline-none`}
          placeholder="Type your note..."
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          className="w-full h-24 text-sm text-text-primary whitespace-pre-wrap overflow-hidden cursor-text"
        >
          {note.content || "Click to edit..."}
        </div>
      )}

      {/* Footer */}
      <div className="absolute bottom-2 left-4 right-4 text-xs text-text-tertiary truncate">
        {note.author}
      </div>
    </motion.div>
  );
}

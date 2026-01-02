"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Plus, Download, Trash2 } from "lucide-react";
import StickyNoteComponent, { StickyNote } from "./StickyNote";

interface WhiteboardCanvasProps {
  workspaceId?: string;
  initialNotes?: StickyNote[];
  onSave?: (notes: StickyNote[]) => void;
}

export default function WhiteboardCanvas({ 
  workspaceId, 
  initialNotes = [],
  onSave 
}: WhiteboardCanvasProps) {
  const [notes, setNotes] = useState<StickyNote[]>(initialNotes);
  const [scale, setScale] = useState(1);
  const canvasRef = useRef<HTMLDivElement>(null);

  const addNote = () => {
    const newNote: StickyNote = {
      id: `note-${Date.now()}`,
      content: "",
      color: (['yellow', 'pink', 'blue', 'green'] as const)[Math.floor(Math.random() * 4)],
      position: { 
        x: Math.random() * 400 + 100, 
        y: Math.random() * 300 + 100 
      },
      author: "You",
      createdAt: new Date(),
    };
    setNotes([...notes, newNote]);
  };

  const updateNote = (id: string, updates: Partial<StickyNote>) => {
    setNotes(notes.map(note => 
      note.id === id ? { ...note, ...updates } : note
    ));
  };

  const deleteNote = (id: string) => {
    setNotes(notes.filter(note => note.id !== id));
  };

  const clearCanvas = () => {
    if (confirm("Are you sure you want to clear all notes?")) {
      setNotes([]);
    }
  };

  const saveWorkspace = () => {
    if (onSave) {
      onSave(notes);
    }
  };

  return (
    <div className="relative w-full h-full bg-background border border-border rounded-2xl overflow-hidden">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
        <div className="bg-white/90 backdrop-blur-sm border border-border rounded-lg shadow-notion-sm p-2 flex items-center gap-2">
          <motion.button
            onClick={addNote}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition"
          >
            <Plus className="w-4 h-4" />
            Add Note
          </motion.button>
          
          <div className="w-px h-6 bg-border" />
          
          <motion.button
            onClick={saveWorkspace}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 hover:bg-background-secondary rounded transition"
            title="Save workspace"
          >
            <Download className="w-4 h-4 text-text-secondary" />
          </motion.button>
          
          <motion.button
            onClick={clearCanvas}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 hover:bg-background-secondary rounded transition"
            title="Clear all notes"
          >
            <Trash2 className="w-4 h-4 text-text-secondary" />
          </motion.button>
        </div>

        {/* Zoom controls */}
        <div className="bg-white/90 backdrop-blur-sm border border-border rounded-lg shadow-notion-sm p-2 flex items-center gap-2">
          <button
            onClick={() => setScale(Math.max(0.5, scale - 0.1))}
            className="px-3 py-1 hover:bg-background-secondary rounded text-sm font-medium transition"
          >
            -
          </button>
          <span className="text-sm text-text-secondary min-w-[3rem] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale(Math.min(2, scale + 0.1))}
            className="px-3 py-1 hover:bg-background-secondary rounded text-sm font-medium transition"
          >
            +
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="w-full h-full overflow-auto"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 0, 0, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
        }}
      >
        <div 
          className="relative min-h-full min-w-full"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: '0 0',
            width: `${100 / scale}%`,
            height: `${100 / scale}%`,
          }}
        >
          {/* Sticky Notes */}
          {notes.map((note) => (
            <StickyNoteComponent
              key={note.id}
              note={note}
              onUpdate={updateNote}
              onDelete={deleteNote}
            />
          ))}

          {/* Empty state */}
          {notes.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-indigo-600" />
                </div>
                <p className="text-text-secondary mb-2">Your whiteboard is empty</p>
                <p className="text-sm text-text-tertiary">Click "Add Note" to get started</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

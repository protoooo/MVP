"use client";

import { useState, useRef, useEffect } from "react";
import { Music, Link2, X, Play, Pause } from "lucide-react";
import type { AudioBlockContent } from "@/lib/notion/types";

interface AudioBlockProps {
  content: AudioBlockContent;
  onUpdate: (content: AudioBlockContent) => void;
  onDelete: () => void;
}

export default function AudioBlock({ content, onUpdate, onDelete }: AudioBlockProps) {
  const [showUrlInput, setShowUrlInput] = useState(!content.url);
  const [url, setUrl] = useState(content.url || "");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(content.duration || 0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      setDuration(audio.duration);
      onUpdate({ ...content, duration: audio.duration });
    };
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [content.url]);

  const handleUrlSubmit = () => {
    if (url) {
      onUpdate({ ...content, url });
      setShowUrlInput(false);
    }
  };

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!content.url || showUrlInput) {
    return (
      <div className="border-2 border-dashed border-border rounded-lg p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="text-text-tertiary">
            <Music className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">Add an audio file</p>
          </div>
          
          <div className="w-full max-w-md">
            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                placeholder="Paste audio URL..."
                className="flex-1 px-3 py-2 bg-background-secondary rounded-md text-sm
                  border border-border focus:outline-none focus:border-indigo-500"
                autoFocus
              />
              <button
                onClick={handleUrlSubmit}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm
                  hover:bg-indigo-700 transition"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      <audio ref={audioRef} src={content.url} preload="metadata" />
      
      <div className="border border-border rounded-lg p-4 bg-background-secondary">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlayPause}
            className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-700 
              flex items-center justify-center transition"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white ml-0.5" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-text-tertiary">{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-1 rounded-full appearance-none bg-border 
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 
                  [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full 
                  [&::-webkit-slider-thumb]:bg-indigo-600 cursor-pointer"
              />
              <span className="text-xs text-text-tertiary">{formatTime(duration)}</span>
            </div>
            
            {content.transcript && (
              <div className="text-xs text-text-secondary mt-2 line-clamp-2">
                {content.transcript}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
            <button
              onClick={() => setShowUrlInput(true)}
              className="p-2 hover:bg-background rounded-md"
              title="Change audio"
            >
              <Link2 className="w-4 h-4 text-text-secondary" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 hover:bg-background rounded-md"
              title="Delete"
            >
              <X className="w-4 h-4 text-text-secondary" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

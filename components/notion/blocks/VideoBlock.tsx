"use client";

import { useState } from "react";
import { Video as VideoIcon, Link2, X } from "lucide-react";
import type { VideoBlockContent } from "@/lib/notion/types";

interface VideoBlockProps {
  content: VideoBlockContent;
  onUpdate: (content: VideoBlockContent) => void;
  onDelete: () => void;
}

export default function VideoBlock({ content, onUpdate, onDelete }: VideoBlockProps) {
  const [showUrlInput, setShowUrlInput] = useState(!content.url);
  const [url, setUrl] = useState(content.url || "");
  const [caption, setCaption] = useState(content.caption || "");

  const getVideoEmbedUrl = (inputUrl: string): { url: string; provider: 'youtube' | 'vimeo' | 'upload' } => {
    // YouTube
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const youtubeMatch = inputUrl.match(youtubeRegex);
    if (youtubeMatch) {
      return { url: `https://www.youtube.com/embed/${youtubeMatch[1]}`, provider: 'youtube' };
    }

    // Vimeo
    const vimeoRegex = /vimeo\.com\/(?:.*\/)?(\d+)/;
    const vimeoMatch = inputUrl.match(vimeoRegex);
    if (vimeoMatch) {
      return { url: `https://player.vimeo.com/video/${vimeoMatch[1]}`, provider: 'vimeo' };
    }

    // Direct video URL
    return { url: inputUrl, provider: 'upload' };
  };

  const handleUrlSubmit = () => {
    if (url) {
      const { url: embedUrl, provider } = getVideoEmbedUrl(url);
      onUpdate({ ...content, url: embedUrl, provider });
      setShowUrlInput(false);
    }
  };

  const handleCaptionBlur = () => {
    onUpdate({ ...content, caption });
  };

  if (!content.url || showUrlInput) {
    return (
      <div className="border-2 border-dashed border-border rounded-lg p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="text-text-tertiary">
            <VideoIcon className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">Embed a video</p>
            <p className="text-xs mt-1">YouTube, Vimeo, or direct video URL</p>
          </div>
          
          <div className="w-full max-w-md">
            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                placeholder="Paste video URL..."
                className="flex-1 px-3 py-2 bg-background-secondary rounded-md text-sm
                  border border-border focus:outline-none focus:border-indigo-500"
                autoFocus
              />
              <button
                onClick={handleUrlSubmit}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm
                  hover:bg-indigo-700 transition"
              >
                Embed
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      <div className="relative rounded-lg overflow-hidden bg-black">
        {content.provider === 'upload' ? (
          <video
            src={content.url}
            controls
            className="w-full h-auto"
            style={{ maxHeight: "600px" }}
          >
            Your browser does not support the video tag.
          </video>
        ) : (
          <iframe
            src={content.url}
            className="w-full aspect-video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
        
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition flex gap-2">
          <button
            onClick={() => setShowUrlInput(true)}
            className="p-2 bg-surface/90 backdrop-blur-sm rounded-md hover:bg-surface"
          >
            <Link2 className="w-4 h-4 text-text-secondary" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 bg-surface/90 backdrop-blur-sm rounded-md hover:bg-surface"
          >
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>
      </div>
      
      <div className="mt-2">
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={handleCaptionBlur}
          placeholder="Add a caption..."
          className="w-full px-0 py-1 bg-transparent text-sm text-text-secondary
            border-none outline-none placeholder-text-tertiary"
        />
      </div>
    </div>
  );
}

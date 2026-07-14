"use client";

import { useRef, useState } from "react";
import { Video } from "lucide-react";

interface VideoThumbProps {
  src: string;
  className?: string;
}

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const total = Math.floor(seconds);
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
};

export default function VideoThumb({ src, className = "" }: VideoThumbProps) {
  const [duration, setDuration] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  return (
    <div className="relative h-full w-full">
      <video
        ref={videoRef}
        src={src}
        className={`block h-full w-full object-cover ${className}`}
        muted
        playsInline
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(formatDuration(e.currentTarget.duration))}
      />
      <div className="pointer-events-none absolute bottom-1 left-1 flex items-center gap-1 rounded bg-black/50 px-1 py-0.5 text-[10px] text-white">
        <Video className="h-3 w-3" />
        {duration && <span>{duration}</span>}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Banner } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { toFrontendImageUrl } from "@/lib/image";

export default function HomeHeroCarousel({ banners }: { banners: Banner[] }) {
  const slides = useMemo(() => {
    return [...banners]
      .sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return b.id - a.id;
      })
      .slice(0, 9)
      .map((banner) => {
        const url = toFrontendImageUrl(banner.imageUrl);
        const clean = url.split("?")[0].toLowerCase();
        const isVideo = /\.(mp4|webm|ogg|mov|m4v)$/.test(clean);
        return {
          id: banner.id,
          imageUrl: url,
          objectPosition: banner.objectPosition || "center",
          isVideo,
        };
      });
  }, [banners]);

  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const goTo = (next: number) => setCurrent((next + slides.length) % slides.length);

  if (!slides.length) return null;

  return (
    <section className="relative w-full overflow-hidden bg-[#0b1f20] text-white">
      <div className="relative h-[240px] w-full sm:h-[380px] lg:h-[500px]">
        {slides.map((slide, index) => {
          const isActive = index === current;
          const directionClass = index < current ? "-translate-x-4" : "translate-x-4";
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-all duration-500 ease-out ${isActive ? "z-10 opacity-100 translate-x-0" : `z-0 opacity-0 ${directionClass}`}`}
            >
              {slide.isVideo ? (
                <video
                  src={slide.imageUrl}
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ objectPosition: slide.objectPosition }}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload={index === 0 ? "auto" : "metadata"}
                />
              ) : (
                <img
                  src={slide.imageUrl}
                  alt="Banner trang chủ"
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ objectPosition: slide.objectPosition }}
                  loading={index === 0 ? "eager" : "lazy"}
                />
              )}
            </div>
          );
        })}

        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,27,29,0.06)_0%,rgba(6,27,29,0.18)_52%,rgba(6,27,29,0.72)_100%)]" />

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => goTo(current - 1)}
          className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-black/25 text-white backdrop-blur-md transition hover:bg-black/40 hover:opacity-90 sm:left-4"
          aria-label="Slide trước"
        >
          <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => goTo(current + 1)}
          className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-black/25 text-white backdrop-blur-md transition hover:bg-black/40 hover:opacity-90 sm:right-4"
          aria-label="Slide sau"
        >
          <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>

        {slides.length > 1 && (
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 sm:bottom-6 sm:gap-2">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setCurrent(index)}
                className={`rounded-full transition-all duration-300 ${
                  index === current
                    ? "h-2.5 w-8 bg-white shadow-[0_0_0_3px_rgba(255,255,255,0.12)] sm:w-9"
                    : "h-2 w-2 bg-white/45 hover:bg-white/70"
                }`}
                aria-label={`Chuyển đến slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

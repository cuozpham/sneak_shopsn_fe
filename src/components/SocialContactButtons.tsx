"use client";
import Script from "next/script";

const ZALO_URL = process.env.NEXT_PUBLIC_ZALO_URL || "https://zalo.me/0934762018";
const ELFSIGHT_APP_ID = process.env.NEXT_PUBLIC_ELFSIGHT_FB_CHAT_ID || "5b61cac0-14d0-4852-83e4-7e8c4874d285";

export default function SocialContactButtons() {
  return (
    <>
      <Script src="https://elfsightcdn.com/platform.js" strategy="afterInteractive" />
      <div className={`elfsight-app-${ELFSIGHT_APP_ID}`} data-elfsight-app-lazy />
      <div className="fixed bottom-24 right-6 z-[9997] flex flex-col gap-3">
        <a
          href={ZALO_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat Zalo"
          className="group flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-black/5 transition hover:scale-105 hover:shadow-xl"
        >
          <svg viewBox="0 0 36 36" className="h-7 w-7">
            <circle cx="18" cy="18" r="18" fill="#0068FF" />
            <text
              x="18"
              y="23"
              textAnchor="middle"
              fontFamily="'Helvetica Neue', Arial, sans-serif"
              fontWeight="700"
              fontSize="12"
              fill="#fff"
            >
              Zalo
            </text>
          </svg>
        </a>
      </div>
    </>
  );
}

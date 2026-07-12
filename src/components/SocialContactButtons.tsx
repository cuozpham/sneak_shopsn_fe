"use client";

const ZALO_URL = process.env.NEXT_PUBLIC_ZALO_URL || "https://zalo.me/0934762018";
const MESSENGER_URL = process.env.NEXT_PUBLIC_MESSENGER_URL || "https://m.me/Cuozpham";

export default function SocialContactButtons() {
  return (
    <div className="fixed bottom-24 right-6 z-[9997] flex flex-col gap-3">
      <a
        href={MESSENGER_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat Messenger"
        className="group flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-black/5 transition hover:scale-105 hover:shadow-xl"
      >
        <svg viewBox="0 0 36 36" className="h-7 w-7">
          <defs>
            <linearGradient id="msgGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#00B2FF" />
              <stop offset="1" stopColor="#006AFF" />
            </linearGradient>
          </defs>
          <circle cx="18" cy="18" r="18" fill="url(#msgGrad)" />
          <path
            fill="#fff"
            d="M18 8C12.5 8 8 12.1 8 17.1c0 2.8 1.4 5.4 3.7 7v3.9l3.4-1.9c.9.3 1.9.4 2.9.4 5.5 0 10-4.1 10-9.4S23.5 8 18 8zm1 12.4l-2.6-2.7-4.9 2.7 5.4-5.7 2.7 2.7 4.8-2.7-5.4 5.7z"
          />
        </svg>
      </a>
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
  );
}

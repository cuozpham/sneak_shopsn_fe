"use client";

const ZALO_URL = process.env.NEXT_PUBLIC_ZALO_URL || "https://zalo.me/0934762018";
const FACEBOOK_URL = process.env.NEXT_PUBLIC_FACEBOOK_URL || "https://www.facebook.com/Cuozpham";

export default function SocialContactButtons() {
  return (
    <div className="fixed bottom-24 right-6 z-[9997] flex flex-col gap-3">
      <a
        href={FACEBOOK_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Facebook"
        className="group flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-black/5 transition hover:scale-105 hover:shadow-xl"
      >
        <svg viewBox="0 0 36 36" className="h-7 w-7">
          <circle cx="18" cy="18" r="18" fill="#1877F2" />
          <path
            fill="#fff"
            d="M20.5 19.5h2.6l.4-3.4h-3v-2.2c0-1 .3-1.7 1.7-1.7H23.7V9.1c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.3v2.4H14.5v3.4h2.6V28h3.4z"
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

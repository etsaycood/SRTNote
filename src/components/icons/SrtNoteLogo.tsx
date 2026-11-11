import React from 'react';

interface LogoProps {
  className?: string;
}

/**
 * SRTNote mark: a caption bubble (subtitles) holding a play glyph (media)
 * and two text lines (notes). Keep in sync with the favicon in index.html.
 */
export const SrtNoteLogo: React.FC<LogoProps> = ({ className = 'w-8 h-8' }) => (
  <svg
    viewBox="0 0 32 32"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="SRTNote"
  >
    <defs>
      <linearGradient id="srtnote-logo-bg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#6674ef" />
        <stop offset="1" stopColor="#8b5cf6" />
      </linearGradient>
    </defs>
    <rect x="1" y="1" width="30" height="30" rx="8" fill="url(#srtnote-logo-bg)" />
    {/* caption bubble */}
    <path d="M9 8.5h14a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H14l-4 3.5v-3.5H9a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3Z" fill="#fff" />
    {/* play glyph */}
    <path d="M10.5 12.6v5.8l4.6-2.9-4.6-2.9Z" fill="#5159e0" />
    {/* note lines */}
    <rect x="17" y="12.6" width="6" height="1.9" rx="0.95" fill="#5159e0" />
    <rect x="17" y="16.5" width="4" height="1.9" rx="0.95" fill="#8b5cf6" />
  </svg>
);

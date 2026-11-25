'use client';

import type { CSSProperties } from 'react';

export type StatusIllustrationVariant = '404' | 'empty' | 'error';
export type StatusIllustrationSize = 'sm' | 'md' | 'lg';

const SIZE_MAP: Record<StatusIllustrationSize, { width: number; height: number }> = {
  sm: { width: 156, height: 112 },
  md: { width: 210, height: 150 },
  lg: { width: 320, height: 220 },
};

interface StatusIllustrationProps {
  variant: StatusIllustrationVariant;
  size?: StatusIllustrationSize;
  className?: string;
  style?: CSSProperties;
}

/**
 * Lottie-style animated vector scenes for 404, empty data, and server error
 * states. Zero external CDN dependencies, instant SSR, theme-aware in both
 * dark and light modes, and honours `prefers-reduced-motion`.
 */
export default function StatusIllustration({
  variant,
  size = 'md',
  className = '',
  style,
}: StatusIllustrationProps) {
  const dims = SIZE_MAP[size];

  if (variant === '404') {
    return (
      <div
        aria-hidden="true"
        className={`status-anim mx-auto inline-flex select-none items-center justify-center ${className}`.trim()}
        style={{ width: dims.width, height: dims.height, ...style }}
      >
        <svg
          viewBox="0 0 360 240"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full overflow-visible"
        >
          <defs>
            <radialGradient id="cric404Glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.24" />
              <stop offset="65%" stopColor="var(--color-accent)" stopOpacity="0.06" />
              <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="cric404Ball" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF5A5F" />
              <stop offset="55%" stopColor="#DC2626" />
              <stop offset="100%" stopColor="#881337" />
            </linearGradient>
            <linearGradient id="cric404Digit" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--color-accent)" />
              <stop offset="100%" stopColor="var(--color-brand)" />
            </linearGradient>
          </defs>

          {/* Soft ambient pitch glow */}
          <ellipse cx="180" cy="126" rx="138" ry="86" fill="url(#cric404Glow)" />

          {/* Drifting clouds */}
          <g className="status-anim-cloud-a" opacity="0.45">
            <rect x="28" y="42" width="58" height="16" rx="8" fill="var(--color-border-strong)" />
            <circle cx="48" cy="42" r="11" fill="var(--color-border-strong)" />
            <circle cx="64" cy="45" r="8" fill="var(--color-border-strong)" />
          </g>
          <g className="status-anim-cloud-b" opacity="0.38">
            <rect x="274" y="54" width="56" height="14" rx="7" fill="var(--color-border-strong)" />
            <circle cx="294" cy="54" r="10" fill="var(--color-border-strong)" />
            <circle cx="310" cy="56" r="7" fill="var(--color-border-strong)" />
          </g>

          {/* Twinkling sparkles */}
          <g className="status-anim-sparkle-a" fill="var(--color-accent)">
            <path d="M98 34 L100.5 40.5 L107 43 L100.5 45.5 L98 52 L95.5 45.5 L89 43 L95.5 40.5 Z" />
          </g>
          <g className="status-anim-sparkle-b" fill="var(--color-gold)">
            <path d="M266 32 L268 37 L273 39 L268 41 L266 46 L264 41 L259 39 L264 37 Z" />
          </g>
          <circle cx="52" cy="148" r="3.5" fill="var(--color-accent)" className="status-anim-sparkle-b" />
          <circle cx="312" cy="136" r="3" fill="var(--color-gold)" className="status-anim-sparkle-a" />

          {/* Ground shadows */}
          <ellipse cx="86" cy="198" rx="34" ry="7" fill="var(--color-text-muted)" opacity="0.2" className="status-anim-shadow-slow" />
          <ellipse cx="180" cy="202" rx="44" ry="9" fill="var(--color-text-muted)" opacity="0.26" className="status-anim-shadow-ball" />
          <ellipse cx="274" cy="198" rx="34" ry="7" fill="var(--color-text-muted)" opacity="0.2" className="status-anim-shadow-slow" />

          {/* Left digit "4" */}
          <g className="status-anim-float-left">
            <text
              x="86"
              y="156"
              textAnchor="middle"
              fontFamily="var(--font-sans)"
              fontWeight="900"
              fontSize="106"
              fill="url(#cric404Digit)"
              stroke="var(--color-card)"
              strokeWidth="4"
              paintOrder="stroke"
            >
              4
            </text>
          </g>

          {/* Center "0" — bouncing stitched cricket ball + orbiting ring + flying bails */}
          <g className="status-anim-ball-bounce">
            {/* Dashed orbital ring */}
            <ellipse
              cx="180"
              cy="120"
              rx="58"
              ry="20"
              transform="rotate(-16 180 120)"
              stroke="var(--color-accent)"
              strokeWidth="2"
              strokeDasharray="6 6"
              opacity="0.55"
            />
            {/* Flying wooden bails */}
            <rect
              x="140"
              y="56"
              width="24"
              height="6"
              rx="3"
              fill="var(--color-gold)"
              className="status-anim-bail-left"
            />
            <rect
              x="196"
              y="56"
              width="24"
              height="6"
              rx="3"
              fill="var(--color-gold)"
              className="status-anim-bail-right"
            />
            {/* Cricket ball sphere */}
            <g className="status-anim-ball-spin">
              <circle cx="180" cy="120" r="42" fill="url(#cric404Ball)" stroke="var(--color-card)" strokeWidth="4" />
              {/* Specular highlight */}
              <ellipse cx="166" cy="103" rx="12" ry="7" transform="rotate(-28 166 103)" fill="#FFFFFF" opacity="0.3" />
              {/* White stitched seam */}
              <path
                d="M150 93 C168 106, 192 134, 210 147"
                stroke="#FFFFFF"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="4 4"
              />
              <path
                d="M155 88 C173 101, 197 129, 215 142"
                stroke="#FFE4E6"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeDasharray="4 4"
                opacity="0.85"
              />
            </g>
          </g>

          {/* Right digit "4" */}
          <g className="status-anim-float-right">
            <text
              x="274"
              y="156"
              textAnchor="middle"
              fontFamily="var(--font-sans)"
              fontWeight="900"
              fontSize="106"
              fill="url(#cric404Digit)"
              stroke="var(--color-card)"
              strokeWidth="4"
              paintOrder="stroke"
            >
              4
            </text>
          </g>
        </svg>
      </div>
    );
  }

  if (variant === 'error') {
    return (
      <div
        aria-hidden="true"
        className={`status-anim mx-auto inline-flex select-none items-center justify-center ${className}`.trim()}
        style={{ width: dims.width, height: dims.height, ...style }}
      >
        <svg
          viewBox="0 0 280 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full overflow-visible"
        >
          <defs>
            <radialGradient id="cricErrGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--color-danger)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="var(--color-danger)" stopOpacity="0" />
            </radialGradient>
          </defs>

          <ellipse cx="140" cy="102" rx="108" ry="70" fill="url(#cricErrGlow)" />
          <ellipse cx="140" cy="170" rx="58" ry="8" fill="var(--color-text-muted)" opacity="0.22" className="status-anim-shadow-slow" />

          {/* Floating server/cloud card */}
          <g className="status-anim-float-left">
            {/* Cloud body */}
            <path
              d="M84 128 H198 C215 128 228 115 228 99 C228 84 217 72 203 70 C197 50 179 36 157 36 C133 36 113 53 109 76 C92 78 78 92 78 109 C78 120 81 128 84 128 Z"
              fill="var(--color-card)"
              stroke="var(--color-border-strong)"
              strokeWidth="3"
            />
            {/* Pulse rings */}
            <circle cx="152" cy="88" r="24" stroke="var(--color-danger)" strokeWidth="2.5" opacity="0.35" className="status-anim-pulse-ring" />
            <circle cx="152" cy="88" r="18" fill="var(--color-danger-soft)" stroke="var(--color-danger)" strokeWidth="2.5" />
            {/* Exclamation mark */}
            <rect x="149.5" y="77" width="5" height="13" rx="2.5" fill="var(--color-danger)" />
            <circle cx="152" cy="96.5" r="2.75" fill="var(--color-danger)" />
          </g>

          {/* Disconnected cord ends bobbing gently */}
          <g className="status-anim-plug-left">
            <path d="M52 152 C74 152, 84 144, 98 144" stroke="var(--color-border-strong)" strokeWidth="3.5" strokeLinecap="round" />
            <rect x="98" y="137" width="18" height="14" rx="4" fill="var(--color-card)" stroke="var(--color-accent)" strokeWidth="2.5" />
            <line x1="116" y1="141" x2="123" y2="141" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="116" y1="147" x2="123" y2="147" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" />
          </g>
          <g className="status-anim-plug-right">
            <path d="M228 152 C206 152, 196 144, 182 144" stroke="var(--color-border-strong)" strokeWidth="3.5" strokeLinecap="round" />
            <rect x="164" y="137" width="18" height="14" rx="4" fill="var(--color-card)" stroke="var(--color-danger)" strokeWidth="2.5" />
          </g>

          {/* Tiny electric spark in the gap */}
          <path
            d="M142 134 L137 143 L143 143 L139 152"
            stroke="var(--color-gold)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="status-anim-sparkle-a"
          />
        </svg>
      </div>
    );
  }

  // Default: 'empty' — Empty Data / No Results Found
  return (
    <div
      aria-hidden="true"
      className={`status-anim mx-auto inline-flex select-none items-center justify-center ${className}`.trim()}
      style={{ width: dims.width, height: dims.height, ...style }}
    >
      <svg
        viewBox="0 0 280 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full overflow-visible"
      >
        <defs>
          <radialGradient id="cricEmptyGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse cx="140" cy="108" rx="105" ry="66" fill="url(#cricEmptyGlow)" />

        {/* Soft breathing shadow */}
        <ellipse cx="140" cy="172" rx="64" ry="8" fill="var(--color-text-muted)" opacity="0.22" className="status-anim-shadow-slow" />

        {/* Rising sparkle particles */}
        <g className="status-anim-sparkle-a" fill="var(--color-accent)">
          <path d="M90 48 L92 53 L97 55 L92 57 L90 62 L88 57 L83 55 L88 53 Z" />
        </g>
        <g className="status-anim-sparkle-b" fill="var(--color-gold)">
          <circle cx="198" cy="46" r="4" />
        </g>
        <circle cx="66" cy="96" r="3" fill="var(--color-border-strong)" className="status-anim-sparkle-b" />
        <circle cx="216" cy="92" r="3.5" fill="var(--color-accent)" opacity="0.6" className="status-anim-sparkle-a" />

        {/* Floating open inbox/folder box */}
        <g className="status-anim-float-left">
          {/* Back flap */}
          <path
            d="M84 84 L102 64 H178 L196 84 Z"
            fill="var(--color-surface-muted)"
            stroke="var(--color-border-strong)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Floating blank document peeking out */}
          <g className="status-anim-doc-bob">
            <rect
              x="110"
              y="46"
              width="60"
              height="68"
              rx="8"
              fill="var(--color-card)"
              stroke="var(--color-border-strong)"
              strokeWidth="2.5"
            />
            <line x1="122" y1="62" x2="158" y2="62" stroke="var(--color-border-strong)" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="122" y1="74" x2="150" y2="74" stroke="var(--color-border-strong)" strokeWidth="3.5" strokeLinecap="round" opacity="0.7" />
            <line x1="122" y1="86" x2="142" y2="86" stroke="var(--color-accent)" strokeWidth="3.5" strokeLinecap="round" opacity="0.6" />
          </g>
          {/* Front tray */}
          <path
            d="M78 86 H112 C116 98 126 104 140 104 C154 104 164 98 168 86 H202 L194 146 C193 152 188 156 182 156 H98 C92 156 87 152 86 146 L78 86 Z"
            fill="var(--color-card)"
            stroke="var(--color-border-strong)"
            strokeWidth="2.8"
            strokeLinejoin="round"
          />
          {/* Subtle accent indicator bar on tray */}
          <rect x="122" y="128" width="36" height="6" rx="3" fill="var(--color-border-strong)" opacity="0.55" />
        </g>

        {/* Scanning magnifying glass */}
        <g className="status-anim-lens-scan">
          <circle
            cx="176"
            cy="112"
            r="24"
            fill="var(--color-card)"
            fillOpacity="0.72"
            stroke="var(--color-accent)"
            strokeWidth="4"
          />
          {/* Glass sheen */}
          <path d="M165 103 C168 98 174 96 179 97" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
          {/* Handle */}
          <line
            x1="194"
            y1="130"
            x2="212"
            y2="148"
            stroke="var(--color-brand)"
            strokeWidth="6.5"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
}

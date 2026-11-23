import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  showText?: boolean;
  className?: string;
}

export function SegLogo({
  size = 32,
  showText = true,
  className = '',
  ...props
}: LogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* SVG Icon Emblem */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-200"
        {...props}
      >
        <defs>
          <linearGradient id="segPlumGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#55225c" />
            <stop offset="100%" stopColor="#3d1642" />
          </linearGradient>
          <linearGradient id="segOrangeGrad" x1="12" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f37032" />
            <stop offset="100%" stopColor="#e55511" />
          </linearGradient>
        </defs>

        {/* Deep Plum Rounded Shield Base (#471C4C) */}
        <rect width="48" height="48" rx="12" fill="url(#segPlumGrad)" />
        {/* Subtle Crisp Inner Border */}
        <rect
          x="1"
          y="1"
          width="46"
          height="46"
          rx="11"
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth="1"
        />

        {/* Academic Ribbon / Stylized 'S' Emblem (#F26522) */}
        <path
          d="M32 15.5C32 15.5 29 12.5 24 12.5C18.5 12.5 15.5 15.5 15.5 19.5C15.5 25 32.5 23 32.5 29C32.5 33.5 29 35.5 23.5 35.5C18 35.5 15 32.5 15 32.5"
          stroke="url(#segOrangeGrad)"
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Golden Yellow Accent Nodes (#FBB019) */}
        <circle cx="32.5" cy="15.5" r="2.5" fill="#FBB019" />
        <circle cx="15" cy="32.5" r="2.5" fill="#FBB019" />
      </svg>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col text-left leading-none">
          <div className="flex items-center gap-1">
            <span className="font-black tracking-tight text-seg-plum dark:text-white text-base">
              SEG
            </span>
            <span className="font-extrabold tracking-tight text-seg-orange text-base">
              ACADEMY
            </span>
          </div>
          <span className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase pt-0.5">
            Enterprise CRM
          </span>
        </div>
      )}
    </div>
  );
}

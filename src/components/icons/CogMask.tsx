import React from 'react';

interface CogMaskProps {
  children: React.ReactNode;
  size?: number;
}

export const CogMask: React.FC<CogMaskProps> = ({ children, size = 24 }) => {
  // Separate scale for the mask to create a buffer zone
  const maskScale = 1.4;
  const cx = 19;
  const cy = 19;

  // Helper to scale points around the cog center (19, 19) for the mask
  const ms = (val: number) => (val - cx) * maskScale + cx;
  const msv = (val: number) => (val - cy) * maskScale + cy;

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
      <defs>
        <mask id="cog-mask">
          {/* White area: everything here remains visible */}
          <rect width="24" height="24" fill="white" />
          {/* Black area: scaled larger to create a buffer/gap around the visible cog */}
          <g fill="black" stroke="black" strokeWidth={2 * maskScale} strokeLinecap="round" strokeLinejoin="round">
            <circle cx={cx} cy={cy} r={2 * maskScale} />
            <path d={`M${cx} ${msv(15.5)}v${1.5 * maskScale}`} />
            <path d={`M${cx} ${msv(21)}v${1.5 * maskScale}`} />
            <path d={`M${ms(22.032)} ${msv(17.25)}l${-1.299 * maskScale} ${0.75 * maskScale}`} />
            <path d={`M${ms(17.27)} ${msv(20)}l${-1.3 * maskScale} ${0.75 * maskScale}`} />
            <path d={`M${ms(15.97)} ${msv(17.25)}l${1.3 * maskScale} ${0.75 * maskScale}`} />
            <path d={`M${ms(20.733)} ${msv(20)}l${1.3 * maskScale} ${0.75 * maskScale}`} />
          </g>
        </mask>
      </defs>
      <g mask="url(#cog-mask)">
        {children}
      </g>
      {/* Render the cog at original size (1.0x) to create the separation gap */}
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="19" cy="19" r="2" />
        <path d="M19 15.5v1.5" />
        <path d="M19 21v1.5" />
        <path d="M22.032 17.25l-1.299 .75" />
        <path d="M17.27 20l-1.3 .75" />
        <path d="M15.97 17.25l1.3 .75" />
        <path d="M20.733 20l1.3 .75" />
      </g>
    </svg>
  );
};

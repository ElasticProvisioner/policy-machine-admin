import React from 'react';

// Geometry for the small "cog" decoration drawn at the bottom-right of an
// operation icon, plus the mask that punches a transparent buffer/gap around
// it so the cog reads as a separate element.
//
// These are exposed as plain SVG fragments (not a wrapping <svg>) so the
// consumer can paint everything inside a single, analytically-rendered SVG.
// Wrapping content in a nested <svg> caused it to be rasterized at 1x CSS
// pixels (blurry on hi-dpi displays); keeping one flat SVG renders crisply.

const maskScale = 1.4;
const cx = 19;
const cy = 19;

// Scale points around the cog center (19, 19) for the larger mask buffer.
const ms = (val: number) => (val - cx) * maskScale + cx;
const msv = (val: number) => (val - cy) * maskScale + cy;

/** <defs> containing the cog mask. `id` must be unique per rendered icon. */
export const CogMaskDefs: React.FC<{ id: string }> = ({ id }) => (
  <defs>
    <mask id={id}>
      {/* White area: everything here remains visible */}
      <rect width="24" height="24" fill="white" />
      {/* Black area: scaled larger to create a buffer/gap around the visible cog */}
      <g
        fill="black"
        stroke="black"
        strokeWidth={2 * maskScale}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
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
);

/** The cog decoration, drawn at its original (1.0x) size on top of the icon. */
export const CogOverlay: React.FC<{ color?: string }> = ({ color = 'currentColor' }) => (
  <g
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="19" cy="19" r="2" />
    <path d="M19 15.5v1.5" />
    <path d="M19 21v1.5" />
    <path d="M22.032 17.25l-1.299 .75" />
    <path d="M17.27 20l-1.3 .75" />
    <path d="M15.97 17.25l1.3 .75" />
    <path d="M20.733 20l1.3 .75" />
  </g>
);

import React, { useId } from 'react';
import { CogMaskDefs, CogOverlay } from './CogMask';

export interface OperationIconProps {
  size?: number;
  stroke?: number;
  color?: string;
  className?: string;
  filled?: boolean;
  fillColor?: string;
}

interface BaseOperationIconProps extends OperationIconProps {
  children: React.ReactNode;
}

export const BaseOperationIcon: React.FC<BaseOperationIconProps> = ({
  size = 24,
  stroke = 2,
  color = 'currentColor',
  className = '',
  children,
}) => {
  // Unique mask id per instance so multiple icons on a page don't collide.
  const maskId = `cog-mask-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ color, overflow: 'visible' }}
    >
      <CogMaskDefs id={maskId} />
      <g
        mask={`url(#${maskId})`}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </g>
      <CogOverlay color={color} />
    </svg>
  );
};

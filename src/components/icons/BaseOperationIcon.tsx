import React from 'react';
import { CogMask } from './CogMask';

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
  return (
    <CogMask>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {children}
      </svg>
    </CogMask>
  );
};

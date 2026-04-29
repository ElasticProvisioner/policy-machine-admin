import React from 'react';
import { BaseOperationIcon, OperationIconProps } from './BaseOperationIcon';

export const AdminOperationIcon: React.FC<OperationIconProps> = (props) => {
  return (
    <BaseOperationIcon {...props}>
      <g strokeWidth="1.5">
        {/* Root node line (vertical trunk) */}
        <line x1="4" y1="6" x2="4" y2="17" />

        {/* Horizontal branches to child nodes */}
        <line x1="4" y1="8" x2="14" y2="8" />
        <line x1="4" y1="13" x2="14" y2="13" />
        <line x1="4" y1="18" x2="14" y2="18" />
      </g>

      {/* Nodes - increased radius to 2.5 */}
      <circle cx="4" cy="4" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="14" cy="8" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="14" cy="13" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="14" cy="18" r="2.5" fill="currentColor" stroke="none" />
    </BaseOperationIcon>
  );
};

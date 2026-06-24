import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Text, Box } from '@mantine/core';

export interface BaseNodeProps extends NodeProps {
  data: {
    label: string;
    type: string;
  };
}

export const BaseNode: React.FC<BaseNodeProps> = ({ data }) => {
  return (
    <Box
      style={{
        padding: '8px 12px',
        borderRadius: '8px',
        border: '1px solid #ddd',
        backgroundColor: 'white',
        minWidth: '100px',
        textAlign: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      <Text size="xs" fw={700} c="dimmed" style={{ textTransform: 'uppercase', marginBottom: 4 }}>
        {data.type}
      </Text>
      <Text size="sm" fw={500}>
        {data.label}
      </Text>
    </Box>
  );
};

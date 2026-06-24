import React from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer, MarkerType } from 'reactflow';
import { Text } from '@mantine/core';

export const AssignmentEdge: React.FC<EdgeProps> = (props) => {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {} } = props;
  const [edgePath] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  return (
    <path
      id={id}
      style={{ ...style, strokeWidth: 2 }}
      className="react-flow__edge-path"
      d={edgePath}
      markerEnd="arrow"
    />
  );
};

export const AssociationEdge: React.FC<EdgeProps> = (props) => {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, style = {} } = props;
  const [edgePath] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  return (
    <>
      <path
        id={id}
        style={{ ...style, strokeWidth: 2 }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd="arrow"
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%)`,
            pointerEvents: 'all',
            left: `${(sourceX + targetX) / 2}px`,
            top: `${(sourceY + targetY) / 2}px`,
            fontSize: 11,
            backgroundColor: 'rgba(255,255,255,0.8)',
            padding: '2px 4px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            whiteSpace: 'nowrap',
          }}
        >
          <Text size="xs" fw={500}>
            {data?.label || 'association'}
          </Text>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

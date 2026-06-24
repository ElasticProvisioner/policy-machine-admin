import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { BaseNode } from './BaseNode';
import { NodeType } from '@/shared/api/pdp.types';
import { Box } from '@mantine/core';

interface NodeData {
  label: string;
  type: NodeType;
}

const NodeWrapper: React.FC<{ data: NodeData; children: React.ReactNode }> = ({ children }) => {
  return <Box style={{ position: 'relative' }}>{children}</Box>;
};

export const PCNode: React.FC<NodeProps> = ({ data }) => (
  <NodeWrapper data={data as any}>
    <BaseNode data={data as any} />
    <Handle type="target" position={Position.Top} />
    {/* PCs have no outgoing edges per requirements */}
  </NodeWrapper>
);

export const UANode: React.FC<NodeProps> = ({ data }) => (
  <NodeWrapper data={data as any}>
    <BaseNode data={data as any} />
    <Handle type="target" position={Position.Top} />
    <Handle type="source" position={Position.Bottom} />
  </NodeWrapper>
);

export const OANode: React.FC<NodeProps> = ({ data }) => (
  <NodeWrapper data={data as any}>
    <BaseNode data={data as any} />
    <Handle type="target" position={Position.Top} />
    <Handle type="source" position={Position.Bottom} />
  </NodeWrapper>
);

export const UNode: React.FC<NodeProps> = ({ data }) => (
  <NodeWrapper data={data as any}>
    <BaseNode data={data as any} />
    {/* Users have no incoming edges per requirements */}
    <Handle type="source" position={Position.Bottom} />
  </NodeWrapper>
);

export const ONode: React.FC<NodeProps> = ({ data }) => (
  <NodeWrapper data={data as any}>
    <BaseNode data={data as any} />
    {/* Objects have no incoming edges per requirements */}
    <Handle type="source" position={Position.Bottom} />
  </NodeWrapper>
);

export const nodeTypes = {
  PC: PCNode,
  UA: UANode,
  OA: OANode,
  U: UNode,
  O: ONode,
};

import React, { useState, useCallback } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { nodeTypes } from './nodes/TypeNodes';
import { AssignmentEdge, AssociationEdge } from './edges/CustomEdges';
import { validateConnection } from './utils/graphConstraints';
import { layoutGraph } from './utils/graphLayout';
import { NodeType } from '@/shared/api/pdp.types';
import { Button, Group, Stack, Box, Text, ActionIcon } from '@mantine/core';
import { IconPlus, IconLayout } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

const edgeTypes = {
  assignment: AssignmentEdge,
  association: AssociationEdge,
};

export function GraphBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState([
    {
      id: 'u-1',
      type: 'U',
      position: { x: 100, y: 0 },
      data: { label: 'User: Alice', type: 'U' as NodeType },
    },
    {
      id: 'o-1',
      type: 'O',
      position: { x: 400, y: 0 },
      data: { label: 'Object: File.txt', type: 'O' as NodeType },
    },
    {
      id: 'ua-1',
      type: 'UA',
      position: { x: 100, y: 200 },
      data: { label: 'UA: Superuser', type: 'UA' as NodeType },
    },
    {
      id: 'ua-2',
      type: 'UA',
      position: { x: 200, y: 200 },
      data: { label: 'UA: Editor', type: 'UA' as NodeType },
    },
    {
      id: 'oa-1',
      type: 'OA',
      position: { x: 400, y: 200 },
      data: { label: 'OA: Document Access', type: 'OA' as NodeType },
    },
    {
      id: 'pc-1',
      type: 'PC',
      position: { x: 250, y: 400 },
      data: { label: 'Policy Class: Admin', type: 'PC' as NodeType },
    },
  ]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([
    { id: 'e1-2', source: 'ua-1', target: 'pc-1', type: 'assignment' },
    { id: 'e1-3', source: 'ua-1', target: 'oa-1', type: 'association', data: { label: 'can-edit' } },
    { id: 'e2-1', source: 'ua-2', target: 'pc-1', type: 'assignment' },
    { id: 'e2-3', source: 'ua-2', target: 'oa-1', type: 'association', data: { label: 'can-view' } },
    { id: 'e3-1', source: 'u-1', target: 'ua-1', type: 'assignment' },
    { id: 'e3-2', source: 'u-1', target: 'ua-2', type: 'assignment' },
    { id: 'e4-1', source: 'o-1', target: 'oa-1', type: 'assignment' },
  ]);

  const addNode = (type: NodeType) => {
    const id = `node_${Date.now()}`;
    const newNode: Node = {
      id,
      type: type as any,
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { label: `${type} ${nodes.filter(n => n.type === (type as any)).length + 1}`, type },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const onConnect = useCallback(
    (params: Connection) => {
      const sourceNode = nodes.find((n) => n.id === params.source);
      const targetNode = nodes.find((n) => n.id === params.target);

      if (!sourceNode || !targetNode) return;

      const sourceType = sourceNode.data.type as NodeType;
      const targetType = targetNode.data.type as NodeType;

      // Default to assignment first, then try association if assignment fails or based on some UI toggle
      // For this MVP, we'll try to validate as association if the source is UA, else assignment
      const isAssociation = sourceType === NodeType.UA;
      const validation = validateConnection({
        source: params.source,
        target: params.target,
        sourceType,
        targetType,
      }, isAssociation);

      if (!validation.valid) {
        notifications.show({
          color: 'red',
          title: 'Invalid Connection',
          message: validation.reason,
        });
        return;
      }

      const newEdge: Edge = {
        ...params,
        type: isAssociation ? 'association' : 'assignment',
        data: { label: isAssociation ? 'assoc' : '' },
      };

      setEdges((eds) => addEdge(newEdge, eds));
    },
    [nodes, setEdges]
  );

  return (
    <Box style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Group position="top-right" style={{ position: 'absolute', zIndex: 10, top: 10, right: 10 }}>
        <Stack gap="xs">
          <Group gap="xs">
            {(['PC', 'UA', 'OA', 'U', 'O'] as NodeType[]).map((type) => (
              <Button
                key={type}
                variant="light"
                size="compact-xs"
                onClick={() => addNode(type)}
              >
                + {type}
              </Button>
            ))}
          </Group>
          <Button
            variant="filled"
            size="compact-xs"
            leftSection={<IconLayout size={14} />}
            onClick={() => {
              const layoutedNodes = layoutGraph(nodes, edges);
              setNodes(layoutedNodes);
            }}
          >
            Auto Layout
          </Button>
        </Stack>
      </Group>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        defaultEdgeOptions={{
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#b1b1b7',
          },
        }}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </Box>
  );
}

import dagre from 'dagre';
import { Node, Edge } from 'reactflow';
import { NodeType } from '@/shared/api/pdp.types';

export const layoutGraph = (nodes: Node[], edges: Edge[]) => {
  const g = new dagre.graphlib.Graph();

  // Set rankdir to 'TB' (Top-to-Bottom) to maintain the vertical layers
  // but we will use 'rank' constraints to force the specific layout.
  g.setGraph({ rankdir: 'TB', nodesep: 100, ranksep: 150 });
  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((node) => {
    const type = node.data.type as NodeType;
    let rank = 1; // Default middle layer (UA/OA)

    if (type === NodeType.PC) {
      rank = 2; // Bottom layer
    } else if (type === NodeType.U || type === NodeType.O) {
      rank = 0; // Top layer
    }

    g.setNode(node.id, { width: 150, height: 50, rank });
  });

  edges.forEach((edge) => {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  });

  dagre.layout(g);

  return nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);

    // Adjust X position based on type for Left/Right split
    let xOffset = 0;
    const type = node.data.type as NodeType;
    if (type === NodeType.U || type === NodeType.UA) {
      xOffset = -100; // Shift left
    } else if (type === NodeType.O || type === NodeType.OA) {
      xOffset = 100; // Shift right
    }

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 75 + xOffset,
        y: nodeWithPosition.y - 25,
      },
    };
  });
};

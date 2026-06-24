import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toJpeg, toPng, toSvg } from 'html-to-image';
import {
    addEdge,
    Background,
    BackgroundVariant,
    Connection,
    ConnectionMode,
    Controls,
    Edge,
    Handle,
    MarkerType,
    MiniMap,
    Node,
    NodeProps,
    OnConnectStartParams,
    Position,
    ReactFlow,
    ReactFlowProvider,
    useEdgesState,
    useNodesState,
    useReactFlow,
    getRectOfNodes,
    getTransformForBounds,
} from 'reactflow';
import {
    AppShell,
    Button,
    Group,
    Menu,
    Modal,
    Paper,
    Select,
    Stack,
    Text,
    Textarea,
    TextInput,
    Title,
    ActionIcon,
    Tooltip,
    Box,
    useMantineTheme
} from '@mantine/core';

import 'reactflow/dist/style.css';

import { IconCamera, IconJson, IconSitemap, IconSun, IconMoon, IconTrash } from '@tabler/icons-react';
import { PMIcon } from "@/components/icons/PMIcon";
import {NodeType} from "@/shared/api/pdp.types";
import {isValidAssignment, NodeIcon, TreeNode} from "@/features/pmtree/tree-utils";
import {useTheme} from "@/shared/theme/ThemeContext";
import {AssociationModal} from "@/pages/dag/AssociationModal";

const getNodeTypeColorFromTheme = (type: string) => {
    switch (type) {
        case "PC":
            return '#00973c'; // theme.colors.green[9]
        case "UA":
            return '#9f003e'; // theme.colors.red[9]
        case "OA":
            return '#0043b5'; // theme.colors.blue[9]
        case "U":
            return '#e3366c'; // theme.colors.red[4]
        case "O":
            return '#3884fe'; // theme.colors.blue[4]
        default:
            return '#adb5bd'; // theme.colors.gray[5]
    }
};

// Converts nodes and edges to Policy Machine JSON schema's 'graph' element
function graphToJson(nodes: Node[], edges: Edge[]) {
    // Helper to parse node id as integer (schema requires integer IDs)
    const parseId = (id: string) => {
        const n = Number(id);
        return Number.isFinite(n) ? n : id;
    };

    // Group nodes by type
    const pcs = nodes
        .filter((n) => n.data.type === NodeType.PC)
        .map((n) => ({
            id: parseId(n.id),
            name: n.data.name,
            properties: [],
        }));
    const uas = nodes
        .filter((n) => n.data.type === NodeType.UA)
        .map((n) => ({
            id: parseId(n.id),
            name: n.data.name,
            assignments: edges
                .filter((e) => e.data?.edgeType === 'assignment' && e.source === n.id)
                .map((e) => parseId(e.target)),
            associations: edges
                .filter((e) => e.data?.edgeType === 'association' && e.source === n.id)
                .map((e) => ({
                    target: parseId(e.target),
                    arset: e.data?.accessRights ? e.data.accessRights.split(', ').filter(Boolean) : [],
                })),
            properties: [],
        }));
    const oas = nodes
        .filter((n) => n.data.type === NodeType.OA)
        .map((n) => ({
            id: parseId(n.id),
            name: n.data.name,
            assignments: edges
                .filter((e) => e.data?.edgeType === 'assignment' && e.source === n.id)
                .map((e) => parseId(e.target)),
            properties: [],
        }));
    const users = nodes
        .filter((n) => n.data.type === NodeType.U)
        .map((n) => ({
            id: parseId(n.id),
            name: n.data.name,
            assignments: edges
                .filter((e) => e.data?.edgeType === 'assignment' && e.source === n.id)
                .map((e) => parseId(e.target)),
            properties: [],
        }));
    const objects = nodes
        .filter((n) => n.data.type === NodeType.O)
        .map((n) => ({
            id: parseId(n.id),
            name: n.data.name,
            assignments: edges
                .filter((e) => e.data?.edgeType === 'assignment' && e.source === n.id)
                .map((e) => parseId(e.target)),
            properties: [],
        }));

    return JSON.stringify(
        {
            graph: { pcs, uas, oas, users, objects },
        },
        null,
        2
    );
}

// Converts Policy Machine JSON schema's 'graph' element to nodes and edges arrays
function jsonToGraph(json: any): { nodes: Node[]; edges: Edge[] } {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    if (!json || !json.graph) {
        return { nodes, edges };
    }
    const { pcs = [], uas = [], oas = [], users = [], objects = [] } = json.graph;

    // Helper to make string IDs (for ReactFlow)
    const idStr = (id: any) => String(id);

    // Add all nodes
    (pcs as any[]).forEach((n: any) =>
        nodes.push({
            id: idStr(n.id),
            type: 'dagNode',
            position: { x: 0, y: 0 },
            data: { name: n.name, type: NodeType.PC },
        })
    );
    (uas as any[]).forEach((n: any) =>
        nodes.push({
            id: idStr(n.id),
            type: 'dagNode',
            position: { x: 0, y: 0 },
            data: { name: n.name, type: NodeType.UA },
        })
    );
    (oas as any[]).forEach((n: any) =>
        nodes.push({
            id: idStr(n.id),
            type: 'dagNode',
            position: { x: 0, y: 0 },
            data: { name: n.name, type: NodeType.OA },
        })
    );
    (users as any[]).forEach((n: any) =>
        nodes.push({
            id: idStr(n.id),
            type: 'dagNode',
            position: { x: 0, y: 0 },
            data: { name: n.name, type: NodeType.U },
        })
    );
    (objects as any[]).forEach((n: any) =>
        nodes.push({
            id: idStr(n.id),
            type: 'dagNode',
            position: { x: 0, y: 0 },
            data: { name: n.name, type: NodeType.O },
        })
    );

    // Add assignment edges (source = node.id, target = assignment id)
    const addAssignmentEdges = (arr: any[], sourceType: string) => {
        arr.forEach((n: any) => {
            if (Array.isArray(n.assignments)) {
                n.assignments.forEach((targetId: any) => {
                    // Find target node type
                    const targetNode = nodes.find((node) => node.id === idStr(targetId));
                    const targetNodeType = targetNode?.data.type;

                    edges.push({
                        id: `e${n.id}-${targetId}`,
                        source: idStr(n.id),
                        target: idStr(targetId),
                        type: getEdgeType('assignment'),
                        sourceHandle: 'assignment-out',
                        targetHandle: 'assignment-in',
                        data: {
                            edgeType: 'assignment',
                            sourceNodeType: sourceType,
                            targetNodeType,
                        },
                        style: getEdgeStyle('assignment', false, false),
                        markerEnd: getMarkerEnd('assignment', false, false),
                    } as Edge);
                });
            }
        });
    };
    addAssignmentEdges(uas as any[], NodeType.UA);
    addAssignmentEdges(oas as any[], NodeType.OA);
    addAssignmentEdges(users as any[], NodeType.U);
    addAssignmentEdges(objects as any[], NodeType.O);

    // Add association edges (UA only)
    (uas as any[]).forEach((n: any) => {
        if (Array.isArray(n.associations)) {
            n.associations.forEach((assoc: any, i: number) => {
                const accessRights = Array.isArray(assoc.arset) ? assoc.arset.join(', ') : '';
                const targetNode = nodes.find((node) => node.id === idStr(assoc.target));
                const targetNodeType = targetNode?.data.type;

                edges.push({
                    id: `a${n.id}-${assoc.target}-${i}`,
                    source: idStr(n.id),
                    target: idStr(assoc.target),
                    type: getEdgeType('association'),
                    sourceHandle: 'association-out',
                    targetHandle: 'association-in',
                    data: {
                        edgeType: 'association',
                        accessRights,
                        sourceNodeType: NodeType.UA,
                        targetNodeType,
                    },
                    style: getEdgeStyle('association', false, false),
                    markerEnd: getMarkerEnd('association', false, false),
                } as Edge);
            });
        }
    });

    return { nodes, edges };
}

function DAGNode({ data, selected }: NodeProps) {
    const mantineTheme = useMantineTheme();
    const nodeType = data.type;
    const typeColor = getNodeTypeColorFromTheme(nodeType);
    const isHighlighted = data.isHighlighted;

    // Determine outline color for highlighting - red for user nodes, blue for object nodes
    let outlineColor = '';
    if (isHighlighted) {
        const isUserSide = nodeType === NodeType.U || nodeType === NodeType.UA;
        const isObjectSide = nodeType === NodeType.O || nodeType === NodeType.OA;
        outlineColor = isUserSide ? mantineTheme.colors.red[4] : isObjectSide ? mantineTheme.colors.blue[4] : mantineTheme.colors.green[4];
    }

    return (
        <div
            style={{
                position: 'relative',
                background: 'transparent',
                borderRadius: 8,
                border: `2px solid ${typeColor}`,
                padding: '6px 4px',
                fontSize: '14px',
                color: 'black',
                whiteSpace: 'nowrap',
            }}
        >
            {/* Highlighted border overlay */}
            {isHighlighted && (
                <div
                    style={{
                        position: 'absolute',
                        top: -2,
                        left: -2,
                        right: -2,
                        bottom: -2,
                        borderRadius: 6,
                        border: `2px solid ${typeColor}`,
                        filter: `drop-shadow(0 0 2px ${outlineColor}) drop-shadow(0 0 4px ${outlineColor})`,
                        pointerEvents: 'none',
                        zIndex: -1,
                    }}
                />
            )}

            {/* Left center: incoming associations */}
            <Handle
                type="target"
                position={Position.Left}
                id="association-in"
                style={{
                    background: 'var(--mantine-color-green-7)',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    border: '1px solid var(--mantine-color-green-7)',
                    top: '50%',
                    left: '-5px',
                }}
            />

            {/* Right center: outgoing associations */}
            {nodeType === NodeType.UA && (
                <Handle
                    type="source"
                    position={Position.Right}
                    id="association-out"
                    style={{
                        background: 'var(--mantine-color-green-7)',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        border: '1px solid var(--mantine-color-green-7)',
                        top: '50%',
                        right: '-5px',
                    }}
                />
            )}

            {/* Top center: incoming assignments */}
            {(nodeType === NodeType.PC || nodeType === NodeType.UA || nodeType === NodeType.OA) && (
                <Handle
                    type="target"
                    position={Position.Top}
                    id="assignment-in"
                    style={{
                        background: 'black',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        border: '1px solid black',
                        top: '-5px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                    }}
                />
            )}

            {/* Bottom center: outgoing assignments */}
            {(nodeType === NodeType.UA || nodeType === NodeType.OA || nodeType === NodeType.U || nodeType === NodeType.O) && (
                <Handle
                    type="source"
                    position={Position.Bottom}
                    id="assignment-out"
                    style={{
                        background: 'black',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        border: '1px solid black',
                        bottom: '-5px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                    }}
                />
            )}

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <div
                    style={{
                        fontSize: '10px',
                        lineHeight: '14px',
                        display: 'flex',
                        width: '14px',
                        justifyContent: 'center',
                    }}
                >
                    <NodeIcon
                        type={nodeType}
                        style={{
                            fontSize: '10px',
                            lineHeight: '14px',
                            width: '14px',
                            height: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    />
                </div>
                <span
                    style={{
                        fontWeight: 800,
                        lineHeight: '14px',
                        fontSize: '14px',
                        fontFamily: 'Source Code Pro, monospace',
                    }}
                >
                    {data.name}
                </span>
            </div>
        </div>
    );
}

// Simple Straight Edge Component for assignment edges
function SimpleStraightEdge({
                                id,
                                sourceX,
                                sourceY,
                                targetX,
                                targetY,
                                style = {},
                                markerEnd,
                            }: any) {
    const path = `M ${sourceX},${sourceY} L ${targetX},${targetY}`;

    return (
        <g>
            <path
                id={id}
                style={style}
                className="react-flow__edge-path"
                d={path}
                markerEnd={markerEnd}
                fill="none"
            />
        </g>
    );
}

// Node types for ReactFlow
const nodeTypes = {
    dagNode: DAGNode,
};

// Edge types for ReactFlow
const edgeTypes = {
    straight: SimpleStraightEdge,
    // Note: 'default' type is built into ReactFlow for bezier edges
};

// Edge types with specific styling
const getEdgeStyle = (
    edgeType: 'assignment' | 'association',
    isHighlighted: boolean,
    isObjectDag: boolean
) => {
    // If edge is highlighted, use O blue color for object-side and U red color for user-side
    if (isHighlighted) {
        return {
            stroke: isObjectDag
                ? getNodeTypeColorFromTheme(NodeType.O)
                : getNodeTypeColorFromTheme(NodeType.U),
            strokeWidth: 4,
            strokeDasharray: 'none',
        };
    }

    if (edgeType === 'assignment') {
        return {
            stroke: 'black',
            strokeWidth: 2,
            strokeDasharray: 'none',
        };
    }
    return {
        stroke: 'var(--mantine-color-green-7)',
        strokeWidth: 2,
        strokeDasharray: '5,5',
    };
};

const getEdgeType = (edgeType: 'assignment' | 'association') => {
    // Assignment edges use a straight line; association edges use ReactFlow's built-in bezier edge
    return edgeType === 'assignment' ? 'straight' : 'default';
};

const getMarkerEnd = (
    edgeType: 'assignment' | 'association',
    isHighlighted: boolean,
    isObjectDag: boolean
) => {
    // If edge is highlighted, use O blue color for object-side and U red color for user-side
    if (isHighlighted) {
        return {
            type: MarkerType.ArrowClosed,
            color: isObjectDag
                ? getNodeTypeColorFromTheme(NodeType.O)
                : getNodeTypeColorFromTheme(NodeType.U),
            width: 10,
            height: 10,
        };
    }

    return {
        type: MarkerType.ArrowClosed,
        color: edgeType === 'assignment' ? 'black' : 'var(--mantine-color-green-7)',
        width: 10,
        height: 10,
    };
};

const initialGraphJson = {
    "graph": {
        "pcs": [
            {
                "id": 1,
                "name": "Status"
            },
            {
                "id": 2,
                "name": "Account"
            },
            {
                "id": 3,
                "name": "RBAC"
            }
        ],
        "uas": [
            {

                "id": 4,
                "name": "Technical Point of Contact",
                "assignments": [

                ],
                "associations": [
                    {
                        "target": 14,
                        "arset": [
                            "read_assets"
                        ]
                    },
                    {
                        "target": 11,
                        "arset": [
                            "return_license",
                            "read_swid",
                            "write_swid",
                            "read_license",
                            "read_order",
                            "initiate_order"
                        ]
                    }
                ]
            },
            {
                "id": 5,
                "name": "PENDING",
                "assignments": [

                ]
            },
            {
                "id": 6,
                "name": "AUTHORIZED",
                "assignments": [

                ],
                "associations": [
                    {
                        "target": 12,
                        "arset": [
                            "*"
                        ]
                    },
                    {
                        "target": 13,
                        "arset": [
                            "*"
                        ]
                    }
                ]
            },
            {
                "id": 7,
                "name": "License Owner",
                "assignments": [

                ],
                "associations": [
                    {
                        "target": 11,
                        "arset": [
                            "read_swid",
                            "read_order"
                        ]
                    },
                    {
                        "target": 14,
                        "arset": [
                            "write_asset",
                            "read_assets",
                            "read_asset_detail"
                        ]
                    }
                ]
            },
            {
                "id": 8,
                "name": "UNAUTHORIZED",
                "assignments": [
                    5
                ]
            },
            {
                "id": 9,
                "name": "Org1MSP_UA",
                "assignments": [

                ]
            },
            {
                "id": 10,
                "name": "Acquisition Officer",
                "assignments": [

                ],
                "associations": [
                    {
                        "target": 11,
                        "arset": [
                            "deny_order",
                            "read_swid",
                            "read_license",
                            "read_order",
                            "approve_order"
                        ]
                    },
                    {
                        "target": 14,
                        "arset": [
                            "read_assets",
                            "read_asset_detail",
                            "allocate_license"
                        ]
                    }
                ]
            }
        ],
        "oas": [
            {
                "id": 11,
                "name": "RBAC/account",
                "assignments": [
                    3
                ]
            },
            {
                "id": 12,
                "name": "Status/asset",
                "assignments": [
                    1
                ]
            },
            {
                "id": 13,
                "name": "Status/account",
                "assignments": [
                    1
                ]
            },
            {
                "id": 14,
                "name": "RBAC/asset",
                "assignments": [
                    3
                ]
            }
        ],
    }
};

const { nodes: initialNodes, edges: initialEdges } = jsonToGraph(initialGraphJson);

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    return layoutPCOAONodes(nodes, edges);
};

// Helper function to convert DAG Node to TreeNode for AssociationModal
const dagNodeToTreeNode = (dagNode: Node): TreeNode => {
    return {
        id: crypto.randomUUID(),
        pmId: dagNode.id,
        name: dagNode.data.name,
        type: dagNode.data.type,
        properties: {},
        children: [],
        expanded: false,
        selected: false,
    };
};

// Custom layout function for all PM nodes following hierarchical rules.
//
// Rules:
// - Policy classes (PCs) are stacked vertically in the center column, sorted by how many
//   nodes can reach them (most-reaching PC on top).
// - UA/U nodes are laid out to the left, OA/O nodes to the right.
// - A node is positioned above every PC it has a path to. Since PCs are stacked in
//   reach-count order, it's enough to place a node in the band of the highest (smallest
//   index) PC it can reach - that band is already above every other PC it reaches.
// - "Path to a PC" follows both assignment edges (child -> parent) and association edges
//   (UA -> target), since both move a node "up" toward a policy class. UAs can assign
//   straight to a PC, or reach one indirectly via an association into the object side.
function layoutPCOAONodes(nodes: Node[], edges: Edge[]) {
    const filteredNodes = nodes.filter(
        (node) =>
            node.data.type === NodeType.PC ||
            node.data.type === NodeType.UA ||
            node.data.type === NodeType.OA ||
            node.data.type === NodeType.U ||
            node.data.type === NodeType.O
    );

    if (filteredNodes.length === 0) {
        return { nodes, edges };
    }

    const PC_X = 0; // PCs aligned at x=0 (center)
    const LEVEL_SPACING = 250; // Horizontal spacing between levels
    const NODE_SPACING_Y = 60; // Vertical spacing between nodes in the same level column
    const BAND_MARGIN = 100; // Extra vertical gap between PC bands

    const pcNodes = filteredNodes.filter((node) => node.data.type === NodeType.PC);
    const otherNodes = filteredNodes.filter((node) => node.data.type !== NodeType.PC);
    const pcIdSet = new Set(pcNodes.map((pc) => pc.id));

    const estimateNodeWidth = (nodeName: string, _nodeType: string): number => {
        const baseWidth = 40;
        const charWidth = 8;
        const iconWidth = 14;
        return baseWidth + iconWidth + nodeName.length * charWidth;
    };

    // "Ascend" adjacency: assignment edges (child -> parent) and association edges
    // (UA -> target) both move a node toward a PC.
    const ascendTargets = new Map<string, string[]>();
    filteredNodes.forEach((n) => ascendTargets.set(n.id, []));
    edges.forEach((edge) => {
        const edgeType = edge.data?.edgeType;
        if ((edgeType === 'assignment' || edgeType === 'association') && ascendTargets.has(edge.source)) {
            ascendTargets.get(edge.source)!.push(edge.target);
        }
    });

    // BFS from a node along ascend edges, returning the minimum hop count to each reachable PC.
    const reachablePCs = (startId: string): Map<string, number> => {
        const result = new Map<string, number>();
        const visited = new Set<string>([startId]);
        const queue: Array<{ id: string; dist: number }> = [{ id: startId, dist: 0 }];

        while (queue.length > 0) {
            const { id, dist } = queue.shift()!;
            if (pcIdSet.has(id) && id !== startId) {
                result.set(id, dist);
                continue; // PCs have no outgoing ascend edges, but skip just in case
            }
            (ascendTargets.get(id) || []).forEach((nextId) => {
                if (!visited.has(nextId)) {
                    visited.add(nextId);
                    queue.push({ id: nextId, dist: dist + 1 });
                }
            });
        }

        return result;
    };

    const nodeReach = new Map<string, Map<string, number>>();
    otherNodes.forEach((n) => nodeReach.set(n.id, reachablePCs(n.id)));

    // Sort PCs by how many nodes can reach them, descending (most-reaching PC = band 0 = top).
    const pcReachCount = new Map<string, number>(pcNodes.map((pc) => [pc.id, 0]));
    otherNodes.forEach((n) => {
        nodeReach.get(n.id)!.forEach((_dist, pcId) => {
            pcReachCount.set(pcId, (pcReachCount.get(pcId) || 0) + 1);
        });
    });

    const sortedPCs = [...pcNodes].sort(
        (a, b) => (pcReachCount.get(b.id) || 0) - (pcReachCount.get(a.id) || 0)
    );
    const pcBandIndex = new Map<string, number>(sortedPCs.map((pc, idx) => [pc.id, idx]));

    // Assign each non-PC node to the band of the topmost PC it can reach, and record its
    // hop distance to that specific PC (used for the level/column it's placed in).
    const nodeBand = new Map<string, number | null>();
    const nodeLevel = new Map<string, number>();
    otherNodes.forEach((n) => {
        const reach = nodeReach.get(n.id)!;
        if (reach.size === 0) {
            nodeBand.set(n.id, null);
            return;
        }
        let bestBand = Infinity;
        let bestDist = 0;
        reach.forEach((dist, pcId) => {
            const band = pcBandIndex.get(pcId)!;
            if (band < bestBand) {
                bestBand = band;
                bestDist = dist;
            }
        });
        nodeBand.set(n.id, bestBand);
        nodeLevel.set(n.id, bestDist);
    });

    const isUserSide = (type: string) => type === NodeType.UA || type === NodeType.U;
    const isObjectSide = (type: string) => type === NodeType.OA || type === NodeType.O;
    const sideOf = (type: string) => (isUserSide(type) ? 'user' : isObjectSide(type) ? 'object' : null);

    const nodeById = new Map<string, Node>(filteredNodes.map((n) => [n.id, n]));

    // Each node attaches under a single "parent" one hop closer to its chosen PC, forming a
    // tree per band/side rooted at the PC (nodes at level 1 attach directly under it). Only a
    // same-side neighbor counts as a parent - e.g. a UA whose only ascend step is an association
    // into an OA has no user-side parent to nest under, so it attaches directly under the root.
    const nodeParent = new Map<string, string | null>();
    otherNodes.forEach((n) => {
        const band = nodeBand.get(n.id);
        if (band == null) {return;}
        const level = nodeLevel.get(n.id) ?? 1;
        if (level <= 1) {
            nodeParent.set(n.id, null);
            return;
        }
        const chosenPCId = sortedPCs[band].id;
        const side = sideOf(n.data.type);
        const neighbors = ascendTargets.get(n.id) || [];
        const parentId = neighbors.find((neighborId) => {
            const neighborNode = nodeById.get(neighborId);
            if (!neighborNode || sideOf(neighborNode.data.type) !== side) {return false;}
            return nodeReach.get(neighborId)?.get(chosenPCId) === level - 1;
        });
        nodeParent.set(n.id, parentId ?? null);
    });

    const bandSideNodes: Array<{ user: Node[]; object: Node[] }> = sortedPCs.map(() => ({
        user: [],
        object: [],
    }));
    otherNodes.forEach((n) => {
        const band = nodeBand.get(n.id);
        if (band == null) {return;}
        if (isUserSide(n.data.type)) {
            bandSideNodes[band].user.push(n);
        } else if (isObjectSide(n.data.type)) {
            bandSideNodes[band].object.push(n);
        }
    });

    // Walk a band/side as a forest in DFS pre-order from the PC, so each node's row continues
    // from its parent's instead of every level starting at the same height. This produces a
    // cascading "staircase": a node's children appear directly under it, one column further out.
    const orderForestRows = (sideNodes: Node[]): Map<string, number> => {
        const childrenOf = new Map<string, Node[]>(); // key: parent id, or 'root'
        sideNodes.forEach((n) => {
            const key = nodeParent.get(n.id) ?? 'root';
            if (!childrenOf.has(key)) {childrenOf.set(key, []);}
            childrenOf.get(key)!.push(n);
        });

        const rows = new Map<string, number>();
        let counter = 0;
        const visit = (key: string) => {
            (childrenOf.get(key) || []).forEach((child) => {
                counter += 1;
                rows.set(child.id, counter);
                visit(child.id);
            });
        };
        visit('root');
        return rows;
    };

    // Pass 1: each band needs enough vertical room for the longer of its two sides, so bands
    // can be stacked top-to-bottom without overlapping.
    const pcRowY: number[] = [];
    let cumulativeY = 0;
    sortedPCs.forEach((_pc, bandIdx) => {
        pcRowY[bandIdx] = cumulativeY;
        const { user, object } = bandSideNodes[bandIdx];
        const reservedHeight = (Math.max(user.length, object.length) + 1) * NODE_SPACING_Y;
        cumulativeY += reservedHeight + BAND_MARGIN;
    });

    // Pass 2: assign actual positions.
    const layoutedNodes = [...nodes];
    const setPosition = (id: string, x: number, y: number) => {
        const idx = layoutedNodes.findIndex((n) => n.id === id);
        if (idx !== -1) {
            layoutedNodes[idx].position = { x, y };
        }
    };

    sortedPCs.forEach((pc, bandIdx) => {
        const y = pcRowY[bandIdx];
        const nodeWidth = estimateNodeWidth(pc.data.name, pc.data.type);
        setPosition(pc.id, PC_X - nodeWidth / 2, y);

        const { user, object } = bandSideNodes[bandIdx];

        const userRows = orderForestRows(user);
        user.forEach((node) => {
            const level = nodeLevel.get(node.id) ?? 1;
            const row = userRows.get(node.id) ?? 1;
            const width = estimateNodeWidth(node.data.name, node.data.type);
            setPosition(node.id, PC_X - level * LEVEL_SPACING - width, y - row * NODE_SPACING_Y);
        });

        const objectRows = orderForestRows(object);
        object.forEach((node) => {
            const level = nodeLevel.get(node.id) ?? 1;
            const row = objectRows.get(node.id) ?? 1;
            setPosition(node.id, PC_X + level * LEVEL_SPACING, y - row * NODE_SPACING_Y);
        });
    });

    // Nodes with no assignment or association at all have no PC to anchor to. Line each one
    // up in the same column its type normally occupies (the level most other nodes of that
    // type sit at), but keep them in their own row below all bands so they aren't mistaken
    // for belonging to a particular PC.
    const typicalLevelByType = new Map<string, number>();
    [NodeType.UA, NodeType.U, NodeType.OA, NodeType.O].forEach((type) => {
        const levelCounts = new Map<number, number>();
        otherNodes.forEach((n) => {
            if (n.data.type !== type || nodeBand.get(n.id) == null) {return;}
            const level = nodeLevel.get(n.id);
            if (level === undefined) {return;}
            levelCounts.set(level, (levelCounts.get(level) || 0) + 1);
        });
        let bestLevel = 1;
        let bestCount = -1;
        levelCounts.forEach((count, level) => {
            if (count > bestCount || (count === bestCount && level < bestLevel)) {
                bestCount = count;
                bestLevel = level;
            }
        });
        typicalLevelByType.set(type, bestLevel);
    });

    const groupOrphansByLevel = (orphanList: Node[]) => {
        const groups = new Map<number, Node[]>();
        orphanList.forEach((n) => {
            const level = typicalLevelByType.get(n.data.type) ?? 1;
            if (!groups.has(level)) {groups.set(level, []);}
            groups.get(level)!.push(n);
        });
        return groups;
    };

    const orphanNodes = otherNodes.filter((n) => nodeBand.get(n.id) == null);
    const orphanUserGroups = groupOrphansByLevel(orphanNodes.filter((n) => isUserSide(n.data.type)));
    const orphanObjectGroups = groupOrphansByLevel(orphanNodes.filter((n) => isObjectSide(n.data.type)));
    const orphanBaseY = cumulativeY + BAND_MARGIN;

    orphanUserGroups.forEach((levelNodes, level) => {
        const x = PC_X - level * LEVEL_SPACING;
        levelNodes.forEach((node, idx) => {
            const width = estimateNodeWidth(node.data.name, node.data.type);
            setPosition(node.id, x - width, orphanBaseY + idx * NODE_SPACING_Y);
        });
    });

    orphanObjectGroups.forEach((levelNodes, level) => {
        const x = PC_X + level * LEVEL_SPACING;
        levelNodes.forEach((node, idx) => {
            setPosition(node.id, x, orphanBaseY + idx * NODE_SPACING_Y);
        });
    });

    return { nodes: layoutedNodes, edges };
}

function DAGContent() {
    const { themeMode, toggleTheme } = useTheme();
    const mantineTheme = useMantineTheme();

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newNodeName, setNewNodeName] = useState('');
    const [newNodeType, setNewNodeType] = useState<NodeType>(NodeType.PC);
    const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null);
    const [connectingHandleType, setConnectingHandleType] = useState<
        'assignment' | 'association' | null
    >(null);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [highlightType, setHighlightType] = useState<'user' | 'object' | null>(null);
    const { screenToFlowPosition, fitView } = useReactFlow();

    // Association modal state
    const [associationModalOpen, setAssociationModalOpen] = useState(false);
    const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);

    // Context menu and inline creation state
    const [contextMenuOpened, setContextMenuOpened] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
    const [downloadMenuOpened, setDownloadMenuOpened] = useState(false);
    const [jsonModalOpened, setJsonModalOpened] = useState(false);
    const [inlineTextBox, setInlineTextBox] = useState<{
        visible: boolean;
        screenPosition: { x: number; y: number }; // Screen position for text input
        flowPosition: { x: number; y: number }; // Flow position for node creation
        nodeType: NodeType;
    }>({
        visible: false,
        screenPosition: { x: 0, y: 0 },
        flowPosition: { x: 0, y: 0 },
        nodeType: NodeType.PC,
    });
    const [inlineText, setInlineText] = useState('');
    const inlineInputRef = useRef<HTMLInputElement>(null);
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const downloadMenuRef = useRef<HTMLDivElement>(null);
    const [jsonEditValue, setJsonEditValue] = useState('');
    const [jsonError, setJsonError] = useState<string | null>(null);

    const formatGraph = useCallback(
        (nodesToFormat: Node[], edgesToUse: Edge[]) => {
            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
                nodesToFormat,
                edgesToUse
            );
            setNodes([...layoutedNodes]);
            setEdges([...layoutedEdges]);

            // Longer delay and more padding to ensure proper fit
            setTimeout(() => fitView({ padding: 0.3 }), 300);
        },
        [setNodes, setEdges, fitView]
    );

    // Format graph only on initial load
    useEffect(() => {
        if (initialNodes.length > 0) {
            formatGraph(initialNodes, initialEdges);
            // Ensure fit view happens after formatting
            setTimeout(() => {
                fitView({ padding: 0.3 });
            }, 400);
        }
    }, [formatGraph, fitView]); // Empty dependency array ensures this only runs once on mount

    const onConnectStart = useCallback(
        (event: React.MouseEvent | React.TouchEvent, params: OnConnectStartParams) => {
            setConnectingNodeId(params.nodeId || null);

            // Determine handle type from the handleId
            if (params.handleId?.includes('assignment')) {
                setConnectingHandleType('assignment');
            } else if (params.handleId?.includes('association')) {
                setConnectingHandleType('association');
            }

            // Hide incompatible handles
            const handleClass = params.handleId?.includes('assignment') ? 'assignment' : 'association';
            const oppositeClass = handleClass === 'assignment' ? 'association' : 'assignment';

            // Show only compatible target handles
            document.querySelectorAll(`.handle.${oppositeClass}-in`).forEach((handle) => {
                (handle as HTMLElement).style.opacity = '0.3';
            });
            document.querySelectorAll(`.handle.${handleClass}-in`).forEach((handle) => {
                (handle as HTMLElement).style.opacity = '1';
            });
        },
        []
    );

    const onConnectEnd = useCallback((event: MouseEvent | TouchEvent) => {
        setConnectingNodeId(null);
        setConnectingHandleType(null);

        // Reset all handle visibility
        document.querySelectorAll('.handle').forEach((handle) => {
            (handle as HTMLElement).style.opacity = '1';
        });
    }, []);

    const onConnect = useCallback(
        (params: Connection) => {
            // Validate connection compatibility
            const sourceIsAssignment = params.sourceHandle?.includes('assignment');
            const targetIsAssignment = params.targetHandle?.includes('assignment');
            const sourceIsAssociation = params.sourceHandle?.includes('association');
            const targetIsAssociation = params.targetHandle?.includes('association');

            // Prevent mixed connections
            if (
                (sourceIsAssignment && !targetIsAssignment) ||
                (sourceIsAssociation && !targetIsAssociation) ||
                (!sourceIsAssignment && targetIsAssignment) ||
                (!sourceIsAssociation && targetIsAssociation)
            ) {
                console.warn(
                    'Invalid connection: Assignment handles can only connect to assignment handles, and association handles can only connect to association handles'
                );
                return;
            }

            // Determine edge type based on handles
            let edgeType: 'assignment' | 'association' = 'assignment';

            if (
                params.sourceHandle?.includes('association') ||
                params.targetHandle?.includes('association')
            ) {
                edgeType = 'association';
            }

            // Additional validation for assignment edges using Policy Machine rules
            if (edgeType === 'assignment') {
                const sourceNode = nodes.find((n) => n.id === params.source);
                const targetNode = nodes.find((n) => n.id === params.target);

                if (sourceNode && targetNode) {
                    if (!isValidAssignment(sourceNode.data.type, targetNode.data.type)) {
                        console.warn(
                            `Invalid assignment: ${sourceNode.data.type} (${sourceNode.data.name}) cannot be assigned to ${targetNode.data.type} (${targetNode.data.name})`
                        );
                        return;
                    }
                }
            }

            // For association edges, show modal to select access rights
            if (edgeType === 'association') {
                setPendingConnection(params);
                setAssociationModalOpen(true);
                return;
            }

            // For assignment edges, create directly
            const sourceNode = nodes.find((n) => n.id === params.source);
            const targetNode = nodes.find((n) => n.id === params.target);

            const newEdge = {
                ...params,
                type: getEdgeType(edgeType),
                data: {
                    edgeType,
                    sourceNodeType: sourceNode?.data.type,
                    targetNodeType: targetNode?.data.type,
                },
                style: getEdgeStyle(edgeType, false, false),
                markerEnd: getMarkerEnd(edgeType, false, false),
            };

            setEdges((eds) => addEdge(newEdge, eds));
        },
        [setEdges, nodes]
    );

    // Handle association modal submission
    const handleAssociationModalSubmit = useCallback(
        (accessRights: string[]) => {
            if (!pendingConnection) {return;}

            const accessRightsLabel = accessRights.length > 0 ? accessRights.join(', ') : '';
            const sourceNode = nodes.find((n) => n.id === pendingConnection.source);
            const targetNode = nodes.find((n) => n.id === pendingConnection.target);

            const newEdge = {
                ...pendingConnection,
                type: getEdgeType('association'),
                data: {
                    edgeType: 'association' as const,
                    accessRights: accessRightsLabel,
                    sourceNodeType: sourceNode?.data.type,
                    targetNodeType: targetNode?.data.type,
                },
                style: getEdgeStyle('association', false, false),
                markerEnd: getMarkerEnd('association', false, false),
            };

            setEdges((eds) => addEdge(newEdge, eds));
            setPendingConnection(null);
            setAssociationModalOpen(false);
        },
        [pendingConnection, setEdges, nodes]
    );

    // Handle association modal close
    const handleAssociationModalClose = useCallback(() => {
        setPendingConnection(null);
        setAssociationModalOpen(false);
    }, []);

    const addNode = useCallback(() => {
        const newNode: Node = {
            id: `${Date.now()}`, // Use timestamp for unique ID
            type: 'dagNode',
            position: {
                x: Math.random() * 400 + 50,
                y: Math.random() * 400 + 50,
            },
            data: {
                name: newNodeName || `${newNodeType} ${nodes.length + 1}`,
                type: newNodeType,
            },
        };
        setNodes((nds) => nds.concat(newNode));
        setIsModalOpen(false);
        setNewNodeName('');
        setNewNodeType(NodeType.PC);
    }, [nodes.length, newNodeName, newNodeType, setNodes]);

    const clearGraph = useCallback(() => {
        setNodes([]);
        setEdges([]);
    }, [setNodes, setEdges]);

    const deleteAllNodes = useCallback(() => {
        setNodes([]);
        setEdges([]);
    }, [setNodes, setEdges]);

    const resetGraph = useCallback(() => {
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [setNodes, setEdges]);

    // Handle node click to highlight outgoing paths with specific logic for U/UA and O/OA nodes
    const onNodeClick = useCallback(
        (event: React.MouseEvent, node: Node) => {
            event.stopPropagation();
            // Toggle selection - if same node clicked again, deselect
            const newSelectedNodeId = selectedNodeId === node.id ? null : node.id;
            setSelectedNodeId(newSelectedNodeId);

            if (!newSelectedNodeId) {
                // Clear all highlighting
                setHighlightType(null);
                setEdges((currentEdges) => {
                    return currentEdges.map((edge) => ({
                        ...edge,
                        style: getEdgeStyle(edge.data?.edgeType || 'assignment', false, false),
                        markerEnd: getMarkerEnd(edge.data?.edgeType || 'assignment', false, false),
                    }));
                });
                setNodes((currentNodes) => {
                    return currentNodes.map((n) => ({
                        ...n,
                        data: {
                            ...n.data,
                            isHighlighted: false,
                        },
                    }));
                });
                return;
            }

            const startingNodeType = nodes.find((n) => n.id === newSelectedNodeId)?.data.type;
            const visitedNodes = new Set<string>();
            const highlightedEdges = new Set<string>();
            const associationEdges = new Set<string>();

            visitedNodes.add(newSelectedNodeId);

            if (startingNodeType === NodeType.U || startingNodeType === NodeType.UA) {
                // User node logic: highlight outgoing paths until association edge, including association targets
                const queue: string[] = [newSelectedNodeId];

                while (queue.length > 0) {
                    const currentNodeId = queue.shift()!;
                    const outgoingEdges = edges.filter((edge) => edge.source === currentNodeId);

                    outgoingEdges.forEach((edge) => {
                        highlightedEdges.add(edge.id);

                        if (edge.data?.edgeType === 'association') {
                            associationEdges.add(edge.id);
                            // Add association target but don't continue from it
                            if (!visitedNodes.has(edge.target)) {
                                visitedNodes.add(edge.target);
                            }
                        } else {
                            // Assignment edge - continue traversal
                            if (!visitedNodes.has(edge.target)) {
                                visitedNodes.add(edge.target);
                                queue.push(edge.target);
                            }
                        }
                    });
                }
            } else if (startingNodeType === NodeType.O || startingNodeType === NodeType.OA) {
                // Object node logic: highlight outgoing paths that terminate at PC nodes
                const queue: string[] = [newSelectedNodeId];

                while (queue.length > 0) {
                    const currentNodeId = queue.shift()!;
                    const outgoingEdges = edges.filter((edge) => edge.source === currentNodeId);

                    outgoingEdges.forEach((edge) => {
                        const targetNode = nodes.find((n) => n.id === edge.target);

                        if (targetNode?.data.type === NodeType.PC) {
                            // This path terminates at a PC - highlight this edge and target
                            highlightedEdges.add(edge.id);
                            if (!visitedNodes.has(edge.target)) {
                                visitedNodes.add(edge.target);
                            }
                        } else {
                            // Continue traversal for non-PC targets
                            highlightedEdges.add(edge.id);
                            if (!visitedNodes.has(edge.target)) {
                                visitedNodes.add(edge.target);
                                queue.push(edge.target);
                            }
                        }
                    });
                }
            }

            // Determine highlight type based on starting node type
            const isUserNode = startingNodeType === NodeType.U || startingNodeType === NodeType.UA;
            const isObjectNode = startingNodeType === NodeType.O || startingNodeType === NodeType.OA;

            // Set highlight type for background color
            setHighlightType(isUserNode ? 'user' : isObjectNode ? 'object' : null);

            // Update edges with highlighting - keep original colors but add outline effect via filter
            setEdges((currentEdges) => {
                return currentEdges.map((edge) => {
                    const isHighlighted = highlightedEdges.has(edge.id);
                    const isAssociation = associationEdges.has(edge.id);

                    if (isHighlighted) {
                        const outlineColor = isUserNode ? mantineTheme.colors.red[7] : mantineTheme.colors.blue[7];

                        // For association edges, keep green color and add green outline
                        if (isAssociation) {
                            const greenOutline = mantineTheme.colors.green[7];
                            return {
                                ...edge,
                                style: {
                                    ...getEdgeStyle(edge.data?.edgeType || 'assignment', false, false),
                                    filter: `drop-shadow(0 0 2px ${greenOutline}) drop-shadow(0 0 4px ${greenOutline})`, // Add green outline glow
                                },
                                markerEnd: getMarkerEnd(edge.data?.edgeType || 'assignment', false, false),
                            };
                        }

                        // For assignment edges, keep black color but add outline
                        return {
                            ...edge,
                            style: {
                                ...getEdgeStyle(edge.data?.edgeType || 'assignment', false, false),
                                filter: `drop-shadow(0 0 2px ${outlineColor}) drop-shadow(0 0 4px ${outlineColor})`, // Add outline glow
                            },
                            markerEnd: getMarkerEnd(edge.data?.edgeType || 'assignment', false, false),
                        };
                    }

                    // Non-highlighted edges stay normal
                    return {
                        ...edge,
                        style: getEdgeStyle(edge.data?.edgeType || 'assignment', false, false),
                        markerEnd: getMarkerEnd(edge.data?.edgeType || 'assignment', false, false),
                    };
                });
            });

            // Update nodes with highlighting using appropriate color
            setNodes((currentNodes) => {
                return currentNodes.map((n) => ({
                    ...n,
                    data: {
                        ...n.data,
                        isHighlighted: visitedNodes.has(n.id),
                    },
                }));
            });
        },
        [selectedNodeId, setEdges, setNodes, edges, nodes]
    );

    // Handle right-click on canvas
    const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
        event.preventDefault();
        setContextMenuPosition({ x: event.clientX, y: event.clientY });
        setContextMenuOpened(true);
        // Hide inline text box if visible
        setInlineTextBox({
            visible: false,
            screenPosition: { x: 0, y: 0 },
            flowPosition: { x: 0, y: 0 },
            nodeType: NodeType.PC,
        });
    }, []);

    // Handle node type selection from context menu
    const handleNodeTypeSelect = useCallback(
        (nodeType: NodeType, event: React.MouseEvent) => {
            setContextMenuOpened(false);

            // Convert screen coordinates to ReactFlow coordinates
            const flowPosition = screenToFlowPosition({
                x: contextMenuPosition.x,
                y: contextMenuPosition.y,
            });

            // Get screen position relative to the ReactFlow container for text input
            const reactFlowBounds = document.querySelector('.react-flow__pane')?.getBoundingClientRect();
            const screenPosition = reactFlowBounds
                ? {
                    x: contextMenuPosition.x - reactFlowBounds.left,
                    y: contextMenuPosition.y - reactFlowBounds.top,
                }
                : { x: 0, y: 0 };

            setInlineTextBox({
                visible: true,
                screenPosition,
                flowPosition,
                nodeType,
            });
            setInlineText('');

            // Focus the input after a brief delay to ensure it's rendered
            setTimeout(() => {
                inlineInputRef.current?.focus();
            }, 10);
        },
        [contextMenuPosition, screenToFlowPosition]
    );

    // Handle inline text input
    const handleInlineKeyDown = useCallback(
        (event: React.KeyboardEvent) => {
            if (event.key === 'Enter') {
                if (inlineText.trim()) {
                    // Create node at the inline text box position
                    const newNode: Node = {
                        id: `${Date.now()}`,
                        type: 'dagNode',
                        position: {
                            x: inlineTextBox.flowPosition.x - 40, // Center the node on the click position
                            y: inlineTextBox.flowPosition.y - 20,
                        },
                        data: {
                            name: inlineText.trim(),
                            type: inlineTextBox.nodeType,
                        },
                    };
                    setNodes((nds) => nds.concat(newNode));
                }

                // Hide the text box
                setInlineTextBox({
                    visible: false,
                    screenPosition: { x: 0, y: 0 },
                    flowPosition: { x: 0, y: 0 },
                    nodeType: NodeType.PC,
                });
                setInlineText('');
            } else if (event.key === 'Escape') {
                // Cancel creation
                setInlineTextBox({
                    visible: false,
                    screenPosition: { x: 0, y: 0 },
                    flowPosition: { x: 0, y: 0 },
                    nodeType: NodeType.PC,
                });
                setInlineText('');
            }
        },
        [inlineText, inlineTextBox, setNodes]
    );

    // Handle clicks outside the inline text box and context menu
    const handlePaneClick = useCallback(() => {
        if (inlineTextBox.visible) {
            setInlineTextBox({
                visible: false,
                screenPosition: { x: 0, y: 0 },
                flowPosition: { x: 0, y: 0 },
                nodeType: NodeType.PC,
            });
            setInlineText('');
        }

        // Close context menu if it's open
        if (contextMenuOpened) {
            setContextMenuOpened(false);
        }

        // Close download menu if it's open
        if (downloadMenuOpened) {
            setDownloadMenuOpened(false);
        }

        // Clear node selection and reset edge highlighting
        if (selectedNodeId) {
            setSelectedNodeId(null);
            setHighlightType(null);
            setEdges((currentEdges) => {
                return currentEdges.map((edge) => ({
                    ...edge,
                    style: getEdgeStyle(edge.data?.edgeType || 'assignment', false, false),
                    markerEnd: getMarkerEnd(edge.data?.edgeType || 'assignment', false, false),
                }));
            });
            setNodes((currentNodes) => {
                return currentNodes.map((n) => ({
                    ...n,
                    data: {
                        ...n.data,
                        isHighlighted: false,
                    },
                }));
            });
        }
    }, [
        inlineTextBox.visible,
        contextMenuOpened,
        downloadMenuOpened,
        selectedNodeId,
        setEdges,
        setNodes,
    ]);

    // Handle clicks outside download menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                downloadMenuRef.current &&
                event.target &&
                !downloadMenuRef.current.contains(event.target as Element)
            ) {
                setDownloadMenuOpened(false);
            }
        };

        if (downloadMenuOpened) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [downloadMenuOpened]);

    // Download image functionality following ReactFlow best practices
    const downloadImage = useCallback((format: 'png' | 'jpeg' | 'svg') => {
        if (nodes.length === 0) {
            console.warn('No nodes to export');
            return;
        }


        // Use ReactFlow's getRectOfNodes to get proper bounds
        const nodesBounds = getRectOfNodes(nodes);

        // Calculate image dimensions with padding
        const padding = 0.1; // 10% padding
        const imageWidth = nodesBounds.width * (1 + padding * 2);
        const imageHeight = nodesBounds.height * (1 + padding * 2);

        // Calculate transform to center and fit the nodes
        const transform = getTransformForBounds(
            nodesBounds,
            imageWidth,
            imageHeight,
            0.5, // minZoom
            2,   // maxZoom
            padding
        );

        let downloadFunction;
        let fileExtension;

        switch (format) {
            case 'png':
                downloadFunction = toPng;
                fileExtension = 'png';
                break;
            case 'jpeg':
                downloadFunction = toJpeg;
                fileExtension = 'jpg';
                break;
            case 'svg':
                downloadFunction = toSvg;
                fileExtension = 'svg';
                break;
            default:
                downloadFunction = toPng;
                fileExtension = 'png';
        }

        const viewport = document.querySelector('.react-flow__viewport') as HTMLElement;

        downloadFunction(viewport, {
            backgroundColor: 'transparent',
            width: imageWidth,
            height: imageHeight,
            style: {
                width: `${imageWidth}px`,
                height: `${imageHeight}px`,
                transform: `translate(${transform[0]}px, ${transform[1]}px) scale(${transform[2]})`,
            },
            filter: (node) => {
                // Filter out handle elements
                if (node.classList && node.classList.contains('react-flow__handle')) {
                    return false;
                }
                return true;
            },
        }).then((dataUrl) => {
            const link = document.createElement('a');
            link.download = `dag-graph.${fileExtension}`;
            link.href = dataUrl;
            link.click();
        }).catch((err) => {
            console.error('Error downloading image:', err);
        });
    }, [nodes]);

    useEffect(() => {
        if (jsonModalOpened) {
            setJsonEditValue(graphToJson(nodes, edges));
            setJsonError(null);
        }
    }, [jsonModalOpened]);

    return (
        <AppShell
            header={{ height: 0 }}
            transitionDuration={0}
        >
            <AppShell.Main style={{height: "100vh", overflow: "auto"}}>
                <Stack gap={0} style={{ height: '100%' }}>
                    {/* Toolbar */}
                    <Box style={{
                        height: 60,
                        borderBottom: '1px solid var(--mantine-color-gray-3)',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: '16px',
                        paddingRight: '16px',
                        backgroundColor: 'white'
                    }}>
                        <Group gap="md" align="center">
                            <Stack gap={2} align="left">
                                <Text size="xs" c="dimmed" fw={500}>
                                    DAG Actions
                                </Text>
                                <Group gap="xs">
                                    <ActionIcon
                                        variant="subtle"
                                        size="md"
                                        onClick={() => setDownloadMenuOpened(true)}
                                        title="Download Image"
                                    >
                                        <IconCamera size={20} />
                                    </ActionIcon>
                                    <ActionIcon
                                        variant="subtle"
                                        size="md"
                                        onClick={() => setJsonModalOpened(true)}
                                        title="View Graph JSON"
                                    >
                                        <IconJson size={20} />
                                    </ActionIcon>
                                    <ActionIcon
                                        variant="subtle"
                                        size="md"
                                        onClick={() => formatGraph(nodes, edges)}
                                        title="Format Graph"
                                    >
                                        <IconSitemap size={20} />
                                    </ActionIcon>
                                    <ActionIcon
                                        variant="subtle"
                                        size="md"
                                        onClick={deleteAllNodes}
                                        title="Delete All Nodes"
                                        color="red"
                                    >
                                        <IconTrash size={20} />
                                    </ActionIcon>
                                </Group>
                            </Stack>
                        </Group>
                    </Box>

                    {/* ReactFlow Canvas */}
                    <Paper shadow="sm" radius="md" style={{ height: 'calc(100% - 60px)', position: 'relative' }}>
                        <div ref={reactFlowWrapper} style={{ width: '100%', height: '100%' }}>
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                onConnect={onConnect}
                                onConnectStart={onConnectStart}
                                onConnectEnd={onConnectEnd}
                                onNodeClick={onNodeClick}
                                onPaneContextMenu={onPaneContextMenu}
                                onPaneClick={handlePaneClick}
                                nodeTypes={nodeTypes}
                                edgeTypes={edgeTypes}
                                connectionMode={ConnectionMode.Loose}
                                fitView
                                style={{
                                    backgroundColor: 'var(--mantine-color-gray-0)',
                                }}
                            >
                                <Controls />
                                <MiniMap
                                    position="bottom-right"
                                    style={{
                                        backgroundColor: 'var(--mantine-color-gray-1)',
                                    }}
                                    nodeColor={(node) => {
                                        // Static color mapping to match getTypeColor function
                                        const type = node.data?.type || NodeType.PC;
                                        return getNodeTypeColorFromTheme(type);
                                    }}
                                />
                                <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
                            </ReactFlow>

                            {/* Download Menu positioned next to toolbar download button */}
                            {downloadMenuOpened && (
                                <div
                                    ref={downloadMenuRef}
                                    style={{
                                        position: 'absolute',
                                        top: 120, // Position below the toolbar
                                        left: 20, // Align with the toolbar buttons
                                        zIndex: 1000,
                                        background: 'white',
                                        border: '1px solid var(--mantine-color-gray-4)',
                                        borderRadius: '4px',
                                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                                        padding: '8px',
                                        minWidth: '150px',
                                    }}
                                    onClick={(e) => e.stopPropagation()} // Prevent menu from closing when clicking inside it
                                >
                                    <div
                                        style={{
                                            marginBottom: '8px',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            color: 'var(--mantine-color-gray-7)',
                                        }}
                                    >
                                        Download Graph Image
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <button
                                            onClick={() => {
                                                downloadImage('png');
                                                setDownloadMenuOpened(false);
                                            }}
                                            style={{
                                                padding: '6px 8px',
                                                border: 'none',
                                                background: 'transparent',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                textAlign: 'left',
                                                borderRadius: '2px',
                                                transition: 'background-color 0.1s',
                                            }}
                                            onMouseEnter={(e) =>
                                                (e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-1)')
                                            }
                                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                        >
                                            PNG Image
                                        </button>
                                        <button
                                            onClick={() => {
                                                downloadImage('jpeg');
                                                setDownloadMenuOpened(false);
                                            }}
                                            style={{
                                                padding: '6px 8px',
                                                border: 'none',
                                                background: 'transparent',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                textAlign: 'left',
                                                borderRadius: '2px',
                                                transition: 'background-color 0.1s',
                                            }}
                                            onMouseEnter={(e) =>
                                                (e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-1)')
                                            }
                                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                        >
                                            JPEG Image
                                        </button>
                                        <button
                                            onClick={() => {
                                                downloadImage('svg');
                                                setDownloadMenuOpened(false);
                                            }}
                                            style={{
                                                padding: '6px 8px',
                                                border: 'none',
                                                background: 'transparent',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                textAlign: 'left',
                                                borderRadius: '2px',
                                                transition: 'background-color 0.1s',
                                            }}
                                            onMouseEnter={(e) =>
                                                (e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-1)')
                                            }
                                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                        >
                                            SVG Vector
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Inline text input for node creation */}
                        {inlineTextBox.visible && (
                            <div
                                style={{
                                    position: 'absolute',
                                    left: inlineTextBox.screenPosition.x,
                                    top: inlineTextBox.screenPosition.y,
                                    zIndex: 1000,
                                    pointerEvents: 'auto',
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <TextInput
                                    ref={inlineInputRef}
                                    value={inlineText}
                                    onChange={(event) => setInlineText(event.currentTarget.value)}
                                    onKeyDown={handleInlineKeyDown}
                                    placeholder={`Enter ${inlineTextBox.nodeType} name`}
                                    size="xs"
                                    style={{
                                        width: 150,
                                        background: 'white',
                                        border: `2px solid ${getNodeTypeColorFromTheme(inlineTextBox.nodeType)}`,
                                        borderRadius: 4,
                                    }}
                                    styles={{
                                        input: {
                                            fontSize: '12px',
                                            padding: '4px 8px',
                                        },
                                    }}
                                />
                            </div>
                        )}
                    </Paper>
                </Stack>

                {/* Context Menu for Right-Click Node Creation */}
                <Menu
                    opened={contextMenuOpened}
                    onClose={() => setContextMenuOpened(false)}
                    position="bottom-start"
                    shadow="md"
                    withinPortal
                    styles={{
                        dropdown: {
                            position: 'fixed',
                            left: contextMenuPosition.x,
                            top: contextMenuPosition.y,
                            zIndex: 9999,
                        },
                    }}
                >
                    <Menu.Target>
                        <div style={{ display: 'none' }} />
                    </Menu.Target>
                    <Menu.Dropdown>
                        <Menu.Label>Create Node</Menu.Label>
                        <Menu.Item
                            leftSection={<NodeIcon type={NodeType.PC} />}
                            onClick={(e) => handleNodeTypeSelect(NodeType.PC, e)}
                        >
                            Policy Class (PC)
                        </Menu.Item>
                        <Menu.Item
                            leftSection={<NodeIcon type={NodeType.UA} />}
                            onClick={(e) => handleNodeTypeSelect(NodeType.UA, e)}
                        >
                            User Attribute (UA)
                        </Menu.Item>
                        <Menu.Item
                            leftSection={<NodeIcon type={NodeType.OA} />}
                            onClick={(e) => handleNodeTypeSelect(NodeType.OA, e)}
                        >
                            Object Attribute (OA)
                        </Menu.Item>
                        <Menu.Item
                            leftSection={<NodeIcon type={NodeType.U} />}
                            onClick={(e) => handleNodeTypeSelect(NodeType.U, e)}
                        >
                            User (U)
                        </Menu.Item>
                        <Menu.Item
                            leftSection={<NodeIcon type={NodeType.O} />}
                            onClick={(e) => handleNodeTypeSelect(NodeType.O, e)}
                        >
                            Object (O)
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>

                <Modal
                    opened={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title="Add New Node"
                    centered
                >
                    <Stack gap="md">
                        <TextInput
                            label="Node Name"
                            placeholder="Enter node name"
                            value={newNodeName}
                            onChange={(event) => setNewNodeName(event.currentTarget.value)}
                        />
                        <Select
                            label="Node Type"
                            placeholder="Select node type"
                            value={newNodeType}
                            onChange={(value) => setNewNodeType((value as NodeType) || NodeType.PC)}
                            data={[
                                { value: NodeType.PC, label: 'Policy Class (PC)' },
                                { value: NodeType.UA, label: 'User Attribute (UA)' },
                                { value: NodeType.OA, label: 'Object Attribute (OA)' },
                                { value: NodeType.U, label: 'User (U)' },
                                { value: NodeType.O, label: 'Object (O)' },
                            ]}
                        />
                        <Group justify="flex-end" mt="md">
                            <Button variant="light" onClick={() => setIsModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={addNode}>Add Node</Button>
                        </Group>
                    </Stack>
                </Modal>

                <Modal
                    opened={jsonModalOpened}
                    onClose={() => setJsonModalOpened(false)}
                    title="Graph JSON"
                    centered
                    size="lg"
                >
                    <Stack gap="md">
                        <Textarea
                            minRows={12}
                            maxRows={20}
                            autosize
                            value={jsonEditValue}
                            onChange={(e) => setJsonEditValue(e.currentTarget.value)}
                            style={{ fontFamily: 'monospace', fontSize: 10 }}
                            spellCheck={false}
                        />
                        {jsonError && (
                            <Text c="red" size="sm">
                                {jsonError}
                            </Text>
                        )}
                        <Group justify="flex-end" mt="md">
                            <Button
                                variant="light"
                                onClick={() => {
                                    navigator.clipboard.writeText(jsonEditValue);
                                }}
                            >
                                Copy to Clipboard
                            </Button>
                            <Button
                                color="blue"
                                onClick={() => {
                                    try {
                                        const parsed = JSON.parse(jsonEditValue);
                                        const { nodes: newNodes, edges: newEdges } = jsonToGraph(parsed);
                                        setEdges(newEdges);
                                        formatGraph(newNodes, newEdges);
                                        setJsonModalOpened(false);
                                        setJsonError(null);
                                    } catch (err: any) {
                                        setJsonError(`Invalid JSON: ${err?.message || err}`);
                                    }
                                }}
                            >
                                Apply
                            </Button>
                        </Group>
                    </Stack>
                </Modal>

                {/* Association Modal for creating association edges with access rights */}
                {pendingConnection && (
                    <AssociationModal
                        opened={associationModalOpen}
                        onClose={handleAssociationModalClose}
                        mode="create"
                        node={dagNodeToTreeNode(nodes.find((n) => n.id === pendingConnection.target)!)}
                        selectedUserNode={dagNodeToTreeNode(
                            nodes.find((n) => n.id === pendingConnection.source)!
                        )}
                        selectedTargetNode={dagNodeToTreeNode(
                            nodes.find((n) => n.id === pendingConnection.target)!
                        )}
                        isUserTree={false}
                        onCustomSubmit={handleAssociationModalSubmit}
                    />
                )}
            </AppShell.Main>
        </AppShell>
    );
}

export function DAG() {
    return (
        <ReactFlowProvider>
            <DAGContent />
        </ReactFlowProvider>
    );
}
import React from 'react';
import { Tooltip, UnstyledButton } from '@mantine/core';
import { AssociationDirection, IncomingAssociationIcon, OutgoingAssociationIcon } from '@/features/pmtree/tree-utils';
import { NodeType } from '@/shared/api/pdp.types';
import { PANEL_RADIUS } from '@/theme';

export interface TreeFilterConfig {
    nodeTypes: NodeType[];
    showOutgoingAssociations: boolean;
    showIncomingAssociations: boolean;
}

export interface TreeFilterToolbarProps {
    filters: TreeFilterConfig;
    onFiltersChange: (filters: TreeFilterConfig) => void;
}

const ALL_NODE_TYPES: NodeType[] = [NodeType.UA, NodeType.OA, NodeType.U, NodeType.O];

const NODE_TYPE_LABELS: Record<string, string> = {
    [NodeType.UA]: 'User Attributes',
    [NodeType.OA]: 'Object Attributes',
    [NodeType.U]: 'Users',
    [NodeType.O]: 'Objects',
};

// A rounded, monochrome "segmented" track. The toolbar intentionally avoids the
// per-node-type colors used in the tree itself — repeating them here just turned
// the toolbar into a second rainbow competing with the tree. Identity is carried
// by the type letter; state is carried by fill, not hue.
const TRACK: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    padding: 3,
    borderRadius: PANEL_RADIUS,
    backgroundColor: 'var(--mantine-color-gray-1)',
};

function pillStyle(active: boolean): React.CSSProperties {
    return {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 26,
        minWidth: 30,
        paddingInline: 9,
        borderRadius: PANEL_RADIUS,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1,
        color: active ? 'var(--mantine-color-gray-8)' : 'var(--mantine-color-gray-5)',
        backgroundColor: active ? 'var(--mantine-color-white)' : 'transparent',
        boxShadow: active ? '0 1px 2px rgba(0,0,0,0.12)' : 'none',
        transition: 'color 120ms ease, background-color 120ms ease, box-shadow 120ms ease',
    };
}

export function TreeFilterToolbar({ filters, onFiltersChange }: TreeFilterToolbarProps) {
    const handleNodeTypeToggle = (nodeType: NodeType) => {
        const nodeTypes = filters.nodeTypes.includes(nodeType)
            ? filters.nodeTypes.filter((type) => type !== nodeType)
            : [...filters.nodeTypes, nodeType];
        onFiltersChange({ ...filters, nodeTypes });
    };

    const handleAssociationDirectionToggle = (direction: AssociationDirection) => {
        onFiltersChange(
            direction === AssociationDirection.Incoming
                ? { ...filters, showIncomingAssociations: !filters.showIncomingAssociations }
                : { ...filters, showOutgoingAssociations: !filters.showOutgoingAssociations }
        );
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={TRACK}>
                {ALL_NODE_TYPES.map((nodeType) => {
                    const active = filters.nodeTypes.includes(nodeType);
                    return (
                        <Tooltip key={nodeType} label={NODE_TYPE_LABELS[nodeType]} position="top" openDelay={300}>
                            <UnstyledButton
                                aria-pressed={active}
                                onClick={() => handleNodeTypeToggle(nodeType)}
                                style={pillStyle(active)}
                            >
                                {nodeType}
                            </UnstyledButton>
                        </Tooltip>
                    );
                })}
            </div>

            <div style={TRACK}>
                <Tooltip label="Show outgoing associations" position="top" openDelay={300}>
                    <UnstyledButton
                        aria-pressed={filters.showOutgoingAssociations}
                        onClick={() => handleAssociationDirectionToggle(AssociationDirection.Outgoing)}
                        style={pillStyle(filters.showOutgoingAssociations)}
                    >
                        <OutgoingAssociationIcon size="18px" color="currentColor" />
                    </UnstyledButton>
                </Tooltip>
                <Tooltip label="Show incoming associations" position="top" openDelay={300}>
                    <UnstyledButton
                        aria-pressed={filters.showIncomingAssociations}
                        onClick={() => handleAssociationDirectionToggle(AssociationDirection.Incoming)}
                        style={pillStyle(filters.showIncomingAssociations)}
                    >
                        <IncomingAssociationIcon size="18px" color="currentColor" />
                    </UnstyledButton>
                </Tooltip>
            </div>
        </div>
    );
}

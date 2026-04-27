import React from 'react';
import { ActionIcon, Tooltip, useMantineTheme } from '@mantine/core';
import { AssociationDirection, IncomingAssociationIcon, OutgoingAssociationIcon, NodeIcon } from '@/features/pmtree/tree-utils';
import { NodeType } from '@/shared/api/pdp.types';
import {ToolBarSection} from "@/features/pmtree/ToolBarSection";

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

export function TreeFilterToolbar({ filters, onFiltersChange }: TreeFilterToolbarProps) {
    const theme = useMantineTheme();

    const handleNodeTypeToggle = async (nodeType: NodeType) => {
        const newNodeTypes = filters.nodeTypes.includes(nodeType)
            ? filters.nodeTypes.filter((type) => type !== nodeType)
            : [...filters.nodeTypes, nodeType];

        const newFilters = {
            ...filters,
            nodeTypes: newNodeTypes,
        };

        onFiltersChange(newFilters);
    };

    const handleAssociationDirectionToggle = async (direction: AssociationDirection) => {
        const newFilters =
            direction === AssociationDirection.Incoming
                ? {
                    ...filters,
                    showIncomingAssociations: !filters.showIncomingAssociations,
                }
                : {
                    ...filters,
                    showOutgoingAssociations: !filters.showOutgoingAssociations,
                };

        onFiltersChange(newFilters);
    };

    return (
        <ToolBarSection
            title="Tree Filters"
        >
            {ALL_NODE_TYPES.map((nodeType) => (
                <ActionIcon
                    key={nodeType}
                    variant="subtle"
                    size="md"
                    onClick={() => handleNodeTypeToggle(nodeType)}
                    style={{
                        opacity: filters.nodeTypes.includes(nodeType) ? 1 : 0.35,
                    }}
                >
                    <NodeIcon type={nodeType} size={24} />
                </ActionIcon>
            ))}

            <Tooltip label="Show outgoing associations">
                <ActionIcon
                    variant="subtle"
                    size="md"
                    onClick={() => handleAssociationDirectionToggle(AssociationDirection.Outgoing)}
                    style={{
                        opacity: filters.showOutgoingAssociations ? 1 : 0.35,
                    }}
                >
                    <OutgoingAssociationIcon
                        size="22px"
                        color={theme.colors.green[9]}
                    />
                </ActionIcon>
            </Tooltip>

            <Tooltip label="Show incoming associations">
                <ActionIcon
                    variant="subtle"
                    size="md"
                    onClick={() => handleAssociationDirectionToggle(AssociationDirection.Incoming)}
                    style={{
                        opacity: filters.showIncomingAssociations ? 1 : 0.35,
                    }}
                >
                    <IncomingAssociationIcon
                        size="22px"
                        color={theme.colors.green[9]}
                    />
                </ActionIcon>
            </Tooltip>
        </ToolBarSection>
    );
}
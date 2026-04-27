import React, { useEffect, useMemo, useRef, useState } from 'react';
import { IconCheck, IconCircleArrowDownLeft, IconCircleArrowUpRight, IconDotsVertical, IconRefresh } from '@tabler/icons-react';
import { ActionIcon, Divider, Group, Menu, Text, Tooltip, useMantineTheme } from '@mantine/core';
import { AssociationDirection, IncomingAssociationIcon, NodeIcon, OutgoingAssociationIcon } from '@/features/pmtree/tree-utils';
import { NodeType } from '@/shared/api/pdp.types';
import { ToolBarSection } from './ToolBarSection';
import { TreeFilterToolbar } from './TreeFilterToolbar';
import { TreeDirection, TreeFilterConfig } from './hooks/usePMTreeOperations';

export interface PMTreeToolbarProps {
    // Visibility controls (all default to true, except createPolicyClass which defaults to false)
    showReset?: boolean;
    showCreatePolicyClass?: boolean;
    showTreeFilters?: boolean;
    showDirection?: boolean;

    // Data and handlers
    direction?: TreeDirection;
    filters: TreeFilterConfig;
    onFiltersChange: (filters: TreeFilterConfig) => void;
    onReset: () => void;
    onCreatePolicyClass?: () => void;

    // Custom sections (preserved for flexibility)
    leftSection?: React.ReactNode;
    leftSectionTitle?: string;
    rightSection?: React.ReactNode;

    toolbarBg?: string;
}

const ALL_NODE_TYPES: NodeType[] = [NodeType.UA, NodeType.OA, NodeType.U, NodeType.O];
const OVERFLOW_BTN_W = 40;

export function PMTreeToolbar({
    showReset = true,
    showCreatePolicyClass = false,
    showTreeFilters = true,
    showDirection = true,
    direction = 'ascendants',
    filters,
    onFiltersChange,
    onReset,
    onCreatePolicyClass,
    leftSection,
    leftSectionTitle = 'Actions',
    rightSection,
    toolbarBg,
}: PMTreeToolbarProps) {
    const theme = useMantineTheme();
    const directionLabel = direction === 'descendants' ? 'Descendants' : 'Ascendants';

    const containerRef = useRef<HTMLDivElement>(null);
    const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
    const sectionWidths = useRef<number[]>([]);
    const [containerWidth, setContainerWidth] = useState(9999);

    useEffect(() => {
        if (!containerRef.current) return;
        const ro = new ResizeObserver((entries) => setContainerWidth(entries[0].contentRect.width));
        ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, []);

    // Read section widths after each render, but only for visible sections.
    // Hidden sections report offsetWidth=0 which would corrupt the overflow
    // computation on the next render, causing sections to jump in/out.
    useEffect(() => {
        sectionKeys.forEach((key, i) => {
            if (!overflowSet.has(key)) {
                const el = sectionRefs.current[i];
                if (el) {
                    const w = el.offsetWidth;
                    if (w > 0) sectionWidths.current[i] = w;
                }
            }
        });
    });

    // Stable ordered list of enabled section keys
    const sectionKeys = useMemo(() => {
        const keys: string[] = [];
        if (showReset) keys.push('reset');
        if (showCreatePolicyClass && onCreatePolicyClass) keys.push('createPC');
        if (leftSection) keys.push('leftSection');
        if (showTreeFilters) keys.push('treeFilters');
        if (showDirection) keys.push('direction');
        return keys;
    }, [showReset, showCreatePolicyClass, onCreatePolicyClass, leftSection, showTreeFilters, showDirection]);

    // Compute which sections overflow
    const overflowSet = useMemo(() => {
        const set = new Set<string>();
        let accumulated = 0;
        let overflowing = false;

        for (let i = 0; i < sectionKeys.length; i++) {
            const key = sectionKeys[i];
            const w = sectionWidths.current[i] ?? 0;
            if (!overflowing) {
                const remaining = sectionKeys.length - i - 1;
                const needsOverflowBtn = remaining > 0;
                if (accumulated + w + (needsOverflowBtn ? OVERFLOW_BTN_W : 0) > containerWidth) {
                    overflowing = true;
                }
            }
            if (overflowing) {
                set.add(key);
            } else {
                accumulated += w;
            }
        }
        return set;
    }, [sectionKeys, containerWidth]);

    // Build overflow menu sections
    const overflowSections = useMemo(() => {
        return sectionKeys
            .filter((key) => overflowSet.has(key))
            .map((key) => {
                switch (key) {
                    case 'reset':
                        return {
                            key,
                            title: 'Reset',
                            items: [
                                <Menu.Item
                                    key="reset-item"
                                    leftSection={<IconRefresh size={16} />}
                                    onClick={onReset}
                                >
                                    Reset
                                </Menu.Item>,
                            ],
                        };
                    case 'createPC':
                        return {
                            key,
                            title: 'Create Policy Class',
                            items: [
                                <Menu.Item
                                    key="createPC-item"
                                    leftSection={<NodeIcon type={NodeType.PC} size={16} />}
                                    onClick={onCreatePolicyClass}
                                >
                                    Policy Class
                                </Menu.Item>,
                            ],
                        };
                    case 'leftSection':
                        return {
                            key,
                            title: leftSectionTitle,
                            items: [],
                        };
                    case 'treeFilters':
                        return {
                            key,
                            title: 'Tree Filters',
                            items: [
                                ...ALL_NODE_TYPES.map((nt) => (
                                    <Menu.Item
                                        key={nt}
                                        leftSection={<NodeIcon type={nt} size={16} />}
                                        rightSection={filters.nodeTypes.includes(nt) ? <IconCheck size={14} /> : null}
                                        fw={filters.nodeTypes.includes(nt) ? 600 : 400}
                                        onClick={() =>
                                            onFiltersChange({
                                                ...filters,
                                                nodeTypes: filters.nodeTypes.includes(nt)
                                                    ? filters.nodeTypes.filter((t) => t !== nt)
                                                    : [...filters.nodeTypes, nt],
                                            })
                                        }
                                    >
                                        {nt}
                                    </Menu.Item>
                                )),
                                <Menu.Item
                                    key="outgoing"
                                    leftSection={
                                        <OutgoingAssociationIcon size="16px" color={theme.colors.green[9]} />
                                    }
                                    rightSection={
                                        filters.showOutgoingAssociations ? <IconCheck size={14} /> : null
                                    }
                                    fw={filters.showOutgoingAssociations ? 600 : 400}
                                    onClick={() =>
                                        onFiltersChange({
                                            ...filters,
                                            showOutgoingAssociations: !filters.showOutgoingAssociations,
                                        })
                                    }
                                >
                                    Outgoing Associations
                                </Menu.Item>,
                                <Menu.Item
                                    key="incoming"
                                    leftSection={
                                        <IncomingAssociationIcon size="16px" color={theme.colors.green[9]} />
                                    }
                                    rightSection={
                                        filters.showIncomingAssociations ? <IconCheck size={14} /> : null
                                    }
                                    fw={filters.showIncomingAssociations ? 600 : 400}
                                    onClick={() =>
                                        onFiltersChange({
                                            ...filters,
                                            showIncomingAssociations: !filters.showIncomingAssociations,
                                        })
                                    }
                                >
                                    Incoming Associations
                                </Menu.Item>,
                            ],
                        };
                    case 'direction':
                        return {
                            key,
                            title: 'Direction',
                            items: [
                                <Menu.Item
                                    key="direction-item"
                                    disabled
                                    leftSection={
                                        direction === 'ascendants' ? (
                                            <IconCircleArrowUpRight size={16} />
                                        ) : (
                                            <IconCircleArrowDownLeft size={16} />
                                        )
                                    }
                                >
                                    {directionLabel}
                                </Menu.Item>,
                            ],
                        };
                    default:
                        return { key, title: key, items: [] };
                }
            });
    }, [sectionKeys, overflowSet, filters, onFiltersChange, onReset, onCreatePolicyClass, leftSectionTitle, direction, directionLabel, theme]);

    // Check if any section is visible
    const hasVisibleSection = showReset || showCreatePolicyClass || showTreeFilters || showDirection || leftSection || rightSection;

    if (!hasVisibleSection) {
        return null;
    }

    // Map sectionKeys to ref indices
    const refIndex = (key: string) => sectionKeys.indexOf(key);

    return (
        <div
            ref={containerRef}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: `1px solid ${theme.other.intellijDivider as string}`,
                backgroundColor: toolbarBg ?? theme.other.intellijToolbarBg as string,
                padding: '2px 8px',
                height: 60,
                overflow: 'hidden',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden', minWidth: 0 }}>
                {/* Reset */}
                {showReset && (
                    <div
                        ref={(el) => { sectionRefs.current[refIndex('reset')] = el; }}
                        style={{
                            display: overflowSet.has('reset') ? 'none' : 'flex',
                            alignItems: 'center',
                        }}
                    >
                        <div style={{ padding: '0 8px' }}>
                            <ToolBarSection title="Reset">
                                <ActionIcon variant="subtle" onClick={onReset}>
                                    <IconRefresh size={26} color="black" />
                                </ActionIcon>
                            </ToolBarSection>
                        </div>
                        <Divider orientation="vertical" />
                    </div>
                )}

                {/* Create Policy Class */}
                {showCreatePolicyClass && onCreatePolicyClass && (
                    <div
                        ref={(el) => { sectionRefs.current[refIndex('createPC')] = el; }}
                        style={{
                            display: overflowSet.has('createPC') ? 'none' : 'flex',
                            alignItems: 'center',
                        }}
                    >
                        <div style={{ padding: '0 8px' }}>
                            <ToolBarSection title="Create">
                                <ActionIcon variant="subtle" size="md" onClick={onCreatePolicyClass}>
                                    <NodeIcon type={NodeType.PC} size={24} />
                                </ActionIcon>
                            </ToolBarSection>
                        </div>
                        <Divider orientation="vertical" />
                    </div>
                )}

                {/* Custom left section */}
                {leftSection && (
                    <div
                        ref={(el) => { sectionRefs.current[refIndex('leftSection')] = el; }}
                        style={{
                            display: overflowSet.has('leftSection') ? 'none' : 'flex',
                            alignItems: 'center',
                        }}
                    >
                        <div style={{ padding: '0 8px' }}>
                            {leftSection}
                        </div>
                        <Divider orientation="vertical" />
                    </div>
                )}

                {/* Tree Filters */}
                {showTreeFilters && (
                    <div
                        ref={(el) => { sectionRefs.current[refIndex('treeFilters')] = el; }}
                        style={{
                            display: overflowSet.has('treeFilters') ? 'none' : 'flex',
                            alignItems: 'center',
                        }}
                    >
                        <div style={{ padding: '0 8px' }}>
                            <TreeFilterToolbar filters={filters} onFiltersChange={onFiltersChange} />
                        </div>
                        <Divider orientation="vertical" />
                    </div>
                )}

                {/* Direction */}
                {showDirection && (
                    <div
                        ref={(el) => { sectionRefs.current[refIndex('direction')] = el; }}
                        style={{
                            display: overflowSet.has('direction') ? 'none' : 'flex',
                            alignItems: 'center',
                        }}
                    >
                        <div style={{ padding: '0 8px' }}>
                            <ToolBarSection title="Direction">
                                <Group gap={0}>
                                    {direction === 'ascendants' ? (
                                        <IconCircleArrowUpRight />
                                    ) : (
                                        <IconCircleArrowDownLeft />
                                    )}
                                    <Text size="xs">{directionLabel}</Text>
                                </Group>
                            </ToolBarSection>
                        </div>
                    </div>
                )}

                {/* Overflow ⋮ button */}
                {overflowSections.length > 0 && (
                    <Menu position="bottom-end" withinPortal>
                        <Menu.Target>
                            <Tooltip label="More options" position="bottom">
                                <ActionIcon variant="transparent" size="lg">
                                    <IconDotsVertical size={18} />
                                </ActionIcon>
                            </Tooltip>
                        </Menu.Target>
                        <Menu.Dropdown>
                            {overflowSections.map((section, i) => (
                                <React.Fragment key={section.key}>
                                    {i > 0 && <Menu.Divider />}
                                    <Menu.Label>{section.title}</Menu.Label>
                                    {section.items}
                                </React.Fragment>
                            ))}
                        </Menu.Dropdown>
                    </Menu>
                )}
            </div>

            {/* Right section */}
            {rightSection && (
                <Group gap="md" style={{ flexShrink: 0 }}>
                    {rightSection}
                </Group>
            )}
        </div>
    );
}

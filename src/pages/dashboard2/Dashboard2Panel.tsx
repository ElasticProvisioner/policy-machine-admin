import React, { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { Center, Loader, Text } from '@mantine/core';
import { PMTree, TreeFilterConfig } from '@/features/pmtree';
import { NodeType } from '@/shared/api/pdp.types';
import { TreeNode, sortTreeNodes, transformNodeToTreeNode } from '@/features/pmtree/tree-utils';
import * as QueryService from '@/shared/api/pdp_query.api';
import { withCriticalRetry } from '@/lib/retry-utils';
import { ProhibitionsPanel } from '@/features/prohibitions';
import { ObligationsPanel } from '@/features/obligations/ObligationsPanel';
import { Operations } from '@/features/operations';
import { ListDetailChromeContext } from '@/components/ListDetailPanel';
import { selectedNodeAtom } from './dashboard2-atoms';

// Render ListDetailPanel-based left panels with the section-style header that
// matches the main panel's "Policy Classes" header. User Attributes doesn't use
// ListDetailPanel, so it keeps its own title.
const SECTION_CHROME = { sectionHeader: true };

const UA_TREE_FILTERS: TreeFilterConfig = {
    nodeTypes: [NodeType.PC, NodeType.UA, NodeType.U],
    showOutgoingAssociations: false,
    showIncomingAssociations: false,
};

type Props = {
    activeId: string;
    onClose: () => void;
};

// If the personal object system already contains a policy class, that PC is
// too specific to be useful as a tree root — step up a level and use the
// adjacent ascendants of every POS node instead, so the tree starts from the
// policy classes above them.
async function loadUaTreeRoots(): Promise<TreeNode[]> {
    const pos = (await withCriticalRetry(() => QueryService.selfComputePersonalObjectSystem()))
        .filter(np => np.node !== undefined);

    const hasPolicyClass = pos.some(np => np.node!.type === NodeType.PC);

    if (!hasPolicyClass) {
        return sortTreeNodes(
            pos.map(np => ({ ...transformNodeToTreeNode(np.node!), privileges: np.accessRights }))
        );
    }

    const ascendantLists = await Promise.all(
        pos.map(np => withCriticalRetry(() => QueryService.selfComputeAdjacentAscendantPrivileges(np.node!.id)))
    );

    const merged = new Map<string, TreeNode>();
    for (const ascendants of ascendantLists) {
        for (const np of ascendants) {
            if (!np.node) continue;
            merged.set(String(np.node.id), { ...transformNodeToTreeNode(np.node), privileges: np.accessRights });
        }
    }

    return sortTreeNodes([...merged.values()]);
}

function PanelTitle({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                padding: '14px 16px 12px',
                borderBottom: '1px solid var(--mantine-color-gray-2)',
                flexShrink: 0,
            }}
        >
            <Text
                size="xs"
                fw={700}
                style={{
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    color: 'var(--mantine-color-gray-6)',
                    lineHeight: '20px',
                }}
            >
                {children}
            </Text>
        </div>
    );
}

function UaTreePanel() {
    const [rootNodes, setRootNodes] = useState<TreeNode[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        loadUaTreeRoots().then(nodes => {
            if (!cancelled) setRootNodes(nodes);
        });
        return () => { cancelled = true; };
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <PanelTitle>User Attributes</PanelTitle>
            <div style={{ flex: 1, minHeight: 0 }}>
                {rootNodes === null ? (
                    <Center style={{ height: '100%' }}><Loader size="sm" /></Center>
                ) : (
                    <PMTree
                        style={{ width: '100%', height: '100%' }}
                        direction="ascendants"
                        rootNodes={rootNodes}
                        filterConfig={UA_TREE_FILTERS}
                        showTreeFilters={false}
                        showDirection={false}
                        showCreatePolicyClass={false}
                    />
                )}
            </div>
        </div>
    );
}

function renderPanelContent(activeId: string, selectedNode: TreeNode | null): React.ReactNode {
    switch (activeId) {
        case 'ua-tree':
            return <UaTreePanel />;
        case 'prohibitions':
            return <ProhibitionsPanel selectedNodes={selectedNode ? [selectedNode] : undefined} />;
        case 'obligations':
            return <ObligationsPanel />;
        case 'admin-operations':
            return <Operations initialMode="admin" />;
        case 'resource-operations':
            return <Operations initialMode="resource" />;
        case 'queries':
            return <Operations initialMode="query" />;
        case 'routines':
            return <Operations initialMode="routine" />;
        case 'functions':
            return <Operations initialMode="function" />;
        default:
            return (
                <div style={{ color: 'var(--mantine-color-dimmed)', fontSize: 14, paddingTop: 32, textAlign: 'center', padding: '32px 24px 24px' }}>
                    {activeId} panel
                    <br />
                    <span style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
                        Replace this with your panel content.
                    </span>
                </div>
            );
    }
}

export function Dashboard2Panel({ activeId, onClose }: Props) {
    const selectedNode = useAtomValue(selectedNodeAtom);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Panel content */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                <ListDetailChromeContext.Provider value={SECTION_CHROME}>
                    {renderPanelContent(activeId, selectedNode)}
                </ListDetailChromeContext.Provider>
            </div>
        </div>
    );
}

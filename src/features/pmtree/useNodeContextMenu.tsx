import React, { useState } from 'react';
import {
    IconBan,
    IconCopy,
    IconInfoSquareRounded,
    IconPlus,
    IconShieldCheck,
    IconTrash,
} from '@tabler/icons-react';
import { Button, Group, Menu, Modal, Stack, Text, TextInput, useMantineTheme } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { NodeIcon, OutgoingAssociationIcon, TreeNode } from './tree-utils';
import { NodeType } from '@/shared/api/pdp.types';
import * as AdjudicationService from '@/shared/api/pdp_adjudication.api';
import * as QueryService from '@/shared/api/pdp_query.api';
import { AccessRightsTree } from '@/components/access-rights';

/** Result of a successful create/delete, so the host can refresh its tree. */
export interface NodeMutation {
    kind: 'create' | 'delete';
    /** The right-clicked node: parent (for create) or the deleted node. */
    node: TreeNode;
    /** Type created (create only). */
    createdType?: NodeType;
}

export interface NodeContextMenuOptions {
    /** Host opens its own "info" view for the node. */
    onInfo?: (node: TreeNode) => void;
    /** Associate `selectedAssociableNode` with the right-clicked node. Omit to hide the item. */
    onAssociate?: (node: TreeNode) => void;
    /** Host opens a "create prohibition" flow for the node. Omit to hide the item. */
    onCreateProhibition?: (node: TreeNode) => void;
    /** Right-click on an association node (no menu is shown for these). */
    onAssociationNodeRightClick?: (node: TreeNode) => void;
    /** Source for the Associate item's label/target; when null the Associate item is hidden. */
    selectedAssociableNode?: TreeNode | null;
    /** Fired after a successful create/delete so the host can refresh its tree. */
    onMutated?: (mutation: NodeMutation) => void;
    enableCreate?: boolean;
    enableDelete?: boolean;
    enableProhibition?: boolean;
    enableViewPrivileges?: boolean;
}

export interface NodeContextMenu {
    /** Feed to `PMTree` via `clickHandlers.onRightClick`. */
    onRightClick: (node: TreeNode, event: React.MouseEvent) => void;
    /** Mount as a sibling element; renders the menu and its modals. */
    menu: React.ReactNode;
}

const getValidChildNodeTypes = (parentType: NodeType): NodeType[] => {
    switch (parentType) {
        case NodeType.PC:
            return [NodeType.UA, NodeType.OA];
        case NodeType.UA:
            return [NodeType.UA, NodeType.U];
        case NodeType.OA:
            return [NodeType.OA, NodeType.O];
        default:
            return [];
    }
};

/**
 * Shared right-click context menu for PMTree nodes: Info, Associate, View
 * Privileges, Copy Node Name, Create Node, Create Prohibition, Delete Node.
 *
 * Self-contained actions (create/delete/copy/view privileges) are handled
 * internally; panel/tab-coordinated actions (info, associate, create
 * prohibition, association-node right-click) are delegated to the host via
 * callbacks so each dashboard can map them to its own layout.
 */
export function useNodeContextMenu(opts: NodeContextMenuOptions): NodeContextMenu {
    const theme = useMantineTheme();

    const {
        onInfo,
        onAssociate,
        onCreateProhibition,
        onAssociationNodeRightClick,
        selectedAssociableNode = null,
        onMutated,
        enableCreate = true,
        enableDelete = true,
        enableProhibition = true,
        enableViewPrivileges = true,
    } = opts;

    const [contextMenuOpened, setContextMenuOpened] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
    const [rightClickedNode, setRightClickedNode] = useState<TreeNode | null>(null);
    const [createNodeModalOpened, setCreateNodeModalOpened] = useState(false);
    const [nodeTypeToCreate, setNodeTypeToCreate] = useState<NodeType | null>(null);
    const [newNodeName, setNewNodeName] = useState('');
    const [privilegesModalOpened, setPrivilegesModalOpened] = useState(false);
    const [resourceAccessRights, setResourceAccessRights] = useState<string[]>([]);

    const onRightClick = (node: TreeNode, event: React.MouseEvent) => {
        event.preventDefault();
        if (node.isAssociation) {
            onAssociationNodeRightClick?.(node);
            return;
        }
        setRightClickedNode(node);
        setContextMenuPosition({ x: event.clientX, y: event.clientY });
        setContextMenuOpened(true);
    };

    const handleInfoClick = () => {
        if (rightClickedNode) {
            onInfo?.(rightClickedNode);
        }
        setContextMenuOpened(false);
    };

    const handleAssociateClick = () => {
        if (rightClickedNode) {
            onAssociate?.(rightClickedNode);
        }
        setContextMenuOpened(false);
    };

    const handleViewPrivileges = async () => {
        setContextMenuOpened(false);
        try {
            const rights = await QueryService.getResourceAccessRights();
            setResourceAccessRights(rights);
        } catch {
            setResourceAccessRights([]);
        }
        setPrivilegesModalOpened(true);
    };

    const handleCopyNodeName = () => {
        if (rightClickedNode) {
            navigator.clipboard.writeText(rightClickedNode.name);
            notifications.show({
                title: 'Copied',
                message: `Node name "${rightClickedNode.name}" copied to clipboard`,
                color: 'green',
            });
        }
        setContextMenuOpened(false);
    };

    const handleCreateProhibitionClick = () => {
        if (rightClickedNode) {
            onCreateProhibition?.(rightClickedNode);
        }
        setContextMenuOpened(false);
    };

    const handleDeleteNode = async () => {
        const node = rightClickedNode;
        if (node && node.pmId) {
            try {
                await AdjudicationService.deleteNode(node.pmId);
                notifications.show({
                    title: 'Node Deleted',
                    message: `Successfully deleted node "${node.name}"`,
                    color: 'green',
                });
                onMutated?.({ kind: 'delete', node });
            } catch (error) {
                notifications.show({
                    title: 'Delete Error',
                    message: `Failed to delete node: ${(error as Error).message}`,
                    color: 'red',
                });
            }
        }
        setContextMenuOpened(false);
    };

    const handleCreateNodeClick = (nodeType: NodeType) => {
        setNodeTypeToCreate(nodeType);
        setNewNodeName('');
        setCreateNodeModalOpened(true);
        setContextMenuOpened(false);
    };

    const handleCreateNodeCancel = () => {
        setCreateNodeModalOpened(false);
        setNodeTypeToCreate(null);
        setNewNodeName('');
    };

    const handleCreateNodeConfirm = async () => {
        const parent = rightClickedNode;
        const createdType = nodeTypeToCreate;
        try {
            if (createdType === NodeType.PC) {
                await AdjudicationService.createPolicyClass(newNodeName.trim());
            } else {
                if (!parent || !parent.pmId || !createdType || !newNodeName.trim()) {
                    return;
                }
                switch (createdType) {
                    case NodeType.UA:
                        await AdjudicationService.createUserAttribute(newNodeName.trim(), [parent.pmId]);
                        break;
                    case NodeType.OA:
                        await AdjudicationService.createObjectAttribute(newNodeName.trim(), [parent.pmId]);
                        break;
                    case NodeType.U:
                        await AdjudicationService.createUser(newNodeName.trim(), [parent.pmId]);
                        break;
                    case NodeType.O:
                        await AdjudicationService.createObject(newNodeName.trim(), [parent.pmId]);
                        break;
                }
            }
            notifications.show({
                title: 'Node Created',
                message: `Successfully created ${createdType} "${newNodeName.trim()}"`,
                color: 'green',
            });
            if (parent && createdType) {
                onMutated?.({ kind: 'create', node: parent, createdType });
            }
        } catch (error) {
            notifications.show({
                title: 'Create Error',
                message: `Failed to create node: ${(error as Error).message}`,
                color: 'red',
            });
        }
        handleCreateNodeCancel();
    };

    const childTypes = rightClickedNode
        ? getValidChildNodeTypes(rightClickedNode.type as NodeType)
        : [];

    const showAssociate =
        !!onAssociate &&
        !!selectedAssociableNode &&
        !!rightClickedNode &&
        (rightClickedNode.type === NodeType.UA || rightClickedNode.type === NodeType.OA);

    const showProhibition =
        enableProhibition &&
        !!onCreateProhibition &&
        !!rightClickedNode &&
        (rightClickedNode.type === NodeType.U || rightClickedNode.type === NodeType.UA);

    const menu = (
        <>
            <Menu
                opened={contextMenuOpened}
                onClose={() => setContextMenuOpened(false)}
                position="bottom-start"
                withArrow={false}
                shadow="md"
            >
                <Menu.Target>
                    <div
                        style={{
                            position: 'fixed',
                            left: contextMenuPosition.x,
                            top: contextMenuPosition.y,
                            width: 1,
                            height: 1,
                        }}
                    />
                </Menu.Target>
                <Menu.Dropdown>
                    {onInfo && (
                        <Menu.Item
                            onClick={handleInfoClick}
                            leftSection={<IconInfoSquareRounded size={16} />}
                        >
                            Info
                        </Menu.Item>
                    )}

                    {showAssociate && (
                        <Menu.Item
                            onClick={handleAssociateClick}
                            leftSection={<OutgoingAssociationIcon size="16px" color={theme.colors.green[9]} />}
                            style={{
                                backgroundColor: theme.colors.green[0],
                                borderLeft: `3px solid ${theme.colors.green[9]}`,
                            }}
                        >
                            <Group gap={6} wrap="nowrap">
                                Associate
                                <NodeIcon type={selectedAssociableNode!.type as NodeType} size={16} />
                                <Text span size="sm" fw={500}>{selectedAssociableNode!.name}</Text>
                                with
                                <NodeIcon type={rightClickedNode!.type as NodeType} size={16} />
                                <Text span size="sm" fw={500}>{rightClickedNode!.name}</Text>
                            </Group>
                        </Menu.Item>
                    )}

                    {enableViewPrivileges && (
                        <Menu.Item onClick={handleViewPrivileges} leftSection={<IconShieldCheck size={16} />}>
                            View Privileges
                        </Menu.Item>
                    )}

                    <Menu.Item onClick={handleCopyNodeName} leftSection={<IconCopy size={16} />}>
                        Copy Node Name
                    </Menu.Item>

                    {enableCreate && childTypes.length > 0 && (
                        <>
                            <Menu.Divider />
                            <Menu.Label>Create Node</Menu.Label>
                            {childTypes.map((nodeType) => (
                                <Menu.Item
                                    key={nodeType}
                                    leftSection={<NodeIcon type={nodeType} size={16} />}
                                    rightSection={<IconPlus size={16} />}
                                    onClick={() => handleCreateNodeClick(nodeType)}
                                >
                                    Create {nodeType}
                                </Menu.Item>
                            ))}
                        </>
                    )}

                    {showProhibition && (
                        <>
                            <Menu.Divider />
                            <Menu.Label>Prohibition</Menu.Label>
                            <Menu.Item
                                onClick={handleCreateProhibitionClick}
                                leftSection={<IconBan size={16} />}
                            >
                                Create Prohibition
                            </Menu.Item>
                        </>
                    )}

                    {enableDelete && rightClickedNode && rightClickedNode.pmId != null && (
                        <>
                            <Menu.Divider />
                            <Menu.Label>Delete</Menu.Label>
                            <Menu.Item
                                onClick={handleDeleteNode}
                                leftSection={<IconTrash size={16} />}
                                color="red"
                            >
                                Delete Node
                            </Menu.Item>
                        </>
                    )}
                </Menu.Dropdown>
            </Menu>

            <Modal
                opened={createNodeModalOpened}
                onClose={handleCreateNodeCancel}
                title={
                    <Group gap="sm">
                        <Text size="lg" fw={600}>
                            Create New Node
                        </Text>
                    </Group>
                }
                size="sm"
            >
                <Stack gap="md">
                    {rightClickedNode && nodeTypeToCreate !== NodeType.PC && (
                        <Group
                            gap="sm"
                            p="sm"
                            style={{
                                backgroundColor: 'var(--mantine-color-gray-0)',
                                borderRadius: '8px',
                                overflowX: 'auto',
                                overflowY: 'hidden',
                                minWidth: 0,
                            }}
                        >
                            <Group gap="xs" wrap="nowrap">
                                <NodeIcon
                                    type={rightClickedNode.type}
                                    size={18}
                                    style={{ flexShrink: 0 }}
                                />
                                <Text size="sm" fw={500} style={{ whiteSpace: 'nowrap' }}>
                                    {rightClickedNode.name}
                                </Text>
                            </Group>
                        </Group>
                    )}

                    <TextInput
                        label="Name"
                        placeholder="Name"
                        value={newNodeName}
                        onChange={(e) => setNewNodeName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                if (newNodeName.trim()) {
                                    handleCreateNodeConfirm();
                                }
                            }
                        }}
                        data-autofocus
                        required
                        leftSection={nodeTypeToCreate && <NodeIcon type={nodeTypeToCreate} size={20} />}
                    />

                    <Group justify="flex-end" gap="sm" mt="md">
                        <Button variant="outline" onClick={handleCreateNodeCancel}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateNodeConfirm} disabled={!newNodeName.trim()}>
                            Create
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            <Modal
                opened={privilegesModalOpened}
                onClose={() => setPrivilegesModalOpened(false)}
                title={
                    <Group gap="sm">
                        <IconShieldCheck size={20} />
                        <Text size="lg" fw={600}>
                            Privileges — {rightClickedNode?.name}
                        </Text>
                    </Group>
                }
            >
                <AccessRightsTree
                    availableRights={resourceAccessRights}
                    selectedRights={rightClickedNode?.privileges ?? []}
                    onChange={() => {}}
                />
            </Modal>
        </>
    );

    return { onRightClick, menu };
}

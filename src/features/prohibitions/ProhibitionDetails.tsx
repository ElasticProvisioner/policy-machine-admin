import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Checkbox,
  Group,
  Stack,
  TextInput,
  Text,
  Alert,
  ActionIcon,
  Divider,
  Popover,
  useMantineTheme
} from "@mantine/core";
import { NodeApi } from "react-arborist";
import { IconSquareRoundedMinus, IconEdit } from "@tabler/icons-react";
import { AccessRightsSelection } from "@/components/access-rights";
import { PMTree } from "@/features/pmtree";
import { TreeNode, NodeIcon } from "@/features/pmtree/tree-utils";
import { NODE_TYPES, NodeType, Prohibition } from "@/shared/api/pdp.types";
import * as QueryService from "@/shared/api/pdp_query.api";
import * as AdjudicationService from "@/shared/api/pdp_adjudication.api";
import { notifications } from "@mantine/notifications";

interface ProhibitionDetailsProps {
  selectedNodes?: TreeNode[];
  initialProhibition?: Prohibition | null;
  isEditing?: boolean;
  onCancel: () => void;
  onSuccess: (prohibition?: Prohibition, action?: 'create' | 'update' | 'delete') => void;
}

export function ProhibitionDetails({
                                     selectedNodes = [],
                                     initialProhibition,
                                     isEditing = false,
                                     onCancel,
                                     onSuccess
                                   }: ProhibitionDetailsProps) {
  const theme = useMantineTheme();
  const [name, setName] = useState(initialProhibition?.name || "");
  const [subject, setSubject] = useState<TreeNode | null>(null);
  const [selectedAccessRights, setSelectedAccessRights] = useState<string[]>(initialProhibition?.accessRights || []);
  const [isConjunctive, setIsConjunctive] = useState(initialProhibition?.isConjunctive || false);
  const [inclusionSet, setInclusionSet] = useState<TreeNode[]>(
      initialProhibition?.inclusionSet.map(node => ({
        id: crypto.randomUUID(),
        name: node.name,
        type: node.type as NodeType,
        pmId: node.id
      })) || []
  );
  const [exclusionSet, setExclusionSet] = useState<TreeNode[]>(
      initialProhibition?.exclusionSet.map(node => ({
        id: crypto.randomUUID(),
        name: node.name,
        type: node.type as NodeType,
        pmId: node.id
      })) || []
  );

  // Check if this is a process prohibition (read-only, delete only)
  const isProcessProhibition = Boolean(initialProhibition?.subject?.process);

  // Node picker popovers (mirrors the "Set Source"/"Set Target" and "Assign To" pickers
  // used when creating an association)
  const [isSubjectPickerOpen, setIsSubjectPickerOpen] = useState(false);
  const [pickingSubjectNode, setPickingSubjectNode] = useState<TreeNode | null>(null);

  const [isInclusionPickerOpen, setIsInclusionPickerOpen] = useState(false);
  const [pickingInclusionNode, setPickingInclusionNode] = useState<TreeNode | null>(null);

  const [isExclusionPickerOpen, setIsExclusionPickerOpen] = useState(false);
  const [pickingExclusionNode, setPickingExclusionNode] = useState<TreeNode | null>(null);

  // Resource operations
  const [resourceOperations, setResourceOperations] = useState<string[]>([]);

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize subject from initial prohibition, or prefill from a node the panel was
  // opened with (e.g. "Create Prohibition" from a node's context menu)
  useEffect(() => {
    if (initialProhibition?.subject?.node) {
      setSubject({
        id: crypto.randomUUID(),
        name: initialProhibition.subject.node.name,
        type: initialProhibition.subject.node.type as NodeType,
        pmId: initialProhibition.subject.node.id
      });
    } else if (selectedNodes && selectedNodes.length > 0) {
      const validNode = selectedNodes.find(node =>
          node.type === NodeType.U || node.type === NodeType.UA
      );
      if (validNode) {
        setSubject(validNode);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenSubjectPicker = useCallback(() => {
    setPickingSubjectNode(null);
    setIsSubjectPickerOpen(true);
  }, []);

  const handleCloseSubjectPicker = useCallback(() => {
    setIsSubjectPickerOpen(false);
    setPickingSubjectNode(null);
  }, []);

  const handleSubjectPickerSelect = useCallback((nodes: NodeApi<TreeNode>[]) => {
    const node = nodes?.[0]?.data ?? null;
    setPickingSubjectNode(node);
  }, []);

  const handleConfirmSubjectPicker = useCallback(() => {
    if (!pickingSubjectNode) {return;}
    if (pickingSubjectNode.type !== NodeType.U && pickingSubjectNode.type !== NodeType.UA) {
      notifications.show({ color: 'red', title: 'Invalid Subject', message: 'Subject must be a User (U) or User Attribute (UA).' });
      return;
    }
    setSubject(pickingSubjectNode);
    setIsSubjectPickerOpen(false);
    setPickingSubjectNode(null);
  }, [pickingSubjectNode]);

  const handleOpenInclusionPicker = useCallback(() => {
    setPickingInclusionNode(null);
    setIsInclusionPickerOpen(true);
  }, []);

  const handleCloseInclusionPicker = useCallback(() => {
    setIsInclusionPickerOpen(false);
    setPickingInclusionNode(null);
  }, []);

  const handleInclusionPickerSelect = useCallback((nodes: NodeApi<TreeNode>[]) => {
    const node = nodes?.[0]?.data ?? null;
    setPickingInclusionNode(node);
  }, []);

  const handleAddInclusionPick = useCallback(() => {
    if (!pickingInclusionNode) {return;}
    setInclusionSet(prev =>
        prev.some(n => n.pmId === pickingInclusionNode.pmId) ? prev : [...prev, pickingInclusionNode]
    );
    setPickingInclusionNode(null);
  }, [pickingInclusionNode]);

  const handleOpenExclusionPicker = useCallback(() => {
    setPickingExclusionNode(null);
    setIsExclusionPickerOpen(true);
  }, []);

  const handleCloseExclusionPicker = useCallback(() => {
    setIsExclusionPickerOpen(false);
    setPickingExclusionNode(null);
  }, []);

  const handleExclusionPickerSelect = useCallback((nodes: NodeApi<TreeNode>[]) => {
    const node = nodes?.[0]?.data ?? null;
    setPickingExclusionNode(node);
  }, []);

  const handleAddExclusionPick = useCallback(() => {
    if (!pickingExclusionNode) {return;}
    setExclusionSet(prev =>
        prev.some(n => n.pmId === pickingExclusionNode.pmId) ? prev : [...prev, pickingExclusionNode]
    );
    setPickingExclusionNode(null);
  }, [pickingExclusionNode]);

  // Fetch resource operations
  useEffect(() => {
    async function fetchResourceOperations() {
      try {
        const accessRights = await QueryService.getResourceAccessRights();
        setResourceOperations(accessRights);
      } catch (error) {
        setResourceOperations([]);
      }
    }
    fetchResourceOperations();
  }, []);

  const handleRemoveSubject = useCallback(() => {
    setSubject(null);
  }, []);

  const handleRemoveFromInclusionSet = useCallback((nodeToRemove: TreeNode) => {
    setInclusionSet(prev => prev.filter(n => n.id !== nodeToRemove.id));
  }, []);

  const handleRemoveFromExclusionSet = useCallback((nodeToRemove: TreeNode) => {
    setExclusionSet(prev => prev.filter(n => n.id !== nodeToRemove.id));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      notifications.show({
        color: 'red',
        title: 'Validation Error',
        message: 'Prohibition name is required',
      });
      return;
    }

    if (!subject) {
      notifications.show({
        color: 'red',
        title: 'Validation Error',
        message: 'Subject must be selected',
      });
      return;
    }

    if (selectedAccessRights.length === 0) {
      notifications.show({
        color: 'red',
        title: 'Validation Error',
        message: 'At least one access right must be selected',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const prohibitionData: Prohibition = {
        name,
        subject: {
          node: {
            id: subject.pmId!,
            name: subject.name,
            type: subject.type as NodeType,
            properties: {}
          }
        },
        accessRights: selectedAccessRights,
        isConjunctive,
        inclusionSet: inclusionSet.map(n => ({
          id: n.pmId!,
          name: n.name,
          type: n.type as NodeType,
          properties: {}
        })),
        exclusionSet: exclusionSet.map(n => ({
          id: n.pmId!,
          name: n.name,
          type: n.type as NodeType,
          properties: {}
        }))
      };

      if (!isEditing) {
        await AdjudicationService.createProhibition(
            name,
            subject.pmId!,
            undefined, // No process support for now
            selectedAccessRights,
            isConjunctive,
            inclusionSet.map(n => n.pmId!),
            exclusionSet.map(n => n.pmId!)
        );
        notifications.show({
          color: 'green',
          title: 'Prohibition Created',
          message: 'Prohibition has been created successfully',
        });
        onSuccess(prohibitionData, 'create');
      }
    } catch (error) {
      notifications.show({
        color: 'red',
        title: isEditing ? 'Update Error' : 'Creation Error',
        message: (error as Error).message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [name, subject, selectedAccessRights, isConjunctive, inclusionSet, exclusionSet, isEditing, onSuccess]);

  const handleDelete = useCallback(async () => {
    if (!initialProhibition?.name) {return;}

    setIsSubmitting(true);

    try {
      await AdjudicationService.deleteProhibition(initialProhibition.name);
      notifications.show({
        color: 'green',
        title: 'Prohibition Deleted',
        message: 'Prohibition has been deleted successfully',
      });
      onSuccess(undefined, 'delete');
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Delete Error',
        message: (error as Error).message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [initialProhibition, onSuccess]);

  return (
      <Box p="md">
        <Stack gap="md">
          {/* Process Prohibition Alert */}
          {isProcessProhibition && (
              <Alert variant="light" color="yellow">
                <Text size="sm">
                  This is a process prohibition and can only be deleted, not edited.
                </Text>
              </Alert>
          )}

          {/* Name Field */}
          <TextInput
              label="Name"
              required
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
              disabled={isEditing || isProcessProhibition} // Name cannot be changed when editing or for process prohibitions
          />

          {/* Subject Selection */}
          <Box>
            <Text size="sm" fw={500} mb="xs">Subject *</Text>
            <Box style={{}}>
              {/* Process Prohibition - show user ID and process (read-only) */}
              {isProcessProhibition && initialProhibition?.subject && (
                  <Stack gap="xs">
                    <Group justify="space-between" style={{
                      padding: '8px 12px',
                      border: '1px solid var(--mantine-color-gray-2)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--mantine-color-gray-1)'
                    }}>
                      <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
                        <Text size="xs" c="dimmed" fw={500}>User ID:</Text>
                        <Text size="sm" style={{ flex: 1 }}>
                          {initialProhibition.subject.node?.id != null ? String(initialProhibition.subject.node.id) : 'N/A'}
                        </Text>
                      </Group>
                    </Group>
                    <Group justify="space-between" style={{
                      padding: '8px 12px',
                      border: '1px solid var(--mantine-color-gray-2)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--mantine-color-gray-1)'
                    }}>
                      <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
                        <Text size="xs" c="dimmed" fw={500}>Process:</Text>
                        <Text size="sm" style={{ flex: 1 }}>
                          {initialProhibition.subject.process}
                        </Text>
                      </Group>
                    </Group>
                  </Stack>
              )}

              {/* Node Prohibition - normal subject selection */}
              {!isProcessProhibition && (
                  <>
                    {!subject && !isEditing && (
                        <Alert variant="light" color="blue" mb="sm">
                          <Text size="sm">
                            Click "Select Subject" to choose a U or UA node
                          </Text>
                        </Alert>
                    )}
                    {subject && (
                        <Group justify="space-between" style={{
                          padding: '8px 12px',
                          border: '1px solid var(--mantine-color-gray-2)',
                          borderRadius: '4px',
                          backgroundColor: isEditing ? 'var(--mantine-color-gray-1)' : 'white'
                        }}>
                          <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
                            <NodeIcon type={subject.type} size={18} />
                            <Text
                                size="sm"
                                style={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  flex: 1
                                }}
                            >
                              {subject.name}
                            </Text>
                          </Group>
                          {!isEditing && (
                              <Group gap={4}>
                                <ActionIcon
                                    size="sm"
                                    variant="subtle"
                                    onClick={handleOpenSubjectPicker}
                                    title="Change"
                                >
                                  <IconEdit size={16} />
                                </ActionIcon>
                                <ActionIcon
                                    size="sm"
                                    variant="subtle"
                                    color="red"
                                    onClick={handleRemoveSubject}
                                >
                                  <IconSquareRoundedMinus size={16} />
                                </ActionIcon>
                              </Group>
                          )}
                        </Group>
                    )}
                  </>
              )}
            </Box>

            {!subject && !isEditing && !isProcessProhibition && (
                <Group justify="flex-start" mt="xs">
                  <Popover
                      opened={isSubjectPickerOpen}
                      onClose={handleCloseSubjectPicker}
                      position="bottom"
                      width={520}
                      withArrow
                      shadow="md"
                  >
                    <Popover.Target>
                      <Button variant="light" size="xs" onClick={handleOpenSubjectPicker}>
                        Select Subject
                      </Button>
                    </Popover.Target>
                    <Popover.Dropdown style={{ padding: 0, height: 440, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '2px solid var(--mantine-primary-color-filled)', borderRadius: '6px' }}>
                      <Group px="sm" py={8} style={{ flexShrink: 0, backgroundColor: 'var(--mantine-primary-color-0)', borderBottom: '1px solid var(--mantine-primary-color-3)' }}>
                        <Text size="xs" fw={700} c="var(--mantine-primary-color-filled)">Select Subject Node</Text>
                      </Group>
                      <Box style={{ flex: 1, minHeight: 0 }}>
                        <PMTree
                            direction="ascendants"
                            showReset
                            showTreeFilters={false}
                            showDirection={false}
                            showCreatePolicyClass={false}
                            filterConfig={{
                              nodeTypes: [NodeType.PC, NodeType.U, NodeType.UA],
                              showIncomingAssociations: false,
                              showOutgoingAssociations: false,
                            }}
                            clickHandlers={{ onSelect: handleSubjectPickerSelect }}
                        />
                      </Box>
                      <Group gap="xs" p="xs" style={{ flexShrink: 0, borderTop: '1px solid var(--mantine-color-gray-2)', borderBottom: '1px solid var(--mantine-color-gray-2)', minHeight: 32 }}>
                        {pickingSubjectNode ? (
                            <>
                              <NodeIcon type={pickingSubjectNode.type} size={18} />
                              <Text size="xs" fw={500} style={{ flex: 1 }}>{pickingSubjectNode.name}</Text>
                            </>
                        ) : (
                            <Text size="xs" c="dimmed">No node selected</Text>
                        )}
                      </Group>
                      <Group justify="flex-end" gap="xs" p="xs" style={{ flexShrink: 0 }}>
                        <Button size="xs" variant="subtle" color="gray" onClick={handleCloseSubjectPicker}>Cancel</Button>
                        <Button size="xs" disabled={!pickingSubjectNode} onClick={handleConfirmSubjectPicker}>Set</Button>
                      </Group>
                    </Popover.Dropdown>
                  </Popover>
                </Group>
            )}
          </Box>

          {/* Access Rights */}
          <Box>
            <Text size="sm" fw={500} mb="xs">Access Rights *</Text>
            <Box style={{ height: '250px', border: '1px solid var(--mantine-color-gray-3)', borderRadius: '4px', overflow: 'hidden' }}>
              <AccessRightsSelection
                  selectedRights={selectedAccessRights}
                  onRightsChange={setSelectedAccessRights}
                  resourceAccessRights={resourceOperations}
                  readOnly={isEditing || isProcessProhibition}
              />
            </Box>
          </Box>

          {/* Conjunctive Checkbox */}
          <Checkbox
              label="Conjunctive"
              checked={isConjunctive}
              onChange={(event) => setIsConjunctive(event.currentTarget.checked)}
              disabled={isEditing || isProcessProhibition}
          />

          {/* Inclusion Set */}
          <Box>
            <Text size="sm" fw={500} mb="xs">Inclusion Set</Text>
            <Box style={{
              maxHeight: "150px",
              overflow: "auto",
            }}>
              {inclusionSet.length === 0 && (
                  <Alert variant="light" color="gray" mb="sm">
                    <Text size="sm">No nodes in inclusion set</Text>
                  </Alert>
              )}
              <Stack gap="xs">
                {inclusionSet.map((node) => (
                    <Group key={node.id} justify="space-between" style={{
                      padding: '8px 12px',
                      border: '1px solid var(--mantine-color-gray-2)',
                      borderRadius: '4px',
                      backgroundColor: (isEditing || isProcessProhibition) ? 'var(--mantine-color-gray-1)' : 'white'
                    }}>
                      <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
                        <NodeIcon type={node.type} size={18} />
                        <Text size="sm" style={{ flex: 1 }}>
                          {node.name}
                        </Text>
                      </Group>
                      {!isEditing && !isProcessProhibition && (
                          <ActionIcon
                              size="sm"
                              variant="subtle"
                              color="red"
                              onClick={() => handleRemoveFromInclusionSet(node)}
                          >
                            <IconSquareRoundedMinus size={16} />
                          </ActionIcon>
                      )}
                    </Group>
                ))}
              </Stack>
            </Box>

            {!isEditing && !isProcessProhibition && (
                <Group justify="flex-start" mt="xs">
                  <Popover
                      opened={isInclusionPickerOpen}
                      onClose={handleCloseInclusionPicker}
                      position="bottom"
                      width={520}
                      withArrow
                      shadow="md"
                  >
                    <Popover.Target>
                      <Button variant="light" size="xs" onClick={handleOpenInclusionPicker}>
                        Add to Inclusion
                      </Button>
                    </Popover.Target>
                    <Popover.Dropdown style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '2px solid var(--mantine-primary-color-filled)', borderRadius: '6px' }}>
                      <Group px="sm" py={8} style={{ flexShrink: 0, backgroundColor: 'var(--mantine-primary-color-0)', borderBottom: '1px solid var(--mantine-primary-color-3)' }}>
                        <Text size="xs" fw={700} c="var(--mantine-primary-color-filled)">Select Node to Add</Text>
                      </Group>
                      <Box style={{ height: 300, minHeight: 0 }}>
                        <PMTree
                            direction="ascendants"
                            showReset
                            showTreeFilters={false}
                            showDirection={false}
                            showCreatePolicyClass={false}
                            filterConfig={{
                              nodeTypes: NODE_TYPES,
                              showIncomingAssociations: false,
                              showOutgoingAssociations: false,
                            }}
                            clickHandlers={{ onSelect: handleInclusionPickerSelect }}
                        />
                      </Box>
                      <Group gap="xs" p="xs" style={{ flexShrink: 0, borderTop: '1px solid var(--mantine-color-gray-2)', borderBottom: '1px solid var(--mantine-color-gray-2)', minHeight: 32 }}>
                        {pickingInclusionNode ? (
                            <>
                              <NodeIcon type={pickingInclusionNode.type} size={18} />
                              <Text size="xs" fw={500} style={{ flex: 1 }}>{pickingInclusionNode.name}</Text>
                            </>
                        ) : (
                            <Text size="xs" c="dimmed">No node selected</Text>
                        )}
                      </Group>
                      <Group justify="flex-end" gap="xs" p="xs" style={{ flexShrink: 0 }}>
                        <Button size="xs" variant="subtle" color="gray" onClick={handleCloseInclusionPicker}>Done</Button>
                        <Button size="xs" disabled={!pickingInclusionNode} onClick={handleAddInclusionPick}>Add</Button>
                      </Group>
                    </Popover.Dropdown>
                  </Popover>
                </Group>
            )}
          </Box>

          {/* Exclusion Set */}
          <Box>
            <Text size="sm" fw={500} mb="xs">Exclusion Set</Text>
            <Box style={{
              maxHeight: "150px",
              overflow: "auto",
            }}>
              {exclusionSet.length === 0 && (
                  <Alert variant="light" color="gray" mb="sm">
                    <Text size="sm">No nodes in exclusion set</Text>
                  </Alert>
              )}
              <Stack gap="xs">
                {exclusionSet.map((node) => (
                    <Group key={node.id} justify="space-between" style={{
                      padding: '8px 12px',
                      border: '1px solid var(--mantine-color-gray-2)',
                      borderRadius: '4px',
                      backgroundColor: (isEditing || isProcessProhibition) ? 'var(--mantine-color-gray-1)' : 'white'
                    }}>
                      <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
                        <NodeIcon type={node.type} size={18} />
                        <Text size="sm" style={{ flex: 1 }}>
                          {node.name}
                        </Text>
                      </Group>
                      {!isEditing && !isProcessProhibition && (
                          <ActionIcon
                              size="sm"
                              variant="subtle"
                              color="red"
                              onClick={() => handleRemoveFromExclusionSet(node)}
                          >
                            <IconSquareRoundedMinus size={16} />
                          </ActionIcon>
                      )}
                    </Group>
                ))}
              </Stack>
            </Box>

            {!isEditing && !isProcessProhibition && (
                <Group justify="flex-start" mt="xs">
                  <Popover
                      opened={isExclusionPickerOpen}
                      onClose={handleCloseExclusionPicker}
                      position="bottom"
                      width={520}
                      withArrow
                      shadow="md"
                  >
                    <Popover.Target>
                      <Button variant="light" size="xs" onClick={handleOpenExclusionPicker}>
                        Add to Exclusion
                      </Button>
                    </Popover.Target>
                    <Popover.Dropdown style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '2px solid var(--mantine-primary-color-filled)', borderRadius: '6px' }}>
                      <Group px="sm" py={8} style={{ flexShrink: 0, backgroundColor: 'var(--mantine-primary-color-0)', borderBottom: '1px solid var(--mantine-primary-color-3)' }}>
                        <Text size="xs" fw={700} c="var(--mantine-primary-color-filled)">Select Node to Add</Text>
                      </Group>
                      <Box style={{ height: 300, minHeight: 0 }}>
                        <PMTree
                            direction="ascendants"
                            showReset
                            showTreeFilters={false}
                            showDirection={false}
                            showCreatePolicyClass={false}
                            filterConfig={{
                              nodeTypes: NODE_TYPES,
                              showIncomingAssociations: false,
                              showOutgoingAssociations: false,
                            }}
                            clickHandlers={{ onSelect: handleExclusionPickerSelect }}
                        />
                      </Box>
                      <Group gap="xs" p="xs" style={{ flexShrink: 0, borderTop: '1px solid var(--mantine-color-gray-2)', borderBottom: '1px solid var(--mantine-color-gray-2)', minHeight: 32 }}>
                        {pickingExclusionNode ? (
                            <>
                              <NodeIcon type={pickingExclusionNode.type} size={18} />
                              <Text size="xs" fw={500} style={{ flex: 1 }}>{pickingExclusionNode.name}</Text>
                            </>
                        ) : (
                            <Text size="xs" c="dimmed">No node selected</Text>
                        )}
                      </Group>
                      <Group justify="flex-end" gap="xs" p="xs" style={{ flexShrink: 0 }}>
                        <Button size="xs" variant="subtle" color="gray" onClick={handleCloseExclusionPicker}>Done</Button>
                        <Button size="xs" disabled={!pickingExclusionNode} onClick={handleAddExclusionPick}>Add</Button>
                      </Group>
                    </Popover.Dropdown>
                  </Popover>
                </Group>
            )}
          </Box>

          <Divider />

          {/* Action Buttons */}
          <Group justify="center" gap="md">
            {(isEditing || isProcessProhibition) ? (
                <>
                  <Button
                      color="red"
                      loading={isSubmitting}
                      onClick={handleDelete}
                  >
                    Delete
                  </Button>
                  <Button
                      variant="outline"
                      onClick={onCancel}
                      disabled={isSubmitting}
                  >
                    Close
                  </Button>
                </>
            ) : (
                <>
                  <Button
                      color="var(--mantine-primary-filled)"
                      loading={isSubmitting}
                      onClick={handleSubmit}
                      disabled={!name.trim() || !subject || selectedAccessRights.length === 0}
                  >
                    Create
                  </Button>
                  <Button
                      variant="outline"
                      onClick={onCancel}
                      disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </>
            )}
          </Group>
        </Stack>
      </Box>
  );
}
import React, { useCallback, useEffect, useState } from 'react';
import { useSetAtom } from 'jotai';
import { IconPlus } from '@tabler/icons-react';
import { Accordion, Button, Group, Loader, Modal, Stack, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { PMTree, TreeFilterConfig } from '@/features/pmtree';
import { selectedNodeAtom } from '../dashboard2-atoms';
import { PANEL_RADIUS } from '../Dashboard2Page';
import {
  NodeIcon,
  sortTreeNodes,
  transformNodeToTreeNode,
  TreeNode,
} from '@/features/pmtree/tree-utils';
import * as AdjudicationService from '@/shared/api/pdp_adjudication.api';
import * as QueryService from '@/shared/api/pdp_query.api';
import { NodeType, PMNode } from '@/shared/api/pdp.types';

const DIVIDER = 'var(--mantine-color-gray-2)';
// Floor for the expanded detail panel so it stays readable when many policy
// classes are listed; the accordion scrolls instead of crushing the tree.
const PANEL_MIN_HEIGHT = 420;

const TREE_FILTERS: TreeFilterConfig = {
  nodeTypes: [NodeType.PC, NodeType.UA, NodeType.OA, NodeType.U, NodeType.O],
  showOutgoingAssociations: false,
  showIncomingAssociations: true,
};

// ─── Accordion panel content: tree for a single PC, loaded on first expand ───────

function PcTreePanel({ pc, active }: { pc: PMNode; active: boolean }) {
  const [rootNodes, setRootNodes] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const setSelectedNode = useSetAtom(selectedNodeAtom);

  useEffect(() => {
    if (!active || loaded) return;
    setLoading(true);
    QueryService.selfComputeAdjacentAscendantPrivileges(pc.id)
      .then((privileges) => {
        const nodes = sortTreeNodes(
          privileges
            .filter((p) => p.node !== undefined)
            .map((p) => ({ ...transformNodeToTreeNode(p.node!), privileges: p.accessRights }))
        );
        setRootNodes(nodes);
        setLoaded(true);
      })
      .finally(() => setLoading(false));
  }, [active, loaded, pc.id]);

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        overflow: 'hidden',
        borderTop: `1px solid ${DIVIDER}`,
      }}
    >
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        {loading ? (
          <Group justify="center" mt="xl">
            <Loader size="sm" />
          </Group>
        ) : (
          <PMTree
            style={{ width: '100%', height: '100%' }}
            direction="ascendants"
            rootNodes={rootNodes}
            filterConfig={TREE_FILTERS}
            showTreeFilters
            showDirection
            showCreatePolicyClass={false}
            showReset
            clickHandlers={{ onLeftClick: setSelectedNode }}
          />
        )}
      </div>
    </div>
  );
}

// ─── PC accordion list (master + inline detail) ──────────────────────────────────

function PcAccordion({ leftPanelVisible }: { leftPanelVisible: boolean }) {
  const [pcs, setPcs] = useState<PMNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [createOpened, setCreateOpened] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchPcs = useCallback(() => {
    setLoading(true);
    return QueryService.getPolicyClasses()
      .then(setPcs)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPcs();
  }, [fetchPcs]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;

    setCreating(true);
    try {
      await AdjudicationService.createPolicyClass(name);
      notifications.show({
        title: 'Policy Class Created',
        message: `Successfully created "${name}"`,
        color: 'green',
      });
      setCreateOpened(false);
      setNewName('');
      await fetchPcs();
    } catch (error) {
      notifications.show({
        title: 'Create Error',
        message: `Failed to create policy class: ${(error as Error).message}`,
        color: 'red',
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Header — padding/border matches the User Attributes panel title so the two stay aligned */}
        <div
          style={{
            padding: '14px 16px 12px',
            borderBottom: '1px solid var(--mantine-color-gray-2)',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <Group gap={8}>
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
              Policy Classes
            </Text>
            {!loading && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 20,
                  height: 20,
                  paddingInline: 6,
                  borderRadius: PANEL_RADIUS,
                  backgroundColor: 'var(--mantine-color-gray-1)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--mantine-color-gray-6)',
                  lineHeight: 1,
                }}
              >
                {pcs.length}
              </div>
            )}
          </Group>
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              paddingInline: leftPanelVisible ? 16 : 48,
              paddingBlock: 24,
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Group justify="flex-start" mb={16}>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconPlus size={14} />}
                onClick={() => setCreateOpened(true)}
              >
                New Policy Class
              </Button>
            </Group>

            {loading ? (
              <Group justify="center" mt="xl">
                <Loader size="sm" />
              </Group>
            ) : pcs.length === 0 ? (
              <Text size="xs" c="dimmed" ta="center" mt={40}>
                No policy classes
              </Text>
            ) : (
              <Accordion
                value={expanded}
                onChange={setExpanded}
                variant="separated"
                chevronPosition="right"
                style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}
                styles={{
                  control: { flexShrink: 0 },
                  panel: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' },
                  content: { padding: 0, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' },
                }}
              >
                {pcs.map((pc) => {
                  const value = String(pc.id);
                  return (
                    <Accordion.Item
                      key={value}
                      value={value}
                      style={
                        expanded === value
                          ? {
                              display: 'flex',
                              flexDirection: 'column',
                              flex: 1,
                              minHeight: PANEL_MIN_HEIGHT,
                            }
                          : undefined
                      }
                    >
                      <Accordion.Control icon={<NodeIcon type={NodeType.PC} size={20} />}>
                        <Text fw={500} size="sm">
                          {pc.name}
                        </Text>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <PcTreePanel pc={pc} active={expanded === value} />
                      </Accordion.Panel>
                    </Accordion.Item>
                  );
                })}
              </Accordion>
            )}
          </div>
        </div>
      </div>

      <Modal
        opened={createOpened}
        onClose={() => setCreateOpened(false)}
        title={
          <Text size="lg" fw={600}>
            New Policy Class
          </Text>
        }
        size="sm"
      >
        <Stack gap="md">
          <TextInput
            label="Name"
            placeholder="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (newName.trim()) handleCreate();
              }
            }}
            data-autofocus
            required
            leftSection={<NodeIcon type={NodeType.PC} size={20} />}
          />

          <Group justify="flex-end" gap="sm" mt="md">
            <Button variant="outline" onClick={() => setCreateOpened(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim()} loading={creating}>
              Create
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function MockupB({ leftPanelVisible = false }: { leftPanelVisible?: boolean }) {
  return (
    <div style={{ height: '100%', overflow: 'hidden' }}>
      <PcAccordion leftPanelVisible={leftPanelVisible} />
    </div>
  );
}

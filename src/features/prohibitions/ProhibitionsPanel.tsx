import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    Box,
    Text,
    Group,
    Title,
    Stack,
    Center,
    Button,
    Select
} from "@mantine/core";
import { IconBan } from "@tabler/icons-react";
import { ProhibitionDetails } from "./ProhibitionDetails";
import { Prohibition } from "@/shared/api/pdp.types";
import * as QueryService from "@/shared/api/pdp_query.api";
import { TreeNode } from "@/features/pmtree/tree-utils";
import { ListDetailPanel } from "@/components/ListDetailPanel";

interface ProhibitionsPanelProps {
    selectedNodes?: TreeNode[];
}

export function ProhibitionsPanel({ selectedNodes }: ProhibitionsPanelProps) {
    const [prohibitions, setProhibitions] = useState<Prohibition[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedProhibition, setSelectedProhibition] = useState<string | null>(null);
    const [isCreatingNew, setIsCreatingNew] = useState(false);

    // Fetch prohibitions on component mount
    const fetchProhibitions = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const fetchedProhibitions = await QueryService.getProhibitions();
            setProhibitions(fetchedProhibitions);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProhibitions();
    }, [fetchProhibitions]);

    const handleCreateNew = useCallback(() => {
        setIsCreatingNew(true);
        setSelectedProhibition(null);
    }, []);

    const handleSelectProhibition = useCallback((name: string) => {
        setSelectedProhibition(name);
        setIsCreatingNew(false);
    }, []);

    const handleCancelCreate = useCallback(() => {
        setIsCreatingNew(false);
    }, []);

    const handleCreateSuccess = useCallback((prohibition?: Prohibition, action?: 'create' | 'update' | 'delete') => {
        setIsCreatingNew(false);

        if (action === 'create' && prohibition) {
            // Manually append the new prohibition to the list
            setProhibitions(prev => [...prev, prohibition]);
            setSelectedProhibition(prohibition.name);
        }
    }, []);

    const handleEditSuccess = useCallback((prohibition?: Prohibition, action?: 'create' | 'update' | 'delete') => {
        if (action === 'update' && prohibition) {
            // Manually update the prohibition in the list
            setProhibitions(prev =>
                prev.map(p => p.name === prohibition.name ? prohibition : p)
            );
        } else if (action === 'delete') {
            // Manually remove the prohibition from the list
            if (selectedProhibition) {
                setProhibitions(prev => prev.filter(p => p.name !== selectedProhibition));
                setSelectedProhibition(null);
            }
        }
    }, [selectedProhibition]);

    // Get the currently selected prohibition object
    const currentProhibition = useMemo(() => {
        if (!selectedProhibition) return null;
        return prohibitions.find(p => p.name === selectedProhibition) || null;
    }, [prohibitions, selectedProhibition]);

    const aboveDetail = (
        <Select
            searchable
            clearable
            placeholder="Search..."
            data={prohibitions.map(p => p.name).sort((a, b) => a.localeCompare(b))}
            value={selectedProhibition}
            onChange={(v) => {
                if (v) {
                    handleSelectProhibition(v);
                } else {
                    setSelectedProhibition(null);
                    setIsCreatingNew(false);
                }
            }}
            comboboxProps={{ withinPortal: false }}
            style={{ width: '100%' }}
        />
    );

    const detailContent = isCreatingNew ? (
        <Box style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '0 10px 10px 10px' }}>
            <Box style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <ProhibitionDetails
                    selectedNodes={selectedNodes}
                    onCancel={handleCancelCreate}
                    onSuccess={handleCreateSuccess}
                />
            </Box>
        </Box>
    ) : currentProhibition ? (
        <Box p="md" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Group mb="md" justify="space-between">
                <Stack gap={0}>
                    <Title order={5}>{currentProhibition.name}</Title>
                    <Text size="sm" c="dimmed">Subject: {currentProhibition.subject?.node?.name || 'Unknown'}</Text>
                </Stack>
            </Group>
            <Box style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <ProhibitionDetails
                    selectedNodes={selectedNodes}
                    initialProhibition={currentProhibition}
                    isEditing
                    onCancel={() => setSelectedProhibition(null)}
                    onSuccess={handleEditSuccess}
                />
            </Box>
        </Box>
    ) : (
        <Center style={{ height: '100%' }}>
            <Stack align="center" gap="xs">
                <IconBan size={48} color="gray" />
                <Text c="dimmed" size="sm">Select a prohibition to view details</Text>
            </Stack>
        </Center>
    );

    return (
        <ListDetailPanel
            title="Prohibitions"
            onCreateClick={handleCreateNew}
            isCreatingNew={isCreatingNew}
            onRefresh={fetchProhibitions}
            refreshDisabled={loading}
            aboveDetail={aboveDetail}
            detailContent={detailContent}
            loading={loading}
            error={error}
        />
    );
}

import React, { ReactNode } from "react";
import {
    ActionIcon,
    Alert,
    Box,
    Button,
    Center,
    Group,
    Loader,
    Stack,
    Text,
    TextInput,
    Title,
} from "@mantine/core";
import { IconPlus, IconRefresh, IconSearch } from "@tabler/icons-react";

interface ListDetailPanelProps {
    // Header
    title: string;
    headerButtons?: ReactNode;
    onCreateClick?: () => void;
    isCreatingNew?: boolean;

    // List (left panel) — omit listContent to use above-detail layout
    filterText?: string;
    onFilterChange?: (text: string) => void;
    onRefresh: () => void;
    refreshDisabled?: boolean;
    listContent?: ReactNode;
    listHeader?: ReactNode;

    // Above-detail content (replaces left panel when listContent is absent)
    aboveDetail?: ReactNode;

    // Details (right panel)
    detailContent: ReactNode;

    // States
    loading?: boolean;
    loadingMessage?: string;
    error?: string | null;
}

export function ListDetailPanel({
    title,
    headerButtons,
    onCreateClick,
    isCreatingNew,
    filterText,
    onFilterChange,
    onRefresh,
    refreshDisabled,
    listContent,
    listHeader,
    aboveDetail,
    detailContent,
    loading,
    loadingMessage,
    error,
}: ListDetailPanelProps) {
    if (loading) {
        return (
            <Center style={{ height: '100%' }}>
                <Stack align="center" gap="md">
                    <Loader />
                    <Text size="sm" c="dimmed">{loadingMessage ?? `Loading ${title.toLowerCase()}...`}</Text>
                </Stack>
            </Center>
        );
    }

    if (error) {
        return (
            <Box p="md">
                <Alert variant="light" color="red" title={`Error loading ${title.toLowerCase()}`}>
                    {error}
                </Alert>
            </Box>
        );
    }

    return (
        <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Box p="sm" pb="sm">
                <Group>
                    <Title order={4}>{title}</Title>
                    {onCreateClick && (
                        <Button
                            variant="filled"
                            color="var(--mantine-primary-color-filled)"
                            onClick={onCreateClick}
                            disabled={isCreatingNew}
                            leftSection={<IconPlus size={20} />}
                        >
                            Create
                        </Button>
                    )}
                    {headerButtons}
                </Group>
            </Box>

            {/* Content */}
            {listContent ? (
                /* Side-by-side layout when list is present */
                <Box style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
                    {/* Left Panel - List */}
                    <Box style={{ width: '30%', borderRight: '1px solid var(--mantine-color-default-border)', display: 'flex', flexDirection: 'column' }}>
                        <Box p="sm">
                            <Group gap="xs">
                                {onFilterChange && (
                                    <TextInput
                                        placeholder={`Filter ${title.toLowerCase()}...`}
                                        value={filterText ?? ""}
                                        onChange={(event) => onFilterChange(event.currentTarget.value)}
                                        leftSection={<IconSearch size={16} />}
                                        size="sm"
                                        style={{ flex: 1 }}
                                    />
                                )}
                                <ActionIcon
                                    variant="light"
                                    color="var(--mantine-primary-color-filled)"
                                    onClick={onRefresh}
                                    disabled={refreshDisabled}
                                >
                                    <IconRefresh size={20} />
                                </ActionIcon>
                            </Group>
                        </Box>
                        <Box style={{ flex: 1, overflowY: 'auto' }}>
                            {listHeader}
                            {listContent}
                        </Box>
                    </Box>
                    {/* Right Panel - Details */}
                    <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        {detailContent}
                    </Box>
                </Box>
            ) : (
                /* Single-column layout: above-detail content stacked on top of detail */
                <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {aboveDetail && (
                        <Box p="sm">
                            <Group gap="xs">
                                <ActionIcon
                                    variant="light"
                                    color="var(--mantine-primary-color-filled)"
                                    onClick={onRefresh}
                                    disabled={refreshDisabled}
                                >
                                    <IconRefresh size={20} />
                                </ActionIcon>
                                <Box style={{ flex: 1 }}>{aboveDetail}</Box>
                            </Group>
                        </Box>
                    )}
                    <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        {detailContent}
                    </Box>
                </Box>
            )}
        </Box>
    );
}

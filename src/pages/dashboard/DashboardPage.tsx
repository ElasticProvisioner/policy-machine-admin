import React, { useState } from 'react';
import { useAtom } from 'jotai';
import { ActionIcon, Button, ColorPicker, MantineProvider, Popover, Text, Title, Tooltip } from '@mantine/core';
import { IconPalette, IconX } from '@tabler/icons-react';
import { PMIcon } from '@/components/icons/PMIcon';
import { UserMenu } from '@/features/user-menu/UserMenu';
import { InfoPanel } from '@/features/info/InfoPanel';
import { useTheme } from '@/shared/theme/ThemeContext';
import { PANEL_RADIUS } from '@/theme';
import { DashboardSidebar } from './DashboardSidebar';
import { Dashboard } from './Dashboard';
import { DashboardPanel } from './DashboardPanel';
import { selectedNodeAtom, startAssociationAtom } from './dashboard-atoms';

export const SIDEBAR_EXPANDED_WIDTH = 220;
export const SIDEBAR_COLLAPSED_WIDTH = 50;

// Re-exported for existing consumers; canonical definition lives in '@/theme'.
export { PANEL_RADIUS };

const CARD: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    backgroundColor: 'var(--mantine-color-white)',
    borderRadius: PANEL_RADIUS,
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column',
};

const SWATCHES = [
    // grays
    '#e9ecef', '#dee2e6', '#ced4da', '#adb5bd',
    // warm
    '#fff3e0', '#ffe0b2', '#ffd7c2', '#f5c2c7',
    // cool blues / purples
    '#e3f2fd', '#dce8fc', '#e8eaf6', '#ede7f6',
    // greens
    '#e8f5e9', '#d4edda', '#c8f5c8', '#b2dfdb',
    // dark / dramatic
    '#343a40', '#2b2d30', '#1e1f22', '#1a1b1e',
];

export function DashboardPage() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
        () => localStorage.getItem('dashboard-sidebar-collapsed') === 'true'
    );
    const [activeId, setActiveId] = useState<string | null>(null);
    const [bgColor, setBgColor] = useState<string>('#e9ecef');
    const [selectedNode, setSelectedNode] = useAtom(selectedNodeAtom);
    const [startAssociation, setStartAssociation] = useAtom(startAssociationAtom);
    const { theme, themeMode } = useTheme();

    const closeInfo = () => {
        setSelectedNode(null);
        setStartAssociation(null);
    };

    const sidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;

    const handleCollapse = (v: boolean) => {
        setSidebarCollapsed(v);
        localStorage.setItem('dashboard-sidebar-collapsed', String(v));
    };

    const handleNavigate = (id: string) =>
        setActiveId((prev) => (prev === id ? null : id));

    return (
        <MantineProvider
            theme={{
                ...theme,
                defaultRadius: PANEL_RADIUS,
                // Make every button in the dashboard match the "New Policy Class"
                // button by default. Buttons that set an explicit variant (e.g.
                // destructive red, subtle "Cancel") keep their own styling.
                components: {
                    ...theme.components,
                    Button: Button.extend({ defaultProps: { variant: 'light', size: 'xs' } }),
                },
            }}
            defaultColorScheme={themeMode}
            forceColorScheme={themeMode}
        >
        <div
            style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: bgColor,
                overflow: 'hidden',
            }}
        >
            {/* ── Header ── */}
            <div style={{ height: 48, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                <div
                    style={{
                        width: sidebarWidth,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        paddingInline: sidebarCollapsed ? 0 : 14,
                        justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                        gap: 8,
                        transition: 'width 150ms ease, padding 150ms ease',
                        overflow: 'hidden',
                    }}
                >
                    <PMIcon style={{ width: 28, height: 28, flexShrink: 0 }} />
                    {!sidebarCollapsed && (
                        <Title order={5} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            Policy Machine
                        </Title>
                    )}
                </div>

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, paddingInline: 16 }}>
                    <Popover position="bottom-end" withinPortal>
                        <Popover.Target>
                            <Tooltip label="Background color" position="bottom">
                                <ActionIcon variant="subtle" color="gray" size="md">
                                    <IconPalette size={18} />
                                </ActionIcon>
                            </Tooltip>
                        </Popover.Target>
                        <Popover.Dropdown p="sm">
                            <ColorPicker
                                format="hex"
                                value={bgColor}
                                onChange={setBgColor}
                                swatches={SWATCHES}
                                swatchesPerRow={4}
                            />
                        </Popover.Dropdown>
                    </Popover>

                    <UserMenu />
                </div>
            </div>

            {/* ── Body ── */}
            <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                <DashboardSidebar
                    collapsed={sidebarCollapsed}
                    onCollapse={handleCollapse}
                    activeId={activeId}
                    onNavigate={handleNavigate}
                />

                <div
                    style={{
                        flex: 1,
                        minWidth: 0,
                        padding: '0 12px 12px 0',
                        display: 'flex',
                        gap: 12,
                    }}
                >
                    {activeId && (
                        <div style={CARD}>
                            <DashboardPanel activeId={activeId} onClose={() => setActiveId(null)} />
                        </div>
                    )}

                    <div style={CARD}>
                        <Dashboard leftPanelVisible={!!activeId} />
                    </div>

                    {selectedNode && (
                        <div style={{ ...CARD, flex: '0 0 33%' }}>
                            <div
                                style={{
                                    padding: '14px 8px 12px 16px',
                                    borderBottom: '1px solid var(--mantine-color-gray-2)',
                                    flexShrink: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 8,
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
                                    Node Info
                                </Text>
                                <ActionIcon
                                    variant="subtle"
                                    color="gray"
                                    size="sm"
                                    onClick={closeInfo}
                                    style={{ marginBlock: -2 }}
                                >
                                    <IconX size={16} />
                                </ActionIcon>
                            </div>
                            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                                <InfoPanel
                                    rootNode={selectedNode}
                                    layout="stacked"
                                    startAssociation={startAssociation ?? undefined}
                                    onClose={closeInfo}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
        </MantineProvider>
    );
}

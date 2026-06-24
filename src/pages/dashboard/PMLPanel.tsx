import React, { useState } from 'react';
import { Group, ScrollArea, Text, ThemeIcon } from '@mantine/core';
import { IconAlertCircle, IconCircleCheck } from '@tabler/icons-react';
import { PMLEditor } from '@/features/pml/PMLEditor';
import * as AdjudicationService from '@/shared/api/pdp_adjudication.api';
import * as Model from '@/generated/grpc/v1/model';
import { PanelTitle } from './DashboardPanel';

function valueToJs(value: Model.Value | undefined): unknown {
    if (!value) return undefined;
    if (value.stringValue !== undefined) return value.stringValue;
    if (value.int64Value !== undefined) return value.int64Value.toString();
    if (value.boolValue !== undefined) return value.boolValue;
    if (value.listValue) return value.listValue.values.map(valueToJs);
    if (value.mapValue) {
        return Object.fromEntries(
            Object.entries(value.mapValue.values).map(([key, v]) => [key, valueToJs(v)])
        );
    }
    return undefined;
}

type OutputEntry = {
    status: 'success' | 'error';
    message: string;
};

export function PMLPanel() {
    const [output, setOutput] = useState<OutputEntry | null>(null);

    const handleExecute = async (pml: string) => {
        try {
            const response = await AdjudicationService.executePML(pml);
            console.log(response);
            const result = valueToJs(response.value);
            setOutput({
                status: 'success',
                message: result === undefined ? 'Executed successfully.' : JSON.stringify(result, null, 2),
            });
        } catch (error) {
            setOutput({
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error occurred',
            });
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <PanelTitle>PML Editor</PanelTitle>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: 12, gap: 12 }}>
                <div style={{ flex: 2, minHeight: 0 }}>
                    <PMLEditor onExecute={handleExecute} containerHeight="100%" autoFocus />
                </div>

                <div
                    style={{
                        flex: 1,
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        border: '1px solid var(--mantine-color-gray-3)',
                        borderRadius: 8,
                    }}
                >
                    <Group
                        justify="space-between"
                        wrap="nowrap"
                        style={{ padding: '6px 12px', borderBottom: '1px solid var(--mantine-color-gray-2)', flexShrink: 0 }}
                    >
                        <Text
                            size="xs"
                            fw={700}
                            c="dimmed"
                            style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
                        >
                            Output
                        </Text>
                        {output && (
                            <ThemeIcon
                                size="sm"
                                variant="light"
                                color={output.status === 'success' ? 'green' : 'red'}
                            >
                                {output.status === 'success'
                                    ? <IconCircleCheck size={14} />
                                    : <IconAlertCircle size={14} />}
                            </ThemeIcon>
                        )}
                    </Group>

                    <ScrollArea style={{ flex: 1 }} p="sm">
                        {output ? (
                            <Text
                                size="sm"
                                c={output.status === 'success' ? undefined : 'red'}
                                style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12 }}
                            >
                                {output.message}
                            </Text>
                        ) : (
                            <Text size="sm" c="dimmed">Execute PML to see output here.</Text>
                        )}
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
}

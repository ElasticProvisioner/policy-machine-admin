import React from 'react';
import { Center, Text, Stack } from '@mantine/core';

const GraphPanel: React.FC = () => {
  return (
    <Center style={{ height: '100%', width: '100%' }}>
      <Stack align="center" gap="xs">
        <Text size="xl" fw={700}>Graph</Text>
        <Text c="dimmed">Graph visualization coming soon...</Text>
      </Stack>
    </Center>
  );
};

export default GraphPanel;

import { AppShell, Group, Title, useMantineTheme } from '@mantine/core';
import { PMIcon } from '@/components/icons/PMIcon';
import { PMLEditor } from '@/features/pml/PMLEditor';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'pml-editor-draft';

export function PMLEditorPage() {
  const mantineTheme = useMantineTheme();
  const savedContent = localStorage.getItem(STORAGE_KEY) ?? '';

  return (
    <AppShell
      header={{ height: 40 }}
      transitionDuration={0}
      style={{ height: '100vh', overflow: 'hidden' }}
    >
      <AppShell.Header style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
        <Group h="100%" px="md">
          <Link to="/dashboard" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Group h="100%" px="md">
              <PMIcon style={{ width: '32px', height: '32px' }} />
              <Title order={3}>Policy Machine</Title>
            </Group>
          </Link>
        </Group>
      </AppShell.Header>
      <AppShell.Main
        style={{
          backgroundColor: mantineTheme.other.intellijContentBg,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          padding: '12px',
        }}
      >
        <div style={{ flex: 1, minHeight: 0, paddingTop: '40px' }}>
          <PMLEditor
            initialValue={savedContent}
            onChange={(v) => localStorage.setItem(STORAGE_KEY, v)}
            saveMode={true}
            containerHeight="100%"
            autoFocus
          />
        </div>
      </AppShell.Main>
    </AppShell>
  );
}

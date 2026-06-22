import React from 'react';
import { PolicyClassesPanel } from './PolicyClassesPanel';

export function Dashboard({ leftPanelVisible = false }: { leftPanelVisible?: boolean }) {
    return (
        <div style={{ height: '100%', overflow: 'hidden' }}>
            <PolicyClassesPanel leftPanelVisible={leftPanelVisible} />
        </div>
    );
}

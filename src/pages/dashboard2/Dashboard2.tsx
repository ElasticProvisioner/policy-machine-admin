import React from 'react';
import { MockupSwitcher } from './mockups/MockupSwitcher';

export function Dashboard2({ leftPanelVisible = false }: { leftPanelVisible?: boolean }) {
    return (
        <div style={{ height: '100%', overflow: 'hidden' }}>
            <MockupSwitcher leftPanelVisible={leftPanelVisible} />
        </div>
    );
}

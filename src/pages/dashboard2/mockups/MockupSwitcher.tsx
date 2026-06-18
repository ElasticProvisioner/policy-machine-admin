import React from 'react';
import { MockupB } from './MockupB';

export function MockupSwitcher({ leftPanelVisible = false }: { leftPanelVisible?: boolean }) {
    return (
        <div style={{ height: '100%', overflow: 'hidden' }}>
            <MockupB leftPanelVisible={leftPanelVisible} />
        </div>
    );
}

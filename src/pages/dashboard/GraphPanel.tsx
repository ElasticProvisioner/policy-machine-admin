import React from 'react';
import { DAG } from '@/pages/dag/dag';

const GraphPanel: React.FC = () => {
  return (
    <div style={{ height: '100%', width: '100%' }}>
      <DAG />
    </div>
  );
};

export default GraphPanel;

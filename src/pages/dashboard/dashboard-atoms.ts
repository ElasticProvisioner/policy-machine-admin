import { atom } from 'jotai';
import { AssociationDirection, TreeNode } from '@/features/pmtree/tree-utils';

// Node currently selected for the right-side Node Info panel in the dashboard.
// Set from the policy-class trees (PolicyClassesPanel) and read by DashboardPage
// to render the 33% detail column.
export const selectedNodeAtom = atom<TreeNode | null>(null);

// UA node selected in the left User Attributes tree. Source for the center
// tree's "Associate <UA> with <node>" context-menu action.
export const selectedUANodeAtom = atom<TreeNode | null>(null);

export type StartAssociation = {
    direction: AssociationDirection;
    otherNode: TreeNode;
    nonce: number;
};

// Pending association to start in the right Node Info InfoPanel. Set when the
// user triggers "Associate" from the center tree context menu; read by
// DashboardPage and passed through to InfoPanel (which keys off `nonce`).
export const startAssociationAtom = atom<StartAssociation | null>(null);

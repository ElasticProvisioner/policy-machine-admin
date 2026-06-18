import { atom } from 'jotai';
import { TreeNode } from '@/features/pmtree/tree-utils';

// Node currently selected for the right-side Node Info panel in Dashboard2.
// Set from the policy-class trees (MockupB) and read by Dashboard2Page to
// render the 33% detail column.
export const selectedNodeAtom = atom<TreeNode | null>(null);

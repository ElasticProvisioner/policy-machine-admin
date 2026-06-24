import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Checkbox, Collapse, ScrollArea, UnstyledButton, useMantineTheme } from '@mantine/core';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import {
	AccessRight,
	buildAccessRightsTree,
	consolidateSelections,
	findSelectedAncestor,
	getAllAccessRights,
	isAncestorSelected,
} from './AccessRightsSelection';

// Helper to find which siblings to add when deselecting via ancestor
function findDirectSiblingsToAdd(targetAr: string, ancestor: AccessRight): string[] {
	const path = findPathToNode(targetAr, ancestor);
	if (!path || path.length === 0) return [];
	const result: string[] = [];
	function collectSiblings(currentNode: AccessRight, pathIndex: number): void {
		if (!currentNode.children || !path) return;
		const nextInPath = path[pathIndex];
		for (const child of currentNode.children) {
			if (child.ar === nextInPath) {
				if (child.ar !== targetAr && pathIndex < path.length - 1) {
					collectSiblings(child, pathIndex + 1);
				}
			} else {
				result.push(child.ar);
			}
		}
	}
	collectSiblings(ancestor, 0);
	return result;
}

function findPathToNode(targetAr: string, node: AccessRight): string[] | null {
	if (node.ar === targetAr) return [];
	if (!node.children) return null;
	for (const child of node.children) {
		const childPath = findPathToNode(targetAr, child);
		if (childPath !== null) return [child.ar, ...childPath];
	}
	return null;
}

// Only the root is expanded by default — resource:* and admin:* start collapsed
function getDefaultExpandedRights(node: AccessRight): string[] {
	return node.children && node.children.length > 0 ? [node.ar] : [];
}

interface AccessRightsTreeProps {
	availableRights: string[];
	selectedRights: string[];
	onChange: (rights: string[]) => void;
	disabled?: boolean;
}

export function AccessRightsTree({
	availableRights,
	selectedRights,
	onChange,
	disabled = false,
}: AccessRightsTreeProps) {
	const theme = useMantineTheme();

	const accessRightTree = useMemo(
		() => buildAccessRightsTree(availableRights),
		[availableRights]
	);

	const [expanded, setExpanded] = useState<Set<string>>(() => {
		return new Set(getDefaultExpandedRights(accessRightTree));
	});

	const lastConsolidatedRef = useRef<string | null>(null);

	useEffect(() => {
		const consolidated = consolidateSelections(accessRightTree, selectedRights);
		const consolidatedKey = [...consolidated].sort().join(',');
		const currentKey = [...selectedRights].sort().join(',');
		if (consolidatedKey !== currentKey && consolidatedKey !== lastConsolidatedRef.current) {
			lastConsolidatedRef.current = consolidatedKey;
			onChange(consolidated);
		}
	}, [selectedRights, accessRightTree, onChange]);

	const toggleExpanded = useCallback((ar: string) => {
		setExpanded(prev => {
			const next = new Set(prev);
			if (next.has(ar)) {
				next.delete(ar);
			} else {
				next.add(ar);
			}
			return next;
		});
	}, []);

	const handleToggle = useCallback((node: AccessRight) => {
		if (disabled) return;

		const isDirectlySelected = selectedRights.includes(node.ar);
		const hasSelectedAncestor = isAncestorSelected(node.ar, accessRightTree, selectedRights);
		const isCurrentlySelected = isDirectlySelected || hasSelectedAncestor;

		let newRights: string[];

		if (isCurrentlySelected) {
			if (isDirectlySelected) {
				newRights = selectedRights.filter(r => r !== node.ar);
			} else if (hasSelectedAncestor) {
				const ancestor = findSelectedAncestor(node.ar, accessRightTree, selectedRights);
				if (ancestor) {
					const filteredRights = selectedRights.filter(r => r !== ancestor.ar);
					const siblingsToAdd = findDirectSiblingsToAdd(node.ar, ancestor);
					newRights = [...filteredRights, ...siblingsToAdd];
				} else {
					newRights = selectedRights;
				}
			} else {
				newRights = selectedRights;
			}
		} else {
			const descendantRights = node.children ? getAllAccessRights(node).slice(1) : [];
			const hasSelectedDescendant = descendantRights.some(ar => selectedRights.includes(ar));

			if (hasSelectedDescendant) {
				// Indeterminate: some but not all descendants are selected — clear them
				// rather than filling in the rest, since the checkbox isn't checked yet.
				newRights = selectedRights.filter(r => !descendantRights.includes(r));
			} else {
				newRights = [...selectedRights, node.ar];
			}
		}

		const consolidated = consolidateSelections(accessRightTree, newRights);
		onChange(consolidated);
	}, [disabled, selectedRights, accessRightTree, onChange]);

	const getCheckboxState = useCallback((node: AccessRight): { checked: boolean; indeterminate: boolean } => {
		const isDirectlySelected = selectedRights.includes(node.ar);
		const hasSelectedAncestor = isAncestorSelected(node.ar, accessRightTree, selectedRights);

		if (isDirectlySelected || hasSelectedAncestor) {
			return { checked: true, indeterminate: false };
		}

		if (node.children) {
			const allDescendants = getAllAccessRights(node).slice(1);
			const hasSelectedDescendant = allDescendants.some(ar => selectedRights.includes(ar));
			if (hasSelectedDescendant) {
				return { checked: false, indeterminate: true };
			}
		}

		return { checked: false, indeterminate: false };
	}, [selectedRights, accessRightTree]);

	const renderNode = (node: AccessRight, depth: number = 0): React.ReactNode => {
		const hasChildren = node.children && node.children.length > 0;
		const isExpandedNode = expanded.has(node.ar);
		const { checked, indeterminate } = getCheckboxState(node);

		return (
			<Box key={node.ar}>
				<Box
					style={{
						display: 'flex',
						alignItems: 'center',
						paddingLeft: depth * 16,
						paddingTop: 2,
						paddingBottom: 2,
						opacity: disabled ? 0.5 : 1,
					}}
				>
					{hasChildren ? (
						<UnstyledButton
							onClick={() => toggleExpanded(node.ar)}
							style={{
								width: 16,
								height: 16,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								marginRight: 4,
							}}
						>
							{isExpandedNode ? (
								<IconChevronDown size={14} stroke={1.5} />
							) : (
								<IconChevronRight size={14} stroke={1.5} />
							)}
						</UnstyledButton>
					) : (
						<Box style={{ width: 20 }} />
					)}
					<Checkbox
						label={node.ar}
						size="xs"
						checked={checked}
						indeterminate={indeterminate}
						onChange={() => handleToggle(node)}
						disabled={disabled}
						styles={{
							label: { fontSize: '14px', fontWeight: hasChildren ? 600 : 400, cursor: disabled ? 'default' : 'pointer' },
							input: { cursor: disabled ? 'default' : 'pointer' },
						}}
					/>
				</Box>
				{hasChildren && (
					<Collapse in={isExpandedNode}>
						{node.children!.map(child => renderNode(child, depth + 1))}
					</Collapse>
				)}
			</Box>
		);
	};

	return (
		<Box
			style={{
				display: 'flex',
				flexDirection: 'column',
				flex: 1,
				minHeight: 0,
				backgroundColor: theme.other.intellijContentBg,
			}}
		>
			<ScrollArea style={{ flex: 1 }} type="auto">
				<Box p={8}>
					{renderNode(accessRightTree, 0)}
				</Box>
			</ScrollArea>
		</Box>
	);
}

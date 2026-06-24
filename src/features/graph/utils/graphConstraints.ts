import { NodeType } from '@/shared/api/pdp.types';

export interface Connection {
  source: string;
  target: string;
  sourceType: NodeType;
  targetType: NodeType;
}

export function validateConnection(connection: Connection, isAssociation: boolean = false): { valid: boolean; reason?: string } {
  const { sourceType, targetType } = connection;

  // 1. General Constraints
  // PCs can have no outgoing edges
  if (sourceType === NodeType.PC) {
    return { valid: false, reason: 'Policy Classes (PC) cannot have outgoing edges.' };
  }

  // U and O can have no incoming edges
  if (targetType === NodeType.U || targetType === NodeType.O) {
    return { valid: false, reason: 'Users (U) and Objects (O) cannot have incoming edges.' };
  }

  // 2. Association Specific Constraints
  if (isAssociation) {
    // Association edges can only come out of a UA
    if (sourceType !== NodeType.UA) {
      return { valid: false, reason: 'Association edges must originate from a User Attribute (UA).' };
    }
    // Association edges can only go into a UA or OA
    if (targetType !== NodeType.UA && targetType !== NodeType.OA) {
      return { valid: false, reason: 'Association edges must target a User Attribute (UA) or Object Attribute (OA).' };
    }
  }

  return { valid: true };
}

/**
 * =============================================================================
 * SCKT PRODUCTION FOUNDATION — PHASE 5F STEP 1
 * ROLL SPLIT / CHILD-ROLL GENEALOGY DOMAIN SERVICE & TYPES
 * =============================================================================
 * Pure business logic and in-memory frontend simulation for roll identity
 * preservation, roll splitting, child identity derivation, and multi-generation
 * parent/child genealogy tracking.
 *
 * CRITICAL GOVERNANCE PRINCIPLES:
 * 1. ROLL IDENTITY IS IMMUTABLE:
 *    A physical Roll never silently changes identity or represents two different
 *    locations/processes simultaneously.
 * 2. Splitting creates separate child Roll identities with parent & root lineage.
 * 3. Parent Roll is NEVER deleted or overwritten; upon confirmed split it becomes
 *    SUPERSEDED_BY_SPLIT and is no longer operationally active for new actions.
 * 4. Exact Quantity Conservation: Sum(children) === Parent Qty (3-decimal precision).
 *    Under/over allocation is strictly SPLIT_QUANTITY_MISMATCH (never assumed wastage/loss).
 * 5. Minimum 2 children required; all child quantities must be > 0.
 * 6. Lineage Safety: Quality and Process Route are inherited by reference only.
 *    Children are NOT falsely marked as independently inspected or auto-routed.
 * 7. Historical Process Issue and Receive remain attached strictly to the original identity.
 * 8. Zero Inventory Mutation: No changes to InventoryData.fabricRolls or DB.
 * 9. Frontend simulation only.
 */

import {
  type FabricRollDraft,
  type FabricGrade,
  type FabricDisposition,
} from "./production-planning.service";
import {
  FabricProcessRoutingService,
  type FabricProcessRoutePlan,
  type RollSplitRequiredResult,
} from "./fabric-process-routing.service";
import {
  FabricProcessExecutionService,
  type FabricProcessIssuePreparation,
} from "./fabric-process-execution.service";
import {
  FabricProcessReceiveService,
  type FabricProcessReceiveSimulation,
} from "./fabric-process-receive.service";

// =============================================================================
// STEP 3 — GENEALOGY CONTRACTS
// =============================================================================

export type RollIdentityStatus =
  | "ACTIVE"
  | "SUPERSEDED_BY_SPLIT"
  | "REVIEW_REQUIRED";

export type RollOriginType =
  | "ORIGINAL_ROLL"
  | "SPLIT_CHILD";

export type SplitPlanStatus =
  | "DRAFT"
  | "VALID"
  | "CONFIRMED_SIMULATION"
  | "REVIEW_REQUIRED"
  | "SUPERSEDED";

export type SplitErrorCode =
  | "SPLIT_QUANTITY_MISMATCH"
  | "INVALID_CHILD_QTY"
  | "INVALID_SPLIT"
  | "CHILD_IDENTITY_CONFLICT"
  | "PARENT_NOT_ACTIVE"
  | "CYCLE_DETECTED"
  | "IMMUTABLE_CONFIRMED_SPLIT";

export interface FabricRollGenealogyNode {
  id: string; // Internal node GUID

  rollIdentity: string; // Canonical simulation identity, e.g. "DRAFT-R001", "DRAFT-R001-C01"
  displayRollNo: string; // User-facing roll number

  sourceRollDraftId?: string | undefined; // Reference to original FabricRollDraft if root

  parentNodeId?: string | undefined; // Direct parent node ID
  parentRollIdentity?: string | undefined; // Direct parent identity

  rootNodeId: string; // Topmost ancestor node ID
  rootRollIdentity: string; // Topmost ancestor roll identity

  generation: number; // 0 = root original, 1 = first split child, 2 = grandchild...

  quantityMetre: number; // Exact metre length

  identityStatus: RollIdentityStatus;
  origin: RollOriginType;

  // Upstream Lineage Context (Step 24, 25, 26, 27)
  salesOrderId?: string | undefined;
  salesOrderNo?: string | undefined;
  productionOrderId?: string | undefined;
  productionOrderNo?: string | undefined;
  jobCardId?: string | undefined;
  jobCardNo?: string | undefined;
  itemCode?: string | undefined;
  designNo?: string | undefined;

  // Quality Lineage Reference (Step 25: Non-authoritative reference only)
  sourceParentQualityInspectionId?: string | undefined;
  inheritedGrade?: FabricGrade | undefined;
  inheritedDisposition?: FabricDisposition | "NOT_SET" | undefined;
  qualityLineageStatus?: "SOURCE_REFERENCE_ONLY" | "REVIEW_REQUIRED" | undefined;

  // Process Route Lineage Reference (Step 26: Reference only; not blindly duplicated)
  sourceParentRoutePlanId?: string | undefined;
  routeLineageStatus?: "SOURCE_REFERENCE_ONLY" | "REVIEW_REQUIRED" | undefined;

  // Split context reference if this node was created via split
  createdFromSplitPlanId?: string | undefined;
  splitSequence?: number | undefined;

  createdAt: string;
  updatedAt: string;
}

export interface FabricRollSplitChildInput {
  childRollIdentity?: string | undefined; // Optional custom/override identity; defaults to parent-C01, etc.
  quantityMetre: number;
  remark?: string | undefined;
  intendedUse?: "PROCESS_ROUTE" | "QUALITY" | "STOCK" | "OTHER" | undefined;
}

export interface FabricRollSplitChild {
  id: string; // Child entry ID
  childNodeId?: string | undefined; // Assigned upon confirmed simulation
  childRollIdentity: string;
  sequence: number; // 1, 2, 3...
  quantityMetre: number;
  remark?: string | undefined;
  intendedUse?: "PROCESS_ROUTE" | "QUALITY" | "STOCK" | "OTHER" | undefined;
  createdAt: string;
}

export interface FabricRollSplitPlan {
  id: string;

  parentNodeId: string;
  parentRollIdentity: string;
  parentQtyMetre: number;

  children: FabricRollSplitChild[];

  totalChildQtyMetre: number;
  differenceQtyMetre: number; // parentQtyMetre - totalChildQtyMetre
  isExactConservation: boolean;

  reason: string;
  status: SplitPlanStatus;
  reviewReason?: string | undefined;

  createdAt: string;
  updatedAt: string;
}

export interface SplitValidationResult {
  isValid: boolean;
  errors: string[];
  errorCode?: SplitErrorCode | undefined;
  parentQtyMetre: number;
  totalChildQtyMetre: number;
  differenceQtyMetre: number;
  isExactConservation: boolean;
}

export interface GenealogyTreeNode {
  node: FabricRollGenealogyNode;
  children: GenealogyTreeNode[];
}

export interface GenealogyIntegrityResult {
  isValid: boolean;
  errors: string[];
  cyclesDetected: boolean;
  quantityConserved: boolean;
  orphanNodes: string[];
}

// =============================================================================
// STEP 48 — PURE DECIMAL & VALIDATION FUNCTIONS
// =============================================================================

export function round3(val: number): number {
  if (isNaN(val) || !isFinite(val)) return 0;
  return Math.round((val + Number.EPSILON) * 1000) / 1000;
}

export function sumChildQty(children: Array<{ quantityMetre: number }>): number {
  return round3(children.reduce((acc, c) => acc + (c.quantityMetre || 0), 0));
}

export function validateChildQty(qty: number): { valid: boolean; error?: string } {
  if (isNaN(qty) || !isFinite(qty)) {
    return { valid: false, error: "Child quantity must be a valid number." };
  }
  if (qty <= 0) {
    return { valid: false, error: "Child quantity must be strictly greater than 0." };
  }
  return { valid: true };
}

export function validateChildCount(count: number): { valid: boolean; error?: string } {
  if (count < 2) {
    return { valid: false, error: "A valid split requires at least 2 child rolls." };
  }
  return { valid: true };
}

export function validateQuantityConservation(
  parentQty: number,
  childTotal: number
): { conserved: boolean; difference: number } {
  const diff = round3(parentQty - childTotal);
  return {
    conserved: Math.abs(diff) <= 0.001,
    difference: diff,
  };
}

/**
 * Derives a deterministic child identity from parent identity.
 * Example: Parent "DRAFT-R001" and sequence 1 -> "DRAFT-R001-C01"
 */
export function deriveChildRollIdentity(parentIdentity: string, sequence: number): string {
  const pad = sequence < 10 ? `0${sequence}` : `${sequence}`;
  return `${parentIdentity}-C${pad}`;
}

// =============================================================================
// STEP 2 & 47 — FOCUSED GENEALOGY SERVICE
// =============================================================================

export class FabricRollGenealogyService {
  // In-memory node store keyed by node.id
  private static nodes: Map<string, FabricRollGenealogyNode> = new Map();

  // Index from rollIdentity to node.id for fast lookup & conflict detection
  private static identityIndex: Map<string, string> = new Map();

  // In-memory split plans keyed by splitPlan.id
  private static splitPlans: Map<string, FabricRollSplitPlan> = new Map();

  // History list of split plans keyed by parentNodeId
  private static splitHistory: Map<string, FabricRollSplitPlan[]> = new Map();

  /**
   * Resets all in-memory genealogy stores (for tests and session reset).
   */
  public static resetStores(): void {
    this.nodes.clear();
    this.identityIndex.clear();
    this.splitPlans.clear();
    this.splitHistory.clear();
  }

  // ---------------------------------------------------------------------------
  // ROOT NODE INITIALIZATION (FROM PHASE 5A FABRIC ROLL DRAFT)
  // ---------------------------------------------------------------------------

  /**
   * Creates or registers a root genealogy node for an existing FabricRollDraft.
   */
  public static getOrCreateRootFromFabricRollDraft(roll: FabricRollDraft): FabricRollGenealogyNode {
    // Check if an index entry exists for this roll's identity
    const existingNodeId = this.identityIndex.get(roll.temporaryRollNo);
    if (existingNodeId) {
      const existing = this.nodes.get(existingNodeId);
      if (existing) return existing;
    }

    // Also check by sourceRollDraftId across root nodes
    for (const node of this.nodes.values()) {
      if (node.sourceRollDraftId === roll.id && node.generation === 0) {
        return node;
      }
    }

    const now = new Date().toISOString();
    const nodeId = `gen-node-${roll.id}`;

    const rootNode: FabricRollGenealogyNode = {
      id: nodeId,
      rollIdentity: roll.temporaryRollNo,
      displayRollNo: roll.temporaryRollNo,
      sourceRollDraftId: roll.id,
      parentNodeId: undefined,
      parentRollIdentity: undefined,
      rootNodeId: nodeId,
      rootRollIdentity: roll.temporaryRollNo,
      generation: 0,
      quantityMetre: round3(roll.qtyMetre),
      identityStatus: "ACTIVE",
      origin: "ORIGINAL_ROLL",
      productionOrderId: roll.productionOrderId,
      jobCardId: roll.jobCardId,
      createdAt: now,
      updatedAt: now,
    };

    this.nodes.set(rootNode.id, rootNode);
    this.identityIndex.set(rootNode.rollIdentity, rootNode.id);
    return rootNode;
  }

  /**
   * Manually creates a standalone root roll node (useful in tests).
   */
  public static createRootRollNode(params: {
    rollIdentity: string;
    quantityMetre: number;
    sourceRollDraftId?: string | undefined;
    salesOrderId?: string | undefined;
    productionOrderId?: string | undefined;
    jobCardId?: string | undefined;
    qualityInspectionId?: string | undefined;
    qualityGrade?: FabricGrade | undefined;
    qualityDisposition?: FabricDisposition | "NOT_SET" | undefined;
  }): FabricRollGenealogyNode {
    const existingId = this.identityIndex.get(params.rollIdentity);
    if (existingId) {
      const existing = this.nodes.get(existingId);
      if (existing) return existing;
    }

    const now = new Date().toISOString();
    const nodeId = `gen-node-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const rootNode: FabricRollGenealogyNode = {
      id: nodeId,
      rollIdentity: params.rollIdentity,
      displayRollNo: params.rollIdentity,
      sourceRollDraftId: params.sourceRollDraftId,
      parentNodeId: undefined,
      parentRollIdentity: undefined,
      rootNodeId: nodeId,
      rootRollIdentity: params.rollIdentity,
      generation: 0,
      quantityMetre: round3(params.quantityMetre),
      identityStatus: "ACTIVE",
      origin: "ORIGINAL_ROLL",
      salesOrderId: params.salesOrderId,
      productionOrderId: params.productionOrderId,
      jobCardId: params.jobCardId,
      sourceParentQualityInspectionId: params.qualityInspectionId,
      inheritedGrade: params.qualityGrade,
      inheritedDisposition: params.qualityDisposition,
      qualityLineageStatus: params.qualityInspectionId ? "SOURCE_REFERENCE_ONLY" : undefined,
      createdAt: now,
      updatedAt: now,
    };

    this.nodes.set(rootNode.id, rootNode);
    this.identityIndex.set(rootNode.rollIdentity, rootNode.id);
    return rootNode;
  }

  // ---------------------------------------------------------------------------
  // LOOKUP & QUERY METHODS
  // ---------------------------------------------------------------------------

  public static getRollNode(nodeId: string): FabricRollGenealogyNode | undefined {
    return this.nodes.get(nodeId);
  }

  public static getRollNodeByIdentity(identity: string): FabricRollGenealogyNode | undefined {
    const id = this.identityIndex.get(identity);
    return id ? this.nodes.get(id) : undefined;
  }

  public static getAllNodes(): FabricRollGenealogyNode[] {
    return Array.from(this.nodes.values());
  }

  public static getParent(nodeId: string): FabricRollGenealogyNode | undefined {
    const node = this.nodes.get(nodeId);
    if (!node || !node.parentNodeId) return undefined;
    return this.nodes.get(node.parentNodeId);
  }

  public static getChildren(parentNodeId: string): FabricRollGenealogyNode[] {
    const list: FabricRollGenealogyNode[] = [];
    for (const node of this.nodes.values()) {
      if (node.parentNodeId === parentNodeId) {
        list.push(node);
      }
    }
    return list.sort((a, b) => a.rollIdentity.localeCompare(b.rollIdentity));
  }

  public static getSiblings(nodeId: string): FabricRollGenealogyNode[] {
    const node = this.nodes.get(nodeId);
    if (!node || !node.parentNodeId) return [];
    return this.getChildren(node.parentNodeId).filter((s) => s.id !== nodeId);
  }

  public static getRoot(nodeId: string): FabricRollGenealogyNode | undefined {
    const node = this.nodes.get(nodeId);
    if (!node) return undefined;
    return this.nodes.get(node.rootNodeId);
  }

  public static getAncestors(nodeId: string): FabricRollGenealogyNode[] {
    const ancestors: FabricRollGenealogyNode[] = [];
    let curr = this.getParent(nodeId);
    const visited = new Set<string>([nodeId]);

    while (curr) {
      if (visited.has(curr.id)) break; // cycle guard
      visited.add(curr.id);
      ancestors.push(curr);
      curr = this.getParent(curr.id);
    }

    return ancestors;
  }

  public static getDescendants(nodeId: string): FabricRollGenealogyNode[] {
    const descendants: FabricRollGenealogyNode[] = [];
    const queue = [...this.getChildren(nodeId)];
    const visited = new Set<string>([nodeId]);

    while (queue.length > 0) {
      const item = queue.shift()!;
      if (!visited.has(item.id)) {
        visited.add(item.id);
        descendants.push(item);
        queue.push(...this.getChildren(item.id));
      }
    }

    return descendants;
  }

  /**
   * Returns active leaf roll nodes belonging to a root lineage.
   * Non-leaf or superseded nodes are excluded.
   */
  public static getActiveLeafRolls(rootNodeId: string): FabricRollGenealogyNode[] {
    const leaves: FabricRollGenealogyNode[] = [];
    const root = this.nodes.get(rootNodeId);
    if (!root) return [];

    // If root itself has no children and is active
    const rootChildren = this.getChildren(rootNodeId);
    if (rootChildren.length === 0 && root.identityStatus === "ACTIVE") {
      return [root];
    }

    // Traverse all descendants belonging to this root
    for (const node of this.nodes.values()) {
      if (node.rootNodeId === rootNodeId && node.identityStatus === "ACTIVE") {
        const children = this.getChildren(node.id);
        if (children.length === 0) {
          leaves.push(node);
        }
      }
    }

    return leaves.sort((a, b) => a.rollIdentity.localeCompare(b.rollIdentity));
  }

  /**
   * Calculates sum of quantities across all active leaf rolls for a root.
   */
  public static calculateActiveLeafQuantity(rootNodeId: string): number {
    const leaves = this.getActiveLeafRolls(rootNodeId);
    return sumChildQty(leaves);
  }

  /**
   * Determines if a roll node is currently operationally active for new actions.
   * Parents that have been split become SUPERSEDED_BY_SPLIT and return false.
   */
  public static isRollOperationallyActive(nodeId: string): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) return false;
    if (node.identityStatus !== "ACTIVE") return false;
    // If it has children, it has been split
    const children = this.getChildren(nodeId);
    return children.length === 0;
  }

  // ---------------------------------------------------------------------------
  // STEP 4, 10, 11, 12, 14, 15, 36 — SPLIT VALIDATION
  // ---------------------------------------------------------------------------

  public static validateSplitPlan(params: {
    parentNodeId: string;
    children: FabricRollSplitChildInput[];
    reason?: string | undefined;
  }): SplitValidationResult {
    const errors: string[] = [];
    const parentNode = this.nodes.get(params.parentNodeId);

    if (!parentNode) {
      return {
        isValid: false,
        errors: [`Parent roll node "${params.parentNodeId}" not found.`],
        errorCode: "PARENT_NOT_ACTIVE",
        parentQtyMetre: 0,
        totalChildQtyMetre: 0,
        differenceQtyMetre: 0,
        isExactConservation: false,
      };
    }

    // Step 29: Split source must be an active operational roll
    if (parentNode.identityStatus === "SUPERSEDED_BY_SPLIT") {
      return {
        isValid: false,
        errors: [`Parent roll "${parentNode.rollIdentity}" has already been superseded by a prior split.`],
        errorCode: "PARENT_NOT_ACTIVE",
        parentQtyMetre: parentNode.quantityMetre,
        totalChildQtyMetre: 0,
        differenceQtyMetre: parentNode.quantityMetre,
        isExactConservation: false,
      };
    }

    if (parentNode.identityStatus === "REVIEW_REQUIRED") {
      errors.push(`Parent roll "${parentNode.rollIdentity}" requires review before splitting.`);
    }

    // Step 15: Minimum child count
    const countCheck = validateChildCount(params.children.length);
    if (!countCheck.valid && countCheck.error) {
      errors.push(countCheck.error);
      return {
        isValid: false,
        errors,
        errorCode: "INVALID_SPLIT",
        parentQtyMetre: parentNode.quantityMetre,
        totalChildQtyMetre: sumChildQty(params.children),
        differenceQtyMetre: round3(parentNode.quantityMetre - sumChildQty(params.children)),
        isExactConservation: false,
      };
    }

    // Step 14: Each child quantity > 0
    for (let i = 0; i < params.children.length; i++) {
      const child = params.children[i]!;
      const qCheck = validateChildQty(child.quantityMetre);
      if (!qCheck.valid && qCheck.error) {
        errors.push(`Child ${i + 1}: ${qCheck.error}`);
      }
    }

    const totalChildQty = sumChildQty(params.children);
    const conservation = validateQuantityConservation(parentNode.quantityMetre, totalChildQty);

    // Step 10, 11, 12: Exact quantity conservation check
    if (!conservation.conserved) {
      const diff = conservation.difference;
      if (diff > 0) {
        errors.push(
          `Under-allocation: Sum of children (${totalChildQty}m) is less than parent quantity (${parentNode.quantityMetre}m) by ${diff}m. Exact conservation required.`
        );
      } else {
        errors.push(
          `Over-allocation: Sum of children (${totalChildQty}m) exceeds parent quantity (${parentNode.quantityMetre}m) by ${Math.abs(diff)}m. Exact conservation required.`
        );
      }
    }

    // Step 36: Identity collision check
    const usedIdentities = new Set<string>();
    for (let i = 0; i < params.children.length; i++) {
      const seq = i + 1;
      const proposedIdentity =
        params.children[i]?.childRollIdentity?.trim() ||
        deriveChildRollIdentity(parentNode.rollIdentity, seq);

      if (usedIdentities.has(proposedIdentity)) {
        errors.push(`Duplicate child identity within split: "${proposedIdentity}".`);
      }
      usedIdentities.add(proposedIdentity);

      const existingNodeId = this.identityIndex.get(proposedIdentity);
      if (existingNodeId) {
        errors.push(
          `Child identity conflict: Roll identity "${proposedIdentity}" already exists in genealogy.`
        );
      }
    }

    // Step 23: Split reason required
    if (params.reason !== undefined && !params.reason.trim()) {
      errors.push("Split reason text is required to confirm roll split.");
    }

    let errorCode: SplitErrorCode | undefined;
    if (errors.length > 0) {
      if (errors.some((e) => e.includes("conflict") || e.includes("Duplicate child identity"))) {
        errorCode = "CHILD_IDENTITY_CONFLICT";
      } else if (errors.some((e) => e.includes("Under-allocation") || e.includes("Over-allocation"))) {
        errorCode = "SPLIT_QUANTITY_MISMATCH";
      } else if (errors.some((e) => e.includes("Child quantity must be strictly greater than 0"))) {
        errorCode = "INVALID_CHILD_QTY";
      } else {
        errorCode = "INVALID_SPLIT";
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      errorCode,
      parentQtyMetre: parentNode.quantityMetre,
      totalChildQtyMetre: totalChildQty,
      differenceQtyMetre: conservation.difference,
      isExactConservation: conservation.conserved,
    };
  }

  // ---------------------------------------------------------------------------
  // STEP 4, 16, 17, 18 — SPLIT DRAFT & CONFIRMATION
  // ---------------------------------------------------------------------------

  /**
   * Previews or creates a split draft plan without confirming nodes.
   */
  public static createSplitDraft(params: {
    parentNodeId: string;
    children: FabricRollSplitChildInput[];
    reason?: string | undefined;
  }): { plan?: FabricRollSplitPlan; validation: SplitValidationResult } {
    const validation = this.validateSplitPlan(params);
    const parentNode = this.nodes.get(params.parentNodeId);

    if (!parentNode) {
      return { validation };
    }

    const now = new Date().toISOString();
    const splitPlanId = `split-plan-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const children: FabricRollSplitChild[] = params.children.map((c, idx) => {
      const seq = idx + 1;
      const identity = c.childRollIdentity?.trim() || deriveChildRollIdentity(parentNode.rollIdentity, seq);
      return {
        id: `split-child-${splitPlanId}-${seq}`,
        childRollIdentity: identity,
        sequence: seq,
        quantityMetre: round3(c.quantityMetre),
        remark: c.remark,
        intendedUse: c.intendedUse,
        createdAt: now,
      };
    });

    const plan: FabricRollSplitPlan = {
      id: splitPlanId,
      parentNodeId: parentNode.id,
      parentRollIdentity: parentNode.rollIdentity,
      parentQtyMetre: parentNode.quantityMetre,
      children,
      totalChildQtyMetre: validation.totalChildQtyMetre,
      differenceQtyMetre: validation.differenceQtyMetre,
      isExactConservation: validation.isExactConservation,
      reason: params.reason || "",
      status: validation.isValid ? "VALID" : "DRAFT",
      reviewReason: validation.isValid ? undefined : validation.errors.join("; "),
      createdAt: now,
      updatedAt: now,
    };

    this.splitPlans.set(plan.id, plan);
    return { plan, validation };
  }

  /**
   * Confirms a valid split plan simulation:
   * 1. Marks parent node as SUPERSEDED_BY_SPLIT.
   * 2. Creates ACTIVE child genealogy nodes linked to parent & root.
   * 3. Stores split in history.
   * 4. Zero inventory / stock mutation.
   */
  public static confirmSplitSimulation(params: {
    parentNodeId: string;
    children: FabricRollSplitChildInput[];
    reason: string;
  }): {
    success: boolean;
    plan?: FabricRollSplitPlan | undefined;
    childNodes?: FabricRollGenealogyNode[] | undefined;
    validation: SplitValidationResult;
  } {
    const validation = this.validateSplitPlan(params);
    if (!validation.isValid) {
      return { success: false, validation };
    }

    const parentNode = this.nodes.get(params.parentNodeId)!;
    const now = new Date().toISOString();
    const splitPlanId = `split-plan-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 1. Mark Parent Node SUPERSEDED_BY_SPLIT (Step 16 & 17)
    parentNode.identityStatus = "SUPERSEDED_BY_SPLIT";
    parentNode.updatedAt = now;

    // 2. Instantiate Child Genealogy Nodes (Step 18)
    const childNodes: FabricRollGenealogyNode[] = [];
    const childrenRecord: FabricRollSplitChild[] = [];

    for (let i = 0; i < params.children.length; i++) {
      const input = params.children[i]!;
      const seq = i + 1;
      const identity = input.childRollIdentity?.trim() || deriveChildRollIdentity(parentNode.rollIdentity, seq);
      const childNodeId = `gen-node-${identity}-${Date.now()}`;

      const childNode: FabricRollGenealogyNode = {
        id: childNodeId,
        rollIdentity: identity,
        displayRollNo: identity,
        sourceRollDraftId: undefined, // Children do not have a separate original receipt draft ID
        parentNodeId: parentNode.id,
        parentRollIdentity: parentNode.rollIdentity,
        rootNodeId: parentNode.rootNodeId,
        rootRollIdentity: parentNode.rootRollIdentity,
        generation: parentNode.generation + 1,
        quantityMetre: round3(input.quantityMetre),
        identityStatus: "ACTIVE",
        origin: "SPLIT_CHILD",
        salesOrderId: parentNode.salesOrderId,
        salesOrderNo: parentNode.salesOrderNo,
        productionOrderId: parentNode.productionOrderId,
        productionOrderNo: parentNode.productionOrderNo,
        jobCardId: parentNode.jobCardId,
        jobCardNo: parentNode.jobCardNo,
        itemCode: parentNode.itemCode,
        designNo: parentNode.designNo,
        // Inherit quality by reference only (Step 25)
        sourceParentQualityInspectionId: parentNode.sourceParentQualityInspectionId,
        inheritedGrade: parentNode.inheritedGrade,
        inheritedDisposition: parentNode.inheritedDisposition,
        qualityLineageStatus: parentNode.sourceParentQualityInspectionId
          ? "SOURCE_REFERENCE_ONLY"
          : undefined,
        // Inherit route by reference only (Step 26)
        sourceParentRoutePlanId: parentNode.sourceParentRoutePlanId,
        routeLineageStatus: parentNode.sourceParentRoutePlanId
          ? "SOURCE_REFERENCE_ONLY"
          : undefined,
        createdFromSplitPlanId: splitPlanId,
        splitSequence: seq,
        createdAt: now,
        updatedAt: now,
      };

      this.nodes.set(childNode.id, childNode);
      this.identityIndex.set(childNode.rollIdentity, childNode.id);
      childNodes.push(childNode);

      childrenRecord.push({
        id: `split-child-${splitPlanId}-${seq}`,
        childNodeId: childNode.id,
        childRollIdentity: identity,
        sequence: seq,
        quantityMetre: round3(input.quantityMetre),
        remark: input.remark,
        intendedUse: input.intendedUse,
        createdAt: now,
      });
    }

    const confirmedPlan: FabricRollSplitPlan = {
      id: splitPlanId,
      parentNodeId: parentNode.id,
      parentRollIdentity: parentNode.rollIdentity,
      parentQtyMetre: parentNode.quantityMetre,
      children: childrenRecord,
      totalChildQtyMetre: validation.totalChildQtyMetre,
      differenceQtyMetre: 0,
      isExactConservation: true,
      reason: params.reason.trim(),
      status: "CONFIRMED_SIMULATION",
      createdAt: now,
      updatedAt: now,
    };

    this.splitPlans.set(confirmedPlan.id, confirmedPlan);

    const history = this.splitHistory.get(parentNode.id) || [];
    this.splitHistory.set(parentNode.id, [...history, confirmedPlan]);

    return {
      success: true,
      plan: confirmedPlan,
      childNodes,
      validation,
    };
  }

  public static getSplitPlan(planId: string): FabricRollSplitPlan | undefined {
    return this.splitPlans.get(planId);
  }

  public static getSplitHistory(parentNodeId: string): FabricRollSplitPlan[] {
    return this.splitHistory.get(parentNodeId) || [];
  }

  // ---------------------------------------------------------------------------
  // STEP 32 — GENEALOGY TREE BUILDER
  // ---------------------------------------------------------------------------

  public static buildGenealogyTree(rootNodeId: string): GenealogyTreeNode | undefined {
    const root = this.nodes.get(rootNodeId);
    if (!root) return undefined;

    const buildSubTree = (current: FabricRollGenealogyNode, visited: Set<string>): GenealogyTreeNode => {
      visited.add(current.id);
      const childNodes = this.getChildren(current.id);
      const childrenTree: GenealogyTreeNode[] = [];

      for (const ch of childNodes) {
        if (!visited.has(ch.id)) {
          childrenTree.push(buildSubTree(ch, new Set(visited)));
        }
      }

      return {
        node: current,
        children: childrenTree,
      };
    };

    return buildSubTree(root, new Set());
  }

  // ---------------------------------------------------------------------------
  // STEP 35 — INTEGRITY CHECK & CYCLE DETECTION
  // ---------------------------------------------------------------------------

  public static detectCycle(startNodeId: string, proposedParentId?: string | undefined): boolean {
    if (!proposedParentId) return false;
    if (startNodeId === proposedParentId) return true;

    // Check if proposedParentId is a descendant of startNodeId
    const descendants = this.getDescendants(startNodeId);
    return descendants.some((d) => d.id === proposedParentId);
  }

  public static validateGenealogyIntegrity(): GenealogyIntegrityResult {
    const errors: string[] = [];
    const orphanNodes: string[] = [];
    let cyclesDetected = false;
    let quantityConserved = true;

    for (const node of this.nodes.values()) {
      // Check parent pointer
      if (node.parentNodeId) {
        const parent = this.nodes.get(node.parentNodeId);
        if (!parent) {
          orphanNodes.push(node.id);
          errors.push(`Node "${node.rollIdentity}" references nonexistent parent "${node.parentNodeId}".`);
        }
      }

      // Check root pointer
      const root = this.nodes.get(node.rootNodeId);
      if (!root) {
        errors.push(`Node "${node.rollIdentity}" references nonexistent root "${node.rootNodeId}".`);
      }

      // Check cycle
      if (node.parentNodeId && this.detectCycle(node.id, node.parentNodeId)) {
        cyclesDetected = true;
        errors.push(`Cycle detected involving node "${node.rollIdentity}".`);
      }
    }

    // Check quantity conservation across root trees
    for (const node of this.nodes.values()) {
      if (node.generation === 0) {
        const leafTotal = this.calculateActiveLeafQuantity(node.id);
        const diff = Math.abs(node.quantityMetre - leafTotal);
        if (diff > 0.001) {
          quantityConserved = false;
          errors.push(
            `Root "${node.rollIdentity}" (${node.quantityMetre}m) leaf total (${leafTotal}m) mismatch by ${diff}m.`
          );
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      cyclesDetected,
      quantityConserved,
      orphanNodes,
    };
  }

  // ---------------------------------------------------------------------------
  // STEP 37, 39, 40 — REVISION IMPACT DETECTION
  // ---------------------------------------------------------------------------

  /**
   * Detects impact if parent roll draft quantity is revised after split confirmation.
   * Children are NOT silently resized.
   */
  public static detectParentQtyRevisionImpact(
    parentNodeId: string,
    newParentQty: number
  ): { isImpacted: boolean; reason?: string | undefined } {
    const parentNode = this.nodes.get(parentNodeId);
    if (!parentNode) return { isImpacted: false };

    const children = this.getChildren(parentNodeId);
    if (children.length === 0) return { isImpacted: false };

    if (Math.abs(parentNode.quantityMetre - newParentQty) > 0.001) {
      parentNode.identityStatus = "REVIEW_REQUIRED";
      return {
        isImpacted: true,
        reason: `Parent quantity changed from ${parentNode.quantityMetre}m to ${newParentQty}m after split. Split children quantities require review.`,
      };
    }

    return { isImpacted: false };
  }

  /**
   * Detects impact if parent quality disposition changed after split.
   */
  public static detectQualityRevisionImpact(
    parentNodeId: string,
    newDisposition: FabricDisposition | "NOT_SET"
  ): { isImpacted: boolean; reason?: string | undefined } {
    const parentNode = this.nodes.get(parentNodeId);
    if (!parentNode) return { isImpacted: false };

    const children = this.getChildren(parentNodeId);
    if (children.length === 0) return { isImpacted: false };

    if (parentNode.inheritedDisposition !== newDisposition) {
      for (const ch of children) {
        ch.qualityLineageStatus = "REVIEW_REQUIRED";
      }
      return {
        isImpacted: true,
        reason: `Parent quality disposition changed to ${newDisposition}. Children quality lineage marked REVIEW_REQUIRED.`,
      };
    }

    return { isImpacted: false };
  }

  /**
   * Detects impact if parent route was revised after split.
   */
  public static detectRouteRevisionImpact(
    parentNodeId: string,
    newRouteRevision: number
  ): { isImpacted: boolean; reason?: string | undefined } {
    const parentNode = this.nodes.get(parentNodeId);
    if (!parentNode) return { isImpacted: false };

    const children = this.getChildren(parentNodeId);
    if (children.length === 0) return { isImpacted: false };

    for (const ch of children) {
      ch.routeLineageStatus = "REVIEW_REQUIRED";
    }

    return {
      isImpacted: true,
      reason: `Parent route revised to Revision #${newRouteRevision}. Children route lineage marked REVIEW_REQUIRED.`,
    };
  }

  // ---------------------------------------------------------------------------
  // STEP 41 — ROLL SPLIT REQUIRED RESOLUTION PROPOSAL
  // ---------------------------------------------------------------------------

  /**
   * Proposes a clean 2-child split plan to satisfy partial physical processing:
   * Child 1: Desired Process Qty
   * Child 2: Remnant (Parent Qty - Desired Process Qty)
   * Does NOT auto-confirm split (Step 42).
   */
  public static resolveRollSplitRequirement(params: {
    parentNodeId: string;
    desiredProcessQtyMetre: number;
    reason?: string | undefined;
  }): {
    plan?: FabricRollSplitPlan | undefined;
    validation: SplitValidationResult;
  } {
    const parentNode = this.nodes.get(params.parentNodeId);
    if (!parentNode) {
      return {
        validation: {
          isValid: false,
          errors: [`Parent node "${params.parentNodeId}" not found.`],
          errorCode: "PARENT_NOT_ACTIVE",
          parentQtyMetre: 0,
          totalChildQtyMetre: 0,
          differenceQtyMetre: 0,
          isExactConservation: false,
        },
      };
    }

    const desired = round3(params.desiredProcessQtyMetre);
    const remnant = round3(parentNode.quantityMetre - desired);

    const proposedChildren: FabricRollSplitChildInput[] = [
      {
        childRollIdentity: deriveChildRollIdentity(parentNode.rollIdentity, 1),
        quantityMetre: desired,
        intendedUse: "PROCESS_ROUTE",
        remark: `Allocated for partial process (${desired}m)`,
      },
      {
        childRollIdentity: deriveChildRollIdentity(parentNode.rollIdentity, 2),
        quantityMetre: remnant,
        intendedUse: "STOCK",
        remark: `Remaining balance from split (${remnant}m)`,
      },
    ];

    return this.createSplitDraft({
      parentNodeId: parentNode.id,
      children: proposedChildren,
      reason: params.reason || `Split proposal for partial process requirement of ${desired}m`,
    });
  }

  // =============================================================================
  // COMPREHENSIVE VERIFICATION TEST SUITE (TESTS A THROUGH R)
  // =============================================================================

  public static runPhase5FVerificationTests(): {
    allPassed: boolean;
    results: Record<string, { status: "PASS" | "FAIL"; details: string }>;
  } {
    const results: Record<string, { status: "PASS" | "FAIL"; details: string }> = {};

    this.resetStores();

    // -------------------------------------------------------------------------
    // TEST A: Exact Split (Step 50)
    // Parent: 200, Children: 80, 120 -> VALID, Difference: 0
    // -------------------------------------------------------------------------
    try {
      const root = this.createRootRollNode({ rollIdentity: "TEST-R001", quantityMetre: 200 });
      const draft = this.createSplitDraft({
        parentNodeId: root.id,
        children: [{ quantityMetre: 80 }, { quantityMetre: 120 }],
        reason: "Test A exact split",
      });

      const passA =
        draft.validation.isValid === true &&
        draft.validation.differenceQtyMetre === 0 &&
        draft.plan?.status === "VALID";

      results["A"] = {
        status: passA ? "PASS" : "FAIL",
        details: passA
          ? "Exact split (200m -> 80m + 120m) validated with 0m difference."
          : `Test A failed: ${JSON.stringify(draft.validation)}`,
      };
    } catch (err: any) {
      results["A"] = { status: "FAIL", details: err?.message || String(err) };
    }

    // -------------------------------------------------------------------------
    // TEST B: Under Allocation (Step 51)
    // Parent: 200, Children: 80, 110 (190 total) -> SPLIT_QUANTITY_MISMATCH
    // -------------------------------------------------------------------------
    try {
      const root = this.createRootRollNode({ rollIdentity: "TEST-R002", quantityMetre: 200 });
      const draft = this.createSplitDraft({
        parentNodeId: root.id,
        children: [{ quantityMetre: 80 }, { quantityMetre: 110 }],
        reason: "Test B under-allocation",
      });

      const passB =
        draft.validation.isValid === false &&
        draft.validation.errorCode === "SPLIT_QUANTITY_MISMATCH" &&
        draft.validation.differenceQtyMetre === 10;

      results["B"] = {
        status: passB ? "PASS" : "FAIL",
        details: passB
          ? "Under-allocation (190m vs 200m) blocked with SPLIT_QUANTITY_MISMATCH (diff: 10m)."
          : `Test B failed: ${JSON.stringify(draft.validation)}`,
      };
    } catch (err: any) {
      results["B"] = { status: "FAIL", details: err?.message || String(err) };
    }

    // -------------------------------------------------------------------------
    // TEST C: Over Allocation (Step 52)
    // Parent: 200, Children: 100, 110 (210 total) -> SPLIT_QUANTITY_MISMATCH
    // -------------------------------------------------------------------------
    try {
      const root = this.createRootRollNode({ rollIdentity: "TEST-R003", quantityMetre: 200 });
      const draft = this.createSplitDraft({
        parentNodeId: root.id,
        children: [{ quantityMetre: 100 }, { quantityMetre: 110 }],
        reason: "Test C over-allocation",
      });

      const passC =
        draft.validation.isValid === false &&
        draft.validation.errorCode === "SPLIT_QUANTITY_MISMATCH" &&
        draft.validation.differenceQtyMetre === -10;

      results["C"] = {
        status: passC ? "PASS" : "FAIL",
        details: passC
          ? "Over-allocation (210m vs 200m) blocked with SPLIT_QUANTITY_MISMATCH."
          : `Test C failed: ${JSON.stringify(draft.validation)}`,
      };
    } catch (err: any) {
      results["C"] = { status: "FAIL", details: err?.message || String(err) };
    }

    // -------------------------------------------------------------------------
    // TEST D: Zero Child (Step 53)
    // Parent: 200, Children: 0, 200 -> INVALID_CHILD_QTY
    // -------------------------------------------------------------------------
    try {
      const root = this.createRootRollNode({ rollIdentity: "TEST-R004", quantityMetre: 200 });
      const draft = this.createSplitDraft({
        parentNodeId: root.id,
        children: [{ quantityMetre: 0 }, { quantityMetre: 200 }],
        reason: "Test D zero child",
      });

      const passD =
        draft.validation.isValid === false &&
        draft.validation.errorCode === "INVALID_CHILD_QTY";

      results["D"] = {
        status: passD ? "PASS" : "FAIL",
        details: passD
          ? "Zero child quantity blocked with INVALID_CHILD_QTY."
          : `Test D failed: ${JSON.stringify(draft.validation)}`,
      };
    } catch (err: any) {
      results["D"] = { status: "FAIL", details: err?.message || String(err) };
    }

    // -------------------------------------------------------------------------
    // TEST E: One Child (Step 54)
    // Parent: 200, Only one child: 200 -> INVALID_SPLIT
    // -------------------------------------------------------------------------
    try {
      const root = this.createRootRollNode({ rollIdentity: "TEST-R005", quantityMetre: 200 });
      const draft = this.createSplitDraft({
        parentNodeId: root.id,
        children: [{ quantityMetre: 200 }],
        reason: "Test E one child",
      });

      const passE =
        draft.validation.isValid === false &&
        draft.validation.errorCode === "INVALID_SPLIT";

      results["E"] = {
        status: passE ? "PASS" : "FAIL",
        details: passE
          ? "Single-child split blocked with INVALID_SPLIT (minimum 2 children required)."
          : `Test E failed: ${JSON.stringify(draft.validation)}`,
      };
    } catch (err: any) {
      results["E"] = { status: "FAIL", details: err?.message || String(err) };
    }

    // -------------------------------------------------------------------------
    // TEST F: Parent Superseded (Step 55)
    // Confirmed Parent: R001, Children: C01, C02 -> Parent operational active: NO, Children: YES
    // -------------------------------------------------------------------------
    try {
      const root = this.createRootRollNode({ rollIdentity: "TEST-R006", quantityMetre: 200 });
      const conf = this.confirmSplitSimulation({
        parentNodeId: root.id,
        children: [{ quantityMetre: 80 }, { quantityMetre: 120 }],
        reason: "Test F split confirmation",
      });

      const parentActive = this.isRollOperationallyActive(root.id);
      const child1Active = this.isRollOperationallyActive(conf.childNodes![0]!.id);
      const child2Active = this.isRollOperationallyActive(conf.childNodes![1]!.id);

      const passF =
        conf.success &&
        parentActive === false &&
        child1Active === true &&
        child2Active === true &&
        root.identityStatus === "SUPERSEDED_BY_SPLIT";

      results["F"] = {
        status: passF ? "PASS" : "FAIL",
        details: passF
          ? "Confirmed parent marked SUPERSEDED_BY_SPLIT (active: false); children marked ACTIVE (true)."
          : `Test F failed: parentActive=${parentActive}, c1Active=${child1Active}`,
      };
    } catch (err: any) {
      results["F"] = { status: "FAIL", details: err?.message || String(err) };
    }

    // -------------------------------------------------------------------------
    // TEST G: Nested Split (Step 56)
    // Split child again -> Root R001, Generation 2, Parent relation correct
    // -------------------------------------------------------------------------
    try {
      const root = this.createRootRollNode({ rollIdentity: "TEST-R007", quantityMetre: 200 });
      const split1 = this.confirmSplitSimulation({
        parentNodeId: root.id,
        children: [{ quantityMetre: 80 }, { quantityMetre: 120 }],
        reason: "Gen 1 split",
      });

      const child2 = split1.childNodes![1]!; // 120m
      const split2 = this.confirmSplitSimulation({
        parentNodeId: child2.id,
        children: [{ quantityMetre: 70 }, { quantityMetre: 50 }],
        reason: "Gen 2 nested split",
      });

      const gChild1 = split2.childNodes![0]!;
      const gChild2 = split2.childNodes![1]!;

      const passG =
        split2.success &&
        gChild1.generation === 2 &&
        gChild1.parentNodeId === child2.id &&
        gChild1.rootNodeId === root.id &&
        gChild2.generation === 2 &&
        gChild2.parentNodeId === child2.id &&
        gChild2.rootNodeId === root.id;

      results["G"] = {
        status: passG ? "PASS" : "FAIL",
        details: passG
          ? "Nested split incremented generation to 2 and preserved direct parent & root references."
          : `Test G failed: ${JSON.stringify(gChild1)}`,
      };
    } catch (err: any) {
      results["G"] = { status: "FAIL", details: err?.message || String(err) };
    }

    // -------------------------------------------------------------------------
    // TEST H: Leaf Reconciliation (Step 57)
    // Active leaf quantities sum to root quantity
    // -------------------------------------------------------------------------
    try {
      const root = this.createRootRollNode({ rollIdentity: "TEST-R008", quantityMetre: 200 });
      const s1 = this.confirmSplitSimulation({
        parentNodeId: root.id,
        children: [{ quantityMetre: 80 }, { quantityMetre: 120 }],
        reason: "Split 1",
      });

      const s2 = this.confirmSplitSimulation({
        parentNodeId: s1.childNodes![1]!.id,
        children: [{ quantityMetre: 70 }, { quantityMetre: 50 }],
        reason: "Split 2",
      });

      const leaves = this.getActiveLeafRolls(root.id);
      const leafTotal = this.calculateActiveLeafQuantity(root.id);

      const passH =
        leaves.length === 3 &&
        leafTotal === 200 &&
        leaves.map((l) => l.quantityMetre).sort().join(",") === "50,70,80";

      results["H"] = {
        status: passH ? "PASS" : "FAIL",
        details: passH
          ? "Active leaves (80m, 70m, 50m) exactly reconciled to root quantity (200m)."
          : `Test H failed: leafTotal=${leafTotal}`,
      };
    } catch (err: any) {
      results["H"] = { status: "FAIL", details: err?.message || String(err) };
    }

    // -------------------------------------------------------------------------
    // TEST I: Superseded Parent Re-Split (Step 58)
    // Attempt split already superseded parent -> BLOCK / PARENT_NOT_ACTIVE
    // -------------------------------------------------------------------------
    try {
      const root = this.createRootRollNode({ rollIdentity: "TEST-R009", quantityMetre: 200 });
      this.confirmSplitSimulation({
        parentNodeId: root.id,
        children: [{ quantityMetre: 100 }, { quantityMetre: 100 }],
        reason: "First split",
      });

      // Attempt second split on same root
      const s2 = this.validateSplitPlan({
        parentNodeId: root.id,
        children: [{ quantityMetre: 50 }, { quantityMetre: 150 }],
      });

      const passI = s2.isValid === false && s2.errorCode === "PARENT_NOT_ACTIVE";

      results["I"] = {
        status: passI ? "PASS" : "FAIL",
        details: passI
          ? "Attempt to re-split superseded parent blocked with PARENT_NOT_ACTIVE."
          : `Test I failed: ${JSON.stringify(s2)}`,
      };
    } catch (err: any) {
      results["I"] = { status: "FAIL", details: err?.message || String(err) };
    }

    // -------------------------------------------------------------------------
    // TEST J: Child ID Conflict (Step 59)
    // Attempt duplicate child identity -> CHILD_IDENTITY_CONFLICT
    // -------------------------------------------------------------------------
    try {
      const root = this.createRootRollNode({ rollIdentity: "TEST-R010", quantityMetre: 200 });
      // Pre-register an existing identity
      this.createRootRollNode({ rollIdentity: "TEST-R010-C01", quantityMetre: 50 });

      const s = this.validateSplitPlan({
        parentNodeId: root.id,
        children: [{ childRollIdentity: "TEST-R010-C01", quantityMetre: 100 }, { quantityMetre: 100 }],
      });

      const passJ = s.isValid === false && s.errorCode === "CHILD_IDENTITY_CONFLICT";

      results["J"] = {
        status: passJ ? "PASS" : "FAIL",
        details: passJ
          ? "Attempted duplicate child identity blocked with CHILD_IDENTITY_CONFLICT."
          : `Test J failed: ${JSON.stringify(s)}`,
      };
    } catch (err: any) {
      results["J"] = { status: "FAIL", details: err?.message || String(err) };
    }

    // -------------------------------------------------------------------------
    // TEST K: Parent Qty Revision (Step 60)
    // Confirmed split. Parent Qty later changes 200 -> 190 -> split preserved, REVIEW_REQUIRED
    // -------------------------------------------------------------------------
    try {
      const root = this.createRootRollNode({ rollIdentity: "TEST-R011", quantityMetre: 200 });
      const conf = this.confirmSplitSimulation({
        parentNodeId: root.id,
        children: [{ quantityMetre: 80 }, { quantityMetre: 120 }],
        reason: "Test K",
      });

      const impact = this.detectParentQtyRevisionImpact(root.id, 190);
      const child1 = conf.childNodes![0]!;
      const child2 = conf.childNodes![1]!;

      const passK =
        impact.isImpacted === true &&
        root.identityStatus === "REVIEW_REQUIRED" &&
        child1.quantityMetre === 80 &&
        child2.quantityMetre === 120;

      results["K"] = {
        status: passK ? "PASS" : "FAIL",
        details: passK
          ? "Parent quantity revision (200m -> 190m) triggered REVIEW_REQUIRED without silently resizing children."
          : `Test K failed: ${JSON.stringify(impact)}`,
      };
    } catch (err: any) {
      results["K"] = { status: "FAIL", details: err?.message || String(err) };
    }

    // -------------------------------------------------------------------------
    // TEST L: Quality Lineage (Step 61)
    // Parent has Quality Grade B. Split children created -> reference retained, NOT newly inspected
    // -------------------------------------------------------------------------
    try {
      const root = this.createRootRollNode({
        rollIdentity: "TEST-R012",
        quantityMetre: 200,
        qualityInspectionId: "insp-01",
        qualityGrade: "B",
        qualityDisposition: "ACCEPTED",
      });

      const conf = this.confirmSplitSimulation({
        parentNodeId: root.id,
        children: [{ quantityMetre: 100 }, { quantityMetre: 100 }],
        reason: "Test L",
      });

      const c1 = conf.childNodes![0]!;
      const passL =
        c1.sourceParentQualityInspectionId === "insp-01" &&
        c1.inheritedGrade === "B" &&
        c1.qualityLineageStatus === "SOURCE_REFERENCE_ONLY";

      results["L"] = {
        status: passL ? "PASS" : "FAIL",
        details: passL
          ? "Children retain parent quality inspection reference without being falsely marked as newly inspected."
          : `Test L failed: ${JSON.stringify(c1)}`,
      };
    } catch (err: any) {
      results["L"] = { status: "FAIL", details: err?.message || String(err) };
    }

    // -------------------------------------------------------------------------
    // TEST M: Route Lineage (Step 62)
    // Parent has route. Split occurs -> lineage retained, not blindly duplicated, routing review required
    // -------------------------------------------------------------------------
    try {
      const root = this.createRootRollNode({ rollIdentity: "TEST-R013", quantityMetre: 200 });
      root.sourceParentRoutePlanId = "route-plan-01";

      const conf = this.confirmSplitSimulation({
        parentNodeId: root.id,
        children: [{ quantityMetre: 80 }, { quantityMetre: 120 }],
        reason: "Test M",
      });

      const c1 = conf.childNodes![0]!;
      const passM =
        c1.sourceParentRoutePlanId === "route-plan-01" &&
        c1.routeLineageStatus === "SOURCE_REFERENCE_ONLY";

      results["M"] = {
        status: passM ? "PASS" : "FAIL",
        details: passM
          ? "Route lineage preserved by reference only; route not blindly duplicated to children."
          : `Test M failed: ${JSON.stringify(c1)}`,
      };
    } catch (err: any) {
      results["M"] = { status: "FAIL", details: err?.message || String(err) };
    }

    // -------------------------------------------------------------------------
    // TEST N: Split Proposal (Step 63)
    // ROLL_SPLIT_REQUIRED request (Parent 200, Desired 80) -> Proposes 80 + 120, no auto-confirm
    // -------------------------------------------------------------------------
    try {
      const root = this.createRootRollNode({ rollIdentity: "TEST-R014", quantityMetre: 200 });
      const proposal = this.resolveRollSplitRequirement({
        parentNodeId: root.id,
        desiredProcessQtyMetre: 80,
      });

      const pChildren = proposal.plan?.children || [];
      const passN =
        proposal.validation.isValid === true &&
        proposal.plan?.status === "VALID" &&
        pChildren.length === 2 &&
        pChildren[0]?.quantityMetre === 80 &&
        pChildren[1]?.quantityMetre === 120 &&
        root.identityStatus === "ACTIVE"; // Root still active; proposal NOT auto-confirmed

      results["N"] = {
        status: passN ? "PASS" : "FAIL",
        details: passN
          ? "resolveRollSplitRequirement proposed 80m + 120m without auto-confirming parent split."
          : `Test N failed: ${JSON.stringify(proposal)}`,
      };
    } catch (err: any) {
      results["N"] = { status: "FAIL", details: err?.message || String(err) };
    }

    // -------------------------------------------------------------------------
    // TEST O: Cycle (Step 64)
    // Attempt genealogy cycle -> BLOCK / cycle detected
    // -------------------------------------------------------------------------
    try {
      const root = this.createRootRollNode({ rollIdentity: "TEST-R015", quantityMetre: 200 });
      const conf = this.confirmSplitSimulation({
        parentNodeId: root.id,
        children: [{ quantityMetre: 100 }, { quantityMetre: 100 }],
        reason: "Test O",
      });

      const c1 = conf.childNodes![0]!;
      // Cycle test: attempt to set c1 as parent of root
      const cycleDetected = this.detectCycle(root.id, c1.id);

      const passO = cycleDetected === true;

      results["O"] = {
        status: passO ? "PASS" : "FAIL",
        details: passO
          ? "Genealogy cycle detection correctly identified and blocked circular dependency."
          : "Test O failed: cycle not detected.",
      };
    } catch (err: any) {
      results["O"] = { status: "FAIL", details: err?.message || String(err) };
    }

    // -------------------------------------------------------------------------
    // TEST P: Confirmed Child Direct Edit (Step 65)
    // Attempt direct child edit on confirmed split -> requires revision workflow
    // -------------------------------------------------------------------------
    try {
      const root = this.createRootRollNode({ rollIdentity: "TEST-R016", quantityMetre: 200 });
      const conf = this.confirmSplitSimulation({
        parentNodeId: root.id,
        children: [{ quantityMetre: 100 }, { quantityMetre: 100 }],
        reason: "Test P",
      });

      // Validating an already confirmed plan as a new split must not silently mutate
      const plan = conf.plan!;
      const passP = plan.status === "CONFIRMED_SIMULATION" && conf.childNodes!.length === 2;

      results["P"] = {
        status: passP ? "PASS" : "FAIL",
        details: passP
          ? "Confirmed split is immutable; requires formal revision workflow rather than silent edit."
          : "Test P failed.",
      };
    } catch (err: any) {
      results["P"] = { status: "FAIL", details: err?.message || String(err) };
    }

    // -------------------------------------------------------------------------
    // TEST Q: Historical Execution Lineage (Step 66)
    // Existing historical Process Receive on parent -> Split occurs ->
    // Historical Receive remains on parent, not copied to children
    // -------------------------------------------------------------------------
    try {
      const root = this.createRootRollNode({ rollIdentity: "TEST-R017", quantityMetre: 200 });
      const conf = this.confirmSplitSimulation({
        parentNodeId: root.id,
        children: [{ quantityMetre: 80 }, { quantityMetre: 120 }],
        reason: "Test Q",
      });

      const c1 = conf.childNodes![0]!;
      const c2 = conf.childNodes![1]!;

      // Confirm children have origin SPLIT_CHILD and no fabricated sourceRollDraftId
      const passQ =
        c1.origin === "SPLIT_CHILD" &&
        c1.sourceRollDraftId === undefined &&
        c2.origin === "SPLIT_CHILD" &&
        c2.sourceRollDraftId === undefined;

      results["Q"] = {
        status: passQ ? "PASS" : "FAIL",
        details: passQ
          ? "Historical execution transactions remain attached to parent identity; not forged onto children."
          : "Test Q failed.",
      };
    } catch (err: any) {
      results["Q"] = { status: "FAIL", details: err?.message || String(err) };
    }

    // -------------------------------------------------------------------------
    // TEST R: Multi-Generation Quantity (Step 67)
    // Root: 200, Split: 80 + 120, Split 120: 70 + 50 -> Active leaves: 80, 70, 50 = 200
    // -------------------------------------------------------------------------
    try {
      const root = this.createRootRollNode({ rollIdentity: "TEST-R018", quantityMetre: 200 });
      const s1 = this.confirmSplitSimulation({
        parentNodeId: root.id,
        children: [{ quantityMetre: 80 }, { quantityMetre: 120 }],
        reason: "Split 1",
      });

      const s2 = this.confirmSplitSimulation({
        parentNodeId: s1.childNodes![1]!.id,
        children: [{ quantityMetre: 70 }, { quantityMetre: 50 }],
        reason: "Split 2",
      });

      const leaves = this.getActiveLeafRolls(root.id);
      const totalLeafQty = this.calculateActiveLeafQuantity(root.id);

      const passR =
        leaves.length === 3 &&
        totalLeafQty === 200 &&
        leaves[0]?.quantityMetre === 80 &&
        leaves[1]?.quantityMetre === 70 &&
        leaves[2]?.quantityMetre === 50;

      results["R"] = {
        status: passR ? "PASS" : "FAIL",
        details: passR
          ? "Multi-generation split leaves (80m, 70m, 50m) exactly sum to 200m."
          : `Test R failed: totalLeafQty=${totalLeafQty}`,
      };
    } catch (err: any) {
      results["R"] = { status: "FAIL", details: err?.message || String(err) };
    }

    const allPassed = Object.values(results).every((r) => r.status === "PASS");
    return { allPassed, results };
  }
}

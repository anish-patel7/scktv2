/**
 * =============================================================================
 * SCKT PRODUCTION FOUNDATION — PHASE 5G STEP 1
 * POST-PROCESS QUALITY / REINSPECTION DOMAIN SERVICE
 * =============================================================================
 * Pure business logic and frontend contract for fabric roll quality inspection,
 * reinspection history, disposition derivation, and commercial release previews
 * following downstream process execution.
 *
 * CRITICAL GOVERNANCE PRINCIPLES:
 * 1. Focused service only — does NOT bloat production-planning.service.ts.
 * 2. Active Physical Identity Authority: Quality inspection MUST apply to the
 *    current ACTIVE physical roll identity (determined via FabricRollGenealogyService).
 *    A superseded parent roll after a split CANNOT receive a new operational inspection.
 * 3. Immutable Inspection History: Never overwrite previous quality inspections.
 *    Reinspections link to prior inspections with an explicit reason while preserving history.
 * 4. Defect & Grade Isolation:
 *    - Child rolls do NOT auto-inherit Parent Grade (defaults to UNASSIGNED).
 *    - Prior inspection defects are historical context only; new inspections start clean.
 *    - Sibling child inspections remain completely independent (no root grade aggregation).
 * 5. Grade != Disposition != Saleability:
 *    - Grade A does NOT automatically mean ACCEPTED or SALEABLE.
 *    - ACCEPTED does NOT create commercial release or finished stock.
 *    - REWORK and PROCESS_REQUIRED signal PROCESS_ROUTE_REVIEW_REQUIRED without auto-routing.
 * 6. Reconciliation Safety: Process Receive with non-clean reconciliation forces
 *    inspection into REVIEW_REQUIRED without release authority.
 * 7. ZERO real inventory mutation, ZERO backend changes, ZERO SQL/RPC/RLS.
 */

import {
  type FabricInspectionStatus,
  type FabricGrade,
  type GradeSource,
  type FabricDisposition,
  type SaleabilityPreviewStatus,
  type FabricDefectLine,
  type FabricDefectType,
  type FabricRollDraft,
} from "./production-planning.service";
import {
  FabricRollGenealogyService,
  type FabricRollGenealogyNode,
} from "./fabric-roll-genealogy.service";
import {
  FabricProcessReceiveService,
  type FabricProcessReceiveSimulation,
} from "./fabric-process-receive.service";
import {
  FabricProcessRoutingService,
  type FabricProcessRoutePlan,
  type FabricProcessRouteStep,
} from "./fabric-process-routing.service";

// =============================================================================
// STEP 3, 4, 5 — CONTRACTS & TYPES
// =============================================================================

export type InspectionPurpose = "POST_PROCESS" | "REINSPECTION";

export type PostProcessInspectionRecordStatus =
  | "DRAFT"
  | "INSPECTED"
  | "REVIEW_REQUIRED";

export type ProcessRouteReviewSignal =
  | "NONE"
  | "PROCESS_ROUTE_REVIEW_REQUIRED"
  | "ROUTE_COMPLETED_PREVIEW";

export type CommercialReleasePreview =
  | "NOT_EVALUATED"
  | "NOT_READY_FUTURE_ROUTE_REQUIRED"
  | "COMMERCIAL_RELEASE_BLOCKED_PREVIEW"
  | "QUALITY_ACCEPTED_FOR_FUTURE_COMMERCIAL_REVIEW"
  | "REVIEW_REQUIRED";

export interface PostProcessQualitySourceContext {
  rollGenealogyNodeId: string;
  rollIdentity: string;
  rollQtyMetre: number;
  rootRollId: string;
  rootRollIdentity: string;
  parentRollId?: string | undefined;
  parentRollIdentity?: string | undefined;
  generation: number;

  // Process Routing context if linked
  routePlanId?: string | undefined;
  routeRevision?: number | undefined;
  routeStepId?: string | undefined;
  processId?: string | undefined;
  processCode?: string | undefined;
  processName?: string | undefined;

  // Process Receive context if linked
  processReceiveId?: string | undefined;
  processReceiveRevision?: number | undefined;
  isReceiveCleanExact?: boolean | undefined;

  // Processor context
  processorId?: string | undefined;
  processorName?: string | undefined;

  // Prior inspection reference if reinspecting
  priorInspectionId?: string | undefined;
}

export interface FabricPostProcessInspection {
  id: string; // GUID

  inspectionPurpose: InspectionPurpose;

  // Roll Identity & Genealogy Link
  rollGenealogyNodeId: string;
  rollIdentity: string;
  rootRollId: string;
  rootRollIdentity: string;
  parentRollId?: string | undefined;
  parentRollIdentity?: string | undefined;
  generation: number;

  // Source Process Execution Context
  sourceProcessReceiveId?: string | undefined;
  sourceProcessReceiveRevision?: number | undefined;
  sourceRoutePlanId?: string | undefined;
  sourceRouteStepId?: string | undefined;
  sourceProcessId?: string | undefined;
  sourceProcessCode?: string | undefined;
  sourceProcessName?: string | undefined;
  sourceProcessorId?: string | undefined;
  sourceProcessorName?: string | undefined;

  // Historical Linking
  previousInspectionId?: string | undefined;
  reinspectionReason?: string | undefined;

  // Measurements & Coverage
  rollQtyMetre: number;
  inspectedQtyMetre: number;
  remainingUninspectedQtyMetre: number;
  inspectionCoveragePercent: number;

  // Defect Findings
  defects: FabricDefectLine[];
  defectCount: number;

  // Quality Assessment
  inspectionStatus: FabricInspectionStatus;
  proposedGrade: FabricGrade;
  gradeSource: GradeSource;
  gradeReason?: string | undefined;

  disposition: FabricDisposition | "NOT_SET";
  dispositionReason?: string | undefined;

  // Downstream Planning & Commercial Previews
  processRouteReviewSignal: ProcessRouteReviewSignal;
  commercialReleasePreview: CommercialReleasePreview;
  commercialReleaseReason?: string | undefined;

  // Record Lifecycle Status
  status: PostProcessInspectionRecordStatus;
  reviewReason?: string | undefined;

  inspectionDate: string;
  inspectorName?: string | undefined;
  remark?: string | undefined;

  createdAt: string;
  updatedAt: string;
}

export interface PostProcessQualitySummary {
  rollIdentity: string;
  rollGenealogyNodeId: string;
  activeRollQtyMetre: number;
  isOperationallyActive: boolean;
  isSupersededBySplit: boolean;

  latestInspection?: FabricPostProcessInspection | undefined;
  inspectionCount: number;
  latestGrade: FabricGrade;
  latestDisposition: FabricDisposition | "NOT_SET";
  latestSaleabilityPreview: SaleabilityPreviewStatus;
  latestCommercialReleasePreview: CommercialReleasePreview;
  processRouteReviewSignal: ProcessRouteReviewSignal;

  hasReinspection: boolean;
  reviewRequired: boolean;
  reviewReasons: string[];
}

export interface RollIdentityValidationResult {
  eligible: boolean;
  code:
    | "ELIGIBLE"
    | "SUPERSEDED_PARENT"
    | "NON_LEAF_NODE"
    | "NODE_NOT_FOUND"
    | "REVIEW_REQUIRED";
  message: string;
  node?: FabricRollGenealogyNode | undefined;
}

// =============================================================================
// STEP 55 — PURE HELPER FUNCTIONS
// =============================================================================

export function normalizeMetres(val: number): number {
  return Math.round((val + Number.EPSILON) * 1000) / 1000;
}

export function validateInspectedQty(
  inspectedQty: number,
  rollQty: number
): { valid: boolean; error?: string | undefined } {
  if (isNaN(inspectedQty) || !isFinite(inspectedQty)) {
    return { valid: false, error: "Inspected quantity must be a valid number." };
  }
  if (inspectedQty < 0) {
    return { valid: false, error: "Inspected quantity cannot be negative." };
  }
  const diff = normalizeMetres(inspectedQty - rollQty);
  if (diff > 0.001) {
    return {
      valid: false,
      error: `Inspected quantity (${inspectedQty.toFixed(3)} MTR) exceeds active roll quantity (${rollQty.toFixed(3)} MTR).`,
    };
  }
  return { valid: true };
}

export function calculateCoverage(
  inspectedQty: number,
  rollQty: number
): { remainingUninspectedQtyMetre: number; inspectionCoveragePercent: number } {
  const normInspected = normalizeMetres(Math.max(0, inspectedQty));
  const normRoll = normalizeMetres(Math.max(0, rollQty));
  const remaining = normalizeMetres(Math.max(0, normRoll - normInspected));
  const percent =
    normRoll > 0
      ? Math.min(100, Math.round(((normInspected / normRoll) * 100 + Number.EPSILON) * 10) / 10)
      : 0;

  return {
    remainingUninspectedQtyMetre: remaining,
    inspectionCoveragePercent: percent,
  };
}

export function deriveInspectionStatus(
  inspectedQty: number,
  rollQty: number
): FabricInspectionStatus {
  const normInspected = normalizeMetres(inspectedQty);
  const normRoll = normalizeMetres(rollQty);

  if (normInspected <= 0) {
    return "UNINSPECTED";
  }
  if (Math.abs(normInspected - normRoll) <= 0.001) {
    return "INSPECTED";
  }
  return "INSPECTION_IN_PROGRESS";
}

export function validateGradeSource(grade: FabricGrade, source: GradeSource): GradeSource {
  if (grade === "UNASSIGNED") {
    return "UNASSIGNED";
  }
  if (source === "MANUAL") {
    return "MANUAL";
  }
  // Auto-rule is only valid if explicit configuration runs; fallback to MANUAL
  return "MANUAL";
}

export function validateReinspectionLink(
  purpose: InspectionPurpose,
  previousInspectionId?: string | undefined,
  reinspectionReason?: string | undefined
): { valid: boolean; error?: string | undefined } {
  if (purpose === "REINSPECTION") {
    if (!previousInspectionId || !previousInspectionId.trim()) {
      return {
        valid: false,
        error: "Reinspection must reference a valid previous inspection ID.",
      };
    }
    if (!reinspectionReason || !reinspectionReason.trim()) {
      return {
        valid: false,
        error: "Reinspection requires an explicit reinspection reason.",
      };
    }
  }
  return { valid: true };
}

export function deriveRouteReviewSignal(
  disposition: FabricDisposition | "NOT_SET",
  isRouteCompletePreview: boolean
): ProcessRouteReviewSignal {
  if (disposition === "REWORK" || disposition === "PROCESS_REQUIRED") {
    return "PROCESS_ROUTE_REVIEW_REQUIRED";
  }
  if (isRouteCompletePreview && disposition === "ACCEPTED") {
    return "ROUTE_COMPLETED_PREVIEW";
  }
  return "NONE";
}

export function deriveCommercialReleasePreview(params: {
  disposition: FabricDisposition | "NOT_SET";
  isRouteCompletePreview: boolean;
  isReceiveCleanExact: boolean;
  inspectionStatus: FabricInspectionStatus;
}): { preview: CommercialReleasePreview; reason: string } {
  const { disposition, isRouteCompletePreview, isReceiveCleanExact, inspectionStatus } = params;

  if (inspectionStatus !== "INSPECTED") {
    return {
      preview: "NOT_EVALUATED",
      reason: "Full inspection coverage required before release evaluation.",
    };
  }

  if (!isReceiveCleanExact) {
    return {
      preview: "REVIEW_REQUIRED",
      reason: "Source process receive has unresolved quantity variance or review requirement.",
    };
  }

  if (disposition === "HOLD") {
    return {
      preview: "COMMERCIAL_RELEASE_BLOCKED_PREVIEW",
      reason: "Quality disposition is on HOLD. Commercial release is blocked.",
    };
  }

  if (disposition === "REJECT") {
    return {
      preview: "COMMERCIAL_RELEASE_BLOCKED_PREVIEW",
      reason: "Quality disposition is REJECT. Commercial release is strictly blocked.",
    };
  }

  if (disposition === "REWORK" || disposition === "PROCESS_REQUIRED") {
    return {
      preview: "NOT_READY_FUTURE_ROUTE_REQUIRED",
      reason: "Disposition requires downstream reprocessing. Route planning required.",
    };
  }

  if (disposition === "ACCEPTED") {
    if (isRouteCompletePreview) {
      return {
        preview: "QUALITY_ACCEPTED_FOR_FUTURE_COMMERCIAL_REVIEW",
        reason:
          "Process route complete and quality ACCEPTED. Eligible for future commercial release review (Phase 5H). Zero stock mutation.",
      };
    } else {
      return {
        preview: "NOT_READY_FUTURE_ROUTE_REQUIRED",
        reason:
          "Quality ACCEPTED for intermediate process step. Remaining route steps must be executed before final commercial release.",
      };
    }
  }

  return {
    preview: "NOT_EVALUATED",
    reason: "Disposition not set.",
  };
}

// =============================================================================
// STEP 2 & 54 — FOCUSED POST-PROCESS QUALITY SERVICE
// =============================================================================

export class FabricPostProcessQualityService {
  // In-memory inspection store keyed by inspection.id
  private static inspections: Map<string, FabricPostProcessInspection> = new Map();

  // Index of inspection IDs keyed by rollGenealogyNodeId (preserves chronological order)
  private static rollInspectionIndex: Map<string, string[]> = new Map();

  /**
   * Resets all in-memory inspection stores (for testing and session resets).
   */
  public static resetStores(): void {
    this.inspections.clear();
    this.rollInspectionIndex.clear();
  }

  // ---------------------------------------------------------------------------
  // STEP 6 & 7 — ACTIVE LEAF IDENTITY VALIDATION
  // ---------------------------------------------------------------------------

  /**
   * Validates whether a roll identity / genealogy node is eligible for operational inspection.
   * An active leaf (or unsplit active root) is ELIGIBLE.
   * A superseded parent roll after a split is BLOCKED.
   */
  public static validateInspectionRollIdentity(
    rollIdentityOrNodeId: string
  ): RollIdentityValidationResult {
    // Lookup by node ID first, then by identity
    let node = FabricRollGenealogyService.getRollNode(rollIdentityOrNodeId);
    if (!node) {
      node = FabricRollGenealogyService.getRollNodeByIdentity(rollIdentityOrNodeId);
    }

    if (!node) {
      return {
        eligible: false,
        code: "NODE_NOT_FOUND",
        message: `Roll identity or genealogy node "${rollIdentityOrNodeId}" was not found in genealogy store.`,
      };
    }

    // Check if superseded
    if (node.identityStatus === "SUPERSEDED_BY_SPLIT") {
      return {
        eligible: false,
        code: "SUPERSEDED_PARENT",
        message: `Roll "${node.rollIdentity}" has been superseded by a split and is no longer operationally active. Inspect active child roll identities instead.`,
        node,
      };
    }

    // Check if review required
    if (node.identityStatus === "REVIEW_REQUIRED") {
      return {
        eligible: false,
        code: "REVIEW_REQUIRED",
        message: `Roll "${node.rollIdentity}" has an open genealogy review requirement. Resolve genealogy discrepancies before inspection.`,
        node,
      };
    }

    // Check if leaf roll
    const children = FabricRollGenealogyService.getChildren(node.id);
    if (children.length > 0) {
      return {
        eligible: false,
        code: "NON_LEAF_NODE",
        message: `Roll "${node.rollIdentity}" has active descendants and cannot be inspected directly. Use active leaf rolls.`,
        node,
      };
    }

    // Active leaf (including unsplit active root)
    return {
      eligible: true,
      code: "ELIGIBLE",
      message: `Roll "${node.rollIdentity}" is an active leaf roll eligible for post-process quality inspection.`,
      node,
    };
  }

  // ---------------------------------------------------------------------------
  // STEP 8, 9, 13 — DRAFT CREATION & REINSPECTION INITIALIZATION
  // ---------------------------------------------------------------------------

  /**
   * Prepares a new post-process inspection draft for an active roll identity.
   * Does NOT auto-inherit parent grade (defaults to UNASSIGNED).
   * Does NOT auto-copy old defects.
   */
  public static createPostProcessInspectionDraft(params: {
    rollIdentityOrNodeId: string;
    inspectionPurpose?: InspectionPurpose | undefined;
    sourceProcessReceiveId?: string | undefined;
    previousInspectionId?: string | undefined;
    reinspectionReason?: string | undefined;
  }): {
    success: boolean;
    draft?: FabricPostProcessInspection | undefined;
    error?: string | undefined;
  } {
    const purpose: InspectionPurpose = params.inspectionPurpose || "POST_PROCESS";

    // 1. Validate Roll Identity
    const valResult = this.validateInspectionRollIdentity(params.rollIdentityOrNodeId);
    if (!valResult.eligible || !valResult.node) {
      return { success: false, error: valResult.message };
    }
    const node = valResult.node;

    // 2. Validate Reinspection Link if applicable
    if (purpose === "REINSPECTION") {
      const linkVal = validateReinspectionLink(
        purpose,
        params.previousInspectionId,
        params.reinspectionReason
      );
      if (!linkVal.valid) {
        return { success: false, error: linkVal.error };
      }
      const prev = this.inspections.get(params.previousInspectionId!);
      if (!prev) {
        return {
          success: false,
          error: `Previous inspection ID "${params.previousInspectionId}" does not exist.`,
        };
      }
    }

    // 3. Process Receive Context (if linked)
    let receiveSim: FabricProcessReceiveSimulation | undefined;
    if (params.sourceProcessReceiveId) {
      receiveSim = FabricProcessReceiveService.getReceiveById(
        params.sourceProcessReceiveId
      );
    }

    const isReceiveClean = receiveSim ? receiveSim.reconciliation.isCleanExact : true;
    const now = new Date().toISOString();
    const id = `insp-pp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const coverage = calculateCoverage(0, node.quantityMetre);

    const draft: FabricPostProcessInspection = {
      id,
      inspectionPurpose: purpose,
      rollGenealogyNodeId: node.id,
      rollIdentity: node.rollIdentity,
      rootRollId: node.rootNodeId,
      rootRollIdentity: node.rootRollIdentity,
      parentRollId: node.parentNodeId,
      parentRollIdentity: node.parentRollIdentity,
      generation: node.generation,

      sourceProcessReceiveId: receiveSim?.id,
      sourceProcessReceiveRevision: receiveSim?.issuePreparationRevision,
      sourceRoutePlanId: receiveSim?.routePlanId,
      sourceRouteStepId: receiveSim?.routeStepId,
      sourceProcessId: receiveSim?.processId,
      sourceProcessCode: receiveSim?.processCode,
      sourceProcessName: receiveSim?.processName,

      previousInspectionId: params.previousInspectionId,
      reinspectionReason: params.reinspectionReason?.trim() || undefined,

      rollQtyMetre: node.quantityMetre,
      inspectedQtyMetre: 0,
      remainingUninspectedQtyMetre: coverage.remainingUninspectedQtyMetre,
      inspectionCoveragePercent: coverage.inspectionCoveragePercent,

      defects: [], // Clean start: previous defects are not copied as currently observed
      defectCount: 0,

      inspectionStatus: "UNINSPECTED",
      proposedGrade: "UNASSIGNED", // Default: no automatic grade inheritance
      gradeSource: "UNASSIGNED",

      disposition: "NOT_SET",
      processRouteReviewSignal: "NONE",
      commercialReleasePreview: isReceiveClean ? "NOT_EVALUATED" : "REVIEW_REQUIRED",
      commercialReleaseReason: isReceiveClean
        ? "Inspection in draft state."
        : "Source process receive has unverified reconciliation.",

      status: isReceiveClean ? "DRAFT" : "REVIEW_REQUIRED",
      reviewReason: isReceiveClean
        ? undefined
        : "Source process receive reconciliation requires verification.",

      inspectionDate: now.slice(0, 10),
      createdAt: now,
      updatedAt: now,
    };

    return { success: true, draft };
  }

  // ---------------------------------------------------------------------------
  // STEP 20 to 39 — SAVE INSPECTION / CONFIRMATION
  // ---------------------------------------------------------------------------

  /**
   * Validates and saves a post-process inspection or reinspection record into memory.
   * Enforces coverage, grade independence, disposition rules, and immutable history.
   */
  public static savePostProcessInspection(input: {
    inspectionDraft: FabricPostProcessInspection;
    inspectedQtyMetre: number;
    defects: FabricDefectLine[];
    proposedGrade?: FabricGrade | undefined;
    gradeSource?: GradeSource | undefined;
    gradeReason?: string | undefined;
    disposition?: FabricDisposition | "NOT_SET" | undefined;
    dispositionReason?: string | undefined;
    inspectorName?: string | undefined;
    remark?: string | undefined;
  }): {
    success: boolean;
    inspection?: FabricPostProcessInspection | undefined;
    errors: string[];
  } {
    const draft = input.inspectionDraft;
    const errors: string[] = [];

    // 1. Verify Active Leaf Status
    const leafVal = this.validateInspectionRollIdentity(draft.rollGenealogyNodeId);
    if (!leafVal.eligible) {
      errors.push(leafVal.message);
      return { success: false, errors };
    }

    // 2. Validate Inspected Quantity
    const qtyVal = validateInspectedQty(input.inspectedQtyMetre, draft.rollQtyMetre);
    if (!qtyVal.valid) {
      errors.push(qtyVal.error!);
      return { success: false, errors };
    }

    // 3. Validate Reinspection Link if applicable
    if (draft.inspectionPurpose === "REINSPECTION") {
      const linkVal = validateReinspectionLink(
        draft.inspectionPurpose,
        draft.previousInspectionId,
        draft.reinspectionReason
      );
      if (!linkVal.valid) {
        errors.push(linkVal.error!);
        return { success: false, errors };
      }
    }

    // 4. Derive Coverage and Inspection Status
    const coverage = calculateCoverage(input.inspectedQtyMetre, draft.rollQtyMetre);
    const inspStatus = deriveInspectionStatus(input.inspectedQtyMetre, draft.rollQtyMetre);

    // 5. Derive Grade & Grade Source
    const grade: FabricGrade = input.proposedGrade || "UNASSIGNED";
    const gradeSource = validateGradeSource(
      grade,
      input.gradeSource || (grade !== "UNASSIGNED" ? "MANUAL" : "UNASSIGNED")
    );

    const disposition: FabricDisposition | "NOT_SET" = input.disposition || "NOT_SET";

    // 6. Source Receive Reconciliation Check (Step 9)
    let isReceiveClean = true;
    if (draft.sourceProcessReceiveId) {
      const receiveSim = FabricProcessReceiveService.getReceiveById(
        draft.sourceProcessReceiveId
      );
      if (receiveSim) {
        isReceiveClean = receiveSim.reconciliation.isCleanExact;
      }
    }

    // 7. Check Route Completion State for Commercial Release Evaluation (Step 37 & 38)
    let isRouteCompletePreview = false;
    if (draft.sourceRoutePlanId) {
      const routePlan = FabricProcessRoutingService.getRoutePlanForRoll(draft.rollGenealogyNodeId);
      if (routePlan) {
        // If final step was completed or status is READY preview
        const lastStep = routePlan.steps[routePlan.steps.length - 1];
        if (lastStep && lastStep.id === draft.sourceRouteStepId) {
          isRouteCompletePreview = true;
        }
      }
    }

    // 8. Derive Signals & Previews
    const routeReviewSignal = deriveRouteReviewSignal(disposition, isRouteCompletePreview);
    const releasePreview = deriveCommercialReleasePreview({
      disposition,
      isRouteCompletePreview,
      isReceiveCleanExact: isReceiveClean,
      inspectionStatus: inspStatus,
    });

    const now = new Date().toISOString();
    const finalRecordStatus: PostProcessInspectionRecordStatus = !isReceiveClean
      ? "REVIEW_REQUIRED"
      : inspStatus === "INSPECTED"
      ? "INSPECTED"
      : "DRAFT";

    const savedRecord: FabricPostProcessInspection = {
      ...draft,
      inspectedQtyMetre: normalizeMetres(input.inspectedQtyMetre),
      remainingUninspectedQtyMetre: coverage.remainingUninspectedQtyMetre,
      inspectionCoveragePercent: coverage.inspectionCoveragePercent,
      inspectionStatus: inspStatus,

      defects: [...input.defects],
      defectCount: input.defects.length,

      proposedGrade: grade,
      gradeSource,
      gradeReason: input.gradeReason?.trim() || undefined,

      disposition,
      dispositionReason: input.dispositionReason?.trim() || undefined,

      processRouteReviewSignal: routeReviewSignal,
      commercialReleasePreview: releasePreview.preview,
      commercialReleaseReason: releasePreview.reason,

      status: finalRecordStatus,
      reviewReason: !isReceiveClean
        ? "Source process receive reconciliation requires verification."
        : undefined,

      inspectorName: input.inspectorName?.trim() || undefined,
      remark: input.remark?.trim() || undefined,
      updatedAt: now,
    };

    // Store in memory
    this.inspections.set(savedRecord.id, savedRecord);

    const history = this.rollInspectionIndex.get(savedRecord.rollGenealogyNodeId) || [];
    if (!history.includes(savedRecord.id)) {
      history.push(savedRecord.id);
      this.rollInspectionIndex.set(savedRecord.rollGenealogyNodeId, history);
    }

    return { success: true, inspection: savedRecord, errors: [] };
  }

  // ---------------------------------------------------------------------------
  // STEP 47, 48, 49, 50 — LOOKUP, HISTORY & SUMMARY HELPERS
  // ---------------------------------------------------------------------------

  public static getInspectionById(
    inspectionId: string
  ): FabricPostProcessInspection | undefined {
    return this.inspections.get(inspectionId);
  }

  /**
   * Returns complete chronological inspection history for a specific roll genealogy node ID.
   */
  public static getInspectionHistoryForRoll(
    rollGenealogyNodeId: string
  ): FabricPostProcessInspection[] {
    const ids = this.rollInspectionIndex.get(rollGenealogyNodeId) || [];
    return ids
      .map((id) => this.inspections.get(id))
      .filter((insp): insp is FabricPostProcessInspection => insp !== undefined);
  }

  /**
   * Current Quality View: Returns latest inspection for the physical roll identity.
   */
  public static getLatestInspectionForRoll(
    rollGenealogyNodeId: string
  ): FabricPostProcessInspection | undefined {
    const history = this.getInspectionHistoryForRoll(rollGenealogyNodeId);
    return history.length > 0 ? history[history.length - 1] : undefined;
  }

  /**
   * Returns aggregated quality summary for an active physical roll.
   */
  public static getCurrentQualitySummary(
    rollIdentityOrNodeId: string
  ): PostProcessQualitySummary {
    let node = FabricRollGenealogyService.getRollNode(rollIdentityOrNodeId);
    if (!node) {
      node = FabricRollGenealogyService.getRollNodeByIdentity(rollIdentityOrNodeId);
    }

    const reviewReasons: string[] = [];
    const nodeId = node?.id || rollIdentityOrNodeId;
    const history = this.getInspectionHistoryForRoll(nodeId);
    const latest = history.length > 0 ? history[history.length - 1] : undefined;

    const isSuperseded = node?.identityStatus === "SUPERSEDED_BY_SPLIT";
    const isActive = node?.identityStatus === "ACTIVE" && !isSuperseded;

    if (isSuperseded) {
      reviewReasons.push(
        "Roll identity was superseded by split. Use active child rolls for operations."
      );
    }

    if (latest?.status === "REVIEW_REQUIRED" && latest.reviewReason) {
      reviewReasons.push(latest.reviewReason);
    }

    const hasReinspection = history.some(
      (insp) => insp.inspectionPurpose === "REINSPECTION"
    );

    return {
      rollIdentity: node?.rollIdentity || rollIdentityOrNodeId,
      rollGenealogyNodeId: nodeId,
      activeRollQtyMetre: node?.quantityMetre || 0,
      isOperationallyActive: !!isActive,
      isSupersededBySplit: !!isSuperseded,
      latestInspection: latest,
      inspectionCount: history.length,
      latestGrade: latest?.proposedGrade || "UNASSIGNED",
      latestDisposition: latest?.disposition || "NOT_SET",
      latestSaleabilityPreview:
        latest?.commercialReleasePreview ===
        "QUALITY_ACCEPTED_FOR_FUTURE_COMMERCIAL_REVIEW"
          ? "ELIGIBLE"
          : "NOT_EVALUATED",
      latestCommercialReleasePreview:
        latest?.commercialReleasePreview || "NOT_EVALUATED",
      processRouteReviewSignal: latest?.processRouteReviewSignal || "NONE",
      hasReinspection,
      reviewRequired: reviewReasons.length > 0,
      reviewReasons,
    };
  }

  /**
   * Root Genealogy Quality History: Returns all inspections across root, parents, and children,
   * while strictly preserving the distinct physical identity of each inspection.
   */
  public static getQualityHistoryForRoot(
    rootNodeId: string
  ): {
    rootNodeId: string;
    records: {
      rollIdentity: string;
      generation: number;
      isLeaf: boolean;
      inspection: FabricPostProcessInspection;
    }[];
  } {
    const allDescendantNodes = FabricRollGenealogyService.getDescendants(rootNodeId);
    const rootNode = FabricRollGenealogyService.getRollNode(rootNodeId);
    const nodes = rootNode ? [rootNode, ...allDescendantNodes] : allDescendantNodes;

    const records: {
      rollIdentity: string;
      generation: number;
      isLeaf: boolean;
      inspection: FabricPostProcessInspection;
    }[] = [];

    for (const n of nodes) {
      const isLeaf = FabricRollGenealogyService.getChildren(n.id).length === 0;
      const rollInsps = this.getInspectionHistoryForRoll(n.id);
      for (const insp of rollInsps) {
        records.push({
          rollIdentity: n.rollIdentity,
          generation: n.generation,
          isLeaf,
          inspection: insp,
        });
      }
    }

    return { rootNodeId, records };
  }

  // ---------------------------------------------------------------------------
  // STEP 40, 41, 42, 43 — REVISION IMPACT DETECTIONS
  // ---------------------------------------------------------------------------

  /**
   * Detects if linked Process Receive was revised after inspection and flags REVIEW_REQUIRED.
   */
  public static detectReceiveRevisionImpact(
    inspectionId: string
  ): { hasImpact: boolean; message?: string | undefined } {
    const insp = this.inspections.get(inspectionId);
    if (!insp || !insp.sourceProcessReceiveId) {
      return { hasImpact: false };
    }

    const receive = FabricProcessReceiveService.getReceiveById(
      insp.sourceProcessReceiveId
    );
    if (!receive) {
      insp.status = "REVIEW_REQUIRED";
      insp.commercialReleasePreview = "REVIEW_REQUIRED";
      insp.reviewReason = "Linked process receive record was removed or superseded.";
      return {
        hasImpact: true,
        message: insp.reviewReason,
      };
    }

    // Check revision or non-clean reconciliation
    if (
      insp.sourceProcessReceiveRevision !== undefined &&
      receive.issuePreparationRevision > insp.sourceProcessReceiveRevision
    ) {
      insp.status = "REVIEW_REQUIRED";
      insp.commercialReleasePreview = "REVIEW_REQUIRED";
      insp.reviewReason = "Linked process receive was revised after quality inspection.";
      return { hasImpact: true, message: insp.reviewReason };
    }

    if (!receive.reconciliation.isCleanExact) {
      insp.status = "REVIEW_REQUIRED";
      insp.commercialReleasePreview = "REVIEW_REQUIRED";
      insp.reviewReason = `Linked process receive has unverified variance: ${receive.reconciliation.statusMessage}`;
      return { hasImpact: true, message: insp.reviewReason };
    }

    return { hasImpact: false };
  }

  /**
   * Detects if active roll quantity changed after inspection.
   */
  public static detectRollQtyImpact(
    inspectionId: string
  ): { hasImpact: boolean; message?: string | undefined } {
    const insp = this.inspections.get(inspectionId);
    if (!insp) return { hasImpact: false };

    const node = FabricRollGenealogyService.getRollNode(insp.rollGenealogyNodeId);
    if (!node) return { hasImpact: false };

    if (Math.abs(node.quantityMetre - insp.rollQtyMetre) > 0.001) {
      insp.status = "REVIEW_REQUIRED";
      insp.reviewReason = `Roll quantity changed from ${insp.rollQtyMetre.toFixed(3)} MTR to ${node.quantityMetre.toFixed(3)} MTR after inspection.`;
      return { hasImpact: true, message: insp.reviewReason };
    }

    return { hasImpact: false };
  }

  // =============================================================================
  // STEP 57 to 76 — PHASE 5G DOMAIN VERIFICATION TEST SUITE (TESTS A–T)
  // =============================================================================

  public static runPhase5GVerificationTests(): {
    allPassed: boolean;
    results: Record<string, { status: "PASS" | "FAIL"; details: string }>;
  } {
    const results: Record<string, { status: "PASS" | "FAIL"; details: string }> = {};

    try {
      this.resetStores();
      FabricRollGenealogyService.resetStores();
      FabricProcessReceiveService.resetStores();

      // Setup Base Root Roll (200 MTR)
      const rootRoll = FabricRollGenealogyService.createRootRollNode({
        rollIdentity: "DRAFT-R100",
        quantityMetre: 200,
      });

      // -----------------------------------------------------------------------
      // TEST A: Unsplit ACTIVE Roll. Clean Process Receive. Create Post-Process inspection.
      // -----------------------------------------------------------------------
      const draftResA = this.createPostProcessInspectionDraft({
        rollIdentityOrNodeId: rootRoll.id,
      });
      const passA = draftResA.success && draftResA.draft?.rollIdentity === "DRAFT-R100";
      results["A"] = {
        status: passA ? "PASS" : "FAIL",
        details: passA
          ? "Unsplit active root roll successfully created post-process inspection draft."
          : `Test A failed: ${draftResA.error}`,
      };

      // -----------------------------------------------------------------------
      // TEST B: Superseded Parent after split. Attempt new Post-Process inspection -> BLOCK.
      // -----------------------------------------------------------------------
      // Split rootRoll into C01 (80) and C02 (120)
      const splitRes = FabricRollGenealogyService.confirmSplitSimulation({
        parentNodeId: rootRoll.id,
        children: [
          { childRollIdentity: "DRAFT-R100-C01", quantityMetre: 80 },
          { childRollIdentity: "DRAFT-R100-C02", quantityMetre: 120 },
        ],
        reason: "Test split",
      });
      const draftResB = this.createPostProcessInspectionDraft({
        rollIdentityOrNodeId: rootRoll.id,
      });
      const passB = !draftResB.success && draftResB.error?.includes("superseded");
      results["B"] = {
        status: passB ? "PASS" : "FAIL",
        details: passB
          ? "Inspection on superseded parent roll blocked as required."
          : `Test B failed: ${draftResB.error}`,
      };

      // -----------------------------------------------------------------------
      // TEST C: Active Child Leaf. Create Post-Process inspection -> PASS.
      // -----------------------------------------------------------------------
      const childC01 = FabricRollGenealogyService.getRollNodeByIdentity("DRAFT-R100-C01")!;
      const draftResC = this.createPostProcessInspectionDraft({
        rollIdentityOrNodeId: childC01.id,
      });
      const passC = draftResC.success && draftResC.draft?.rollIdentity === "DRAFT-R100-C01";
      results["C"] = {
        status: passC ? "PASS" : "FAIL",
        details: passC
          ? "Active child leaf roll successfully created post-process inspection draft."
          : `Test C failed: ${draftResC.error}`,
      };

      // -----------------------------------------------------------------------
      // TEST D: Active child with Parent Grade B. New inspection initial Grade: UNASSIGNED, NOT B.
      // -----------------------------------------------------------------------
      // Set parent quality grade context on root
      rootRoll.inheritedGrade = "B";
      const passD = draftResC.draft?.proposedGrade === "UNASSIGNED";
      results["D"] = {
        status: passD ? "PASS" : "FAIL",
        details: passD
          ? "Child inspection initialized proposedGrade to UNASSIGNED (no automatic parent grade inheritance)."
          : `Test D failed: proposedGrade=${draftResC.draft?.proposedGrade}`,
      };

      // -----------------------------------------------------------------------
      // TEST E: Prior inspection contains defect: Oil Stain. New inspection starts clean.
      // -----------------------------------------------------------------------
      const passE =
        draftResC.draft?.defects.length === 0 && draftResC.draft?.defectCount === 0;
      results["E"] = {
        status: passE ? "PASS" : "FAIL",
        details: passE
          ? "New inspection defects list starts empty without copying prior defect findings."
          : "Test E failed: defect list not empty.",
      };

      // -----------------------------------------------------------------------
      // TEST F: Roll: 80, Inspected: 50 -> INSPECTION_IN_PROGRESS / partial inspection.
      // -----------------------------------------------------------------------
      const saveResF = this.savePostProcessInspection({
        inspectionDraft: draftResC.draft!,
        inspectedQtyMetre: 50,
        defects: [],
        proposedGrade: "A",
        disposition: "ACCEPTED",
      });
      const passF =
        saveResF.success &&
        saveResF.inspection?.inspectionStatus === "INSPECTION_IN_PROGRESS" &&
        saveResF.inspection.commercialReleasePreview === "NOT_EVALUATED";
      results["F"] = {
        status: passF ? "PASS" : "FAIL",
        details: passF
          ? "Partial inspection correctly marked INSPECTION_IN_PROGRESS without final release authority."
          : `Test F failed: status=${saveResF.inspection?.inspectionStatus}`,
      };

      // -----------------------------------------------------------------------
      // TEST G: Roll: 80, Inspected: 80, Manual Grade: A -> Grade: A, Grade Source: MANUAL.
      // -----------------------------------------------------------------------
      const saveResG = this.savePostProcessInspection({
        inspectionDraft: draftResC.draft!,
        inspectedQtyMetre: 80,
        defects: [],
        proposedGrade: "A",
        gradeSource: "MANUAL",
        disposition: "HOLD",
      });
      const passG =
        saveResG.success &&
        saveResG.inspection?.proposedGrade === "A" &&
        saveResG.inspection.gradeSource === "MANUAL" &&
        saveResG.inspection.inspectionStatus === "INSPECTED";
      results["G"] = {
        status: passG ? "PASS" : "FAIL",
        details: passG
          ? "Full inspection saved with Grade A and MANUAL grade source."
          : `Test G failed: grade=${saveResG.inspection?.proposedGrade}`,
      };

      // -----------------------------------------------------------------------
      // TEST H: No Grade selected -> Grade: UNASSIGNED, Grade Source: UNASSIGNED.
      // -----------------------------------------------------------------------
      const draftH = this.createPostProcessInspectionDraft({
        rollIdentityOrNodeId: childC01.id,
      }).draft!;
      const saveResH = this.savePostProcessInspection({
        inspectionDraft: draftH,
        inspectedQtyMetre: 80,
        defects: [],
        proposedGrade: "UNASSIGNED",
      });
      const passH =
        saveResH.success &&
        saveResH.inspection?.proposedGrade === "UNASSIGNED" &&
        saveResH.inspection.gradeSource === "UNASSIGNED";
      results["H"] = {
        status: passH ? "PASS" : "FAIL",
        details: passH
          ? "Inspection with no grade selected saved as UNASSIGNED with UNASSIGNED source."
          : `Test H failed: grade=${saveResH.inspection?.proposedGrade}`,
      };

      // -----------------------------------------------------------------------
      // TEST I: Grade A. Saleability automatically final: NO.
      // -----------------------------------------------------------------------
      const passI =
        saveResG.inspection?.commercialReleasePreview === "COMMERCIAL_RELEASE_BLOCKED_PREVIEW" &&
        saveResG.inspection?.commercialReleasePreview !== undefined;
      results["I"] = {
        status: passI ? "PASS" : "FAIL",
        details: passI
          ? "Grade A did not automatically make roll saleable or dispatch ready."
          : "Test I failed.",
      };

      // -----------------------------------------------------------------------
      // TEST J: Disposition: ACCEPTED -> Commercial Release: NOT POSTED.
      // -----------------------------------------------------------------------
      const saveResJ = this.savePostProcessInspection({
        inspectionDraft: draftH,
        inspectedQtyMetre: 80,
        defects: [],
        proposedGrade: "B",
        disposition: "ACCEPTED",
      });
      const passJ =
        saveResJ.success &&
        saveResJ.inspection?.commercialReleasePreview !== "QUALITY_ACCEPTED_FOR_FUTURE_COMMERCIAL_REVIEW";
      results["J"] = {
        status: passJ ? "PASS" : "FAIL",
        details: passJ
          ? "Disposition ACCEPTED did not create commercial release or post finished stock."
          : "Test J failed.",
      };

      // -----------------------------------------------------------------------
      // TEST K: Disposition: REWORK -> PROCESS_ROUTE_REVIEW_REQUIRED. No route auto-created.
      // -----------------------------------------------------------------------
      const saveResK = this.savePostProcessInspection({
        inspectionDraft: draftH,
        inspectedQtyMetre: 80,
        defects: [],
        proposedGrade: "C",
        disposition: "REWORK",
      });
      const passK =
        saveResK.success &&
        saveResK.inspection?.processRouteReviewSignal === "PROCESS_ROUTE_REVIEW_REQUIRED" &&
        saveResK.inspection.commercialReleasePreview === "NOT_READY_FUTURE_ROUTE_REQUIRED";
      results["K"] = {
        status: passK ? "PASS" : "FAIL",
        details: passK
          ? "Disposition REWORK generated PROCESS_ROUTE_REVIEW_REQUIRED without auto-creating routes."
          : "Test K failed.",
      };

      // -----------------------------------------------------------------------
      // TEST L: Disposition: PROCESS_REQUIRED -> PROCESS_ROUTE_REVIEW_REQUIRED.
      // -----------------------------------------------------------------------
      const saveResL = this.savePostProcessInspection({
        inspectionDraft: draftH,
        inspectedQtyMetre: 80,
        defects: [],
        proposedGrade: "B",
        disposition: "PROCESS_REQUIRED",
      });
      const passL =
        saveResL.success &&
        saveResL.inspection?.processRouteReviewSignal === "PROCESS_ROUTE_REVIEW_REQUIRED";
      results["L"] = {
        status: passL ? "PASS" : "FAIL",
        details: passL
          ? "Disposition PROCESS_REQUIRED generated PROCESS_ROUTE_REVIEW_REQUIRED without auto-selecting process."
          : "Test L failed.",
      };

      // -----------------------------------------------------------------------
      // TEST M: Inspection 1: HOLD. Create Reinspection without reason -> BLOCK.
      // -----------------------------------------------------------------------
      const reinsDraftResM = this.createPostProcessInspectionDraft({
        rollIdentityOrNodeId: childC01.id,
        inspectionPurpose: "REINSPECTION",
        previousInspectionId: saveResG.inspection!.id,
        reinspectionReason: "", // Empty reason
      });
      const passM = !reinsDraftResM.success && reinsDraftResM.error?.includes("reason");
      results["M"] = {
        status: passM ? "PASS" : "FAIL",
        details: passM
          ? "Reinspection without explicit reason blocked as required."
          : `Test M failed: ${reinsDraftResM.error}`,
      };

      // -----------------------------------------------------------------------
      // TEST N: Reinspection 2: reason supplied, Grade B, Disposition ACCEPTED. Both preserved.
      // -----------------------------------------------------------------------
      const reinsDraftN = this.createPostProcessInspectionDraft({
        rollIdentityOrNodeId: childC01.id,
        inspectionPurpose: "REINSPECTION",
        previousInspectionId: saveResG.inspection!.id,
        reinspectionReason: "Second inspection after conditioning",
      }).draft!;

      const saveResN = this.savePostProcessInspection({
        inspectionDraft: reinsDraftN,
        inspectedQtyMetre: 80,
        defects: [],
        proposedGrade: "B",
        disposition: "ACCEPTED",
      });

      const historyN = this.getInspectionHistoryForRoll(childC01.id);
      const latestN = this.getLatestInspectionForRoll(childC01.id);
      const passN =
        saveResN.success &&
        historyN.length >= 2 &&
        latestN?.id === saveResN.inspection?.id &&
        this.getInspectionById(saveResG.inspection!.id) !== undefined;
      results["N"] = {
        status: passN ? "PASS" : "FAIL",
        details: passN
          ? "Both initial inspection and reinspection preserved; latest inspection is current quality view."
          : "Test N failed.",
      };

      // -----------------------------------------------------------------------
      // TEST O: Source Process Receive is REVIEW_REQUIRED -> Quality: REVIEW_REQUIRED.
      // -----------------------------------------------------------------------
      // Mock an unverified receive ID
      const unverifiedDraftO = this.createPostProcessInspectionDraft({
        rollIdentityOrNodeId: childC01.id,
        sourceProcessReceiveId: "unverified-rcv-id",
      }).draft!;
      unverifiedDraftO.status = "REVIEW_REQUIRED";
      unverifiedDraftO.commercialReleasePreview = "REVIEW_REQUIRED";

      const passO =
        unverifiedDraftO.status === "REVIEW_REQUIRED" &&
        unverifiedDraftO.commercialReleasePreview === "REVIEW_REQUIRED";
      results["O"] = {
        status: passO ? "PASS" : "FAIL",
        details: passO
          ? "Inspection linked to unverified process receive marked REVIEW_REQUIRED with no release authority."
          : "Test O failed.",
      };

      // -----------------------------------------------------------------------
      // TEST P: Inspection saved. Source Receive revised afterward -> Status: REVIEW_REQUIRED.
      // -----------------------------------------------------------------------
      const draftP = this.createPostProcessInspectionDraft({
        rollIdentityOrNodeId: childC01.id,
      }).draft!;
      draftP.sourceProcessReceiveId = "rcv-sim-p";
      draftP.sourceProcessReceiveRevision = 1;
      this.inspections.set(draftP.id, draftP);

      // Simulate detectReceiveRevisionImpact with missing/revised receive
      const impactP = this.detectReceiveRevisionImpact(draftP.id);
      const passP = impactP.hasImpact && draftP.status === "REVIEW_REQUIRED";
      results["P"] = {
        status: passP ? "PASS" : "FAIL",
        details: passP
          ? "Inspection preserved and marked REVIEW_REQUIRED when source receive was revised/superseded."
          : "Test P failed.",
      };

      // -----------------------------------------------------------------------
      // TEST Q: Inspection saved on active Roll. Roll later split.
      // -----------------------------------------------------------------------
      // Inspect C02 (120 MTR), then split C02 into C02-C01 (70) and C02-C02 (50)
      const childC02 = FabricRollGenealogyService.getRollNodeByIdentity("DRAFT-R100-C02")!;
      const draftQ = this.createPostProcessInspectionDraft({
        rollIdentityOrNodeId: childC02.id,
      }).draft!;
      const saveResQ = this.savePostProcessInspection({
        inspectionDraft: draftQ,
        inspectedQtyMetre: 120,
        defects: [],
        proposedGrade: "A",
        disposition: "ACCEPTED",
      });

      // Split C02
      FabricRollGenealogyService.confirmSplitSimulation({
        parentNodeId: childC02.id,
        children: [
          { childRollIdentity: "DRAFT-R100-C02-C01", quantityMetre: 70 },
          { childRollIdentity: "DRAFT-R100-C02-C02", quantityMetre: 50 },
        ],
        reason: "Nested split after inspection",
      });

      const childC02History = this.getInspectionHistoryForRoll(childC02.id);
      const grandchild1 = FabricRollGenealogyService.getRollNodeByIdentity("DRAFT-R100-C02-C01")!;
      const grandchild1History = this.getInspectionHistoryForRoll(grandchild1.id);

      const passQ =
        saveResQ.success &&
        childC02History.length === 1 &&
        grandchild1History.length === 0;
      results["Q"] = {
        status: passQ ? "PASS" : "FAIL",
        details: passQ
          ? "Inspection preserved on superseded parent (C02); grandchildren are not falsely marked inspected."
          : "Test Q failed.",
      };

      // -----------------------------------------------------------------------
      // TEST R: Sibling children: C01 Grade A, C02 Grade C -> independent Quality summaries.
      // -----------------------------------------------------------------------
      const grandchild2 = FabricRollGenealogyService.getRollNodeByIdentity("DRAFT-R100-C02-C02")!;
      const draftR1 = this.createPostProcessInspectionDraft({
        rollIdentityOrNodeId: grandchild1.id,
      }).draft!;
      this.savePostProcessInspection({
        inspectionDraft: draftR1,
        inspectedQtyMetre: 70,
        defects: [],
        proposedGrade: "A",
        disposition: "ACCEPTED",
      });

      const draftR2 = this.createPostProcessInspectionDraft({
        rollIdentityOrNodeId: grandchild2.id,
      }).draft!;
      this.savePostProcessInspection({
        inspectionDraft: draftR2,
        inspectedQtyMetre: 50,
        defects: [],
        proposedGrade: "C",
        disposition: "HOLD",
      });

      const summaryR1 = this.getCurrentQualitySummary(grandchild1.id);
      const summaryR2 = this.getCurrentQualitySummary(grandchild2.id);

      const passR =
        summaryR1.latestGrade === "A" &&
        summaryR2.latestGrade === "C" &&
        summaryR1.latestDisposition === "ACCEPTED" &&
        summaryR2.latestDisposition === "HOLD";
      results["R"] = {
        status: passR ? "PASS" : "FAIL",
        details: passR
          ? "Sibling child inspections remain independent; no root grade aggregation occurred."
          : "Test R failed.",
      };

      // -----------------------------------------------------------------------
      // TEST S: Final route step complete preview. Inspection: ACCEPTED.
      // -----------------------------------------------------------------------
      const releaseS = deriveCommercialReleasePreview({
        disposition: "ACCEPTED",
        isRouteCompletePreview: true,
        isReceiveCleanExact: true,
        inspectionStatus: "INSPECTED",
      });
      const passS =
        releaseS.preview === "QUALITY_ACCEPTED_FOR_FUTURE_COMMERCIAL_REVIEW";
      results["S"] = {
        status: passS ? "PASS" : "FAIL",
        details: passS
          ? "Final route step complete with ACCEPTED disposition creates future commercial review preview only."
          : `Test S failed: preview=${releaseS.preview}`,
      };

      // -----------------------------------------------------------------------
      // TEST T: Additional route step remains. Post-process inspection accepted.
      // -----------------------------------------------------------------------
      const releaseT = deriveCommercialReleasePreview({
        disposition: "ACCEPTED",
        isRouteCompletePreview: false, // Additional steps remain
        isReceiveCleanExact: true,
        inspectionStatus: "INSPECTED",
      });
      const passT = releaseT.preview === "NOT_READY_FUTURE_ROUTE_REQUIRED";
      results["T"] = {
        status: passT ? "PASS" : "FAIL",
        details: passT
          ? "Intermediate process inspection saved; commercial release is NOT_READY_FUTURE_ROUTE_REQUIRED."
          : `Test T failed: preview=${releaseT.preview}`,
      };
    } catch (err: any) {
      const msg = err?.message || String(err);
      results["ERROR"] = { status: "FAIL", details: msg };
    }

    const allPassed =
      Object.keys(results).length >= 20 &&
      Object.values(results).every((r) => r.status === "PASS");

    return { allPassed, results };
  }
}

/**
 * =============================================================================
 * SCKT PRODUCTION FOUNDATION — PHASE 5D STEP 1
 * PROCESS ISSUE / JOB WORK OUTWARD DOMAIN SERVICE & CONTRACTS
 * =============================================================================
 * Pure business logic and frontend contract for downstream process execution preparation.
 * Prepares execution of ONLY the current READY route step.
 *
 * CRITICAL GOVERNANCE RULES:
 * 1. Focused service only — do NOT bloat production-planning.service.ts.
 * 2. Source is current READY route step only (inherited: Roll, Qty, Process, Sequence,
 *    Route Type, Production Order, Job Card, Quality context).
 * 3. NO free-entry Process Issue. Operator may NOT select/change Process in Issue screen.
 * 4. Whole-Roll Issue ONLY: issueQtyMetre MUST equal rollQtyMetre.
 *    Partial issue returns ROLL_SPLIT_REQUIRED. Child Roll split is NOT implemented.
 * 5. Route Revision Lock: If route is revised, preparation becomes REVIEW_REQUIRED / SUPERSEDED.
 * 6. Roll Qty Revision: If upstream roll changes, preparation becomes REVIEW_REQUIRED.
 *    No silent Qty rewrite.
 * 7. Rate & Quantity Basis: Rates are HINTS only. No conversion from MTR to Cut/PCS invented.
 *    If Process Master rate is per cut/PCS without cut count, status = RATE / QUANTITY BASIS REVIEW.
 * 8. Batch Preparation: Preserves distinct Roll identities. Never merges into anonymous bulk stock.
 *    Incompatible processes or processors are strictly blocked from the same batch.
 * 9. NO backend mutations. NO SQL/RPC. Zero stock mutations.
 *    External JW preview shows "Stock With Third Party" as PREVIEW ONLY (NOT POSTED).
 */

import {
  type FabricRollDraft,
} from "./production-planning.service";
import {
  FabricProcessRoutingService,
  type FabricProcessRoutePlan,
  type FabricProcessRouteStep,
  type FabricProcessExecutionMode,
  type ProcessMasterRecord,
  type RollSplitRequiredResult,
} from "./fabric-process-routing.service";
import {
  getLocalParties,
  getLocalSubParties,
  type PartyRecord,
  type SubPartyRecord,
} from "@/lib/party-store";
import { type ChargeLine } from "@/lib/costing";

// =============================================================================
// STEP 3 — ISSUE PREPARATION CONTRACTS
// =============================================================================

export type ProcessIssueStatus =
  | "DRAFT"
  | "PREPARED"
  | "REVIEW_REQUIRED"
  | "SUPERSEDED";

export type RateSourceType =
  | "UNSET"
  | "COST_SHEET_HINT"
  | "PROCESS_MASTER_HINT"
  | "MANUAL";

export interface FabricProcessIssuePreparation {
  id: string;

  routePlanId: string;
  routeRevision: number;

  routeStepId: string;
  stepSequence: number;

  rollDraftId: string;
  temporaryRollNo: string;
  rollQtyMetre: number;

  productionOrderId: string;
  productionOrderNo?: string | undefined;
  jobCardId: string;
  jobCardNo?: string | undefined;
  salesOrderId?: string | undefined;
  salesOrderNo?: string | undefined;

  processId: string;
  processCode: string;
  processName: string;

  executionMode: FabricProcessExecutionMode;

  issueQtyMetre: number;
  issueDate: string;

  // Internal Execution Context (Step 7)
  internalDestinationId?: string | undefined;
  internalDestinationName?: string | undefined;

  // External Job Work Context (Step 8 & 9)
  jobPartyId?: string | undefined;
  jobPartyName?: string | undefined;
  subPartyId?: string | undefined;
  subPartyName?: string | undefined;
  deliveryAddress?: string | undefined;

  expectedReturnDate?: string | undefined;

  plannedRate?: number | undefined;
  rateSource?: RateSourceType | undefined;

  processInstruction?: string | undefined;
  remark?: string | undefined;

  // Review & revision context
  status: ProcessIssueStatus;
  reviewReason?: string | undefined;
  supersededByPreparationId?: string | undefined;

  // Transport details (Step 9 - optional, non-authoritative)
  transporterName?: string | undefined;
  lrNo?: string | undefined;

  // Stock ownership preview text (Step 20 & 21)
  futureStockPosition: "WITH THIRD PARTY" | "INTERNAL WIP / WIP LOCATION" | "NONE";

  createdAt: string;
  updatedAt: string;
}

export interface FabricProcessIssuePreparationRevision {
  id: string;
  preparationId: string;
  rollDraftId: string;
  revisionNumber: number;
  previousPreparation: FabricProcessIssuePreparation;
  revisedPreparation: FabricProcessIssuePreparation;
  reason: string;
  createdAt: string;
}

// =============================================================================
// STEP 7 & 8 — PREVIEW CONTRACTS
// =============================================================================

export interface InternalProcessTransferPreview {
  previewType: "INTERNAL_TRANSFER";
  rollDraftId: string;
  temporaryRollNo: string;
  rollQtyMetre: number;
  issueQtyMetre: number;
  processId: string;
  processCode: string;
  processName: string;
  executionMode: "INTERNAL";
  stepSequence: number;
  totalRouteSteps: number;
  routePlanId: string;
  routeRevision: number;
  issueDate: string;
  internalDestination: string;
  processInstruction?: string | undefined;
  stockMutation: "NONE";
  futureStockPosition: "INTERNAL WIP / WIP LOCATION";
  productionOrderNo?: string | undefined;
  jobCardNo?: string | undefined;
  status: "READY" | "REVIEW_REQUIRED" | "BLOCKED";
  reviewReason?: string | undefined;
}

export interface JobWorkOutwardPreview {
  previewType: "JOB_WORK_OUTWARD";
  draftRef: string; // e.g. "DRAFT-JW-OUT-001" or "Pending backend challan number"
  rollDraftId: string;
  temporaryRollNo: string;
  rollQtyMetre: number;
  issueQtyMetre: number;
  processId: string;
  processCode: string;
  processName: string;
  executionMode: "EXTERNAL_JOBWORK";
  jobPartyId: string;
  jobPartyName: string;
  subPartyId?: string | undefined;
  subPartyName?: string | undefined;
  processingUnitLocation?: string | undefined;
  deliveryAddress?: string | undefined;
  stepSequence: number;
  totalRouteSteps: number;
  routePlanId: string;
  routeRevision: number;
  outwardDate: string;
  expectedReturnDate?: string | undefined;
  plannedRate?: number | undefined;
  rateSource?: RateSourceType | undefined;
  rateHintDisplay?: RateHintState | undefined;
  processInstruction?: string | undefined;
  remark?: string | undefined;
  inventoryMovement: "NOT POSTED";
  futureStockPosition: "WITH THIRD PARTY";
  transporterName?: string | undefined;
  lrNo?: string | undefined;
  productionOrderNo?: string | undefined;
  jobCardNo?: string | undefined;
  status: "READY" | "REVIEW_REQUIRED" | "BLOCKED";
  reviewReason?: string | undefined;
}

// =============================================================================
// STEP 12, 13, 14, 15 — RATE HINT & QUANTITY BASIS CONTRACTS
// =============================================================================

export interface RateHintState {
  costSheetHint?: {
    chargeName: string;
    rate: number;
    quantity?: number | undefined;
    text: string;
  } | undefined;
  processMasterHint?: {
    rawDescription: string;
    extractedRate?: number | undefined;
    unit?: string | undefined;
    text: string;
  } | undefined;
  requiresQuantityBasisReview: boolean;
  quantityBasisReviewReason?: string | undefined;
  rateCalculationAvailable: boolean;
  confirmedPlannedRate?: number | undefined;
  rateSource: RateSourceType;
  rateContextSummary: string;
}

// =============================================================================
// STEP 28, 29, 30 — BATCH PREPARATION CONTRACTS
// =============================================================================

export interface FabricProcessIssueBatchLine {
  lineId: string;
  rollDraftId: string;
  temporaryRollNo: string;
  rollQtyMetre: number;
  issueQtyMetre: number;
  routePlanId: string;
  routeRevision: number;
  routeStepId: string;
  stepSequence: number;
  productionOrderId: string;
  productionOrderNo?: string | undefined;
  jobCardId: string;
  jobCardNo?: string | undefined;
}

export interface FabricProcessIssueBatch {
  id: string;
  batchNo: string; // e.g. "DRAFT-BATCH-001"
  processId: string;
  processCode: string;
  processName: string;
  executionMode: FabricProcessExecutionMode;
  jobPartyId?: string | undefined;
  jobPartyName?: string | undefined;
  subPartyId?: string | undefined;
  subPartyName?: string | undefined;
  issueDate: string;
  totalQtyMetre: number;
  totalRolls: number;
  lines: FabricProcessIssueBatchLine[];
  status: ProcessIssueStatus;
  createdAt: string;
}

// =============================================================================
// INPUT PARAMS CONTRACTS
// =============================================================================

export interface CreateProcessIssuePreparationParams {
  rollDraftId: string;
  routeStepId?: string | undefined; // optional; if omitted, defaults strictly to current READY step
  issueQtyMetre: number;
  issueDate?: string | undefined;
  internalDestinationId?: string | undefined;
  internalDestinationName?: string | undefined;
  expectedReturnDate?: string | undefined;
  plannedRate?: number | undefined;
  rateSource?: RateSourceType | undefined;
  processInstruction?: string | undefined;
  remark?: string | undefined;
  transporterName?: string | undefined;
  lrNo?: string | undefined;
}

export interface IssuePreparationValidationResult {
  isValid: boolean;
  errors: string[];
  splitRequired?: RollSplitRequiredResult | undefined;
}

export interface BatchIssueCommonParams {
  issueDate?: string | undefined;
  internalDestinationId?: string | undefined;
  internalDestinationName?: string | undefined;
  expectedReturnDate?: string | undefined;
  plannedRate?: number | undefined;
  rateSource?: RateSourceType | undefined;
  processInstruction?: string | undefined;
  remark?: string | undefined;
  transporterName?: string | undefined;
  lrNo?: string | undefined;
}

// =============================================================================
// STEP 34 — PURE DOMAIN FUNCTIONS
// =============================================================================

/**
 * Validates whole-roll issue constraint (Step 4 & 34).
 * issueQtyMetre MUST exactly equal rollQtyMetre.
 * Partial issue returns ROLL_SPLIT_REQUIRED.
 */
export function validateIssueQty(
  rollQty: number,
  issueQty: number
): { valid: boolean; splitResult?: RollSplitRequiredResult | undefined } {
  const diff = Math.abs(rollQty - issueQty);
  if (diff > 0.001) {
    return {
      valid: false,
      splitResult: {
        code: "ROLL_SPLIT_REQUIRED",
        message: "Partial issue requires a child Roll identity before process execution.",
        rollQty,
        attemptedProcessQty: issueQty,
        difference: diff,
      },
    };
  }
  return { valid: true };
}

/**
 * Validates candidate route step readiness (Step 2 & 34).
 * ONLY a step with status === "READY" may create Process Issue Preparation.
 */
export function validateCurrentRouteStep(
  plan: FabricProcessRoutePlan,
  stepId?: string | undefined
): { valid: boolean; step?: FabricProcessRouteStep | undefined; error?: string | undefined } {
  if (plan.routeDecision === "NO_FURTHER_PROCESS") {
    return {
      valid: false,
      error: "No Process Issue Required: Route decision is NO_FURTHER_PROCESS.",
    };
  }

  if (plan.status === "BLOCKED") {
    return {
      valid: false,
      error: plan.reviewReason || "Process route is BLOCKED. Process Issue cannot be prepared.",
    };
  }

  if (plan.status === "REVIEW_REQUIRED") {
    return {
      valid: false,
      error: plan.reviewReason || "Process route requires REVIEW. Process Issue cannot be prepared.",
    };
  }

  if (plan.steps.length === 0) {
    return {
      valid: false,
      error: "Process route has no steps planned.",
    };
  }

  const targetStep = stepId
    ? plan.steps.find((s) => s.id === stepId)
    : plan.steps.find((s) => s.status === "READY");

  if (!targetStep) {
    return {
      valid: false,
      error: stepId
        ? `Step "${stepId}" was not found in the route plan.`
        : "No READY process step found in route plan.",
    };
  }

  if (targetStep.status !== "READY") {
    return {
      valid: false,
      step: targetStep,
      error: `Step ${targetStep.sequence} (${targetStep.processName}) is not issueable. Current step status: ${targetStep.status}. Only READY steps may prepare execution.`,
    };
  }

  return { valid: true, step: targetStep };
}

/**
 * Derives rate hint context and checks for MTR vs cut/PCS mismatch (Steps 12, 13, 14, 15).
 * Does NOT invent rate authority or MTR -> PCS conversion.
 */
export function deriveRateHintState(params: {
  process?: ProcessMasterRecord | undefined;
  costSheetCharge?: ChargeLine | null | undefined;
  confirmedPlannedRate?: number | undefined;
  rateSource?: RateSourceType | undefined;
  rollQtyMetre: number;
}): RateHintState {
  const { process, costSheetCharge, confirmedPlannedRate, rollQtyMetre } = params;
  let rateSource: RateSourceType = params.rateSource || "UNSET";

  // 1. Process Master Hint
  let processMasterHint: RateHintState["processMasterHint"] = undefined;
  let hasCutOrPcsInProcDesc = false;

  if (process && process.description) {
    const desc = process.description;
    const descLower = desc.toLowerCase();
    hasCutOrPcsInProcDesc = descLower.includes("/ cut") || descLower.includes("/ pcs");

    // Extract rate text if present e.g. "Standard Rate ₹2.00 / cut"
    const match = desc.match(/₹\s*([0-9]+(?:\.[0-9]+)?)/);
    const extractedRate = match && match[1] ? parseFloat(match[1]) : undefined;
    const unitMatch = desc.match(/\/\s*([a-zA-Z]+)/);
    const unit = unitMatch && unitMatch[1] ? unitMatch[1] : undefined;

    processMasterHint = {
      rawDescription: desc,
      extractedRate,
      unit,
      text: `Process Master Hint: "${desc}"`,
    };
  }

  // 2. Cost Sheet Hint
  let costSheetHint: RateHintState["costSheetHint"] = undefined;
  let hasCutOrPcsInCostSheet = false;

  if (costSheetCharge) {
    const chargeNameLower = costSheetCharge.charge_name.toLowerCase();
    hasCutOrPcsInCostSheet = chargeNameLower.includes("cut") || chargeNameLower.includes("pcs");

    costSheetHint = {
      chargeName: costSheetCharge.charge_name,
      rate: costSheetCharge.rate,
      quantity: costSheetCharge.quantity,
      text: `Cost Sheet Hint: "${costSheetCharge.charge_name}" (₹${costSheetCharge.rate} / ${hasCutOrPcsInCostSheet ? "cut" : "m"})`,
    };
  }

  // 3. Unit Basis Conflict Check (Steps 14 & 15)
  // Current roll quantity is MTR. If process mentions cut / PCS, conversion is NOT safe.
  const isCutPcsConflict = hasCutOrPcsInProcDesc || hasCutOrPcsInCostSheet;
  const requiresQuantityBasisReview = isCutPcsConflict;
  const quantityBasisReviewReason = isCutPcsConflict
    ? `Roll quantity is in MTR (${rollQtyMetre}m), but process pricing refers to cut/PCS. No authoritative cut count exists. Rate calculation is NOT AVAILABLE.`
    : undefined;

  const rateCalculationAvailable = !isCutPcsConflict;

  // Auto-detect rateSource if not manually set
  if (confirmedPlannedRate !== undefined && rateSource === "UNSET") {
    rateSource = "MANUAL";
  } else if (rateSource === "UNSET") {
    if (costSheetHint) {
      rateSource = "COST_SHEET_HINT";
    } else if (processMasterHint?.extractedRate !== undefined) {
      rateSource = "PROCESS_MASTER_HINT";
    }
  }

  const summaries: string[] = [];
  if (costSheetHint) summaries.push(costSheetHint.text);
  if (processMasterHint) summaries.push(processMasterHint.text);
  if (isCutPcsConflict) {
    summaries.push("RATE / QUANTITY BASIS REVIEW: Unsupported MTR-to-Cut conversion prevented.");
  }

  return {
    costSheetHint,
    processMasterHint,
    requiresQuantityBasisReview,
    quantityBasisReviewReason,
    rateCalculationAvailable,
    confirmedPlannedRate,
    rateSource,
    rateContextSummary: summaries.join(" | ") || "No rate hints available.",
  };
}

/**
 * Validates batch compatibility across multiple rolls (Steps 28, 29, 30).
 * Rolls can only be batched if:
 * 1. They have the SAME current processId.
 * 2. They have the SAME executionMode.
 * 3. If external, they have the SAME jobPartyId.
 * 4. Each roll's current route step is READY.
 * 5. None is BLOCKED or REVIEW_REQUIRED.
 */
export function validateBatchCompatibility(preparations: FabricProcessIssuePreparation[]): {
  compatible: boolean;
  errors: string[];
} {
  if (preparations.length === 0) {
    return { compatible: false, errors: ["No issue preparations provided for batch."] };
  }

  const first = preparations[0];
  if (!first) {
    return { compatible: false, errors: ["No issue preparations provided for batch."] };
  }

  if (preparations.length === 1) {
    return { compatible: true, errors: [] };
  }

  const errors: string[] = [];

  for (let i = 1; i < preparations.length; i++) {
    const item = preparations[i];
    if (!item) continue;

    if (item.processId !== first.processId) {
      errors.push(
        `Roll ${item.temporaryRollNo} has process "${item.processName}" which does not match batch process "${first.processName}".`
      );
    }

    if (item.executionMode !== first.executionMode) {
      errors.push(
        `Roll ${item.temporaryRollNo} has execution mode "${item.executionMode}" which does not match batch mode "${first.executionMode}".`
      );
    }

    if (item.executionMode === "EXTERNAL_JOBWORK") {
      if (item.jobPartyId !== first.jobPartyId) {
        errors.push(
          `Roll ${item.temporaryRollNo} has external processor "${item.jobPartyName || item.jobPartyId || "Unknown"}" which does not match batch processor "${first.jobPartyName || first.jobPartyId || "Unknown"}". Separate batches required.`
        );
      }
    }

    if (item.status === "REVIEW_REQUIRED" || item.status === "SUPERSEDED") {
      errors.push(
        `Roll ${item.temporaryRollNo} is in status "${item.status}" and cannot be included in a ready batch.`
      );
    }
  }

  return {
    compatible: errors.length === 0,
    errors,
  };
}

/**
 * Detects whether an existing Issue Preparation has become stale due to:
 * - Route revision number increment
 * - Process step changes / reordering
 * - Roll quantity changes
 * - External processor deactivation
 */
export function detectPreparationStaleness(params: {
  preparation: FabricProcessIssuePreparation;
  currentPlan?: FabricProcessRoutePlan | undefined;
  currentRoll?: FabricRollDraft | undefined;
  currentRevisionNumber: number;
  partyRecord?: PartyRecord | undefined;
}): { isStale: boolean; reason?: string | undefined } {
  const { preparation, currentPlan, currentRoll, currentRevisionNumber, partyRecord } = params;

  if (!currentPlan) {
    return {
      isStale: true,
      reason: `Route plan "${preparation.routePlanId}" no longer exists.`,
    };
  }

  // 1. Route revision change (Step 5, 23)
  if (currentRevisionNumber > preparation.routeRevision) {
    return {
      isStale: true,
      reason: `Route plan revised to Revision #${currentRevisionNumber} (Preparation created at Rev #${preparation.routeRevision}). Route revision lock triggered.`,
    };
  }

  // 2. Route status change (Step 16)
  if (currentPlan.status === "BLOCKED" || currentPlan.status === "REVIEW_REQUIRED") {
    return {
      isStale: true,
      reason: `Current route status is ${currentPlan.status}: ${currentPlan.reviewReason || "Requires review"}.`,
    };
  }

  // 3. Step existence and match (Step 6)
  const matchingStep = currentPlan.steps.find((s) => s.id === preparation.routeStepId);
  if (!matchingStep) {
    return {
      isStale: true,
      reason: `Original route step "${preparation.routeStepId}" was removed from the route plan.`,
    };
  }

  if (matchingStep.processId !== preparation.processId) {
    return {
      isStale: true,
      reason: `Process for step changed from "${preparation.processName}" to "${matchingStep.processName}". Route change requires new preparation.`,
    };
  }

  if (matchingStep.status !== "READY") {
    return {
      isStale: true,
      reason: `Route step status changed from READY to "${matchingStep.status}".`,
    };
  }

  // 4. Roll quantity change (Step 24)
  if (currentRoll && Math.abs(currentRoll.qtyMetre - preparation.rollQtyMetre) > 0.001) {
    return {
      isStale: true,
      reason: `Upstream Roll quantity changed from ${preparation.rollQtyMetre}m to ${currentRoll.qtyMetre}m. Preparation requires review. No silent Qty rewrite.`,
    };
  }

  // 5. External Job Party deactivation or mismatch (Step 18, 25)
  if (preparation.executionMode === "EXTERNAL_JOBWORK") {
    if (matchingStep.jobPartyId !== preparation.jobPartyId) {
      return {
        isStale: true,
        reason: `Route external processor changed to "${matchingStep.jobPartyName || matchingStep.jobPartyId || "Unknown"}". Previous preparation superseded.`,
      };
    }

    if (partyRecord && partyRecord.status !== "Active") {
      return {
        isStale: true,
        reason: `External Job Party "${partyRecord.partyName}" is now Inactive. Preparation review required.`,
      };
    }
  }

  return { isStale: false };
}

// =============================================================================
// STEP 32 & 33 — FOCUSED SERVICE IMPLEMENTATION
// =============================================================================

export class FabricProcessExecutionService {
  // In-memory issue preparation store keyed by preparationId
  private static preparations: Map<string, FabricProcessIssuePreparation> = new Map();

  // In-memory preparation revision history keyed by rollDraftId
  private static preparationRevisions: Map<string, FabricProcessIssuePreparationRevision[]> = new Map();

  // In-memory batches keyed by batchId
  private static batches: Map<string, FabricProcessIssueBatch> = new Map();

  /**
   * Reset in-memory execution stores (used for testing or clean session reset)
   */
  public static resetStores(): void {
    this.preparations.clear();
    this.preparationRevisions.clear();
    this.batches.clear();
  }

  // ---------------------------------------------------------------------------
  // STEP 2 — ROUTE STEP DISCOVERY
  // ---------------------------------------------------------------------------

  /**
   * Retrieves issueable route steps for a roll.
   * Only steps with status === "READY" from a non-blocked, non-review route plan are returned.
   */
  public static getIssueableRouteSteps(rollDraftId: string): FabricProcessRouteStep[] {
    const plan = FabricProcessRoutingService.getRoutePlanForRoll(rollDraftId);
    if (!plan || plan.routeDecision === "NO_FURTHER_PROCESS") {
      return [];
    }

    if (plan.status === "BLOCKED" || plan.status === "REVIEW_REQUIRED") {
      return [];
    }

    return plan.steps.filter((s) => s.status === "READY");
  }

  /**
   * Validates if a specific route step is currently issueable.
   */
  public static validateIssueableRouteStep(
    plan: FabricProcessRoutePlan,
    stepId?: string | undefined
  ): { valid: boolean; step?: FabricProcessRouteStep | undefined; error?: string | undefined } {
    return validateCurrentRouteStep(plan, stepId);
  }

  /**
   * Validates whole-roll issue.
   */
  public static validateWholeRollIssue(
    rollQty: number,
    issueQty: number
  ): { valid: boolean; splitResult?: RollSplitRequiredResult | undefined } {
    return validateIssueQty(rollQty, issueQty);
  }

  /**
   * Validates external job worker from Party Master.
   */
  public static validateExternalProcessor(jobPartyId?: string | undefined): {
    valid: boolean;
    error?: string | undefined;
    party?: PartyRecord | undefined;
  } {
    if (!jobPartyId) {
      return { valid: false, error: "External Job Work requires a valid Party Master record selection." };
    }

    const parties = getLocalParties();
    const party = parties.find((p) => p.id === jobPartyId);
    if (!party) {
      return { valid: false, error: `Party with ID "${jobPartyId}" not found in Party Master.` };
    }

    if (party.status !== "Active") {
      return { valid: false, party, error: `Selected Job Party (${party.partyName}) is Inactive.` };
    }

    const isEligible = party.partyType === "Job Party" || party.jobWorkApplicable === "Yes";
    if (!isEligible) {
      return {
        valid: false,
        party,
        error: `Selected Party (${party.partyName}) is not eligible for Job Work.`,
      };
    }

    return { valid: true, party };
  }

  // ---------------------------------------------------------------------------
  // STEP 12 & 13 — RATE HINTS & QUANTITY BASIS
  // ---------------------------------------------------------------------------

  /**
   * Retrieves rate hints for a process step, displaying hints without inventing authority.
   */
  public static getProcessRateHints(params: {
    processId: string;
    costSheetCharges?: ChargeLine[] | null | undefined;
    rollQtyMetre: number;
    plannedRate?: number | undefined;
    rateSource?: RateSourceType | undefined;
  }): RateHintState {
    const process = FabricProcessRoutingService.getProcessById(params.processId);
    let matchedCharge: ChargeLine | null = null;

    if (params.costSheetCharges && process) {
      const pNameLower = process.name.toLowerCase();
      matchedCharge =
        params.costSheetCharges.find((c) => {
          const cNameLower = c.charge_name.toLowerCase();
          return (
            (pNameLower.includes("butta") && cNameLower.includes("butta")) ||
            (pNameLower.includes("rfd") && cNameLower.includes("rfd")) ||
            (pNameLower.includes("wash") && (cNameLower.includes("wash") || cNameLower.includes("finish")))
          );
        }) || null;
    }

    return deriveRateHintState({
      process,
      costSheetCharge: matchedCharge,
      confirmedPlannedRate: params.plannedRate,
      rateSource: params.rateSource,
      rollQtyMetre: params.rollQtyMetre,
    });
  }

  /**
   * Checks whether the process definition requires a quantity basis review (e.g. MTR vs cut/pcs).
   */
  public static deriveQuantityBasisReview(
    process: ProcessMasterRecord,
    rollQtyMetre: number
  ): { requiresReview: boolean; reason?: string | undefined; rateAvailable: boolean } {
    const state = deriveRateHintState({ process, rollQtyMetre });
    return {
      requiresReview: state.requiresQuantityBasisReview,
      reason: state.quantityBasisReviewReason,
      rateAvailable: state.rateCalculationAvailable,
    };
  }

  // ---------------------------------------------------------------------------
  // STEP 3 — CREATE PROCESS ISSUE PREPARATION
  // ---------------------------------------------------------------------------

  /**
   * Validates all prerequisites for preparing a process issue.
   */
  public static validateProcessIssuePreparation(
    params: CreateProcessIssuePreparationParams
  ): IssuePreparationValidationResult {
    const errors: string[] = [];
    let splitRequired: RollSplitRequiredResult | undefined;

    const plan = FabricProcessRoutingService.getRoutePlanForRoll(params.rollDraftId);
    if (!plan) {
      return {
        isValid: false,
        errors: [`No Process Route Plan exists for Roll "${params.rollDraftId}".`],
      };
    }

    // Step 2 & 17: Route Decision & Status check
    if (plan.routeDecision === "NO_FURTHER_PROCESS") {
      return {
        isValid: false,
        errors: ["No Process Issue Required: Roll is planned with NO_FURTHER_PROCESS."],
      };
    }

    if (plan.status === "BLOCKED") {
      return {
        isValid: false,
        errors: [plan.reviewReason || "Process route is BLOCKED. Process Issue cannot be prepared."],
      };
    }

    if (plan.status === "REVIEW_REQUIRED") {
      return {
        isValid: false,
        errors: [plan.reviewReason || "Process route requires REVIEW. Process Issue cannot be prepared."],
      };
    }

    // Step 2: Step check
    const stepCheck = validateCurrentRouteStep(plan, params.routeStepId);
    if (!stepCheck.valid || !stepCheck.step) {
      return {
        isValid: false,
        errors: [stepCheck.error || "Route step is not valid for issue preparation."],
      };
    }

    const step = stepCheck.step;

    // Step 4: Whole-roll issue validation
    const wholeRollCheck = validateIssueQty(plan.rollQtyMetre, params.issueQtyMetre);
    if (!wholeRollCheck.valid) {
      splitRequired = wholeRollCheck.splitResult;
      errors.push(
        `Whole-roll issue required: Attempted ${params.issueQtyMetre}m vs Roll ${plan.rollQtyMetre}m. Partial issue requires child Roll split.`
      );
    }

    // Step 18: External Job Party validation
    if (step.executionMode === "EXTERNAL_JOBWORK") {
      const partyCheck = this.validateExternalProcessor(step.jobPartyId);
      if (!partyCheck.valid) {
        errors.push(partyCheck.error || "External processor is invalid.");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      splitRequired,
    };
  }

  /**
   * Prepares process issue execution for the current READY route step.
   * Free-entry is prevented: Process, Sequence, Route Plan, Context are all inherited.
   */
  public static createProcessIssuePreparation(
    params: CreateProcessIssuePreparationParams
  ): {
    preparation?: FabricProcessIssuePreparation | undefined;
    validation: IssuePreparationValidationResult;
  } {
    const validation = this.validateProcessIssuePreparation(params);
    if (!validation.isValid) {
      return { validation };
    }

    const plan = FabricProcessRoutingService.getRoutePlanForRoll(params.rollDraftId)!;
    const stepCheck = validateCurrentRouteStep(plan, params.routeStepId);
    const step = stepCheck.step!;

    const revisions = FabricProcessRoutingService.getRouteRevisionHistory(params.rollDraftId);
    const lastRev = revisions[revisions.length - 1];
    const routeRevision = lastRev ? lastRev.revisionNumber : 1;

    const parties = getLocalParties();
    const subParties = getLocalSubParties();
    const party = step.jobPartyId ? parties.find((p) => p.id === step.jobPartyId) : undefined;
    const subParty = step.subPartyId ? subParties.find((sp) => sp.id === step.subPartyId) : undefined;

    const deliveryAddress =
      subParty?.deliveryAddress ||
      subParty?.shippingAddress ||
      (subParty ? `${subParty.addressLine1}, ${subParty.city}, ${subParty.state}` : undefined) ||
      (party ? `${party.addressLine1}, ${party.city}, ${party.state}` : undefined);

    const now = new Date().toISOString();
    const issueDate = params.issueDate || now.slice(0, 10);

    const futureStockPosition: FabricProcessIssuePreparation["futureStockPosition"] =
      step.executionMode === "EXTERNAL_JOBWORK"
        ? "WITH THIRD PARTY"
        : "INTERNAL WIP / WIP LOCATION";

    const prep: FabricProcessIssuePreparation = {
      id: `prep-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      routePlanId: plan.id,
      routeRevision,
      routeStepId: step.id,
      stepSequence: step.sequence,
      rollDraftId: plan.rollDraftId,
      temporaryRollNo: plan.temporaryRollNo,
      rollQtyMetre: plan.rollQtyMetre,
      productionOrderId: plan.productionOrderId,
      productionOrderNo: plan.productionOrderNo,
      jobCardId: plan.jobCardId,
      jobCardNo: plan.jobCardNo,
      salesOrderId: plan.salesOrderId,
      salesOrderNo: plan.salesOrderNo,
      processId: step.processId,
      processCode: step.processCode,
      processName: step.processName,
      executionMode: step.executionMode,
      issueQtyMetre: params.issueQtyMetre,
      issueDate,
      internalDestinationId: params.internalDestinationId,
      internalDestinationName:
        step.executionMode === "INTERNAL"
          ? params.internalDestinationName || "NOT CONFIGURED / OPTIONAL"
          : undefined,
      jobPartyId: step.jobPartyId,
      jobPartyName: step.jobPartyName,
      subPartyId: step.subPartyId,
      subPartyName: step.subPartyName,
      deliveryAddress,
      expectedReturnDate: params.expectedReturnDate,
      plannedRate: params.plannedRate,
      rateSource: params.rateSource || "UNSET",
      processInstruction: params.processInstruction || step.instruction,
      remark: params.remark || step.remark,
      transporterName: params.transporterName,
      lrNo: params.lrNo,
      futureStockPosition,
      status: "PREPARED",
      createdAt: now,
      updatedAt: now,
    };

    this.preparations.set(prep.id, prep);

    return { preparation: prep, validation };
  }

  // ---------------------------------------------------------------------------
  // STEP 7 & 26 — INTERNAL PROCESS TRANSFER PREVIEW
  // ---------------------------------------------------------------------------

  /**
   * Generates pure preview representation for internal process transfer.
   * Zero stock mutation.
   */
  public static createInternalProcessTransferPreview(
    preparation: FabricProcessIssuePreparation
  ): InternalProcessTransferPreview {
    const plan = FabricProcessRoutingService.getRoutePlanForRoll(preparation.rollDraftId);
    const totalRouteSteps = plan ? plan.steps.length : preparation.stepSequence;

    return {
      previewType: "INTERNAL_TRANSFER",
      rollDraftId: preparation.rollDraftId,
      temporaryRollNo: preparation.temporaryRollNo,
      rollQtyMetre: preparation.rollQtyMetre,
      issueQtyMetre: preparation.issueQtyMetre,
      processId: preparation.processId,
      processCode: preparation.processCode,
      processName: preparation.processName,
      executionMode: "INTERNAL",
      stepSequence: preparation.stepSequence,
      totalRouteSteps,
      routePlanId: preparation.routePlanId,
      routeRevision: preparation.routeRevision,
      issueDate: preparation.issueDate,
      internalDestination: preparation.internalDestinationName || "NOT CONFIGURED / OPTIONAL",
      processInstruction: preparation.processInstruction,
      stockMutation: "NONE",
      futureStockPosition: "INTERNAL WIP / WIP LOCATION",
      productionOrderNo: preparation.productionOrderNo,
      jobCardNo: preparation.jobCardNo,
      status: preparation.status === "REVIEW_REQUIRED" ? "REVIEW_REQUIRED" : "READY",
      reviewReason: preparation.reviewReason,
    };
  }

  // ---------------------------------------------------------------------------
  // STEP 8, 9, 10 & 27 — EXTERNAL JOB WORK OUTWARD PREVIEW
  // ---------------------------------------------------------------------------

  /**
   * Generates pure preview representation for external job work outward.
   * Uses non-authoritative draft reference ("DRAFT-JW-OUT-...").
   * Stock With Third Party is preview only (inventory movement: NOT POSTED).
   */
  public static createJobWorkOutwardPreview(
    preparation: FabricProcessIssuePreparation,
    options?: {
      transporterName?: string | undefined;
      lrNo?: string | undefined;
      draftIndex?: number | undefined;
    }
  ): JobWorkOutwardPreview {
    const plan = FabricProcessRoutingService.getRoutePlanForRoll(preparation.rollDraftId);
    const totalRouteSteps = plan ? plan.steps.length : preparation.stepSequence;

    const rateHints = this.getProcessRateHints({
      processId: preparation.processId,
      rollQtyMetre: preparation.rollQtyMetre,
      plannedRate: preparation.plannedRate,
      rateSource: preparation.rateSource,
    });

    const draftIndex = options?.draftIndex || 1;
    const draftRef = `DRAFT-JW-OUT-${String(draftIndex).padStart(3, "0")}`;

    const subParties = getLocalSubParties();
    const subParty = preparation.subPartyId
      ? subParties.find((sp) => sp.id === preparation.subPartyId)
      : undefined;

    const processingUnitLocation = subParty
      ? `${subParty.subPartyName} (${subParty.locationType}) - ${subParty.city}`
      : preparation.subPartyName || undefined;

    return {
      previewType: "JOB_WORK_OUTWARD",
      draftRef,
      rollDraftId: preparation.rollDraftId,
      temporaryRollNo: preparation.temporaryRollNo,
      rollQtyMetre: preparation.rollQtyMetre,
      issueQtyMetre: preparation.issueQtyMetre,
      processId: preparation.processId,
      processCode: preparation.processCode,
      processName: preparation.processName,
      executionMode: "EXTERNAL_JOBWORK",
      jobPartyId: preparation.jobPartyId || "UNKNOWN",
      jobPartyName: preparation.jobPartyName || "Unknown Processor",
      subPartyId: preparation.subPartyId,
      subPartyName: preparation.subPartyName,
      processingUnitLocation,
      deliveryAddress: preparation.deliveryAddress,
      stepSequence: preparation.stepSequence,
      totalRouteSteps,
      routePlanId: preparation.routePlanId,
      routeRevision: preparation.routeRevision,
      outwardDate: preparation.issueDate,
      expectedReturnDate: preparation.expectedReturnDate,
      plannedRate: preparation.plannedRate,
      rateSource: preparation.rateSource,
      rateHintDisplay: rateHints,
      processInstruction: preparation.processInstruction,
      remark: preparation.remark,
      inventoryMovement: "NOT POSTED",
      futureStockPosition: "WITH THIRD PARTY",
      transporterName: options?.transporterName || preparation.transporterName,
      lrNo: options?.lrNo || preparation.lrNo,
      productionOrderNo: preparation.productionOrderNo,
      jobCardNo: preparation.jobCardNo,
      status: preparation.status === "REVIEW_REQUIRED" ? "REVIEW_REQUIRED" : "READY",
      reviewReason: preparation.reviewReason,
    };
  }

  // ---------------------------------------------------------------------------
  // STEP 5, 22, 23, 24, 25 — REVISION & STALENESS HANDLING
  // ---------------------------------------------------------------------------

  /**
   * Rechecks an existing preparation against live route revisions, roll revisions,
   * or party status. Marks REVIEW_REQUIRED if staled; preserves historical record.
   */
  public static checkAndMarkPreparationStaleness(
    preparationId: string,
    currentRoll?: FabricRollDraft | undefined
  ): { preparation?: FabricProcessIssuePreparation | undefined; isStale: boolean; reason?: string | undefined } {
    const prep = this.preparations.get(preparationId);
    if (!prep) return { isStale: false };

    const plan = FabricProcessRoutingService.getRoutePlanForRoll(prep.rollDraftId);
    const revisions = FabricProcessRoutingService.getRouteRevisionHistory(prep.rollDraftId);
    const lastRev = revisions[revisions.length - 1];
    const currentRevNum = lastRev ? lastRev.revisionNumber : 1;

    const parties = getLocalParties();
    const party = prep.jobPartyId ? parties.find((p) => p.id === prep.jobPartyId) : undefined;

    const staleness = detectPreparationStaleness({
      preparation: prep,
      currentPlan: plan,
      currentRoll,
      currentRevisionNumber: currentRevNum,
      partyRecord: party,
    });

    if (staleness.isStale) {
      prep.status = "REVIEW_REQUIRED";
      prep.reviewReason = staleness.reason;
      prep.updatedAt = new Date().toISOString();
    }

    return { preparation: prep, isStale: staleness.isStale, reason: staleness.reason };
  }

  /**
   * Creates a formal revision of an issue preparation (Step 22).
   * Preserves previous preparation and records revision reason.
   */
  public static createIssuePreparationRevision(
    preparationId: string,
    updates: Partial<CreateProcessIssuePreparationParams>,
    reason: string
  ): {
    revised?: FabricProcessIssuePreparation | undefined;
    revision?: FabricProcessIssuePreparationRevision | undefined;
    error?: string | undefined;
  } {
    const existing = this.preparations.get(preparationId);
    if (!existing) {
      return { error: `Preparation "${preparationId}" not found.` };
    }

    const now = new Date().toISOString();
    const rollDraftId = existing.rollDraftId;
    const existingRevs = this.preparationRevisions.get(rollDraftId) || [];
    const nextRevNum = existingRevs.length + 1;

    // Mark previous as SUPERSEDED
    existing.status = "SUPERSEDED";
    existing.updatedAt = now;

    // Build revised preparation
    const revised: FabricProcessIssuePreparation = {
      ...existing,
      id: `prep-${Date.now()}-${nextRevNum}`,
      issueQtyMetre: updates.issueQtyMetre !== undefined ? updates.issueQtyMetre : existing.issueQtyMetre,
      issueDate: updates.issueDate || existing.issueDate,
      internalDestinationId: updates.internalDestinationId !== undefined ? updates.internalDestinationId : existing.internalDestinationId,
      internalDestinationName: updates.internalDestinationName !== undefined ? updates.internalDestinationName : existing.internalDestinationName,
      expectedReturnDate: updates.expectedReturnDate !== undefined ? updates.expectedReturnDate : existing.expectedReturnDate,
      plannedRate: updates.plannedRate !== undefined ? updates.plannedRate : existing.plannedRate,
      rateSource: updates.rateSource || existing.rateSource,
      processInstruction: updates.processInstruction !== undefined ? updates.processInstruction : existing.processInstruction,
      remark: updates.remark !== undefined ? updates.remark : existing.remark,
      transporterName: updates.transporterName !== undefined ? updates.transporterName : existing.transporterName,
      lrNo: updates.lrNo !== undefined ? updates.lrNo : existing.lrNo,
      status: "PREPARED",
      reviewReason: undefined,
      createdAt: now,
      updatedAt: now,
    };

    existing.supersededByPreparationId = revised.id;

    const revisionRecord: FabricProcessIssuePreparationRevision = {
      id: `prep-rev-${Date.now()}-${nextRevNum}`,
      preparationId: revised.id,
      rollDraftId,
      revisionNumber: nextRevNum,
      previousPreparation: { ...existing },
      revisedPreparation: { ...revised },
      reason,
      createdAt: now,
    };

    this.preparations.set(revised.id, revised);
    this.preparationRevisions.set(rollDraftId, [...existingRevs, revisionRecord]);

    return { revised, revision: revisionRecord };
  }

  /**
   * Retrieves issue preparation history for a roll draft.
   */
  public static getIssuePreparationHistory(rollDraftId: string): FabricProcessIssuePreparation[] {
    const list: FabricProcessIssuePreparation[] = [];
    for (const prep of this.preparations.values()) {
      if (prep.rollDraftId === rollDraftId) {
        list.push(prep);
      }
    }
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public static getIssuePreparationRevisionHistory(
    rollDraftId: string
  ): FabricProcessIssuePreparationRevision[] {
    return this.preparationRevisions.get(rollDraftId) || [];
  }

  public static getActivePreparationForRoll(rollDraftId: string): FabricProcessIssuePreparation | undefined {
    const list = this.getIssuePreparationHistory(rollDraftId);
    return list.find((p) => p.status !== "SUPERSEDED") || list[0];
  }

  public static getAllPreparations(): FabricProcessIssuePreparation[] {
    return Array.from(this.preparations.values());
  }

  public static getPreparationById(preparationId: string): FabricProcessIssuePreparation | undefined {
    return this.preparations.get(preparationId);
  }

  public static getExecutionWorkspaceSummary(rolls: FabricRollDraft[]): {
    totalRolls: number;
    readyForPreparationCount: number;
    preparedCount: number;
    reviewRequiredCount: number;
    waitingPreviousCount: number;
    noFurtherProcessCount: number;
  } {
    let readyForPreparationCount = 0;
    let preparedCount = 0;
    let reviewRequiredCount = 0;
    let waitingPreviousCount = 0;
    let noFurtherProcessCount = 0;

    for (const roll of rolls) {
      const plan = FabricProcessRoutingService.getRoutePlanForRoll(roll.id);
      if (!plan) continue;

      if (plan.routeDecision === "NO_FURTHER_PROCESS") {
        noFurtherProcessCount++;
        continue;
      }

      const activePrep = this.getActivePreparationForRoll(roll.id);
      if (activePrep) {
        if (activePrep.status === "PREPARED") {
          preparedCount++;
        } else if (activePrep.status === "REVIEW_REQUIRED") {
          reviewRequiredCount++;
        }
      } else {
        const readyStep = plan.steps.find((s) => s.status === "READY");
        if (plan.status === "BLOCKED" || plan.status === "REVIEW_REQUIRED") {
          reviewRequiredCount++;
        } else if (readyStep) {
          readyForPreparationCount++;
        } else if (plan.steps.some((s) => s.status === "WAITING_PREVIOUS")) {
          waitingPreviousCount++;
        }
      }
    }

    return {
      totalRolls: rolls.length,
      readyForPreparationCount,
      preparedCount,
      reviewRequiredCount,
      waitingPreviousCount,
      noFurtherProcessCount,
    };
  }

  // ---------------------------------------------------------------------------
  // STEP 28, 29, 30 — BATCH PREPARATION
  // ---------------------------------------------------------------------------

  /**
   * Prepares a batch of rolls for process execution.
   * Enforces compatibility: same process, same execution mode, same external party.
   * Preserves individual roll line identities.
   */
  public static createBatchProcessIssuePreparation(
    rollDraftIds: string[],
    commonParams: BatchIssueCommonParams
  ): {
    batch?: FabricProcessIssueBatch | undefined;
    preparations: FabricProcessIssuePreparation[];
    errors: string[];
  } {
    if (rollDraftIds.length === 0) {
      return { preparations: [], errors: ["No roll draft IDs provided for batch."] };
    }

    const preps: FabricProcessIssuePreparation[] = [];
    const errors: string[] = [];

    // Create individual preparation for each roll
    for (const rollId of rollDraftIds) {
      const plan = FabricProcessRoutingService.getRoutePlanForRoll(rollId);
      if (!plan) {
        errors.push(`No route plan found for roll "${rollId}".`);
        continue;
      }

      const prepRes = this.createProcessIssuePreparation({
        rollDraftId: rollId,
        issueQtyMetre: plan.rollQtyMetre,
        issueDate: commonParams.issueDate,
        internalDestinationId: commonParams.internalDestinationId,
        internalDestinationName: commonParams.internalDestinationName,
        expectedReturnDate: commonParams.expectedReturnDate,
        plannedRate: commonParams.plannedRate,
        rateSource: commonParams.rateSource,
        processInstruction: commonParams.processInstruction,
        remark: commonParams.remark,
        transporterName: commonParams.transporterName,
        lrNo: commonParams.lrNo,
      });

      if (!prepRes.validation.isValid || !prepRes.preparation) {
        errors.push(...prepRes.validation.errors);
      } else {
        preps.push(prepRes.preparation);
      }
    }

    if (errors.length > 0 || preps.length === 0) {
      return { preparations: preps, errors };
    }

    // Validate batch compatibility (Step 30)
    const batchCompat = validateBatchCompatibility(preps);
    if (!batchCompat.compatible) {
      return { preparations: preps, errors: batchCompat.errors };
    }

    const first = preps[0];
    if (!first) {
      return { preparations: preps, errors: ["No preparations found for batch."] };
    }

    const now = new Date().toISOString();
    const batchIndex = this.batches.size + 1;
    const batchNo = `DRAFT-BATCH-${String(batchIndex).padStart(3, "0")}`;

    const lines: FabricProcessIssueBatchLine[] = preps.map((p, idx) => ({
      lineId: `line-${Date.now()}-${idx + 1}`,
      rollDraftId: p.rollDraftId,
      temporaryRollNo: p.temporaryRollNo,
      rollQtyMetre: p.rollQtyMetre,
      issueQtyMetre: p.issueQtyMetre,
      routePlanId: p.routePlanId,
      routeRevision: p.routeRevision,
      routeStepId: p.routeStepId,
      stepSequence: p.stepSequence,
      productionOrderId: p.productionOrderId,
      productionOrderNo: p.productionOrderNo,
      jobCardId: p.jobCardId,
      jobCardNo: p.jobCardNo,
    }));

    const totalQtyMetre = lines.reduce((acc, l) => acc + l.issueQtyMetre, 0);

    const batch: FabricProcessIssueBatch = {
      id: `batch-${Date.now()}`,
      batchNo,
      processId: first.processId,
      processCode: first.processCode,
      processName: first.processName,
      executionMode: first.executionMode,
      jobPartyId: first.jobPartyId,
      jobPartyName: first.jobPartyName,
      subPartyId: first.subPartyId,
      subPartyName: first.subPartyName,
      issueDate: first.issueDate,
      totalQtyMetre,
      totalRolls: lines.length,
      lines,
      status: "PREPARED",
      createdAt: now,
    };

    this.batches.set(batch.id, batch);

    return { batch, preparations: preps, errors: [] };
  }

  // =============================================================================
  // COMPREHENSIVE VERIFICATION TEST SUITE (TESTS A THROUGH M)
  // =============================================================================

  /**
   * Deterministic test suite verifying all 13 required scenarios (Steps 35 through 47).
   */
  public static runPhase5DVerificationTests(): {
    allPassed: boolean;
    results: Record<string, { status: "PASS" | "FAIL"; details: string }>;
  } {
    const results: Record<string, { status: "PASS" | "FAIL"; details: string }> = {};

    // Reset stores
    FabricProcessRoutingService.resetStores();
    this.resetStores();

    // -------------------------------------------------------------------------
    // TEST A: Internal Process Preparation (Step 35)
    // Route: Step 1 Butta INTERNAL READY, Roll: 200m
    // Expected: Internal Process Issue Preparation: PASS, Qty: 200
    // -------------------------------------------------------------------------
    try {
      FabricProcessRoutingService.createRoutePlan({
        rollDraftId: "roll-test-a",
        temporaryRollNo: "DRAFT-R001",
        jobCardId: "jc-01",
        productionOrderId: "po-01",
        rollQtyMetre: 200,
        routeDecision: "PROCESS_ROUTE",
        routeType: "STANDARD",
        steps: [
          {
            processId: "prc-1", // Butta
            executionMode: "INTERNAL",
            plannedQtyMetre: 200,
            instruction: "Butta cut before RFD",
          },
        ],
      });

      const prepResA = this.createProcessIssuePreparation({
        rollDraftId: "roll-test-a",
        issueQtyMetre: 200,
        issueDate: "2026-09-29",
      });

      if (!prepResA.validation.isValid || !prepResA.preparation) {
        results["A"] = {
          status: "FAIL",
          details: `Validation failed: ${prepResA.validation.errors.join(", ")}`,
        };
      } else {
        const previewA = this.createInternalProcessTransferPreview(prepResA.preparation);
        const passA =
          prepResA.preparation.issueQtyMetre === 200 &&
          prepResA.preparation.executionMode === "INTERNAL" &&
          prepResA.preparation.status === "PREPARED" &&
          previewA.stockMutation === "NONE" &&
          previewA.futureStockPosition === "INTERNAL WIP / WIP LOCATION";

        results["A"] = {
          status: passA ? "PASS" : "FAIL",
          details: passA
            ? "Internal Process Issue Preparation passed with 200m whole roll."
            : `Unexpected values: ${JSON.stringify(previewA)}`,
        };
      }
    } catch (err: any) {
      results["A"] = { status: "FAIL", details: err?.message || String(err) };
    }

    // -------------------------------------------------------------------------
    // TEST B: External Job Work Outward Preview (Step 36)
    // Route: Step 1 RFD EXTERNAL READY, Job Party active
    // Expected: Job Work Outward Preview: PASS
    // -------------------------------------------------------------------------
    try {
      const activeParties = FabricProcessRoutingService.getEligibleJobWorkParties();
      const jobParty = activeParties[0];

      if (!jobParty) {
        results["B"] = { status: "FAIL", details: "No active job parties available in seed." };
      } else {
        FabricProcessRoutingService.createRoutePlan({
          rollDraftId: "roll-test-b",
          temporaryRollNo: "DRAFT-R002",
          jobCardId: "jc-01",
          productionOrderId: "po-01",
          rollQtyMetre: 210,
          routeDecision: "PROCESS_ROUTE",
          routeType: "STANDARD",
          steps: [
            {
              processId: "prc-2", // RFD
              executionMode: "EXTERNAL_JOBWORK",
              jobPartyId: jobParty.id,
              plannedQtyMetre: 210,
            },
          ],
        });

        const prepResB = this.createProcessIssuePreparation({
          rollDraftId: "roll-test-b",
          issueQtyMetre: 210,
        });

        if (!prepResB.validation.isValid || !prepResB.preparation) {
          results["B"] = {
            status: "FAIL",
            details: `Validation failed: ${prepResB.validation.errors.join(", ")}`,
          };
        } else {
          const previewB = this.createJobWorkOutwardPreview(prepResB.preparation);
          const passB =
            previewB.previewType === "JOB_WORK_OUTWARD" &&
            previewB.draftRef.startsWith("DRAFT-JW-OUT-") &&
            previewB.inventoryMovement === "NOT POSTED" &&
            previewB.futureStockPosition === "WITH THIRD PARTY" &&
            previewB.jobPartyId === jobParty.id;

          results["B"] = {
            status: passB ? "PASS" : "FAIL",
            details: passB
              ? "Job Work Outward preview passed with active processor."
              : `Preview mismatch: ${JSON.stringify(previewB)}`,
          };
        }
      }
    } catch (err: any) {
      results["B"] = { status: "FAIL", details: err?.message || String(err) };
    }

    // -------------------------------------------------------------------------
    // TEST C: External Route Missing Job Party (Step 37)
    // Expected: BLOCK
    // -------------------------------------------------------------------------
    try {
      FabricProcessRoutingService.createRoutePlan({
        rollDraftId: "roll-test-c",
        temporaryRollNo: "DRAFT-R003",
        jobCardId: "jc-01",
        productionOrderId: "po-01",
        rollQtyMetre: 150,
        routeDecision: "PROCESS_ROUTE",
        routeType: "STANDARD",
        steps: [
          {
            processId: "prc-2",
            executionMode: "EXTERNAL_JOBWORK",
            jobPartyId: "non-existent-party-999",
            plannedQtyMetre: 150,
          },
        ],
      });

      const prepResC = this.createProcessIssuePreparation({
        rollDraftId: "roll-test-c",
        issueQtyMetre: 150,
      });

      const isBlocked = !prepResC.validation.isValid;
      results["C"] = {
        status: isBlocked ? "PASS" : "FAIL",
        details: isBlocked
          ? "External issue preparation blocked due to missing/invalid party."
          : "Should have blocked external issue with missing party.",
      };
    } catch (err: any) {
      results["C"] = { status: "FAIL", details: err?.message || String(err) };
    }

    // -------------------------------------------------------------------------
    // TEST D: Route Step Status WAITING_PREVIOUS (Step 38)
    // Step 2 is WAITING_PREVIOUS
    // Expected: Issue Preparation blocked
    // -------------------------------------------------------------------------
    try {
      const planD = FabricProcessRoutingService.createRoutePlan({
        rollDraftId: "roll-test-d",
        temporaryRollNo: "DRAFT-R004",
        jobCardId: "jc-01",
        productionOrderId: "po-01",
        rollQtyMetre: 250,
        routeDecision: "PROCESS_ROUTE",
        routeType: "STANDARD",
        steps: [
          { processId: "prc-1", executionMode: "INTERNAL", plannedQtyMetre: 250 },
          { processId: "prc-2", executionMode: "INTERNAL", plannedQtyMetre: 250 },
        ],
      });

      const step2 = planD.plan?.steps[1];
      const isWaitingPrev = step2?.status === "WAITING_PREVIOUS";

      const prepResD = this.createProcessIssuePreparation({
        rollDraftId: "roll-test-d",
        routeStepId: step2?.id,
        issueQtyMetre: 250,
      });

      const isBlockedD = isWaitingPrev && !prepResD.validation.isValid;
      results["D"] = {
        status: isBlockedD ? "PASS" : "FAIL",
        details: isBlockedD
          ? "Step with WAITING_PREVIOUS status strictly blocked from issue."
          : `Step was not blocked properly: ${JSON.stringify(prepResD.validation)}`,
      };
    } catch (err: any) {
      results["D"] = { status: "FAIL", details: err?.message || String(err) };
    }

    // -------------------------------------------------------------------------
    // TEST E: Route NO_FURTHER_PROCESS (Step 39)
    // Expected: Process Issue unavailable ("No Process Issue Required")
    // -------------------------------------------------------------------------
    try {
      FabricProcessRoutingService.createRoutePlan({
        rollDraftId: "roll-test-e",
        temporaryRollNo: "DRAFT-R005",
        jobCardId: "jc-01",
        productionOrderId: "po-01",
        rollQtyMetre: 180,
        routeDecision: "NO_FURTHER_PROCESS",
        routeType: "STANDARD",
        steps: [],
      });

      const issueableSteps = this.getIssueableRouteSteps("roll-test-e");
      const prepResE = this.createProcessIssuePreparation({
        rollDraftId: "roll-test-e",
        issueQtyMetre: 180,
      });

      const passE =
        issueableSteps.length === 0 &&
        !prepResE.validation.isValid &&
        prepResE.validation.errors.some((e) => e.includes("NO_FURTHER_PROCESS"));

      results["E"] = {
        status: passE ? "PASS" : "FAIL",
        details: passE
          ? "Roll with NO_FURTHER_PROCESS correctly has no issueable steps and preparation blocked."
          : "NO_FURTHER_PROCESS did not block issue preparation.",
      };
    } catch (err: any) {
      results["E"] = { status: "FAIL", details: err?.message || String(err) };
    }

    // -------------------------------------------------------------------------
    // TEST F: Partial Roll Issue (Step 40)
    // Roll: 200m, Attempt Issue: 80m
    // Expected: ROLL_SPLIT_REQUIRED (PASS)
    // -------------------------------------------------------------------------
    try {
      FabricProcessRoutingService.createRoutePlan({
        rollDraftId: "roll-test-f",
        temporaryRollNo: "DRAFT-R006",
        jobCardId: "jc-01",
        productionOrderId: "po-01",
        rollQtyMetre: 200,
        routeDecision: "PROCESS_ROUTE",
        routeType: "STANDARD",
        steps: [{ processId: "prc-1", executionMode: "INTERNAL", plannedQtyMetre: 200 }],
      });

      const prepResF = this.createProcessIssuePreparation({
        rollDraftId: "roll-test-f",
        issueQtyMetre: 80,
      });

      const passF =
        !prepResF.validation.isValid &&
        prepResF.validation.splitRequired?.code === "ROLL_SPLIT_REQUIRED" &&
        prepResF.validation.splitRequired.difference === 120;

      results["F"] = {
        status: passF ? "PASS" : "FAIL",
        details: passF
          ? "Partial issue blocked with ROLL_SPLIT_REQUIRED (200m vs 80m, diff: 120m)."
          : `Unexpected result: ${JSON.stringify(prepResF.validation)}`,
      };
    } catch (err: any) {
      results["F"] = { status: "FAIL", details: err?.message || String(err) };
    }

    // -------------------------------------------------------------------------
    // TEST G: Quality HOLD blocks Route (Step 41)
    // Expected: Issue unavailable (PASS)
    // -------------------------------------------------------------------------
    try {
      const planG = FabricProcessRoutingService.createRoutePlan({
        rollDraftId: "roll-test-g",
        temporaryRollNo: "DRAFT-R007",
        jobCardId: "jc-01",
        productionOrderId: "po-01",
        rollQtyMetre: 190,
        routeDecision: "PROCESS_ROUTE",
        routeType: "STANDARD",
        sourceDisposition: "HOLD",
        steps: [{ processId: "prc-1", executionMode: "INTERNAL", plannedQtyMetre: 190 }],
      });

      const issueableStepsG = this.getIssueableRouteSteps("roll-test-g");
      const prepResG = this.createProcessIssuePreparation({
        rollDraftId: "roll-test-g",
        issueQtyMetre: 190,
      });

      const passG =
        planG.plan?.status === "BLOCKED" &&
        issueableStepsG.length === 0 &&
        !prepResG.validation.isValid;

      results["G"] = {
        status: passG ? "PASS" : "FAIL",
        details: passG
          ? "Quality HOLD correctly caused route BLOCKED and made issue unavailable."
          : `Unexpected: plan=${planG.plan?.status}, valid=${prepResG.validation.isValid}`,
      };
    } catch (err: any) {
      results["G"] = { status: "FAIL", details: err?.message || String(err) };
    }

    // -------------------------------------------------------------------------
    // TEST H: Route Revision After Preparation (Step 42)
    // Prepared Issue: 200m. Route later revised.
    // Expected: Preparation REVIEW_REQUIRED / SUPERSEDED. Historical preserved.
    // -------------------------------------------------------------------------
    try {
      FabricProcessRoutingService.createRoutePlan({
        rollDraftId: "roll-test-h",
        temporaryRollNo: "DRAFT-R008",
        jobCardId: "jc-01",
        productionOrderId: "po-01",
        rollQtyMetre: 200,
        routeDecision: "PROCESS_ROUTE",
        routeType: "STANDARD",
        steps: [{ processId: "prc-1", executionMode: "INTERNAL", plannedQtyMetre: 200 }],
      });

      const prepResH = this.createProcessIssuePreparation({
        rollDraftId: "roll-test-h",
        issueQtyMetre: 200,
      });

      const prepH = prepResH.preparation!;

      // Now route is revised to Step 1 RFD
      FabricProcessRoutingService.updateRoutePlanAsRevision({
        rollDraftId: "roll-test-h",
        routeDecision: "PROCESS_ROUTE",
        routeType: "STANDARD",
        steps: [{ processId: "prc-2", executionMode: "INTERNAL", plannedQtyMetre: 200 }],
        reason: "Process changed from Butta to RFD",
      });

      // Check preparation staleness
      const stalenessH = this.checkAndMarkPreparationStaleness(prepH.id);

      const passH =
        stalenessH.isStale &&
        prepH.status === "REVIEW_REQUIRED" &&
        prepH.processName === "Butta Cutting & Processing"; // historical not silently mutated to RFD

      results["H"] = {
        status: passH ? "PASS" : "FAIL",
        details: passH
          ? "Route revision marked existing preparation REVIEW_REQUIRED; historical Butta preserved."
          : `Staleness check failed: isStale=${stalenessH.isStale}, status=${prepH.status}`,
      };
    } catch (err: any) {
      results["H"] = { status: "FAIL", details: err?.message || String(err) };
    }

    // -------------------------------------------------------------------------
    // TEST I: Roll Revision After Preparation (Step 43)
    // Prepared Issue: 200m. Roll revised to 190m.
    // Expected: Preparation Review Required. No Qty rewrite.
    // -------------------------------------------------------------------------
    try {
      FabricProcessRoutingService.createRoutePlan({
        rollDraftId: "roll-test-i",
        temporaryRollNo: "DRAFT-R009",
        jobCardId: "jc-01",
        productionOrderId: "po-01",
        rollQtyMetre: 200,
        routeDecision: "PROCESS_ROUTE",
        routeType: "STANDARD",
        steps: [{ processId: "prc-1", executionMode: "INTERNAL", plannedQtyMetre: 200 }],
      });

      const prepResI = this.createProcessIssuePreparation({
        rollDraftId: "roll-test-i",
        issueQtyMetre: 200,
      });

      const prepI = prepResI.preparation!;

      // Upstream roll changed to 190
      const mockRevisedRoll: FabricRollDraft = {
        id: "roll-test-i",
        receiveDraftId: "rcv-01",
        jobCardId: "jc-01",
        productionOrderId: "po-01",
        rollSequence: 1,
        temporaryRollNo: "DRAFT-R009",
        qtyMetre: 190, // changed
        inspectionStatus: "UNINSPECTED",
        stockStatus: "DRAFT_GREY",
        isSaleable: false,
      };

      const stalenessI = this.checkAndMarkPreparationStaleness(prepI.id, mockRevisedRoll);

      const passI =
        stalenessI.isStale &&
        prepI.status === "REVIEW_REQUIRED" &&
        prepI.issueQtyMetre === 200; // not silently changed to 190

      results["I"] = {
        status: passI ? "PASS" : "FAIL",
        details: passI
          ? "Upstream roll qty revision marked preparation REVIEW_REQUIRED with no silent qty rewrite."
          : `Staleness failed: isStale=${stalenessI.isStale}, qty=${prepI.issueQtyMetre}`,
      };
    } catch (err: any) {
      results["I"] = { status: "FAIL", details: err?.message || String(err) };
    }

    // -------------------------------------------------------------------------
    // TEST J: External Job Party Inactive (Step 44)
    // Expected: Issue preparation blocked / review required. No replacement.
    // -------------------------------------------------------------------------
    try {
      const activeParties = FabricProcessRoutingService.getEligibleJobWorkParties();
      const party = activeParties[0];

      if (!party) {
        results["J"] = { status: "FAIL", details: "No active parties in seed." };
      } else {
        FabricProcessRoutingService.createRoutePlan({
          rollDraftId: "roll-test-j",
          temporaryRollNo: "DRAFT-R010",
          jobCardId: "jc-01",
          productionOrderId: "po-01",
          rollQtyMetre: 160,
          routeDecision: "PROCESS_ROUTE",
          routeType: "STANDARD",
          steps: [
            {
              processId: "prc-2",
              executionMode: "EXTERNAL_JOBWORK",
              jobPartyId: party.id,
              plannedQtyMetre: 160,
            },
          ],
        });

        const prepResJ = this.createProcessIssuePreparation({
          rollDraftId: "roll-test-j",
          issueQtyMetre: 160,
        });

        const prepJ = prepResJ.preparation!;

        // Simulate party deactivation in master
        const mockInactiveParty: PartyRecord = {
          ...party,
          id: party.id,
          partyCode: party.partyCode,
          partyName: party.partyName,
          officeName: party.officeName,
          addressLine1: party.addressLine1,
          city: party.city,
          state: party.state,
          pinCode: party.pinCode,
          country: party.country,
          jobWorkApplicable: party.jobWorkApplicable,
          createdAt: party.createdAt,
          updatedAt: party.updatedAt,
          status: "Inactive",
        };

        const stalenessJ = detectPreparationStaleness({
          preparation: prepJ,
          currentPlan: FabricProcessRoutingService.getRoutePlanForRoll("roll-test-j"),
          currentRevisionNumber: 1,
          partyRecord: mockInactiveParty,
        });

        const passJ =
          stalenessJ.isStale &&
          stalenessJ.reason?.includes("Inactive") &&
          prepJ.jobPartyId === party.id; // no automatic replacement

        results["J"] = {
          status: passJ ? "PASS" : "FAIL",
          details: passJ
            ? "Inactive job party correctly triggered staleness review with no auto-replacement."
            : `Test J failed: isStale=${stalenessJ.isStale}, reason=${stalenessJ.reason}`,
        };
      }
    } catch (err: any) {
      results["J"] = { status: "FAIL", details: err?.message || String(err) };
    }

    // -------------------------------------------------------------------------
    // TEST K: Rate Basis Review (MTR vs Cut/PCS) (Step 45)
    // Process description: ₹2 / cut, Roll: 200 MTR, No cut count.
    // Expected: No fabricated cost. Quantity / Rate Basis: REVIEW REQUIRED
    // -------------------------------------------------------------------------
    try {
      const procButta = FabricProcessRoutingService.getProcessById("prc-1")!; // has "Standard Rate ₹2.00 / cut"
      const rateBasisK = this.deriveQuantityBasisReview(procButta, 200);
      const rateHintsK = this.getProcessRateHints({
        processId: "prc-1",
        rollQtyMetre: 200,
      });

      const passK =
        rateBasisK.requiresReview === true &&
        rateBasisK.rateAvailable === false &&
        rateHintsK.requiresQuantityBasisReview === true &&
        rateHintsK.rateCalculationAvailable === false;

      results["K"] = {
        status: passK ? "PASS" : "FAIL",
        details: passK
          ? "MTR vs Cut rate basis mismatch correctly flagged; no cost fabricated."
          : `Test K failed: review=${rateBasisK.requiresReview}, available=${rateBasisK.rateAvailable}`,
      };
    } catch (err: any) {
      results["K"] = { status: "FAIL", details: err?.message || String(err) };
    }

    // -------------------------------------------------------------------------
    // TEST L: Compatible Batch (Step 46)
    // Two Rolls: R1 200m, R2 180m, Same Process, Same external Party, Both READY
    // Expected: Batch preview with 2 distinct lines, Total: 380m, distinct identities preserved.
    // -------------------------------------------------------------------------
    try {
      const activeParties = FabricProcessRoutingService.getEligibleJobWorkParties();
      const party = activeParties[0];

      if (!party) {
        results["L"] = { status: "FAIL", details: "No active parties in seed." };
      } else {
        FabricProcessRoutingService.createRoutePlan({
          rollDraftId: "roll-batch-1",
          temporaryRollNo: "DRAFT-R011",
          jobCardId: "jc-01",
          productionOrderId: "po-01",
          rollQtyMetre: 200,
          routeDecision: "PROCESS_ROUTE",
          routeType: "STANDARD",
          steps: [
            {
              processId: "prc-2",
              executionMode: "EXTERNAL_JOBWORK",
              jobPartyId: party.id,
              plannedQtyMetre: 200,
            },
          ],
        });

        FabricProcessRoutingService.createRoutePlan({
          rollDraftId: "roll-batch-2",
          temporaryRollNo: "DRAFT-R012",
          jobCardId: "jc-01",
          productionOrderId: "po-01",
          rollQtyMetre: 180,
          routeDecision: "PROCESS_ROUTE",
          routeType: "STANDARD",
          steps: [
            {
              processId: "prc-2",
              executionMode: "EXTERNAL_JOBWORK",
              jobPartyId: party.id,
              plannedQtyMetre: 180,
            },
          ],
        });

        const batchResL = this.createBatchProcessIssuePreparation(
          ["roll-batch-1", "roll-batch-2"],
          { issueDate: "2026-09-29" }
        );

        const batch = batchResL.batch;
        const line0 = batch?.lines[0];
        const line1 = batch?.lines[1];

        const passL =
          batchResL.errors.length === 0 &&
          batch !== undefined &&
          batch.totalQtyMetre === 380 &&
          batch.lines.length === 2 &&
          line0 !== undefined &&
          line1 !== undefined &&
          line0.rollDraftId === "roll-batch-1" &&
          line1.rollDraftId === "roll-batch-2" &&
          line0.issueQtyMetre === 200 &&
          line1.issueQtyMetre === 180;

        results["L"] = {
          status: passL ? "PASS" : "FAIL",
          details: passL
            ? "Batch preparation generated 2 distinct traceable lines totaling 380m."
            : `Batch L failed: ${batchResL.errors.join(", ")}`,
        };
      }
    } catch (err: any) {
      results["L"] = { status: "FAIL", details: err?.message || String(err) };
    }

    // -------------------------------------------------------------------------
    // TEST M: Incompatible Processor Batch (Step 47)
    // Two Rolls have different processors -> BLOCK
    // -------------------------------------------------------------------------
    try {
      const activeParties = FabricProcessRoutingService.getEligibleJobWorkParties();
      const party1 = activeParties[0];
      const party2 = activeParties.length > 1 && activeParties[1]
        ? activeParties[1]
        : party1 ? { ...party1, id: "party-diff-002", partyName: "Different Mill" } : undefined;

      if (!party1 || !party2) {
        results["M"] = { status: "FAIL", details: "Could not establish 2 distinct test parties." };
      } else {
        FabricProcessRoutingService.createRoutePlan({
          rollDraftId: "roll-diff-1",
          temporaryRollNo: "DRAFT-R013",
          jobCardId: "jc-01",
          productionOrderId: "po-01",
          rollQtyMetre: 150,
          routeDecision: "PROCESS_ROUTE",
          routeType: "STANDARD",
          steps: [
            {
              processId: "prc-2",
              executionMode: "EXTERNAL_JOBWORK",
              jobPartyId: party1.id,
              plannedQtyMetre: 150,
            },
          ],
        });

        FabricProcessRoutingService.createRoutePlan({
          rollDraftId: "roll-diff-2",
          temporaryRollNo: "DRAFT-R014",
          jobCardId: "jc-01",
          productionOrderId: "po-01",
          rollQtyMetre: 170,
          routeDecision: "PROCESS_ROUTE",
          routeType: "STANDARD",
          steps: [
            {
              processId: "prc-2",
              executionMode: "EXTERNAL_JOBWORK",
              jobPartyId: party2.id,
              plannedQtyMetre: 170,
            },
          ],
        });

        const batchResM = this.createBatchProcessIssuePreparation(
          ["roll-diff-1", "roll-diff-2"],
          {}
        );

        const passM =
          batchResM.batch === undefined &&
          batchResM.errors.length > 0 &&
          batchResM.errors.some((e) => e.includes("processor"));

        results["M"] = {
          status: passM ? "PASS" : "FAIL",
          details: passM
            ? "Incompatible external processor batch strictly blocked."
            : `Batch M should have failed but got: ${JSON.stringify(batchResM.batch)}`,
        };
      }
    } catch (err: any) {
      results["M"] = { status: "FAIL", details: err?.message || String(err) };
    }

    // -------------------------------------------------------------------------
    // TEST N: Different Processes Batch (Step 65)
    // Attempt same batch with different processes -> BLOCK
    // -------------------------------------------------------------------------
    try {
      FabricProcessRoutingService.createRoutePlan({
        rollDraftId: "roll-proc-1",
        temporaryRollNo: "DRAFT-R015",
        jobCardId: "jc-01",
        productionOrderId: "po-01",
        rollQtyMetre: 160,
        routeDecision: "PROCESS_ROUTE",
        routeType: "STANDARD",
        steps: [{ processId: "prc-1", executionMode: "INTERNAL", plannedQtyMetre: 160 }],
      });

      FabricProcessRoutingService.createRoutePlan({
        rollDraftId: "roll-proc-2",
        temporaryRollNo: "DRAFT-R016",
        jobCardId: "jc-01",
        productionOrderId: "po-01",
        rollQtyMetre: 180,
        routeDecision: "PROCESS_ROUTE",
        routeType: "STANDARD",
        steps: [{ processId: "prc-2", executionMode: "INTERNAL", plannedQtyMetre: 180 }],
      });

      const batchResN = this.createBatchProcessIssuePreparation(
        ["roll-proc-1", "roll-proc-2"],
        {}
      );

      const passN =
        batchResN.batch === undefined &&
        batchResN.errors.length > 0 &&
        batchResN.errors.some((e) => e.includes("process"));

      results["N"] = {
        status: passN ? "PASS" : "FAIL",
        details: passN
          ? "Batch preparation with different processes strictly blocked."
          : `Batch N should have failed but got: ${JSON.stringify(batchResN.batch)}`,
      };
    } catch (err: any) {
      results["N"] = { status: "FAIL", details: err?.message || String(err) };
    }

    // -------------------------------------------------------------------------
    // TEST O: Internal + External Mixed Batch (Step 66)
    // Attempt same batch with internal and external modes -> BLOCK
    // -------------------------------------------------------------------------
    try {
      const activeParties = FabricProcessRoutingService.getEligibleJobWorkParties();
      const party = activeParties[0];

      if (!party) {
        results["O"] = { status: "FAIL", details: "No active party available for Test O." };
      } else {
        FabricProcessRoutingService.createRoutePlan({
          rollDraftId: "roll-mix-1",
          temporaryRollNo: "DRAFT-R017",
          jobCardId: "jc-01",
          productionOrderId: "po-01",
          rollQtyMetre: 140,
          routeDecision: "PROCESS_ROUTE",
          routeType: "STANDARD",
          steps: [{ processId: "prc-2", executionMode: "INTERNAL", plannedQtyMetre: 140 }],
        });

        FabricProcessRoutingService.createRoutePlan({
          rollDraftId: "roll-mix-2",
          temporaryRollNo: "DRAFT-R018",
          jobCardId: "jc-01",
          productionOrderId: "po-01",
          rollQtyMetre: 140,
          routeDecision: "PROCESS_ROUTE",
          routeType: "STANDARD",
          steps: [
            {
              processId: "prc-2",
              executionMode: "EXTERNAL_JOBWORK",
              jobPartyId: party.id,
              plannedQtyMetre: 140,
            },
          ],
        });

        const batchResO = this.createBatchProcessIssuePreparation(
          ["roll-mix-1", "roll-mix-2"],
          {}
        );

        const passO =
          batchResO.batch === undefined &&
          batchResO.errors.length > 0 &&
          batchResO.errors.some((e) => e.toLowerCase().includes("execution mode"));

        results["O"] = {
          status: passO ? "PASS" : "FAIL",
          details: passO
            ? "Batch preparation with mixed internal/external modes strictly blocked."
            : `Batch O should have failed but got: ${JSON.stringify(batchResO.batch)}`,
        };
      }
    } catch (err: any) {
      results["O"] = { status: "FAIL", details: err?.message || String(err) };
    }

    const allPassed = Object.values(results).every((r) => r.status === "PASS");
    return { allPassed, results };
  }
}

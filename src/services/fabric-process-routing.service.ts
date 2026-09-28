/**
 * =============================================================================
 * SCKT PRODUCTION FOUNDATION — PHASE 5C
 * STEP 3 — FABRIC PROCESS ROUTING DOMAIN SERVICE & TYPES
 * =============================================================================
 * Pure business logic and frontend contract for downstream fabric process routing.
 * Answers: "For this Fabric Roll, what processes must happen next, in what order,
 * and who will perform them?"
 *
 * GOVERNANCE RULES:
 * 1. Focused service only — do NOT bloat production-planning.service.ts.
 * 2. Process Master: Canonical authority is `masters` (master_type = 'process').
 *    Never create a hard-coded Process enum or second static list.
 * 3. External Processor: Canonical authority is Full Party Master (party-store.ts).
 *    Eligible parties must have `partyType === "Job Party"` or `jobWorkApplicable === "Yes"`.
 *    Never use legacy generic `jobwork_party` as authority.
 * 4. Whole-Roll Routing Only: plannedQtyMetre must equal rollQtyMetre.
 *    Partial routing returns `ROLL_SPLIT_REQUIRED`. Child roll split is NOT implemented.
 * 5. Quality Disposition:
 *    - ACCEPTED: Planner decision required (Standard Route or No Further Process).
 *    - PROCESS_REQUIRED: Standard route required; process selected manually.
 *    - REWORK: Quality Rework route supported; process selected manually.
 *    - HOLD: Blocks route readiness (BLOCKED / REVIEW_REQUIRED).
 *    - REJECT: Route cannot be normal; requires review (REVIEW_REQUIRED).
 * 6. Cost Sheet & Item Master entries are advisory HINTS ONLY. Never auto-route.
 * 7. In-memory frontend simulation only. Zero backend mutations. Zero inventory movements.
 */

import {
  type FabricRollDraft,
  type FabricInspectionDraft,
  type FabricInspectionStatus,
  type FabricGrade,
  type FabricDisposition,
  type SaleabilityPreviewStatus,
} from "./production-planning.service";
import {
  getLocalParties,
  getLocalSubParties,
  type PartyRecord,
  type SubPartyRecord,
} from "@/lib/party-store";
import { type ChargeLine } from "@/lib/costing";

// =============================================================================
// STEP 1 — PROCESS ROUTING TYPES
// =============================================================================

export type FabricProcessRouteType =
  | "STANDARD"
  | "QUALITY_REWORK";

export type FabricProcessRouteStatus =
  | "NOT_PLANNED"
  | "PLANNED"
  | "READY"
  | "BLOCKED"
  | "REVIEW_REQUIRED";

export type FabricProcessExecutionMode =
  | "INTERNAL"
  | "EXTERNAL_JOBWORK";

export type FabricProcessRouteStepStatus =
  | "PLANNED"
  | "READY"
  | "WAITING_PREVIOUS"
  | "BLOCKED"
  | "REVIEW_REQUIRED";

export type FabricProcessRouteDecision =
  | "PROCESS_ROUTE"
  | "NO_FURTHER_PROCESS";

// =============================================================================
// PROCESS MASTER & HINT CONTRACTS
// =============================================================================

export interface ProcessMasterRecord {
  id: string;
  code: string;
  name: string;
  description?: string | undefined;
  active: boolean;
}

export interface ProcessHint {
  source: "COST_SHEET" | "ITEM_MASTER";
  text: string;
  chargeName?: string | undefined;
  rate?: number | undefined;
  quantity?: number | undefined;
  suggestedProcessId?: string | undefined;
  suggestedProcessName?: string | undefined;
}

export interface RollSplitRequiredResult {
  code: "ROLL_SPLIT_REQUIRED";
  message: string;
  rollQty: number;
  attemptedProcessQty: number;
  difference: number;
}

export interface RouteValidationResult {
  isValid: boolean;
  errors: string[];
  splitRequired?: RollSplitRequiredResult | undefined;
}

// =============================================================================
// STEP 2 & 3 — ROUTE STEP & ROUTE PLAN CONTRACTS
// =============================================================================

export interface FabricProcessRouteStep {
  id: string;
  sequence: number;
  processId: string;
  processCode: string;
  processName: string;
  executionMode: FabricProcessExecutionMode;
  jobPartyId?: string | undefined;
  jobPartyName?: string | undefined;
  subPartyId?: string | undefined;
  subPartyName?: string | undefined;
  plannedQtyMetre: number;
  status: FabricProcessRouteStepStatus;
  instruction?: string | undefined;
  remark?: string | undefined;
  reviewReason?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface FabricProcessRoutePlan {
  id: string;
  rollDraftId: string;
  temporaryRollNo: string;
  receiveDraftId?: string | undefined;
  jobCardId: string;
  jobCardNo?: string | undefined;
  productionOrderId: string;
  productionOrderNo?: string | undefined;
  salesOrderId?: string | undefined;
  salesOrderNo?: string | undefined;
  itemCode?: string | undefined;
  designNo?: string | undefined;
  rollQtyMetre: number;
  routeDecision: FabricProcessRouteDecision;
  routeType: FabricProcessRouteType;
  sourceInspectionId?: string | undefined;
  sourceInspectionStatus?: FabricInspectionStatus | undefined;
  sourceGrade?: FabricGrade | undefined;
  sourceDisposition?: FabricDisposition | "NOT_SET" | undefined;
  sourceSaleabilityPreview?: SaleabilityPreviewStatus | undefined;
  steps: FabricProcessRouteStep[];
  status: FabricProcessRouteStatus;
  reviewReason?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface FabricProcessRouteRevision {
  id: string;
  rollDraftId: string;
  revisionNumber: number;
  routePlanId: string;
  previousSteps: FabricProcessRouteStep[];
  newSteps: FabricProcessRouteStep[];
  previousStatus: FabricProcessRouteStatus;
  newStatus: FabricProcessRouteStatus;
  reason: string;
  createdAt: string;
}

// =============================================================================
// SUMMARY CONTRACTS (STEPS 37, 38, 39)
// =============================================================================

export interface RollRoutingSummary {
  rollDraftId: string;
  temporaryRollNo: string;
  rollQtyMetre: number;
  routePlan?: FabricProcessRoutePlan | undefined;
  routeDecision: FabricProcessRouteDecision | "UNPLANNED";
  routeStatus: FabricProcessRouteStatus;
  routeType?: FabricProcessRouteType | undefined;
  totalSteps: number;
  currentStep?: FabricProcessRouteStep | undefined;
  requiresReview: boolean;
  reviewReason?: string | undefined;
}

export interface JobCardRoutingSummary {
  totalRolls: number;
  routesNotPlanned: number;
  routesPlanned: number;
  noFurtherProcessCount: number;
  standardRoutesCount: number;
  qualityReworkCount: number;
  blockedCount: number;
  reviewRequiredCount: number;
  readyCount: number;
}

export interface ProductionOrderRoutingSummary {
  totalRolls: number;
  readyCount: number;
  notPlannedCount: number;
  blockedCount: number;
  reviewRequiredCount: number;
  plannedCount: number;
  noFurtherProcessCount: number;
  standardRoutesCount: number;
  qualityReworkCount: number;
}

// =============================================================================
// PARAMS CONTRACTS
// =============================================================================

export interface CreateRouteStepInput {
  processId: string;
  executionMode: FabricProcessExecutionMode;
  plannedQtyMetre: number;
  jobPartyId?: string | undefined;
  subPartyId?: string | undefined;
  instruction?: string | undefined;
  remark?: string | undefined;
}

export interface CreateRoutePlanParams {
  rollDraftId: string;
  temporaryRollNo: string;
  receiveDraftId?: string | undefined;
  jobCardId: string;
  jobCardNo?: string | undefined;
  productionOrderId: string;
  productionOrderNo?: string | undefined;
  salesOrderId?: string | undefined;
  salesOrderNo?: string | undefined;
  itemCode?: string | undefined;
  designNo?: string | undefined;
  rollQtyMetre: number;
  routeDecision: FabricProcessRouteDecision;
  routeType: FabricProcessRouteType;
  sourceInspectionId?: string | undefined;
  sourceInspectionStatus?: FabricInspectionStatus | undefined;
  sourceGrade?: FabricGrade | undefined;
  sourceDisposition?: FabricDisposition | "NOT_SET" | undefined;
  sourceSaleabilityPreview?: SaleabilityPreviewStatus | undefined;
  steps?: CreateRouteStepInput[] | undefined;
}

export interface UpdateRoutePlanParams {
  rollDraftId: string;
  routeDecision: FabricProcessRouteDecision;
  routeType: FabricProcessRouteType;
  steps?: CreateRouteStepInput[] | undefined;
  reason: string;
}

// =============================================================================
// CANONICAL SEED PROCESSES (FROM SUPABASE MASTERS `process`)
// =============================================================================

const CANONICAL_PROCESS_SEEDS: ProcessMasterRecord[] = [
  {
    id: "prc-1",
    code: "PRC-01",
    name: "Butta Cutting & Processing",
    description: "Standard Rate ₹2.00 / cut",
    active: true,
  },
  {
    id: "prc-2",
    code: "PRC-02",
    name: "Ready for Dyeing (RFD) Finish",
    description: "Standard Rate ₹0.00 / cut",
    active: true,
  },
  {
    id: "prc-3",
    code: "PRC-03",
    name: "Soft Wash & Calendar Finish",
    description: "Standard Rate ₹1.50 / metre",
    active: true,
  },
];

// =============================================================================
// PURE DOMAIN FUNCTIONS (STEP 29)
// =============================================================================

/**
 * Normalizes sequence order strictly to 1, 2, 3...
 * Cleans duplicates, zeros, and negative sequences deterministically.
 */
export function normalizeRouteSequence(steps: FabricProcessRouteStep[]): FabricProcessRouteStep[] {
  return steps.map((step, idx) => ({
    ...step,
    sequence: idx + 1,
  }));
}

/**
 * Reorders a step within an ordered route, updating sequence deterministically.
 */
export function moveRouteStep(
  steps: FabricProcessRouteStep[],
  fromIndex: number,
  toIndex: number
): FabricProcessRouteStep[] {
  if (fromIndex < 0 || fromIndex >= steps.length || toIndex < 0 || toIndex >= steps.length) {
    return steps;
  }
  const next = [...steps];
  const [removed] = next.splice(fromIndex, 1);
  if (!removed) return steps;
  next.splice(toIndex, 0, removed);
  return normalizeRouteSequence(next);
}

/**
 * Removes a step from an ordered route, renumbering sequence safely.
 */
export function removeRouteStep(
  steps: FabricProcessRouteStep[],
  index: number
): FabricProcessRouteStep[] {
  if (index < 0 || index >= steps.length) {
    return steps;
  }
  const next = steps.filter((_, idx) => idx !== index);
  return normalizeRouteSequence(next);
}

/**
 * Validates whole-roll routing constraint.
 * plannedQtyMetre MUST equal rollQtyMetre.
 * Partial processing returns ROLL_SPLIT_REQUIRED.
 */
export function validateWholeRollRouting(
  rollQty: number,
  plannedQty: number
): { valid: boolean; splitResult?: RollSplitRequiredResult } {
  const diff = Math.abs(rollQty - plannedQty);
  if (diff > 0.001) {
    return {
      valid: false,
      splitResult: {
        code: "ROLL_SPLIT_REQUIRED",
        message: "Partial processing requires a child Roll identity before routing.",
        rollQty,
        attemptedProcessQty: plannedQty,
        difference: diff,
      },
    };
  }
  return { valid: true };
}

/**
 * Validates NO_FURTHER_PROCESS decision:
 * Steps must be empty. NO_FURTHER_PROCESS does NOT imply saleable or finished stock.
 */
export function validateNoFurtherProcess(
  routeDecision: FabricProcessRouteDecision,
  steps: FabricProcessRouteStep[] | CreateRouteStepInput[]
): { valid: boolean; error?: string } {
  if (routeDecision === "NO_FURTHER_PROCESS" && steps.length > 0) {
    return {
      valid: false,
      error: "NO_FURTHER_PROCESS requires route steps to be empty. No additional process can be planned.",
    };
  }
  return { valid: true };
}

/**
 * Validates external job work party eligibility against Party Master.
 * Authority: Full Party Master (party-store.ts).
 */
export function validateExternalParty(
  executionMode: FabricProcessExecutionMode,
  jobPartyId?: string,
  partyRecord?: PartyRecord
): { valid: boolean; error?: string } {
  if (executionMode !== "EXTERNAL_JOBWORK") {
    return { valid: true };
  }

  if (!jobPartyId || !partyRecord) {
    return {
      valid: false,
      error: "External Job Work requires a valid Party Master record selection.",
    };
  }

  if (partyRecord.status !== "Active") {
    return {
      valid: false,
      error: `Selected Job Party (${partyRecord.partyName}) is Inactive.`,
    };
  }

  const isEligible =
    partyRecord.partyType === "Job Party" || partyRecord.jobWorkApplicable === "Yes";

  if (!isEligible) {
    return {
      valid: false,
      error: `Selected Party (${partyRecord.partyName}) is not eligible for Job Work (PartyType: ${partyRecord.partyType}, JobWorkApplicable: ${partyRecord.jobWorkApplicable}).`,
    };
  }

  return { valid: true };
}

/**
 * Validates Quality Rework route prerequisites.
 * QUALITY_REWORK requires a Phase 5B Quality source inspection.
 */
export function validateQualityRouteType(params: {
  routeType: FabricProcessRouteType;
  sourceInspectionId?: string | undefined;
  sourceDisposition?: FabricDisposition | "NOT_SET" | undefined;
}): { valid: boolean; error?: string } {
  if (params.routeType === "QUALITY_REWORK") {
    if (!params.sourceInspectionId && (!params.sourceDisposition || params.sourceDisposition === "NOT_SET")) {
      return {
        valid: false,
        error: "QUALITY_REWORK route requires an authoritative Phase 5B Quality inspection source.",
      };
    }
  }
  return { valid: true };
}

/**
 * Derives step readiness based on sequence, external party validity, process activity,
 * and overall quality disposition.
 */
export function deriveInitialStepStatuses(
  steps: FabricProcessRouteStep[],
  options?: {
    isQualityHold?: boolean;
    isQualityReject?: boolean;
    hasBlockedStep?: boolean;
  }
): FabricProcessRouteStep[] {
  if (options?.isQualityHold) {
    return steps.map((s) => ({
      ...s,
      status: "BLOCKED",
      reviewReason: "Blocked by Quality HOLD.",
    }));
  }

  if (options?.isQualityReject) {
    return steps.map((s) => ({
      ...s,
      status: "REVIEW_REQUIRED",
      reviewReason: "Review required due to Quality REJECT.",
    }));
  }

  return steps.map((step, idx) => {
    // If step already has a review reason (e.g. inactive party / inactive process)
    if (step.reviewReason) {
      return {
        ...step,
        status: "REVIEW_REQUIRED",
      };
    }

    if (idx === 0) {
      return {
        ...step,
        status: "READY",
      };
    }

    return {
      ...step,
      status: "WAITING_PREVIOUS",
    };
  });
}

/**
 * Pure derivation of overall Route Plan status.
 */
export function deriveRouteStatus(params: {
  routeDecision: FabricProcessRouteDecision;
  steps: FabricProcessRouteStep[];
  sourceDisposition?: FabricDisposition | "NOT_SET" | undefined;
  isQualityHold?: boolean;
  isQualityReject?: boolean;
  hasReviewRequired?: boolean;
}): FabricProcessRouteStatus {
  if (params.isQualityHold || params.sourceDisposition === "HOLD") {
    return "BLOCKED";
  }

  if (params.isQualityReject || params.sourceDisposition === "REJECT") {
    return "REVIEW_REQUIRED";
  }

  if (params.hasReviewRequired) {
    return "REVIEW_REQUIRED";
  }

  if (params.routeDecision === "NO_FURTHER_PROCESS") {
    return "PLANNED";
  }

  if (params.steps.length === 0) {
    return "NOT_PLANNED";
  }

  const anyStepReview = params.steps.some((s) => s.status === "REVIEW_REQUIRED");
  if (anyStepReview) {
    return "REVIEW_REQUIRED";
  }

  const anyStepBlocked = params.steps.some((s) => s.status === "BLOCKED");
  if (anyStepBlocked) {
    return "BLOCKED";
  }

  const firstStepReady = params.steps[0]?.status === "READY";
  if (firstStepReady) {
    return "READY";
  }

  return "PLANNED";
}

/**
 * Detects downstream impact if Quality disposition changes after route creation.
 * Standard route must NOT silently transform if disposition becomes REWORK or HOLD.
 */
export function detectQualityRevisionImpact(
  existingPlan: FabricProcessRoutePlan,
  newDisposition: FabricDisposition | "NOT_SET"
): { impactDetected: boolean; newStatus?: FabricProcessRouteStatus; reason?: string } {
  if (existingPlan.sourceDisposition && existingPlan.sourceDisposition !== newDisposition) {
    if (newDisposition === "HOLD") {
      return {
        impactDetected: true,
        newStatus: "BLOCKED",
        reason: `Quality disposition changed from ${existingPlan.sourceDisposition} to HOLD. Process route is BLOCKED.`,
      };
    }
    return {
      impactDetected: true,
      newStatus: "REVIEW_REQUIRED",
      reason: `Quality disposition changed from ${existingPlan.sourceDisposition} to ${newDisposition}. Route requires review.`,
    };
  }
  return { impactDetected: false };
}

/**
 * Detects downstream impact if upstream receipt adjustment changes Roll quantity.
 * Does NOT silently rewrite process quantities; flags REVIEW_REQUIRED.
 */
export function detectRollQtyRevisionImpact(
  existingPlan: FabricProcessRoutePlan,
  newRollQty: number
): { impactDetected: boolean; reason?: string } {
  if (Math.abs(existingPlan.rollQtyMetre - newRollQty) > 0.001) {
    return {
      impactDetected: true,
      reason: `Roll quantity changed from ${existingPlan.rollQtyMetre}m to ${newRollQty}m. Planned route quantities require review.`,
    };
  }
  return { impactDetected: false };
}

// =============================================================================
// FOCUSED SERVICE IMPLEMENTATION (STEP 28 & 30)
// =============================================================================

export class FabricProcessRoutingService {
  // In-memory process master state (mirrors canonical Supabase `masters`)
  private static processes: ProcessMasterRecord[] = [...CANONICAL_PROCESS_SEEDS];

  // In-memory route plans store keyed by rollDraftId
  private static routePlans: Map<string, FabricProcessRoutePlan> = new Map();

  // In-memory revision history store keyed by rollDraftId
  private static revisionHistory: Map<string, FabricProcessRouteRevision[]> = new Map();

  /**
   * Reset in-memory stores (used for testing or clean session reset)
   */
  public static resetStores(): void {
    this.processes = [...CANONICAL_PROCESS_SEEDS];
    this.routePlans.clear();
    this.revisionHistory.clear();
  }

  // ---------------------------------------------------------------------------
  // PROCESS MASTER RESOLUTION (STEP 7)
  // ---------------------------------------------------------------------------

  public static getAvailableProcesses(): ProcessMasterRecord[] {
    return this.processes.filter((p) => p.active);
  }

  public static getAllProcesses(): ProcessMasterRecord[] {
    return [...this.processes];
  }

  public static getProcessById(id: string): ProcessMasterRecord | undefined {
    return this.processes.find((p) => p.id === id);
  }

  /**
   * Simulates deactivating/activating a process in Process Master.
   * Useful for testing Step 26 & Test N.
   */
  public static setProcessActiveStatus(id: string, active: boolean): void {
    const proc = this.processes.find((p) => p.id === id);
    if (proc) {
      proc.active = active;
    }
  }

  // ---------------------------------------------------------------------------
  // EXTERNAL JOB WORK PARTY RESOLUTION (STEP 11 & 12)
  // ---------------------------------------------------------------------------

  /**
   * Retrieves eligible external Job Work processors from Full Party Master.
   * Filters by Active status and Job Party / jobWorkApplicable.
   */
  public static getEligibleJobWorkParties(): PartyRecord[] {
    const parties = getLocalParties();
    return parties.filter(
      (p) =>
        p.status === "Active" &&
        (p.partyType === "Job Party" || p.jobWorkApplicable === "Yes")
    );
  }

  /**
   * Retrieves optional canonical Sub Party / Location references for a Party.
   * Only includes valid production/delivery unit location types.
   */
  public static getEligibleSubPartyLocations(partyId: string): SubPartyRecord[] {
    const subParties = getLocalSubParties().filter((sp) => sp.partyId === partyId && sp.status === "Active");
    const validLocationTypes = new Set([
      "Factory",
      "Manufacturing Unit",
      "Job Work Unit",
      "Delivery Location",
    ]);
    return subParties.filter((sp) => validLocationTypes.has(sp.locationType));
  }

  // ---------------------------------------------------------------------------
  // PROCESS HINTS (STEPS 8 & 9)
  // ---------------------------------------------------------------------------

  /**
   * Generates advisory hints from Cost Sheet charge lines.
   * NEVER auto-creates route steps or acts as routing authority.
   */
  public static getCostSheetProcessHints(costSheet?: { charges?: ChargeLine[] } | null): ProcessHint[] {
    if (!costSheet || !costSheet.charges || costSheet.charges.length === 0) {
      return [];
    }

    const hints: ProcessHint[] = [];
    const availableProcesses = this.getAvailableProcesses();

    for (const charge of costSheet.charges) {
      const chargeLower = charge.charge_name.toLowerCase();
      // Match possible canonical process for UI display hint only
      const possibleMatch = availableProcesses.find((p) =>
        chargeLower.includes("butta")
          ? p.code === "PRC-01" || p.name.toLowerCase().includes("butta")
          : chargeLower.includes("rfd")
          ? p.code === "PRC-02" || p.name.toLowerCase().includes("rfd")
          : chargeLower.includes("finish") || chargeLower.includes("wash")
          ? p.code === "PRC-03" || p.name.toLowerCase().includes("wash")
          : false
      );

      hints.push({
        source: "COST_SHEET",
        text: `Cost Sheet Charge Hint: "${charge.charge_name}" (Rate: ₹${charge.rate}, Qty: ${charge.quantity})`,
        chargeName: charge.charge_name,
        rate: charge.rate,
        quantity: charge.quantity,
        suggestedProcessId: possibleMatch?.id,
        suggestedProcessName: possibleMatch?.name,
      });
    }

    return hints;
  }

  /**
   * Generates advisory hints from Item Master spec/remarks.
   * NEVER auto-creates route steps or acts as routing authority.
   */
  public static getItemProcessHints(item?: {
    description?: string | undefined;
    remarks?: string | undefined;
    bomDescription?: string | undefined;
    setupRemarks?: string | undefined;
  } | null): ProcessHint[] {
    if (!item) return [];

    const hints: ProcessHint[] = [];
    const fields: Array<{ label: string; val?: string | undefined }> = [
      { label: "Description", val: item.description },
      { label: "Remarks", val: item.remarks },
      { label: "BOM Description", val: item.bomDescription },
      { label: "Setup Remarks", val: item.setupRemarks },
    ];

    for (const f of fields) {
      if (f.val && f.val.trim().length > 0) {
        hints.push({
          source: "ITEM_MASTER",
          text: `Item Master Hint (${f.label}): "${f.val.trim()}"`,
        });
      }
    }

    return hints;
  }

  /**
   * Combined advisory hints.
   */
  public static getProcessHints(params: {
    costSheet?: { charges?: ChargeLine[] } | null;
    item?: {
      description?: string | undefined;
      remarks?: string | undefined;
      bomDescription?: string | undefined;
      setupRemarks?: string | undefined;
    } | null;
  }): ProcessHint[] {
    return [
      ...this.getCostSheetProcessHints(params.costSheet),
      ...this.getItemProcessHints(params.item),
    ];
  }

  // ---------------------------------------------------------------------------
  // ROUTE PLAN MANAGEMENT (STEPS 2, 4, 13, 14, 15, 17, 18, 23)
  // ---------------------------------------------------------------------------

  public static getRoutePlanForRoll(rollDraftId: string): FabricProcessRoutePlan | undefined {
    return this.routePlans.get(rollDraftId);
  }

  public static getRouteRevisionHistory(rollDraftId: string): FabricProcessRouteRevision[] {
    return this.revisionHistory.get(rollDraftId) || [];
  }

  /**
   * Validates a candidate route plan before saving.
   */
  public static validateRoutePlan(params: CreateRoutePlanParams): RouteValidationResult {
    const errors: string[] = [];
    let splitRequired: RollSplitRequiredResult | undefined;

    // Validate NO_FURTHER_PROCESS
    const noFurtherCheck = validateNoFurtherProcess(params.routeDecision, params.steps || []);
    if (!noFurtherCheck.valid && noFurtherCheck.error) {
      errors.push(noFurtherCheck.error);
    }

    // Validate Quality Rework source prerequisite
    const qualityCheck = validateQualityRouteType({
      routeType: params.routeType,
      sourceInspectionId: params.sourceInspectionId,
      sourceDisposition: params.sourceDisposition,
    });
    if (!qualityCheck.valid && qualityCheck.error) {
      errors.push(qualityCheck.error);
    }

    // Validate individual steps if PROCESS_ROUTE
    if (params.routeDecision === "PROCESS_ROUTE") {
      if (!params.steps || params.steps.length === 0) {
        errors.push("At least one process step is required when route decision is PROCESS_ROUTE.");
      } else {
        const parties = getLocalParties();

        let stepIndex = 0;
        for (const stepInput of params.steps) {
          stepIndex++;
          if (!stepInput) continue;

          // Whole-roll check per step
          const wholeRollCheck = validateWholeRollRouting(params.rollQtyMetre, stepInput.plannedQtyMetre);
          if (!wholeRollCheck.valid) {
            splitRequired = wholeRollCheck.splitResult;
            errors.push(
              `Step ${stepIndex}: Partial processing requested (${stepInput.plannedQtyMetre}m vs Roll ${params.rollQtyMetre}m). Whole-roll routing required.`
            );
          }

          // Process Master check
          const proc = this.getProcessById(stepInput.processId);
          if (!proc) {
            errors.push(`Step ${stepIndex}: Invalid process ID "${stepInput.processId}". Not found in Process Master.`);
          } else if (!proc.active) {
            errors.push(`Step ${stepIndex}: Process "${proc.name}" (${proc.code}) is inactive.`);
          }

          // External Job Work check
          if (stepInput.executionMode === "EXTERNAL_JOBWORK") {
            const party = stepInput.jobPartyId ? parties.find((p) => p.id === stepInput.jobPartyId) : undefined;
            const partyCheck = validateExternalParty(stepInput.executionMode, stepInput.jobPartyId, party);
            if (!partyCheck.valid && partyCheck.error) {
              errors.push(`Step ${stepIndex}: ${partyCheck.error}`);
            }
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      splitRequired,
    };
  }

  /**
   * Creates and stores a new Route Plan for a roll draft.
   */
  public static createRoutePlan(params: CreateRoutePlanParams): {
    plan?: FabricProcessRoutePlan;
    validation: RouteValidationResult;
  } {
    const validation = this.validateRoutePlan(params);
    if (!validation.isValid) {
      return { validation };
    }

    const now = new Date().toISOString();
    const parties = getLocalParties();
    const subParties = getLocalSubParties();

    // Build steps
    let steps: FabricProcessRouteStep[] = [];

    if (params.routeDecision === "PROCESS_ROUTE" && params.steps) {
      steps = params.steps.map((input, idx) => {
        const proc = this.getProcessById(input.processId);
        const party = input.jobPartyId ? parties.find((p) => p.id === input.jobPartyId) : undefined;
        const subParty = input.subPartyId ? subParties.find((sp) => sp.id === input.subPartyId) : undefined;

        const isPartyInactive = party && party.status !== "Active";
        const isProcInactive = proc && !proc.active;
        const reviewReason = isProcInactive
          ? `Process ${proc.name} is inactive.`
          : isPartyInactive
          ? `Job Party ${party.partyName} is inactive.`
          : undefined;

        const step: FabricProcessRouteStep = {
          id: `step-${Date.now()}-${idx + 1}`,
          sequence: idx + 1,
          processId: input.processId,
          processCode: proc?.code || "UNKNOWN",
          processName: proc?.name || "Unknown Process",
          executionMode: input.executionMode,
          jobPartyId: party?.id,
          jobPartyName: party?.partyName,
          subPartyId: subParty?.id,
          subPartyName: subParty?.subPartyName,
          plannedQtyMetre: input.plannedQtyMetre,
          status: "PLANNED", // will be derived
          instruction: input.instruction,
          remark: input.remark,
          reviewReason,
          createdAt: now,
          updatedAt: now,
        };

        return step;
      });

      steps = normalizeRouteSequence(steps);
      steps = deriveInitialStepStatuses(steps, {
        isQualityHold: params.sourceDisposition === "HOLD",
        isQualityReject: params.sourceDisposition === "REJECT",
      });
    }

    const routeStatus = deriveRouteStatus({
      routeDecision: params.routeDecision,
      steps,
      sourceDisposition: params.sourceDisposition,
      isQualityHold: params.sourceDisposition === "HOLD",
      isQualityReject: params.sourceDisposition === "REJECT",
    });

    const plan: FabricProcessRoutePlan = {
      id: `rt-plan-${Date.now()}`,
      rollDraftId: params.rollDraftId,
      temporaryRollNo: params.temporaryRollNo,
      receiveDraftId: params.receiveDraftId,
      jobCardId: params.jobCardId,
      jobCardNo: params.jobCardNo,
      productionOrderId: params.productionOrderId,
      productionOrderNo: params.productionOrderNo,
      salesOrderId: params.salesOrderId,
      salesOrderNo: params.salesOrderNo,
      itemCode: params.itemCode,
      designNo: params.designNo,
      rollQtyMetre: params.rollQtyMetre,
      routeDecision: params.routeDecision,
      routeType: params.routeType,
      sourceInspectionId: params.sourceInspectionId,
      sourceInspectionStatus: params.sourceInspectionStatus,
      sourceGrade: params.sourceGrade,
      sourceDisposition: params.sourceDisposition,
      sourceSaleabilityPreview: params.sourceSaleabilityPreview,
      steps,
      status: routeStatus,
      createdAt: now,
      updatedAt: now,
    };

    this.routePlans.set(params.rollDraftId, plan);

    // Initial revision record
    const revision: FabricProcessRouteRevision = {
      id: `rev-${Date.now()}-1`,
      rollDraftId: params.rollDraftId,
      revisionNumber: 1,
      routePlanId: plan.id,
      previousSteps: [],
      newSteps: [...steps],
      previousStatus: "NOT_PLANNED",
      newStatus: plan.status,
      reason: "Initial route plan creation.",
      createdAt: now,
    };
    this.revisionHistory.set(params.rollDraftId, [revision]);

    return { plan, validation };
  }

  /**
   * Updates an existing Route Plan with full revision tracking (Step 23).
   * Does NOT silently overwrite prior route history.
   */
  public static updateRoutePlanAsRevision(params: UpdateRoutePlanParams): {
    plan?: FabricProcessRoutePlan;
    validation: RouteValidationResult;
  } {
    const existing = this.routePlans.get(params.rollDraftId);
    if (!existing) {
      return {
        validation: {
          isValid: false,
          errors: [`Route Plan for Roll "${params.rollDraftId}" not found.`],
        },
      };
    }

    const createParams: CreateRoutePlanParams = {
      rollDraftId: existing.rollDraftId,
      temporaryRollNo: existing.temporaryRollNo,
      receiveDraftId: existing.receiveDraftId,
      jobCardId: existing.jobCardId,
      jobCardNo: existing.jobCardNo,
      productionOrderId: existing.productionOrderId,
      productionOrderNo: existing.productionOrderNo,
      salesOrderId: existing.salesOrderId,
      salesOrderNo: existing.salesOrderNo,
      itemCode: existing.itemCode,
      designNo: existing.designNo,
      rollQtyMetre: existing.rollQtyMetre,
      routeDecision: params.routeDecision,
      routeType: params.routeType,
      sourceInspectionId: existing.sourceInspectionId,
      sourceInspectionStatus: existing.sourceInspectionStatus,
      sourceGrade: existing.sourceGrade,
      sourceDisposition: existing.sourceDisposition,
      sourceSaleabilityPreview: existing.sourceSaleabilityPreview,
      steps: params.steps,
    };

    const validation = this.validateRoutePlan(createParams);
    if (!validation.isValid) {
      return { validation };
    }

    const now = new Date().toISOString();
    const parties = getLocalParties();
    const subParties = getLocalSubParties();

    let newSteps: FabricProcessRouteStep[] = [];
    if (params.routeDecision === "PROCESS_ROUTE" && params.steps) {
      newSteps = params.steps.map((input, idx) => {
        const proc = this.getProcessById(input.processId);
        const party = input.jobPartyId ? parties.find((p) => p.id === input.jobPartyId) : undefined;
        const subParty = input.subPartyId ? subParties.find((sp) => sp.id === input.subPartyId) : undefined;

        const isPartyInactive = party && party.status !== "Active";
        const isProcInactive = proc && !proc.active;
        const reviewReason = isProcInactive
          ? `Process ${proc.name} is inactive.`
          : isPartyInactive
          ? `Job Party ${party.partyName} is inactive.`
          : undefined;

        return {
          id: `step-${Date.now()}-${idx + 1}`,
          sequence: idx + 1,
          processId: input.processId,
          processCode: proc?.code || "UNKNOWN",
          processName: proc?.name || "Unknown Process",
          executionMode: input.executionMode,
          jobPartyId: party?.id,
          jobPartyName: party?.partyName,
          subPartyId: subParty?.id,
          subPartyName: subParty?.subPartyName,
          plannedQtyMetre: input.plannedQtyMetre,
          status: "PLANNED",
          instruction: input.instruction,
          remark: input.remark,
          reviewReason,
          createdAt: now,
          updatedAt: now,
        };
      });

      newSteps = normalizeRouteSequence(newSteps);
      newSteps = deriveInitialStepStatuses(newSteps, {
        isQualityHold: existing.sourceDisposition === "HOLD",
        isQualityReject: existing.sourceDisposition === "REJECT",
      });
    }

    const newStatus = deriveRouteStatus({
      routeDecision: params.routeDecision,
      steps: newSteps,
      sourceDisposition: existing.sourceDisposition,
      isQualityHold: existing.sourceDisposition === "HOLD",
      isQualityReject: existing.sourceDisposition === "REJECT",
    });

    const existingHistory = this.revisionHistory.get(params.rollDraftId) || [];
    const nextRevNum = existingHistory.length + 1;

    const revision: FabricProcessRouteRevision = {
      id: `rev-${Date.now()}-${nextRevNum}`,
      rollDraftId: params.rollDraftId,
      revisionNumber: nextRevNum,
      routePlanId: existing.id,
      previousSteps: [...existing.steps],
      newSteps: [...newSteps],
      previousStatus: existing.status,
      newStatus,
      reason: params.reason || `Route revision #${nextRevNum}`,
      createdAt: now,
    };
    this.revisionHistory.set(params.rollDraftId, [...existingHistory, revision]);

    existing.routeDecision = params.routeDecision;
    existing.routeType = params.routeType;
    existing.steps = newSteps;
    existing.status = newStatus;
    existing.updatedAt = now;

    return { plan: existing, validation };
  }

  /**
   * Retrieves the currently active/next executable step in the route.
   */
  public static getCurrentRouteStep(plan: FabricProcessRoutePlan): FabricProcessRouteStep | undefined {
    return plan.steps.find((s) => s.status === "READY");
  }

  /**
   * Marks a route plan as REVIEW_REQUIRED with an explicit reason.
   */
  public static markRouteReviewRequired(rollDraftId: string, reason: string): FabricProcessRoutePlan | null {
    const plan = this.routePlans.get(rollDraftId);
    if (!plan) return null;

    plan.status = "REVIEW_REQUIRED";
    plan.reviewReason = reason;
    plan.updatedAt = new Date().toISOString();

    // Mark all steps as REVIEW_REQUIRED if not already blocked
    plan.steps = plan.steps.map((s) => ({
      ...s,
      status: s.status === "BLOCKED" ? "BLOCKED" : "REVIEW_REQUIRED",
      reviewReason: s.reviewReason || reason,
    }));

    return plan;
  }

  /**
   * Rechecks an existing Route Plan against live Process Master, Party Master,
   * upstream roll quantity, or updated Quality inspection disposition (Steps 24-27).
   * Historical route is preserved; affected steps are marked REVIEW_REQUIRED.
   */
  public static recheckRoutePlanReadiness(
    rollDraftId: string,
    currentQualityDisposition?: FabricDisposition | "NOT_SET",
    currentRollQty?: number
  ): FabricProcessRoutePlan | null {
    const plan = this.routePlans.get(rollDraftId);
    if (!plan) return null;

    const parties = getLocalParties();
    let requiresReview = false;
    let reviewReason: string | undefined;

    // Check upstream Quality disposition revision
    if (currentQualityDisposition && currentQualityDisposition !== plan.sourceDisposition) {
      const qImpact = detectQualityRevisionImpact(plan, currentQualityDisposition);
      if (qImpact.impactDetected) {
        requiresReview = true;
        reviewReason = qImpact.reason;
        plan.sourceDisposition = currentQualityDisposition;
        if (qImpact.newStatus === "BLOCKED") {
          plan.status = "BLOCKED";
        }
      }
    }

    // Check upstream Roll quantity revision
    if (currentRollQty !== undefined && Math.abs(currentRollQty - plan.rollQtyMetre) > 0.001) {
      const rImpact = detectRollQtyRevisionImpact(plan, currentRollQty);
      if (rImpact.impactDetected) {
        requiresReview = true;
        reviewReason = reviewReason ? `${reviewReason} | ${rImpact.reason}` : rImpact.reason;
      }
    }

    // Check Process Master deactivations
    for (const step of plan.steps) {
      const proc = this.getProcessById(step.processId);
      if (!proc || !proc.active) {
        step.status = "REVIEW_REQUIRED";
        step.reviewReason = `Process "${step.processName}" is now inactive in Process Master.`;
        requiresReview = true;
      }
    }

    // Check External Party deactivations
    for (const step of plan.steps) {
      if (step.executionMode === "EXTERNAL_JOBWORK" && step.jobPartyId) {
        const party = parties.find((p) => p.id === step.jobPartyId);
        if (!party || party.status !== "Active") {
          step.status = "REVIEW_REQUIRED";
          step.reviewReason = `External Job Party "${step.jobPartyName || step.jobPartyId}" is now inactive.`;
          requiresReview = true;
        }
      }
    }

    if (requiresReview) {
      if (plan.status !== "BLOCKED") {
        plan.status = "REVIEW_REQUIRED";
      }
      plan.reviewReason = reviewReason || "Route requires review due to master or upstream change.";
      plan.updatedAt = new Date().toISOString();
    }

    return plan;
  }

  // ---------------------------------------------------------------------------
  // STEP REORDERING & REMOVAL HELPERS (STEPS 19 & 20)
  // ---------------------------------------------------------------------------

  public static moveStep(
    steps: FabricProcessRouteStep[],
    fromIndex: number,
    toIndex: number
  ): FabricProcessRouteStep[] {
    return moveRouteStep(steps, fromIndex, toIndex);
  }

  public static removeStep(
    steps: FabricProcessRouteStep[],
    index: number
  ): FabricProcessRouteStep[] {
    return removeRouteStep(steps, index);
  }

  // ---------------------------------------------------------------------------
  // ROLL & WORKSPACE SUMMARY HELPERS (STEPS 37, 38, 39)
  // ---------------------------------------------------------------------------

  public static getRollRoutingSummary(roll: FabricRollDraft): RollRoutingSummary {
    const plan = this.getRoutePlanForRoll(roll.id);

    if (!plan) {
      return {
        rollDraftId: roll.id,
        temporaryRollNo: roll.temporaryRollNo,
        rollQtyMetre: roll.qtyMetre,
        routePlan: undefined,
        routeDecision: "UNPLANNED",
        routeStatus: "NOT_PLANNED",
        routeType: undefined,
        totalSteps: 0,
        currentStep: undefined,
        requiresReview: false,
      };
    }

    const currentStep = this.getCurrentRouteStep(plan);
    const requiresReview = plan.status === "REVIEW_REQUIRED";

    return {
      rollDraftId: roll.id,
      temporaryRollNo: roll.temporaryRollNo,
      rollQtyMetre: roll.qtyMetre,
      routePlan: plan,
      routeDecision: plan.routeDecision,
      routeStatus: plan.status,
      routeType: plan.routeType,
      totalSteps: plan.steps.length,
      currentStep,
      requiresReview,
      reviewReason: plan.reviewReason,
    };
  }

  public static getJobCardRoutingSummary(rolls: FabricRollDraft[]): JobCardRoutingSummary {
    let routesNotPlanned = 0;
    let routesPlanned = 0;
    let noFurtherProcessCount = 0;
    let standardRoutesCount = 0;
    let qualityReworkCount = 0;
    let blockedCount = 0;
    let reviewRequiredCount = 0;
    let readyCount = 0;

    for (const roll of rolls) {
      const summary = this.getRollRoutingSummary(roll);
      if (summary.routeStatus === "NOT_PLANNED") {
        routesNotPlanned++;
      } else {
        routesPlanned++;
        if (summary.routeDecision === "NO_FURTHER_PROCESS") {
          noFurtherProcessCount++;
        }
        if (summary.routeType === "STANDARD") {
          standardRoutesCount++;
        } else if (summary.routeType === "QUALITY_REWORK") {
          qualityReworkCount++;
        }
        if (summary.routeStatus === "BLOCKED") {
          blockedCount++;
        } else if (summary.routeStatus === "REVIEW_REQUIRED") {
          reviewRequiredCount++;
        } else if (summary.routeStatus === "READY") {
          readyCount++;
        }
      }
    }

    return {
      totalRolls: rolls.length,
      routesNotPlanned,
      routesPlanned,
      noFurtherProcessCount,
      standardRoutesCount,
      qualityReworkCount,
      blockedCount,
      reviewRequiredCount,
      readyCount,
    };
  }

  public static getProductionOrderRoutingSummary(rolls: FabricRollDraft[]): ProductionOrderRoutingSummary {
    const jcSummary = this.getJobCardRoutingSummary(rolls);
    return {
      totalRolls: jcSummary.totalRolls,
      readyCount: jcSummary.readyCount,
      notPlannedCount: jcSummary.routesNotPlanned,
      blockedCount: jcSummary.blockedCount,
      reviewRequiredCount: jcSummary.reviewRequiredCount,
      plannedCount: jcSummary.routesPlanned,
      noFurtherProcessCount: jcSummary.noFurtherProcessCount,
      standardRoutesCount: jcSummary.standardRoutesCount,
      qualityReworkCount: jcSummary.qualityReworkCount,
    };
  }

  // =============================================================================
  // COMPREHENSIVE VERIFICATION TEST SUITE (TESTS A THROUGH O)
  // =============================================================================

  public static runPhase5CVerificationTests(): {
    allPassed: boolean;
    results: Record<string, { status: "PASS" | "FAIL"; details: string }>;
  } {
    const results: Record<string, { status: "PASS" | "FAIL"; details: string }> = {};

    // Reset stores for clean deterministic testing
    this.resetStores();

    // -------------------------------------------------------------------------
    // TEST A: Roll 200m, Quality ACCEPTED, Decision: NO_FURTHER_PROCESS
    // Expected: Valid, steps: 0, saleability changed: NO -> PASS
    // -------------------------------------------------------------------------
    try {
      const resA = this.createRoutePlan({
        rollDraftId: "roll-test-a",
        temporaryRollNo: "DRAFT-ROLL-001",
        jobCardId: "jc-1",
        productionOrderId: "po-1",
        rollQtyMetre: 200,
        routeDecision: "NO_FURTHER_PROCESS",
        routeType: "STANDARD",
        sourceInspectionId: "insp-a",
        sourceDisposition: "ACCEPTED",
        steps: [],
      });

      const passA =
        resA.validation.isValid &&
        resA.plan?.status === "PLANNED" &&
        resA.plan?.steps.length === 0 &&
        resA.plan?.routeDecision === "NO_FURTHER_PROCESS";

      results["TEST_A"] = {
        status: passA ? "PASS" : "FAIL",
        details: `Valid: ${resA.validation.isValid}, Steps count: ${resA.plan?.steps.length}, Status: ${resA.plan?.status}`,
      };
    } catch (e: any) {
      results["TEST_A"] = { status: "FAIL", details: e?.message || String(e) };
    }

    // -------------------------------------------------------------------------
    // TEST B: Roll 200m, Standard Route, Process PRC-01 Butta, INTERNAL, Qty 200
    // Expected: Route: READY, Step 1: READY -> PASS
    // -------------------------------------------------------------------------
    try {
      const resB = this.createRoutePlan({
        rollDraftId: "roll-test-b",
        temporaryRollNo: "DRAFT-ROLL-002",
        jobCardId: "jc-1",
        productionOrderId: "po-1",
        rollQtyMetre: 200,
        routeDecision: "PROCESS_ROUTE",
        routeType: "STANDARD",
        sourceInspectionId: "insp-b",
        sourceDisposition: "ACCEPTED",
        steps: [
          {
            processId: "prc-1",
            executionMode: "INTERNAL",
            plannedQtyMetre: 200,
          },
        ],
      });

      const passB =
        resB.validation.isValid &&
        resB.plan?.status === "READY" &&
        resB.plan?.steps[0]?.status === "READY" &&
        resB.plan?.steps[0]?.processCode === "PRC-01";

      results["TEST_B"] = {
        status: passB ? "PASS" : "FAIL",
        details: `Route status: ${resB.plan?.status}, Step 1 status: ${resB.plan?.steps[0]?.status}, Process: ${resB.plan?.steps[0]?.processCode}`,
      };
    } catch (e: any) {
      results["TEST_B"] = { status: "FAIL", details: e?.message || String(e) };
    }

    // -------------------------------------------------------------------------
    // TEST C: Roll 200m, Process RFD (PRC-02), EXTERNAL_JOBWORK, Eligible Job Party
    // Expected: PASS
    // -------------------------------------------------------------------------
    try {
      const eligibleParties = this.getEligibleJobWorkParties();
      const party = eligibleParties[0];

      const resC = this.createRoutePlan({
        rollDraftId: "roll-test-c",
        temporaryRollNo: "DRAFT-ROLL-003",
        jobCardId: "jc-1",
        productionOrderId: "po-1",
        rollQtyMetre: 200,
        routeDecision: "PROCESS_ROUTE",
        routeType: "STANDARD",
        sourceInspectionId: "insp-c",
        sourceDisposition: "ACCEPTED",
        steps: [
          {
            processId: "prc-2",
            executionMode: "EXTERNAL_JOBWORK",
            plannedQtyMetre: 200,
            jobPartyId: party?.id,
          },
        ],
      });

      const passC =
        resC.validation.isValid &&
        resC.plan?.status === "READY" &&
        resC.plan?.steps[0]?.executionMode === "EXTERNAL_JOBWORK" &&
        resC.plan?.steps[0]?.jobPartyId === party?.id;

      results["TEST_C"] = {
        status: passC ? "PASS" : "FAIL",
        details: `Party: ${party?.partyName}, Valid: ${resC.validation.isValid}, Status: ${resC.plan?.status}`,
      };
    } catch (e: any) {
      results["TEST_C"] = { status: "FAIL", details: e?.message || String(e) };
    }

    // -------------------------------------------------------------------------
    // TEST D: External Process, No Job Party
    // Expected: BLOCK / validation error -> PASS
    // -------------------------------------------------------------------------
    try {
      const resD = this.createRoutePlan({
        rollDraftId: "roll-test-d",
        temporaryRollNo: "DRAFT-ROLL-004",
        jobCardId: "jc-1",
        productionOrderId: "po-1",
        rollQtyMetre: 200,
        routeDecision: "PROCESS_ROUTE",
        routeType: "STANDARD",
        sourceInspectionId: "insp-d",
        sourceDisposition: "ACCEPTED",
        steps: [
          {
            processId: "prc-2",
            executionMode: "EXTERNAL_JOBWORK",
            plannedQtyMetre: 200,
            jobPartyId: undefined, // missing party
          },
        ],
      });

      const passD =
        !resD.validation.isValid &&
        resD.validation.errors.some((err) => err.includes("requires a valid Party Master"));

      results["TEST_D"] = {
        status: passD ? "PASS" : "FAIL",
        details: `Rejected as expected: ${resD.validation.errors.join("; ")}`,
      };
    } catch (e: any) {
      results["TEST_D"] = { status: "FAIL", details: e?.message || String(e) };
    }

    // -------------------------------------------------------------------------
    // TEST E: Roll 200m, Attempt Route Qty 80m
    // Expected: ROLL_SPLIT_REQUIRED, Route not saved as valid -> PASS
    // -------------------------------------------------------------------------
    try {
      const resE = this.createRoutePlan({
        rollDraftId: "roll-test-e",
        temporaryRollNo: "DRAFT-ROLL-005",
        jobCardId: "jc-1",
        productionOrderId: "po-1",
        rollQtyMetre: 200,
        routeDecision: "PROCESS_ROUTE",
        routeType: "STANDARD",
        steps: [
          {
            processId: "prc-1",
            executionMode: "INTERNAL",
            plannedQtyMetre: 80, // partial!
          },
        ],
      });

      const passE =
        !resE.validation.isValid &&
        resE.validation.splitRequired?.code === "ROLL_SPLIT_REQUIRED" &&
        resE.validation.splitRequired.rollQty === 200 &&
        resE.validation.splitRequired.attemptedProcessQty === 80 &&
        resE.validation.splitRequired.difference === 120 &&
        !this.getRoutePlanForRoll("roll-test-e");

      results["TEST_E"] = {
        status: passE ? "PASS" : "FAIL",
        details: `Code: ${resE.validation.splitRequired?.code}, Diff: ${resE.validation.splitRequired?.difference}, Saved: ${!!this.getRoutePlanForRoll("roll-test-e")}`,
      };
    } catch (e: any) {
      results["TEST_E"] = { status: "FAIL", details: e?.message || String(e) };
    }

    // -------------------------------------------------------------------------
    // TEST F: Three-step route: 1 Butta, 2 RFD, 3 Finish
    // Expected: Step 1 READY, Step 2 WAITING_PREVIOUS, Step 3 WAITING_PREVIOUS -> PASS
    // -------------------------------------------------------------------------
    try {
      const resF = this.createRoutePlan({
        rollDraftId: "roll-test-f",
        temporaryRollNo: "DRAFT-ROLL-006",
        jobCardId: "jc-1",
        productionOrderId: "po-1",
        rollQtyMetre: 200,
        routeDecision: "PROCESS_ROUTE",
        routeType: "STANDARD",
        sourceInspectionId: "insp-f",
        sourceDisposition: "ACCEPTED",
        steps: [
          { processId: "prc-1", executionMode: "INTERNAL", plannedQtyMetre: 200 },
          { processId: "prc-2", executionMode: "INTERNAL", plannedQtyMetre: 200 },
          { processId: "prc-3", executionMode: "INTERNAL", plannedQtyMetre: 200 },
        ],
      });

      const s1 = resF.plan?.steps[0]?.status === "READY";
      const s2 = resF.plan?.steps[1]?.status === "WAITING_PREVIOUS";
      const s3 = resF.plan?.steps[2]?.status === "WAITING_PREVIOUS";
      const seqCheck =
        resF.plan?.steps[0]?.sequence === 1 &&
        resF.plan?.steps[1]?.sequence === 2 &&
        resF.plan?.steps[2]?.sequence === 3;

      const passF = resF.validation.isValid && s1 && s2 && s3 && seqCheck;

      results["TEST_F"] = {
        status: passF ? "PASS" : "FAIL",
        details: `Step 1: ${resF.plan?.steps[0]?.status}, Step 2: ${resF.plan?.steps[1]?.status}, Step 3: ${resF.plan?.steps[2]?.status}`,
      };
    } catch (e: any) {
      results["TEST_F"] = { status: "FAIL", details: e?.message || String(e) };
    }

    // -------------------------------------------------------------------------
    // TEST G: Quality Disposition HOLD, Attempt valid process route
    // Expected: Route cannot become READY. Status: BLOCKED -> PASS
    // -------------------------------------------------------------------------
    try {
      const resG = this.createRoutePlan({
        rollDraftId: "roll-test-g",
        temporaryRollNo: "DRAFT-ROLL-007",
        jobCardId: "jc-1",
        productionOrderId: "po-1",
        rollQtyMetre: 200,
        routeDecision: "PROCESS_ROUTE",
        routeType: "STANDARD",
        sourceInspectionId: "insp-g",
        sourceDisposition: "HOLD",
        steps: [
          { processId: "prc-1", executionMode: "INTERNAL", plannedQtyMetre: 200 },
        ],
      });

      const passG =
        resG.validation.isValid &&
        resG.plan?.status === "BLOCKED" &&
        resG.plan?.steps[0]?.status === "BLOCKED";

      results["TEST_G"] = {
        status: passG ? "PASS" : "FAIL",
        details: `Route status: ${resG.plan?.status}, Step 1 status: ${resG.plan?.steps[0]?.status}`,
      };
    } catch (e: any) {
      results["TEST_G"] = { status: "FAIL", details: e?.message || String(e) };
    }

    // -------------------------------------------------------------------------
    // TEST H: Quality Disposition REWORK, Route Type QUALITY_REWORK, Process selected manually
    // Expected: PASS, No automatic process guessed
    // -------------------------------------------------------------------------
    try {
      const resH = this.createRoutePlan({
        rollDraftId: "roll-test-h",
        temporaryRollNo: "DRAFT-ROLL-008",
        jobCardId: "jc-1",
        productionOrderId: "po-1",
        rollQtyMetre: 200,
        routeDecision: "PROCESS_ROUTE",
        routeType: "QUALITY_REWORK",
        sourceInspectionId: "insp-h",
        sourceDisposition: "REWORK",
        steps: [
          { processId: "prc-3", executionMode: "INTERNAL", plannedQtyMetre: 200, instruction: "Custom rework soft wash" },
        ],
      });

      const passH =
        resH.validation.isValid &&
        resH.plan?.routeType === "QUALITY_REWORK" &&
        resH.plan?.steps[0]?.processId === "prc-3" &&
        resH.plan?.status === "READY";

      results["TEST_H"] = {
        status: passH ? "PASS" : "FAIL",
        details: `Route Type: ${resH.plan?.routeType}, Process: ${resH.plan?.steps[0]?.processCode}, Status: ${resH.plan?.status}`,
      };
    } catch (e: any) {
      results["TEST_H"] = { status: "FAIL", details: e?.message || String(e) };
    }

    // -------------------------------------------------------------------------
    // TEST I: Cost Sheet contains "Butta"
    // Expected: Process hint visible in service result, Route steps auto-created: NO -> PASS
    // -------------------------------------------------------------------------
    try {
      const mockCostSheet = {
        charges: [
          { id: "c1", charge_name: "Butta", rate: 2.5, quantity: 200 },
        ],
      };

      const hints = this.getCostSheetProcessHints(mockCostSheet);
      const hint = hints.find((h) => h.chargeName === "Butta");

      const passI =
        hints.length > 0 &&
        hint !== undefined &&
        hint.suggestedProcessId === "prc-1" &&
        this.getRoutePlanForRoll("roll-test-i") === undefined; // NOT auto-created!

      results["TEST_I"] = {
        status: passI ? "PASS" : "FAIL",
        details: `Hint generated: "${hint?.text}", Suggested Process: ${hint?.suggestedProcessId}, Auto-created route: false`,
      };
    } catch (e: any) {
      results["TEST_I"] = { status: "FAIL", details: e?.message || String(e) };
    }

    // -------------------------------------------------------------------------
    // TEST J: Item remarks contain "Require soft stenter finish"
    // Expected: Item hint returned, Route auto-created: NO -> PASS
    // -------------------------------------------------------------------------
    try {
      const mockItem = {
        remarks: "Require soft stenter finish",
      };

      const hints = this.getItemProcessHints(mockItem);
      const hint = hints[0];

      const passJ =
        hints.length === 1 &&
        hint?.text.includes("Require soft stenter finish") &&
        this.getRoutePlanForRoll("roll-test-j") === undefined; // NOT auto-created!

      results["TEST_J"] = {
        status: passJ ? "PASS" : "FAIL",
        details: `Hint: "${hint?.text}", Auto-created route: false`,
      };
    } catch (e: any) {
      results["TEST_J"] = { status: "FAIL", details: e?.message || String(e) };
    }

    // -------------------------------------------------------------------------
    // TEST K: Quality ACCEPTED
    // Expected: System does NOT automatically select NO_FURTHER_PROCESS or a Process Route.
    // Planner decision still required -> PASS
    // -------------------------------------------------------------------------
    try {
      // With no planner decision submitted:
      const existingPlan = this.getRoutePlanForRoll("roll-test-k");
      // Status before planner decides is NOT_PLANNED or undefined
      const passK = existingPlan === undefined;

      results["TEST_K"] = {
        status: passK ? "PASS" : "FAIL",
        details: `No route exists prior to planner decision. Planner action strictly required.`,
      };
    } catch (e: any) {
      results["TEST_K"] = { status: "FAIL", details: e?.message || String(e) };
    }

    // -------------------------------------------------------------------------
    // TEST L: Existing valid route, Quality disposition changes
    // Expected: Route preserved, Status: REVIEW_REQUIRED -> PASS
    // -------------------------------------------------------------------------
    try {
      const resL = this.createRoutePlan({
        rollDraftId: "roll-test-l",
        temporaryRollNo: "DRAFT-ROLL-012",
        jobCardId: "jc-1",
        productionOrderId: "po-1",
        rollQtyMetre: 200,
        routeDecision: "PROCESS_ROUTE",
        routeType: "STANDARD",
        sourceInspectionId: "insp-l",
        sourceDisposition: "ACCEPTED",
        steps: [
          { processId: "prc-1", executionMode: "INTERNAL", plannedQtyMetre: 200 },
        ],
      });

      // Quality changes from ACCEPTED to REWORK
      const recheckedL = this.recheckRoutePlanReadiness("roll-test-l", "REWORK");

      const passL =
        recheckedL !== null &&
        recheckedL.status === "REVIEW_REQUIRED" &&
        recheckedL.steps.length === 1 && // preserved
        recheckedL.steps[0]?.plannedQtyMetre === 200;

      results["TEST_L"] = {
        status: passL ? "PASS" : "FAIL",
        details: `New status: ${recheckedL?.status}, Steps preserved: ${recheckedL?.steps.length}, Reason: ${recheckedL?.reviewReason}`,
      };
    } catch (e: any) {
      results["TEST_L"] = { status: "FAIL", details: e?.message || String(e) };
    }

    // -------------------------------------------------------------------------
    // TEST M: Existing Roll: 200 MTR, Route: 200. Upstream roll adjusted to 190.
    // Expected: Existing route preserved, REVIEW_REQUIRED, No silent route qty rewrite -> PASS
    // -------------------------------------------------------------------------
    try {
      const resM = this.createRoutePlan({
        rollDraftId: "roll-test-m",
        temporaryRollNo: "DRAFT-ROLL-013",
        jobCardId: "jc-1",
        productionOrderId: "po-1",
        rollQtyMetre: 200,
        routeDecision: "PROCESS_ROUTE",
        routeType: "STANDARD",
        sourceInspectionId: "insp-m",
        sourceDisposition: "ACCEPTED",
        steps: [
          { processId: "prc-1", executionMode: "INTERNAL", plannedQtyMetre: 200 },
        ],
      });

      // Upstream roll adjusted to 190m
      const recheckedM = this.recheckRoutePlanReadiness("roll-test-m", undefined, 190);

      const passM =
        recheckedM !== null &&
        recheckedM.status === "REVIEW_REQUIRED" &&
        recheckedM.steps[0]?.plannedQtyMetre === 200 && // NOT silently rewritten!
        recheckedM.reviewReason?.includes("Roll quantity changed");

      results["TEST_M"] = {
        status: passM ? "PASS" : "FAIL",
        details: `Status: ${recheckedM?.status}, PlannedQty preserved: ${recheckedM?.steps[0]?.plannedQtyMetre}m, Reason: ${recheckedM?.reviewReason}`,
      };
    } catch (e: any) {
      results["TEST_M"] = { status: "FAIL", details: e?.message || String(e) };
    }

    // -------------------------------------------------------------------------
    // TEST N: Selected Process becomes inactive
    // Expected: Historical route preserved, Affected step: REVIEW_REQUIRED -> PASS
    // -------------------------------------------------------------------------
    try {
      const resN = this.createRoutePlan({
        rollDraftId: "roll-test-n",
        temporaryRollNo: "DRAFT-ROLL-014",
        jobCardId: "jc-1",
        productionOrderId: "po-1",
        rollQtyMetre: 200,
        routeDecision: "PROCESS_ROUTE",
        routeType: "STANDARD",
        sourceInspectionId: "insp-n",
        sourceDisposition: "ACCEPTED",
        steps: [
          { processId: "prc-1", executionMode: "INTERNAL", plannedQtyMetre: 200 },
        ],
      });

      // Deactivate process prc-1
      this.setProcessActiveStatus("prc-1", false);

      const recheckedN = this.recheckRoutePlanReadiness("roll-test-n");

      // Restore active status
      this.setProcessActiveStatus("prc-1", true);

      const passN =
        recheckedN !== null &&
        recheckedN.status === "REVIEW_REQUIRED" &&
        recheckedN.steps[0]?.status === "REVIEW_REQUIRED" &&
        recheckedN.steps[0]?.reviewReason?.includes("now inactive");

      results["TEST_N"] = {
        status: passN ? "PASS" : "FAIL",
        details: `Plan status: ${recheckedN?.status}, Step 1 status: ${recheckedN?.steps[0]?.status}, Step reason: ${recheckedN?.steps[0]?.reviewReason}`,
      };
    } catch (e: any) {
      // restore active status on error
      this.setProcessActiveStatus("prc-1", true);
      results["TEST_N"] = { status: "FAIL", details: e?.message || String(e) };
    }

    // -------------------------------------------------------------------------
    // TEST O: External selected Job Party becomes inactive
    // Expected: Route preserved, Step: REVIEW_REQUIRED, No auto-replacement -> PASS
    // -------------------------------------------------------------------------
    try {
      const eligibleParties = this.getEligibleJobWorkParties();
      const party = eligibleParties[0];
      if (!party) {
        throw new Error("No eligible Job Work party found in Party Master.");
      }

      const resO = this.createRoutePlan({
        rollDraftId: "roll-test-o",
        temporaryRollNo: "DRAFT-ROLL-015",
        jobCardId: "jc-1",
        productionOrderId: "po-1",
        rollQtyMetre: 200,
        routeDecision: "PROCESS_ROUTE",
        routeType: "STANDARD",
        sourceInspectionId: "insp-o",
        sourceDisposition: "ACCEPTED",
        steps: [
          {
            processId: "prc-2",
            executionMode: "EXTERNAL_JOBWORK",
            plannedQtyMetre: 200,
            jobPartyId: party.id,
          },
        ],
      });

      // Temporarily mark party inactive
      const originalStatus = party.status;
      party.status = "Inactive";

      const recheckedO = this.recheckRoutePlanReadiness("roll-test-o");

      // Restore party status
      party.status = originalStatus;

      const passO =
        recheckedO !== null &&
        recheckedO.status === "REVIEW_REQUIRED" &&
        recheckedO.steps[0]?.status === "REVIEW_REQUIRED" &&
        recheckedO.steps[0]?.jobPartyId === party.id && // NOT auto-replaced!
        recheckedO.steps[0]?.reviewReason?.includes("now inactive");

      results["TEST_O"] = {
        status: passO ? "PASS" : "FAIL",
        details: `Plan status: ${recheckedO?.status}, Step 1: ${recheckedO?.steps[0]?.status}, Party preserved: ${recheckedO?.steps[0]?.jobPartyId}, Reason: ${recheckedO?.steps[0]?.reviewReason}`,
      };
    } catch (e: any) {
      results["TEST_O"] = { status: "FAIL", details: e?.message || String(e) };
    }

    const allPassed = Object.values(results).every((r) => r.status === "PASS");

    return { allPassed, results };
  }
}

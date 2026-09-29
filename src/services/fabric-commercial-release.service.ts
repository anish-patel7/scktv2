/**
 * =============================================================================
 * SCKT PRODUCTION FOUNDATION — PHASE 5H STEP 1
 * FINISHED FABRIC / COMMERCIAL RELEASE DOMAIN SERVICE
 * =============================================================================
 * Pure business logic and frontend contract for evaluating commercial release
 * readiness and simulating commercial release for active physical fabric rolls.
 *
 * CRITICAL GOVERNANCE PRINCIPLES:
 * 1. Focused service only — does NOT bloat production-planning.service.ts.
 * 2. Active Physical Identity Authority: Commercial release applies ONLY to the
 *    current ACTIVE physical roll identity (determined via FabricRollGenealogyService).
 *    A superseded parent roll after a split CANNOT be commercially released.
 * 3. Separation of Concerns:
 *    - QUALITY ACCEPTED != COMMERCIALLY RELEASED.
 *    - COMMERCIALLY RELEASED SIMULATION != FINISHED STOCK POSTED.
 * 4. No Physical Identity Mutation:
 *    Physical roll identity remains unchanged (R001-C01 remains R001-C01,
 *    never renamed to FIN-R001-C01 or FG-R001-C01).
 * 5. Route Completion & Quality Prerequisites:
 *    Requires completed process route (or valid NO_FURTHER_PROCESS decision)
 *    AND current valid 100% full inspection with ACCEPTED disposition.
 * 6. Grade is NOT Sole Authority:
 *    - Grade A does NOT override HOLD.
 *    - Grade B + ACCEPTED can be READY_FOR_REVIEW.
 *    - UNASSIGNED Grade + ACCEPTED results in REVIEW_REQUIRED (policy not configured).
 * 7. Commercial Hold != Quality Hold:
 *    KEEP_ON_HOLD is an explicit commercial decision that preserves Quality findings.
 * 8. Finished Fabric Candidate is a derived concept only (NO inventory mutation,
 *    NO finished stock, NO dispatch ready, NO valuation, ZERO backend changes).
 */

import {
  type FabricGrade,
  type FabricDisposition,
  type FabricRollDraft,
} from "./production-planning.service";
import {
  FabricRollGenealogyService,
  type FabricRollGenealogyNode,
} from "./fabric-roll-genealogy.service";
import {
  FabricProcessRoutingService,
  type FabricProcessRoutePlan,
} from "./fabric-process-routing.service";
import {
  FabricPostProcessQualityService,
  type FabricPostProcessInspection,
  type PostProcessQualitySummary,
  type PostProcessInspectionRecordStatus,
} from "./fabric-post-process-quality.service";
import { FabricProcessReceiveService } from "./fabric-process-receive.service";

// =============================================================================
// STEP 4, 5, 6, 26, 32 — CONTRACTS & TYPES
// =============================================================================

export type CommercialReleaseReadiness =
  | "NOT_READY"
  | "READY_FOR_REVIEW"
  | "REVIEW_REQUIRED"
  | "BLOCKED";

export type CommercialReleaseStatus =
  | "DRAFT"
  | "RELEASED_SIMULATION"
  | "REVIEW_REQUIRED"
  | "REVOKED_SIMULATION";

export type CommercialReleaseDecision =
  | "RELEASE"
  | "KEEP_ON_HOLD";

export type FinishedFabricCandidateStatus =
  | "NOT_CREATED"
  | "CANDIDATE";

export type CommercialReleaseBlockerReason =
  | "ROLL_NOT_ACTIVE_OR_LEAF"
  | "ROLL_NOT_FOUND"
  | "PROCESS_ROUTE_INCOMPLETE"
  | "PROCESS_ROUTE_REVIEW_REQUIRED"
  | "NO_CURRENT_QUALITY"
  | "QUALITY_INSPECTION_INCOMPLETE"
  | "QUALITY_REVIEW_REQUIRED"
  | "QUALITY_HOLD"
  | "QUALITY_REWORK"
  | "QUALITY_PROCESS_REQUIRED"
  | "QUALITY_REJECT"
  | "GRADE_POLICY_NOT_CONFIGURED"
  | "QUALITY_SOURCE_STALE"
  | "ROLL_QTY_CHANGED"
  | "GENEALOGY_CHANGED"
  | "RELEASE_SOURCE_QUALITY_CHANGED"
  | "RELEASE_SOURCE_ROUTE_CHANGED"
  | "ROLL_SUPERSEDED_AFTER_RELEASE"
  | "ROLL_QTY_CHANGED_AFTER_RELEASE"
  | "QUALITY_NO_LONGER_ACCEPTED"
  | "CURRENT_QUALITY_REVIEW_REQUIRED";

export interface FinishedFabricCandidate {
  id: string;
  rollIdentity: string;
  rollGenealogyNodeId: string;
  qtyMetre: number;
  grade: FabricGrade;
  disposition: FabricDisposition | "NOT_SET";
  qualityInspectionId: string;
  routePlanId?: string | undefined;
  releaseSimulationId: string;
  commercialStatus: "COMMERCIAL_RELEASE_SIMULATION";
  candidateTimestamp: string;
  isPhysicalInventory: false;
  isDispatchReady: false;
}

export interface FabricCommercialReleaseSimulation {
  id: string;

  // Identity & Genealogy Context
  rollGenealogyNodeId: string;
  rollIdentity: string;
  rootRollId: string;
  rootRollIdentity: string;
  parentRollId?: string | undefined;
  parentRollIdentity?: string | undefined;
  generation: number;

  // Process Route Context Snapshot
  routePlanId?: string | undefined;
  routeRevision?: number | undefined;
  routeCompletePreview: boolean;
  isNoFurtherProcess: boolean;

  // Quality Inspection Context Snapshot
  qualityInspectionId: string;
  qualityInspectionPurpose: string;
  qualityRevision?: number | undefined;
  grade: FabricGrade;
  disposition: FabricDisposition | "NOT_SET";
  qualityStatus: PostProcessInspectionRecordStatus;
  inspectedQtyMetre: number;
  rollQtyMetre: number;

  // Commercial Evaluation
  releaseReadiness: CommercialReleaseReadiness;
  decision: CommercialReleaseDecision;
  releaseReason?: string | undefined;
  holdReason?: string | undefined;
  revocationReason?: string | undefined;
  revisionReason?: string | undefined;
  staleReason?: string | undefined;

  // Derived Candidate State
  finishedFabricCandidateStatus: FinishedFabricCandidateStatus;
  candidate?: FinishedFabricCandidate | undefined;

  // Lifecycle
  status: CommercialReleaseStatus;
  authorizationPolicyNote: string;
  simulationModeNote: string;

  createdAt: string;
  updatedAt: string;
}

export interface CommercialReleaseReadinessResult {
  rollIdentity: string;
  rollGenealogyNodeId: string;
  readiness: CommercialReleaseReadiness;
  canSimulateRelease: boolean;
  blockers: CommercialReleaseBlockerReason[];
  warnings: string[];

  node?: FabricRollGenealogyNode | undefined;
  routePlan?: FabricProcessRoutePlan | undefined;
  qualitySummary?: PostProcessQualitySummary | undefined;
  isRouteCompletePreview: boolean;
  isNoFurtherProcess: boolean;
  coveragePercent: number;
  currentGrade: FabricGrade;
  currentDisposition: FabricDisposition | "NOT_SET";
}

export interface CommercialReleaseSummary {
  rollIdentity: string;
  rollGenealogyNodeId: string;
  activeRollQtyMetre: number;
  isOperationallyActive: boolean;
  isSupersededBySplit: boolean;

  currentReadiness: CommercialReleaseReadiness;
  latestReleaseSimulation?: FabricCommercialReleaseSimulation | undefined;
  latestReleaseDecision?: CommercialReleaseDecision | undefined;
  releaseStatus?: CommercialReleaseStatus | undefined;

  qualityInspectionRef?: string | undefined;
  currentGrade: FabricGrade;
  currentDisposition: FabricDisposition | "NOT_SET";
  isRouteComplete: boolean;
  finishedCandidate?: FinishedFabricCandidate | undefined;

  reviewRequired: boolean;
  blockers: CommercialReleaseBlockerReason[];
  warnings: string[];
}

export interface CreateCommercialReleaseDraftInput {
  rollIdentityOrNodeId: string;
  decision: CommercialReleaseDecision;
  reason?: string | undefined;
  operatorName?: string | undefined;
}

// =============================================================================
// STEP 58 — PURE VALIDATION & DERIVATION FUNCTIONS
// =============================================================================

/**
 * Validates whether a roll identity belongs to an active physical leaf.
 */
export function validateActiveRoll(rollIdentityOrNodeId: string): {
  isValid: boolean;
  node?: FabricRollGenealogyNode | undefined;
  error?: CommercialReleaseBlockerReason | undefined;
  message?: string | undefined;
} {
  let node = FabricRollGenealogyService.getRollNode(rollIdentityOrNodeId);
  if (!node) {
    node = FabricRollGenealogyService.getRollNodeByIdentity(rollIdentityOrNodeId);
  }

  if (!node) {
    return {
      isValid: false,
      error: "ROLL_NOT_FOUND",
      message: `Roll identity or genealogy node "${rollIdentityOrNodeId}" was not found.`,
    };
  }

  if (node.identityStatus === "SUPERSEDED_BY_SPLIT") {
    return {
      isValid: false,
      node,
      error: "ROLL_NOT_ACTIVE_OR_LEAF",
      message: `Roll "${node.rollIdentity}" has been superseded by a split and cannot be commercially released.`,
    };
  }

  const children = FabricRollGenealogyService.getChildren(node.id);
  if (children.length > 0) {
    return {
      isValid: false,
      node,
      error: "ROLL_NOT_ACTIVE_OR_LEAF",
      message: `Roll "${node.rollIdentity}" has active descendants. Commercial release applies only to active leaf rolls.`,
    };
  }

  if (node.identityStatus !== "ACTIVE") {
    return {
      isValid: false,
      node,
      error: "ROLL_NOT_ACTIVE_OR_LEAF",
      message: `Roll "${node.rollIdentity}" is not in ACTIVE operational state.`,
    };
  }

  return { isValid: true, node };
}

/**
 * Validates Process Route completion status for the roll.
 */
export function validateRouteCompletion(rollId: string): {
  isComplete: boolean;
  isNoFurtherProcess: boolean;
  routePlan?: FabricProcessRoutePlan | undefined;
  blocker?: CommercialReleaseBlockerReason | undefined;
  message?: string | undefined;
} {
  const plan = FabricProcessRoutingService.getRoutePlanForRoll(rollId);

  // If no plan is recorded, route is incomplete / not planned
  if (!plan) {
    return {
      isComplete: false,
      isNoFurtherProcess: false,
      blocker: "PROCESS_ROUTE_INCOMPLETE",
      message: "No process route has been planned for this roll.",
    };
  }

  // Check NO_FURTHER_PROCESS decision (Step 10)
  if (plan.routeDecision === "NO_FURTHER_PROCESS") {
    return {
      isComplete: true,
      isNoFurtherProcess: true,
      routePlan: plan,
    };
  }

  if (plan.status === "REVIEW_REQUIRED") {
    return {
      isComplete: false,
      isNoFurtherProcess: false,
      routePlan: plan,
      blocker: "PROCESS_ROUTE_REVIEW_REQUIRED",
      message: "Process route is marked REVIEW_REQUIRED.",
    };
  }

  if (plan.steps.length === 0) {
    return {
      isComplete: false,
      isNoFurtherProcess: false,
      routePlan: plan,
      blocker: "PROCESS_ROUTE_INCOMPLETE",
      message: "Process route has no defined steps.",
    };
  }

  // Check if the final step has been completed / received clean
  const lastStep = plan.steps[plan.steps.length - 1];
  const activeReceive = FabricProcessReceiveService.getActiveReceiveForRoll(rollId);

  // Check if receive is clean and matches the final step
  const isFinalStepReceivedClean =
    !!activeReceive &&
    activeReceive.reconciliation.isCleanExact &&
    activeReceive.routeStepId === lastStep?.id;

  if (isFinalStepReceivedClean) {
    return {
      isComplete: true,
      isNoFurtherProcess: false,
      routePlan: plan,
    };
  }

  return {
    isComplete: false,
    isNoFurtherProcess: false,
    routePlan: plan,
    blocker: "PROCESS_ROUTE_INCOMPLETE",
    message: "Planned process route steps remain incomplete.",
  };
}

/**
 * Validates Current Quality requirements for commercial release.
 */
export function validateCurrentQuality(rollId: string): {
  isValid: boolean;
  summary: PostProcessQualitySummary;
  blockers: CommercialReleaseBlockerReason[];
  warnings: string[];
} {
  const summary = FabricPostProcessQualityService.getCurrentQualitySummary(rollId);
  const blockers: CommercialReleaseBlockerReason[] = [];
  const warnings: string[] = [];

  const latest = summary.latestInspection;
  if (!latest) {
    blockers.push("NO_CURRENT_QUALITY");
    return { isValid: false, summary, blockers, warnings };
  }

  // 1. Full inspection coverage required (Step 13)
  if (latest.inspectionCoveragePercent < 100) {
    blockers.push("QUALITY_INSPECTION_INCOMPLETE");
  }

  // 2. Quality review status check (Step 14)
  if (summary.reviewRequired || latest.status === "REVIEW_REQUIRED") {
    blockers.push("QUALITY_REVIEW_REQUIRED");
  }

  // 3. Disposition blockers (Steps 16, 17, 18, 19)
  if (summary.latestDisposition === "HOLD") {
    blockers.push("QUALITY_HOLD");
  } else if (summary.latestDisposition === "REWORK") {
    blockers.push("QUALITY_REWORK");
    blockers.push("PROCESS_ROUTE_REVIEW_REQUIRED");
  } else if (summary.latestDisposition === "PROCESS_REQUIRED") {
    blockers.push("QUALITY_PROCESS_REQUIRED");
    blockers.push("PROCESS_ROUTE_REVIEW_REQUIRED");
  } else if (summary.latestDisposition === "REJECT") {
    blockers.push("QUALITY_REJECT");
  } else if (summary.latestDisposition !== "ACCEPTED") {
    blockers.push("QUALITY_NO_LONGER_ACCEPTED");
  }

  // 4. Grade policy handling (Step 21 & Test L)
  // If Grade is UNASSIGNED while Disposition is ACCEPTED, return GRADE_POLICY_NOT_CONFIGURED
  if (summary.latestGrade === "UNASSIGNED" && summary.latestDisposition === "ACCEPTED") {
    blockers.push("GRADE_POLICY_NOT_CONFIGURED");
    warnings.push("Grade is UNASSIGNED. Authoritative grade policy is not configured.");
  }

  const isValid = blockers.length === 0;
  return { isValid, summary, blockers, warnings };
}

/**
 * Pure evaluation function for overall Commercial Release Readiness.
 */
export function evaluateCommercialReleaseReadiness(
  rollIdentityOrNodeId: string
): CommercialReleaseReadinessResult {
  const blockers: CommercialReleaseBlockerReason[] = [];
  const warnings: string[] = [];

  // 1. Identity Validation
  const identityRes = validateActiveRoll(rollIdentityOrNodeId);
  if (!identityRes.isValid || !identityRes.node) {
    blockers.push(identityRes.error || "ROLL_NOT_ACTIVE_OR_LEAF");
    return {
      rollIdentity: identityRes.node?.rollIdentity || rollIdentityOrNodeId,
      rollGenealogyNodeId: identityRes.node?.id || rollIdentityOrNodeId,
      readiness: "BLOCKED",
      canSimulateRelease: false,
      blockers,
      warnings: identityRes.message ? [identityRes.message] : [],
      node: identityRes.node,
      isRouteCompletePreview: false,
      isNoFurtherProcess: false,
      coveragePercent: 0,
      currentGrade: "UNASSIGNED",
      currentDisposition: "NOT_SET",
    };
  }

  const node = identityRes.node;

  // 2. Route Completion Validation (Steps 9, 10, 11)
  const routeRes = validateRouteCompletion(node.id);
  if (!routeRes.isComplete && routeRes.blocker) {
    blockers.push(routeRes.blocker);
    if (routeRes.message) warnings.push(routeRes.message);
  }

  // 3. Current Quality Validation (Steps 12 - 21)
  const qualityRes = validateCurrentQuality(node.id);
  blockers.push(...qualityRes.blockers);
  warnings.push(...qualityRes.warnings);

  const latestInsp = qualityRes.summary.latestInspection;
  const coveragePercent = latestInsp?.inspectionCoveragePercent || 0;
  const currentGrade = qualityRes.summary.latestGrade;
  const currentDisposition = qualityRes.summary.latestDisposition;

  // 4. Derive Overall Readiness
  let readiness: CommercialReleaseReadiness = "READY_FOR_REVIEW";

  // Hard blockers that result in BLOCKED state
  const hasHardBlocker = blockers.some((b) =>
    [
      "ROLL_NOT_ACTIVE_OR_LEAF",
      "ROLL_NOT_FOUND",
      "QUALITY_HOLD",
      "QUALITY_REWORK",
      "QUALITY_PROCESS_REQUIRED",
      "QUALITY_REJECT",
      "QUALITY_NO_LONGER_ACCEPTED",
    ].includes(b)
  );

  const hasReviewRequired = blockers.some((b) =>
    [
      "PROCESS_ROUTE_REVIEW_REQUIRED",
      "QUALITY_REVIEW_REQUIRED",
      "GRADE_POLICY_NOT_CONFIGURED",
      "CURRENT_QUALITY_REVIEW_REQUIRED",
      "QUALITY_SOURCE_STALE",
      "RELEASE_SOURCE_QUALITY_CHANGED",
      "RELEASE_SOURCE_ROUTE_CHANGED",
      "ROLL_SUPERSEDED_AFTER_RELEASE",
      "ROLL_QTY_CHANGED_AFTER_RELEASE",
    ].includes(b)
  );

  const hasIncomplete = blockers.some((b) =>
    ["PROCESS_ROUTE_INCOMPLETE", "NO_CURRENT_QUALITY", "QUALITY_INSPECTION_INCOMPLETE"].includes(b)
  );

  if (hasHardBlocker) {
    readiness = "BLOCKED";
  } else if (hasReviewRequired) {
    readiness = "REVIEW_REQUIRED";
  } else if (hasIncomplete) {
    readiness = "NOT_READY";
  } else {
    readiness = "READY_FOR_REVIEW";
  }

  const canSimulateRelease = readiness === "READY_FOR_REVIEW";

  return {
    rollIdentity: node.rollIdentity,
    rollGenealogyNodeId: node.id,
    readiness,
    canSimulateRelease,
    blockers,
    warnings,
    node,
    routePlan: routeRes.routePlan,
    qualitySummary: qualityRes.summary,
    isRouteCompletePreview: routeRes.isComplete,
    isNoFurtherProcess: routeRes.isNoFurtherProcess,
    coveragePercent,
    currentGrade,
    currentDisposition,
  };
}

/**
 * Derives a lightweight FinishedFabricCandidate from an active roll & release simulation.
 * Zero inventory mutation.
 */
export function deriveFinishedCandidate(
  node: FabricRollGenealogyNode,
  releaseSim: FabricCommercialReleaseSimulation
): FinishedFabricCandidate {
  return {
    id: `FFC-${releaseSim.id}`,
    rollIdentity: node.rollIdentity,
    rollGenealogyNodeId: node.id,
    qtyMetre: node.quantityMetre, // Exact active roll quantity (Step 33)
    grade: releaseSim.grade,
    disposition: releaseSim.disposition,
    qualityInspectionId: releaseSim.qualityInspectionId,
    routePlanId: releaseSim.routePlanId,
    releaseSimulationId: releaseSim.id,
    commercialStatus: "COMMERCIAL_RELEASE_SIMULATION",
    candidateTimestamp: new Date().toISOString(),
    isPhysicalInventory: false,
    isDispatchReady: false,
  };
}

// =============================================================================
// STEP 2, 56, 57 — DOMAIN SERVICE
// =============================================================================

export class FabricCommercialReleaseService {
  // In-memory releases store keyed by release.id
  private static releases: Map<string, FabricCommercialReleaseSimulation> = new Map();

  // Index of release IDs keyed by rollGenealogyNodeId
  private static rollReleaseIndex: Map<string, string[]> = new Map();

  /**
   * Resets in-memory stores (for testing and session resets).
   */
  public static resetStores(): void {
    this.releases.clear();
    this.rollReleaseIndex.clear();
  }

  /**
   * Retrieves active rolls that can be evaluated for commercial release.
   */
  public static getEligibleCommercialReleaseRolls(): FabricRollGenealogyNode[] {
    const nodes = FabricRollGenealogyService.getAllNodes();
    return nodes.filter(
      (n) => n.identityStatus === "ACTIVE" && FabricRollGenealogyService.getChildren(n.id).length === 0
    );
  }

  /**
   * Evaluates readiness for commercial release review.
   */
  public static evaluateCommercialReleaseReadiness(
    rollIdentityOrNodeId: string
  ): CommercialReleaseReadinessResult {
    return evaluateCommercialReleaseReadiness(rollIdentityOrNodeId);
  }

  /**
   * Creates an explicit commercial release simulation draft.
   */
  public static createCommercialReleaseDraft(
    input: CreateCommercialReleaseDraftInput
  ): {
    success: boolean;
    draft?: FabricCommercialReleaseSimulation | undefined;
    errors: string[];
    readinessResult: CommercialReleaseReadinessResult;
  } {
    const readiness = evaluateCommercialReleaseReadiness(input.rollIdentityOrNodeId);
    const errors: string[] = [];

    if (!readiness.node) {
      errors.push("Roll identity not found in genealogy.");
      return { success: false, errors, readinessResult: readiness };
    }

    const node = readiness.node;
    const qualitySummary = readiness.qualitySummary;
    const latestQuality = qualitySummary?.latestInspection;

    if (!latestQuality) {
      errors.push("No post-process quality inspection found for this roll.");
      return { success: false, errors, readinessResult: readiness };
    }

    if (input.decision === "RELEASE" && readiness.readiness !== "READY_FOR_REVIEW") {
      errors.push(
        `Roll is not ready for commercial release review (Readiness: ${readiness.readiness}). Resolve blockers before release.`
      );
      return { success: false, errors, readinessResult: readiness };
    }

    if (input.decision === "RELEASE" && (!input.reason || !input.reason.trim())) {
      errors.push("A valid release reason or remark is required to record commercial release.");
      return { success: false, errors, readinessResult: readiness };
    }

    const simId = `CRS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    const parentNode = node.parentNodeId
      ? FabricRollGenealogyService.getRollNode(node.parentNodeId)
      : undefined;

    const draft: FabricCommercialReleaseSimulation = {
      id: simId,
      rollGenealogyNodeId: node.id,
      rollIdentity: node.rollIdentity,
      rootRollId: node.rootNodeId,
      rootRollIdentity: node.rootRollIdentity,
      parentRollId: node.parentNodeId,
      parentRollIdentity: parentNode?.rollIdentity,
      generation: node.generation,

      routePlanId: readiness.routePlan?.id,
      routeRevision: readiness.routePlan
        ? FabricProcessRoutingService.getRouteRevisionHistory(node.id).length || 1
        : undefined,
      routeCompletePreview: readiness.isRouteCompletePreview,
      isNoFurtherProcess: readiness.isNoFurtherProcess,

      qualityInspectionId: latestQuality.id,
      qualityInspectionPurpose: latestQuality.inspectionPurpose,
      qualityRevision: 1,
      grade: latestQuality.proposedGrade,
      disposition: latestQuality.disposition,
      qualityStatus: latestQuality.status,
      inspectedQtyMetre: latestQuality.inspectedQtyMetre,
      rollQtyMetre: node.quantityMetre,

      releaseReadiness: readiness.readiness,
      decision: input.decision,
      releaseReason: input.decision === "RELEASE" ? input.reason?.trim() : undefined,
      holdReason: input.decision === "KEEP_ON_HOLD" ? input.reason?.trim() : undefined,

      finishedFabricCandidateStatus: input.decision === "RELEASE" ? "CANDIDATE" : "NOT_CREATED",
      status: input.decision === "RELEASE" ? "RELEASED_SIMULATION" : "DRAFT",
      authorizationPolicyNote: "AUTHORIZATION POLICY NOT CONFIGURED",
      simulationModeNote: "MANUAL COMMERCIAL RELEASE SIMULATION",

      createdAt: now,
      updatedAt: now,
    };

    if (draft.finishedFabricCandidateStatus === "CANDIDATE") {
      draft.candidate = deriveFinishedCandidate(node, draft);
    }

    return {
      success: true,
      draft,
      errors: [],
      readinessResult: readiness,
    };
  }

  /**
   * Confirms and persists the commercial release simulation record in memory.
   */
  public static confirmCommercialReleaseSimulation(
    input: CreateCommercialReleaseDraftInput
  ): {
    success: boolean;
    release?: FabricCommercialReleaseSimulation | undefined;
    errors: string[];
  } {
    const draftRes = this.createCommercialReleaseDraft(input);
    if (!draftRes.success || !draftRes.draft) {
      return { success: false, errors: draftRes.errors };
    }

    const release = draftRes.draft;
    this.releases.set(release.id, release);

    const existing = this.rollReleaseIndex.get(release.rollGenealogyNodeId) || [];
    existing.push(release.id);
    this.rollReleaseIndex.set(release.rollGenealogyNodeId, existing);

    return { success: true, release, errors: [] };
  }

  /**
   * Explicit commercial decision: KEEP_ON_HOLD.
   * Preserves Quality results while blocking commercial release.
   */
  public static keepCommerciallyOnHold(
    rollIdentityOrNodeId: string,
    holdReason: string
  ): {
    success: boolean;
    release?: FabricCommercialReleaseSimulation | undefined;
    errors: string[];
  } {
    return this.confirmCommercialReleaseSimulation({
      rollIdentityOrNodeId,
      decision: "KEEP_ON_HOLD",
      reason: holdReason,
    });
  }

  /**
   * Revokes an existing commercial release simulation.
   * Retains the historical release record; zero inventory reversals.
   */
  public static revokeCommercialReleaseSimulation(
    releaseId: string,
    revocationReason: string
  ): {
    success: boolean;
    release?: FabricCommercialReleaseSimulation | undefined;
    error?: string | undefined;
  } {
    const rel = this.releases.get(releaseId);
    if (!rel) {
      return { success: false, error: `Commercial release simulation "${releaseId}" not found.` };
    }

    if (!revocationReason || !revocationReason.trim()) {
      return { success: false, error: "A revocation reason is required to revoke a commercial release." };
    }

    rel.status = "REVOKED_SIMULATION";
    rel.finishedFabricCandidateStatus = "NOT_CREATED";
    rel.candidate = undefined;
    rel.revocationReason = revocationReason.trim();
    rel.updatedAt = new Date().toISOString();

    return { success: true, release: rel };
  }

  /**
   * Revises a commercial release simulation.
   */
  public static reviseCommercialReleaseSimulation(
    releaseId: string,
    newDecision: CommercialReleaseDecision,
    revisionReason: string
  ): {
    success: boolean;
    release?: FabricCommercialReleaseSimulation | undefined;
    error?: string | undefined;
  } {
    const oldRel = this.releases.get(releaseId);
    if (!oldRel) {
      return { success: false, error: `Commercial release simulation "${releaseId}" not found.` };
    }

    if (!revisionReason || !revisionReason.trim()) {
      return { success: false, error: "A revision reason is required to revise a commercial release." };
    }

    const res = this.confirmCommercialReleaseSimulation({
      rollIdentityOrNodeId: oldRel.rollGenealogyNodeId,
      decision: newDecision,
      reason: revisionReason,
    });

    if (res.success && res.release) {
      res.release.revisionReason = revisionReason.trim();
    }

    return { success: res.success, release: res.release, error: res.errors[0] };
  }

  /**
   * Retrieves a release record by ID.
   */
  public static getReleaseById(id: string): FabricCommercialReleaseSimulation | undefined {
    return this.releases.get(id);
  }

  /**
   * Retrieves chronological release simulation history for a roll.
   */
  public static getReleaseHistoryForRoll(
    rollGenealogyNodeId: string
  ): FabricCommercialReleaseSimulation[] {
    const ids = this.rollReleaseIndex.get(rollGenealogyNodeId) || [];
    return ids
      .map((id) => this.releases.get(id))
      .filter((r): r is FabricCommercialReleaseSimulation => r !== undefined);
  }

  /**
   * Retrieves the latest commercial release simulation for a roll.
   */
  public static getCurrentCommercialRelease(
    rollGenealogyNodeId: string
  ): FabricCommercialReleaseSimulation | undefined {
    const history = this.getReleaseHistoryForRoll(rollGenealogyNodeId);
    return history.length > 0 ? history[history.length - 1] : undefined;
  }

  /**
   * Derives current finished fabric candidate for a roll if active and released.
   */
  public static deriveFinishedFabricCandidate(
    rollGenealogyNodeId: string
  ): FinishedFabricCandidate | undefined {
    const current = this.getCurrentCommercialRelease(rollGenealogyNodeId);
    if (!current || current.status !== "RELEASED_SIMULATION") {
      return undefined;
    }
    return current.candidate;
  }

  /**
   * Retrieves all commercial release simulation records.
   */
  public static getAllReleases(): FabricCommercialReleaseSimulation[] {
    return Array.from(this.releases.values());
  }

  /**
   * Detects if Quality changed after release simulation (Step 43, 50).
   */
  public static detectQualityRevisionImpact(releaseId: string): {
    hasImpact: boolean;
    reason?: CommercialReleaseBlockerReason | undefined;
    message?: string | undefined;
  } {
    const rel = this.releases.get(releaseId);
    if (!rel) return { hasImpact: false };

    const currentQuality = FabricPostProcessQualityService.getCurrentQualitySummary(rel.rollGenealogyNodeId);
    const latestInsp = currentQuality.latestInspection;

    if (!latestInsp || latestInsp.id !== rel.qualityInspectionId) {
      rel.status = "REVIEW_REQUIRED";
      rel.staleReason = "Quality inspection was revised or reinspected after commercial release simulation.";
      return {
        hasImpact: true,
        reason: "RELEASE_SOURCE_QUALITY_CHANGED",
        message: rel.staleReason,
      };
    }

    if (currentQuality.latestDisposition !== "ACCEPTED") {
      rel.status = "REVIEW_REQUIRED";
      rel.staleReason = `Quality disposition is no longer ACCEPTED (current: ${currentQuality.latestDisposition}).`;
      return {
        hasImpact: true,
        reason: "QUALITY_NO_LONGER_ACCEPTED",
        message: rel.staleReason,
      };
    }

    if (currentQuality.reviewRequired) {
      rel.status = "REVIEW_REQUIRED";
      rel.staleReason = "Quality inspection requires review due to upstream changes.";
      return {
        hasImpact: true,
        reason: "CURRENT_QUALITY_REVIEW_REQUIRED",
        message: rel.staleReason,
      };
    }

    return { hasImpact: false };
  }

  /**
   * Detects if Route changed after release simulation (Step 44, 50).
   */
  public static detectRouteRevisionImpact(releaseId: string): {
    hasImpact: boolean;
    reason?: CommercialReleaseBlockerReason | undefined;
    message?: string | undefined;
  } {
    const rel = this.releases.get(releaseId);
    if (!rel) return { hasImpact: false };

    const plan = FabricProcessRoutingService.getRoutePlanForRoll(rel.rollGenealogyNodeId);
    const revHistory = FabricProcessRoutingService.getRouteRevisionHistory(rel.rollGenealogyNodeId);
    const currentRevCount = revHistory.length;
    const recordedRev = rel.routeRevision || 1;

    if (
      (plan && rel.routePlanId && plan.id !== rel.routePlanId) ||
      currentRevCount > recordedRev ||
      (plan && plan.updatedAt > rel.createdAt)
    ) {
      rel.status = "REVIEW_REQUIRED";
      rel.staleReason = "Process route was revised after commercial release simulation.";
      return {
        hasImpact: true,
        reason: "RELEASE_SOURCE_ROUTE_CHANGED",
        message: rel.staleReason,
      };
    }

    return { hasImpact: false };
  }

  /**
   * Detects if Roll was split after release simulation (Step 45, 50).
   */
  public static detectGenealogyImpact(releaseId: string): {
    hasImpact: boolean;
    reason?: CommercialReleaseBlockerReason | undefined;
    message?: string | undefined;
  } {
    const rel = this.releases.get(releaseId);
    if (!rel) return { hasImpact: false };

    const node = FabricRollGenealogyService.getRollNode(rel.rollGenealogyNodeId);
    if (node && node.identityStatus === "SUPERSEDED_BY_SPLIT") {
      rel.status = "REVIEW_REQUIRED";
      rel.staleReason = "Roll was split into child rolls after commercial release simulation.";
      return {
        hasImpact: true,
        reason: "ROLL_SUPERSEDED_AFTER_RELEASE",
        message: rel.staleReason,
      };
    }

    return { hasImpact: false };
  }

  /**
   * Detects if active roll quantity changed after release simulation (Step 46, 50).
   */
  public static detectRollQtyImpact(releaseId: string): {
    hasImpact: boolean;
    reason?: CommercialReleaseBlockerReason | undefined;
    message?: string | undefined;
  } {
    const rel = this.releases.get(releaseId);
    if (!rel) return { hasImpact: false };

    const node = FabricRollGenealogyService.getRollNode(rel.rollGenealogyNodeId);
    if (node && node.quantityMetre !== rel.rollQtyMetre) {
      rel.status = "REVIEW_REQUIRED";
      rel.staleReason = `Roll quantity changed from ${rel.rollQtyMetre} to ${node.quantityMetre} after commercial release simulation.`;
      return {
        hasImpact: true,
        reason: "ROLL_QTY_CHANGED_AFTER_RELEASE",
        message: rel.staleReason,
      };
    }

    return { hasImpact: false };
  }

  /**
   * Returns comprehensive commercial release summary for an active physical roll.
   */
  public static getCommercialReleaseSummary(
    rollIdentityOrNodeId: string
  ): CommercialReleaseSummary {
    let node = FabricRollGenealogyService.getRollNode(rollIdentityOrNodeId);
    if (!node) {
      node = FabricRollGenealogyService.getRollNodeByIdentity(rollIdentityOrNodeId);
    }

    const nodeId = node?.id || rollIdentityOrNodeId;
    const readiness = evaluateCommercialReleaseReadiness(nodeId);
    const latestRelease = this.getCurrentCommercialRelease(nodeId);

    // Run staleness checks on latest release
    if (latestRelease) {
      this.detectQualityRevisionImpact(latestRelease.id);
      this.detectRouteRevisionImpact(latestRelease.id);
      this.detectGenealogyImpact(latestRelease.id);
      this.detectRollQtyImpact(latestRelease.id);
    }

    const isSuperseded = node?.identityStatus === "SUPERSEDED_BY_SPLIT";
    const isActive = node?.identityStatus === "ACTIVE" && !isSuperseded;

    return {
      rollIdentity: node?.rollIdentity || rollIdentityOrNodeId,
      rollGenealogyNodeId: nodeId,
      activeRollQtyMetre: node?.quantityMetre || 0,
      isOperationallyActive: !!isActive,
      isSupersededBySplit: !!isSuperseded,
      currentReadiness: readiness.readiness,
      latestReleaseSimulation: latestRelease,
      latestReleaseDecision: latestRelease?.decision,
      releaseStatus: latestRelease?.status,
      qualityInspectionRef: readiness.qualitySummary?.latestInspection?.id,
      currentGrade: readiness.currentGrade,
      currentDisposition: readiness.currentDisposition,
      isRouteComplete: readiness.isRouteCompletePreview,
      finishedCandidate: latestRelease?.candidate,
      reviewRequired: readiness.readiness === "REVIEW_REQUIRED" || latestRelease?.status === "REVIEW_REQUIRED",
      blockers: readiness.blockers,
      warnings: readiness.warnings,
    };
  }

  /**
   * Root Genealogy Commercial Summary: Returns independent summaries for all active leaves.
   * Root is NOT aggregated into one commercial release (Step 48, 49).
   */
  public static getCommercialSummaryForRoot(
    rootNodeIdOrIdentity: string
  ): CommercialReleaseSummary[] {
    let rootNode = FabricRollGenealogyService.getRollNode(rootNodeIdOrIdentity);
    if (!rootNode) {
      rootNode = FabricRollGenealogyService.getRollNodeByIdentity(rootNodeIdOrIdentity);
    }
    const rootId = rootNode?.id || rootNodeIdOrIdentity;
    const leaves = FabricRollGenealogyService.getActiveLeafRolls(rootId);
    return leaves.map((leaf: FabricRollGenealogyNode) => this.getCommercialReleaseSummary(leaf.id));
  }

  // ===========================================================================
  // STEP 59–81: PHASE 5H VERIFICATION TESTS (TESTS A THROUGH W)
  // ===========================================================================

  public static runPhase5HVerificationTests(): {
    allPassed: boolean;
    results: Record<string, { status: "PASS" | "FAIL"; details: string }>;
  } {
    const results: Record<string, { status: "PASS" | "FAIL"; details: string }> = {};

    // Reset stores for clean test environment
    this.resetStores();
    FabricRollGenealogyService.resetStores();
    FabricProcessRoutingService.resetStores();
    FabricProcessReceiveService.resetStores();
    FabricPostProcessQualityService.resetStores();

    // -------------------------------------------------------------------------
    // TEST A: Active Leaf, route complete, 100% inspected, Grade B, ACCEPTED, clean -> READY_FOR_REVIEW
    // -------------------------------------------------------------------------
    try {
      const rootDraftA: FabricRollDraft = {
        id: "roll-5h-a",
        receiveDraftId: "rcv-5h-a",
        jobCardId: "jc-5h-a",
        productionOrderId: "po-5h-a",
        rollSequence: 1,
        temporaryRollNo: "R-5H-A",
        qtyMetre: 200,
        inspectionStatus: "UNINSPECTED",
        stockStatus: "DRAFT_GREY",
        isSaleable: false,
      };
      const nodeA = FabricRollGenealogyService.getOrCreateRootFromFabricRollDraft(rootDraftA);

      // Route setup: NO_FURTHER_PROCESS
      FabricProcessRoutingService.createRoutePlan({
        rollDraftId: nodeA.id,
        temporaryRollNo: nodeA.rollIdentity,
        jobCardId: nodeA.jobCardId || "jc-5h-a",
        productionOrderId: nodeA.productionOrderId || "po-5h-a",
        rollQtyMetre: 200,
        routeDecision: "NO_FURTHER_PROCESS",
        routeType: "STANDARD",
      });

      // Quality setup: 100% inspected, Grade B, ACCEPTED
      const qDraftA = FabricPostProcessQualityService.createPostProcessInspectionDraft({
        rollIdentityOrNodeId: nodeA.id,
        inspectionPurpose: "POST_PROCESS",
      });
      FabricPostProcessQualityService.savePostProcessInspection({
        inspectionDraft: qDraftA.draft!,
        inspectedQtyMetre: 200,
        defects: [],
        proposedGrade: "B",
        gradeSource: "MANUAL",
        disposition: "ACCEPTED",
      });

      const readinessA = this.evaluateCommercialReleaseReadiness(nodeA.id);
      const passA = readinessA.readiness === "READY_FOR_REVIEW" && readinessA.canSimulateRelease === true;

      results["A"] = {
        status: passA ? "PASS" : "FAIL",
        details: passA
          ? "Active leaf with completed route and clean accepted quality evaluated as READY_FOR_REVIEW."
          : `Failed Test A: readiness was ${readinessA.readiness}, blockers: ${readinessA.blockers.join(", ")}`,
      };
    } catch (e: any) {
      results["A"] = { status: "FAIL", details: e?.message || String(e) };
    }

    // -------------------------------------------------------------------------
    // TEST B: Superseded Parent -> BLOCKED
    // -------------------------------------------------------------------------
    try {
      const rootDraftB: FabricRollDraft = {
        id: "roll-5h-b",
        receiveDraftId: "rcv-5h-b",
        jobCardId: "jc-5h-b",
        productionOrderId: "po-5h-b",
        rollSequence: 1,
        temporaryRollNo: "R-5H-B",
        qtyMetre: 200,
        inspectionStatus: "UNINSPECTED",
        stockStatus: "DRAFT_GREY",
        isSaleable: false,
      };
      const nodeB = FabricRollGenealogyService.getOrCreateRootFromFabricRollDraft(rootDraftB);

      // Split nodeB into children
      FabricRollGenealogyService.confirmSplitSimulation({
        parentNodeId: nodeB.id,
        children: [
          { childRollIdentity: "R-5H-B-C01", quantityMetre: 100 },
          { childRollIdentity: "R-5H-B-C02", quantityMetre: 100 },
        ],
        reason: "Test B split",
      });

      const readinessB = this.evaluateCommercialReleaseReadiness(nodeB.id);
      const passB = readinessB.readiness === "BLOCKED" && readinessB.blockers.includes("ROLL_NOT_ACTIVE_OR_LEAF");

      results["B"] = {
        status: passB ? "PASS" : "FAIL",
        details: passB
          ? "Superseded parent roll correctly evaluated as BLOCKED."
          : `Failed Test B: readiness was ${readinessB.readiness}`,
      };
    } catch (e: any) {
      results["B"] = { status: "FAIL", details: e?.message || String(e) };
    }

    // -------------------------------------------------------------------------
    // TEST C: Active Roll, Route Incomplete, Quality Accepted -> NOT_READY (PROCESS_ROUTE_INCOMPLETE)
    // -------------------------------------------------------------------------
    try {
      const rootDraftC: FabricRollDraft = {
        id: "roll-5h-c",
        receiveDraftId: "rcv-5h-c",
        jobCardId: "jc-5h-c",
        productionOrderId: "po-5h-c",
        rollSequence: 1,
        temporaryRollNo: "R-5H-C",
        qtyMetre: 200,
        inspectionStatus: "UNINSPECTED",
        stockStatus: "DRAFT_GREY",
        isSaleable: false,
      };
      const nodeC = FabricRollGenealogyService.getOrCreateRootFromFabricRollDraft(rootDraftC);

      // Route setup: PROCESS_ROUTE with step (step not received)
      FabricProcessRoutingService.createRoutePlan({
        rollDraftId: nodeC.id,
        temporaryRollNo: nodeC.rollIdentity,
        jobCardId: nodeC.jobCardId || "jc-5h-c",
        productionOrderId: nodeC.productionOrderId || "po-5h-c",
        rollQtyMetre: 200,
        routeDecision: "PROCESS_ROUTE",
        routeType: "STANDARD",
        steps: [
          {
            processId: "prc-2",
            executionMode: "INTERNAL",
            plannedQtyMetre: 200,
          },
        ],
      });

      // Quality setup: ACCEPTED
      const qDraftC = FabricPostProcessQualityService.createPostProcessInspectionDraft({
        rollIdentityOrNodeId: nodeC.id,
        inspectionPurpose: "POST_PROCESS",
      });
      FabricPostProcessQualityService.savePostProcessInspection({
        inspectionDraft: qDraftC.draft!,
        inspectedQtyMetre: 200,
        defects: [],
        proposedGrade: "A",
        gradeSource: "MANUAL",
        disposition: "ACCEPTED",
      });

      const readinessC = this.evaluateCommercialReleaseReadiness(nodeC.id);
      const passC =
        readinessC.readiness === "NOT_READY" &&
        readinessC.blockers.includes("PROCESS_ROUTE_INCOMPLETE");

      results["C"] = {
        status: passC ? "PASS" : "FAIL",
        details: passC
          ? "Active roll with incomplete route correctly evaluated as NOT_READY."
          : `Failed Test C: readiness was ${readinessC.readiness}`,
      };
    } catch (e: any) {
      results["C"] = { status: "FAIL", details: e?.message || String(e) };
    }

    // -------------------------------------------------------------------------
    // TEST D: Valid NO_FURTHER_PROCESS decision, Quality accepted & complete -> READY_FOR_REVIEW
    // -------------------------------------------------------------------------
    try {
      const rootDraftD: FabricRollDraft = {
        id: "roll-5h-d",
        receiveDraftId: "rcv-5h-d",
        jobCardId: "jc-5h-d",
        productionOrderId: "po-5h-d",
        rollSequence: 1,
        temporaryRollNo: "R-5H-D",
        qtyMetre: 150,
        inspectionStatus: "UNINSPECTED",
        stockStatus: "DRAFT_GREY",
        isSaleable: false,
      };
      const nodeD = FabricRollGenealogyService.getOrCreateRootFromFabricRollDraft(rootDraftD);

      FabricProcessRoutingService.createRoutePlan({
        rollDraftId: nodeD.id,
        temporaryRollNo: nodeD.rollIdentity,
        jobCardId: nodeD.jobCardId || "jc-5h-d",
        productionOrderId: nodeD.productionOrderId || "po-5h-d",
        rollQtyMetre: 150,
        routeDecision: "NO_FURTHER_PROCESS",
        routeType: "STANDARD",
      });

      const qDraftD = FabricPostProcessQualityService.createPostProcessInspectionDraft({
        rollIdentityOrNodeId: nodeD.id,
        inspectionPurpose: "POST_PROCESS",
      });
      FabricPostProcessQualityService.savePostProcessInspection({
        inspectionDraft: qDraftD.draft!,
        inspectedQtyMetre: 150,
        defects: [],
        proposedGrade: "A",
        gradeSource: "MANUAL",
        disposition: "ACCEPTED",
      });

      const readinessD = this.evaluateCommercialReleaseReadiness(nodeD.id);
      const passD = readinessD.readiness === "READY_FOR_REVIEW" && readinessD.isNoFurtherProcess === true;

      results["D"] = {
        status: passD ? "PASS" : "FAIL",
        details: passD
          ? "NO_FURTHER_PROCESS with clean accepted quality correctly evaluated as READY_FOR_REVIEW."
          : `Failed Test D: readiness was ${readinessD.readiness}`,
      };
    } catch (e: any) {
      results["D"] = { status: "FAIL", details: e?.message || String(e) };
    }

    // -------------------------------------------------------------------------
    // TEST E: Quality coverage 60%, disposition ACCEPTED -> NOT_READY / REVIEW_REQUIRED
    // -------------------------------------------------------------------------
    try {
      const rootDraftE: FabricRollDraft = {
        id: "roll-5h-e",
        receiveDraftId: "rcv-5h-e",
        jobCardId: "jc-5h-e",
        productionOrderId: "po-5h-e",
        rollSequence: 1,
        temporaryRollNo: "R-5H-E",
        qtyMetre: 200,
        inspectionStatus: "UNINSPECTED",
        stockStatus: "DRAFT_GREY",
        isSaleable: false,
      };
      const nodeE = FabricRollGenealogyService.getOrCreateRootFromFabricRollDraft(rootDraftE);

      FabricProcessRoutingService.createRoutePlan({
        rollDraftId: nodeE.id,
        temporaryRollNo: nodeE.rollIdentity,
        jobCardId: nodeE.jobCardId || "jc-5h-e",
        productionOrderId: nodeE.productionOrderId || "po-5h-e",
        rollQtyMetre: 200,
        routeDecision: "NO_FURTHER_PROCESS",
        routeType: "STANDARD",
      });

      // Partial inspection: 120 / 200 (60%)
      const qDraftE = FabricPostProcessQualityService.createPostProcessInspectionDraft({
        rollIdentityOrNodeId: nodeE.id,
        inspectionPurpose: "POST_PROCESS",
      });
      FabricPostProcessQualityService.savePostProcessInspection({
        inspectionDraft: qDraftE.draft!,
        inspectedQtyMetre: 120,
        defects: [],
        proposedGrade: "B",
        gradeSource: "MANUAL",
        disposition: "ACCEPTED",
      });

      const readinessE = this.evaluateCommercialReleaseReadiness(nodeE.id);
      const passE =
        (readinessE.readiness === "NOT_READY" || readinessE.readiness === "REVIEW_REQUIRED") &&
        readinessE.blockers.includes("QUALITY_INSPECTION_INCOMPLETE");

      results["E"] = {
        status: passE ? "PASS" : "FAIL",
        details: passE
          ? "Partial 60% inspection correctly blocked from commercial release readiness."
          : `Failed Test E: readiness was ${readinessE.readiness}`,
      };
    } catch (e: any) {
      results["E"] = { status: "FAIL", details: e?.message || String(e) };
    }

    // -------------------------------------------------------------------------
    // TEST F: Quality HOLD -> BLOCKED
    // -------------------------------------------------------------------------
    try {
      const rootDraftF: FabricRollDraft = {
        id: "roll-5h-f",
        receiveDraftId: "rcv-5h-f",
        jobCardId: "jc-5h-f",
        productionOrderId: "po-5h-f",
        rollSequence: 1,
        temporaryRollNo: "R-5H-F",
        qtyMetre: 200,
        inspectionStatus: "UNINSPECTED",
        stockStatus: "DRAFT_GREY",
        isSaleable: false,
      };
      const nodeF = FabricRollGenealogyService.getOrCreateRootFromFabricRollDraft(rootDraftF);

      FabricProcessRoutingService.createRoutePlan({
        rollDraftId: nodeF.id,
        temporaryRollNo: nodeF.rollIdentity,
        jobCardId: nodeF.jobCardId || "jc-5h-f",
        productionOrderId: nodeF.productionOrderId || "po-5h-f",
        rollQtyMetre: 200,
        routeDecision: "NO_FURTHER_PROCESS",
        routeType: "STANDARD",
      });

      const qDraftF = FabricPostProcessQualityService.createPostProcessInspectionDraft({
        rollIdentityOrNodeId: nodeF.id,
        inspectionPurpose: "POST_PROCESS",
      });
      FabricPostProcessQualityService.savePostProcessInspection({
        inspectionDraft: qDraftF.draft!,
        inspectedQtyMetre: 200,
        defects: [],
        proposedGrade: "B",
        gradeSource: "MANUAL",
        disposition: "HOLD",
      });

      const readinessF = this.evaluateCommercialReleaseReadiness(nodeF.id);
      const passF = readinessF.readiness === "BLOCKED" && readinessF.blockers.includes("QUALITY_HOLD");

      results["F"] = {
        status: passF ? "PASS" : "FAIL",
        details: passF
          ? "Quality HOLD correctly evaluated as BLOCKED."
          : `Failed Test F: readiness was ${readinessF.readiness}`,
      };
    } catch (e: any) {
      results["F"] = { status: "FAIL", details: e?.message || String(e) };
    }

    // -------------------------------------------------------------------------
    // TEST G: Quality REWORK -> BLOCKED (PROCESS_ROUTE_REVIEW_REQUIRED)
    // -------------------------------------------------------------------------
    try {
      const rootDraftG: FabricRollDraft = {
        id: "roll-5h-g",
        receiveDraftId: "rcv-5h-g",
        jobCardId: "jc-5h-g",
        productionOrderId: "po-5h-g",
        rollSequence: 1,
        temporaryRollNo: "R-5H-G",
        qtyMetre: 200,
        inspectionStatus: "UNINSPECTED",
        stockStatus: "DRAFT_GREY",
        isSaleable: false,
      };
      const nodeG = FabricRollGenealogyService.getOrCreateRootFromFabricRollDraft(rootDraftG);

      FabricProcessRoutingService.createRoutePlan({
        rollDraftId: nodeG.id,
        temporaryRollNo: nodeG.rollIdentity,
        jobCardId: nodeG.jobCardId || "jc-5h-g",
        productionOrderId: nodeG.productionOrderId || "po-5h-g",
        rollQtyMetre: 200,
        routeDecision: "NO_FURTHER_PROCESS",
        routeType: "STANDARD",
      });

      const qDraftG = FabricPostProcessQualityService.createPostProcessInspectionDraft({
        rollIdentityOrNodeId: nodeG.id,
        inspectionPurpose: "POST_PROCESS",
      });
      FabricPostProcessQualityService.savePostProcessInspection({
        inspectionDraft: qDraftG.draft!,
        inspectedQtyMetre: 200,
        defects: [],
        proposedGrade: "C",
        gradeSource: "MANUAL",
        disposition: "REWORK",
      });

      const readinessG = this.evaluateCommercialReleaseReadiness(nodeG.id);
      const passG =
        readinessG.readiness === "BLOCKED" &&
        readinessG.blockers.includes("QUALITY_REWORK") &&
        readinessG.blockers.includes("PROCESS_ROUTE_REVIEW_REQUIRED");

      results["G"] = {
        status: passG ? "PASS" : "FAIL",
        details: passG
          ? "Quality REWORK correctly evaluated as BLOCKED with route review required."
          : `Failed Test G: readiness was ${readinessG.readiness}`,
      };
    } catch (e: any) {
      results["G"] = { status: "FAIL", details: e?.message || String(e) };
    }

    // -------------------------------------------------------------------------
    // TEST H: Quality PROCESS_REQUIRED -> BLOCKED (PROCESS_ROUTE_REVIEW_REQUIRED)
    // -------------------------------------------------------------------------
    try {
      const rootDraftH: FabricRollDraft = {
        id: "roll-5h-h",
        receiveDraftId: "rcv-5h-h",
        jobCardId: "jc-5h-h",
        productionOrderId: "po-5h-h",
        rollSequence: 1,
        temporaryRollNo: "R-5H-H",
        qtyMetre: 200,
        inspectionStatus: "UNINSPECTED",
        stockStatus: "DRAFT_GREY",
        isSaleable: false,
      };
      const nodeH = FabricRollGenealogyService.getOrCreateRootFromFabricRollDraft(rootDraftH);

      FabricProcessRoutingService.createRoutePlan({
        rollDraftId: nodeH.id,
        temporaryRollNo: nodeH.rollIdentity,
        jobCardId: nodeH.jobCardId || "jc-5h-h",
        productionOrderId: nodeH.productionOrderId || "po-5h-h",
        rollQtyMetre: 200,
        routeDecision: "NO_FURTHER_PROCESS",
        routeType: "STANDARD",
      });

      const qDraftH = FabricPostProcessQualityService.createPostProcessInspectionDraft({
        rollIdentityOrNodeId: nodeH.id,
        inspectionPurpose: "POST_PROCESS",
      });
      FabricPostProcessQualityService.savePostProcessInspection({
        inspectionDraft: qDraftH.draft!,
        inspectedQtyMetre: 200,
        defects: [],
        proposedGrade: "B",
        gradeSource: "MANUAL",
        disposition: "PROCESS_REQUIRED",
      });

      const readinessH = this.evaluateCommercialReleaseReadiness(nodeH.id);
      const passH =
        readinessH.readiness === "BLOCKED" &&
        readinessH.blockers.includes("QUALITY_PROCESS_REQUIRED") &&
        readinessH.blockers.includes("PROCESS_ROUTE_REVIEW_REQUIRED");

      results["H"] = {
        status: passH ? "PASS" : "FAIL",
        details: passH
          ? "Quality PROCESS_REQUIRED correctly evaluated as BLOCKED with route review required."
          : `Failed Test H: readiness was ${readinessH.readiness}`,
      };
    } catch (e: any) {
      results["H"] = { status: "FAIL", details: e?.message || String(e) };
    }

    // -------------------------------------------------------------------------
    // TEST I: Quality REJECT -> BLOCKED (No scrap posting)
    // -------------------------------------------------------------------------
    try {
      const rootDraftI: FabricRollDraft = {
        id: "roll-5h-i",
        receiveDraftId: "rcv-5h-i",
        jobCardId: "jc-5h-i",
        productionOrderId: "po-5h-i",
        rollSequence: 1,
        temporaryRollNo: "R-5H-I",
        qtyMetre: 200,
        inspectionStatus: "UNINSPECTED",
        stockStatus: "DRAFT_GREY",
        isSaleable: false,
      };
      const nodeI = FabricRollGenealogyService.getOrCreateRootFromFabricRollDraft(rootDraftI);

      FabricProcessRoutingService.createRoutePlan({
        rollDraftId: nodeI.id,
        temporaryRollNo: nodeI.rollIdentity,
        jobCardId: nodeI.jobCardId || "jc-5h-i",
        productionOrderId: nodeI.productionOrderId || "po-5h-i",
        rollQtyMetre: 200,
        routeDecision: "NO_FURTHER_PROCESS",
        routeType: "STANDARD",
      });

      const qDraftI = FabricPostProcessQualityService.createPostProcessInspectionDraft({
        rollIdentityOrNodeId: nodeI.id,
        inspectionPurpose: "POST_PROCESS",
      });
      FabricPostProcessQualityService.savePostProcessInspection({
        inspectionDraft: qDraftI.draft!,
        inspectedQtyMetre: 200,
        defects: [],
        proposedGrade: "REJECT",
        gradeSource: "MANUAL",
        disposition: "REJECT",
      });

      const readinessI = this.evaluateCommercialReleaseReadiness(nodeI.id);
      const passI = readinessI.readiness === "BLOCKED" && readinessI.blockers.includes("QUALITY_REJECT");

      results["I"] = {
        status: passI ? "PASS" : "FAIL",
        details: passI
          ? "Quality REJECT correctly evaluated as BLOCKED without scrap posting."
          : `Failed Test I: readiness was ${readinessI.readiness}`,
      };
    } catch (e: any) {
      results["I"] = { status: "FAIL", details: e?.message || String(e) };
    }

    // -------------------------------------------------------------------------
    // TEST J: Grade A + Disposition HOLD -> BLOCKED (Grade does not override Disposition)
    // -------------------------------------------------------------------------
    try {
      const rootDraftJ: FabricRollDraft = {
        id: "roll-5h-j",
        receiveDraftId: "rcv-5h-j",
        jobCardId: "jc-5h-j",
        productionOrderId: "po-5h-j",
        rollSequence: 1,
        temporaryRollNo: "R-5H-J",
        qtyMetre: 200,
        inspectionStatus: "UNINSPECTED",
        stockStatus: "DRAFT_GREY",
        isSaleable: false,
      };
      const nodeJ = FabricRollGenealogyService.getOrCreateRootFromFabricRollDraft(rootDraftJ);

      FabricProcessRoutingService.createRoutePlan({
        rollDraftId: nodeJ.id,
        temporaryRollNo: nodeJ.rollIdentity,
        jobCardId: nodeJ.jobCardId || "jc-5h-j",
        productionOrderId: nodeJ.productionOrderId || "po-5h-j",
        rollQtyMetre: 200,
        routeDecision: "NO_FURTHER_PROCESS",
        routeType: "STANDARD",
      });

      const qDraftJ = FabricPostProcessQualityService.createPostProcessInspectionDraft({
        rollIdentityOrNodeId: nodeJ.id,
        inspectionPurpose: "POST_PROCESS",
      });
      FabricPostProcessQualityService.savePostProcessInspection({
        inspectionDraft: qDraftJ.draft!,
        inspectedQtyMetre: 200,
        defects: [],
        proposedGrade: "A",
        gradeSource: "MANUAL",
        disposition: "HOLD",
      });

      const readinessJ = this.evaluateCommercialReleaseReadiness(nodeJ.id);
      const passJ = readinessJ.readiness === "BLOCKED" && readinessJ.blockers.includes("QUALITY_HOLD");

      results["J"] = {
        status: passJ ? "PASS" : "FAIL",
        details: passJ
          ? "Grade A with disposition HOLD correctly blocked; Grade does not override Disposition."
          : `Failed Test J: readiness was ${readinessJ.readiness}`,
      };
    } catch (e: any) {
      results["J"] = { status: "FAIL", details: e?.message || String(e) };
    }

    // -------------------------------------------------------------------------
    // TEST K: Grade B, Disposition ACCEPTED, Route complete -> READY_FOR_REVIEW
    // -------------------------------------------------------------------------
    try {
      const rootDraftK: FabricRollDraft = {
        id: "roll-5h-k",
        receiveDraftId: "rcv-5h-k",
        jobCardId: "jc-5h-k",
        productionOrderId: "po-5h-k",
        rollSequence: 1,
        temporaryRollNo: "R-5H-K",
        qtyMetre: 200,
        inspectionStatus: "UNINSPECTED",
        stockStatus: "DRAFT_GREY",
        isSaleable: false,
      };
      const nodeK = FabricRollGenealogyService.getOrCreateRootFromFabricRollDraft(rootDraftK);

      FabricProcessRoutingService.createRoutePlan({
        rollDraftId: nodeK.id,
        temporaryRollNo: nodeK.rollIdentity,
        jobCardId: nodeK.jobCardId || "jc-5h-k",
        productionOrderId: nodeK.productionOrderId || "po-5h-k",
        rollQtyMetre: 200,
        routeDecision: "NO_FURTHER_PROCESS",
        routeType: "STANDARD",
      });

      const qDraftK = FabricPostProcessQualityService.createPostProcessInspectionDraft({
        rollIdentityOrNodeId: nodeK.id,
        inspectionPurpose: "POST_PROCESS",
      });
      FabricPostProcessQualityService.savePostProcessInspection({
        inspectionDraft: qDraftK.draft!,
        inspectedQtyMetre: 200,
        defects: [],
        proposedGrade: "B",
        gradeSource: "MANUAL",
        disposition: "ACCEPTED",
      });

      const readinessK = this.evaluateCommercialReleaseReadiness(nodeK.id);
      const passK = readinessK.readiness === "READY_FOR_REVIEW";

      results["K"] = {
        status: passK ? "PASS" : "FAIL",
        details: passK
          ? "Grade B + ACCEPTED evaluated as READY_FOR_REVIEW without buyer grade bias."
          : `Failed Test K: readiness was ${readinessK.readiness}`,
      };
    } catch (e: any) {
      results["K"] = { status: "FAIL", details: e?.message || String(e) };
    }

    // -------------------------------------------------------------------------
    // TEST L: Grade UNASSIGNED + Disposition ACCEPTED -> REVIEW_REQUIRED
    // -------------------------------------------------------------------------
    try {
      const rootDraftL: FabricRollDraft = {
        id: "roll-5h-l",
        receiveDraftId: "rcv-5h-l",
        jobCardId: "jc-5h-l",
        productionOrderId: "po-5h-l",
        rollSequence: 1,
        temporaryRollNo: "R-5H-L",
        qtyMetre: 200,
        inspectionStatus: "UNINSPECTED",
        stockStatus: "DRAFT_GREY",
        isSaleable: false,
      };
      const nodeL = FabricRollGenealogyService.getOrCreateRootFromFabricRollDraft(rootDraftL);

      FabricProcessRoutingService.createRoutePlan({
        rollDraftId: nodeL.id,
        temporaryRollNo: nodeL.rollIdentity,
        jobCardId: nodeL.jobCardId || "jc-5h-l",
        productionOrderId: nodeL.productionOrderId || "po-5h-l",
        rollQtyMetre: 200,
        routeDecision: "NO_FURTHER_PROCESS",
        routeType: "STANDARD",
      });

      const qDraftL = FabricPostProcessQualityService.createPostProcessInspectionDraft({
        rollIdentityOrNodeId: nodeL.id,
        inspectionPurpose: "POST_PROCESS",
      });
      FabricPostProcessQualityService.savePostProcessInspection({
        inspectionDraft: qDraftL.draft!,
        inspectedQtyMetre: 200,
        defects: [],
        proposedGrade: "UNASSIGNED",
        gradeSource: "UNASSIGNED",
        disposition: "ACCEPTED",
      });

      const readinessL = this.evaluateCommercialReleaseReadiness(nodeL.id);
      const passL =
        readinessL.readiness === "REVIEW_REQUIRED" &&
        readinessL.blockers.includes("GRADE_POLICY_NOT_CONFIGURED");

      results["L"] = {
        status: passL ? "PASS" : "FAIL",
        details: passL
          ? "Grade UNASSIGNED + ACCEPTED correctly returned REVIEW_REQUIRED due to unconfigured grade policy."
          : `Failed Test L: readiness was ${readinessL.readiness}`,
      };
    } catch (e: any) {
      results["L"] = { status: "FAIL", details: e?.message || String(e) };
    }

    // -------------------------------------------------------------------------
    // TEST M: READY_FOR_REVIEW roll, no explicit release action -> release status not RELEASED
    // -------------------------------------------------------------------------
    try {
      const rootDraftM: FabricRollDraft = {
        id: "roll-5h-m",
        receiveDraftId: "rcv-5h-m",
        jobCardId: "jc-5h-m",
        productionOrderId: "po-5h-m",
        rollSequence: 1,
        temporaryRollNo: "R-5H-M",
        qtyMetre: 200,
        inspectionStatus: "UNINSPECTED",
        stockStatus: "DRAFT_GREY",
        isSaleable: false,
      };
      const nodeM = FabricRollGenealogyService.getOrCreateRootFromFabricRollDraft(rootDraftM);

      FabricProcessRoutingService.createRoutePlan({
        rollDraftId: nodeM.id,
        temporaryRollNo: nodeM.rollIdentity,
        jobCardId: nodeM.jobCardId || "jc-5h-m",
        productionOrderId: nodeM.productionOrderId || "po-5h-m",
        rollQtyMetre: 200,
        routeDecision: "NO_FURTHER_PROCESS",
        routeType: "STANDARD",
      });

      const qDraftM = FabricPostProcessQualityService.createPostProcessInspectionDraft({
        rollIdentityOrNodeId: nodeM.id,
        inspectionPurpose: "POST_PROCESS",
      });
      FabricPostProcessQualityService.savePostProcessInspection({
        inspectionDraft: qDraftM.draft!,
        inspectedQtyMetre: 200,
        defects: [],
        proposedGrade: "A",
        gradeSource: "MANUAL",
        disposition: "ACCEPTED",
      });

      const summaryM = this.getCommercialReleaseSummary(nodeM.id);
      const passM = summaryM.currentReadiness === "READY_FOR_REVIEW" && summaryM.releaseStatus === undefined;

      results["M"] = {
        status: passM ? "PASS" : "FAIL",
        details: passM
          ? "Roll evaluated as READY_FOR_REVIEW was not automatically released."
          : `Failed Test M: releaseStatus was ${summaryM.releaseStatus}`,
      };
    } catch (e: any) {
      results["M"] = { status: "FAIL", details: e?.message || String(e) };
    }

    // -------------------------------------------------------------------------
    // TEST N: READY_FOR_REVIEW roll, explicit RELEASE with reason -> RELEASED_SIMULATION
    // -------------------------------------------------------------------------
    try {
      const rootDraftN: FabricRollDraft = {
        id: "roll-5h-n",
        receiveDraftId: "rcv-5h-n",
        jobCardId: "jc-5h-n",
        productionOrderId: "po-5h-n",
        rollSequence: 1,
        temporaryRollNo: "R-5H-N",
        qtyMetre: 200,
        inspectionStatus: "UNINSPECTED",
        stockStatus: "DRAFT_GREY",
        isSaleable: false,
      };
      const nodeN = FabricRollGenealogyService.getOrCreateRootFromFabricRollDraft(rootDraftN);

      FabricProcessRoutingService.createRoutePlan({
        rollDraftId: nodeN.id,
        temporaryRollNo: nodeN.rollIdentity,
        jobCardId: nodeN.jobCardId || "jc-5h-n",
        productionOrderId: nodeN.productionOrderId || "po-5h-n",
        rollQtyMetre: 200,
        routeDecision: "NO_FURTHER_PROCESS",
        routeType: "STANDARD",
      });

      const qDraftN = FabricPostProcessQualityService.createPostProcessInspectionDraft({
        rollIdentityOrNodeId: nodeN.id,
        inspectionPurpose: "POST_PROCESS",
      });
      FabricPostProcessQualityService.savePostProcessInspection({
        inspectionDraft: qDraftN.draft!,
        inspectedQtyMetre: 200,
        defects: [],
        proposedGrade: "A",
        gradeSource: "MANUAL",
        disposition: "ACCEPTED",
      });

      const relResN = this.confirmCommercialReleaseSimulation({
        rollIdentityOrNodeId: nodeN.id,
        decision: "RELEASE",
        reason: "All production steps verified complete and acceptable.",
        operatorName: "QA Lead",
      });

      const passN =
        relResN.success &&
        relResN.release?.status === "RELEASED_SIMULATION" &&
        relResN.release?.finishedFabricCandidateStatus === "CANDIDATE" &&
        relResN.release?.candidate !== undefined;

      results["N"] = {
        status: passN ? "PASS" : "FAIL",
        details: passN
          ? "Explicit release simulation recorded with candidate creation and zero inventory mutation."
          : `Failed Test N: errors=${relResN.errors.join(", ")}`,
      };
    } catch (e: any) {
      results["N"] = { status: "FAIL", details: e?.message || String(e) };
    }

    // -------------------------------------------------------------------------
    // TEST O: Candidate Qty is exact active roll Qty (no override)
    // -------------------------------------------------------------------------
    try {
      const rootDraftO: FabricRollDraft = {
        id: "roll-5h-o",
        receiveDraftId: "rcv-5h-o",
        jobCardId: "jc-5h-o",
        productionOrderId: "po-5h-o",
        rollSequence: 1,
        temporaryRollNo: "R-5H-O",
        qtyMetre: 187.654,
        inspectionStatus: "UNINSPECTED",
        stockStatus: "DRAFT_GREY",
        isSaleable: false,
      };
      const nodeO = FabricRollGenealogyService.getOrCreateRootFromFabricRollDraft(rootDraftO);

      FabricProcessRoutingService.createRoutePlan({
        rollDraftId: nodeO.id,
        temporaryRollNo: nodeO.rollIdentity,
        jobCardId: nodeO.jobCardId || "jc-5h-o",
        productionOrderId: nodeO.productionOrderId || "po-5h-o",
        rollQtyMetre: 187.654,
        routeDecision: "NO_FURTHER_PROCESS",
        routeType: "STANDARD",
      });

      const qDraftO = FabricPostProcessQualityService.createPostProcessInspectionDraft({
        rollIdentityOrNodeId: nodeO.id,
        inspectionPurpose: "POST_PROCESS",
      });
      FabricPostProcessQualityService.savePostProcessInspection({
        inspectionDraft: qDraftO.draft!,
        inspectedQtyMetre: 187.654,
        defects: [],
        proposedGrade: "A",
        gradeSource: "MANUAL",
        disposition: "ACCEPTED",
      });

      const relResO = this.confirmCommercialReleaseSimulation({
        rollIdentityOrNodeId: nodeO.id,
        decision: "RELEASE",
        reason: "Valid release",
      });

      const passO =
        relResO.success &&
        relResO.release?.candidate?.qtyMetre === 187.654 &&
        relResO.release?.rollIdentity === "R-5H-O";

      results["O"] = {
        status: passO ? "PASS" : "FAIL",
        details: passO
          ? "Finished fabric candidate qty matches exact active roll qty (187.654m) with identity unchanged."
          : `Failed Test O: candidate qty was ${relResO.release?.candidate?.qtyMetre}`,
      };
    } catch (e: any) {
      results["O"] = { status: "FAIL", details: e?.message || String(e) };
    }

    // -------------------------------------------------------------------------
    // TEST P: Quality Reinspection after release -> old release marked REVIEW_REQUIRED / STALE
    // -------------------------------------------------------------------------
    try {
      const rootDraftP: FabricRollDraft = {
        id: "roll-5h-p",
        receiveDraftId: "rcv-5h-p",
        jobCardId: "jc-5h-p",
        productionOrderId: "po-5h-p",
        rollSequence: 1,
        temporaryRollNo: "R-5H-P",
        qtyMetre: 200,
        inspectionStatus: "UNINSPECTED",
        stockStatus: "DRAFT_GREY",
        isSaleable: false,
      };
      const nodeP = FabricRollGenealogyService.getOrCreateRootFromFabricRollDraft(rootDraftP);

      FabricProcessRoutingService.createRoutePlan({
        rollDraftId: nodeP.id,
        temporaryRollNo: nodeP.rollIdentity,
        jobCardId: nodeP.jobCardId || "jc-5h-p",
        productionOrderId: nodeP.productionOrderId || "po-5h-p",
        rollQtyMetre: 200,
        routeDecision: "NO_FURTHER_PROCESS",
        routeType: "STANDARD",
      });

      const qDraftP1 = FabricPostProcessQualityService.createPostProcessInspectionDraft({
        rollIdentityOrNodeId: nodeP.id,
        inspectionPurpose: "POST_PROCESS",
      });
      const qResP1 = FabricPostProcessQualityService.savePostProcessInspection({
        inspectionDraft: qDraftP1.draft!,
        inspectedQtyMetre: 200,
        defects: [],
        proposedGrade: "A",
        gradeSource: "MANUAL",
        disposition: "ACCEPTED",
      });

      const relResP = this.confirmCommercialReleaseSimulation({
        rollIdentityOrNodeId: nodeP.id,
        decision: "RELEASE",
        reason: "Initial release",
      });

      // Later reinspection occurs
      const qDraftP2 = FabricPostProcessQualityService.createPostProcessInspectionDraft({
        rollIdentityOrNodeId: nodeP.id,
        inspectionPurpose: "REINSPECTION",
        previousInspectionId: qResP1.inspection!.id,
        reinspectionReason: "Customer requested secondary test",
      });
      FabricPostProcessQualityService.savePostProcessInspection({
        inspectionDraft: qDraftP2.draft!,
        inspectedQtyMetre: 200,
        defects: [],
        proposedGrade: "B",
        gradeSource: "MANUAL",
        disposition: "ACCEPTED",
      });

      // Check impact
      const impactP = this.detectQualityRevisionImpact(relResP.release!.id);
      const passP = impactP.hasImpact && impactP.reason === "RELEASE_SOURCE_QUALITY_CHANGED";

      results["P"] = {
        status: passP ? "PASS" : "FAIL",
        details: passP
          ? "Reinspection after release marked existing release as REVIEW_REQUIRED / STALE without silent rebind."
          : `Failed Test P: hasImpact=${impactP.hasImpact}`,
      };
    } catch (e: any) {
      results["P"] = { status: "FAIL", details: e?.message || String(e) };
    }

    // -------------------------------------------------------------------------
    // TEST Q: Route revised after release -> REVIEW_REQUIRED
    // -------------------------------------------------------------------------
    try {
      const rootDraftQ: FabricRollDraft = {
        id: "roll-5h-q",
        receiveDraftId: "rcv-5h-q",
        jobCardId: "jc-5h-q",
        productionOrderId: "po-5h-q",
        rollSequence: 1,
        temporaryRollNo: "R-5H-Q",
        qtyMetre: 200,
        inspectionStatus: "UNINSPECTED",
        stockStatus: "DRAFT_GREY",
        isSaleable: false,
      };
      const nodeQ = FabricRollGenealogyService.getOrCreateRootFromFabricRollDraft(rootDraftQ);

      FabricProcessRoutingService.createRoutePlan({
        rollDraftId: nodeQ.id,
        temporaryRollNo: nodeQ.rollIdentity,
        jobCardId: nodeQ.jobCardId || "jc-5h-q",
        productionOrderId: nodeQ.productionOrderId || "po-5h-q",
        rollQtyMetre: 200,
        routeDecision: "NO_FURTHER_PROCESS",
        routeType: "STANDARD",
      });

      const qDraftQ = FabricPostProcessQualityService.createPostProcessInspectionDraft({
        rollIdentityOrNodeId: nodeQ.id,
        inspectionPurpose: "POST_PROCESS",
      });
      FabricPostProcessQualityService.savePostProcessInspection({
        inspectionDraft: qDraftQ.draft!,
        inspectedQtyMetre: 200,
        defects: [],
        proposedGrade: "A",
        gradeSource: "MANUAL",
        disposition: "ACCEPTED",
      });

      const relResQ = this.confirmCommercialReleaseSimulation({
        rollIdentityOrNodeId: nodeQ.id,
        decision: "RELEASE",
        reason: "Initial release",
      });

      // Route revised after release (new plan ID created via updateRoutePlanAsRevision)
      FabricProcessRoutingService.updateRoutePlanAsRevision({
        rollDraftId: nodeQ.id,
        routeDecision: "PROCESS_ROUTE",
        routeType: "STANDARD",
        steps: [
          {
            processId: "prc-3",
            executionMode: "INTERNAL",
            plannedQtyMetre: 200,
          },
        ],
        reason: "Process route updated for special finish",
      });

      const impactQ = this.detectRouteRevisionImpact(relResQ.release!.id);
      const passQ = impactQ.hasImpact && impactQ.reason === "RELEASE_SOURCE_ROUTE_CHANGED";

      results["Q"] = {
        status: passQ ? "PASS" : "FAIL",
        details: passQ
          ? "Route revision after release correctly marked release as REVIEW_REQUIRED."
          : `Failed Test Q: hasImpact=${impactQ.hasImpact}`,
      };
    } catch (e: any) {
      results["Q"] = { status: "FAIL", details: e?.message || String(e) };
    }

    // -------------------------------------------------------------------------
    // TEST R: Release simulation Parent later split -> Parent release historical, Children NOT released
    // -------------------------------------------------------------------------
    try {
      const rootDraftR: FabricRollDraft = {
        id: "roll-5h-r",
        receiveDraftId: "rcv-5h-r",
        jobCardId: "jc-5h-r",
        productionOrderId: "po-5h-r",
        rollSequence: 1,
        temporaryRollNo: "R-5H-R",
        qtyMetre: 200,
        inspectionStatus: "UNINSPECTED",
        stockStatus: "DRAFT_GREY",
        isSaleable: false,
      };
      const nodeR = FabricRollGenealogyService.getOrCreateRootFromFabricRollDraft(rootDraftR);

      FabricProcessRoutingService.createRoutePlan({
        rollDraftId: nodeR.id,
        temporaryRollNo: nodeR.rollIdentity,
        jobCardId: nodeR.jobCardId || "jc-5h-r",
        productionOrderId: nodeR.productionOrderId || "po-5h-r",
        rollQtyMetre: 200,
        routeDecision: "NO_FURTHER_PROCESS",
        routeType: "STANDARD",
      });

      const qDraftR = FabricPostProcessQualityService.createPostProcessInspectionDraft({
        rollIdentityOrNodeId: nodeR.id,
        inspectionPurpose: "POST_PROCESS",
      });
      FabricPostProcessQualityService.savePostProcessInspection({
        inspectionDraft: qDraftR.draft!,
        inspectedQtyMetre: 200,
        defects: [],
        proposedGrade: "A",
        gradeSource: "MANUAL",
        disposition: "ACCEPTED",
      });

      const relResR = this.confirmCommercialReleaseSimulation({
        rollIdentityOrNodeId: nodeR.id,
        decision: "RELEASE",
        reason: "Parent release",
      });

      // Split parent nodeR after release
      const splitResR = FabricRollGenealogyService.confirmSplitSimulation({
        parentNodeId: nodeR.id,
        children: [
          { childRollIdentity: "R-5H-R-C01", quantityMetre: 100 },
          { childRollIdentity: "R-5H-R-C02", quantityMetre: 100 },
        ],
        reason: "Split after release",
      });

      // Detect genealogy impact on parent
      const impactR = this.detectGenealogyImpact(relResR.release!.id);

      // Verify children have NO commercial release simulation
      const child1Summary = this.getCommercialReleaseSummary(splitResR.childNodes![0]!.id);
      const child2Summary = this.getCommercialReleaseSummary(splitResR.childNodes![1]!.id);

      const passR =
        impactR.hasImpact &&
        impactR.reason === "ROLL_SUPERSEDED_AFTER_RELEASE" &&
        child1Summary.latestReleaseSimulation === undefined &&
        child2Summary.latestReleaseSimulation === undefined;

      results["R"] = {
        status: passR ? "PASS" : "FAIL",
        details: passR
          ? "Split after release preserved parent release as historical, children did not inherit release."
          : `Failed Test R: hasImpact=${impactR.hasImpact}`,
      };
    } catch (e: any) {
      results["R"] = { status: "FAIL", details: e?.message || String(e) };
    }

    // -------------------------------------------------------------------------
    // TEST S: Sibling children (C01 released, C02 HOLD) -> Independent states, no root aggregation
    // -------------------------------------------------------------------------
    try {
      const rootDraftS: FabricRollDraft = {
        id: "roll-5h-s",
        receiveDraftId: "rcv-5h-s",
        jobCardId: "jc-5h-s",
        productionOrderId: "po-5h-s",
        rollSequence: 1,
        temporaryRollNo: "R-5H-S",
        qtyMetre: 200,
        inspectionStatus: "UNINSPECTED",
        stockStatus: "DRAFT_GREY",
        isSaleable: false,
      };
      const nodeS = FabricRollGenealogyService.getOrCreateRootFromFabricRollDraft(rootDraftS);

      const splitResS = FabricRollGenealogyService.confirmSplitSimulation({
        parentNodeId: nodeS.id,
        children: [
          { childRollIdentity: "R-5H-S-C01", quantityMetre: 100 },
          { childRollIdentity: "R-5H-S-C02", quantityMetre: 100 },
        ],
        reason: "Sibling independence test",
      });

      const child1 = splitResS.childNodes![0]!;
      const child2 = splitResS.childNodes![1]!;

      // Child 1: NO_FURTHER_PROCESS, Quality ACCEPTED, Released
      FabricProcessRoutingService.createRoutePlan({
        rollDraftId: child1.id,
        temporaryRollNo: child1.rollIdentity,
        jobCardId: "jc-5h-s",
        productionOrderId: "po-5h-s",
        rollQtyMetre: 100,
        routeDecision: "NO_FURTHER_PROCESS",
        routeType: "STANDARD",
      });
      const qDraftS1 = FabricPostProcessQualityService.createPostProcessInspectionDraft({
        rollIdentityOrNodeId: child1.id,
        inspectionPurpose: "POST_PROCESS",
      });
      FabricPostProcessQualityService.savePostProcessInspection({
        inspectionDraft: qDraftS1.draft!,
        inspectedQtyMetre: 100,
        defects: [],
        proposedGrade: "A",
        gradeSource: "MANUAL",
        disposition: "ACCEPTED",
      });
      this.confirmCommercialReleaseSimulation({
        rollIdentityOrNodeId: child1.id,
        decision: "RELEASE",
        reason: "Child 1 released",
      });

      // Child 2: Quality HOLD
      FabricProcessRoutingService.createRoutePlan({
        rollDraftId: child2.id,
        temporaryRollNo: child2.rollIdentity,
        jobCardId: "jc-5h-s",
        productionOrderId: "po-5h-s",
        rollQtyMetre: 100,
        routeDecision: "NO_FURTHER_PROCESS",
        routeType: "STANDARD",
      });
      const qDraftS2 = FabricPostProcessQualityService.createPostProcessInspectionDraft({
        rollIdentityOrNodeId: child2.id,
        inspectionPurpose: "POST_PROCESS",
      });
      FabricPostProcessQualityService.savePostProcessInspection({
        inspectionDraft: qDraftS2.draft!,
        inspectedQtyMetre: 100,
        defects: [],
        proposedGrade: "B",
        gradeSource: "MANUAL",
        disposition: "HOLD",
      });

      const rootSummaries = this.getCommercialSummaryForRoot(nodeS.id);
      const c1Summary = rootSummaries.find((s) => s.rollIdentity === "R-5H-S-C01");
      const c2Summary = rootSummaries.find((s) => s.rollIdentity === "R-5H-S-C02");

      const passS =
        c1Summary?.releaseStatus === "RELEASED_SIMULATION" &&
        c2Summary?.currentReadiness === "BLOCKED" &&
        rootSummaries.length === 2;

      results["S"] = {
        status: passS ? "PASS" : "FAIL",
        details: passS
          ? "Sibling children have completely independent commercial states; root is not aggregated as released."
          : `Failed Test S: C1 status=${c1Summary?.releaseStatus}, C2 readiness=${c2Summary?.currentReadiness}`,
      };
    } catch (e: any) {
      results["S"] = { status: "FAIL", details: e?.message || String(e) };
    }

    // -------------------------------------------------------------------------
    // TEST T: Explicit KEEP_ON_HOLD on otherwise READY roll
    // -------------------------------------------------------------------------
    try {
      const rootDraftT: FabricRollDraft = {
        id: "roll-5h-t",
        receiveDraftId: "rcv-5h-t",
        jobCardId: "jc-5h-t",
        productionOrderId: "po-5h-t",
        rollSequence: 1,
        temporaryRollNo: "R-5H-T",
        qtyMetre: 200,
        inspectionStatus: "UNINSPECTED",
        stockStatus: "DRAFT_GREY",
        isSaleable: false,
      };
      const nodeT = FabricRollGenealogyService.getOrCreateRootFromFabricRollDraft(rootDraftT);

      FabricProcessRoutingService.createRoutePlan({
        rollDraftId: nodeT.id,
        temporaryRollNo: nodeT.rollIdentity,
        jobCardId: nodeT.jobCardId || "jc-5h-t",
        productionOrderId: nodeT.productionOrderId || "po-5h-t",
        rollQtyMetre: 200,
        routeDecision: "NO_FURTHER_PROCESS",
        routeType: "STANDARD",
      });

      const qDraftT = FabricPostProcessQualityService.createPostProcessInspectionDraft({
        rollIdentityOrNodeId: nodeT.id,
        inspectionPurpose: "POST_PROCESS",
      });
      FabricPostProcessQualityService.savePostProcessInspection({
        inspectionDraft: qDraftT.draft!,
        inspectedQtyMetre: 200,
        defects: [],
        proposedGrade: "A",
        gradeSource: "MANUAL",
        disposition: "ACCEPTED",
      });

      const holdResT = this.keepCommerciallyOnHold(nodeT.id, "Commercial hold awaiting customer delivery schedule");
      const currentQualityT = FabricPostProcessQualityService.getCurrentQualitySummary(nodeT.id);

      const passT =
        holdResT.success &&
        holdResT.release?.decision === "KEEP_ON_HOLD" &&
        holdResT.release?.finishedFabricCandidateStatus === "NOT_CREATED" &&
        currentQualityT.latestDisposition === "ACCEPTED"; // Quality disposition is NOT mutated

      results["T"] = {
        status: passT ? "PASS" : "FAIL",
        details: passT
          ? "KEEP_ON_HOLD stored as commercial decision while preserving Quality ACCEPTED disposition."
          : `Failed Test T: decision=${holdResT.release?.decision}, qualityDisp=${currentQualityT.latestDisposition}`,
      };
    } catch (e: any) {
      results["T"] = { status: "FAIL", details: e?.message || String(e) };
    }

    // -------------------------------------------------------------------------
    // TEST U: Release simulation revoked with reason -> REVOKED_SIMULATION (No inventory reversal)
    // -------------------------------------------------------------------------
    try {
      const rootDraftU: FabricRollDraft = {
        id: "roll-5h-u",
        receiveDraftId: "rcv-5h-u",
        jobCardId: "jc-5h-u",
        productionOrderId: "po-5h-u",
        rollSequence: 1,
        temporaryRollNo: "R-5H-U",
        qtyMetre: 200,
        inspectionStatus: "UNINSPECTED",
        stockStatus: "DRAFT_GREY",
        isSaleable: false,
      };
      const nodeU = FabricRollGenealogyService.getOrCreateRootFromFabricRollDraft(rootDraftU);

      FabricProcessRoutingService.createRoutePlan({
        rollDraftId: nodeU.id,
        temporaryRollNo: nodeU.rollIdentity,
        jobCardId: nodeU.jobCardId || "jc-5h-u",
        productionOrderId: nodeU.productionOrderId || "po-5h-u",
        rollQtyMetre: 200,
        routeDecision: "NO_FURTHER_PROCESS",
        routeType: "STANDARD",
      });

      const qDraftU = FabricPostProcessQualityService.createPostProcessInspectionDraft({
        rollIdentityOrNodeId: nodeU.id,
        inspectionPurpose: "POST_PROCESS",
      });
      FabricPostProcessQualityService.savePostProcessInspection({
        inspectionDraft: qDraftU.draft!,
        inspectedQtyMetre: 200,
        defects: [],
        proposedGrade: "A",
        gradeSource: "MANUAL",
        disposition: "ACCEPTED",
      });

      const relResU = this.confirmCommercialReleaseSimulation({
        rollIdentityOrNodeId: nodeU.id,
        decision: "RELEASE",
        reason: "Valid release",
      });

      const revokeResU = this.revokeCommercialReleaseSimulation(
        relResU.release!.id,
        "Customer order cancelled"
      );

      const passU =
        revokeResU.success &&
        revokeResU.release?.status === "REVOKED_SIMULATION" &&
        revokeResU.release?.candidate === undefined &&
        revokeResU.release?.revocationReason === "Customer order cancelled";

      results["U"] = {
        status: passU ? "PASS" : "FAIL",
        details: passU
          ? "Commercial release simulation revoked with reason, historical release retained, zero inventory reversal."
          : `Failed Test U: status=${revokeResU.release?.status}`,
      };
    } catch (e: any) {
      results["U"] = { status: "FAIL", details: e?.message || String(e) };
    }

    // -------------------------------------------------------------------------
    // TEST V: Roll Qty changes after release -> release REVIEW_REQUIRED, candidate Qty not silently changed
    // -------------------------------------------------------------------------
    try {
      const rootDraftV: FabricRollDraft = {
        id: "roll-5h-v",
        receiveDraftId: "rcv-5h-v",
        jobCardId: "jc-5h-v",
        productionOrderId: "po-5h-v",
        rollSequence: 1,
        temporaryRollNo: "R-5H-V",
        qtyMetre: 200,
        inspectionStatus: "UNINSPECTED",
        stockStatus: "DRAFT_GREY",
        isSaleable: false,
      };
      const nodeV = FabricRollGenealogyService.getOrCreateRootFromFabricRollDraft(rootDraftV);

      FabricProcessRoutingService.createRoutePlan({
        rollDraftId: nodeV.id,
        temporaryRollNo: nodeV.rollIdentity,
        jobCardId: nodeV.jobCardId || "jc-5h-v",
        productionOrderId: nodeV.productionOrderId || "po-5h-v",
        rollQtyMetre: 200,
        routeDecision: "NO_FURTHER_PROCESS",
        routeType: "STANDARD",
      });

      const qDraftV = FabricPostProcessQualityService.createPostProcessInspectionDraft({
        rollIdentityOrNodeId: nodeV.id,
        inspectionPurpose: "POST_PROCESS",
      });
      FabricPostProcessQualityService.savePostProcessInspection({
        inspectionDraft: qDraftV.draft!,
        inspectedQtyMetre: 200,
        defects: [],
        proposedGrade: "A",
        gradeSource: "MANUAL",
        disposition: "ACCEPTED",
      });

      const relResV = this.confirmCommercialReleaseSimulation({
        rollIdentityOrNodeId: nodeV.id,
        decision: "RELEASE",
        reason: "Valid release",
      });

      // Simulate roll quantity modification on the node
      nodeV.quantityMetre = 190;

      const impactV = this.detectRollQtyImpact(relResV.release!.id);
      const passV =
        impactV.hasImpact &&
        impactV.reason === "ROLL_QTY_CHANGED_AFTER_RELEASE" &&
        relResV.release?.candidate?.qtyMetre === 200; // Candidate qty snapshot was not silently overwritten

      results["V"] = {
        status: passV ? "PASS" : "FAIL",
        details: passV
          ? "Roll quantity change after release marked release as REVIEW_REQUIRED without silently mutating candidate."
          : `Failed Test V: hasImpact=${impactV.hasImpact}`,
      };
    } catch (e: any) {
      results["V"] = { status: "FAIL", details: e?.message || String(e) };
    }

    // -------------------------------------------------------------------------
    // TEST W: Release simulation -> No Production Order completion, No Sales Order completion, Dispatch Ready NO
    // -------------------------------------------------------------------------
    try {
      const rootDraftW: FabricRollDraft = {
        id: "roll-5h-w",
        receiveDraftId: "rcv-5h-w",
        jobCardId: "jc-5h-w",
        productionOrderId: "po-5h-w",
        rollSequence: 1,
        temporaryRollNo: "R-5H-W",
        qtyMetre: 200,
        inspectionStatus: "UNINSPECTED",
        stockStatus: "DRAFT_GREY",
        isSaleable: false,
      };
      const nodeW = FabricRollGenealogyService.getOrCreateRootFromFabricRollDraft(rootDraftW);

      FabricProcessRoutingService.createRoutePlan({
        rollDraftId: nodeW.id,
        temporaryRollNo: nodeW.rollIdentity,
        jobCardId: nodeW.jobCardId || "jc-5h-w",
        productionOrderId: nodeW.productionOrderId || "po-5h-w",
        rollQtyMetre: 200,
        routeDecision: "NO_FURTHER_PROCESS",
        routeType: "STANDARD",
      });

      const qDraftW = FabricPostProcessQualityService.createPostProcessInspectionDraft({
        rollIdentityOrNodeId: nodeW.id,
        inspectionPurpose: "POST_PROCESS",
      });
      FabricPostProcessQualityService.savePostProcessInspection({
        inspectionDraft: qDraftW.draft!,
        inspectedQtyMetre: 200,
        defects: [],
        proposedGrade: "A",
        gradeSource: "MANUAL",
        disposition: "ACCEPTED",
      });

      const relResW = this.confirmCommercialReleaseSimulation({
        rollIdentityOrNodeId: nodeW.id,
        decision: "RELEASE",
        reason: "Valid release",
      });

      const candidateW = relResW.release?.candidate;
      const passW =
        relResW.success &&
        candidateW?.isDispatchReady === false &&
        candidateW?.isPhysicalInventory === false;

      results["W"] = {
        status: passW ? "PASS" : "FAIL",
        details: passW
          ? "Commercial release simulation confirmed with isDispatchReady=false and isPhysicalInventory=false."
          : `Failed Test W: isDispatchReady=${candidateW?.isDispatchReady}`,
      };
    } catch (e: any) {
      results["W"] = { status: "FAIL", details: e?.message || String(e) };
    }

    const allPassed = Object.values(results).every((r) => r.status === "PASS");
    return { allPassed, results };
  }
}

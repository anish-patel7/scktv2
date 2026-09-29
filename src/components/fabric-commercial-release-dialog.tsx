import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Sparkles,
  GitBranch,
  Layers,
  ArrowRight,
  Info,
  RefreshCw,
  Ban,
  Tag,
  FileText,
  Building2,
  Check,
  X,
  Package,
} from "lucide-react";
import {
  FabricCommercialReleaseService,
  type CommercialReleaseReadiness,
  type CommercialReleaseStatus,
  type CommercialReleaseDecision,
  type FinishedFabricCandidate,
  type FabricCommercialReleaseSimulation,
} from "@/services/fabric-commercial-release.service";
import { FabricRollGenealogyService } from "@/services/fabric-roll-genealogy.service";
import { FabricPostProcessQualityHistory } from "@/components/fabric-post-process-quality-history";
import { FabricCommercialReleaseHistory } from "@/components/fabric-commercial-release-history";
import { type JobCardDraft } from "@/services/production-planning.service";
import type { ProductionOrder } from "@/lib/production-store";

interface FabricCommercialReleaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rollNodeIdOrIdentity: string;
  order?: ProductionOrder | null | undefined;
  jobCard?: JobCardDraft | null | undefined;
  onReleaseConfirmed?: (() => void) | undefined;
}

const READINESS_BADGES: Record<CommercialReleaseReadiness, { label: string; class: string; icon: any }> = {
  READY_FOR_REVIEW: {
    label: "READY FOR COMMERCIAL RELEASE REVIEW",
    class: "border-emerald-500/60 text-emerald-300 bg-emerald-500/15 font-semibold",
    icon: CheckCircle2,
  },
  NOT_READY: {
    label: "NOT READY FOR COMMERCIAL REVIEW",
    class: "border-amber-500/60 text-amber-300 bg-amber-500/15 font-semibold",
    icon: Clock,
  },
  REVIEW_REQUIRED: {
    label: "REVIEW REQUIRED BEFORE RELEASE",
    class: "border-purple-500/60 text-purple-300 bg-purple-500/15 font-semibold",
    icon: AlertTriangle,
  },
  BLOCKED: {
    label: "COMMERCIAL RELEASE BLOCKED",
    class: "border-rose-500/60 text-rose-300 bg-rose-500/15 font-semibold",
    icon: AlertOctagon,
  },
};

const GRADE_BADGES: Record<string, string> = {
  A: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
  B: "border-blue-500/40 text-blue-300 bg-blue-500/10",
  C: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  REJECT: "border-rose-500/40 text-rose-300 bg-rose-500/10",
  UNASSIGNED: "border-slate-700 text-slate-400 bg-slate-900",
};

const DISPOSITION_BADGES: Record<string, string> = {
  ACCEPTED: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
  HOLD: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  REWORK: "border-orange-500/40 text-orange-300 bg-orange-500/10",
  REJECT: "border-rose-500/40 text-rose-300 bg-rose-500/10",
  PROCESS_REQUIRED: "border-purple-500/40 text-purple-300 bg-purple-500/10",
  NOT_SET: "border-slate-700 text-slate-400 bg-slate-900",
};

const BLOCKER_MESSAGES: Record<string, string> = {
  ROLL_NOT_ACTIVE: "Roll identity is not active.",
  ROLL_NOT_LEAF: "Only active leaf rolls or unsplit roots can be reviewed for commercial release.",
  ROLL_SUPERSEDED_BY_SPLIT: "Roll was superseded by a split. Commercial release review must apply to active child rolls.",
  PROCESS_ROUTE_INCOMPLETE: "Process route has pending unfinished operations. Process route must be 100% completed.",
  PROCESS_ROUTE_REVIEW_REQUIRED: "Process route is flagged for review and cannot proceed to commercial release.",
  NO_CURRENT_QUALITY: "No post-process quality inspection recorded for this physical roll identity.",
  QUALITY_INSPECTION_INCOMPLETE: "Quality inspection is partial (<100% coverage). Full inspection coverage is required.",
  QUALITY_REVIEW_REQUIRED: "Quality inspection requires review due to upstream changes or flags.",
  QUALITY_HOLD: "Quality inspection disposition is HOLD. Commercial release is blocked.",
  QUALITY_REWORK: "Quality inspection disposition is REWORK. Downstream process route review is required.",
  QUALITY_PROCESS_REQUIRED: "Quality inspection disposition is PROCESS_REQUIRED. Route review is required.",
  QUALITY_REJECT: "Quality inspection disposition is REJECT. Commercial release is blocked.",
  GRADE_POLICY_NOT_CONFIGURED: "Quality grade is UNASSIGNED. Mandatory grade policy is not configured.",
  QUALITY_SOURCE_STALE: "Quality inspection record is stale relative to recent process receipts.",
  ROLL_QTY_CHANGED: "Active roll quantity changed after routing or quality inspection.",
  GENEALOGY_CHANGED: "Genealogy status changed.",
};

export function FabricCommercialReleaseDialog({
  open,
  onOpenChange,
  rollNodeIdOrIdentity,
  order,
  jobCard,
  onReleaseConfirmed,
}: FabricCommercialReleaseDialogProps) {
  const [activeTab, setActiveTab] = useState<"evaluation" | "candidate" | "history" | "traceability">("evaluation");
  const [decision, setDecision] = useState<CommercialReleaseDecision>("RELEASE");
  const [reason, setReason] = useState<string>("");
  const [operatorName, setOperatorName] = useState<string>("");
  const [isRevising, setIsRevising] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Run authoritative service evaluation
  const readiness = useMemo(() => {
    if (!rollNodeIdOrIdentity) return null;
    return FabricCommercialReleaseService.evaluateCommercialReleaseReadiness(rollNodeIdOrIdentity);
  }, [rollNodeIdOrIdentity, open, successMessage]);

  // Current active commercial release simulation
  const currentRelease = useMemo(() => {
    if (!readiness?.node?.id) return undefined;
    return FabricCommercialReleaseService.getCurrentCommercialRelease(readiness.node.id);
  }, [readiness, successMessage]);

  // Detect impacts on existing release
  const impactSummary = useMemo(() => {
    if (!currentRelease) return null;
    const qImpact = FabricCommercialReleaseService.detectQualityRevisionImpact(currentRelease.id);
    const rImpact = FabricCommercialReleaseService.detectRouteRevisionImpact(currentRelease.id);
    const gImpact = FabricCommercialReleaseService.detectGenealogyImpact(currentRelease.id);
    const qtyImpact = FabricCommercialReleaseService.detectRollQtyImpact(currentRelease.id);

    return {
      hasImpact: qImpact.hasImpact || rImpact.hasImpact || gImpact.hasImpact || qtyImpact.hasImpact,
      details: [
        qImpact.hasImpact ? qImpact.message : null,
        rImpact.hasImpact ? rImpact.message : null,
        gImpact.hasImpact ? gImpact.message : null,
        qtyImpact.hasImpact ? qtyImpact.message : null,
      ].filter(Boolean),
    };
  }, [currentRelease, open]);

  const node = readiness?.node;
  const isSuperseded = node?.identityStatus === "SUPERSEDED_BY_SPLIT";
  const isEligibleForReview = readiness?.readiness === "READY_FOR_REVIEW";
  const isCurrentlyReleased = currentRelease?.status === "RELEASED_SIMULATION";

  // Handle release submit
  const handleConfirmSubmit = () => {
    if (!readiness || !node) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    if (decision === "RELEASE" && (!reason || !reason.trim())) {
      setErrorMessage("A commercial release reason / remark is mandatory for commercial release.");
      return;
    }

    if (decision === "KEEP_ON_HOLD" && (!reason || !reason.trim())) {
      setErrorMessage("A commercial hold reason is mandatory.");
      return;
    }

    if (isRevising && currentRelease) {
      const res = FabricCommercialReleaseService.reviseCommercialReleaseSimulation(
        currentRelease.id,
        decision,
        reason.trim()
      );
      if (!res.success) {
        setErrorMessage(res.error || "Failed to revise commercial release simulation.");
        return;
      }
      setSuccessMessage("Commercial release simulation revised successfully.");
      setIsRevising(false);
      onReleaseConfirmed?.();
      return;
    }

    const res = FabricCommercialReleaseService.confirmCommercialReleaseSimulation({
      rollIdentityOrNodeId: node.id,
      decision,
      reason: reason.trim(),
      operatorName: operatorName.trim() || undefined,
    });

    if (!res.success) {
      setErrorMessage(res.errors.join(", ") || "Failed to confirm commercial release simulation.");
      return;
    }

    setSuccessMessage(
      decision === "RELEASE"
        ? "Commercial release simulation recorded. Finished fabric candidate derived."
        : "Commercial hold decision recorded. Quality inspection disposition preserved."
    );
    setReason("");
    onReleaseConfirmed?.();
  };

  if (!readiness || !node) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-white font-sans p-6 text-center">
          <p className="text-slate-400 text-sm">Roll identity not found.</p>
        </DialogContent>
      </Dialog>
    );
  }

  const badgeConfig = READINESS_BADGES[readiness.readiness];
  const ReadinessIcon = badgeConfig.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-slate-900 border-slate-800 text-white font-sans max-h-[92vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-800 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <span>Commercial Release Review & Simulation</span>
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Phase 5H Step 2 · Active Physical Roll Readiness & Derived Finished Candidate
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-indigo-500/40 text-indigo-300 font-mono text-xs">
                {node.rollIdentity}
              </Badge>
              {node.generation === 0 ? (
                <Badge variant="outline" className="border-cyan-500/40 text-cyan-300 text-[10px]">
                  ROOT ROLL
                </Badge>
              ) : (
                <Badge variant="outline" className="border-slate-700 text-slate-400 text-[10px]">
                  GEN {node.generation}
                </Badge>
              )}
              {isSuperseded && (
                <Badge variant="outline" className="border-slate-700 text-slate-500 text-[10px] line-through">
                  SUPERSEDED
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full">
          <TabsList className="grid grid-cols-4 bg-slate-950/80 border border-slate-800 text-xs p-1 h-9">
            <TabsTrigger value="evaluation" className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              Readiness & Release
            </TabsTrigger>
            <TabsTrigger value="candidate" className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              Finished Candidate
            </TabsTrigger>
            <TabsTrigger value="traceability" className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              Full Lineage
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              Audit History
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: READINESS & RELEASE DECISION */}
          <TabsContent value="evaluation" className="space-y-4 pt-2">
            {/* Impact Banner if Stale */}
            {impactSummary?.hasImpact && (
              <div className="p-3 rounded bg-rose-950/30 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5">
                <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block uppercase text-[10px] text-rose-400">
                    Upstream Change Detected After Release:
                  </span>
                  {impactSummary.details.map((msg, i) => (
                    <p key={i} className="text-[11px] text-slate-300">
                      • {msg}
                    </p>
                  ))}
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Release simulation marked REVIEW_REQUIRED. Re-evaluation or revision required.
                  </span>
                </div>
              </div>
            )}

            {/* Inherited Context Grid (Step 5, Step 31, 33, 34) */}
            <Card className="bg-slate-950/70 border-slate-800 text-xs">
              <CardContent className="p-3 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Inherited Context (Read-Only Authority)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Active Roll Qty</span>
                    <span className="text-sm font-bold font-mono text-white block mt-0.5">
                      {node.quantityMetre.toFixed(3)} MTR
                    </span>
                    <span className="text-[9px] text-slate-500 block">Strictly read-only</span>
                  </div>

                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Process Route Status</span>
                    <span className="text-xs font-bold font-mono text-cyan-300 block mt-0.5">
                      {readiness.isNoFurtherProcess
                        ? "NO FURTHER PROCESS"
                        : readiness.isRouteCompletePreview
                        ? "ROUTE COMPLETE PREVIEW"
                        : "INCOMPLETE"}
                    </span>
                    <span className="text-[9px] text-slate-500 block">
                      {readiness.routePlan ? `Plan: ${readiness.routePlan.id}` : "No Route Plan"}
                    </span>
                  </div>

                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Current Quality</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="outline" className={`text-[10px] ${GRADE_BADGES[readiness.currentGrade]}`}>
                        Grade {readiness.currentGrade}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] ${DISPOSITION_BADGES[readiness.currentDisposition]}`}>
                        {readiness.currentDisposition}
                      </Badge>
                    </div>
                    <span className="text-[9px] text-slate-500 block mt-0.5">
                      Coverage: {readiness.coveragePercent.toFixed(0)}%
                    </span>
                  </div>

                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Production Traceability</span>
                    <span className="text-xs font-mono text-slate-300 block mt-0.5 truncate">
                      {node.productionOrderId || "PO-N/A"}
                    </span>
                    <span className="text-[9px] text-slate-500 block truncate">
                      JC: {node.jobCardId || "JC-N/A"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Commercial Release Readiness Panel (Step 6) */}
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <ReadinessIcon className="w-5 h-5 text-indigo-400" />
                    <div>
                      <span className="text-xs uppercase font-bold text-slate-400 block">
                        Commercial Release Readiness
                      </span>
                      <Badge variant="outline" className={`mt-1 text-xs py-0.5 ${badgeConfig.class}`}>
                        {badgeConfig.label}
                      </Badge>
                    </div>
                  </div>

                  <div className="text-right text-[10px] font-mono text-slate-400">
                    <div>Exact Roll: {node.rollIdentity}</div>
                    <div>Quality: {readiness.qualitySummary?.latestInspection?.id || "None"}</div>
                  </div>
                </div>

                {/* Blockers List */}
                {readiness.blockers.length > 0 && (
                  <div className="p-3 rounded bg-rose-950/20 border border-rose-500/30 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-rose-400 flex items-center gap-1.5">
                      <AlertOctagon className="w-3.5 h-3.5" />
                      Blocker Conditions ({readiness.blockers.length}):
                    </span>
                    <ul className="space-y-1 text-xs text-rose-200">
                      {readiness.blockers.map((b) => (
                        <li key={b} className="flex items-start gap-1.5">
                          <X className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
                          <span>{BLOCKER_MESSAGES[b] || b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Warnings List */}
                {readiness.warnings.length > 0 && (
                  <div className="p-2.5 rounded bg-amber-950/20 border border-amber-500/30 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Advisory Warnings:
                    </span>
                    <ul className="space-y-0.5 text-xs text-amber-200">
                      {readiness.warnings.map((w, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <Info className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Invariant Warnings / Critical Distinctions (Step 7, 26, 52) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1">
                  <div className="p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="font-semibold text-slate-300 block">Critical Distinction:</span>
                    <p className="mt-0.5 text-slate-400">
                      Quality Accepted ≠ Commercially Released ≠ Finished Stock Posted.
                      This system executes simulation only.
                    </p>
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="font-semibold text-slate-300 block">Authorization Policy:</span>
                    <p className="mt-0.5 text-slate-400 italic">
                      Commercial release authorization policy is not configured. No real stock posting.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Release Status Banner (if already released) */}
            {isCurrentlyReleased && !isRevising && (
              <div className="p-3.5 rounded bg-emerald-950/20 border border-emerald-500/40 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <div>
                      <span className="text-xs font-bold text-emerald-200 block">
                        COMMERCIALLY RELEASED — SIMULATION
                      </span>
                      <span className="text-[10px] text-emerald-300/80 font-mono">
                        Ref: {currentRelease?.id} · Date: {new Date(currentRelease?.createdAt || "").toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsRevising(true);
                        setDecision(currentRelease?.decision || "RELEASE");
                        setReason("");
                      }}
                      className="h-7 text-xs border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Revise Release
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Release Reason / Remark:</span>
                  <p>{currentRelease?.releaseReason || currentRelease?.holdReason || "No remark provided."}</p>
                </div>
              </div>
            )}

            {/* Commercial Decision Form (Step 24, 25, 27, 35) */}
            {(!isCurrentlyReleased || isRevising) && (
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-4 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold uppercase text-slate-300 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-indigo-400" />
                      {isRevising ? "Revise Commercial Decision" : "Commercial Decision"}
                    </span>
                    {isRevising && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsRevising(false)}
                        className="h-6 text-[10px] text-slate-400 hover:text-white"
                      >
                        Cancel Revision
                      </Button>
                    )}
                  </div>

                  {isSuperseded ? (
                    <div className="p-3 rounded bg-slate-950 border border-slate-800 text-xs text-slate-400">
                      <p className="font-semibold text-slate-300">Superseded Parent Roll:</p>
                      <p className="mt-0.5">
                        This roll was superseded by split. Commercial release review must be performed independently on active child rolls.
                      </p>
                    </div>
                  ) : !isEligibleForReview ? (
                    <div className="p-3 rounded bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
                      <p className="font-semibold text-amber-300">Action Unavailable:</p>
                      <p className="text-[11px] text-slate-400">
                        Commercial release simulation requires the roll to satisfy all route and quality prerequisites (Current readiness: {readiness.readiness}).
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Decision Radio/Buttons */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-slate-300 block">
                          Select Commercial Decision:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setDecision("RELEASE")}
                            className={`p-2.5 rounded text-left border transition-all ${
                              decision === "RELEASE"
                                ? "bg-emerald-950/30 border-emerald-500/60 text-emerald-200"
                                : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                            }`}
                          >
                            <span className="text-xs font-bold block flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              RELEASE
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Release for commercial simulation; derive Finished Fabric candidate.
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDecision("KEEP_ON_HOLD")}
                            className={`p-2.5 rounded text-left border transition-all ${
                              decision === "KEEP_ON_HOLD"
                                ? "bg-amber-950/30 border-amber-500/60 text-amber-200"
                                : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                            }`}
                          >
                            <span className="text-xs font-bold block flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              KEEP ON HOLD (COMMERCIAL)
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Separate commercial hold; preserves Quality ACCEPTED disposition.
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Reason Field (Mandatory) */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-slate-300 block">
                          {decision === "RELEASE" ? "Release Reason / Commercial Remark" : "Commercial Hold Reason"}{" "}
                          <span className="text-rose-400">*</span>
                        </label>
                        <Textarea
                          placeholder={
                            decision === "RELEASE"
                              ? "Enter reason / remarks for commercial release (e.g. Route complete, customer specs met)..."
                              : "Enter reason for placing on commercial hold..."
                          }
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          className="bg-slate-950 border-slate-800 text-xs min-h-[70px]"
                        />
                      </div>

                      {/* Operator Remark / Name */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-slate-300 block">
                          Operator Name / ID (Optional)
                        </label>
                        <Input
                          placeholder="e.g. QA Manager / Release Reviewer"
                          value={operatorName}
                          onChange={(e) => setOperatorName(e.target.value)}
                          className="bg-slate-950 border-slate-800 text-xs h-8"
                        />
                      </div>

                      {/* Safety Confirmation / Button */}
                      <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                        <div className="text-[10px] text-slate-400 italic">
                          Button strictly records simulation. Zero real finished stock insertion.
                        </div>

                        <Button
                          size="sm"
                          onClick={handleConfirmSubmit}
                          disabled={!reason.trim()}
                          className={`text-xs px-4 h-8 ${
                            decision === "RELEASE"
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                              : "bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                          {isRevising
                            ? "Confirm Revision Simulation"
                            : decision === "RELEASE"
                            ? "Confirm Release Simulation"
                            : "Confirm Commercial Hold"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {errorMessage && (
                    <div className="p-2.5 rounded bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs">
                      {errorMessage}
                    </div>
                  )}

                  {successMessage && (
                    <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs">
                      {successMessage}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TAB 2: FINISHED FABRIC CANDIDATE (Step 30, 31, 32, 33, 34) */}
          <TabsContent value="candidate" className="space-y-4 pt-2">
            {currentRelease?.candidate ? (
              <Card className="bg-slate-900 border-purple-500/30">
                <CardContent className="p-4 space-y-4">
                  {/* Candidate Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-500/20 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                      <div>
                        <span className="text-sm font-bold text-purple-200 block">
                          DERIVED FINISHED FABRIC CANDIDATE
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          Commercial Simulation ID: {currentRelease.id}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-purple-500/40 text-purple-300 font-mono text-xs">
                      {currentRelease.candidate.rollIdentity}
                    </Badge>
                  </div>

                  {/* Mandatory Safety Notice */}
                  <div className="p-3 rounded bg-purple-950/30 border border-purple-500/30 text-purple-200 text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-purple-300" />
                      <span>CANDIDATE ONLY — NOT INVENTORY</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      This is a derived preview candidate for commercial workflows.
                      No Finished Fabric stock posting, warehouse assignment, QR code generation, or financial valuation has taken place.
                    </p>
                  </div>

                  {/* Candidate Attributes Grid (Read-Only) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-medium block">
                        Candidate Roll Identity
                      </span>
                      <span className="font-mono text-sm font-bold text-white block mt-0.5">
                        {currentRelease.candidate.rollIdentity}
                      </span>
                      <span className="text-[9px] text-slate-500 block">
                        Exact physical roll identity preserved
                      </span>
                    </div>

                    <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-medium block">
                        Candidate Quantity
                      </span>
                      <span className="font-mono text-sm font-bold text-cyan-300 block mt-0.5">
                        {currentRelease.candidate.qtyMetre.toFixed(3)} MTR
                      </span>
                      <span className="text-[9px] text-slate-500 block">
                        Inherited from active physical roll
                      </span>
                    </div>

                    <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-medium block">
                        Quality Grade
                      </span>
                      <div className="mt-1">
                        <Badge variant="outline" className={`text-xs ${GRADE_BADGES[currentRelease.candidate.grade]}`}>
                          Grade {currentRelease.candidate.grade}
                        </Badge>
                      </div>
                      <span className="text-[9px] text-slate-500 block mt-1">
                        From Quality: {currentRelease.candidate.qualityInspectionId}
                      </span>
                    </div>

                    <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-medium block">
                        Disposition
                      </span>
                      <div className="mt-1">
                        <Badge variant="outline" className={`text-xs ${DISPOSITION_BADGES[currentRelease.candidate.disposition]}`}>
                          {currentRelease.candidate.disposition}
                        </Badge>
                      </div>
                      <span className="text-[9px] text-slate-500 block mt-1">
                        Post-process verified
                      </span>
                    </div>
                  </div>

                  {/* Safety Assertions Grid (Step 28, 52, 53, 54, 55) */}
                  <div className="p-3 rounded bg-slate-950/80 border border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Inventory & Commercial Safety Boundaries
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Finished Stock: <strong className="text-white">NO</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Inventory Movement: <strong className="text-white">NONE</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Dispatch Ready: <strong className="text-white">NOT EVALUATED</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Production Order: <strong className="text-white">IN PROGRESS</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Stock Valuation: <strong className="text-white">NONE</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Warehouse / Rack: <strong className="text-white">UNASSIGNED</strong></span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-slate-900 border-slate-800 text-center py-10">
                <CardContent className="space-y-2">
                  <Package className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-300">No Finished Fabric candidate derived yet.</p>
                  <p className="text-[10px] text-slate-500">
                    A candidate is automatically derived when an explicit RELEASE simulation is confirmed.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TAB 3: TRACEABILITY LINEAGE (Step 48, 51) */}
          <TabsContent value="traceability" className="space-y-4 pt-2">
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4 space-y-4">
                <span className="text-xs font-bold uppercase text-slate-300 block">
                  End-to-End Production & Commercial Lineage
                </span>

                <div className="space-y-3 relative pl-6 border-l-2 border-slate-800 font-sans text-xs">
                  {/* Step 1: Sales Order */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-slate-800 border-2 border-indigo-400 flex items-center justify-center text-[9px] text-indigo-300">
                      1
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-semibold">Sales Order</span>
                      <p className="font-mono text-white text-xs">{node.salesOrderId || "SO-SIM"}</p>
                    </div>
                  </div>

                  {/* Step 2: Production Order */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-slate-800 border-2 border-indigo-400 flex items-center justify-center text-[9px] text-indigo-300">
                      2
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-semibold">Production Order</span>
                      <p className="font-mono text-white text-xs">{node.productionOrderId || "PO-SIM"}</p>
                    </div>
                  </div>

                  {/* Step 3: Job Card */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-slate-800 border-2 border-indigo-400 flex items-center justify-center text-[9px] text-indigo-300">
                      3
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-semibold">Job Card</span>
                      <p className="font-mono text-white text-xs">{node.jobCardId || "JC-SIM"}</p>
                    </div>
                  </div>

                  {/* Step 4: Physical Roll Identity & Genealogy */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-slate-800 border-2 border-indigo-400 flex items-center justify-center text-[9px] text-indigo-300">
                      4
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-semibold">Active Roll Identity</span>
                      <p className="font-mono text-indigo-300 text-xs font-bold">
                        {node.rollIdentity} ({node.quantityMetre.toFixed(3)} MTR)
                      </p>
                      <span className="text-[10px] text-slate-500 block">
                        Root: {node.rootRollIdentity} · Gen: {node.generation}
                      </span>
                    </div>
                  </div>

                  {/* Step 5: Process Routing */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-slate-800 border-2 border-indigo-400 flex items-center justify-center text-[9px] text-indigo-300">
                      5
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-semibold">Downstream Route</span>
                      <p className="font-mono text-white text-xs">
                        {readiness.isNoFurtherProcess
                          ? "NO FURTHER PROCESS"
                          : readiness.routePlan
                          ? `Plan: ${readiness.routePlan.id} (${readiness.routePlan.steps.length} Steps)`
                          : "No Route Planned"}
                      </p>
                    </div>
                  </div>

                  {/* Step 6: Current Valid Quality */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-slate-800 border-2 border-indigo-400 flex items-center justify-center text-[9px] text-indigo-300">
                      6
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-semibold">Post-Process Quality</span>
                      <p className="font-mono text-white text-xs">
                        {readiness.qualitySummary?.latestInspection
                          ? `${readiness.qualitySummary.latestInspection.id} (Grade ${readiness.currentGrade} · ${readiness.currentDisposition})`
                          : "No Quality Inspection"}
                      </p>
                    </div>
                  </div>

                  {/* Step 7: Commercial Release Simulation */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-slate-800 border-2 border-emerald-400 flex items-center justify-center text-[9px] text-emerald-300">
                      7
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-semibold">Commercial Release Simulation</span>
                      <p className="font-mono text-emerald-300 text-xs font-bold">
                        {currentRelease ? `${currentRelease.id} (${currentRelease.status})` : "Pending Evaluation"}
                      </p>
                    </div>
                  </div>

                  {/* Step 8: Derived Finished Fabric Candidate */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-slate-800 border-2 border-purple-400 flex items-center justify-center text-[9px] text-purple-300">
                      8
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-semibold">Finished Fabric Candidate</span>
                      <p className="font-mono text-purple-300 text-xs font-bold">
                        {currentRelease?.candidate
                          ? `${currentRelease.candidate.rollIdentity} (${currentRelease.candidate.qtyMetre.toFixed(3)} MTR) [CANDIDATE ONLY]`
                          : "Not Created"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: AUDIT HISTORY */}
          <TabsContent value="history" className="space-y-4 pt-2">
            <FabricCommercialReleaseHistory
              rollIdentityOrNodeId={node.id}
              onRefresh={() => {
                onReleaseConfirmed?.();
              }}
              onReviseRequested={(rel) => {
                setActiveTab("evaluation");
                setIsRevising(true);
                setDecision(rel.decision);
                setReason("");
              }}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t border-slate-800 pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs border-slate-700 text-slate-300"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

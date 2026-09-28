import React, { useState, useEffect, useMemo } from "react";
import {
  Route,
  Layers,
  ArrowRight,
  PlusCircle,
  History,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Sparkles,
  Info,
  Package,
  Cpu,
  Building2,
  FileCheck2,
  Lock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  FabricProcessRoutingService,
  type CreateRouteStepInput,
  type FabricProcessRouteDecision,
  type FabricProcessRoutePlan,
  type FabricProcessRouteStatus,
  type FabricProcessRouteType,
  type ProcessHint,
  type ProcessMasterRecord,
} from "@/services/fabric-process-routing.service";
import {
  ProductionPlanningService,
  type FabricRollDraft,
  type RollQualitySummary,
  type JobCardDraft,
} from "@/services/production-planning.service";
import type { ProductionOrder } from "@/lib/production-store";
import { FabricProcessRouteStepEditor } from "@/components/fabric-process-route-step-editor";
import { FabricProcessRouteHistory } from "@/components/fabric-process-route-history";

interface FabricProcessRouteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roll: FabricRollDraft | null;
  order?: ProductionOrder | null | undefined;
  jobCard?: JobCardDraft | null | undefined;
  onSaved?: () => void;
}

const ROUTE_STATUS_BADGES: Record<FabricProcessRouteStatus, { label: string; class: string; icon: any }> = {
  READY: { label: "ROUTE READY", class: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10", icon: CheckCircle2 },
  PLANNED: { label: "PLANNED", class: "border-blue-500/40 text-blue-300 bg-blue-500/10", icon: Info },
  BLOCKED: { label: "BLOCKED", class: "border-rose-500/40 text-rose-300 bg-rose-500/10", icon: ShieldAlert },
  REVIEW_REQUIRED: { label: "REVIEW REQUIRED", class: "border-amber-500/40 text-amber-300 bg-amber-500/10", icon: AlertTriangle },
  NOT_PLANNED: { label: "NOT PLANNED", class: "border-slate-700 text-slate-400 bg-slate-900", icon: Clock },
};

export function FabricProcessRouteDialog({
  open,
  onOpenChange,
  roll,
  order,
  jobCard,
  onSaved,
}: FabricProcessRouteDialogProps) {
  const [activeView, setActiveView] = useState<"editor" | "history">("editor");

  // Route Planning State
  const [routeDecision, setRouteDecision] = useState<FabricProcessRouteDecision>("PROCESS_ROUTE");
  const [routeType, setRouteType] = useState<FabricProcessRouteType>("STANDARD");
  const [steps, setSteps] = useState<CreateRouteStepInput[]>([]);
  const [revisionReason, setRevisionReason] = useState<string>("");

  // Upstream Quality & Roll context
  const qualitySummary: RollQualitySummary | null = useMemo(() => {
    if (!roll) return null;
    return ProductionPlanningService.getRollQualitySummary(roll);
  }, [roll]);

  // Existing Route Plan (if already saved)
  const existingPlan: FabricProcessRoutePlan | undefined = useMemo(() => {
    if (!roll) return undefined;
    // Recheck readiness against live masters
    return FabricProcessRoutingService.recheckRoutePlanReadiness(
      roll.id,
      qualitySummary?.disposition,
      roll.qtyMetre
    ) || FabricProcessRoutingService.getRoutePlanForRoll(roll.id);
  }, [roll, qualitySummary]);

  // Revision history
  const revisionHistory = useMemo(() => {
    if (!roll) return [];
    return FabricProcessRoutingService.getRouteRevisionHistory(roll.id);
  }, [roll, existingPlan]);

  // Process and Party authorities
  const availableProcesses: ProcessMasterRecord[] = useMemo(() => {
    return FabricProcessRoutingService.getAvailableProcesses();
  }, []);

  const eligibleParties = useMemo(() => {
    return FabricProcessRoutingService.getEligibleJobWorkParties();
  }, []);

  // Process Hints from Cost Sheet & Item Master (Step 7, 8, 9)
  const processHints: ProcessHint[] = useMemo(() => {
    return FabricProcessRoutingService.getProcessHints({
      costSheet: null, // cost sheet hints retrieved dynamically if attached to order
      item: {
        description: order?.item_code || undefined,
        remarks: order?.remarks || "Require soft stenter finish",
      },
    });
  }, [order]);

  // Separate cost sheet and item hints
  const costSheetHints = processHints.filter((h) => h.source === "COST_SHEET");
  const itemHints = processHints.filter((h) => h.source === "ITEM_MASTER");

  // Synchronize form when dialog opens or roll changes
  useEffect(() => {
    if (!roll) return;

    if (existingPlan) {
      setRouteDecision(existingPlan.routeDecision);
      setRouteType(existingPlan.routeType);
      setSteps(
        existingPlan.steps.map((s) => ({
          processId: s.processId,
          executionMode: s.executionMode,
          plannedQtyMetre: s.plannedQtyMetre,
          jobPartyId: s.jobPartyId,
          subPartyId: s.subPartyId,
          instruction: s.instruction,
          remark: s.remark,
        }))
      );
      setRevisionReason("");
    } else {
      // Default initial state based on Quality disposition
      if (qualitySummary?.disposition === "REWORK") {
        setRouteType("QUALITY_REWORK");
      } else {
        setRouteType("STANDARD");
      }

      setRouteDecision("PROCESS_ROUTE");
      setSteps([]);
      setRevisionReason("");
    }
    setActiveView("editor");
  }, [roll, existingPlan, qualitySummary]);

  if (!roll) return null;

  const rollQty = roll.qtyMetre;
  const isHold = qualitySummary?.disposition === "HOLD";
  const isReject = qualitySummary?.disposition === "REJECT";
  const isRework = qualitySummary?.disposition === "REWORK";
  const isProcessRequired = qualitySummary?.disposition === "PROCESS_REQUIRED";
  const isAccepted = qualitySummary?.disposition === "ACCEPTED";

  // Add Step Action
  const handleAddStep = () => {
    const defaultProc = availableProcesses[0];
    if (!defaultProc) {
      toast.error("No active processes available in Process Master.");
      return;
    }

    const newStep: CreateRouteStepInput = {
      processId: defaultProc.id,
      executionMode: "INTERNAL",
      plannedQtyMetre: rollQty, // whole-roll by default
      instruction: "",
      remark: "",
    };

    setSteps((prev) => [...prev, newStep]);
  };

  const handleUpdateStep = (index: number, updated: CreateRouteStepInput) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? updated : s)));
  };

  const handleMoveStepUp = (index: number) => {
    if (index === 0) return;
    setSteps((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      if (moved) next.splice(index - 1, 0, moved);
      return next;
    });
  };

  const handleMoveStepDown = (index: number) => {
    if (index >= steps.length - 1) return;
    setSteps((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      if (moved) next.splice(index + 1, 0, moved);
      return next;
    });
  };

  const handleDeleteStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  // Save or Update Action
  const handleSaveRoutePlan = () => {
    if (existingPlan && !revisionReason.trim()) {
      toast.error("Please enter a Revision Reason before saving changes to an existing route.");
      return;
    }

    if (existingPlan) {
      // Update as Revision
      const result = FabricProcessRoutingService.updateRoutePlanAsRevision({
        rollDraftId: roll.id,
        routeDecision,
        routeType,
        steps,
        reason: revisionReason.trim() || `Revision #${revisionHistory.length + 1}`,
      });

      if (!result.validation.isValid) {
        toast.error(result.validation.errors.join("; "));
        return;
      }

      toast.success(
        `Route Plan revision saved for ${roll.temporaryRollNo} (Status: ${result.plan?.status})`
      );
      onSaved?.();
      onOpenChange(false);
    } else {
      // Create New Route Plan
      const result = FabricProcessRoutingService.createRoutePlan({
        rollDraftId: roll.id,
        temporaryRollNo: roll.temporaryRollNo,
        receiveDraftId: roll.receiveDraftId,
        jobCardId: roll.jobCardId,
        jobCardNo: jobCard?.draftCardNo || (jobCard as any)?.jobCardNo || undefined,
        productionOrderId: roll.productionOrderId,
        productionOrderNo: order?.order_no || undefined,
        itemCode: order?.item_code || undefined,
        designNo: order?.design_no || undefined,
        rollQtyMetre: roll.qtyMetre,
        routeDecision,
        routeType,
        sourceInspectionId: qualitySummary?.latestInspection?.id,
        sourceInspectionStatus: qualitySummary?.inspectionStatus,
        sourceGrade: qualitySummary?.proposedGrade,
        sourceDisposition: qualitySummary?.disposition,
        sourceSaleabilityPreview: qualitySummary?.saleabilityPreview,
        steps,
      });

      if (!result.validation.isValid) {
        toast.error(result.validation.errors.join("; "));
        return;
      }

      toast.success(
        `Route Plan created for ${roll.temporaryRollNo} (Status: ${result.plan?.status})`
      );
      onSaved?.();
      onOpenChange(false);
    }
  };

  const currentStatusMeta = existingPlan
    ? ROUTE_STATUS_BADGES[existingPlan.status] || ROUTE_STATUS_BADGES.PLANNED
    : ROUTE_STATUS_BADGES.NOT_PLANNED;
  const CurrentStatusIcon = currentStatusMeta.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 bg-slate-950 border-slate-800 text-slate-100 shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-4 border-b border-slate-800 bg-slate-900/90 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <Route className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                  <span>Fabric Process Route Planning</span>
                  <Badge variant="outline" className="border-indigo-500/40 text-indigo-300 font-mono text-xs">
                    {roll.temporaryRollNo}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Plan ordered downstream processing, internal steps & external job work for this fabric roll.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-xs font-mono flex items-center gap-1 ${currentStatusMeta.class}`}>
                <CurrentStatusIcon className="w-3.5 h-3.5" />
                {currentStatusMeta.label}
              </Badge>

              {existingPlan && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveView(activeView === "editor" ? "history" : "editor")}
                  className="h-7 text-xs border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  <History className="w-3.5 h-3.5 mr-1" />
                  {activeView === "editor" ? `Revisions (${revisionHistory.length})` : "Back to Editor"}
                </Button>
              )}
            </div>
          </div>

          {/* Traceability Panel (Step 42) */}
          <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] font-mono flex flex-wrap items-center gap-1.5 text-slate-400">
            <span className="text-slate-500">Trace:</span>
            <span>PO: {order?.order_no || roll.productionOrderId}</span>
            <ArrowRight className="w-3 h-3 text-slate-600" />
            <span>JC: {jobCard?.draftCardNo || (jobCard as any)?.jobCardNo || roll.jobCardId}</span>
            <ArrowRight className="w-3 h-3 text-slate-600" />
            <span>Roll: {roll.temporaryRollNo}</span>
            <ArrowRight className="w-3 h-3 text-slate-600" />
            <span className="text-indigo-300">
              QC: {qualitySummary?.inspectionStatus || "UNINSPECTED"} ({qualitySummary?.proposedGrade || "—"})
            </span>
            <ArrowRight className="w-3 h-3 text-slate-600" />
            <span className="text-emerald-400 font-bold">Process Route</span>
          </div>

          {/* Inherited Context Banner (ENTER ONCE -> REUSE EVERYWHERE) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
            <div>
              <span className="text-slate-500 text-[10px] block uppercase">Roll Qty</span>
              <span className="font-mono font-bold text-white text-xs">{rollQty.toFixed(3)} MTR</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block uppercase">Item / Design</span>
              <span className="text-slate-200 truncate block">
                {order?.item_code || "ITEM"} · {order?.design_no || "DESIGN"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block uppercase">Loom / Width</span>
              <span className="text-slate-200">
                {jobCard?.loomNo || "LOOM"} {roll.widthInch ? `· ${roll.widthInch}"` : ""}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block uppercase">Quality Grade</span>
              <Badge variant="outline" className="border-slate-700 text-slate-300 text-[10px]">
                {qualitySummary?.proposedGrade || "UNASSIGNED"}
              </Badge>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block uppercase">Disposition</span>
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  isHold
                    ? "border-rose-500/40 text-rose-300 bg-rose-500/10"
                    : isRework
                    ? "border-amber-500/40 text-amber-300 bg-amber-500/10"
                    : isProcessRequired
                    ? "border-cyan-500/40 text-cyan-300 bg-cyan-500/10"
                    : "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                }`}
              >
                {qualitySummary?.disposition || "NOT_SET"}
              </Badge>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block uppercase">Saleability</span>
              <span className="text-slate-300 text-[11px]">
                {qualitySummary?.saleabilityPreview || "NOT_EVALUATED"}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeView === "history" ? (
            <FabricProcessRouteHistory revisions={revisionHistory} />
          ) : (
            <>
              {/* Quality Disposition Alerts (Steps 22-28) */}
              {isHold && (
                <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-rose-200 uppercase tracking-wide">
                      PROCESS ROUTING BLOCKED — QUALITY HOLD
                    </div>
                    <p className="mt-0.5 text-rose-300/90 text-[11px]">
                      This Roll is currently on Quality HOLD. The process route cannot become READY until Quality clearance is completed.
                    </p>
                  </div>
                </div>
              )}

              {isReject && (
                <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-rose-200 uppercase tracking-wide">
                      REVIEW REQUIRED — QUALITY REJECT
                    </div>
                    <p className="mt-0.5 text-rose-300/90 text-[11px]">
                      Quality inspection marked this Roll as REJECT. Normal manufacturing routes require explicit authorization.
                    </p>
                  </div>
                </div>
              )}

              {isRework && (
                <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/40 text-amber-300 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-amber-200 uppercase tracking-wide">
                      QUALITY REWORK ROUTE REQUIRED
                    </div>
                    <p className="mt-0.5 text-amber-300/90 text-[11px]">
                      Quality inspection marked this Roll for Rework. Please configure a Quality Rework process route. Process must be selected manually.
                    </p>
                  </div>
                </div>
              )}

              {isProcessRequired && (
                <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/40 text-cyan-300 text-xs flex items-start gap-2.5">
                  <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-cyan-200 uppercase tracking-wide">
                      PROCESS ROUTE REQUIRED
                    </div>
                    <p className="mt-0.5 text-cyan-300/90 text-[11px]">
                      Downstream manufacturing/finishing process is required for this roll before subsequent handling.
                    </p>
                  </div>
                </div>
              )}

              {/* Revision / Inactive Impact Alerts (Steps 33-36) */}
              {existingPlan?.reviewReason && (
                <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/40 text-amber-300 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-amber-200 uppercase tracking-wide">
                      REVIEW REQUIRED ON SAVED ROUTE
                    </div>
                    <p className="mt-0.5 text-amber-300/90 text-[11px]">
                      {existingPlan.reviewReason}
                    </p>
                  </div>
                </div>
              )}

              {/* Advisory Process Hints (Step 7) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Cost Sheet Hints */}
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-slate-300 font-semibold text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>COST SHEET PROCESS HINTS</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-800">
                      Advisory Only
                    </Badge>
                  </div>
                  {costSheetHints.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic">
                      No explicit processing charge lines found in Cost Sheet.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {costSheetHints.map((hint, i) => (
                        <div key={i} className="text-slate-300 text-[11px] flex items-center justify-between">
                          <span>• {hint.chargeName} (Rate: ₹{hint.rate})</span>
                          {hint.suggestedProcessName && (
                            <span className="text-slate-500 text-[10px]">
                              → Match: {hint.suggestedProcessName}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-800/60">
                    * Cost Sheet entries are hints only and do not automatically create confirmed route steps.
                  </p>
                </div>

                {/* Item Master Hints */}
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-slate-300 font-semibold text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <FileCheck2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>ITEM SPEC PROCESS HINTS</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-800">
                      Advisory Only
                    </Badge>
                  </div>
                  {itemHints.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic">
                      No free-text process instructions found in Item Master remarks.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {itemHints.map((hint, i) => (
                        <p key={i} className="text-slate-300 text-[11px]">
                          • {hint.text}
                        </p>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-800/60">
                    * Item remarks are advisory text only and do not infer an authoritative process route.
                  </p>
                </div>
              </div>

              {/* Route Decision Section (Step 8 & 9) */}
              <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <Label className="text-xs font-semibold text-slate-200">
                      Top-Level Route Decision
                    </Label>
                    <p className="text-[11px] text-slate-400">
                      Choose whether this roll requires further processing or no additional manufacturing steps.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={routeDecision === "NO_FURTHER_PROCESS" ? "default" : "outline"}
                      onClick={() => {
                        setRouteDecision("NO_FURTHER_PROCESS");
                        setSteps([]);
                      }}
                      className={
                        routeDecision === "NO_FURTHER_PROCESS"
                          ? "bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs h-8"
                          : "border-slate-700 text-slate-300 hover:bg-slate-800 text-xs h-8"
                      }
                    >
                      NO FURTHER PROCESS
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={routeDecision === "PROCESS_ROUTE" ? "default" : "outline"}
                      onClick={() => setRouteDecision("PROCESS_ROUTE")}
                      className={
                        routeDecision === "PROCESS_ROUTE"
                          ? "bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs h-8"
                          : "border-slate-700 text-slate-300 hover:bg-slate-800 text-xs h-8"
                      }
                    >
                      PLAN PROCESS ROUTE
                    </Button>
                  </div>
                </div>

                {/* NO_FURTHER_PROCESS Confirmation Banner (Step 9) */}
                {routeDecision === "NO_FURTHER_PROCESS" && (
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-slate-400" />
                      <span>No additional manufacturing process is planned for this Roll.</span>
                    </div>
                    <p className="text-[11px] text-amber-400 font-medium">
                      IMPORTANT: This does NOT mark the Roll as saleable, dispatch-ready, or finished stock.
                    </p>
                  </div>
                )}

                {/* PROCESS_ROUTE Controls */}
                {routeDecision === "PROCESS_ROUTE" && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-3">
                    {/* Route Type Selection (Standard vs Quality Rework) */}
                    <div className="flex items-center justify-between text-xs">
                      <Label className="text-xs text-slate-300 font-medium">Route Classification:</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setRouteType("STANDARD")}
                          className={`h-7 text-xs px-2.5 ${
                            routeType === "STANDARD"
                              ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 font-semibold"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          Standard Process
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setRouteType("QUALITY_REWORK")}
                          className={`h-7 text-xs px-2.5 ${
                            routeType === "QUALITY_REWORK"
                              ? "bg-amber-600/30 text-amber-300 border border-amber-500/40 font-semibold"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          Quality Rework
                        </Button>
                      </div>
                    </div>

                    {/* Ordered Process Steps List */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs font-semibold text-slate-200">
                            Ordered Process Steps ({steps.length})
                          </Label>
                          <span className="text-[11px] text-slate-500">
                            (Step 1 is executable; later steps wait for sequence)
                          </span>
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAddStep}
                          className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
                        >
                          <PlusCircle className="w-3.5 h-3.5 mr-1" />
                          Add Process Step
                        </Button>
                      </div>

                      {steps.length === 0 ? (
                        <div className="p-6 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 text-center text-xs text-slate-500 space-y-2">
                          <Route className="w-6 h-6 text-slate-600 mx-auto" />
                          <p>No process steps added yet. Click &quot;Add Process Step&quot; to begin route planning.</p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {steps.map((step, idx) => (
                            <FabricProcessRouteStepEditor
                              key={idx}
                              step={step}
                              index={idx}
                              totalSteps={steps.length}
                              rollQtyMetre={rollQty}
                              derivedStatus={
                                isHold
                                  ? "BLOCKED"
                                  : isReject
                                  ? "REVIEW_REQUIRED"
                                  : idx === 0
                                  ? "READY"
                                  : "WAITING_PREVIOUS"
                              }
                              processes={availableProcesses}
                              eligibleParties={eligibleParties}
                              onChange={(updated) => handleUpdateStep(idx, updated)}
                              onMoveUp={() => handleMoveStepUp(idx)}
                              onMoveDown={() => handleMoveStepDown(idx)}
                              onDelete={() => handleDeleteStep(idx)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Revision Reason Required if Updating Existing Plan (Step 31) */}
              {existingPlan && (
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                    <span>Revision Reason</span>
                    <span className="text-rose-400">*</span>
                  </Label>
                  <Input
                    value={revisionReason}
                    onChange={(e) => setRevisionReason(e.target.value)}
                    placeholder="e.g. Updated finishing processor based on plant capacity"
                    className="h-8 text-xs bg-slate-950 border-slate-700 text-white placeholder:text-slate-600"
                  />
                  <p className="text-[10px] text-slate-500">
                    Existing routes are preserved in revision history upon saving.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between sm:justify-between">
          <p className="text-[11px] text-slate-500 italic">
            * Frontend planning simulation only. No physical issue/receive transactions or stock movement.
          </p>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveRoutePlan}
              disabled={routeDecision === "PROCESS_ROUTE" && steps.length === 0}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
            >
              <Route className="w-3.5 h-3.5 mr-1.5" />
              {existingPlan ? "Update Route Plan as Revision" : "Save Route Plan"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

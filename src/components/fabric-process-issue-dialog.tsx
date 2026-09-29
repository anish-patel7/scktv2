import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
  Truck,
  ArrowRight,
  ShieldAlert,
  Info,
  Layers,
  History,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import {
  FabricProcessExecutionService,
  type FabricProcessIssuePreparation,
  type RateSourceType,
  type ProcessIssueStatus,
  type RateHintState,
} from "@/services/fabric-process-execution.service";
import {
  FabricProcessRoutingService,
  type FabricProcessRoutePlan,
  type FabricProcessRouteStep,
} from "@/services/fabric-process-routing.service";
import {
  ProductionPlanningService,
  type FabricRollDraft,
  type JobCardDraft,
} from "@/services/production-planning.service";
import type { ProductionOrder } from "@/lib/production-store";
import { FabricProcessIssueHistory } from "./fabric-process-issue-history";

interface FabricProcessIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roll: FabricRollDraft | null;
  order?: ProductionOrder | null | undefined;
  jobCard?: JobCardDraft | null | undefined;
  onSaved?: () => void;
  onOpenRouteDialog?: (roll: FabricRollDraft) => void;
}

export function FabricProcessIssueDialog({
  open,
  onOpenChange,
  roll,
  order,
  jobCard,
  onSaved,
  onOpenRouteDialog,
}: FabricProcessIssueDialogProps) {
  const [activeTab, setActiveTab] = useState<"preparation" | "history">("preparation");

  // Editable planning state
  const [issueDate, setIssueDate] = useState<string>("");
  const [expectedReturnDate, setExpectedReturnDate] = useState<string>("");
  const [plannedRate, setPlannedRate] = useState<string>("");
  const [rateSource, setRateSource] = useState<RateSourceType>("UNSET");
  const [executionRemark, setExecutionRemark] = useState<string>("");
  const [transporterName, setTransporterName] = useState<string>("");
  const [lrNo, setLrNo] = useState<string>("");

  // Revision state
  const [revisionReason, setRevisionReason] = useState<string>("");
  const [showRevisionInput, setShowRevisionInput] = useState<boolean>(false);
  const [saveSuccessSummary, setSaveSuccessSummary] = useState<FabricProcessIssuePreparation | null>(null);

  // Upstream route plan & active step
  const plan = useMemo(() => {
    if (!roll) return undefined;
    return FabricProcessRoutingService.getRoutePlanForRoll(roll.id);
  }, [roll, open]);

  const currentStep = useMemo(() => {
    if (!plan) return undefined;
    return plan.steps.find((s) => s.status === "READY");
  }, [plan]);

  const existingPrep = useMemo(() => {
    if (!roll) return undefined;
    return FabricProcessExecutionService.getActivePreparationForRoll(roll.id);
  }, [roll, open, saveSuccessSummary]);

  // Check staleness if an existing preparation exists
  const stalenessCheck = useMemo(() => {
    if (!existingPrep || !roll) return { isStale: false };
    return FabricProcessExecutionService.checkAndMarkPreparationStaleness(existingPrep.id, roll);
  }, [existingPrep, roll, plan]);

  // Rate hints and quantity basis review
  const rateHintState = useMemo<RateHintState | null>(() => {
    if (!currentStep || !roll) return null;
    return FabricProcessExecutionService.getProcessRateHints({
      processId: currentStep.processId,
      costSheetCharges: order?.cost_sheet_id ? [] : null, // will display hint from process master or manual
      rollQtyMetre: roll.qtyMetre,
      plannedRate: plannedRate ? parseFloat(plannedRate) : undefined,
      rateSource,
    });
  }, [currentStep, roll, order, plannedRate, rateSource]);

  // Initialize form state
  useEffect(() => {
    if (open) {
      setSaveSuccessSummary(null);
      setShowRevisionInput(false);
      setRevisionReason("");
      setActiveTab("preparation");

      const today = new Date().toISOString().slice(0, 10);

      if (existingPrep && existingPrep.status !== "SUPERSEDED") {
        setIssueDate(existingPrep.issueDate || today);
        setExpectedReturnDate(existingPrep.expectedReturnDate || "");
        setPlannedRate(existingPrep.plannedRate !== undefined ? String(existingPrep.plannedRate) : "");
        setRateSource(existingPrep.rateSource || "UNSET");
        setExecutionRemark(existingPrep.remark || "");
        setTransporterName(existingPrep.transporterName || "");
        setLrNo(existingPrep.lrNo || "");
      } else {
        setIssueDate(today);
        setExpectedReturnDate("");
        setPlannedRate("");
        setRateSource("UNSET");
        setExecutionRemark("");
        setTransporterName("");
        setLrNo("");
      }
    }
  }, [open, existingPrep]);

  if (!roll || !plan || !currentStep) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-400">
              <ShieldAlert className="w-5 h-5" />
              Process Execution Unavailable
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs pt-2">
              {!plan
                ? `Roll ${roll?.temporaryRollNo || ""} has no planned process route. Please plan downstream routing first.`
                : plan.routeDecision === "NO_FURTHER_PROCESS"
                ? "This roll is designated with NO_FURTHER_PROCESS. No process issue is required."
                : plan.status === "BLOCKED"
                ? `Route is BLOCKED: ${plan.reviewReason || "Quality HOLD."}`
                : "No route step is in READY status. Preceding process steps must be executed first."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="border-slate-700 text-slate-300"
            >
              Close
            </Button>
            {roll && (
              <Button
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onOpenRouteDialog?.(roll);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                Open Route Planner
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const isExternal = currentStep.executionMode === "EXTERNAL_JOBWORK";
  const isInternal = currentStep.executionMode === "INTERNAL";
  const isAlreadyPrepared = existingPrep?.status === "PREPARED";
  const isReviewRequired = stalenessCheck.isStale || existingPrep?.status === "REVIEW_REQUIRED";

  const handleSavePreparation = () => {
    if (!roll || !currentStep) return;

    const rateNum = plannedRate ? parseFloat(plannedRate) : undefined;

    if (isAlreadyPrepared && !showRevisionInput) {
      setShowRevisionInput(true);
      return;
    }

    if (isAlreadyPrepared && showRevisionInput) {
      if (!revisionReason.trim()) {
        return;
      }

      const revRes = FabricProcessExecutionService.createIssuePreparationRevision(
        existingPrep!.id,
        {
          issueDate,
          expectedReturnDate: expectedReturnDate || undefined,
          plannedRate: rateNum,
          rateSource,
          remark: executionRemark || undefined,
          transporterName: transporterName || undefined,
          lrNo: lrNo || undefined,
        },
        revisionReason.trim()
      );

      if (revRes.revised) {
        setSaveSuccessSummary(revRes.revised);
        setShowRevisionInput(false);
        onSaved?.();
      }
      return;
    }

    const prepRes = FabricProcessExecutionService.createProcessIssuePreparation({
      rollDraftId: roll.id,
      routeStepId: currentStep.id,
      issueQtyMetre: roll.qtyMetre,
      issueDate,
      internalDestinationName: isInternal ? "NOT CONFIGURED / OPTIONAL" : undefined,
      expectedReturnDate: expectedReturnDate || undefined,
      plannedRate: rateNum,
      rateSource,
      remark: executionRemark || undefined,
      transporterName: transporterName || undefined,
      lrNo: lrNo || undefined,
    });

    if (prepRes.preparation) {
      setSaveSuccessSummary(prepRes.preparation);
      onSaved?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-white max-h-[92vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-slate-800">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-[10px] font-mono ${
                  isExternal
                    ? "border-cyan-500/40 text-cyan-300 bg-cyan-500/10"
                    : "border-indigo-500/40 text-indigo-300 bg-indigo-500/10"
                }`}
              >
                {isExternal ? "EXTERNAL JOB WORK" : "INTERNAL PROCESS"}
              </Badge>
              <DialogTitle className="text-base font-bold text-white">
                {isExternal ? "JOB WORK OUTWARD PREPARATION" : "INTERNAL PROCESS PREPARATION"}
              </DialogTitle>
            </div>

            <Badge
              variant="outline"
              className={`text-[10px] ${
                isReviewRequired
                  ? "border-amber-500/40 text-amber-300 bg-amber-500/10"
                  : isAlreadyPrepared
                  ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                  : "border-blue-500/40 text-blue-300 bg-blue-500/10"
              }`}
            >
              {isReviewRequired ? "REVIEW REQUIRED" : isAlreadyPrepared ? "PREPARED" : "DRAFT"}
            </Badge>
          </div>
          <DialogDescription className="text-slate-400 text-xs pt-1">
            Frontend execution preparation for current READY route step. Whole-roll issue only. Zero stock mutation.
          </DialogDescription>
        </DialogHeader>

        {/* Tab navigation: Preparation Form vs History */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="bg-slate-950 border border-slate-800 w-full justify-start text-xs h-8">
            <TabsTrigger value="preparation" className="text-xs data-[state=active]:bg-slate-800">
              Execution Preparation
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs data-[state=active]:bg-slate-800 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              History & Revisions
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: PREPARATION FORM */}
          <TabsContent value="preparation" className="space-y-4 pt-2">
            {/* Traceability Breadcrumb (Step 47) */}
            <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80 text-[11px] font-mono text-slate-400 flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-500">Order:</span>
              <span className="text-slate-300">{order?.order_no || "PO"}</span>
              <ArrowRight className="w-3 h-3 text-slate-600" />
              <span className="text-slate-500">JC:</span>
              <span className="text-slate-300">{jobCard?.draftCardNo || plan.jobCardNo || "JC"}</span>
              <ArrowRight className="w-3 h-3 text-slate-600" />
              <span className="text-slate-500">Roll:</span>
              <span className="text-indigo-300 font-bold">{roll.temporaryRollNo}</span>
              <ArrowRight className="w-3 h-3 text-slate-600" />
              <span className="text-slate-500">Step {currentStep.sequence}:</span>
              <span className="text-cyan-300">{currentStep.processName}</span>
            </div>

            {/* Review Required Banner if staled */}
            {isReviewRequired && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>REVIEW REQUIRED: Upstream Route or Roll changed after preparation</span>
                </div>
                <p className="text-[11px] text-amber-200/90 pl-5">
                  {stalenessCheck.reason || existingPrep?.reviewReason || "Process route revised or roll quantity updated."}
                </p>
                <div className="pt-1 pl-5 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onOpenChange(false);
                      onOpenRouteDialog?.(roll);
                    }}
                    className="h-6 text-[10px] border-amber-500/40 text-amber-300 hover:bg-amber-950/50"
                  >
                    Revise Process Route
                  </Button>
                </div>
              </div>
            )}

            {/* Read-Only Inherited Context Grid (Step 4, 11) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase font-sans">Roll Qty (MTR)</span>
                <span className="text-white font-bold text-sm">{roll.qtyMetre.toFixed(3)}</span>
                <Badge variant="outline" className="mt-1 border-emerald-500/30 text-emerald-400 text-[9px] block w-fit">
                  WHOLE ROLL ONLY
                </Badge>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase font-sans">Issue Qty (MTR)</span>
                <span className="text-emerald-300 font-bold text-sm">{roll.qtyMetre.toFixed(3)}</span>
                <span className="text-[10px] text-slate-500 block font-sans">Read-Only</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase font-sans">Process</span>
                <span className="text-white font-semibold truncate block" title={currentStep.processName}>
                  {currentStep.processName}
                </span>
                <span className="text-[10px] text-slate-400 block font-sans">Sequence {currentStep.sequence} of {plan.steps.length}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase font-sans">
                  {isExternal ? "Job Party" : "Destination"}
                </span>
                <span className="text-cyan-300 font-semibold truncate block" title={currentStep.jobPartyName || "INTERNAL"}>
                  {isExternal ? currentStep.jobPartyName || "Unknown" : "NOT CONFIGURED"}
                </span>
                <span className="text-[10px] text-slate-400 block font-sans">
                  {isExternal ? currentStep.subPartyName || "Main Unit" : "Internal WIP"}
                </span>
              </div>
            </div>

            {/* Read-Only Notice: Process & Party lock (Steps 9 & 10) */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>Process and processor are inherited from Process Route.</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onOpenRouteDialog?.(roll);
                }}
                className="h-6 text-[11px] text-indigo-400 hover:text-indigo-300 p-0 hover:bg-transparent flex items-center gap-1"
              >
                <span>Revise Process Route</span>
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>

            {/* External Job Work Context Card (Steps 7, 8, 42) */}
            {isExternal && (
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-cyan-400" />
                    <span className="font-semibold text-slate-200">Processing Location & Address</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    Challan Ref: <strong className="text-indigo-300">DRAFT-JW-OUT-001</strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Job Worker:</span>
                    <span className="text-white font-medium">{currentStep.jobPartyName}</span>
                    {currentStep.subPartyName && (
                      <span className="text-slate-400 block">Unit: {currentStep.subPartyName}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-500 block">Authoritative Challan Number:</span>
                    <span className="text-amber-300/80 italic font-mono">Pending backend posting</span>
                  </div>
                </div>
              </div>
            )}

            {/* Planning Input Fields (Steps 13, 14, 41) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-300">
                  {isExternal ? "Outward Date" : "Issue Date"}
                </Label>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="h-8 text-xs bg-slate-950 border-slate-800 text-white"
                />
              </div>

              {isExternal ? (
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300 flex items-center justify-between">
                    <span>Expected Return Date</span>
                    <span className="text-slate-500 text-[10px] font-normal">Optional manual</span>
                  </Label>
                  <Input
                    type="date"
                    value={expectedReturnDate}
                    onChange={(e) => setExpectedReturnDate(e.target.value)}
                    placeholder="dd/mm/yyyy"
                    className="h-8 text-xs bg-slate-950 border-slate-800 text-white"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">Internal Destination</Label>
                  <Input
                    disabled
                    value="NOT CONFIGURED / OPTIONAL"
                    className="h-8 text-xs bg-slate-950/60 border-slate-800 text-slate-400"
                  />
                </div>
              )}
            </div>

            {/* Rate Context Panel (Steps 12, 13, 15, 16, 17) */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">PROCESS RATE CONTEXT</span>
                <span className="text-[10px] text-slate-500 font-sans">Provisional Planning Hint Only</span>
              </div>

              {/* Rate hint display */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block text-[10px] font-sans">Cost Sheet Hint</span>
                  <span className="text-slate-300">
                    {rateHintState?.costSheetHint ? rateHintState.costSheetHint.text : "No charge hint found"}
                  </span>
                </div>

                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block text-[10px] font-sans">Process Master Hint</span>
                  <span className="text-slate-300">
                    {rateHintState?.processMasterHint ? rateHintState.processMasterHint.text : "No rate hint in description"}
                  </span>
                </div>
              </div>

              {/* MTR vs Cut/PCS Warning (Step 14 & 15 & 17) */}
              {rateHintState?.requiresQuantityBasisReview && (
                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block">QUANTITY BASIS REVIEW REQUIRED</strong>
                    <span>{rateHintState.quantityBasisReviewReason}</span>
                  </div>
                </div>
              )}

              {/* Editable provisional rate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">Confirmed Planned Rate (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 2.00"
                    value={plannedRate}
                    onChange={(e) => {
                      setPlannedRate(e.target.value);
                      if (rateSource === "UNSET") setRateSource("MANUAL");
                    }}
                    className="h-8 text-xs bg-slate-950 border-slate-800 text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">Rate Source</Label>
                  <Select value={rateSource} onValueChange={(v) => setRateSource(v as any)}>
                    <SelectTrigger className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-300">
                      <SelectValue placeholder="Select Source" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-xs text-slate-200">
                      <SelectItem value="UNSET">UNSET</SelectItem>
                      <SelectItem value="MANUAL">MANUAL</SelectItem>
                      <SelectItem value="COST_SHEET_HINT">COST_SHEET_HINT</SelectItem>
                      <SelectItem value="PROCESS_MASTER_HINT">PROCESS_MASTER_HINT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Optional Transport Fields for External (Step 41) */}
            {isExternal && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-slate-500" />
                    <span>Transporter Name (Optional)</span>
                  </Label>
                  <Input
                    value={transporterName}
                    onChange={(e) => setTransporterName(e.target.value)}
                    placeholder="e.g. V-Trans India Ltd"
                    className="h-8 text-xs bg-slate-950 border-slate-800 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-400">LR / Docket No. (Optional)</Label>
                  <Input
                    value={lrNo}
                    onChange={(e) => setLrNo(e.target.value)}
                    placeholder="e.g. LR-2026-991"
                    className="h-8 text-xs bg-slate-950 border-slate-800 text-white font-mono"
                  />
                </div>
              </div>
            )}

            {/* Process Instruction & Execution Remarks (Step 43) */}
            <div className="space-y-2 text-xs">
              {currentStep.instruction && (
                <div className="p-2 rounded bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400">
                  <span className="text-slate-500 block font-semibold uppercase text-[10px]">Route Instruction (Read-Only)</span>
                  <span>{currentStep.instruction}</span>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-[11px] text-slate-300">Execution Remark</Label>
                <Textarea
                  value={executionRemark}
                  onChange={(e) => setExecutionRemark(e.target.value)}
                  placeholder="Operational notes, packing instructions, or processing remarks..."
                  className="h-16 text-xs bg-slate-950 border-slate-800 text-white resize-none"
                />
              </div>
            </div>

            {/* Future Stock Position Notice (Step 19) */}
            <div className="p-2.5 rounded-lg bg-slate-950/90 border border-slate-800 text-xs flex items-center justify-between text-slate-400">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  Future Stock Position:{" "}
                  <strong className="text-white">
                    {isExternal ? "WITH THIRD PARTY" : "PROCESS WIP / INTERNAL"}
                  </strong>
                </span>
              </div>
              <Badge variant="outline" className="border-amber-500/30 text-amber-300 text-[10px]">
                NO INVENTORY MOVEMENT POSTED
              </Badge>
            </div>

            {/* Revision Reason input if modifying a PREPARED record (Step 24) */}
            {showRevisionInput && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  <span>Revision Reason Required</span>
                </div>
                <p className="text-[11px] text-amber-200/90">
                  This preparation was already saved. Modifying it will create a formal preparation revision and preserve previous history.
                </p>
                <Input
                  value={revisionReason}
                  onChange={(e) => setRevisionReason(e.target.value)}
                  placeholder="State reason for revising preparation (e.g. date updated, rate changed)..."
                  className="h-8 text-xs bg-slate-950 border-amber-500/40 text-white"
                />
              </div>
            )}

            {/* Saved Success Confirmation Card */}
            {saveSuccessSummary && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>PROCESS PREPARATION SAVED</span>
                  </div>
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 font-mono text-[10px]">
                    {saveSuccessSummary.id}
                  </Badge>
                </div>
                <div className="text-[11px] text-emerald-200/90 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono">
                  <div>Roll: {saveSuccessSummary.temporaryRollNo}</div>
                  <div>Qty: {saveSuccessSummary.issueQtyMetre} MTR</div>
                  <div>Mode: {saveSuccessSummary.executionMode}</div>
                  <div>Status: PREPARED</div>
                </div>
                <div className="text-[10px] text-emerald-400/80 pt-1 border-t border-emerald-500/20">
                  Inventory Movement: <strong>NOT POSTED</strong> (Frontend Preparation Only)
                </div>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: HISTORY */}
          <TabsContent value="history" className="pt-2">
            <FabricProcessIssueHistory rollDraftId={roll.id} />
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between sm:justify-between w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="border-slate-700 text-slate-300"
          >
            Close
          </Button>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSavePreparation}
              disabled={showRevisionInput && !revisionReason.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isAlreadyPrepared
                  ? showRevisionInput
                    ? "Confirm Revision"
                    : "Save Preparation"
                  : "Save Preparation"}
              </span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

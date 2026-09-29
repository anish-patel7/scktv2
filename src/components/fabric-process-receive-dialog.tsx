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
  Scale,
  Sparkles,
  RotateCcw,
  Check,
  Split,
  Lock,
} from "lucide-react";
import {
  FabricProcessReceiveService,
  deriveReconciliationStatus,
  type FabricProcessReceiveSimulation,
  type QuantityReconciliationResult,
  type RouteProgressionSimulationResult,
} from "@/services/fabric-process-receive.service";
import {
  FabricProcessExecutionService,
  type FabricProcessIssuePreparation,
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
import { getLocalParties, getLocalSubParties } from "@/lib/party-store";
import { FabricProcessReconciliationPanel } from "./fabric-process-reconciliation-panel";
import { FabricProcessReceiveHistory } from "./fabric-process-receive-history";

interface FabricProcessReceiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roll: FabricRollDraft | null;
  order?: ProductionOrder | null | undefined;
  jobCard?: JobCardDraft | null | undefined;
  onSaved?: () => void;
}

export function FabricProcessReceiveDialog({
  open,
  onOpenChange,
  roll,
  order,
  jobCard,
  onSaved,
}: FabricProcessReceiveDialogProps) {
  const [activeTab, setActiveTab] = useState<"receive" | "history">("receive");

  // Editable Receive Form Inputs
  const [receivedQtyInput, setReceivedQtyInput] = useState<string>("");
  const [receiveDate, setReceiveDate] = useState<string>("");
  const [declaredWastageInput, setDeclaredWastageInput] = useState<string>("");
  const [declaredShortageInput, setDeclaredShortageInput] = useState<string>("");
  const [processorChallanNo, setProcessorChallanNo] = useState<string>("");
  const [processorReference, setProcessorReference] = useState<string>("");
  const [remark, setRemark] = useState<string>("");

  // True partial return toggle/flag (Step 10)
  const [isPartialReturnAttempt, setIsPartialReturnAttempt] = useState<boolean>(false);

  // Revision state
  const [isRevising, setIsRevising] = useState<boolean>(false);
  const [revisionReason, setRevisionReason] = useState<string>("");

  // Post-save result summary state (Step 24)
  const [saveSuccessSummary, setSaveSuccessSummary] = useState<{
    receive: FabricProcessReceiveSimulation;
    progression?: RouteProgressionSimulationResult | undefined;
  } | null>(null);

  // Source Phase 5D Issue Preparation (Step 1)
  const activePrep = useMemo(() => {
    if (!roll) return undefined;
    return FabricProcessExecutionService.getActivePreparationForRoll(roll.id);
  }, [roll, open, saveSuccessSummary]);

  // Route Plan context
  const plan = useMemo(() => {
    if (!roll) return undefined;
    return FabricProcessRoutingService.getRoutePlanForRoll(roll.id);
  }, [roll, open]);

  // Existing saved receive simulation if any (Step 33)
  const existingReceive = useMemo(() => {
    if (!activePrep) return undefined;
    return FabricProcessReceiveService.getReceiveForIssuePreparation(activePrep.id);
  }, [activePrep, open, saveSuccessSummary]);

  // Check if underlying process or processor is inactive (Steps 37 & 38)
  const isProcessInactive = useMemo(() => {
    if (!activePrep) return false;
    const proc = FabricProcessRoutingService.getProcessById(activePrep.processId);
    return proc ? !proc.active : false;
  }, [activePrep]);

  const isProcessorInactive = useMemo(() => {
    if (!activePrep || activePrep.executionMode !== "EXTERNAL_JOBWORK" || !activePrep.jobPartyId) return false;
    const parties = getLocalParties();
    const found = parties.find((p) => p.id === activePrep.jobPartyId);
    return found ? found.status !== "Active" : false;
  }, [activePrep]);

  // Check staleness of existing receive if any (Steps 34, 35, 36)
  const stalenessCheck = useMemo(() => {
    if (!existingReceive || !roll) return { isStale: false };
    return FabricProcessReceiveService.checkReceiveStaleness(existingReceive.id, roll);
  }, [existingReceive, roll, plan]);

  // Current Step and Next Step names for Route Progression Preview
  const currentStep = useMemo(() => {
    if (!plan || !activePrep) return undefined;
    return plan.steps.find((s) => s.id === activePrep.routeStepId);
  }, [plan, activePrep]);

  const nextStep = useMemo(() => {
    if (!plan || !activePrep) return undefined;
    return plan.steps.find((s) => s.sequence === activePrep.stepSequence + 1);
  }, [plan, activePrep]);

  const isLastStep = useMemo(() => {
    if (!plan || !activePrep) return false;
    const maxSeq = Math.max(...plan.steps.map((s) => s.sequence));
    return activePrep.stepSequence === maxSeq;
  }, [plan, activePrep]);

  // Initialize Form Data
  useEffect(() => {
    if (open && activePrep) {
      setSaveSuccessSummary(null);
      setIsRevising(false);
      setRevisionReason("");
      setIsPartialReturnAttempt(false);
      setActiveTab("receive");

      const today = new Date().toISOString().slice(0, 10);

      if (existingReceive && existingReceive.status !== "SUPERSEDED") {
        setReceivedQtyInput(String(existingReceive.receivedQtyMetre));
        setReceiveDate(existingReceive.receiveDate || today);
        setDeclaredWastageInput(
          existingReceive.declaredWastageQtyMetre ? String(existingReceive.declaredWastageQtyMetre) : ""
        );
        setDeclaredShortageInput(
          existingReceive.declaredShortageQtyMetre ? String(existingReceive.declaredShortageQtyMetre) : ""
        );
        setProcessorChallanNo(existingReceive.processorChallanNo || "");
        setProcessorReference(existingReceive.processorReference || "");
        setRemark(existingReceive.remark || "");
      } else {
        // Default to whole roll physical return with same measured qty as issue
        setReceivedQtyInput(String(activePrep.issueQtyMetre));
        setReceiveDate(today);
        setDeclaredWastageInput("");
        setDeclaredShortageInput("");
        setProcessorChallanNo("");
        setProcessorReference("");
        setRemark("");
      }
    }
  }, [open, activePrep, existingReceive]);

  // Numeric parse
  const parsedReceivedQty = useMemo(() => {
    const val = parseFloat(receivedQtyInput);
    return isNaN(val) ? 0 : val;
  }, [receivedQtyInput]);

  const parsedWastageQty = useMemo(() => {
    if (!declaredWastageInput.trim()) return 0;
    const val = parseFloat(declaredWastageInput);
    return isNaN(val) ? 0 : val;
  }, [declaredWastageInput]);

  const parsedShortageQty = useMemo(() => {
    if (!declaredShortageInput.trim()) return 0;
    const val = parseFloat(declaredShortageInput);
    return isNaN(val) ? 0 : val;
  }, [declaredShortageInput]);

  // Live Quantity Reconciliation derived strictly via Service Authority (Step 12 & 49)
  const liveReconciliation = useMemo<QuantityReconciliationResult | null>(() => {
    if (!activePrep) return null;
    return deriveReconciliationStatus({
      issuedQtyMetre: activePrep.issueQtyMetre,
      receivedQtyMetre: parsedReceivedQty,
      declaredWastageQtyMetre: parsedWastageQty,
      declaredShortageQtyMetre: parsedShortageQty,
    });
  }, [activePrep, parsedReceivedQty, parsedWastageQty, parsedShortageQty]);

  // Timing difference: Expected vs Actual return (Step 21)
  const timingDifference = useMemo(() => {
    if (!activePrep?.expectedReturnDate || !receiveDate) return null;
    const exp = new Date(activePrep.expectedReturnDate).getTime();
    const act = new Date(receiveDate).getTime();
    if (isNaN(exp) || isNaN(act)) return null;
    const diffDays = Math.round((act - exp) / (1000 * 60 * 60 * 24));
    return {
      expected: activePrep.expectedReturnDate,
      actual: receiveDate,
      diffDays,
    };
  }, [activePrep, receiveDate]);

  if (!roll || !activePrep) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-white font-sans text-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-400 text-sm">
              <ShieldAlert className="w-5 h-5" />
              Process Receive Unavailable
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs pt-2">
              Receive action must originate from an existing Phase 5D Issue / Job Work Outward Preparation.
              No valid preparation exists for Roll {roll?.temporaryRollNo || ""}.
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const isExternal = activePrep.executionMode === "EXTERNAL_JOBWORK";
  const isInternal = activePrep.executionMode === "INTERNAL";
  const hasExistingSavedReceive = !!existingReceive && existingReceive.status !== "SUPERSEDED";

  // Handle Save
  const handleSaveReceiveSimulation = () => {
    if (!activePrep || !liveReconciliation) return;

    // True partial physical return check (Step 10)
    if (isPartialReturnAttempt) {
      return;
    }

    // Invalid declaration check
    if (liveReconciliation.reconciliationStatus === "INVALID_DECLARATION") {
      return;
    }

    // Revision workflow
    if (hasExistingSavedReceive) {
      if (!isRevising) {
        setIsRevising(true);
        return;
      }

      if (!revisionReason.trim()) {
        return;
      }

      const revRes = FabricProcessReceiveService.createReceiveRevision(
        existingReceive.id,
        {
          receivedQtyMetre: parsedReceivedQty,
          declaredWastageQtyMetre: parsedWastageQty,
          declaredShortageQtyMetre: parsedShortageQty,
          processorChallanNo: isExternal ? processorChallanNo.trim() || undefined : undefined,
          processorReference: isExternal ? processorReference.trim() || undefined : undefined,
          remark: remark.trim() || undefined,
        },
        revisionReason.trim()
      );

      if (revRes.revised) {
        setSaveSuccessSummary({
          receive: revRes.revised,
          progression: liveReconciliation.canAdvanceRouteStep
            ? FabricProcessReceiveService.simulateRouteStepProgression(revRes.revised)
            : undefined,
        });
        setIsRevising(false);
        onSaved?.();
      }
      return;
    }

    // New Receive Simulation creation
    const res = FabricProcessReceiveService.createProcessReceiveSimulation({
      issuePreparationId: activePrep.id,
      receivedQtyMetre: parsedReceivedQty,
      declaredWastageQtyMetre: parsedWastageQty,
      declaredShortageQtyMetre: parsedShortageQty,
      receiveDate,
      processorChallanNo: isExternal ? processorChallanNo.trim() || undefined : undefined,
      processorReference: isExternal ? processorReference.trim() || undefined : undefined,
      remark: remark.trim() || undefined,
    });

    if (res.receive) {
      setSaveSuccessSummary({
        receive: res.receive,
        progression: res.progression,
      });
      onSaved?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-slate-900 border-slate-800 text-white font-sans max-h-[92vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-800 pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Scale className="w-5 h-5 text-indigo-400" />
                <span>
                  {isInternal
                    ? "INTERNAL PROCESS COMPLETION / RECEIVE"
                    : "JOB WORK INWARD / PROCESS RECEIVE"}
                </span>
                <Badge
                  variant="outline"
                  className={
                    isExternal
                      ? "border-cyan-500/40 text-cyan-300 bg-cyan-950/20 text-[10px]"
                      : "border-indigo-500/40 text-indigo-300 bg-indigo-950/20 text-[10px]"
                  }
                >
                  {isExternal ? "EXTERNAL JOB WORK" : "INTERNAL"}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Frontend simulation of process output/receipt and quantity reconciliation. Zero stock/financial mutation.
              </DialogDescription>
            </div>

            <Badge variant="outline" className="border-slate-700 text-slate-400 font-mono text-[10px]">
              Roll: {roll.temporaryRollNo}
            </Badge>
          </div>
        </DialogHeader>

        {/* Inactive Warnings (Steps 37 & 38) */}
        {isProcessInactive && (
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>PROCESS CURRENTLY INACTIVE:</strong> Upstream process master has been deactivated. Historical process reference is retained.
            </span>
          </div>
        )}

        {isProcessorInactive && (
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>PROCESSOR CURRENTLY INACTIVE:</strong> External Job Worker party has been marked inactive. Historical party reference is retained.
            </span>
          </div>
        )}

        {/* Staleness Warnings (Steps 34, 35, 36) */}
        {stalenessCheck.isStale && (
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <div>
              <span className="font-semibold block">SOURCE MODIFICATION DETECTED:</span>
              <span className="text-[11px] text-rose-200">{stalenessCheck.reason}</span>
            </div>
          </div>
        )}

        {/* Inherited Context Grid (Step 5, 8: Read-Only Process/Processor Lock) */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 border-b border-slate-800/80 pb-1.5">
            <span className="flex items-center gap-1.5 text-indigo-300">
              <Lock className="w-3.5 h-3.5" />
              Inherited Execution Context (Read-Only)
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Prep Ref: #{activePrep.id.slice(-8)}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 font-mono text-[11px]">
            <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
              <span className="text-[9px] text-slate-500 uppercase block font-sans">Sales Order</span>
              <span className="text-white truncate block">{activePrep.salesOrderNo || "SO-STD"}</span>
            </div>

            <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
              <span className="text-[9px] text-slate-500 uppercase block font-sans">Prod Order</span>
              <span className="text-white truncate block">{activePrep.productionOrderNo || "PO-STD"}</span>
            </div>

            <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
              <span className="text-[9px] text-slate-500 uppercase block font-sans">Job Card</span>
              <span className="text-white truncate block">{activePrep.jobCardNo || "JC-STD"}</span>
            </div>

            <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
              <span className="text-[9px] text-slate-500 uppercase block font-sans">Roll & Issued</span>
              <span className="text-emerald-400 font-bold block">
                {roll.temporaryRollNo} ({activePrep.issueQtyMetre.toFixed(3)}m)
              </span>
            </div>

            <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
              <span className="text-[9px] text-slate-500 uppercase block font-sans">Process (Locked)</span>
              <span className="text-indigo-300 font-semibold truncate block" title={activePrep.processName}>
                {activePrep.processName}
              </span>
            </div>

            <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
              <span className="text-[9px] text-slate-500 uppercase block font-sans">Route Step</span>
              <span className="text-slate-300 block">
                Step {activePrep.stepSequence} (Rev #{activePrep.routeRevision})
              </span>
            </div>
          </div>

          {/* External Processor Details (Step 7) */}
          {isExternal && (
            <div className="p-2 rounded bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between text-[11px] gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-400">Processor:</span>
                <strong className="text-white">{activePrep.jobPartyName || "PARTY LOCKED"}</strong>
                {activePrep.subPartyName && (
                  <span className="text-slate-400">({activePrep.subPartyName})</span>
                )}
              </div>
              <span className="text-[10px] text-slate-500 italic">
                * Processor & Unit strictly inherited from Outward Preparation. Read-only.
              </span>
            </div>
          )}

          {/* Planned Rate Information (Step 22: Informational only) */}
          {activePrep.plannedRate !== undefined && activePrep.plannedRate > 0 && (
            <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
              <span>Phase 5D Planned Rate: ₹{activePrep.plannedRate.toFixed(2)}/MTR (Informational only · No finance posting)</span>
              <span>Rate Basis: {activePrep.rateSource}</span>
            </div>
          )}
        </div>

        {/* Step 9 & 10: Whole Physical Roll Governance & Partial Return Warning */}
        <div className="p-2.5 rounded-xl border border-indigo-500/30 bg-indigo-950/20 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-indigo-300 font-semibold flex items-center gap-1.5 text-[11px]">
              <Layers className="w-3.5 h-3.5" />
              WHOLE PHYSICAL ROLL PRINCIPLE
            </span>
            <span className="text-[10px] text-indigo-400 font-mono">
              Physical Identity Preservation
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            THIS RECEIVE REPRESENTS RETURN OF THE WHOLE PHYSICAL ROLL. Measured Received Quantity can differ from Issued Quantity due to processing variance.
          </p>

          {/* True Partial Return Checkbox (Step 10) */}
          <div className="pt-1.5 border-t border-indigo-500/20 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-slate-300">
              <input
                type="checkbox"
                checked={isPartialReturnAttempt}
                onChange={(e) => setIsPartialReturnAttempt(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
              />
              <span>Attempting true partial physical return (e.g. part returned, remainder left at party)?</span>
            </label>
          </div>

          {/* Roll Split Required Alert (Step 10) */}
          {isPartialReturnAttempt && (
            <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/50 text-rose-200 text-xs space-y-1 mt-2">
              <div className="flex items-center gap-2 font-bold text-rose-300">
                <Split className="w-4 h-4" />
                ROLL SPLIT REQUIRED
              </div>
              <p className="text-[11px] leading-relaxed">
                "Partial physical return requires separate child Roll identity."
              </p>
              <p className="text-[10px] text-rose-300/80">
                You cannot receive partial physical meterage under the same Roll identity while leaving a remnant at the processor. Save is blocked.
              </p>
            </div>
          )}
        </div>

        {/* Main Tabs: Receive & History */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="bg-slate-950 border border-slate-800 p-0.5">
            <TabsTrigger
              value="receive"
              className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
            >
              <Scale className="w-3.5 h-3.5 mr-1.5" />
              Receive & Reconciliation
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
            >
              <History className="w-3.5 h-3.5 mr-1.5" />
              Receive History & Revisions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="receive" className="space-y-4 pt-2">
            {/* Operator Entry Form (Step 6 & 7) */}
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 space-y-3">
              <span className="text-xs font-semibold text-slate-300 block uppercase tracking-wide">
                Process Receive Quantities & Documentation
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* Received / Output Qty */}
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-400">
                    Received / Output Qty (MTR) <span className="text-rose-400">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    value={receivedQtyInput}
                    onChange={(e) => setReceivedQtyInput(e.target.value)}
                    placeholder="0.000"
                    disabled={isPartialReturnAttempt}
                    className="h-8 text-xs font-mono font-bold bg-slate-900 border-slate-700 text-cyan-300"
                  />
                  <span className="text-[10px] text-slate-500">3-decimal precision</span>
                </div>

                {/* Receive Date */}
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-400">
                    Receive Date <span className="text-rose-400">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={receiveDate}
                    onChange={(e) => setReceiveDate(e.target.value)}
                    disabled={isPartialReturnAttempt}
                    className="h-8 text-xs font-mono bg-slate-900 border-slate-700 text-white"
                  />
                  {timingDifference && (
                    <span
                      className={`text-[10px] font-mono block ${
                        timingDifference.diffDays > 0
                          ? "text-amber-400"
                          : timingDifference.diffDays < 0
                          ? "text-emerald-400"
                          : "text-slate-500"
                      }`}
                    >
                      {timingDifference.diffDays === 0
                        ? "On time"
                        : timingDifference.diffDays > 0
                        ? `${timingDifference.diffDays} day(s) late`
                        : `${Math.abs(timingDifference.diffDays)} day(s) early`}
                    </span>
                  )}
                </div>

                {/* Declared Wastage (Step 15: Optional, explicit) */}
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Declared Wastage (MTR)</span>
                    <span className="text-[10px] text-slate-500">Optional</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    value={declaredWastageInput}
                    onChange={(e) => setDeclaredWastageInput(e.target.value)}
                    placeholder="0.000"
                    disabled={isPartialReturnAttempt}
                    className="h-8 text-xs font-mono bg-slate-900 border-slate-700 text-amber-300"
                  />
                  <span className="text-[10px] text-slate-500">Explicit wastage statement</span>
                </div>

                {/* Declared Shortage (Step 16: Optional, explicit) */}
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Declared Shortage (MTR)</span>
                    <span className="text-[10px] text-slate-500">Optional</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    value={declaredShortageInput}
                    onChange={(e) => setDeclaredShortageInput(e.target.value)}
                    placeholder="0.000"
                    disabled={isPartialReturnAttempt}
                    className="h-8 text-xs font-mono bg-slate-900 border-slate-700 text-rose-300"
                  />
                  <span className="text-[10px] text-slate-500">Explicit shortage statement</span>
                </div>
              </div>

              {/* External Job Work specific fields (Step 7) */}
              {isExternal && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-400">Processor Challan No (Optional)</Label>
                    <Input
                      value={processorChallanNo}
                      onChange={(e) => setProcessorChallanNo(e.target.value)}
                      placeholder="e.g. CH-2026-998"
                      disabled={isPartialReturnAttempt}
                      className="h-8 text-xs bg-slate-900 border-slate-700 text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-400">Processor Reference / Inward No (Optional)</Label>
                    <Input
                      value={processorReference}
                      onChange={(e) => setProcessorReference(e.target.value)}
                      placeholder="e.g. INW-KOTHARI-441"
                      disabled={isPartialReturnAttempt}
                      className="h-8 text-xs bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                </div>
              )}

              {/* Remark */}
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-400">Execution / Receive Remark</Label>
                <Input
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="Optional observation during receive..."
                  disabled={isPartialReturnAttempt}
                  className="h-8 text-xs bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>

            {/* Live Quantity Reconciliation Panel (Step 12 through 20) */}
            {liveReconciliation && (
              <FabricProcessReconciliationPanel
                reconciliation={liveReconciliation}
                currentProcessName={currentStep?.processName || activePrep.processName}
                nextProcessName={nextStep?.processName}
                isLastStep={isLastStep}
              />
            )}

            {/* Revision Requirement UI if already saved (Step 31 & 32) */}
            {hasExistingSavedReceive && (
              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-950/20 space-y-2">
                <div className="flex items-center justify-between text-xs text-amber-300">
                  <span className="font-semibold flex items-center gap-1.5">
                    <RotateCcw className="w-4 h-4 text-amber-400" />
                    SAVED RECEIVE SIMULATION EXISTS ({existingReceive.id})
                  </span>
                  <Badge variant="outline" className="border-amber-500/40 text-amber-300 text-[10px]">
                    REVISION REQUIRED
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-300">
                  Direct silent edits are forbidden. Any change to quantities or dates creates an audited revision and supersedes previous receive records.
                </p>

                {isRevising && (
                  <div className="space-y-1 pt-1">
                    <Label className="text-[11px] text-amber-200">
                      Revision Reason <span className="text-rose-400">*</span>
                    </Label>
                    <Textarea
                      rows={2}
                      value={revisionReason}
                      onChange={(e) => setRevisionReason(e.target.value)}
                      placeholder="State the reason for revising this receive simulation..."
                      className="text-xs bg-slate-950 border-amber-500/50 text-white"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Save Success Summary Notification (Step 24) */}
            {saveSuccessSummary && (
              <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-950/30 space-y-2 font-mono text-xs">
                <div className="flex items-center gap-2 text-emerald-400 font-bold font-sans">
                  <CheckCircle2 className="w-4 h-4" />
                  PROCESS RECEIVE SIMULATION RECORDED
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase font-sans">Receive Ref</span>
                    <span className="text-white truncate block">{saveSuccessSummary.receive.id}</span>
                  </div>

                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase font-sans">Roll</span>
                    <span className="text-indigo-300 block">{saveSuccessSummary.receive.temporaryRollNo}</span>
                  </div>

                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase font-sans">Issued / Received</span>
                    <span className="text-slate-300 block">
                      {saveSuccessSummary.receive.issuedQtyMetre.toFixed(3)} / {saveSuccessSummary.receive.receivedQtyMetre.toFixed(3)}m
                    </span>
                  </div>

                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase font-sans">Reconciliation</span>
                    <span className="text-emerald-400 block">{saveSuccessSummary.receive.reconciliation.reconciliationStatus}</span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 pt-1 font-sans flex items-center justify-between border-t border-slate-800">
                  <span>Inventory: <strong className="text-amber-400">NOT POSTED</strong></span>
                  <span>Stock Position: <strong className="text-cyan-300">{saveSuccessSummary.receive.futureStockPosition}</strong></span>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="pt-2">
            <FabricProcessReceiveHistory rollDraftId={roll.id} />
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-[10px] text-slate-500 font-mono">
            Phase 5E Pure Simulation · Zero Stock/Financial Changes
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="border-slate-700 text-slate-300 text-xs"
            >
              Close
            </Button>

            <Button
              size="sm"
              disabled={
                isPartialReturnAttempt ||
                !liveReconciliation ||
                liveReconciliation.reconciliationStatus === "INVALID_DECLARATION" ||
                (hasExistingSavedReceive && isRevising && !revisionReason.trim())
              }
              onClick={handleSaveReceiveSimulation}
              className={`text-xs font-semibold text-white ${
                hasExistingSavedReceive && !isRevising
                  ? "bg-amber-600 hover:bg-amber-500"
                  : isExternal
                  ? "bg-cyan-600 hover:bg-cyan-500"
                  : "bg-indigo-600 hover:bg-indigo-500"
              }`}
            >
              {hasExistingSavedReceive
                ? isRevising
                  ? "Confirm Receive Revision"
                  : "Revise Receive"
                : "Save Receive Simulation"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

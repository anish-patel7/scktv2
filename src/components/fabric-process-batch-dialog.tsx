import React, { useState, useMemo } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Layers,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Truck,
  ShieldAlert,
  Info,
  ArrowRight,
} from "lucide-react";
import {
  FabricProcessExecutionService,
  type FabricProcessIssueBatch,
  type RateSourceType,
} from "@/services/fabric-process-execution.service";
import {
  FabricProcessRoutingService,
  type FabricProcessRoutePlan,
} from "@/services/fabric-process-routing.service";
import {
  type FabricRollDraft,
  type JobCardDraft,
} from "@/services/production-planning.service";
import type { ProductionOrder } from "@/lib/production-store";

interface FabricProcessBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRolls: FabricRollDraft[];
  order?: ProductionOrder | null | undefined;
  jobCards?: JobCardDraft[] | undefined;
  onBatchSaved?: () => void;
}

export function FabricProcessBatchDialog({
  open,
  onOpenChange,
  selectedRolls,
  order,
  jobCards = [],
  onBatchSaved,
}: FabricProcessBatchDialogProps) {
  const [issueDate, setIssueDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [expectedReturnDate, setExpectedReturnDate] = useState<string>("");
  const [plannedRate, setPlannedRate] = useState<string>("");
  const [executionRemark, setExecutionRemark] = useState<string>("");
  const [transporterName, setTransporterName] = useState<string>("");
  const [lrNo, setLrNo] = useState<string>("");

  const [savedBatch, setSavedBatch] = useState<FabricProcessIssueBatch | null>(null);

  // Derive candidate route plans and steps
  const rollData = useMemo(() => {
    return selectedRolls.map((roll) => {
      const plan = FabricProcessRoutingService.getRoutePlanForRoll(roll.id);
      const readyStep = plan ? plan.steps.find((s) => s.status === "READY") : undefined;
      return {
        roll,
        plan,
        readyStep,
      };
    });
  }, [selectedRolls]);

  // Compatibility validation via domain logic
  const compatibility = useMemo(() => {
    if (rollData.length === 0) {
      return { compatible: false, errors: ["No rolls selected."] };
    }

    const errors: string[] = [];

    // Check if any roll has no plan or no ready step
    for (const { roll, plan, readyStep } of rollData) {
      if (!plan) {
        errors.push(`Roll ${roll.temporaryRollNo} has no process route.`);
      } else if (plan.routeDecision === "NO_FURTHER_PROCESS") {
        errors.push(`Roll ${roll.temporaryRollNo} is marked NO_FURTHER_PROCESS.`);
      } else if (plan.status === "BLOCKED") {
        errors.push(`Roll ${roll.temporaryRollNo} route is BLOCKED.`);
      } else if (plan.status === "REVIEW_REQUIRED") {
        errors.push(`Roll ${roll.temporaryRollNo} route requires REVIEW.`);
      } else if (!readyStep) {
        errors.push(`Roll ${roll.temporaryRollNo} has no READY route step.`);
      }
    }

    if (errors.length > 0) {
      return { compatible: false, errors };
    }

    const first = rollData[0]?.readyStep;
    if (!first) {
      return { compatible: false, errors: ["Invalid step state."] };
    }

    // Step 38: Different Process check
    const diffProcess = rollData.some((r) => r.readyStep?.processId !== first.processId);
    if (diffProcess) {
      errors.push("Selected rolls require different processes. Batches must share the same process.");
    }

    // Step 39: Internal / External mix check
    const diffMode = rollData.some((r) => r.readyStep?.executionMode !== first.executionMode);
    if (diffMode) {
      errors.push("Cannot mix Internal Process and External Job Work in the same batch.");
    }

    // Step 37: Different Processor check
    if (first.executionMode === "EXTERNAL_JOBWORK") {
      const diffProcessor = rollData.some((r) => r.readyStep?.jobPartyId !== first.jobPartyId);
      if (diffProcessor) {
        errors.push("Selected rolls require different processors. Separate batches required.");
      }
    }

    return {
      compatible: errors.length === 0,
      errors,
    };
  }, [rollData]);

  const firstReadyStep = rollData[0]?.readyStep;
  const isExternal = firstReadyStep?.executionMode === "EXTERNAL_JOBWORK";
  const totalQtyMetre = useMemo(() => {
    return selectedRolls.reduce((acc, r) => acc + r.qtyMetre, 0);
  }, [selectedRolls]);

  const handleSaveBatch = () => {
    if (!compatibility.compatible || rollData.length === 0) return;

    const rateNum = plannedRate ? parseFloat(plannedRate) : undefined;
    const rollIds = selectedRolls.map((r) => r.id);

    const res = FabricProcessExecutionService.createBatchProcessIssuePreparation(rollIds, {
      issueDate,
      expectedReturnDate: expectedReturnDate || undefined,
      plannedRate: rateNum,
      processInstruction: firstReadyStep?.instruction,
      remark: executionRemark || undefined,
      transporterName: transporterName || undefined,
      lrNo: lrNo || undefined,
    });

    if (res.batch) {
      setSavedBatch(res.batch);
      onBatchSaved?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-white max-h-[92vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-indigo-500/40 text-indigo-300 bg-indigo-500/10 font-mono text-[10px]">
                MULTI-ROLL BATCH
              </Badge>
              <DialogTitle className="text-base font-bold text-white">
                {isExternal ? "JOB WORK OUTWARD BATCH PREPARATION" : "INTERNAL PROCESS BATCH PREPARATION"}
              </DialogTitle>
            </div>
            <Badge
              variant="outline"
              className={
                compatibility.compatible
                  ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10 text-[10px]"
                  : "border-rose-500/40 text-rose-300 bg-rose-500/10 text-[10px]"
              }
            >
              {compatibility.compatible ? "COMPATIBLE BATCH" : "INCOMPATIBLE BATCH"}
            </Badge>
          </div>
          <DialogDescription className="text-slate-400 text-xs pt-1">
            Prepares execution for multiple rolls sharing the same process step. Each roll line retains distinct traceable identity.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Incompatibility Warnings (Step 37, 38, 39) */}
          {!compatibility.compatible && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Cannot Prepare Batch (Incompatible Selection)</span>
              </div>
              <ul className="list-disc pl-5 text-[11px] space-y-0.5 text-rose-200">
                {compatibility.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
              <span className="text-[10px] text-rose-300/80 block pt-1">
                Please deselect incompatible rolls or prepare them in separate batches.
              </span>
            </div>
          )}

          {/* Common Batch Summary Cards */}
          {firstReadyStep && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase font-sans">Total Rolls</span>
                <span className="text-white font-bold text-sm">{selectedRolls.length} Rolls</span>
                <span className="text-[10px] text-indigo-400 block font-sans">Traceable Lines</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase font-sans">Total Batch Qty</span>
                <span className="text-emerald-300 font-bold text-sm">{totalQtyMetre.toFixed(3)} MTR</span>
                <span className="text-[10px] text-slate-500 block font-sans">Sum of Rolls</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase font-sans">Process</span>
                <span className="text-white font-semibold truncate block" title={firstReadyStep.processName}>
                  {firstReadyStep.processName}
                </span>
                <span className="text-[10px] text-slate-400 block font-sans">Mode: {firstReadyStep.executionMode}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase font-sans">
                  {isExternal ? "Job Worker" : "Destination"}
                </span>
                <span className="text-cyan-300 font-semibold truncate block" title={firstReadyStep.jobPartyName || "INTERNAL"}>
                  {isExternal ? firstReadyStep.jobPartyName || "Unknown" : "NOT CONFIGURED"}
                </span>
                <span className="text-[10px] text-slate-400 block font-sans">
                  {isExternal ? firstReadyStep.subPartyName || "Main Unit" : "Internal WIP"}
                </span>
              </div>
            </div>
          )}

          {/* Traceable Roll Lines Table (Step 35 & 36) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-300 font-semibold px-1">
              <span>Batch Roll Lines ({selectedRolls.length})</span>
              <span className="text-[10px] text-slate-500 font-normal">Identities preserved individually</span>
            </div>

            <div className="rounded-lg border border-slate-800 overflow-hidden bg-slate-950/60 max-h-48 overflow-y-auto">
              <table className="w-full text-xs text-left font-mono">
                <thead className="bg-slate-900 border-b border-slate-800 text-[10px] text-slate-400 font-sans">
                  <tr>
                    <th className="py-1.5 px-3">Roll No</th>
                    <th className="py-1.5 px-3">Qty (MTR)</th>
                    <th className="py-1.5 px-3">Process</th>
                    <th className="py-1.5 px-3">Mode</th>
                    <th className="py-1.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {rollData.map(({ roll, readyStep }) => (
                    <tr key={roll.id} className="hover:bg-slate-900/40">
                      <td className="py-1.5 px-3 text-indigo-300 font-semibold">{roll.temporaryRollNo}</td>
                      <td className="py-1.5 px-3 text-white font-bold">{roll.qtyMetre.toFixed(3)}</td>
                      <td className="py-1.5 px-3 text-slate-300 font-sans">{readyStep?.processName || "—"}</td>
                      <td className="py-1.5 px-3 text-cyan-300">{readyStep?.executionMode || "—"}</td>
                      <td className="py-1.5 px-3">
                        <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[9px]">
                          READY
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Batch Planning Inputs */}
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

            {isExternal && (
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-300 flex items-center justify-between">
                  <span>Expected Return Date</span>
                  <span className="text-slate-500 text-[10px] font-normal">Optional manual</span>
                </Label>
                <Input
                  type="date"
                  value={expectedReturnDate}
                  onChange={(e) => setExpectedReturnDate(e.target.value)}
                  className="h-8 text-xs bg-slate-950 border-slate-800 text-white"
                />
              </div>
            )}
          </div>

          {/* Optional Transport Fields */}
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

          {/* Execution Remark */}
          <div className="space-y-1 text-xs">
            <Label className="text-[11px] text-slate-300">Batch Remark</Label>
            <Textarea
              value={executionRemark}
              onChange={(e) => setExecutionRemark(e.target.value)}
              placeholder="Batch handling instructions or processing remarks..."
              className="h-14 text-xs bg-slate-950 border-slate-800 text-white resize-none"
            />
          </div>

          {/* Future Stock Position Notice */}
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

          {/* Saved Batch Success Card */}
          {savedBatch && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-1">
              <div className="flex items-center justify-between font-bold">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>BATCH PREPARATION RECORDED</span>
                </div>
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 font-mono text-[10px]">
                  {savedBatch.batchNo}
                </Badge>
              </div>
              <div className="text-[11px] text-emerald-200/90 pt-1 font-mono">
                {savedBatch.totalRolls} Rolls prepared · Total: {savedBatch.totalQtyMetre.toFixed(3)} MTR · Status: PREPARED
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between sm:justify-between w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="border-slate-700 text-slate-300"
          >
            Close
          </Button>

          <Button
            size="sm"
            disabled={!compatibility.compatible}
            onClick={handleSaveBatch}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Save Batch Preparation</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import React, { useState, useMemo, useEffect } from "react";
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
import {
  Layers,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Scale,
  ShieldAlert,
  Info,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  FabricProcessReceiveService,
  deriveReconciliationStatus,
  type CreateProcessReceiveInput,
  type QuantityReconciliationResult,
  type FabricProcessReceiveSimulation,
} from "@/services/fabric-process-receive.service";
import {
  FabricProcessExecutionService,
  type FabricProcessIssuePreparation,
} from "@/services/fabric-process-execution.service";
import { type FabricRollDraft } from "@/services/production-planning.service";

interface FabricProcessReceiveBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRolls: FabricRollDraft[];
  onBatchSaved?: () => void;
}

interface BatchRowItem {
  roll: FabricRollDraft;
  prep: FabricProcessIssuePreparation;
  receivedQtyInput: string;
  declaredWastageInput: string;
  declaredShortageInput: string;
}

export function FabricProcessReceiveBatchDialog({
  open,
  onOpenChange,
  selectedRolls,
  onBatchSaved,
}: FabricProcessReceiveBatchDialogProps) {
  const [receiveDate, setReceiveDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [processorChallanNo, setProcessorChallanNo] = useState<string>("");
  const [processorReference, setProcessorReference] = useState<string>("");
  const [remark, setRemark] = useState<string>("");

  const [rowItems, setRowItems] = useState<Record<string, { received: string; wastage: string; shortage: string }>>({});
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Derive active preparations for selected rolls
  const rollPrepData = useMemo(() => {
    return selectedRolls.map((roll) => {
      const prep = FabricProcessExecutionService.getActivePreparationForRoll(roll.id);
      return { roll, prep };
    });
  }, [selectedRolls, open]);

  // Compatibility validation (Must share process, mode, processor)
  const compatibility = useMemo(() => {
    if (rollPrepData.length === 0) {
      return { compatible: false, errors: ["No rolls selected for batch receive."] };
    }

    const errors: string[] = [];

    // Verify all have active preparations
    for (const { roll, prep } of rollPrepData) {
      if (!prep) {
        errors.push(`Roll ${roll.temporaryRollNo} has no active Process Issue Preparation.`);
      } else if (prep.status !== "PREPARED") {
        errors.push(`Roll ${roll.temporaryRollNo} preparation status is ${prep.status} (must be PREPARED).`);
      }
    }

    if (errors.length > 0) {
      return { compatible: false, errors };
    }

    const first = rollPrepData[0]?.prep;
    if (!first) {
      return { compatible: false, errors: ["Invalid preparation state."] };
    }

    // Process check
    const diffProcess = rollPrepData.some((r) => r.prep?.processId !== first.processId);
    if (diffProcess) {
      errors.push("Selected rolls have different processes. Batch receive requires uniform process.");
    }

    // Execution mode check
    const diffMode = rollPrepData.some((r) => r.prep?.executionMode !== first.executionMode);
    if (diffMode) {
      errors.push("Cannot mix Internal and External Job Work in a single receive batch.");
    }

    // Processor check for external job work
    if (first.executionMode === "EXTERNAL_JOBWORK") {
      const diffProcessor = rollPrepData.some((r) => r.prep?.jobPartyId !== first.jobPartyId);
      if (diffProcessor) {
        errors.push("Selected rolls are issued to different processors. Separate batches required.");
      }
    }

    return {
      compatible: errors.length === 0,
      errors,
    };
  }, [rollPrepData]);

  const firstPrep = rollPrepData[0]?.prep;
  const isExternal = firstPrep?.executionMode === "EXTERNAL_JOBWORK";

  // Initialize row items when opened or rolls change
  useEffect(() => {
    if (open && compatibility.compatible) {
      setSaveSuccess(false);
      const initial: Record<string, { received: string; wastage: string; shortage: string }> = {};
      for (const { roll, prep } of rollPrepData) {
        if (prep) {
          initial[roll.id] = {
            received: String(prep.issueQtyMetre),
            wastage: "",
            shortage: "",
          };
        }
      }
      setRowItems(initial);
      setReceiveDate(new Date().toISOString().slice(0, 10));
      setProcessorChallanNo("");
      setProcessorReference("");
      setRemark("");
    }
  }, [open, compatibility.compatible, rollPrepData]);

  // Handle cell edits
  const handleUpdateRow = (rollId: string, field: "received" | "wastage" | "shortage", val: string) => {
    setRowItems((prev) => {
      const existing = prev[rollId] || { received: "", wastage: "", shortage: "" };
      return {
        ...prev,
        [rollId]: {
          received: field === "received" ? val : existing.received,
          wastage: field === "wastage" ? val : existing.wastage,
          shortage: field === "shortage" ? val : existing.shortage,
        },
      };
    });
  };

  // Derive per-row reconciliation results (Steps 40 & 41: Independent Reconciliation)
  const evaluatedRows = useMemo(() => {
    return rollPrepData.map(({ roll, prep }) => {
      const state = rowItems[roll.id] || {
        received: String(prep?.issueQtyMetre || 0),
        wastage: "",
        shortage: "",
      };

      const receivedNum = parseFloat(state.received) || 0;
      const wastageNum = parseFloat(state.wastage) || 0;
      const shortageNum = parseFloat(state.shortage) || 0;

      const recon: QuantityReconciliationResult = prep
        ? deriveReconciliationStatus({
            issuedQtyMetre: prep.issueQtyMetre,
            receivedQtyMetre: receivedNum,
            declaredWastageQtyMetre: wastageNum,
            declaredShortageQtyMetre: shortageNum,
          })
        : {
            issuedQtyMetre: 0,
            receivedQtyMetre: 0,
            rawVarianceQtyMetre: 0,
            declaredWastageQtyMetre: 0,
            declaredShortageQtyMetre: 0,
            unexplainedVarianceQtyMetre: 0,
            isOverReceipt: false,
            overReceiptQtyMetre: 0,
            isCleanExact: false,
            reconciliationStatus: "RECONCILIATION_REQUIRED",
            statusMessage: "No preparation found",
            canAdvanceRouteStep: false,
          };

      return {
        roll,
        prep,
        state,
        recon,
      };
    });
  }, [rollPrepData, rowItems]);

  // Overall batch summary KPIs (Step 42)
  const batchSummary = useMemo(() => {
    const totalRolls = evaluatedRows.length;
    let cleanRolls = 0;
    let reviewRequiredRolls = 0;
    let invalidDeclarations = 0;
    let totalIssued = 0;
    let totalReceived = 0;

    for (const row of evaluatedRows) {
      if (row.prep) {
        totalIssued += row.prep.issueQtyMetre;
      }
      const rec = parseFloat(row.state.received) || 0;
      totalReceived += rec;

      if (row.recon.isCleanExact) {
        cleanRolls++;
      } else {
        reviewRequiredRolls++;
      }

      if (row.recon.reconciliationStatus === "INVALID_DECLARATION") {
        invalidDeclarations++;
      }
    }

    return {
      totalRolls,
      cleanRolls,
      reviewRequiredRolls,
      invalidDeclarations,
      totalIssued,
      totalReceived,
    };
  }, [evaluatedRows]);

  const handleSaveBatchReceive = () => {
    if (!compatibility.compatible || evaluatedRows.length === 0) return;
    if (batchSummary.invalidDeclarations > 0) return;

    const items: CreateProcessReceiveInput[] = evaluatedRows.map((r) => ({
      issuePreparationId: r.prep!.id,
      receivedQtyMetre: parseFloat(r.state.received) || 0,
      declaredWastageQtyMetre: parseFloat(r.state.wastage) || 0,
      declaredShortageQtyMetre: parseFloat(r.state.shortage) || 0,
      receiveDate,
      processorChallanNo: isExternal ? processorChallanNo.trim() || undefined : undefined,
      processorReference: isExternal ? processorReference.trim() || undefined : undefined,
      remark: remark.trim() || undefined,
    }));

    const res = FabricProcessReceiveService.createBatchProcessReceiveSimulation(items);
    setSaveSuccess(true);
    onBatchSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl bg-slate-900 border-slate-800 text-white font-sans max-h-[92vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-800 pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <span>
                  {isExternal ? "JOB WORK INWARD BATCH" : "INTERNAL PROCESS COMPLETION BATCH"}
                </span>
                <Badge variant="outline" className="border-indigo-500/40 text-indigo-300 text-[10px]">
                  {selectedRolls.length} ROLLS
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Per-Roll independent quantity reconciliation simulation. No roll identities are collapsed.
              </DialogDescription>
            </div>

            {firstPrep && (
              <div className="text-right text-xs">
                <span className="text-slate-400 block font-mono text-[11px]">
                  Process: <strong className="text-white">{firstPrep.processName}</strong>
                </span>
                {isExternal && firstPrep.jobPartyName && (
                  <span className="text-cyan-300 block font-mono text-[11px]">
                    Processor: {firstPrep.jobPartyName}
                  </span>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Compatibility Blockers if any */}
        {!compatibility.compatible && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-rose-300">
              <ShieldAlert className="w-4 h-4" />
              Batch Incompatible
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-300">
              {compatibility.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {compatibility.compatible && (
          <div className="space-y-4 pt-1">
            {/* Batch Level Common Fields */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-400">Receive Date</Label>
                <Input
                  type="date"
                  value={receiveDate}
                  onChange={(e) => setReceiveDate(e.target.value)}
                  className="h-8 text-xs font-mono bg-slate-900 border-slate-700 text-white"
                />
              </div>

              {isExternal && (
                <>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-400">Processor Challan No (Optional)</Label>
                    <Input
                      value={processorChallanNo}
                      onChange={(e) => setProcessorChallanNo(e.target.value)}
                      placeholder="e.g. CH-2026-BATCH"
                      className="h-8 text-xs bg-slate-900 border-slate-700 text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-400">Processor Reference (Optional)</Label>
                    <Input
                      value={processorReference}
                      onChange={(e) => setProcessorReference(e.target.value)}
                      placeholder="e.g. INW-BATCH-01"
                      className="h-8 text-xs bg-slate-900 border-slate-700 text-white"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Batch Summary KPI Strip (Step 42) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block font-sans">Total Issued</span>
                <span className="text-sm font-bold text-white block mt-0.5">
                  {batchSummary.totalIssued.toFixed(3)} MTR
                </span>
                <span className="text-[9px] text-slate-500 font-sans">{batchSummary.totalRolls} rolls</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block font-sans">Total Received</span>
                <span className="text-sm font-bold text-cyan-300 block mt-0.5">
                  {batchSummary.totalReceived.toFixed(3)} MTR
                </span>
                <span className="text-[9px] text-slate-500 font-sans">Across batch</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-emerald-500/20">
                <span className="text-[10px] text-emerald-400 uppercase block font-sans">Clean Rolls</span>
                <span className="text-sm font-bold text-emerald-300 block mt-0.5">
                  {batchSummary.cleanRolls} of {batchSummary.totalRolls}
                </span>
                <span className="text-[9px] text-emerald-500 font-sans">Eligible for progression</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-amber-500/20">
                <span className="text-[10px] text-amber-400 uppercase block font-sans">Review Required</span>
                <span className="text-sm font-bold text-amber-300 block mt-0.5">
                  {batchSummary.reviewRequiredRolls} of {batchSummary.totalRolls}
                </span>
                <span className="text-[9px] text-amber-500 font-sans">Variance / Declarations</span>
              </div>
            </div>

            {/* Per-Roll Table (Step 40 & 43: Every line retains identity and reconciliation) */}
            <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/70">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Roll No</th>
                      <th className="py-2.5 px-3">Issued Qty</th>
                      <th className="py-2.5 px-3">Received Qty (MTR)</th>
                      <th className="py-2.5 px-3">Wastage (MTR)</th>
                      <th className="py-2.5 px-3">Shortage (MTR)</th>
                      <th className="py-2.5 px-3">Variance</th>
                      <th className="py-2.5 px-3">Reconciliation Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {evaluatedRows.map(({ roll, prep, state, recon }) => {
                      const isClean = recon.isCleanExact;
                      const hasError = recon.reconciliationStatus === "INVALID_DECLARATION";

                      return (
                        <tr
                          key={roll.id}
                          className={`hover:bg-slate-900/50 transition-colors ${
                            hasError ? "bg-rose-950/20" : ""
                          }`}
                        >
                          <td className="py-2.5 px-3 font-semibold text-indigo-300">
                            {roll.temporaryRollNo}
                            <span className="text-[9px] text-slate-500 block font-mono">
                              Step {prep?.stepSequence || 1}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-white">
                            {prep?.issueQtyMetre.toFixed(3)}
                          </td>

                          <td className="py-2 px-3">
                            <Input
                              type="number"
                              step="0.001"
                              min="0"
                              value={state.received}
                              onChange={(e) => handleUpdateRow(roll.id, "received", e.target.value)}
                              className="h-7 w-28 text-xs font-mono font-bold bg-slate-900 border-slate-700 text-cyan-300"
                            />
                          </td>

                          <td className="py-2 px-3">
                            <Input
                              type="number"
                              step="0.001"
                              min="0"
                              placeholder="0.000"
                              value={state.wastage}
                              onChange={(e) => handleUpdateRow(roll.id, "wastage", e.target.value)}
                              className="h-7 w-24 text-xs font-mono bg-slate-900 border-slate-700 text-amber-300"
                            />
                          </td>

                          <td className="py-2 px-3">
                            <Input
                              type="number"
                              step="0.001"
                              min="0"
                              placeholder="0.000"
                              value={state.shortage}
                              onChange={(e) => handleUpdateRow(roll.id, "shortage", e.target.value)}
                              className="h-7 w-24 text-xs font-mono bg-slate-900 border-slate-700 text-rose-300"
                            />
                          </td>

                          <td className="py-2.5 px-3">
                            <span
                              className={
                                recon.isOverReceipt
                                  ? "text-purple-300 font-bold"
                                  : recon.rawVarianceQtyMetre > 0
                                  ? "text-amber-300 font-bold"
                                  : "text-emerald-400 font-bold"
                              }
                            >
                              {recon.isOverReceipt
                                ? `+${recon.overReceiptQtyMetre.toFixed(3)}`
                                : recon.rawVarianceQtyMetre.toFixed(3)}
                            </span>
                            {recon.unexplainedVarianceQtyMetre > 0 && (
                              <span className="text-[9px] text-amber-400 block">
                                {recon.unexplainedVarianceQtyMetre.toFixed(3)} unexp.
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 font-sans">
                            {isClean ? (
                              <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-500/10 text-[9px]">
                                CLEAN EXACT
                              </Badge>
                            ) : hasError ? (
                              <Badge variant="outline" className="border-rose-500 text-rose-300 bg-rose-950/40 text-[9px]">
                                INVALID DECLARATION
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-500/10 text-[9px]">
                                REVIEW REQUIRED
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Success message */}
            {saveSuccess && (
              <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-950/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Batch receive simulation completed for {evaluatedRows.length} rolls. Individual reconciliation records stored.
                </span>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[10px] text-slate-500 font-mono">
            Zero Stock/Financial Mutation · Per-Roll Reconciled
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
                !compatibility.compatible ||
                evaluatedRows.length === 0 ||
                batchSummary.invalidDeclarations > 0 ||
                saveSuccess
              }
              onClick={handleSaveBatchReceive}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              Save Batch Receive Simulation
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

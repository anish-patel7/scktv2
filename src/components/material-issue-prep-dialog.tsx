import React, { useState } from "react";
import {
  PackageCheck,
  Layers,
  Building2,
  ShieldCheck,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  BookmarkCheck,
  Boxes,
  ArrowRight,
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
import { toast } from "sonner";
import {
  ProductionPlanningService,
  type JobCardDraft,
  type JobCardMaterialIssuePreparation,
  type JobCardWeftIssueLine,
} from "@/services/production-planning.service";
import type { ProductionOrder } from "@/lib/production-store";

interface MaterialIssuePrepDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: JobCardDraft | null;
  order: ProductionOrder | null;
  onSaved?: (prep: JobCardMaterialIssuePreparation) => void;
  onOpenLedger?: (draft: JobCardDraft) => void;
}

export const MaterialIssuePrepDialog: React.FC<MaterialIssuePrepDialogProps> = ({
  open,
  onOpenChange,
  draft,
  order,
  onSaved,
  onOpenLedger,
}) => {
  if (!draft || !order) return null;

  // Fetch or prepare calculation
  const initialPrep = ProductionPlanningService.getJobCardMaterialIssuePreparation(draft, order);
  const [prep, setPrep] = useState<JobCardMaterialIssuePreparation>(initialPrep);

  const handleIssueQtyChange = (materialCode: string, newQtyVal: number) => {
    const lines = prep.weftIssuePlan.lines.map((line): JobCardWeftIssueLine => {
      if (line.materialCode !== materialCode) return line;

      const plannedIssueQtyKg = Math.max(0, Math.round(newQtyVal * 1000) / 1000);
      const remainingRequirementKg = Math.max(0, Math.round((line.expectedQtyKg - plannedIssueQtyKg) * 1000) / 1000);

      let status: JobCardWeftIssueLine["status"] = "READY";
      let error: string | undefined;

      // Step 25: Check production allocation limit
      if (plannedIssueQtyKg > line.availableForThisJobCardKg) {
        status = "EXCEEDED_PRODUCTION_ALLOCATION";
        error = `Exceeds production allocation by ${(plannedIssueQtyKg - line.availableForThisJobCardKg).toFixed(2)} KG.`;
      }
      // Step 26: Check Job Card requirement limit
      else if (plannedIssueQtyKg > line.expectedQtyKg) {
        status = "EXCEEDED_REQUIREMENT";
        error = `Exceeds Job Card requirement by ${(plannedIssueQtyKg - line.expectedQtyKg).toFixed(2)} KG.`;
      } else if (remainingRequirementKg > 0) {
        status = "SHORTAGE";
        error = `${remainingRequirementKg.toFixed(2)} KG unfulfilled requirement.`;
      }

      // Proportional lots adjustment
      const isManual = plannedIssueQtyKg !== line.expectedQtyKg;
      const updatedLots = line.allocatedLots.map((lot) => ({
        ...lot,
        allocatedQtyKg: Math.min(lot.allocatedQtyKg, plannedIssueQtyKg),
        isManualOverride: isManual,
      }));

      return {
        ...line,
        plannedIssueQtyKg,
        remainingRequirementKg,
        allocatedLots: updatedLots,
        status,
        ...(error ? { error } : {}),
      };
    });

    const hasOverAllocation = lines.some(
      (l) => l.status === "EXCEEDED_PRODUCTION_ALLOCATION" || l.status === "EXCEEDED_REQUIREMENT"
    );
    const hasShortage = lines.some((l) => l.status === "SHORTAGE");
    const totalPlannedIssueKg = Math.round(lines.reduce((s, l) => s + l.plannedIssueQtyKg, 0) * 1000) / 1000;
    const totalRemainingRequirementKg = Math.round(lines.reduce((s, l) => s + l.remainingRequirementKg, 0) * 1000) / 1000;

    const updatedPrep: JobCardMaterialIssuePreparation = {
      ...prep,
      weftIssuePlan: {
        ...prep.weftIssuePlan,
        lines,
        totalPlannedIssueKg,
        totalRemainingRequirementKg,
        hasOverAllocation,
        hasShortage,
      },
      issuePlanStatus: hasOverAllocation ? "BLOCKED" : hasShortage ? "BLOCKED" : "MATERIAL ISSUE PLAN READY",
    };

    setPrep(updatedPrep);
  };

  const handleSavePreparation = () => {
    if (prep.issuePlanStatus === "BLOCKED") {
      toast.error("Issue Preparation Blocked", {
        description: "Cannot save issue plan with allocation or requirement limit violations.",
      });
      return;
    }

    ProductionPlanningService.saveMaterialIssuePreparation(prep);
    toast.success("Material Issue Preparation Saved", {
      description: `Issue plan saved for ${draft.draftCardNo}. No real yarn issue posted; inventory untouched.`,
    });

    onSaved?.(prep);
    onOpenChange(false);
  };

  const handleSimulateIssue = () => {
    if (prep.issuePlanStatus === "BLOCKED") {
      toast.error("Issue Simulation Blocked", {
        description: "Cannot simulate issue with allocation or requirement limit violations.",
      });
      return;
    }

    ProductionPlanningService.saveMaterialIssuePreparation(prep);
    const result = ProductionPlanningService.simulateBulkInitialIssue({
      draft,
      order,
      remark: "Initial Issue Simulation from Preparation",
    });

    if (result.success) {
      toast.success("Initial Issue Simulated", {
        description: `Created initial issue simulation for ${result.createdCount} material line(s). Inventory untouched.`,
      });
      onOpenChange(false);
      onOpenLedger?.(draft);
    } else {
      toast.error("Simulation Encountered Blockers", {
        description: result.errors.join("; "),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <PackageCheck className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  MATERIAL ISSUE PREPARATION
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {draft.draftCardNo} · {draft.loomNo} ({draft.plannedQtyMetre.toLocaleString()} MTR)
                </DialogDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className={`font-mono text-xs ${
                prep.issuePlanStatus === "MATERIAL ISSUE PLAN READY"
                  ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                  : "border-rose-500/40 text-rose-600 bg-rose-500/10"
              }`}
            >
              {prep.issuePlanStatus}
            </Badge>
          </div>
        </DialogHeader>

        {/* Informational Disclaimer Banner */}
        <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-3 flex items-start gap-2.5">
          <ShieldCheck className="size-4 text-purple-600 shrink-0 mt-0.5" />
          <div className="text-xs text-purple-950 dark:text-purple-200">
            <span className="font-bold block mb-0.5">PLANNING PREPARATION ONLY (Step 20 & 28)</span>
            This tool prepares the Weft material issue parameters against Job Card Draft{" "}
            <span className="font-mono font-bold">{draft.draftCardNo}</span>. No inventory OUT transactions, no real yarn issues,
            and no reserved stock modifications are performed. Warp yarn is executed separately via Beam/Warping operations.
          </div>
        </div>

        {/* Warp Context (Informational Only - Step 21) */}
        <div className="p-3.5 rounded-lg border border-border bg-card space-y-2.5">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers className="size-3.5 text-blue-600" /> Warp Material Context (Informational — No JC Issue)
            </div>
            <Badge variant="outline" className="text-[0.625rem] font-mono border-blue-500/40 text-blue-600">
              {prep.warpContext.beamReadiness}
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground block text-[0.6875rem]">Beam Ref / Plan:</span>
              <span className="font-mono font-bold text-foreground">
                {prep.warpContext.beamNo || prep.warpContext.beamPlanId || "None"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[0.6875rem]">Total Ends:</span>
              <span className="font-mono font-medium text-foreground">
                {prep.warpContext.totalEnds}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[0.6875rem]">Warp Length:</span>
              <span className="font-mono font-medium text-foreground">
                {prep.warpContext.plannedLengthMetre.toLocaleString()} MTR
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[0.6875rem]">Execution Path:</span>
              <span className="font-medium text-muted-foreground text-[0.6875rem]">
                Warping & Sizing / Beam Store
              </span>
            </div>
          </div>

          {prep.warpContext.warpComposition.length > 0 && (
            <div className="pt-1 text-[0.6875rem] text-muted-foreground space-y-1">
              <span className="font-semibold block text-foreground">Warp Composition:</span>
              <div className="flex flex-wrap gap-2">
                {prep.warpContext.warpComposition.map((w, idx) => (
                  <div key={idx} className="p-1.5 rounded bg-muted/40 border border-border/60 flex items-center gap-1.5">
                    <span className="font-mono font-bold text-foreground">{w.materialCode}</span>
                    <span>({w.requiredKg.toFixed(1)} KG)</span>
                    {w.allocatedLots.length > 0 && (
                      <span className="text-blue-600 dark:text-blue-400 font-mono">
                        [{w.allocatedLots.map((l) => `${l.lotNo}: ${l.plannedKg}kg`).join(", ")}]
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Weft Material Issue Preparation (Step 22-26) */}
        <div className="p-3.5 rounded-lg border border-border bg-card space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Boxes className="size-3.5 text-purple-600" /> Weft Material Issue Plan (Step 22)
            </div>
            <div className="text-xs font-mono text-muted-foreground flex items-center gap-3">
              <span>Expected: <strong className="text-foreground">{prep.weftIssuePlan.totalExpectedKg.toFixed(2)} KG</strong></span>
              <span>Planned Issue: <strong className="text-primary">{prep.weftIssuePlan.totalPlannedIssueKg.toFixed(2)} KG</strong></span>
            </div>
          </div>

          <div className="space-y-3">
            {prep.weftIssuePlan.lines.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 text-center">No Weft requirements found for this design.</p>
            ) : (
              prep.weftIssuePlan.lines.map((line, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border text-xs space-y-2.5 transition-colors ${
                    line.status === "EXCEEDED_PRODUCTION_ALLOCATION" || line.status === "EXCEEDED_REQUIREMENT"
                      ? "border-rose-500/40 bg-rose-500/5 dark:bg-rose-950/20"
                      : line.status === "SHORTAGE"
                      ? "border-amber-500/40 bg-amber-500/5 dark:bg-amber-950/20"
                      : "border-border bg-muted/20"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-foreground text-sm">{line.materialCode}</span>
                      <span className="text-muted-foreground">· {line.materialName}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[0.625rem] font-mono ${
                          line.status === "READY"
                            ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                            : "border-rose-500/40 text-rose-600 bg-rose-500/10"
                        }`}
                      >
                        {line.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </div>

                  {/* Quantities breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[0.6875rem]">
                    <div>
                      <span className="text-muted-foreground block">Expected Qty:</span>
                      <span className="font-mono font-bold text-foreground">
                        {line.expectedQtyKg.toFixed(2)} KG
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Production Allocation:</span>
                      <span className="font-mono font-semibold text-foreground">
                        {line.productionAllocatedKg.toFixed(2)} KG
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Other Job Cards:</span>
                      <span className="font-mono text-muted-foreground">
                        {line.otherJobCardsPlannedKg.toFixed(2)} KG
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Available for this JC:</span>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {line.availableForThisJobCardKg.toFixed(2)} KG
                      </span>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-muted-foreground block font-bold text-primary">Planned Issue Qty:</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          value={line.plannedIssueQtyKg}
                          onChange={(e) =>
                            handleIssueQtyChange(line.materialCode, parseFloat(e.target.value) || 0)
                          }
                          className="h-7 text-xs font-mono font-bold"
                        />
                        <span className="text-muted-foreground font-mono">KG</span>
                      </div>
                    </div>
                  </div>

                  {/* Lot Traceability (Step 23) */}
                  <div className="pt-1 border-t border-border/40 text-[0.6875rem]">
                    <span className="text-muted-foreground font-semibold block mb-1">
                      Traceable Lot Allocations (Reused from Phase 2/3):
                    </span>
                    {line.allocatedLots.length === 0 ? (
                      <span className="text-muted-foreground italic">No lots allocated at order level.</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {line.allocatedLots.map((lot, lIdx) => (
                          <div
                            key={lIdx}
                            className="p-1 px-2 rounded bg-card border border-border flex items-center gap-2 font-mono"
                          >
                            <span className="font-bold text-primary">{lot.lotNo}</span>
                            <span className="text-muted-foreground">({lot.locationBin || "Default Bin"})</span>
                            <span className="font-semibold text-foreground">{lot.allocatedQtyKg.toFixed(1)} KG</span>
                            {lot.isManualOverride && (
                              <Badge variant="outline" className="text-[0.5625rem] border-amber-500/40 text-amber-600">
                                Override
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Error / Alert */}
                  {line.error && (
                    <div className="p-2 rounded bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-[0.6875rem] flex items-center gap-1.5">
                      <AlertOctagon className="size-3.5 shrink-0" />
                      <span>{line.error}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 w-full pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSavePreparation}
              disabled={prep.issuePlanStatus === "BLOCKED"}
              className="border-purple-500/40 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10 gap-1.5 font-bold"
            >
              <BookmarkCheck className="size-4" /> Save Material Plan
            </Button>

            <Button
              size="sm"
              onClick={handleSimulateIssue}
              disabled={prep.issuePlanStatus === "BLOCKED"}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-bold shadow-xs"
            >
              <ArrowRight className="size-4" /> Simulate Initial Issue
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

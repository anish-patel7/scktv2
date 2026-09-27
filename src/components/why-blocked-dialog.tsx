import React from "react";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Info,
  Layers,
  ArrowRight,
  ShieldAlert,
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
import type { LoomReleaseEvaluation } from "@/services/production-planning.service";

interface WhyBlockedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evaluation: LoomReleaseEvaluation | null;
  onNavigateToLoomPlanning?: () => void;
  onNavigateToWarpPlanning?: () => void;
  onNavigateToMaterialAllocation?: () => void;
}

export const WhyBlockedDialog: React.FC<WhyBlockedDialogProps> = ({
  open,
  onOpenChange,
  evaluation,
  onNavigateToLoomPlanning,
  onNavigateToWarpPlanning,
  onNavigateToMaterialAllocation,
}) => {
  if (!evaluation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <AlertOctagon className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Readiness Blockers — {evaluation.loomNo}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Exact planning dependencies preventing release for {evaluation.plannedQtyMetre.toLocaleString()} MTR
                </DialogDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className="font-mono text-xs uppercase px-2.5 py-1 border-rose-500/40 text-rose-600 bg-rose-500/10"
            >
              {evaluation.readinessState.replace(/_/g, " ")}
            </Badge>
          </div>
        </DialogHeader>

        {/* Loom Allocation Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg border border-border bg-muted/30 text-xs">
          <div>
            <span className="text-muted-foreground block text-[0.6875rem]">Loom</span>
            <span className="font-bold text-foreground font-mono">{evaluation.loomNo}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[0.6875rem]">Planned Qty</span>
            <span className="font-bold text-foreground font-mono">
              {evaluation.plannedQtyMetre.toLocaleString()} MTR
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[0.6875rem]">Beam Linked</span>
            <span className="font-medium text-foreground font-mono">
              {evaluation.beamNo || evaluation.beamType || "None"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[0.6875rem]">Revision Status</span>
            <span
              className={`font-semibold font-mono ${
                evaluation.revisionStatus === "CLEAR"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              {evaluation.revisionStatus}
            </span>
          </div>
        </div>

        {/* Hard Blockers Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            <ShieldAlert className="size-4" />
            Hard Release Blockers ({evaluation.blockers.length})
          </div>

          {evaluation.blockers.length === 0 ? (
            <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
              <span>No hard blockers detected. This Loom Plan is ready for release preparation.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {evaluation.blockers.map((blocker, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20 space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="text-[0.625rem] font-bold uppercase font-mono px-1.5 py-0.5 bg-rose-500/20 text-rose-800 dark:text-rose-200"
                      >
                        {blocker.dimension}
                      </Badge>
                      <span className="text-xs font-semibold text-rose-950 dark:text-rose-100">
                        {blocker.message}
                      </span>
                    </div>
                  </div>
                  {blocker.drilldownHint && (
                    <div className="text-[0.6875rem] text-muted-foreground pl-1 flex items-start gap-1.5">
                      <ArrowRight className="size-3 text-rose-500 shrink-0 mt-0.5" />
                      <span>{blocker.drilldownHint}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Non-Blocking Warnings Section */}
        {evaluation.warnings.length > 0 && (
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-4" />
              Non-Blocking Planning Warnings ({evaluation.warnings.length})
            </div>
            <div className="space-y-2">
              {evaluation.warnings.map((warning, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 text-xs space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-[0.625rem] font-mono border-amber-500/40 text-amber-700 dark:text-amber-300"
                    >
                      {warning.dimension}
                    </Badge>
                    <span className="text-xs font-medium text-amber-950 dark:text-amber-200">
                      {warning.message}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>

          <div className="flex items-center gap-2">
            {evaluation.readinessState === "BLOCKED_BEAM" && onNavigateToWarpPlanning && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-blue-500/40 text-blue-700 dark:text-blue-300"
                onClick={() => {
                  onOpenChange(false);
                  onNavigateToWarpPlanning();
                }}
              >
                <Layers className="size-3.5" /> Warp / Beam Planning
              </Button>
            )}
            {evaluation.readinessState === "BLOCKED_MATERIAL" && onNavigateToMaterialAllocation && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-purple-500/40 text-purple-700 dark:text-purple-300"
                onClick={() => {
                  onOpenChange(false);
                  onNavigateToMaterialAllocation();
                }}
              >
                Material Allocation Plan
              </Button>
            )}
            {onNavigateToLoomPlanning && (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  onOpenChange(false);
                  onNavigateToLoomPlanning();
                }}
              >
                Adjust Loom Plan
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

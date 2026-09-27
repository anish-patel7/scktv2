import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Trash2,
  Info,
  Layers,
  Package,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import {
  ProductionPlanningService,
  roundQty,
  sumQty,
  type MaterialRequirement,
  type MaterialInventoryLot,
  type MaterialAllocationLine,
  type MaterialAllocationPlan,
  type AllocationStatus,
} from "@/services/production-planning.service";
import type { ProductionOrder } from "@/lib/production-store";

interface MaterialAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requirement: MaterialRequirement | null;
  order: ProductionOrder;
  existingPlan?: MaterialAllocationPlan | null | undefined;
  onPlanSaved: (plan: MaterialAllocationPlan) => void;
}

const ALLOCATION_STATUS_BADGES: Record<
  AllocationStatus,
  { label: string; class: string; icon: typeof CheckCircle2 }
> = {
  FULLY_ALLOCATED: {
    label: "FULLY ALLOCATED",
    class: "bg-emerald-600 hover:bg-emerald-600 text-white font-bold",
    icon: CheckCircle2,
  },
  PARTIALLY_ALLOCATED: {
    label: "PARTIALLY ALLOCATED",
    class: "bg-amber-600 hover:bg-amber-600 text-white font-bold",
    icon: AlertTriangle,
  },
  SHORTAGE: {
    label: "SHORTAGE",
    class: "bg-rose-600 hover:bg-rose-600 text-white font-bold",
    icon: XCircle,
  },
  NO_ELIGIBLE_LOTS: {
    label: "NO ELIGIBLE LOTS",
    class: "bg-muted text-muted-foreground font-semibold",
    icon: HelpCircle,
  },
  UNMAPPED: {
    label: "UNMAPPED",
    class: "bg-amber-500 text-black font-semibold",
    icon: AlertTriangle,
  },
  CALCULATION_PENDING: {
    label: "CALCULATION PENDING",
    class: "bg-orange-500 text-white font-semibold",
    icon: HelpCircle,
  },
};

export function MaterialAllocationDialog({
  open,
  onOpenChange,
  requirement,
  order,
  existingPlan,
  onPlanSaved,
}: MaterialAllocationDialogProps) {
  if (!requirement) return null;

  // 1. Fetch Eligible Lots for this material (matching by canonical ID only)
  const eligibleLots = useMemo(() => {
    return ProductionPlanningService.getEligibleLots(requirement);
  }, [requirement]);

  // 2. Local working state for the allocation plan
  const [workingPlan, setWorkingPlan] = useState<MaterialAllocationPlan>(() => {
    if (existingPlan) {
      return existingPlan;
    }
    return ProductionPlanningService.suggestFifoAllocation({
      requirement,
      eligibleLots,
      productionOrderId: order.id,
      productionOrderNo: order.order_no,
    });
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // When dialog opens or requirement changes, initialize working plan
  useEffect(() => {
    if (open && requirement) {
      const stored = ProductionPlanningService.getAllocationPlan(order.id, requirement.id);
      if (stored) {
        // Refresh availability on open
        const refreshed = ProductionPlanningService.refreshLotAvailability(stored);
        setWorkingPlan(refreshed);
      } else {
        const fresh = ProductionPlanningService.suggestFifoAllocation({
          requirement,
          eligibleLots,
          productionOrderId: order.id,
          productionOrderNo: order.order_no,
        });
        setWorkingPlan(fresh);
      }
      setValidationErrors([]);
    }
  }, [open, requirement, order.id, order.order_no, eligibleLots]);

  // Re-evaluate totals, remaining, override flags, and status whenever lines change
  const handlePlannedQtyChange = (lotId: string, valStr: string) => {
    const parsed = parseFloat(valStr);
    const newQty = isNaN(parsed) ? 0 : Math.max(0, parsed);

    setWorkingPlan((prev) => {
      let isAnyManual = false;
      const updatedLines = prev.lines.map((line) => {
        if (line.lotId === lotId) {
          const isManual = roundQty(newQty) !== roundQty(line.suggestedQty);
          if (isManual) isAnyManual = true;
          return {
            ...line,
            plannedQty: roundQty(newQty),
            isManualOverride: isManual,
          };
        }
        if (line.isManualOverride) isAnyManual = true;
        return line;
      });

      const totalPlanned = sumQty(updatedLines.map((l) => l.plannedQty));
      const required = roundQty(prev.requiredQty);
      const remaining = roundQty(Math.max(0, required - totalPlanned));
      const shortage = roundQty(Math.max(0, required - prev.totalAvailableQty));

      let allocationStatus: AllocationStatus = "SHORTAGE";
      if (updatedLines.length === 0) {
        allocationStatus = "NO_ELIGIBLE_LOTS";
      } else if (remaining === 0) {
        allocationStatus = "FULLY_ALLOCATED";
      } else if (totalPlanned > 0) {
        allocationStatus = "PARTIALLY_ALLOCATED";
      } else {
        allocationStatus = "SHORTAGE";
      }

      return {
        ...prev,
        lines: updatedLines,
        totalPlannedQty: totalPlanned,
        remainingQty: remaining,
        shortageQty: shortage,
        allocationStatus,
        isManualOverride: isAnyManual,
      };
    });

    setValidationErrors([]);
  };

  // Quick Action 1: Use FIFO Suggestion
  const handleUseFifoSuggestion = () => {
    const suggested = ProductionPlanningService.suggestFifoAllocation({
      requirement,
      eligibleLots,
      productionOrderId: order.id,
      productionOrderNo: order.order_no,
    });
    setWorkingPlan(suggested);
    setValidationErrors([]);
    toast.info("Restored FIFO suggested allocation.");
  };

  // Quick Action 2: Clear Allocation
  const handleClearAllocation = () => {
    setWorkingPlan((prev) => {
      const clearedLines = prev.lines.map((l) => ({
        ...l,
        plannedQty: 0,
        isManualOverride: roundQty(l.suggestedQty) > 0,
      }));
      return {
        ...prev,
        lines: clearedLines,
        totalPlannedQty: 0,
        remainingQty: prev.requiredQty,
        allocationStatus: "SHORTAGE",
        isManualOverride: true,
      };
    });
    setValidationErrors([]);
  };

  // Quick Action 3: Fill Max Available for single lot
  const handleFillLotMax = (lotId: string) => {
    setWorkingPlan((prev) => {
      const targetLot = prev.lines.find((l) => l.lotId === lotId);
      if (!targetLot) return prev;

      // Available on lot
      const lotAvail = targetLot.availableKg;
      // Other lots planned sum
      const otherPlanned = sumQty(
        prev.lines.filter((l) => l.lotId !== lotId).map((l) => l.plannedQty)
      );
      const remainingRequired = Math.max(0, roundQty(prev.requiredQty - otherPlanned));
      const fillQty = Math.min(lotAvail, remainingRequired);

      let isAnyManual = false;
      const updatedLines = prev.lines.map((line) => {
        if (line.lotId === lotId) {
          const isManual = roundQty(fillQty) !== roundQty(line.suggestedQty);
          if (isManual) isAnyManual = true;
          return {
            ...line,
            plannedQty: roundQty(fillQty),
            isManualOverride: isManual,
          };
        }
        if (line.isManualOverride) isAnyManual = true;
        return line;
      });

      const totalPlanned = sumQty(updatedLines.map((l) => l.plannedQty));
      const remaining = roundQty(Math.max(0, prev.requiredQty - totalPlanned));

      return {
        ...prev,
        lines: updatedLines,
        totalPlannedQty: totalPlanned,
        remainingQty: remaining,
        allocationStatus: remaining === 0 ? "FULLY_ALLOCATED" : totalPlanned > 0 ? "PARTIALLY_ALLOCATED" : "SHORTAGE",
        isManualOverride: isAnyManual,
      };
    });
  };

  // Save Plan Action
  const handleSave = () => {
    // Validate
    const validation = ProductionPlanningService.validateAllocation(workingPlan, eligibleLots);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      toast.error("Validation failed. Please correct the highlighted errors.");
      return;
    }

    // Save in-memory
    const saved = ProductionPlanningService.saveAllocationPlan(workingPlan);
    onPlanSaved(saved);
    toast.success("Allocation plan saved in frontend planning mode (no database reservation created).");
    onOpenChange(false);
  };

  const statusBadge = ALLOCATION_STATUS_BADGES[workingPlan.allocationStatus];
  const StatusIcon = statusBadge.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden text-xs">
        {/* Dialog Header Banner */}
        <div className="p-4 border-b border-border bg-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-bold text-[0.6875rem] ${
                    requirement.sourceType === "WARP"
                      ? "bg-blue-500/10 text-blue-700"
                      : "bg-purple-500/10 text-purple-700"
                  }`}
                >
                  {requirement.sourceType === "WARP" ? (
                    <Layers className="size-3" />
                  ) : (
                    <Package className="size-3" />
                  )}
                  {requirement.sourceType} REQUIREMENT
                </span>
                <h3 className="text-base font-bold text-foreground">
                  {requirement.materialCode} — {requirement.materialName}
                </h3>
                <Badge className={`text-[0.6875rem] gap-1 px-2 py-0.5 ${statusBadge.class}`}>
                  <StatusIcon className="size-3" />
                  {statusBadge.label}
                </Badge>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-[0.6875rem]">
                <span>
                  Production Order: <strong className="text-foreground">{order.order_no}</strong>
                </span>
                <span>
                  Source:{" "}
                  <strong className="text-foreground">
                    {requirement.sourceCostSheetNo} · {requirement.sourceLineLabel}
                  </strong>
                </span>
                <span>
                  Order Qty:{" "}
                  <strong className="text-foreground">
                    {order.qty_metre.toLocaleString()} {order.unit || "MTR"}
                  </strong>
                </span>
              </div>
            </div>

            {/* Metrics Chips */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded border border-border bg-muted/40 px-2.5 py-1 text-right">
                <span className="block text-[0.625rem] text-muted-foreground">Required</span>
                <span className="font-mono font-bold text-foreground">
                  {workingPlan.requiredQty.toFixed(3)} kg
                </span>
              </div>
              <div className="rounded border border-border bg-muted/40 px-2.5 py-1 text-right">
                <span className="block text-[0.625rem] text-muted-foreground">Available Stock</span>
                <span className="font-mono font-bold text-foreground">
                  {workingPlan.totalAvailableQty.toFixed(3)} kg
                </span>
              </div>
              <div className="rounded border border-primary/30 bg-primary/5 px-2.5 py-1 text-right">
                <span className="block text-[0.625rem] text-primary">Planned</span>
                <span className="font-mono font-bold text-primary">
                  {workingPlan.totalPlannedQty.toFixed(3)} kg
                </span>
              </div>
              <div
                className={`rounded border px-2.5 py-1 text-right ${
                  workingPlan.remainingQty > 0
                    ? "border-rose-500/30 bg-rose-500/5 text-rose-700"
                    : "border-emerald-500/30 bg-emerald-500/5 text-emerald-700"
                }`}
              >
                <span className="block text-[0.625rem]">Remaining</span>
                <span className="font-mono font-bold">
                  {workingPlan.remainingQty.toFixed(3)} kg
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions & Override Warning Bar */}
          <div className="mt-3 pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleUseFifoSuggestion}
                className="h-7 text-xs gap-1.5"
                title="Restore algorithmically suggested FIFO quantities"
              >
                <Sparkles className="size-3.5 text-primary" /> Use FIFO Suggestion
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleClearAllocation}
                className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                title="Reset all planned quantities to zero"
              >
                <Trash2 className="size-3.5" /> Clear Allocation
              </Button>
            </div>

            {/* Informational badges for Warp vs Weft */}
            <div className="text-[0.6875rem] text-muted-foreground italic">
              {requirement.sourceType === "WARP"
                ? "Warp yarn may be routed to Beam / Warping in Phase 3."
                : "Weft yarn allocation is planned for direct Job Card / Loom issue in Phase 3."}
            </div>
          </div>

          {/* Stale Warning Banner */}
          {workingPlan.isStale && (
            <div className="mt-2.5 rounded border border-rose-500/40 bg-rose-500/10 p-2 text-rose-800 dark:text-rose-300 flex items-start gap-2 text-xs">
              <ShieldAlert className="size-4 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <strong>Availability Changed (Stale Plan):</strong> {workingPlan.staleReason}
              </div>
            </div>
          )}

          {/* Manual Override Non-blocking Warning Banner */}
          {workingPlan.isManualOverride && !workingPlan.isStale && (
            <div className="mt-2.5 rounded border border-amber-500/40 bg-amber-500/10 p-2 text-amber-800 dark:text-amber-300 flex items-center gap-2 text-xs">
              <AlertTriangle className="size-4 shrink-0 text-amber-600" />
              <span>
                <strong>Manual Override Active:</strong> Planned quantities differ from the oldest-lot FIFO proposal.
              </span>
            </div>
          )}

          {/* Validation Errors Alert */}
          {validationErrors.length > 0 && (
            <div className="mt-2.5 rounded border border-rose-500 bg-rose-50 dark:bg-rose-950/30 p-2 text-rose-700 dark:text-rose-200 text-xs space-y-1">
              <strong className="block font-semibold">Validation Errors:</strong>
              <ul className="list-disc list-inside space-y-0.5 font-mono text-[0.6875rem]">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Dialog Body: Lots List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {workingPlan.lines.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-xs space-y-2">
              <Package className="size-8 mx-auto text-muted-foreground/50" />
              <p className="font-semibold text-foreground">No eligible inventory lots found.</p>
              <p className="max-w-md mx-auto text-[0.6875rem]">
                No yarn inventory lots in the warehouse match canonical material{" "}
                <code className="bg-muted px-1 rounded">{requirement.materialCode}</code> (ID:{" "}
                {requirement.materialId || "none"}).
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block rounded-md border border-border overflow-hidden">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="bg-muted/60 text-muted-foreground font-semibold">
                      <TableHead className="h-8 w-20 text-center">FIFO Rank</TableHead>
                      <TableHead className="h-8">Lot No.</TableHead>
                      <TableHead className="h-8">Inward Date</TableHead>
                      <TableHead className="h-8">Location Bin</TableHead>
                      <TableHead className="h-8">Supplier</TableHead>
                      <TableHead className="h-8 text-right">Total (kg)</TableHead>
                      <TableHead className="h-8 text-right">Reserved (kg)</TableHead>
                      <TableHead className="h-8 text-right font-semibold text-foreground">
                        Available (kg)
                      </TableHead>
                      <TableHead className="h-8 text-right">Suggested (kg)</TableHead>
                      <TableHead className="h-8 text-right w-36 font-bold text-foreground">
                        Planned (kg)
                      </TableHead>
                      <TableHead className="h-8 text-center">Status</TableHead>
                      <TableHead className="h-8 text-right">Quick Fill</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workingPlan.lines.map((line) => {
                      const isOverAllocated = roundQty(line.plannedQty) > roundQty(line.availableKg);
                      return (
                        <TableRow
                          key={line.lotId}
                          className={`hover:bg-muted/40 ${
                            line.plannedQty > 0 ? "bg-muted/20" : ""
                          }`}
                        >
                          <TableCell className="py-2 text-center font-mono font-bold">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[0.625rem] ${
                                line.fifoRank === 1
                                  ? "bg-emerald-500/10 text-emerald-700 font-bold border border-emerald-500/30"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              #{line.fifoRank} {line.fifoRank === 1 ? "Oldest" : ""}
                            </span>
                          </TableCell>
                          <TableCell className="py-2 font-mono font-semibold text-foreground">
                            {line.lotNo}
                          </TableCell>
                          <TableCell className="py-2 font-mono text-muted-foreground">
                            {line.receivedDate || "—"}
                          </TableCell>
                          <TableCell className="py-2 font-mono text-muted-foreground">
                            {line.locationBin}
                          </TableCell>
                          <TableCell className="py-2 text-muted-foreground truncate max-w-[130px]">
                            {line.supplierName}
                          </TableCell>
                          <TableCell className="py-2 text-right font-mono text-muted-foreground">
                            {line.totalStockKg.toFixed(3)}
                          </TableCell>
                          <TableCell className="py-2 text-right font-mono text-muted-foreground">
                            {line.reservedKg.toFixed(3)}
                          </TableCell>
                          <TableCell className="py-2 text-right font-mono font-semibold text-foreground">
                            {line.availableKg.toFixed(3)}
                          </TableCell>
                          <TableCell className="py-2 text-right font-mono text-muted-foreground">
                            {line.suggestedQty.toFixed(3)}
                          </TableCell>
                          <TableCell className="py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Input
                                type="number"
                                step="0.001"
                                min="0"
                                max={line.availableKg}
                                value={line.plannedQty === 0 ? "" : line.plannedQty}
                                placeholder="0.000"
                                onChange={(e) => handlePlannedQtyChange(line.lotId, e.target.value)}
                                className={`h-7 w-28 text-right font-mono text-xs ${
                                  isOverAllocated
                                    ? "border-rose-500 ring-1 ring-rose-500 bg-rose-50 dark:bg-rose-950/20"
                                    : line.isManualOverride
                                    ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/10"
                                    : ""
                                }`}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="py-2 text-center">
                            {isOverAllocated ? (
                              <Badge variant="destructive" className="text-[0.5625rem]">
                                Exceeds Stock
                              </Badge>
                            ) : line.isManualOverride ? (
                              <Badge variant="outline" className="text-[0.5625rem] text-amber-600 border-amber-500/40">
                                Override
                              </Badge>
                            ) : line.plannedQty > 0 ? (
                              <Badge variant="secondary" className="text-[0.5625rem] text-emerald-700">
                                FIFO Match
                              </Badge>
                            ) : (
                              <span className="text-[0.625rem] text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="py-2 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleFillLotMax(line.lotId)}
                              className="h-6 px-1.5 text-[0.625rem]"
                              disabled={line.availableKg <= 0}
                              title="Allocate up to available or remaining requirement"
                            >
                              Use Max
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards View */}
              <div className="md:hidden space-y-2.5">
                {workingPlan.lines.map((line) => {
                  const isOverAllocated = roundQty(line.plannedQty) > roundQty(line.availableKg);
                  return (
                    <div
                      key={line.lotId}
                      className={`p-3 rounded-lg border border-border bg-card space-y-2 ${
                        line.plannedQty > 0 ? "border-primary/40" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="font-mono text-[0.625rem]">
                            #{line.fifoRank}
                          </Badge>
                          <span className="font-mono font-bold text-foreground text-xs">
                            {line.lotNo}
                          </span>
                        </div>
                        <div className="text-[0.625rem] text-muted-foreground font-mono">
                          Rec: {line.receivedDate || "—"}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[0.6875rem] font-mono bg-muted/40 p-2 rounded">
                        <div>
                          <span className="text-muted-foreground">Bin: </span>
                          <span>{line.locationBin}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Available: </span>
                          <strong className="text-foreground">{line.availableKg.toFixed(3)} kg</strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total: </span>
                          <span>{line.totalStockKg.toFixed(3)} kg</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">FIFO Suggested: </span>
                          <span>{line.suggestedQty.toFixed(3)} kg</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                        <Label
                          htmlFor={`mobile-input-${line.lotId}`}
                          className="text-xs font-semibold text-muted-foreground"
                        >
                          Planned Qty (kg):
                        </Label>
                        <div className="flex items-center gap-1.5">
                          <Input
                            id={`mobile-input-${line.lotId}`}
                            type="number"
                            step="0.001"
                            min="0"
                            max={line.availableKg}
                            value={line.plannedQty === 0 ? "" : line.plannedQty}
                            placeholder="0.000"
                            onChange={(e) => handlePlannedQtyChange(line.lotId, e.target.value)}
                            className={`h-7 w-28 text-right font-mono text-xs ${
                              isOverAllocated ? "border-rose-500" : ""
                            }`}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleFillLotMax(line.lotId)}
                            className="h-7 px-2 text-xs"
                          >
                            Max
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Dialog Footer */}
        <div className="p-3 border-t border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[0.6875rem] text-muted-foreground">
            <Info className="size-4 shrink-0 text-primary" />
            <span>
              <strong>Planning Preview Notice:</strong> Saving records this allocation in memory.
              No stock is deducted and no database reservation is created.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="h-8 text-xs font-semibold"
              disabled={workingPlan.lines.length === 0}
            >
              Save Allocation Plan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

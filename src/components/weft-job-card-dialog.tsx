import React, { useState, useMemo } from "react";
import {
  FileText,
  Package,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
  Eye,
  BookmarkCheck,
  Send,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  ProductionPlanningService,
  roundQty,
  sumQty,
  type MaterialRequirement,
  type MaterialAllocationPlan,
  type JobCardMaterialPlan,
} from "@/services/production-planning.service";
import type { ProductionOrder, JobCard } from "@/lib/production-store";
import type { CostSheetFull } from "@/lib/cost-sheet-store";

interface WeftJobCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: ProductionOrder;
  costSheet: CostSheetFull | null;
  allocationPlans: MaterialAllocationPlan[];
  onPlanSaved: () => void;
}

export const WeftJobCardDialog: React.FC<WeftJobCardDialogProps> = ({
  open,
  onOpenChange,
  order,
  costSheet,
  allocationPlans,
  onPlanSaved,
}) => {
  const jobCards = useMemo(() => {
    return ProductionPlanningService.getJobCardsForOrder(order.id);
  }, [order.id, open]);

  const [selectedJcId, setSelectedJcId] = useState<string>(jobCards[0]?.id || "");

  React.useEffect(() => {
    if (jobCards.length > 0 && !jobCards.some((j) => j.id === selectedJcId)) {
      setSelectedJcId(jobCards[0]!.id);
    }
  }, [jobCards, selectedJcId]);

  const selectedJobCard = useMemo(() => {
    return jobCards.find((j) => j.id === selectedJcId) || null;
  }, [jobCards, selectedJcId]);

  // Derived Weft requirements for the selected Job Card
  const derivedWeftReqs = useMemo(() => {
    if (!selectedJobCard || !costSheet) return [];
    return ProductionPlanningService.getJobCardWeftRequirements(selectedJobCard, costSheet);
  }, [selectedJobCard, costSheet]);

  const looms = useMemo(() => ProductionPlanningService.getLooms(), []);
  const loomForJc = useMemo(() => {
    if (!selectedJobCard?.loom_id) return null;
    return looms.find((l) => l.id === selectedJobCard.loom_id) || null;
  }, [selectedJobCard, looms]);

  // Selected Weft Material line to plan
  const [selectedMatCode, setSelectedMatCode] = useState<string>("");

  React.useEffect(() => {
    if (derivedWeftReqs.length > 0) {
      const active = derivedWeftReqs.find((d) => d.expectedQtyKg > 0);
      setSelectedMatCode(active ? active.material.materialCode : derivedWeftReqs[0]!.material.materialCode);
    }
  }, [derivedWeftReqs]);

  const currentWeftItem = useMemo(() => {
    return derivedWeftReqs.find((d) => d.material.materialCode === selectedMatCode) || null;
  }, [derivedWeftReqs, selectedMatCode]);

  // Existing planned Job Card allocations
  const existingOrderJcPlans = useMemo(() => {
    return ProductionPlanningService.getJobCardMaterialPlans(order.id);
  }, [order.id, open]);

  const existingJcPlanForCurrentMat = useMemo(() => {
    if (!selectedJobCard || !currentWeftItem) return null;
    return (
      existingOrderJcPlans.find(
        (p) => p.jobCardId === selectedJobCard.id && p.materialCode === currentWeftItem.material.materialCode
      ) || null
    );
  }, [existingOrderJcPlans, selectedJobCard, currentWeftItem]);

  // PO-level allocated lots for this Weft material from Phase 2
  const poAllocationPlan = useMemo(() => {
    if (!currentWeftItem) return null;
    return allocationPlans.find(
      (p) => p.materialCode === currentWeftItem.material.materialCode && p.sourceType === "WEFT"
    ) || null;
  }, [allocationPlans, currentWeftItem]);

  // Planned quantity per lot for this Job Card issue
  const [plannedLotQtys, setPlannedLotQtys] = useState<Record<string, number>>({});

  // Initialize/sync planned lot quantities
  React.useEffect(() => {
    if (existingJcPlanForCurrentMat) {
      const initial: Record<string, number> = {};
      for (const lot of existingJcPlanForCurrentMat.allocatedLots) {
        initial[lot.lotId] = lot.plannedQtyKg;
      }
      setPlannedLotQtys(initial);
    } else if (poAllocationPlan && currentWeftItem) {
      // Propose default proportional distribution from PO allocated lots
      const initial: Record<string, number> = {};
      let remainingToFill = currentWeftItem.expectedQtyKg;
      for (const line of poAllocationPlan.lines) {
        if (remainingToFill <= 0) break;
        const take = Math.min(line.plannedQty, remainingToFill);
        initial[line.lotId] = roundQty(take);
        remainingToFill = roundQty(remainingToFill - take);
      }
      setPlannedLotQtys(initial);
    } else {
      setPlannedLotQtys({});
    }
  }, [existingJcPlanForCurrentMat, poAllocationPlan, currentWeftItem]);

  const totalPlannedIssueForThisJc = useMemo(() => {
    return roundQty(Object.values(plannedLotQtys).reduce((acc, q) => acc + (q || 0), 0));
  }, [plannedLotQtys]);

  // Total planned across OTHER job cards for this material
  const otherJcPlannedTotal = useMemo(() => {
    if (!currentWeftItem || !selectedJobCard) return 0;
    const others = existingOrderJcPlans.filter(
      (p) => p.jobCardId !== selectedJobCard.id && p.materialCode === currentWeftItem.material.materialCode
    );
    return sumQty(others.map((p) => p.plannedIssueQtyKg));
  }, [existingOrderJcPlans, currentWeftItem, selectedJobCard]);

  // Grand total for this material across ALL Job Cards
  const grandTotalPlanned = roundQty(otherJcPlannedTotal + totalPlannedIssueForThisJc);
  const poMaxAllocation = poAllocationPlan ? poAllocationPlan.totalPlannedQty : 0;
  const isExceeded = poMaxAllocation > 0 && grandTotalPlanned > poMaxAllocation;
  const excessQty = isExceeded ? roundQty(grandTotalPlanned - poMaxAllocation) : 0;

  // Preview state
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);

  const handleOpenPreview = () => {
    if (!selectedJobCard || !currentWeftItem) return;
    if (isExceeded) {
      toast.error(`Production material allocation exceeded by ${excessQty.toFixed(3)} KG.`);
      return;
    }
    if (totalPlannedIssueForThisJc <= 0) {
      toast.error("Please allocate at least one lot with quantity > 0.");
      return;
    }
    setPreviewOpen(true);
  };

  const handleSaveIssuePlan = () => {
    if (!selectedJobCard || !currentWeftItem) return;

    const allocatedLotItems = Object.entries(plannedLotQtys)
      .filter(([_, qty]) => qty > 0)
      .map(([lotId, qty]) => {
        const poLine = poAllocationPlan?.lines.find((l) => l.lotId === lotId);
        return {
          lotId,
          lotNo: poLine?.lotNo || lotId,
          locationBin: poLine?.locationBin || "—",
          plannedQtyKg: roundQty(qty),
        };
      });

    const expected = currentWeftItem.expectedQtyKg;
    const remaining = roundQty(Math.max(0, expected - totalPlannedIssueForThisJc));

    let status: JobCardMaterialPlan["status"] = "NOT_PLANNED";
    if (totalPlannedIssueForThisJc === 0) {
      status = "NOT_PLANNED";
    } else if (remaining === 0) {
      status = "FULLY_PLANNED";
    } else {
      status = "PARTIALLY_PLANNED";
    }

    const plan: JobCardMaterialPlan = {
      id: existingJcPlanForCurrentMat?.id || `jcp-${selectedJobCard.id}-${currentWeftItem.material.materialCode}`,
      jobCardId: selectedJobCard.id,
      jobCardNo: selectedJobCard.card_no,
      productionOrderId: order.id,
      productionOrderNo: order.order_no,
      loomId: selectedJobCard.loom_id,
      loomNo: loomForJc ? loomForJc.loom_no : "Unassigned",
      materialId: currentWeftItem.material.materialId,
      materialCode: currentWeftItem.material.materialCode,
      materialName: currentWeftItem.material.materialName,
      expectedQtyKg: expected,
      plannedIssueQtyKg: totalPlannedIssueForThisJc,
      remainingQtyKg: remaining,
      allocatedLots: allocatedLotItems,
      status,
      plannedAt: new Date().toISOString(),
    };

    const res = ProductionPlanningService.createJobCardMaterialPlan(plan);
    if (!res.success) {
      toast.error(res.error || "Failed to save Job Card Material Plan");
      return;
    }

    toast.success("Yarn issue plan saved in planning mode.");
    setPreviewOpen(false);
    onPlanSaved();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 rounded-lg">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  Weft Job Card Material Issue Planning
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Derive Job Card Weft requirements from Cost Sheet consumption and prepare planned yarn issue previews without stock mutation.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Inherited Context Banner (ENTER ONCE -> REUSE EVERYWHERE) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-muted/40 border text-xs">
            <div>
              <span className="text-muted-foreground block">Production Order:</span>
              <span className="font-semibold text-foreground">{order.order_no}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Party / Customer:</span>
              <span className="font-semibold text-foreground truncate block">{order.party_name}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Design:</span>
              <span className="font-semibold text-foreground">{order.design_no || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Total PO Qty:</span>
              <span className="font-semibold text-foreground">
                {order.qty_metre.toLocaleString()} {order.unit || "MTR"}
              </span>
            </div>
          </div>

          {jobCards.length === 0 ? (
            <div className="p-8 text-center border rounded-lg bg-muted/20 space-y-2">
              <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
              <div className="text-sm font-semibold">No Job Cards Generated Yet</div>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Generate or link Job Cards for Production Order {order.order_no} before planning Weft material issues.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Job Card Selection */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-card border rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="jc-select" className="text-xs font-semibold">
                    Select Target Job Card:
                  </Label>
                  <Select value={selectedJcId} onValueChange={setSelectedJcId}>
                    <SelectTrigger id="jc-select" className="w-[280px] text-xs h-8">
                      <SelectValue placeholder="Select Job Card" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobCards.map((jc) => (
                        <SelectItem key={jc.id} value={jc.id} className="text-xs">
                          {jc.card_no} • {jc.qty_metre.toLocaleString()} MTR (Loom: {jc.loom_id || "Unassigned"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedJobCard && (
                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground block">Job Card Qty:</span>
                      <span className="font-bold text-foreground">
                        {selectedJobCard.qty_metre.toLocaleString()} MTR
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Assigned Loom:</span>
                      <Badge variant="outline" className="text-[10px] font-semibold">
                        {loomForJc ? `${loomForJc.loom_no} (${loomForJc.loom_type})` : "Unassigned"}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Status:</span>
                      <Badge variant="secondary" className="text-[10px] uppercase font-semibold">
                        {selectedJobCard.status}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>

              {/* Weft Requirements Table for Selected Job Card */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Job Card Weft Material Requirements
                  </h4>
                  <Badge variant="outline" className="text-[10px]">
                    {derivedWeftReqs.length} Weft Line{derivedWeftReqs.length > 1 ? "s" : ""}
                  </Badge>
                </div>

                <div className="border rounded-lg overflow-hidden bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 text-[11px]">
                        <TableHead className="py-2">Weft Material</TableHead>
                        <TableHead className="py-2 text-right">Consumption Basis</TableHead>
                        <TableHead className="py-2 text-right">Job Card Req (KG)</TableHead>
                        <TableHead className="py-2 text-right">PO Allocation (KG)</TableHead>
                        <TableHead className="py-2 text-right">Planned for JC</TableHead>
                        <TableHead className="py-2 text-right">Select</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {derivedWeftReqs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6 text-xs text-muted-foreground">
                            No Weft lines found on Cost Sheet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        derivedWeftReqs.map((item, idx) => {
                          const poAlloc = allocationPlans.find(
                            (p) => p.materialCode === item.material.materialCode && p.sourceType === "WEFT"
                          );
                          const jcPlan = existingOrderJcPlans.find(
                            (p) =>
                              p.jobCardId === selectedJobCard?.id &&
                              p.materialCode === item.material.materialCode
                          );

                          return (
                            <TableRow key={idx} className="text-xs">
                              <TableCell className="py-2 font-medium">
                                <div className="font-semibold text-foreground">{item.material.materialCode}</div>
                                <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                                  {item.material.materialName}
                                </div>
                              </TableCell>
                              <TableCell className="py-2 text-right font-mono text-muted-foreground">
                                {item.material.consumptionQty} {item.material.consumptionBasis}
                              </TableCell>
                              <TableCell className="py-2 text-right font-mono font-semibold">
                                {item.isPending ? (
                                  <Badge variant="outline" className="text-orange-500 border-orange-500 text-[10px]">
                                    Pending
                                  </Badge>
                                ) : (
                                  `${item.expectedQtyKg.toFixed(3)} KG`
                                )}
                              </TableCell>
                              <TableCell className="py-2 text-right font-mono text-muted-foreground">
                                {poAlloc ? `${poAlloc.totalPlannedQty.toFixed(3)} KG` : "0.000 KG"}
                              </TableCell>
                              <TableCell className="py-2 text-right font-mono">
                                {jcPlan ? (
                                  <Badge className="bg-purple-600 text-white text-[10px]">
                                    {jcPlan.plannedIssueQtyKg.toFixed(3)} KG
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground italic text-[11px]">Unplanned</span>
                                )}
                              </TableCell>
                              <TableCell className="py-2 text-right">
                                <Button
                                  variant={selectedMatCode === item.material.materialCode ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setSelectedMatCode(item.material.materialCode)}
                                  className="text-[10px] h-6 px-2.5"
                                >
                                  Plan Issue
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Active Material Allocation Panel */}
              {currentWeftItem && (
                <div className="p-3.5 bg-muted/40 border rounded-lg space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                    <div>
                      <span className="font-bold text-sm text-foreground">
                        Plan Issue for {currentWeftItem.material.materialCode}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        Expected: <strong>{currentWeftItem.expectedQtyKg.toFixed(3)} KG</strong> (for {selectedJobCard?.qty_metre}m)
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground">PO Total Allocation:</span>{" "}
                        <strong className="font-mono">{poMaxAllocation.toFixed(3)} KG</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Other JCs:</span>{" "}
                        <strong className="font-mono">{otherJcPlannedTotal.toFixed(3)} KG</strong>
                      </div>
                    </div>
                  </div>

                  {/* Over-allocation Rejection Warning */}
                  {isExceeded && (
                    <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center gap-2 text-xs text-rose-800 dark:text-rose-300">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>
                        <strong>Production Material Allocation Exceeded:</strong> Total planned across Job Cards ({grandTotalPlanned.toFixed(3)} KG) exceeds Production Order allocation ({poMaxAllocation.toFixed(3)} KG) by <strong>{excessQty.toFixed(3)} KG</strong>. Adjust lot quantities before saving.
                      </span>
                    </div>
                  )}

                  {/* Lot-level Planned Quantity Allocation */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Allocated Phase 2 Lots (Specify Planned Issue KG for this Job Card):
                    </Label>

                    {(!poAllocationPlan || poAllocationPlan.lines.length === 0) ? (
                      <div className="p-4 border rounded-lg bg-background text-center text-xs text-muted-foreground">
                        No lots allocated for this material on Production Order. Please allocate lots in Phase 2 first.
                      </div>
                    ) : (
                      <div className="border rounded-lg overflow-hidden bg-background">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50 text-[11px]">
                              <TableHead className="py-2">Lot No</TableHead>
                              <TableHead className="py-2">Location</TableHead>
                              <TableHead className="py-2 text-right">PO Allocated (KG)</TableHead>
                              <TableHead className="py-2 text-right w-[180px]">Planned for this JC (KG)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {poAllocationPlan.lines.map((line) => {
                              const currentVal = plannedLotQtys[line.lotId] ?? 0;
                              return (
                                <TableRow key={line.lotId} className="text-xs">
                                  <TableCell className="py-2 font-bold font-mono text-foreground">
                                    {line.lotNo}
                                  </TableCell>
                                  <TableCell className="py-2 text-muted-foreground font-mono">
                                    {line.locationBin}
                                  </TableCell>
                                  <TableCell className="py-2 text-right font-mono">
                                    {line.plannedQty.toFixed(3)} KG
                                  </TableCell>
                                  <TableCell className="py-2 text-right">
                                    <Input
                                      type="number"
                                      step="0.001"
                                      min="0"
                                      max={line.plannedQty}
                                      value={currentVal || ""}
                                      placeholder="0.000"
                                      onChange={(e) => {
                                        const v = parseFloat(e.target.value);
                                        const safeV = isNaN(v) || v < 0 ? 0 : roundQty(v);
                                        setPlannedLotQtys((prev) => ({
                                          ...prev,
                                          [line.lotId]: safeV,
                                        }));
                                      }}
                                      className="text-right font-mono font-bold text-xs h-7 w-[140px] ml-auto"
                                    />
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>

                  {/* Summary Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <div className="text-xs flex items-center gap-4">
                      <div>
                        <span className="text-muted-foreground">Total Planned Issue:</span>{" "}
                        <strong className="font-mono text-foreground">
                          {totalPlannedIssueForThisJc.toFixed(3)} KG
                        </strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Remaining Unplanned:</span>{" "}
                        <strong className="font-mono text-muted-foreground">
                          {Math.max(0, currentWeftItem.expectedQtyKg - totalPlannedIssueForThisJc).toFixed(3)} KG
                        </strong>
                      </div>
                    </div>

                    <Button
                      onClick={handleOpenPreview}
                      disabled={isExceeded || totalPlannedIssueForThisJc <= 0}
                      className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      Prepare Yarn Issue Preview
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              size="sm"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* YARN ISSUE PREVIEW MODAL (STEP 19 & 20) */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  Yarn Issue Preview
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Review planned yarn issue details before saving plan.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-muted/40 border rounded-lg space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Job Card:</span>
                <span className="font-bold text-foreground">{selectedJobCard?.card_no}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Assigned Loom:</span>
                <span className="font-semibold text-foreground">
                  {loomForJc ? loomForJc.loom_no : "Unassigned"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Production Order:</span>
                <span className="font-semibold text-foreground">{order.order_no}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Material:</span>
                <span className="font-semibold text-foreground">{currentWeftItem?.material.materialCode}</span>
              </div>
              <div className="flex justify-between border-t pt-1">
                <span className="text-muted-foreground">Expected Requirement:</span>
                <span className="font-mono font-semibold">
                  {currentWeftItem?.expectedQtyKg.toFixed(3)} KG
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="font-semibold text-xs text-foreground block">Planned Lots:</span>
              <div className="border rounded-lg overflow-hidden bg-background">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 text-[10px]">
                      <TableHead className="py-1.5">Lot No</TableHead>
                      <TableHead className="py-1.5 text-right">Planned Issue Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(plannedLotQtys)
                      .filter(([_, qty]) => qty > 0)
                      .map(([lotId, qty]) => {
                        const line = poAllocationPlan?.lines.find((l) => l.lotId === lotId);
                        return (
                          <TableRow key={lotId} className="text-xs">
                            <TableCell className="py-1.5 font-mono font-semibold">
                              {line?.lotNo || lotId}
                            </TableCell>
                            <TableCell className="py-1.5 text-right font-mono font-bold">
                              {qty.toFixed(3)} KG
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <span className="font-bold text-xs text-purple-900 dark:text-purple-200">
                Total Planned Issue:
              </span>
              <span className="font-mono font-bold text-sm text-purple-900 dark:text-purple-200">
                {totalPlannedIssueForThisJc.toFixed(3)} KG
              </span>
            </div>

            <div className="flex items-center gap-2 p-2 bg-muted/30 border rounded-lg text-[10px] text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Planning Mode Safety:</strong> This action creates a planning preview only. No stock is issued, no inventory OUT transaction is generated, and reserved stock is not modified.
              </span>
            </div>
          </div>

          <DialogFooter className="flex justify-between items-center gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviewOpen(false)}
              size="sm"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveIssuePlan}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs h-8"
            >
              Save Issue Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

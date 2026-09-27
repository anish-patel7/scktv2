import React, { useState, useMemo } from "react";
import {
  Factory,
  Layers,
  Package,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
  PlusCircle,
  Scissors,
  BookmarkCheck,
  Search,
  Trash2,
  Edit2,
  FileText,
  AlertCircle,
  Clock,
  ArrowRight,
  RefreshCw,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ProductionPlanningService,
  roundQty,
  type LoomProductionPlan,
  type LoomPlanSummary,
  type LoomPlanningStatus,
  type LoomOperationalStatus,
  type JobCardPreview,
} from "@/services/production-planning.service";
import type { ProductionOrder } from "@/lib/production-store";
import type { CostSheetFull } from "@/lib/cost-sheet-store";
import { JobCardPreviewDialog } from "@/components/job-card-preview-dialog";

interface LoomPlanningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: ProductionOrder;
  costSheet: CostSheetFull | null;
  onPlanUpdated?: () => void;
}

export const LoomPlanningDialog: React.FC<LoomPlanningDialogProps> = ({
  open,
  onOpenChange,
  order,
  costSheet,
  onPlanUpdated,
}) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  // Form State
  const [selectedLoomId, setSelectedLoomId] = useState<string>("");
  const [plannedQty, setPlannedQty] = useState<string>("");
  const [beamRef, setBeamRef] = useState<string>("");
  const [plannedStart, setPlannedStart] = useState<string>("");
  const [plannedEnd, setPlannedEnd] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");

  // Replan Dialog state (Step 25)
  const [replanSourcePlan, setReplanSourcePlan] = useState<LoomProductionPlan | null>(null);
  const [replanTargetLoomId, setReplanTargetLoomId] = useState<string>("");

  // Job Card Preview Dialog state (Step 18 & 19)
  const [activeJobCardPreview, setActiveJobCardPreview] = useState<JobCardPreview | null>(null);
  const [isJobCardDialogOpen, setIsJobCardDialogOpen] = useState<boolean>(false);

  // Board Filter state (Step 30)
  const [boardStatusFilter, setBoardStatusFilter] = useState<string>("ALL");

  // In-Memory Plans for this Order
  const loomPlans = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    refreshKey;
    return ProductionPlanningService.getLoomPlansForOrder(order.id);
  }, [order.id, refreshKey]);

  // Summary Metrics (Step 6)
  const summary: LoomPlanSummary = useMemo(() => {
    return ProductionPlanningService.calculateLoomPlanSummary({
      productionOrder: order,
      plans: loomPlans,
    });
  }, [order, loomPlans]);

  // Master Looms with Operational Status (Step 2 & 3)
  const allLooms = useMemo(() => {
    return ProductionPlanningService.getLoomsWithOperationalStatus();
  }, []);

  // Pre-fill Beam Reference from Phase 3 if available
  const phase3BeamAlloc = useMemo(() => {
    return ProductionPlanningService.getBeamAllocationPlan(order.id);
  }, [order.id, refreshKey]);

  const phase3BeamProd = useMemo(() => {
    return ProductionPlanningService.getBeamProductionPlan(order.id);
  }, [order.id, refreshKey]);

  const defaultBeamRef = phase3BeamAlloc?.beamNo || phase3BeamProd?.beamType || "";

  // Reset or initialize form
  const handleStartAdd = () => {
    setEditingPlanId(null);
    setSelectedLoomId("");
    setPlannedQty(summary.unplannedQty > 0 ? summary.unplannedQty.toString() : "");
    setBeamRef(defaultBeamRef);
    setPlannedStart(new Date().toISOString().slice(0, 10));
    setPlannedEnd("");
    setRemarks("");
  };

  const handleStartEdit = (plan: LoomProductionPlan) => {
    setEditingPlanId(plan.id);
    setSelectedLoomId(plan.loomId);
    setPlannedQty(plan.plannedQty.toString());
    setBeamRef(plan.beamNo || plan.beamPlanId || "");
    setPlannedStart(plan.plannedStart || "");
    setPlannedEnd(plan.plannedEnd || "");
    setRemarks(plan.remark || "");
  };

  // Save or Update Plan (Step 7, 11, 12)
  const handleSavePlan = () => {
    if (!selectedLoomId) {
      toast.error("Please select a loom.");
      return;
    }

    const qty = parseFloat(plannedQty);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid planned quantity greater than zero.");
      return;
    }

    const loomItem = allLooms.find((l) => l.loom.id === selectedLoomId);
    if (!loomItem) {
      toast.error("Selected loom not found in master.");
      return;
    }

    // Safe Blocking (Step 10): Inactive or Maintenance Loom
    if (loomItem.operationalStatus === "INACTIVE" || loomItem.operationalStatus === "MAINTENANCE") {
      toast.error(`Cannot allocate to ${loomItem.loom.loom_no} because operational status is ${loomItem.operationalStatus}.`);
      return;
    }

    // Step 12: Validate Over-planning
    const validation = ProductionPlanningService.validateLoomPlanQuantity({
      productionOrder: order,
      plannedQty: qty,
      ...(editingPlanId ? { currentPlanId: editingPlanId } : {}),
    });

    if (!validation.valid) {
      toast.error(validation.error || "Planned quantity exceeds remaining production order quantity.");
      return;
    }

    // Check conflict (Step 27)
    const conflict = ProductionPlanningService.detectLoomPlanConflict(loomItem.loom.id, order.id);

    if (conflict.hasConflict && conflict.warning) {
      toast.warning(`Note: ${conflict.warning}`);
    }

    // Calculate Warp & Weft Readiness (Step 15, 16, 17)
    const readiness = ProductionPlanningService.calculateLoomReadiness({
      productionOrderId: order.id,
      loomId: loomItem.loom.id,
      ...(beamRef ? { beamNo: beamRef } : {}),
      ...(phase3BeamProd?.id ? { beamPlanId: phase3BeamProd.id } : {}),
    });

    const planToSave: LoomProductionPlan = {
      id: editingPlanId || `loom-plan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productionOrderId: order.id,
      productionOrderNo: order.order_no,
      salesOrderId: order.sales_order_id || undefined,
      salesOrderNo: order.sales_order_no || undefined,
      customerName: order.party_name,
      designNo: order.design_no,
      itemCode: order.design_no || order.order_no,
      loomId: loomItem.loom.id,
      loomNo: loomItem.loom.loom_no,
      loomType: loomItem.loom.loom_type,
      pannaInch: loomItem.loom.panna_inch,
      plannedQty: roundQty(qty),
      producedQty: 0,
      remainingPlannedQty: roundQty(qty),
      plannedStart: plannedStart || undefined,
      plannedEnd: plannedEnd || undefined,
      beamPlanId: phase3BeamProd?.id,
      beamNo: beamRef || undefined,
      warpReadiness: readiness.warpReadiness,
      weftReadiness: readiness.weftReadiness,
      planningStatus: readiness.planningStatus,
      remark: remarks.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const res = ProductionPlanningService.createLoomPlan(planToSave);
    if (!res.success) {
      toast.error(res.error || "Failed to save loom plan.");
      return;
    }

    toast.success(
      editingPlanId
        ? `Loom Plan updated for ${loomItem.loom.loom_no} (${qty} MTR)`
        : `Loom ${loomItem.loom.loom_no} allocated for ${qty} MTR`
    );

    setRefreshKey((k) => k + 1);
    onPlanUpdated?.();
    handleStartAdd();
  };

  // Remove Plan
  const handleRemovePlan = (planId: string, loomNo: string) => {
    ProductionPlanningService.removeLoomPlan(order.id, planId);
    toast.success(`Removed loom plan for ${loomNo}.`);
    setRefreshKey((k) => k + 1);
    onPlanUpdated?.();
  };

  // Prepare Job Card Action (Step 18 & 19)
  const handlePrepareJobCard = (plan: LoomProductionPlan) => {
    const preview = ProductionPlanningService.createJobCardPreviewFromLoomPlan(plan);
    setActiveJobCardPreview(preview);
    setIsJobCardDialogOpen(true);
  };

  // Replan Remaining Work (Step 24 & 25)
  const handleExecuteReplan = () => {
    if (!replanSourcePlan || !replanTargetLoomId) {
      toast.error("Please select a target loom to replan remaining work.");
      return;
    }

    const res = ProductionPlanningService.replanRemainingLoomWork({
      productionOrderId: order.id,
      originalPlanId: replanSourcePlan.id,
      targetLoomId: replanTargetLoomId,
    });

    if (!res.success) {
      toast.error(res.error || "Failed to replan remaining work.");
      return;
    }

    toast.success(`Replanned remaining quantity to target loom.`);
    setReplanSourcePlan(null);
    setReplanTargetLoomId("");
    setRefreshKey((k) => k + 1);
    onPlanUpdated?.();
  };

  // Selected Loom Details
  const selectedLoomItem = allLooms.find((l) => l.loom.id === selectedLoomId);
  const selectedLoomConflict = selectedLoomItem
    ? ProductionPlanningService.detectLoomPlanConflict(selectedLoomItem.loom.id, order.id)
    : null;

  // Filtered looms for Board View (Step 28 & 30)
  const filteredBoardLooms = useMemo(() => {
    if (boardStatusFilter === "ALL") return allLooms;
    return allLooms.filter((l) => l.operationalStatus === boardStatusFilter);
  }, [allLooms, boardStatusFilter]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Factory className="size-5 text-indigo-600" />
                <DialogTitle className="text-base font-bold">
                  LOOM PLANNING WORKSPACE — {order.order_no}
                </DialogTitle>
              </div>
              <Badge
                className={`text-xs px-2 py-0.5 font-bold ${
                  summary.overallLoomPlanningStatus === "LOOM PLANNING COMPLETE"
                    ? "bg-emerald-600 text-white"
                    : summary.overallLoomPlanningStatus === "LOOM PLANNING INCOMPLETE"
                    ? "bg-amber-600 text-white"
                    : summary.overallLoomPlanningStatus === "EXCESS LOOM PLANNED"
                    ? "bg-rose-600 text-white"
                    : "bg-orange-600 text-white"
                }`}
              >
                {summary.overallLoomPlanningStatus}
              </Badge>
            </div>
            <DialogDescription className="text-xs">
              Allocate Production Order quantity across one or more Looms. Inherited upstream parameters are reused automatically.
            </DialogDescription>
          </DialogHeader>

          {/* Safety Disclaimer Banner */}
          <div className="rounded-md border border-indigo-500/30 bg-indigo-500/5 p-2.5 flex items-start gap-2.5">
            <ShieldCheck className="size-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-950 dark:text-indigo-200">
              <span className="font-semibold block mb-0.5">FRONTEND PLANNING ONLY (Step 1-4)</span>
              Reusing existing Loom master. No real database records, loom status modifications, or inventory mutations are performed.
            </div>
          </div>

          {/* SUMMARY DASHBOARD (Step 6) */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
            <div className="p-2 rounded bg-muted/40 border border-border/60">
              <span className="text-[0.625rem] text-muted-foreground block">Production Qty</span>
              <span className="font-mono font-bold text-foreground">
                {summary.productionQty.toLocaleString()} {order.unit || "MTR"}
              </span>
            </div>

            <div className="p-2 rounded bg-muted/40 border border-border/60">
              <span className="text-[0.625rem] text-muted-foreground block">Already Produced</span>
              <span className="font-mono font-bold text-foreground">
                {summary.producedQty.toLocaleString()} {order.unit || "MTR"}
              </span>
            </div>

            <div className="p-2 rounded bg-muted/40 border border-border/60">
              <span className="text-[0.625rem] text-muted-foreground block">Remaining Qty</span>
              <span className="font-mono font-bold text-foreground">
                {summary.remainingQty.toLocaleString()} {order.unit || "MTR"}
              </span>
            </div>

            <div className="p-2 rounded bg-indigo-500/10 border border-indigo-500/30">
              <span className="text-[0.625rem] text-indigo-700 dark:text-indigo-300 block font-semibold">
                Loom Planned
              </span>
              <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
                {summary.loomPlannedQty.toLocaleString()} {order.unit || "MTR"}
              </span>
            </div>

            <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30">
              <span className="text-[0.625rem] text-amber-700 dark:text-amber-300 block font-semibold">
                Unplanned Qty
              </span>
              <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
                {summary.unplannedQty.toLocaleString()} {order.unit || "MTR"}
              </span>
            </div>

            <div
              className={`p-2 rounded border ${
                summary.excessPlannedQty > 0
                  ? "bg-rose-500/10 border-rose-500/40 text-rose-700"
                  : "bg-muted/40 border-border/60 text-muted-foreground"
              }`}
            >
              <span className="text-[0.625rem] block font-semibold">Excess Planned</span>
              <span className="font-mono font-bold">
                {summary.excessPlannedQty.toLocaleString()} {order.unit || "MTR"}
              </span>
            </div>
          </div>

          <Tabs defaultValue="allocation" className="w-full">
            <TabsList className="grid grid-cols-2 w-full h-8 text-xs">
              <TabsTrigger value="allocation" className="text-xs">
                Loom Allocation ({loomPlans.length} Looms)
              </TabsTrigger>
              <TabsTrigger value="board" className="text-xs">
                Loom Planning Board ({allLooms.length} Looms)
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: ALLOCATION & EDITING */}
            <TabsContent value="allocation" className="space-y-4 pt-2">
              {/* ADD / EDIT LOOM PLAN FORM (Step 7) */}
              <div className="p-3 rounded-lg border border-border bg-card space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Factory className="size-3.5 text-primary" />
                    {editingPlanId ? "Edit Loom Plan" : "Add Loom Plan"}
                  </span>
                  {editingPlanId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleStartAdd}
                      className="h-6 text-[0.6875rem] text-muted-foreground"
                    >
                      Cancel Edit
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                  {/* Field 1: Loom Selector */}
                  <div className="space-y-1">
                    <Label className="text-[0.6875rem] font-semibold">Select Loom *</Label>
                    <Select value={selectedLoomId} onValueChange={setSelectedLoomId}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Choose a loom..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allLooms.map((l) => {
                          const disabled = l.operationalStatus === "INACTIVE" || l.operationalStatus === "MAINTENANCE";
                          return (
                            <SelectItem key={l.loom.id} value={l.loom.id} disabled={disabled} className="text-xs">
                              <span className="font-mono font-bold mr-2">{l.loom.loom_no}</span>
                              <span className="text-muted-foreground text-[0.6875rem] mr-2">
                                ({l.loom.loom_type}, {l.loom.panna_inch}")
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[0.5625rem] px-1 py-0 ${
                                  l.operationalStatus === "AVAILABLE"
                                    ? "text-emerald-700 border-emerald-500"
                                    : l.operationalStatus === "RUNNING"
                                    ? "text-blue-700 border-blue-500"
                                    : l.operationalStatus === "MAINTENANCE"
                                    ? "text-amber-700 border-amber-500"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {l.operationalStatus}
                              </Badge>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {selectedLoomItem && (
                      <p className="text-[0.625rem] text-muted-foreground">
                        Operational: <strong className="font-semibold">{selectedLoomItem.operationalStatus}</strong> · Type:{" "}
                        {selectedLoomItem.loom.loom_type} ({selectedLoomItem.loom.panna_inch}")
                      </p>
                    )}
                  </div>

                  {/* Field 2: Planned Quantity (Step 12: Do not overplan) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[0.6875rem] font-semibold">Planned Qty (MTR) *</Label>
                      {summary.unplannedQty > 0 && !editingPlanId && (
                        <button
                          type="button"
                          onClick={() => setPlannedQty(summary.unplannedQty.toString())}
                          className="text-[0.625rem] text-primary hover:underline"
                        >
                          Fill Remaining ({summary.unplannedQty}m)
                        </button>
                      )}
                    </div>
                    <Input
                      type="number"
                      step="any"
                      min="1"
                      value={plannedQty}
                      onChange={(e) => setPlannedQty(e.target.value)}
                      placeholder="e.g. 2000"
                      className="h-8 text-xs font-mono"
                    />
                    {parseFloat(plannedQty) > (summary.unplannedQty + (editingPlanId ? (loomPlans.find(p => p.id === editingPlanId)?.plannedQty || 0) : 0)) && (
                      <p className="text-[0.625rem] text-rose-600 font-semibold">
                        Warning: Exceeds remaining Production Order by{" "}
                        {roundQty(parseFloat(plannedQty) - (summary.unplannedQty + (editingPlanId ? (loomPlans.find(p => p.id === editingPlanId)?.plannedQty || 0) : 0)))} MTR.
                      </p>
                    )}
                  </div>

                  {/* Field 3: Beam / Beam Plan (Step 14) */}
                  <div className="space-y-1">
                    <Label className="text-[0.6875rem] font-semibold">Beam / Beam Plan Ref</Label>
                    <Input
                      type="text"
                      value={beamRef}
                      onChange={(e) => setBeamRef(e.target.value)}
                      placeholder="e.g. BM-102 or BP-005"
                      className="h-8 text-xs font-mono"
                    />
                    <p className="text-[0.5625rem] text-muted-foreground truncate">
                      {phase3BeamAlloc ? `Inherited: Beam ${phase3BeamAlloc.beamNo}` : phase3BeamProd ? `Inherited: ${phase3BeamProd.beamType}` : "Planning reference only"}
                    </p>
                  </div>

                  {/* Field 4: Planned Start / End (Step 8) */}
                  <div className="space-y-1">
                    <Label className="text-[0.6875rem] font-semibold">Schedule (Start / End)</Label>
                    <div className="grid grid-cols-2 gap-1">
                      <Input
                        type="date"
                        value={plannedStart}
                        onChange={(e) => setPlannedStart(e.target.value)}
                        className="h-8 text-[0.6875rem] px-1 font-mono"
                        title="Planned Start Date"
                      />
                      <Input
                        type="date"
                        value={plannedEnd}
                        onChange={(e) => setPlannedEnd(e.target.value)}
                        className="h-8 text-[0.6875rem] px-1 font-mono"
                        title="Planned End Date (Optional)"
                        placeholder="End date"
                      />
                    </div>
                    <span className="text-[0.5625rem] text-muted-foreground block truncate">
                      Planned End is optional (Loom capacity planning pending)
                    </span>
                  </div>
                </div>

                {/* Conflict Alert (Step 27) */}
                {selectedLoomConflict?.hasConflict && (
                  <div className="rounded border border-amber-500/40 bg-amber-500/10 p-2 text-xs flex items-center gap-2 text-amber-900 dark:text-amber-200">
                    <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                    <span>
                      <strong>LOOM PLAN CONFLICT:</strong> {selectedLoomConflict.warning}.
                    </span>
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex justify-between items-center pt-1 border-t border-border/50">
                  <div className="text-[0.6875rem] text-muted-foreground">
                    Inherited: <span className="font-semibold text-foreground">{order.design_no || order.order_no}</span> · Design:{" "}
                    <span className="font-mono">{order.design_no || "Standard"}</span> · Delivery:{" "}
                    <span className="font-mono">{order.delivery_date || "15/10/2026"}</span>
                  </div>

                  <Button
                    size="sm"
                    onClick={handleSavePlan}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 h-8 font-bold"
                  >
                    <BookmarkCheck className="size-3.5" />
                    {editingPlanId ? "Update Plan" : "Add to Loom Plan"}
                  </Button>
                </div>
              </div>

              {/* LOOM PLANS TABLE (Desktop) & CARDS (Mobile) (Step 11 & Step 38) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Current Loom Allocations ({loomPlans.length} Looms)
                  </span>
                  <span className="text-[0.6875rem] text-muted-foreground font-mono">
                    Total: {summary.loomPlannedQty.toLocaleString()} / {summary.productionQty.toLocaleString()} MTR
                  </span>
                </div>

                {loomPlans.length === 0 ? (
                  <div className="p-8 text-center border border-dashed rounded-lg text-muted-foreground text-xs space-y-1">
                    <Factory className="size-6 mx-auto text-muted-foreground/60" />
                    <p className="font-semibold">No Looms Allocated Yet</p>
                    <p className="text-[0.6875rem]">
                      Select a loom and assign planned meters using the form above.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Desktop View */}
                    <div className="hidden md:block rounded-md border border-border overflow-hidden">
                      <Table className="text-xs">
                        <TableHeader>
                          <TableRow className="bg-muted/60 text-muted-foreground font-semibold">
                            <TableHead className="h-8">Loom</TableHead>
                            <TableHead className="h-8 text-right font-bold">Planned Qty</TableHead>
                            <TableHead className="h-8 text-right">Produced</TableHead>
                            <TableHead className="h-8">Beam Ref</TableHead>
                            <TableHead className="h-8">Warp Readiness</TableHead>
                            <TableHead className="h-8">Weft Readiness</TableHead>
                            <TableHead className="h-8">Planning Status</TableHead>
                            <TableHead className="h-8 text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loomPlans.map((plan) => {
                            const loomObj = allLooms.find((l) => l.loom.id === plan.loomId);
                            const isMaintenance = loomObj?.operationalStatus === "MAINTENANCE";
                            const produced = plan.producedQty || 0;
                            const remaining = Math.max(0, plan.plannedQty - produced);

                            return (
                              <TableRow key={plan.id} className="hover:bg-muted/40">
                                <TableCell className="py-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-bold text-foreground text-sm">
                                      {plan.loomNo}
                                    </span>
                                    {loomObj && (
                                      <Badge
                                        variant="outline"
                                        className={`text-[0.5625rem] px-1 py-0 ${
                                          loomObj.operationalStatus === "AVAILABLE"
                                            ? "text-emerald-700 border-emerald-500"
                                            : loomObj.operationalStatus === "RUNNING"
                                            ? "text-blue-700 border-blue-500"
                                            : loomObj.operationalStatus === "MAINTENANCE"
                                            ? "text-amber-700 border-amber-500"
                                            : "text-muted-foreground"
                                        }`}
                                      >
                                        {loomObj.operationalStatus}
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-[0.625rem] text-muted-foreground block">
                                    {loomObj?.loom.loom_type} · {loomObj?.loom.panna_inch}"
                                  </span>
                                </TableCell>

                                <TableCell className="py-2 text-right font-mono font-bold text-primary">
                                  {plan.plannedQty.toLocaleString()} MTR
                                </TableCell>

                                <TableCell className="py-2 text-right font-mono text-muted-foreground">
                                  {produced > 0 ? (
                                    <span className="font-bold text-emerald-700">{produced} MTR</span>
                                  ) : (
                                    "—"
                                  )}
                                </TableCell>

                                <TableCell className="py-2 font-mono text-blue-600 font-semibold">
                                  {plan.beamNo || plan.beamPlanId || "—"}
                                </TableCell>

                                <TableCell className="py-2">
                                  <Badge
                                    variant="outline"
                                    className={`text-[0.5625rem] font-bold ${
                                      plan.warpReadiness === "WARP READY"
                                        ? "border-emerald-500 text-emerald-700 bg-emerald-50/50"
                                        : "border-amber-500 text-amber-700 bg-amber-50/50"
                                    }`}
                                  >
                                    {plan.warpReadiness}
                                  </Badge>
                                </TableCell>

                                <TableCell className="py-2">
                                  <Badge
                                    variant="outline"
                                    className={`text-[0.5625rem] font-bold ${
                                      plan.weftReadiness === "WEFT READY"
                                        ? "border-emerald-500 text-emerald-700 bg-emerald-50/50"
                                        : "border-rose-500 text-rose-700 bg-rose-50/50"
                                    }`}
                                  >
                                    {plan.weftReadiness}
                                  </Badge>
                                </TableCell>

                                <TableCell className="py-2">
                                  <Badge
                                    className={`text-[0.5625rem] font-bold ${
                                      plan.planningStatus === "READY"
                                        ? "bg-emerald-600 text-white"
                                        : plan.planningStatus === "BLOCKED_BY_BEAM"
                                        ? "bg-amber-600 text-white"
                                        : plan.planningStatus === "BLOCKED_BY_MATERIAL"
                                        ? "bg-rose-600 text-white"
                                        : "bg-indigo-600 text-white"
                                    }`}
                                  >
                                    {plan.planningStatus}
                                  </Badge>
                                </TableCell>

                                <TableCell className="py-2 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handlePrepareJobCard(plan)}
                                      className="h-6 text-[0.625rem] px-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-bold"
                                      title="Prepare Job Card Preview"
                                    >
                                      <FileText className="size-3 mr-1" /> Prepare JC
                                    </Button>

                                    {(isMaintenance || produced > 0) && remaining > 0 && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setReplanSourcePlan(plan)}
                                        className="h-6 text-[0.625rem] px-1.5 text-amber-700 border-amber-300 hover:bg-amber-50"
                                        title={`Replan remaining ${remaining} MTR`}
                                      >
                                        <ArrowRight className="size-3 mr-1" /> Replan
                                      </Button>
                                    )}

                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleStartEdit(plan)}
                                      className="size-6 p-0 text-muted-foreground hover:text-foreground"
                                      title="Edit Plan"
                                    >
                                      <Edit2 className="size-3" />
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleRemovePlan(plan.id, plan.loomNo)}
                                      className="size-6 p-0 text-muted-foreground hover:text-rose-600"
                                      title="Delete Plan"
                                    >
                                      <Trash2 className="size-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Cards View (Step 38) */}
                    <div className="md:hidden space-y-2">
                      {loomPlans.map((plan) => {
                        const loomObj = allLooms.find((l) => l.loom.id === plan.loomId);
                        const produced = plan.producedQty || 0;
                        const remaining = Math.max(0, plan.plannedQty - produced);

                        return (
                          <Card key={plan.id} className="border border-border">
                            <CardContent className="p-3 space-y-2 text-xs">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-foreground text-sm">
                                    {plan.loomNo}
                                  </span>
                                  <Badge variant="outline" className="text-[0.5625rem]">
                                    {loomObj?.operationalStatus || "AVAILABLE"}
                                  </Badge>
                                </div>
                                <Badge
                                  className={`text-[0.5625rem] ${
                                    plan.planningStatus === "READY"
                                      ? "bg-emerald-600 text-white"
                                      : "bg-indigo-600 text-white"
                                  }`}
                                >
                                  {plan.planningStatus}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-2 gap-1 text-[0.6875rem]">
                                <div>
                                  <span className="text-muted-foreground">Planned: </span>
                                  <strong className="font-mono font-bold text-primary">
                                    {plan.plannedQty} MTR
                                  </strong>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Beam: </span>
                                  <span className="font-mono text-blue-600 font-semibold">
                                    {plan.beamNo || plan.beamPlanId || "None"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Warp: </span>
                                  <span className="font-semibold">{plan.warpReadiness}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Weft: </span>
                                  <span className="font-semibold">{plan.weftReadiness}</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-end gap-1 pt-1 border-t border-border/50">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePrepareJobCard(plan)}
                                  className="h-6 text-[0.625rem] px-2 text-indigo-600 font-bold"
                                >
                                  Prepare JC
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleStartEdit(plan)}
                                  className="h-6 text-[0.625rem] px-2"
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRemovePlan(plan.id, plan.loomNo)}
                                  className="h-6 text-[0.625rem] px-2 text-rose-600"
                                >
                                  Delete
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            {/* TAB 2: LOOM PLANNING BOARD (Step 28 & 30) */}
            <TabsContent value="board" className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground text-[0.6875rem]">Filter by Operational Status:</span>
                  <Select value={boardStatusFilter} onValueChange={setBoardStatusFilter}>
                    <SelectTrigger className="h-7 text-xs w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Looms</SelectItem>
                      <SelectItem value="AVAILABLE">Available</SelectItem>
                      <SelectItem value="RUNNING">Running</SelectItem>
                      <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <span className="text-[0.6875rem] text-muted-foreground">
                  Showing {filteredBoardLooms.length} of {allLooms.length} Looms
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {filteredBoardLooms.map((l) => {
                  const plansOnLoom = ProductionPlanningService.getLoomPlansForOrder(order.id).filter(
                    (p) => p.loomId === l.loom.id
                  );
                  const isAllocatedToThisOrder = plansOnLoom.length > 0;
                  const isSelectable = l.operationalStatus !== "INACTIVE" && l.operationalStatus !== "MAINTENANCE";

                  return (
                    <Card
                      key={l.loom.id}
                      className={`border transition-all ${
                        isAllocatedToThisOrder
                          ? "border-indigo-500 bg-indigo-500/5 shadow-sm"
                          : l.operationalStatus === "AVAILABLE"
                          ? "border-border hover:border-primary/50"
                          : l.operationalStatus === "MAINTENANCE"
                          ? "border-amber-500/40 bg-amber-500/5 opacity-80"
                          : "border-muted bg-muted/20 opacity-60"
                      }`}
                    >
                      <CardContent className="p-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-sm text-foreground">
                              {l.loom.loom_no}
                            </span>
                            <span className="text-[0.625rem] text-muted-foreground">
                              ({l.loom.loom_type}, {l.loom.panna_inch}")
                            </span>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[0.5625rem] font-bold ${
                              l.operationalStatus === "AVAILABLE"
                                ? "border-emerald-500 text-emerald-700 bg-emerald-50/50"
                                : l.operationalStatus === "RUNNING"
                                ? "border-blue-500 text-blue-700 bg-blue-50/50"
                                : l.operationalStatus === "MAINTENANCE"
                                ? "border-amber-500 text-amber-700 bg-amber-50/50"
                                : "text-muted-foreground"
                            }`}
                          >
                            {l.operationalStatus}
                          </Badge>
                        </div>

                        <div className="space-y-1 text-[0.6875rem] border-t border-border/50 pt-1.5">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Current Order:</span>
                            <span className="font-mono">{l.loom.order_id || "None"}</span>
                          </div>

                          {isAllocatedToThisOrder ? (
                            <div className="flex justify-between font-semibold text-indigo-700 dark:text-indigo-300">
                              <span>This Plan:</span>
                              <span className="font-mono">
                                {plansOnLoom.reduce((a, b) => a + b.plannedQty, 0).toLocaleString()} MTR
                              </span>
                            </div>
                          ) : (
                            <div className="flex justify-between text-muted-foreground">
                              <span>This Order:</span>
                              <span>Not Planned</span>
                            </div>
                          )}
                        </div>

                        {isSelectable && !isAllocatedToThisOrder && summary.unplannedQty > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedLoomId(l.loom.id);
                              setPlannedQty(summary.unplannedQty.toString());
                              setBeamRef(defaultBeamRef);
                            }}
                            className="w-full h-6 text-[0.625rem] text-primary border-primary/30 hover:bg-primary/5"
                          >
                            + Allocate to this Loom
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex items-center justify-between sm:justify-between w-full pt-2 border-t border-border/60">
            <span className="text-[0.6875rem] text-muted-foreground">
              Phase 3B Contract Only · No real inventory or job card posting
            </span>
            <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REPLAN DIALOG (Step 24 & 25: Breakdown / Replan) */}
      {replanSourcePlan && (
        <Dialog open={!!replanSourcePlan} onOpenChange={() => setReplanSourcePlan(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <Scissors className="size-4 text-amber-600" />
                Replan Remaining Work — {replanSourcePlan.loomNo}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Protect actual historical production ({replanSourcePlan.producedQty || 0} MTR) and replan remaining meters to an available loom.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="p-2.5 rounded bg-muted/40 border border-border/60 space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Original Planned:</span>
                  <span className="font-mono font-bold">{replanSourcePlan.plannedQty} MTR</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Actual Produced (Protected):</span>
                  <span className="font-mono font-bold">{replanSourcePlan.producedQty || 0} MTR</span>
                </div>
                <div className="flex justify-between text-indigo-700 font-bold border-t border-border/40 pt-1">
                  <span>Remaining to Replan:</span>
                  <span className="font-mono">
                    {Math.max(0, replanSourcePlan.plannedQty - (replanSourcePlan.producedQty || 0))} MTR
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Select Target Loom *</Label>
                <Select value={replanTargetLoomId} onValueChange={setReplanTargetLoomId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Choose target loom..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allLooms
                      .filter(
                        (l) =>
                          l.loom.id !== replanSourcePlan.loomId &&
                          l.operationalStatus !== "INACTIVE" &&
                          l.operationalStatus !== "MAINTENANCE"
                      )
                      .map((l) => (
                        <SelectItem key={l.loom.id} value={l.loom.id} className="text-xs">
                          {l.loom.loom_no} ({l.loom.loom_type}, {l.operationalStatus})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-2 rounded border border-amber-500/30 bg-amber-500/5 text-[0.6875rem] text-amber-900 dark:text-amber-200">
                <strong>BUSINESS RULE PENDING:</strong> Job Card continuation after Loom change (whether to create a new Job Card or transfer existing).
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button size="sm" variant="outline" onClick={() => setReplanSourcePlan(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleExecuteReplan}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                Replan Remaining
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* JOB CARD PREVIEW DIALOG (Step 18 & 19) */}
      <JobCardPreviewDialog
        open={isJobCardDialogOpen}
        onOpenChange={setIsJobCardDialogOpen}
        preview={activeJobCardPreview}
        onSaved={() => {
          setRefreshKey((k) => k + 1);
          onPlanUpdated?.();
        }}
      />
    </>
  );
};

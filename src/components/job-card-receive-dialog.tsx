import React, { useState } from "react";
import {
  PackageCheck,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  History,
  TrendingUp,
  Package,
  ArrowRight,
  Sparkles,
  HelpCircle,
  FileCheck2,
  PlusCircle,
  Trash2,
  AlertOctagon,
  RefreshCw,
  Clock,
  ShieldAlert,
  Divide,
  Eye,
  Info,
  ClipboardCheck,
  Route,
} from "lucide-react";
import { FabricProcessRouteDialog } from "@/components/fabric-process-route-dialog";
import { FabricProcessRoutingService } from "@/services/fabric-process-routing.service";
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
  ProductionPlanningService,
  calculateRollTotal,
  calculateRollBalance,
  splitQuantityEqually,
  type JobCardDraft,
  type JobCardReceiveSummary,
  type FabricRollDraft,
  type JobCardReceiveSimulationTransaction,
} from "@/services/production-planning.service";
import type { ProductionOrder } from "@/lib/production-store";
import { FabricQualityInspectionDialog } from "@/components/fabric-quality-inspection-dialog";

interface JobCardReceiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: JobCardDraft | null;
  order: ProductionOrder | null;
  onUpdated?: () => void;
}

interface RollInputRow {
  id: string;
  qtyMetre: number;
  grossWeightKg?: number;
  widthInch?: number;
  locationHint?: string;
  remark?: string;
}

export function JobCardReceiveDialog({
  open,
  onOpenChange,
  draft,
  order,
  onUpdated,
}: JobCardReceiveDialogProps) {
  const [activeTab, setActiveTab] = useState<"receive" | "history" | "preview" | "adjust">("receive");
  const [receiveDate, setReceiveDate] = useState<string>(
    new Date().toISOString().split("T")[0]!
  );
  const [receiveQtyInput, setReceiveQtyInput] = useState<string>("");
  const [rolls, setRolls] = useState<RollInputRow[]>([]);
  const [remark, setRemark] = useState<string>("");
  const [splitCount, setSplitCount] = useState<number>(3);

  // Adjustment form state
  const [adjustmentQtyInput, setAdjustmentQtyInput] = useState<string>("");
  const [adjustmentReason, setAdjustmentReason] = useState<string>("");
  const [adjustmentRemark, setAdjustmentRemark] = useState<string>("");

  // Phase 5B Quality Inspection Dialog state
  const [selectedRollForInspection, setSelectedRollForInspection] = useState<FabricRollDraft | null>(null);
  const [isInspectionDialogOpen, setIsInspectionDialogOpen] = useState<boolean>(false);

  // Phase 5C Process Routing Dialog state
  const [selectedRollForRouting, setSelectedRollForRouting] = useState<FabricRollDraft | null>(null);
  const [isRoutingDialogOpen, setIsRoutingDialogOpen] = useState<boolean>(false);

  if (!draft || !order) return null;

  const summary: JobCardReceiveSummary = ProductionPlanningService.getJobCardReceiveSummary(draft, order);
  const transactions: JobCardReceiveSimulationTransaction[] = summary.transactions;

  const receiveQty = parseFloat(receiveQtyInput) || 0;
  const rollTotal = calculateRollTotal(rolls);
  const rollBalance = calculateRollBalance(receiveQty, rolls);

  // Initialize receive quantity to receivable if empty
  const handleSetMaxReceivable = () => {
    const rec = summary.receivableQtyMetre;
    setReceiveQtyInput(rec.toFixed(3));
    if (rolls.length === 0 || (rolls.length === 1 && rolls[0]?.qtyMetre === 0)) {
      setRolls([{ id: "roll-init-1", qtyMetre: rec }]);
    }
  };

  const handleAddRoll = () => {
    const unallocated = Math.max(0, rollBalance);
    const newRoll: RollInputRow = {
      id: `roll-${Date.now()}-${rolls.length + 1}`,
      qtyMetre: unallocated > 0 ? unallocated : 0,
      widthInch: draft?.pannaInch,
    };
    setRolls((prev) => [...prev, newRoll]);
  };

  const handleRemoveRoll = (index: number) => {
    setRolls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRollQtyChange = (index: number, val: string) => {
    const parsed = parseFloat(val) || 0;
    setRolls((prev) =>
      prev.map((r, i) => (i === index ? { ...r, qtyMetre: parsed } : r))
    );
  };

  const handleRollFieldChange = (
    index: number,
    field: "grossWeightKg" | "widthInch" | "remark" | "locationHint",
    val: string
  ) => {
    setRolls((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r;
        if (field === "grossWeightKg" || field === "widthInch") {
          const num = parseFloat(val);
          return { ...r, [field]: isNaN(num) ? undefined : num };
        }
        return { ...r, [field]: val };
      })
    );
  };

  const handleQuickSplit = () => {
    if (receiveQty <= 0) {
      toast.error("Please enter a valid receive quantity before splitting.");
      return;
    }
    if (splitCount <= 0 || splitCount > 20) {
      toast.error("Please specify roll count between 1 and 20.");
      return;
    }
    const splitRolls = splitQuantityEqually(receiveQty, splitCount);
    const newRollRows: RollInputRow[] = splitRolls.map((sr, idx) => ({
      id: `split-${Date.now()}-${idx + 1}`,
      qtyMetre: sr.qtyMetre,
      widthInch: draft?.pannaInch,
    }));
    setRolls(newRollRows);
    toast.success(`Split ${receiveQty.toFixed(3)} MTR equally across ${splitCount} rolls.`);
  };

  const handleSaveReceiveSimulation = () => {
    if (receiveQty <= 0) {
      toast.error("Receive quantity must be greater than zero.");
      return;
    }

    if (receiveQty > summary.receivableQtyMetre) {
      toast.error(
        `Receive quantity exceeds produced but unreceived quantity by ${(
          receiveQty - summary.receivableQtyMetre
        ).toFixed(3)} MTR.`
      );
      return;
    }

    if (rolls.length === 0) {
      toast.error("At least one roll/piece must be defined.");
      return;
    }

    if (Math.abs(rollBalance) > 0.001) {
      if (rollBalance > 0) {
        toast.error(`Roll formation incomplete: ${rollBalance.toFixed(3)} MTR UNALLOCATED.`);
      } else {
        toast.error(`Roll formation invalid: ${Math.abs(rollBalance).toFixed(3)} MTR EXCESS.`);
      }
      return;
    }

    for (let i = 0; i < rolls.length; i++) {
      if (rolls[i]!.qtyMetre <= 0) {
        toast.error(`Roll #${i + 1} quantity must be greater than zero.`);
        return;
      }
    }

    const res = ProductionPlanningService.createJobCardReceiveSimulation({
      draft,
      order,
      receiveDate,
      receiveQtyMetre: receiveQty,
      rolls: rolls.map((r) => ({
        qtyMetre: r.qtyMetre,
        ...(r.grossWeightKg !== undefined ? { grossWeightKg: r.grossWeightKg } : {}),
        ...(r.widthInch !== undefined ? { widthInch: r.widthInch } : {}),
        ...(r.locationHint ? { locationHint: r.locationHint } : {}),
        ...(r.remark ? { remark: r.remark } : {}),
      })),
      ...(remark.trim() ? { remark: remark.trim() } : {}),
    });

    if (!res.success) {
      toast.error(res.error || "Failed to save receive simulation.");
      return;
    }

    toast.success(
      `Job Card Receive draft simulated: ${receiveQty.toFixed(3)} MTR across ${
        rolls.length
      } rolls (UNINSPECTED GREY).`
    );
    setReceiveQtyInput("");
    setRolls([]);
    setRemark("");
    onUpdated?.();
  };

  const handleSaveAdjustmentSimulation = () => {
    const adjQty = parseFloat(adjustmentQtyInput);
    if (isNaN(adjQty) || Math.abs(adjQty) < 0.001) {
      toast.error("Please enter a valid non-zero adjustment quantity.");
      return;
    }
    if (!adjustmentReason.trim()) {
      toast.error("Please specify a reason for this receipt adjustment.");
      return;
    }

    const res = ProductionPlanningService.createReceiptAdjustmentSimulation({
      draft,
      order,
      adjustmentQtyMetre: adjQty,
      reason: adjustmentReason.trim(),
      ...(adjustmentRemark.trim() ? { remark: adjustmentRemark.trim() } : {}),
    });

    if (!res.success) {
      toast.error(res.error || "Failed to record receipt adjustment.");
      return;
    }

    toast.success(
      `Receipt adjustment recorded: ${adjQty > 0 ? "+" : ""}${adjQty.toFixed(
        3
      )} MTR. Historical receipts preserved.`
    );
    setAdjustmentQtyInput("");
    setAdjustmentReason("");
    setAdjustmentRemark("");
    setActiveTab("history");
    onUpdated?.();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-950 border-slate-800 text-slate-100">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-slate-800 bg-slate-900/60 flex-shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 bg-indigo-500/10 font-mono">
                  PHASE 5A SIMULATION
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    summary.status === "REVIEW_REQUIRED"
                      ? "border-rose-500/40 text-rose-400 bg-rose-500/10"
                      : summary.status === "FULLY_RECEIVED"
                      ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                      : summary.status === "PARTIALLY_RECEIVED"
                      ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
                      : "border-slate-600 text-slate-400"
                  }
                >
                  {summary.status.replace("_", " ")}
                </Badge>
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight text-white mt-1 flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-indigo-400" />
                Job Card Receive & Roll Formation — {draft.draftCardNo}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 mt-0.5">
                Physical grey fabric receipt simulation from weaving loom. Creates uninspected roll drafts without mutating real stock.
              </DialogDescription>
            </div>

            {/* Traceability Context Chips */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2 py-1 rounded bg-slate-800/80 border border-slate-700/60 font-mono text-slate-300">
                PO: {order.order_no}
              </span>
              <span className="px-2 py-1 rounded bg-slate-800/80 border border-slate-700/60 font-mono text-slate-300">
                Loom: {draft.loomNo}
              </span>
              {draft.beamNo && (
                <span className="px-2 py-1 rounded bg-slate-800/80 border border-slate-700/60 font-mono text-slate-300">
                  Beam: {draft.beamNo}
                </span>
              )}
            </div>
          </div>

          {/* Traceability Line */}
          <div className="mt-3 py-1.5 px-3 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center gap-1.5 text-[11px] text-slate-400 overflow-x-auto">
            <span className="text-slate-300 font-medium">SO: {order.sales_order_no || "N/A"}</span>
            <ArrowRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
            <span className="text-slate-300 font-medium">PO: {order.order_no}</span>
            <ArrowRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
            <span className="text-slate-300 font-medium">Loom: {draft.loomNo}</span>
            <ArrowRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
            <span className="text-slate-300 font-medium">JC: {draft.draftCardNo}</span>
            <ArrowRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
            <span className="text-amber-400 font-medium">Produced: {summary.effectiveProducedQtyMetre.toFixed(1)}m</span>
            <ArrowRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
            <span className="text-indigo-400 font-medium">Receive Simulation</span>
            <ArrowRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
            <span className="text-emerald-400 font-medium">Grey Roll Draft</span>
            <ArrowRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
            <span className="text-purple-400 font-medium">Quality Inspection (Phase 5B)</span>
          </div>

          {/* Review Required Warning Banner */}
          {summary.requiresReview && (
            <div className="mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs">
              <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">ATTENTION — REVIEW REQUIRED: </span>
                {summary.reviewReason}
              </div>
            </div>
          )}

          {/* Target Reached & Fabric Complete Banner */}
          {summary.isFabricReceiptComplete && (
            <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-start justify-between gap-3 text-emerald-300 text-xs">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-emerald-200">FABRIC RECEIPT COMPLETE</div>
                  <div className="text-[11px] text-emerald-400/90 mt-0.5">
                    Production target reached ({summary.plannedQtyMetre.toFixed(1)} MTR) and all produced fabric has been received from the loom.
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 text-[11px] text-slate-400">
                <span>Material Settlement: <strong className="text-amber-400">PENDING</strong></span>
                <span>Job Card Closure: <strong className="text-slate-300">NOT AVAILABLE</strong></span>
              </div>
            </div>
          )}
        </DialogHeader>

        {/* Metric Cards Banner */}
        <div className="p-4 bg-slate-900/40 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 flex-shrink-0">
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Job Card Target</span>
            <span className="text-base font-bold text-white font-mono">{summary.plannedQtyMetre.toFixed(3)}</span>
            <span className="text-[10px] text-slate-500 ml-1">MTR</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Produced To Date</span>
            <span className="text-base font-bold text-amber-400 font-mono">{summary.effectiveProducedQtyMetre.toFixed(3)}</span>
            <span className="text-[10px] text-slate-500 ml-1">MTR</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Total Received</span>
            <span className="text-base font-bold text-indigo-400 font-mono">{summary.totalReceivedQtyMetre.toFixed(3)}</span>
            <span className="text-[10px] text-slate-500 ml-1">MTR</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Receivable Now</span>
            <span className="text-base font-bold text-emerald-400 font-mono">{summary.receivableQtyMetre.toFixed(3)}</span>
            <span className="text-[10px] text-slate-500 ml-1">MTR</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-800 bg-slate-900/20 flex gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant={activeTab === "receive" ? "default" : "ghost"}
            className={activeTab === "receive" ? "bg-indigo-600 hover:bg-indigo-500 text-white" : "text-slate-400"}
            onClick={() => setActiveTab("receive")}
          >
            <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
            Receive Fabric
          </Button>
          <Button
            size="sm"
            variant={activeTab === "preview" ? "default" : "ghost"}
            className={activeTab === "preview" ? "bg-indigo-600 hover:bg-indigo-500 text-white" : "text-slate-400"}
            onClick={() => setActiveTab("preview")}
          >
            <Eye className="w-3.5 h-3.5 mr-1.5" />
            Fabric Stock Preview ({summary.totalRollDraftCount})
          </Button>
          <Button
            size="sm"
            variant={activeTab === "history" ? "default" : "ghost"}
            className={activeTab === "history" ? "bg-indigo-600 hover:bg-indigo-500 text-white" : "text-slate-400"}
            onClick={() => setActiveTab("history")}
          >
            <History className="w-3.5 h-3.5 mr-1.5" />
            Receipt History ({transactions.length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === "adjust" ? "default" : "ghost"}
            className={activeTab === "adjust" ? "bg-indigo-600 hover:bg-indigo-500 text-white" : "text-slate-400"}
            onClick={() => setActiveTab("adjust")}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Receipt Adjustment
          </Button>
        </div>

        {/* Tab Contents (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* TAB 1: RECEIVE ENTRY */}
          {activeTab === "receive" && (
            <div className="space-y-5">
              {/* Informational Callout */}
              <div className="p-3.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">GREY FABRIC RULE:</strong> Produced fabric received here is uninspected grey cloth.
                  It is assigned <span className="font-mono text-amber-300">DRAFT_GREY</span> status and <span className="font-mono text-amber-300">UNINSPECTED</span> quality state.
                  No Grade A or saleable inventory is created until Quality Inspection in Phase 5B.
                </div>
              </div>

              {/* Form Row: Date + Qty */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div>
                  <Label className="text-xs text-slate-300 mb-1.5 block">Receive Date</Label>
                  <Input
                    type="date"
                    value={receiveDate}
                    onChange={(e) => setReceiveDate(e.target.value)}
                    className="bg-slate-950 border-slate-700 text-white text-sm"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-xs text-slate-300">Receive Quantity (MTR)</Label>
                    <button
                      type="button"
                      onClick={handleSetMaxReceivable}
                      className="text-[11px] text-indigo-400 hover:underline"
                    >
                      Max ({summary.receivableQtyMetre.toFixed(1)}m)
                    </button>
                  </div>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="0.000"
                    value={receiveQtyInput}
                    onChange={(e) => setReceiveQtyInput(e.target.value)}
                    className="bg-slate-950 border-slate-700 text-white font-mono text-sm"
                  />
                </div>

                <div>
                  <Label className="text-xs text-slate-300 mb-1.5 block">Remark (Optional)</Label>
                  <Input
                    placeholder="e.g. Shift B doffing, roll check ok"
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    className="bg-slate-950 border-slate-700 text-white text-sm"
                  />
                </div>
              </div>

              {/* Roll / Piece Formation Editor */}
              <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      Roll / Piece Formation
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Physical fabric rolls from this receipt. The sum of rolls must reconcile with Receive Qty.
                    </p>
                  </div>

                  {/* Quick Split Utility */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Quick Split:</span>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={splitCount}
                      onChange={(e) => setSplitCount(parseInt(e.target.value) || 1)}
                      className="w-16 h-8 bg-slate-950 border-slate-700 text-white text-xs font-mono text-center"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleQuickSplit}
                      className="h-8 border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
                    >
                      <Divide className="w-3.5 h-3.5 mr-1" />
                      Split Rolls
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAddRoll}
                      className="h-8 bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                    >
                      <PlusCircle className="w-3.5 h-3.5 mr-1" />
                      Add Roll
                    </Button>
                  </div>
                </div>

                {/* Rolls Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-center">#</th>
                        <th className="py-2.5 px-3">Temp Roll No</th>
                        <th className="py-2.5 px-3 w-32">Meters *</th>
                        <th className="py-2.5 px-3 w-28">Gross Wt (KG)</th>
                        <th className="py-2.5 px-3 w-24">Width (in)</th>
                        <th className="py-2.5 px-3">Notes</th>
                        <th className="py-2.5 px-3 w-12 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {rolls.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-500 font-sans">
                            No rolls defined yet. Click "Add Roll" or "Split Rolls" to prepare piece distribution.
                          </td>
                        </tr>
                      ) : (
                        rolls.map((r, idx) => (
                          <tr key={r.id} className="hover:bg-slate-800/30">
                            <td className="py-2 px-3 text-center text-slate-500">{idx + 1}</td>
                            <td className="py-2 px-3">
                              <Badge variant="outline" className="border-slate-700 text-slate-300 bg-slate-950 text-[10px]">
                                DRAFT-ROLL-{String(summary.totalRollDraftCount + idx + 1).padStart(3, "0")}
                              </Badge>
                            </td>
                            <td className="py-2 px-3">
                              <Input
                                type="number"
                                step="0.001"
                                min="0.001"
                                value={r.qtyMetre || ""}
                                onChange={(e) => handleRollQtyChange(idx, e.target.value)}
                                className="h-8 bg-slate-950 border-slate-700 text-white font-mono text-xs"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="Opt."
                                value={r.grossWeightKg ?? ""}
                                onChange={(e) => handleRollFieldChange(idx, "grossWeightKg", e.target.value)}
                                className="h-8 bg-slate-950 border-slate-700 text-white font-mono text-xs"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <Input
                                type="number"
                                step="1"
                                min="10"
                                placeholder="Opt."
                                value={r.widthInch ?? ""}
                                onChange={(e) => handleRollFieldChange(idx, "widthInch", e.target.value)}
                                className="h-8 bg-slate-950 border-slate-700 text-white font-mono text-xs"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <Input
                                placeholder="e.g. Loom head piece"
                                value={r.remark ?? ""}
                                onChange={(e) => handleRollFieldChange(idx, "remark", e.target.value)}
                                className="h-8 bg-slate-950 border-slate-700 text-slate-200 font-sans text-xs"
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveRoll(idx)}
                                className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Roll Total Validation Footer */}
                <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-4">
                    <span className="text-slate-400">
                      Target Receive: <strong className="text-white font-mono">{receiveQty.toFixed(3)} MTR</strong>
                    </span>
                    <span className="text-slate-400">
                      Roll Total: <strong className="text-white font-mono">{rollTotal.toFixed(3)} MTR</strong>
                    </span>
                  </div>

                  <div>
                    {Math.abs(rollBalance) < 0.001 ? (
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        RECONCILED (0.000 BALANCE)
                      </Badge>
                    ) : rollBalance > 0 ? (
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40">
                        <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                        {rollBalance.toFixed(3)} MTR UNALLOCATED
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40">
                        <AlertOctagon className="w-3.5 h-3.5 mr-1" />
                        {Math.abs(rollBalance).toFixed(3)} MTR EXCESS
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveReceiveSimulation}
                  disabled={
                    receiveQty <= 0 ||
                    receiveQty > summary.receivableQtyMetre ||
                    rolls.length === 0 ||
                    Math.abs(rollBalance) > 0.001
                  }
                  className="bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  <PackageCheck className="w-4 h-4 mr-2" />
                  Save Receive Simulation
                </Button>
              </div>
            </div>
          )}

          {/* TAB 2: FABRIC STOCK PREVIEW */}
          {activeTab === "preview" && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Total Grey Rolls Drafted: <strong className="text-white">{summary.totalRollDraftCount}</strong></span>
                <span>Total Metres in Draft: <strong className="text-indigo-400 font-mono">{summary.totalReceivedQtyMetre.toFixed(3)} MTR</strong></span>
              </div>

              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-sans">
                    <tr>
                      <th className="py-2.5 px-3">Roll Draft No</th>
                      <th className="py-2.5 px-3">Receive Ref</th>
                      <th className="py-2.5 px-3">Qty (MTR)</th>
                      <th className="py-2.5 px-3">Width</th>
                      <th className="py-2.5 px-3">State</th>
                      <th className="py-2.5 px-3">Inspection Status</th>
                      <th className="py-2.5 px-3">Grade</th>
                      <th className="py-2.5 px-3">Disposition</th>
                      <th className="py-2.5 px-3">Saleable Preview</th>
                      <th className="py-2.5 px-3">Process Route</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {summary.allRollDrafts.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-8 text-center text-slate-500 font-sans">
                          No fabric roll drafts formed yet. Complete a receipt simulation to generate roll drafts.
                        </td>
                      </tr>
                    ) : (
                      summary.allRollDrafts.map((r) => {
                        const qSummary = ProductionPlanningService.getRollQualitySummary(r);
                        const rSummary = FabricProcessRoutingService.getRollRoutingSummary(r);

                        return (
                          <tr key={r.id} className="hover:bg-slate-800/30">
                            <td className="py-2 px-3 font-semibold text-indigo-300">{r.temporaryRollNo}</td>
                            <td className="py-2 px-3 text-slate-400">{r.receiveDraftId.slice(0, 14)}...</td>
                            <td className="py-2 px-3 text-white font-bold">{r.qtyMetre.toFixed(3)}</td>
                            <td className="py-2 px-3 text-slate-400">{r.widthInch ? `${r.widthInch}"` : "—"}</td>
                            <td className="py-2 px-3">
                              <Badge variant="outline" className="border-amber-500/30 text-amber-300 bg-amber-500/10 text-[10px]">
                                {r.stockStatus}
                              </Badge>
                            </td>
                            <td className="py-2 px-3">
                              <Badge
                                variant="outline"
                                className={
                                  qSummary.inspectionStatus === "INSPECTED"
                                    ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10 text-[10px]"
                                    : qSummary.inspectionStatus === "INSPECTION_IN_PROGRESS"
                                    ? "border-cyan-500/40 text-cyan-300 bg-cyan-500/10 text-[10px]"
                                    : "border-purple-500/30 text-purple-300 bg-purple-500/10 text-[10px]"
                                }
                              >
                                {qSummary.inspectionStatus}
                              </Badge>
                            </td>
                            <td className="py-2 px-3">
                              <Badge
                                variant="outline"
                                className={
                                  qSummary.proposedGrade === "UNASSIGNED"
                                    ? "border-slate-700 text-slate-400 text-[10px]"
                                    : "border-amber-500/40 text-amber-300 bg-amber-500/10 text-[10px]"
                                }
                              >
                                {qSummary.proposedGrade}
                              </Badge>
                            </td>
                            <td className="py-2 px-3">
                              <span className="text-[11px] text-slate-300 font-sans">
                                {qSummary.disposition === "NOT_SET" ? "—" : qSummary.disposition}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <Badge
                                variant="outline"
                                className={
                                  qSummary.saleabilityPreview === "ELIGIBLE"
                                    ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-[10px]"
                                    : qSummary.saleabilityPreview === "REVIEW_REQUIRED"
                                    ? "border-amber-500/40 text-amber-400 bg-amber-500/10 text-[10px]"
                                    : "border-rose-500/40 text-rose-400 bg-rose-500/10 text-[10px]"
                                }
                              >
                                {qSummary.saleabilityPreview}
                              </Badge>
                            </td>
                            <td className="py-2 px-3">
                              {rSummary.routeDecision === "NO_FURTHER_PROCESS" ? (
                                <Badge variant="outline" className="border-slate-700 text-slate-400 bg-slate-900 text-[10px]">
                                  No Process
                                </Badge>
                              ) : rSummary.routeStatus === "READY" ? (
                                <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-500/10 text-[10px]">
                                  Ready ({rSummary.totalSteps} steps)
                                </Badge>
                              ) : rSummary.routeStatus === "BLOCKED" ? (
                                <Badge variant="outline" className="border-rose-500/40 text-rose-300 bg-rose-500/10 text-[10px]">
                                  Blocked
                                </Badge>
                              ) : rSummary.routeStatus === "REVIEW_REQUIRED" ? (
                                <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-500/10 text-[10px]">
                                  Review
                                </Badge>
                              ) : rSummary.routeStatus === "PLANNED" ? (
                                <Badge variant="outline" className="border-blue-500/40 text-blue-300 bg-blue-500/10 text-[10px]">
                                  Planned ({rSummary.totalSteps})
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-slate-800 text-slate-500 text-[10px]">
                                  Not Planned
                                </Badge>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedRollForInspection(r);
                                    setIsInspectionDialogOpen(true);
                                  }}
                                  className="h-6 text-[11px] px-2 border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40"
                                >
                                  <ClipboardCheck className="w-3 h-3 mr-1" />
                                  {qSummary.inspectionStatus === "UNINSPECTED" ? "Inspect" : "QC"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedRollForRouting(r);
                                    setIsRoutingDialogOpen(true);
                                  }}
                                  className="h-6 text-[11px] px-2 border-slate-700 text-slate-300 hover:bg-slate-800"
                                >
                                  <Route className="w-3 h-3 mr-1 text-indigo-400" />
                                  {rSummary.routePlan ? "Route" : "Plan"}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <p className="text-[11px] text-slate-500 italic text-center">
                * Note: This is a frontend preview. No inventory stock has been posted to warehouse tables.
              </p>
            </div>
          )}

          {/* TAB 3: RECEIPT HISTORY */}
          {activeTab === "history" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Receive Ref</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Loom</th>
                      <th className="py-2.5 px-3 text-right">Qty (MTR)</th>
                      <th className="py-2.5 px-3 text-center">Rolls</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Remarks / Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500 font-sans">
                          No historical receipts recorded.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 text-slate-300 font-sans">{tx.receiveDate}</td>
                          <td className="py-2.5 px-3 font-semibold text-indigo-300">{tx.receiveRef}</td>
                          <td className="py-2.5 px-3">
                            <Badge
                              variant="outline"
                              className={
                                tx.transactionType === "RECEIPT"
                                  ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px]"
                                  : "border-amber-500/30 text-amber-400 bg-amber-500/10 text-[10px]"
                              }
                            >
                              {tx.transactionType}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">{tx.loomNo}</td>
                          <td
                            className={`py-2.5 px-3 text-right font-bold ${
                              tx.qtyMetre >= 0 ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {tx.qtyMetre > 0 ? `+${tx.qtyMetre.toFixed(3)}` : tx.qtyMetre.toFixed(3)}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-300">{tx.rollCount}</td>
                          <td className="py-2.5 px-3">
                            <Badge variant="outline" className="border-slate-700 text-slate-400 text-[10px]">
                              {tx.status}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 font-sans">
                            {tx.adjustmentReason || tx.remark || "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: RECEIPT ADJUSTMENT */}
          {activeTab === "adjust" && (
            <div className="space-y-4 max-w-xl mx-auto p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div>
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-amber-400" />
                  Receipt Adjustment Simulation (Step 29, 30)
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Saved receipts cannot be silently modified or overwritten. Record an additive (+) or subtractive (-)
                  adjustment transaction to correct the received position while maintaining an immutable audit trail.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <Label className="text-xs text-slate-300 mb-1.5 block">Adjustment Quantity (MTR)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="e.g. -20.000 or +15.500"
                    value={adjustmentQtyInput}
                    onChange={(e) => setAdjustmentQtyInput(e.target.value)}
                    className="bg-slate-950 border-slate-700 text-white font-mono text-sm"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Use negative value for shortage/deduction, positive for audit addition.
                  </p>
                </div>

                <div>
                  <Label className="text-xs text-slate-300 mb-1.5 block">Adjustment Reason *</Label>
                  <Input
                    placeholder="e.g. Tare weight correction, yardage counter discrepancy"
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    className="bg-slate-950 border-slate-700 text-white text-sm"
                  />
                </div>

                <div>
                  <Label className="text-xs text-slate-300 mb-1.5 block">Remark (Optional)</Label>
                  <Input
                    placeholder="Additional context or authorization note"
                    value={adjustmentRemark}
                    onChange={(e) => setAdjustmentRemark(e.target.value)}
                    className="bg-slate-950 border-slate-700 text-white text-sm"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab("history")}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveAdjustmentSimulation}
                    className="bg-amber-600 hover:bg-amber-500 text-white text-xs"
                  >
                    Save Adjustment Simulation
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="p-4 border-t border-slate-800 bg-slate-900/60 flex-shrink-0 flex items-center justify-between sm:justify-between">
          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>SCKT Phase 5A & 5B: Frontend Execution Simulation Only (Receive & Quality Inspection)</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Phase 5B Quality Inspection Dialog */}
    <FabricQualityInspectionDialog
      open={isInspectionDialogOpen}
      onOpenChange={setIsInspectionDialogOpen}
      roll={selectedRollForInspection}
      order={order}
      jobCard={draft}
    />

    {/* Phase 5C Process Route Dialog */}
    <FabricProcessRouteDialog
      open={isRoutingDialogOpen}
      onOpenChange={setIsRoutingDialogOpen}
      roll={selectedRollForRouting}
      order={order}
      jobCard={draft}
      onSaved={() => {
        onUpdated?.();
      }}
    />
    </>
  );
}

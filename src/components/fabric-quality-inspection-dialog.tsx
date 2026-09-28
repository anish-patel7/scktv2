import React, { useState, useEffect, useMemo } from "react";
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  History,
  TrendingUp,
  Package,
  PlusCircle,
  Trash2,
  AlertOctagon,
  RefreshCw,
  Clock,
  ShieldAlert,
  Info,
  Layers,
  Sparkles,
  HelpCircle,
  FileCheck2,
  Maximize2,
  Sliders,
  Award,
  Ban,
  ArrowRight,
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
  calculateInspectionCoverage,
  calculateUninspectedQty,
  countDefects,
  deriveInspectionStatus,
  deriveSaleabilityPreview,
  type FabricRollDraft,
  type FabricInspectionDraft,
  type FabricDefectLine,
  type FabricInspectionStatus,
  type FabricGrade,
  type FabricDisposition,
  type SaleabilityPreviewStatus,
  type FabricDefectType,
} from "@/services/production-planning.service";
import type { ProductionOrder } from "@/lib/production-store";
import type { JobCardDraft } from "@/services/production-planning.service";

interface FabricQualityInspectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roll: FabricRollDraft | null;
  order?: ProductionOrder | null;
  jobCard?: JobCardDraft | null;
  onSaved?: () => void;
}

const COMMON_DEFECT_TYPES: { value: FabricDefectType; label: string }[] = [
  { value: "broken_end", label: "Broken End (Warp Defect)" },
  { value: "missing_pick", label: "Missing Pick (Weft Defect)" },
  { value: "reed_mark", label: "Reed Mark" },
  { value: "oil_mark", label: "Oil Mark / Stain" },
  { value: "slub", label: "Slub / Thick Yarn" },
  { value: "hole", label: "Hole / Tear" },
  { value: "stain", label: "Chemical / Dirt Stain" },
  { value: "shade_variation", label: "Shade Variation" },
  { value: "width_variation", label: "Width Variation" },
  { value: "other", label: "Other (Remark Required)" },
];

export function FabricQualityInspectionDialog({
  open,
  onOpenChange,
  roll,
  order,
  jobCard,
  onSaved,
}: FabricQualityInspectionDialogProps) {
  const [activeTab, setActiveTab] = useState<"inspect" | "history">("inspect");

  // Form Fields
  const [inspectedQtyInput, setInspectedQtyInput] = useState<string>("");
  const [inspectionDate, setInspectionDate] = useState<string>(
    new Date().toISOString().split("T")[0]!
  );
  const [inspectorName, setInspectorName] = useState<string>("QA Inspector");
  const [inspectionMethod, setInspectionMethod] = useState<string>("Visual Table Inspection");
  const [measuredWidthInput, setMeasuredWidthInput] = useState<string>("");
  const [defectLines, setDefectLines] = useState<FabricDefectLine[]>([]);
  const [proposedGrade, setProposedGrade] = useState<FabricGrade>("UNASSIGNED");
  const [gradeReason, setGradeReason] = useState<string>("");
  const [disposition, setDisposition] = useState<FabricDisposition | "NOT_SET">("NOT_SET");
  const [dispositionReason, setDispositionReason] = useState<string>("");
  const [generalRemark, setGeneralRemark] = useState<string>("");

  // Revision / Reinspection state
  const [isRevisionMode, setIsRevisionMode] = useState<boolean>(false);
  const [revisionReason, setRevisionReason] = useState<string>("Reinspection / Quality Review");

  // Phase 5C Process Routing Dialog state
  const [isRouteDialogOpen, setIsRouteDialogOpen] = useState<boolean>(false);
  const existingRoutePlan = useMemo(() => {
    if (!roll) return undefined;
    return FabricProcessRoutingService.getRoutePlanForRoll(roll.id);
  }, [roll]);

  // Traceable Upstream Context Resolution (Roll Draft -> Job Card -> Production Order -> Sales Order)
  const resolvedOrder: ProductionOrder | null = useMemo(() => {
    if (order && order.id) return order;
    if (!roll?.productionOrderId) return null;
    const allOrders = ProductionPlanningService.getProductionOrders();
    return allOrders.find((o: ProductionOrder) => o.id === roll.productionOrderId) ?? null;
  }, [order, roll?.productionOrderId]);

  const resolvedJobCard: JobCardDraft | null = useMemo(() => {
    if (jobCard && jobCard.id) return jobCard;
    if (!roll) return null;
    const orderId = resolvedOrder?.id ?? roll.productionOrderId;
    const drafts = ProductionPlanningService.getJobCardDraftsForOrder(orderId);
    return drafts.find((jc: JobCardDraft) => jc.id === roll.jobCardId) ?? null;
  }, [jobCard, roll, resolvedOrder?.id]);

  // Load latest inspection or initialize
  const history = useMemo(() => {
    if (!roll) return [];
    return ProductionPlanningService.getRollInspectionHistory(roll.id);
  }, [roll, open]);

  const latestInspection = useMemo(() => {
    if (!roll) return null;
    return ProductionPlanningService.getLatestRollInspection(roll.id);
  }, [roll, open]);

  // Sync state on roll open
  useEffect(() => {
    if (roll && open) {
      const latest = ProductionPlanningService.getLatestRollInspection(roll.id);
      if (latest) {
        setInspectedQtyInput(latest.inspectedQtyMetre.toString());
        setInspectionDate(latest.inspectionDate);
        setInspectorName(latest.inspectorName ?? "QA Inspector");
        setInspectionMethod(latest.inspectionMethod ?? "Visual Table Inspection");
        setMeasuredWidthInput(latest.measuredWidthInch !== undefined ? latest.measuredWidthInch.toString() : "");
        setDefectLines(latest.defectLines || []);
        setProposedGrade(latest.proposedGrade ?? "UNASSIGNED");
        setGradeReason(latest.gradeReason ?? "");
        setDisposition(latest.disposition ?? "NOT_SET");
        setDispositionReason(latest.dispositionReason ?? "");
        setGeneralRemark(latest.remark ?? "");
        setIsRevisionMode(true);
      } else {
        // Initial defaults for uninspected roll
        setInspectedQtyInput(roll.qtyMetre.toString());
        setInspectionDate(new Date().toISOString().split("T")[0]!);
        setInspectorName("QA Inspector");
        setInspectionMethod("Visual Table Inspection");
        setMeasuredWidthInput(roll.widthInch !== undefined ? roll.widthInch.toString() : "");
        setDefectLines([]);
        setProposedGrade("UNASSIGNED");
        setGradeReason("");
        setDisposition("NOT_SET");
        setDispositionReason("");
        setGeneralRemark("");
        setIsRevisionMode(false);
      }
      setActiveTab("inspect");
    }
  }, [roll, open]);

  if (!roll) return null;

  const rollQty = roll.qtyMetre;
  const inspectedQty = parseFloat(inspectedQtyInput) || 0;
  const nominalWidth = roll.widthInch;
  const measuredWidth = measuredWidthInput ? parseFloat(measuredWidthInput) : undefined;
  const widthDiff = (measuredWidth !== undefined && nominalWidth !== undefined) ? measuredWidth - nominalWidth : undefined;

  // Realtime derivations
  const derivedStatus: FabricInspectionStatus = deriveInspectionStatus(inspectedQty, rollQty);
  const coveragePercent = calculateInspectionCoverage(inspectedQty, rollQty);
  const uninspectedRemaining = calculateUninspectedQty(inspectedQty, rollQty);
  const totalDefects = countDefects(defectLines);

  const saleabilityResult = deriveSaleabilityPreview({
    inspectionStatus: derivedStatus,
    grade: proposedGrade,
    disposition,
  });

  // Quick button: inspect all
  const handleSetFullRoll = () => {
    setInspectedQtyInput(rollQty.toString());
  };

  // Add Defect Line
  const handleAddDefectLine = () => {
    const newLine: FabricDefectLine = {
      id: `def-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      defectType: "broken_end",
      count: 1,
      severity: "MINOR",
      remark: "",
    };
    setDefectLines((prev) => [...prev, newLine]);
  };

  const handleUpdateDefectLine = (id: string, updates: Partial<FabricDefectLine>) => {
    setDefectLines((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
    );
  };

  const handleRemoveDefectLine = (id: string) => {
    setDefectLines((prev) => prev.filter((d) => d.id !== id));
  };

  // Save Inspection
  const handleSaveInspection = () => {
    // 1. Validation: Quantity
    if (inspectedQty <= 0) {
      toast.error("Inspected quantity must be greater than 0 MTR.");
      return;
    }
    if (inspectedQty > rollQty) {
      toast.error(
        `Inspected quantity (${inspectedQty.toFixed(3)} MTR) cannot exceed Roll quantity (${rollQty.toFixed(3)} MTR).`
      );
      return;
    }

    // 2. Validation: Defect Remarks for "Other"
    for (const d of defectLines) {
      if (d.defectType === "other" && (!d.remark || !d.remark.trim())) {
        toast.error("Remark is mandatory for defect type 'Other'.");
        return;
      }
    }

    if (!resolvedOrder) {
      toast.error("CONTEXT REQUIRED: Upstream Production Order cannot be resolved for this roll.");
      return;
    }

    // 3. Execution: Reinspection vs Initial
    if (latestInspection && isRevisionMode) {
      const res = ProductionPlanningService.createQualityRevisionSimulation({
        roll,
        order: resolvedOrder,
        jobCard: resolvedJobCard,
        revisedGrade: proposedGrade,
        revisionReason: revisionReason || "Quality Reinspection",
        revisedDisposition: disposition !== "NOT_SET" ? disposition : undefined,
        revisedDispositionReason: dispositionReason,
        inspectedQtyMetre: inspectedQty,
        defectLines,
        remark: generalRemark,
        inspectionDate,
        inspectorName,
        inspectionMethod,
        measuredWidthInch: measuredWidth,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to create quality revision.");
        return;
      }

      toast.success(
        `Quality Reinspection saved for Roll ${roll.temporaryRollNo} (Revision #${res.revisionCount ?? 1}).`
      );
    } else {
      const res = ProductionPlanningService.saveFabricInspectionSimulation({
        roll,
        order: resolvedOrder,
        jobCard: resolvedJobCard,
        inspectedQtyMetre: inspectedQty,
        inspectionDate,
        inspectorName,
        inspectionMethod,
        expectedWidthInch: nominalWidth,
        measuredWidthInch: measuredWidth,
        defectLines,
        manualGrade: proposedGrade,
        gradeReason,
        disposition: disposition !== "NOT_SET" ? disposition : undefined,
        dispositionReason,
        remark: generalRemark,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to save quality inspection.");
        return;
      }

      toast.success(`Quality Inspection saved for Roll ${roll.temporaryRollNo}.`);
    }

    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-0 bg-slate-950 text-slate-100 border-slate-800">
        {/* Header */}
        <DialogHeader className="p-5 pb-3 border-b border-slate-800 bg-slate-900/60">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-indigo-400" />
                <DialogTitle className="text-base font-bold text-white tracking-tight">
                  FABRIC QUALITY INSPECTION & DEFECT CAPTURE
                </DialogTitle>
                <Badge
                  variant="outline"
                  className="bg-indigo-500/10 text-indigo-300 border-indigo-500/30 text-[11px] font-mono"
                >
                  SIMULATION ONLY
                </Badge>
              </div>
              <DialogDescription className="text-xs text-slate-400 mt-1">
                Phase 5B: Inherits Roll & Production Context • Zero Stock Mutations • Separate Grade, Disposition & Saleability Preview
              </DialogDescription>
            </div>

            {/* Current Status Pills */}
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-xs px-2.5 py-0.5 font-bold ${
                  derivedStatus === "INSPECTED"
                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/40"
                    : derivedStatus === "INSPECTION_IN_PROGRESS"
                    ? "bg-amber-500/10 text-amber-300 border-amber-500/40"
                    : "bg-purple-500/10 text-purple-300 border-purple-500/40"
                }`}
              >
                {derivedStatus}
              </Badge>

              <Badge
                variant="outline"
                className={`text-xs px-2.5 py-0.5 font-bold ${
                  saleabilityResult.status === "ELIGIBLE"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                    : saleabilityResult.status === "REVIEW_REQUIRED"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                    : saleabilityResult.status === "NOT_ELIGIBLE"
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/50"
                    : "bg-slate-800 text-slate-400 border-slate-700"
                }`}
              >
                Saleability: {saleabilityResult.status}
              </Badge>
            </div>
          </div>

          {/* Inherited Traceability Context Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-[11px]">
            <div>
              <span className="text-slate-500 block">Roll Draft:</span>
              <strong className="text-indigo-300 font-mono">{roll.temporaryRollNo}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Roll Qty:</span>
              <strong className="text-white font-mono">{roll.qtyMetre.toFixed(3)} MTR</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Job Card:</span>
              <strong className="text-slate-300 font-mono">
                {resolvedJobCard?.draftCardNo ?? (roll.jobCardId ? roll.jobCardId : "CONTEXT REQUIRED")}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">Production Order:</span>
              <strong className="text-slate-300 font-mono">
                {resolvedOrder?.order_no ?? (roll.productionOrderId ? roll.productionOrderId : "CONTEXT REQUIRED")}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">Loom:</span>
              <strong className="text-amber-300 font-mono">
                {resolvedJobCard?.loomNo ?? "CONTEXT REQUIRED"}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">Design / Quality:</span>
              <strong className="text-slate-300 truncate block">
                {resolvedJobCard?.designNo ?? resolvedOrder?.design_no ?? resolvedJobCard?.quality ?? resolvedOrder?.quality ?? "CONTEXT REQUIRED"}
              </strong>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-slate-900/30 px-5 gap-2 pt-2">
          <Button
            size="sm"
            variant={activeTab === "inspect" ? "default" : "ghost"}
            className={activeTab === "inspect" ? "bg-indigo-600 hover:bg-indigo-500 text-white" : "text-slate-400"}
            onClick={() => setActiveTab("inspect")}
          >
            <ClipboardCheck className="w-3.5 h-3.5 mr-1.5" />
            Inspection & Defect Capture
          </Button>
          <Button
            size="sm"
            variant={activeTab === "history" ? "default" : "ghost"}
            className={activeTab === "history" ? "bg-indigo-600 hover:bg-indigo-500 text-white" : "text-slate-400"}
            onClick={() => setActiveTab("history")}
          >
            <History className="w-3.5 h-3.5 mr-1.5" />
            Inspection History ({history.length})
          </Button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === "inspect" && (
            <div className="space-y-5">
              {/* Critical Rule Banner */}
              <div className="p-3.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">QUALITY BUSINESS RULE:</strong> Textile grading formulas (defect scoring, Grade A/B/C/Reject thresholds, width tolerance) are <span className="text-amber-300 font-bold">NOT CONFIGURED</span> in current rules.
                  Automatic grading is disabled. Manual grade & disposition planning are captured as frontend simulation only without mutating fabric stock.
                </div>
              </div>

              {/* Missing Upstream Context Warning */}
              {!resolvedOrder && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <div>
                    <strong className="text-white">CONTEXT REQUIRED:</strong> Upstream Production Order lineage cannot be resolved for this roll. Quality inspection recording is blocked until context is provided.
                  </div>
                </div>
              )}

              {/* Revision / Reinspection Indicator */}
              {latestInspection && (
                <div className="p-3 rounded-lg bg-slate-900 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-amber-300">
                    <RefreshCw className="w-4 h-4 text-amber-400" />
                    <span>
                      Existing inspection found ({latestInspection.inspectionRef}, Grade: <strong>{latestInspection.proposedGrade ?? "UNASSIGNED"}</strong>, Status: <strong>{latestInspection.inspectionStatus}</strong>).
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Mode:</span>
                    <Badge variant="outline" className="border-amber-400 text-amber-300 font-mono text-[10px]">
                      {isRevisionMode ? "QUALITY REINSPECTION / REVISION" : "NEW ENTRY"}
                    </Badge>
                  </div>
                </div>
              )}

              {/* SECTION 1: INSPECTION QUANTITY & MEASUREMENTS */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                    1. Inspection Coverage & Width Measurement
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Coverage: <strong className="text-indigo-300 font-mono">{coveragePercent.toFixed(1)}%</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  {/* Inspected Qty */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs text-slate-300">Inspected Qty (MTR)*</Label>
                      <button
                        type="button"
                        onClick={handleSetFullRoll}
                        className="text-[11px] text-indigo-400 hover:underline flex items-center gap-0.5"
                      >
                        <Maximize2 className="w-3 h-3" />
                        Full ({rollQty.toFixed(1)}m)
                      </button>
                    </div>
                    <Input
                      type="number"
                      step="0.001"
                      min="0.001"
                      max={rollQty}
                      value={inspectedQtyInput}
                      onChange={(e) => setInspectedQtyInput(e.target.value)}
                      className="bg-slate-950 border-slate-700 text-white font-mono text-sm"
                      placeholder="0.000"
                    />
                    <div className="text-[11px] mt-1 text-slate-400">
                      {inspectedQty >= rollQty ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Full Roll Inspected
                        </span>
                      ) : inspectedQty > 0 ? (
                        <span className="text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Partial ({uninspectedRemaining.toFixed(3)}m uninspected)
                        </span>
                      ) : (
                        <span className="text-slate-500">Enter inspected length</span>
                      )}
                    </div>
                  </div>

                  {/* Inspection Date */}
                  <div>
                    <Label className="text-xs text-slate-300 mb-1 block">Inspection Date</Label>
                    <Input
                      type="date"
                      value={inspectionDate}
                      onChange={(e) => setInspectionDate(e.target.value)}
                      className="bg-slate-950 border-slate-700 text-white text-sm"
                    />
                  </div>

                  {/* Inspector Name */}
                  <div>
                    <Label className="text-xs text-slate-300 mb-1 block">Inspector Name</Label>
                    <Input
                      type="text"
                      value={inspectorName}
                      onChange={(e) => setInspectorName(e.target.value)}
                      className="bg-slate-950 border-slate-700 text-white text-sm"
                      placeholder="Inspector Name"
                    />
                  </div>

                  {/* Inspection Method */}
                  <div>
                    <Label className="text-xs text-slate-300 mb-1 block">Method</Label>
                    <select
                      value={inspectionMethod}
                      onChange={(e) => setInspectionMethod(e.target.value)}
                      className="w-full h-9 rounded-md border border-slate-700 bg-slate-950 px-3 text-xs text-white focus:outline-none"
                    >
                      <option value="Visual Table Inspection">Visual Table Inspection</option>
                      <option value="4-Point Rolling Frame">4-Point Rolling Frame</option>
                      <option value="Perch Inspection Machine">Perch Inspection Machine</option>
                      <option value="Manual Fold Check">Manual Fold Check</option>
                    </select>
                  </div>
                </div>

                {/* Width Capture Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-800/60 items-center">
                  <div>
                    <Label className="text-xs text-slate-300 mb-1 block">
                      Measured Width (Inch)
                    </Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={measuredWidthInput}
                      onChange={(e) => setMeasuredWidthInput(e.target.value)}
                      className="bg-slate-950 border-slate-700 text-white font-mono text-sm"
                      placeholder="e.g. Width (Inch)"
                    />
                  </div>

                  <div className="text-xs">
                    <span className="text-slate-400 block">Nominal vs Measured:</span>
                    <span className="font-mono text-white">
                      Expected: <strong>{nominalWidth !== undefined ? `${nominalWidth}"` : "NOT CONFIGURED"}</strong> • Measured:{" "}
                      <strong>{measuredWidth !== undefined ? `${measuredWidth}"` : "—"}</strong>
                    </span>
                    {measuredWidth !== undefined && widthDiff !== undefined && (
                      <span className={`block font-mono text-[11px] ${widthDiff === 0 ? "text-emerald-400" : "text-amber-400"}`}>
                        Diff: {widthDiff > 0 ? `+${widthDiff}"` : `${widthDiff}"`}
                      </span>
                    )}
                  </div>

                  <div>
                    {nominalWidth === undefined ? (
                      <div className="p-2 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                        Nominal width not configured. No width tolerance applied.
                      </div>
                    ) : measuredWidth !== undefined && widthDiff !== undefined && widthDiff !== 0 ? (
                      <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <div>
                          <strong>WIDTH REVIEW REQUIRED</strong>
                          <div className="text-[10px] text-slate-400">Width tolerance not configured. No auto rejection.</div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                        {measuredWidth !== undefined ? "Width matches nominal." : "Width not recorded."}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 2: DEFECT CAPTURE */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                      2. Fabric Defect Capture
                    </h4>
                    <Badge variant="outline" className="border-slate-700 text-slate-300 text-[11px]">
                      {totalDefects} defect{totalDefects !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddDefectLine}
                    className="border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40 text-xs h-7"
                  >
                    <PlusCircle className="w-3.5 h-3.5 mr-1" />
                    Add Defect Line
                  </Button>
                </div>

                {defectLines.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                    No defects recorded for this roll. Click "Add Defect Line" to capture visual or structural flaws.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {defectLines.map((defect, index) => (
                      <div
                        key={defect.id}
                        className="p-3 rounded-lg bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center text-xs"
                      >
                        <div className="sm:col-span-3">
                          <label className="text-[10px] text-slate-500 block mb-0.5">Defect Type #{index + 1}</label>
                          <select
                            value={defect.defectType}
                            onChange={(e) =>
                              handleUpdateDefectLine(defect.id, {
                                defectType: e.target.value as FabricDefectType,
                              })
                            }
                            className="w-full h-8 rounded border border-slate-700 bg-slate-900 px-2 text-xs text-white"
                          >
                            {COMMON_DEFECT_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[10px] text-slate-500 block mb-0.5">Position (MTR)</label>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="e.g. 45.5"
                            value={defect.positionMetre ?? ""}
                            onChange={(e) =>
                              handleUpdateDefectLine(defect.id, {
                                positionMetre: e.target.value ? parseFloat(e.target.value) : undefined,
                              })
                            }
                            className="h-8 bg-slate-900 border-slate-700 text-white font-mono text-xs"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[10px] text-slate-500 block mb-0.5">Length (MTR)</label>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="e.g. 0.5"
                            value={defect.lengthMetre ?? ""}
                            onChange={(e) =>
                              handleUpdateDefectLine(defect.id, {
                                lengthMetre: e.target.value ? parseFloat(e.target.value) : undefined,
                              })
                            }
                            className="h-8 bg-slate-900 border-slate-700 text-white font-mono text-xs"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[10px] text-slate-500 block mb-0.5">Severity</label>
                          <select
                            value={defect.severity ?? "MINOR"}
                            onChange={(e) =>
                              handleUpdateDefectLine(defect.id, {
                                severity: e.target.value as "MINOR" | "MAJOR" | "CRITICAL",
                              })
                            }
                            className="w-full h-8 rounded border border-slate-700 bg-slate-900 px-2 text-xs text-white"
                          >
                            <option value="MINOR">Minor</option>
                            <option value="MAJOR">Major</option>
                            <option value="CRITICAL">Critical</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[10px] text-slate-500 block mb-0.5">
                            Remark {defect.defectType === "other" && <span className="text-rose-400">*</span>}
                          </label>
                          <Input
                            type="text"
                            placeholder={defect.defectType === "other" ? "Required for 'Other'" : "Optional note"}
                            value={defect.remark ?? ""}
                            onChange={(e) =>
                              handleUpdateDefectLine(defect.id, {
                                remark: e.target.value,
                              })
                            }
                            className={`h-8 bg-slate-900 border-slate-700 text-white text-xs ${
                              defect.defectType === "other" && !defect.remark ? "border-rose-500" : ""
                            }`}
                          />
                        </div>

                        <div className="sm:col-span-1 flex justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemoveDefectLine(defect.id)}
                            className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 3: GRADE & DISPOSITION PLANNING */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-emerald-400" />
                    3. Grade & Disposition Planning
                  </h4>
                  <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-300">
                    AUTOMATIC GRADING: NOT CONFIGURED
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Proposed Grade */}
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-slate-300 font-semibold">Proposed Grade</Label>
                      <span className="text-[10px] text-amber-400 font-mono">
                        Source: {proposedGrade !== "UNASSIGNED" ? "MANUAL" : "UNASSIGNED"}
                      </span>
                    </div>

                    <select
                      value={proposedGrade}
                      onChange={(e) => setProposedGrade(e.target.value as FabricGrade)}
                      className="w-full h-9 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-white font-bold"
                    >
                      <option value="UNASSIGNED">UNASSIGNED (Default)</option>
                      <option value="A">Grade A (Manual)</option>
                      <option value="B">Grade B (Manual)</option>
                      <option value="C">Grade C (Manual)</option>
                      <option value="REJECT">REJECT (Manual)</option>
                    </select>

                    <div>
                      <Label className="text-[11px] text-slate-400 mb-1 block">Grade Reason</Label>
                      <Input
                        type="text"
                        placeholder="Reason for manual grade assignment..."
                        value={gradeReason}
                        onChange={(e) => setGradeReason(e.target.value)}
                        className="bg-slate-900 border-slate-700 text-white text-xs h-8"
                      />
                    </div>
                  </div>

                  {/* Disposition */}
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-slate-300 font-semibold">Quality Disposition</Label>
                      <span className="text-[10px] text-slate-400">Separate from Grade</span>
                    </div>

                    <select
                      value={disposition}
                      onChange={(e) => setDisposition(e.target.value as FabricDisposition | "NOT_SET")}
                      className="w-full h-9 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-white font-bold"
                    >
                      <option value="NOT_SET">NOT SET (Pending Review)</option>
                      <option value="ACCEPTED">ACCEPTED</option>
                      <option value="HOLD">HOLD (Block Release)</option>
                      <option value="REWORK">REWORK (Process Pending)</option>
                      <option value="REJECT">REJECT (Block Saleable)</option>
                      <option value="PROCESS_REQUIRED">PROCESS_REQUIRED (Route Decision)</option>
                    </select>

                    <div>
                      <Label className="text-[11px] text-slate-400 mb-1 block">Disposition Reason</Label>
                      <Input
                        type="text"
                        placeholder="Reason for disposition decision..."
                        value={dispositionReason}
                        onChange={(e) => setDispositionReason(e.target.value)}
                        className="bg-slate-900 border-slate-700 text-white text-xs h-8"
                      />
                    </div>
                  </div>
                </div>

                {/* Conditional Callouts based on Disposition & Grade */}
                {disposition === "PROCESS_REQUIRED" && (
                  <div className="p-2.5 rounded bg-blue-500/10 border border-blue-500/30 text-xs text-blue-300 flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <div>
                      <strong>PROCESS ROUTING REQUIRED:</strong> Downstream process (e.g. Butta Cutting, Mill Issue, Washing, Finishing) is not auto-routed without verified order instructions.
                    </div>
                  </div>
                )}

                {disposition === "REWORK" && (
                  <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <div>
                      <strong>REWORK DISPOSITION:</strong> Fabric roll is not saleable. Process routing remains pending commercial review.
                    </div>
                  </div>
                )}

                {/* SECTION 4: SALEABILITY PREVIEW */}
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-indigo-400" />
                      Saleability Preview
                    </span>
                    <Badge
                      className={`text-xs px-2.5 py-0.5 font-bold ${
                        saleabilityResult.status === "ELIGIBLE"
                          ? "bg-emerald-600 text-white"
                          : saleabilityResult.status === "REVIEW_REQUIRED"
                          ? "bg-amber-500 text-black font-semibold"
                          : saleabilityResult.status === "NOT_ELIGIBLE"
                          ? "bg-rose-600 text-white"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {saleabilityResult.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 italic">
                    Reason: {saleabilityResult.reason}
                  </p>
                </div>

                {/* Reinspection Reason input if in revision mode */}
                {latestInspection && isRevisionMode && (
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <Label className="text-xs text-slate-300 mb-1 block">Reinspection / Revision Reason</Label>
                    <Input
                      type="text"
                      value={revisionReason}
                      onChange={(e) => setRevisionReason(e.target.value)}
                      placeholder="e.g. Reinspection after mending, customer spec change..."
                      className="bg-slate-900 border-slate-700 text-white text-xs"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: INSPECTION HISTORY */}
          {activeTab === "history" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Ref</th>
                      <th className="py-2.5 px-3">Inspector</th>
                      <th className="py-2.5 px-3 text-right">Inspected Qty</th>
                      <th className="py-2.5 px-3 text-center">Defects</th>
                      <th className="py-2.5 px-3">Grade</th>
                      <th className="py-2.5 px-3">Disposition</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500 font-sans">
                          No prior inspections recorded for this roll.
                        </td>
                      </tr>
                    ) : (
                      history.map((h, i) => (
                        <tr key={h.id} className="hover:bg-slate-800/30">
                          <td className="py-2 px-3 text-slate-300">{h.inspectionDate}</td>
                          <td className="py-2 px-3 font-semibold text-indigo-300">{h.inspectionRef}</td>
                          <td className="py-2 px-3 text-slate-400 font-sans">{h.inspectorName ?? "—"}</td>
                          <td className="py-2 px-3 text-right text-white font-bold">
                            {h.inspectedQtyMetre.toFixed(3)} MTR
                          </td>
                          <td className="py-2 px-3 text-center text-amber-300 font-bold">
                            {h.defectLines.length}
                          </td>
                          <td className="py-2 px-3">
                            <Badge variant="outline" className="border-slate-700 text-slate-200 text-[10px]">
                              {h.proposedGrade ?? "UNASSIGNED"}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-slate-300">{h.disposition ?? "NOT SET"}</td>
                          <td className="py-2 px-3">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                h.inspectionStatus === "INSPECTED"
                                  ? "border-emerald-500/30 text-emerald-300"
                                  : "border-amber-500/30 text-amber-300"
                              }`}
                            >
                              {h.inspectionStatus}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between sm:justify-between">
          <p className="text-[11px] text-slate-500 italic">
            * Frontend simulation only. No real fabric stock release or database mutation.
          </p>

          <div className="flex items-center gap-2">
            {/* Phase 5C Process Routing Integration (Step 40) */}
            {existingRoutePlan ? (
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setIsRouteDialogOpen(true)}
                className="border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40"
              >
                <Route className="w-3.5 h-3.5 mr-1.5" />
                Review Route Plan
              </Button>
            ) : disposition === "PROCESS_REQUIRED" ? (
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setIsRouteDialogOpen(true)}
                className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/40"
              >
                <Route className="w-3.5 h-3.5 mr-1.5" />
                Plan Process Route
              </Button>
            ) : disposition === "REWORK" ? (
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setIsRouteDialogOpen(true)}
                className="border-amber-500/40 text-amber-300 hover:bg-amber-950/40"
              >
                <Route className="w-3.5 h-3.5 mr-1.5" />
                Plan Quality Rework
              </Button>
            ) : disposition === "HOLD" ? (
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setIsRouteDialogOpen(true)}
                className="border-rose-500/40 text-rose-300 hover:bg-rose-950/40"
              >
                <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />
                Why Blocked
              </Button>
            ) : null}

            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveInspection}
              disabled={inspectedQty <= 0 || inspectedQty > rollQty || !resolvedOrder}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
            >
              <ClipboardCheck className="w-4 h-4 mr-1.5" />
              {latestInspection && isRevisionMode ? "Save Reinspection / Revision" : "Save Inspection Simulation"}
            </Button>
          </div>
        </DialogFooter>

        {/* Phase 5C Process Route Dialog Modal */}
        {roll && (
          <FabricProcessRouteDialog
            open={isRouteDialogOpen}
            onOpenChange={setIsRouteDialogOpen}
            roll={roll}
            order={resolvedOrder}
            jobCard={resolvedJobCard}
            onSaved={() => {
              onSaved?.();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

import React, { useState } from "react";
import {
  Gauge,
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
  AlertOctagon,
  RefreshCw,
  Clock,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ProductionPlanningService,
  sumQty,
  type JobCardDraft,
  type DailyProductionSimulationEntry,
  type DailyProductionCorrectionReason,
  type MaterialOperationalPosition,
  type JobCardProductionProgress,
} from "@/services/production-planning.service";
import type { ProductionOrder } from "@/lib/production-store";

interface DailyProductionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: JobCardDraft | null;
  order: ProductionOrder | null;
  onUpdated?: () => void;
  onOpenIssuePrep?: () => void;
}

const DOWNTIME_REASONS = [
  "Warp breakage",
  "Weft change",
  "Beam change",
  "Power failure",
  "Mechanical fault",
  "Design change",
  "No operator",
  "Other",
];

const CORRECTION_REASONS: DailyProductionCorrectionReason[] = [
  "Entry Error",
  "Meter Reading Correction",
  "Shift Adjustment",
  "Rejected Production Adjustment",
  "Duplicate Entry Correction",
  "Other",
];

export const DailyProductionDialog: React.FC<DailyProductionDialogProps> = ({
  open,
  onOpenChange,
  draft,
  order,
  onUpdated,
  onOpenIssuePrep,
}) => {
  if (!draft || !order) return null;

  // View Mode: NEW_ENTRY vs CORRECTION
  const [mode, setMode] = useState<"NEW_ENTRY" | "CORRECTION">("NEW_ENTRY");

  // Production Entry Form
  const [productionDate, setProductionDate] = useState<string>(
    new Date().toISOString().split("T")[0] || ""
  );
  const [shift, setShift] = useState<"A" | "B" | "C">("A");
  const [qtyMetre, setQtyMetre] = useState<string>("");
  const [downtimeMinutes, setDowntimeMinutes] = useState<string>("");
  const [downtimeReason, setDowntimeReason] = useState<string>("");
  const [remark, setRemark] = useState<string>("");

  // Correction Form
  const [selectedEntryId, setSelectedEntryId] = useState<string>("");
  const [correctionQtyMetre, setCorrectionQtyMetre] = useState<string>("");
  const [correctionReason, setCorrectionReason] =
    useState<DailyProductionCorrectionReason>("Meter Reading Correction");
  const [correctionRemark, setCorrectionRemark] = useState<string>("");

  // Reload trigger
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Derive Progress and Material Positions
  const progress: JobCardProductionProgress =
    ProductionPlanningService.getJobCardProductionProgress(draft, order);
  const completionPreview =
    progress.productionStatus === "TARGET_REACHED"
      ? ProductionPlanningService.getJobCardCompletionPreview(draft, order)
      : null;

  const handleSaveProduction = () => {
    const valQty = parseFloat(qtyMetre);
    if (isNaN(valQty) || valQty <= 0) {
      toast.error("Please enter a valid production quantity (> 0 metres).");
      return;
    }

    const res = ProductionPlanningService.createDailyProductionSimulation({
      draft,
      order,
      qtyMetre: valQty,
      productionDate,
      shift,
      downtimeMinutes: downtimeMinutes ? parseInt(downtimeMinutes, 10) : undefined,
      downtimeReason: downtimeReason || undefined,
      remark: remark.trim() || undefined,
    });

    if (!res.success) {
      toast.error(res.error || "Failed to record production entry.");
      return;
    }

    toast.success(`Recorded ${valQty.toFixed(3)} MTR production successfully.`);
    setQtyMetre("");
    setDowntimeMinutes("");
    setDowntimeReason("");
    setRemark("");
    setRefreshKey((k) => k + 1);
    if (onUpdated) onUpdated();
  };

  const handleSaveCorrection = () => {
    const valQty = parseFloat(correctionQtyMetre);
    if (isNaN(valQty) || valQty === 0) {
      toast.error("Please enter a non-zero correction quantity (+ or - metres).");
      return;
    }

    if (!selectedEntryId) {
      toast.error("Please select an original production entry to correct.");
      return;
    }

    const res = ProductionPlanningService.createDailyProductionCorrection({
      draft,
      order,
      originalEntryId: selectedEntryId,
      correctionQtyMetre: valQty,
      reason: correctionReason,
      remark: correctionRemark.trim() || undefined,
    });

    if (!res.success) {
      toast.error(res.error || "Failed to record correction.");
      return;
    }

    toast.success(
      `Recorded correction of ${valQty > 0 ? "+" : ""}${valQty.toFixed(3)} MTR.`
    );
    setCorrectionQtyMetre("");
    setCorrectionRemark("");
    setSelectedEntryId("");
    setMode("NEW_ENTRY");
    setRefreshKey((k) => k + 1);
    if (onUpdated) onUpdated();
  };

  const getStatusBadge = (status: JobCardProductionProgress["productionStatus"]) => {
    switch (status) {
      case "TARGET_REACHED":
        return (
          <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
            TARGET REACHED
          </Badge>
        );
      case "IN_PROGRESS":
        return (
          <Badge className="bg-blue-600/15 text-blue-700 dark:text-blue-400 border-blue-500/30">
            IN PROGRESS
          </Badge>
        );
      case "REVIEW_REQUIRED":
        return (
          <Badge className="bg-amber-600/15 text-amber-700 dark:text-amber-400 border-amber-500/30">
            REVIEW REQUIRED
          </Badge>
        );
      default:
        return (
          <Badge className="bg-muted text-muted-foreground border-border">
            NOT STARTED
          </Badge>
        );
    }
  };

  const getMaterialStatusBadge = (status: MaterialOperationalPosition["status"]) => {
    switch (status) {
      case "SUFFICIENT":
        return (
          <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
            SUFFICIENT
          </Badge>
        );
      case "UNSETTLED_MATERIAL":
        return (
          <Badge className="bg-purple-600/15 text-purple-700 dark:text-purple-400 border-purple-500/30">
            UNSETTLED MATERIAL
          </Badge>
        );
      case "ISSUE_SHORTFALL":
        return (
          <Badge className="bg-rose-600/15 text-rose-700 dark:text-rose-400 border-rose-500/30">
            ISSUE SHORTFALL
          </Badge>
        );
      case "CALCULATION_PENDING":
        return (
          <Badge className="bg-amber-600/15 text-amber-700 dark:text-amber-400 border-amber-500/30">
            CALCULATION PENDING
          </Badge>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="border-b pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Gauge className="size-5 text-primary" />
                Daily Production & Material Operational Position
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Record shift production and corrections against Job Card. Computes standard expected
                consumption and tracks unsettled yarn beside the loom without backend mutation.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                {draft.draftCardNo}
              </Badge>
              {getStatusBadge(progress.productionStatus)}
            </div>
          </div>

          {/* Context Header */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-2 border-t text-xs">
            <div>
              <span className="text-muted-foreground block text-[10px]">PRODUCTION ORDER</span>
              <span className="font-semibold font-mono">{order.order_no}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px]">PARTY / ITEM</span>
              <span className="font-medium truncate block">
                {order.party_name} · {order.quality || order.design_no}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px]">LOOM / BEAM</span>
              <span className="font-semibold font-mono text-primary">
                {draft.loomNo} · {draft.beamNo || "No Beam"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px]">PLANNED JC QTY</span>
              <span className="font-bold font-mono">
                {draft.plannedQtyMetre.toLocaleString()} MTR
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* TARGET REACHED BANNER & COMPLETION PREVIEW (Steps 40, 41, 42, 43) */}
        {progress.productionStatus === "TARGET_REACHED" && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-950/20 p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    TARGET REACHED — All {draft.plannedQtyMetre.toLocaleString()} Metres Woven
                  </h4>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    Job Card target is 100% fulfilled. Job Card remains active (no automatic closure
                    or fabric stock creation in this phase).
                  </p>
                </div>
              </div>
              <Badge className="bg-amber-600/20 text-amber-800 dark:text-amber-300 border-amber-500/40 text-[10px]">
                Material Settlement: PENDING
              </Badge>
            </div>

            {completionPreview && (
              <div className="rounded border bg-background/80 p-2.5 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span className="text-muted-foreground block text-[10px]">TOTAL PRODUCED</span>
                  <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {completionPreview.producedToDateMetre.toLocaleString()} MTR
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">EXPECTED YARN</span>
                  <span className="font-semibold font-mono">
                    {sumQty(completionPreview.materialPositions.map((p) => p.expectedToDateKg)).toFixed(3)} KG
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">NET ISSUED</span>
                  <span className="font-semibold font-mono">
                    {sumQty(completionPreview.materialPositions.map((p) => p.netIssuedKg)).toFixed(3)} KG
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">UNSETTLED YARN</span>
                  <span className="font-bold font-mono text-purple-600 dark:text-purple-400">
                    {sumQty(completionPreview.materialPositions.map((p) => p.unsettledKg)).toFixed(3)} KG
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-4 text-[10px] text-muted-foreground italic border-t pt-1 mt-1">
                  Note: True actual consumption and variance will be computed during final Job Card
                  reconciliation after closing yarn returns and operator settlement.
                </div>
              </div>
            )}
          </div>
        )}

        {/* REVIEW REQUIRED BANNER (Step 28, 58) */}
        {progress.productionStatus === "REVIEW_REQUIRED" && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/20 p-2.5 flex items-start gap-2 text-xs">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-900 dark:text-amber-200">
                REVIEW REQUIRED: Actual Production Exceeds Revised Target
              </span>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                Produced quantity ({progress.producedToDateMetre.toLocaleString()} MTR) exceeds
                revised Job Card target ({draft.plannedQtyMetre.toLocaleString()} MTR) by{" "}
                {(progress.producedToDateMetre - draft.plannedQtyMetre).toFixed(3)} MTR. Historical
                production is preserved.
              </p>
            </div>
          </div>
        )}

        {/* PROGRESS KPI CARDS (Step 12) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          <div className="rounded-lg border bg-card p-2.5 shadow-sm">
            <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
              Planned Qty
            </span>
            <span className="text-base font-bold font-mono">
              {progress.plannedQtyMetre.toLocaleString()}
            </span>
            <span className="text-[10px] text-muted-foreground ml-1">MTR</span>
          </div>

          <div className="rounded-lg border bg-card p-2.5 shadow-sm">
            <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
              Produced Today
            </span>
            <span className="text-base font-bold font-mono text-blue-600 dark:text-blue-400">
              {progress.producedTodayMetre.toLocaleString()}
            </span>
            <span className="text-[10px] text-muted-foreground ml-1">MTR</span>
          </div>

          <div className="rounded-lg border bg-card p-2.5 shadow-sm">
            <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
              Produced To Date
            </span>
            <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {progress.producedToDateMetre.toLocaleString()}
            </span>
            <span className="text-[10px] text-muted-foreground ml-1">MTR</span>
          </div>

          <div className="rounded-lg border bg-card p-2.5 shadow-sm">
            <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
              Remaining Qty
            </span>
            <span className="text-base font-bold font-mono text-amber-600 dark:text-amber-400">
              {progress.remainingQtyMetre.toLocaleString()}
            </span>
            <span className="text-[10px] text-muted-foreground ml-1">MTR</span>
          </div>

          <div className="rounded-lg border bg-card p-2.5 shadow-sm col-span-2 sm:col-span-1">
            <div className="flex justify-between items-center text-[10px] uppercase font-semibold text-muted-foreground mb-1">
              <span>Progress</span>
              <span className="font-bold text-foreground">{progress.progressPercent}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  progress.progressPercent >= 100
                    ? "bg-emerald-500"
                    : progress.progressPercent > 0
                    ? "bg-primary"
                    : "bg-muted"
                }`}
                style={{ width: `${Math.min(progress.progressPercent, 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground block mt-1">
              {progress.entries.length} entries / corrections
            </span>
          </div>
        </div>

        {/* MATERIAL OPERATIONAL POSITION PANEL (Steps 17-26) */}
        <div className="rounded-lg border bg-card shadow-sm p-3 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Package className="size-4 text-purple-600 dark:text-purple-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider">
                Material Operational Position (Weft)
              </h3>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <ShieldAlert className="size-3.5 text-purple-500" />
              <span>Unsettled material is NOT wastage; it physically remains at the loom.</span>
            </div>
          </div>

          <div className="rounded border overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b text-[10px] uppercase font-semibold text-muted-foreground">
                <tr>
                  <th className="py-1.5 px-2.5">Weft Material</th>
                  <th className="py-1.5 px-2 text-right">Cons / MTR</th>
                  <th className="py-1.5 px-2 text-right">Expected To Date</th>
                  <th className="py-1.5 px-2 text-right">Net Issued</th>
                  <th className="py-1.5 px-2 text-right">Unsettled Material</th>
                  <th className="py-1.5 px-2 text-right">Issue Shortfall</th>
                  <th className="py-1.5 px-2 text-center">Status</th>
                  <th className="py-1.5 px-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {progress.materialPositions.map((pos) => (
                  <tr key={pos.materialCode} className="hover:bg-muted/30">
                    <td className="py-2 px-2.5">
                      <div className="font-semibold font-mono">{pos.materialCode}</div>
                      <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                        {pos.materialName}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-right font-mono">
                      {pos.consumptionPerMetre !== null
                        ? `${pos.consumptionPerMetre.toFixed(4)}`
                        : "Pending"}
                    </td>
                    <td className="py-2 px-2 text-right font-mono font-semibold text-foreground">
                      {pos.expectedToDateKg.toFixed(3)} KG
                    </td>
                    <td className="py-2 px-2 text-right font-mono">
                      {pos.netIssuedKg.toFixed(3)} KG
                    </td>
                    <td className="py-2 px-2 text-right font-mono font-bold text-purple-600 dark:text-purple-400">
                      {pos.unsettledKg > 0 ? `${pos.unsettledKg.toFixed(3)} KG` : "0.000"}
                    </td>
                    <td className="py-2 px-2 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                      {pos.shortfallKg > 0 ? `${pos.shortfallKg.toFixed(3)} KG` : "0.000"}
                    </td>
                    <td className="py-2 px-2 text-center">{getMaterialStatusBadge(pos.status)}</td>
                    <td className="py-2 px-2.5 text-right">
                      {pos.shortfallKg > 0 ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-6 text-[11px] px-2 gap-1"
                          onClick={() => {
                            if (onOpenIssuePrep) onOpenIssuePrep();
                            else {
                              toast.info(
                                `Material shortfall of ${pos.shortfallKg.toFixed(
                                  3
                                )} KG. Open Material Issue Ledger to issue additional yarn.`
                              );
                            }
                          }}
                        >
                          <PlusCircle className="size-3" />
                          Prepare Additional Issue
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">
                          {pos.unsettledKg > 0 ? "Beside Loom" : "In Balance"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {!progress.materialPositions.length && (
                  <tr>
                    <td colSpan={8} className="py-4 text-center text-muted-foreground text-xs">
                      No weft requirements found for this Job Card.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* TABS: RECORD ENTRY VS RECORD CORRECTION */}
        <div className="rounded-lg border bg-card p-3 space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={mode === "NEW_ENTRY" ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() => setMode("NEW_ENTRY")}
              >
                Record Daily Production
              </Button>
              <Button
                size="sm"
                variant={mode === "CORRECTION" ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() => setMode("CORRECTION")}
              >
                Record Correction (+ / -)
              </Button>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {mode === "NEW_ENTRY"
                ? "Saved records are immutable. Use Correction to adjust past entries."
                : "Creates an additive/subtractive transaction linked to original record."}
            </span>
          </div>

          {mode === "NEW_ENTRY" ? (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="space-y-1">
                <Label className="text-[11px]">Production Date</Label>
                <Input
                  type="date"
                  className="h-8 text-xs font-mono"
                  value={productionDate}
                  onChange={(e) => setProductionDate(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px]">Shift</Label>
                <Select value={shift} onValueChange={(v) => setShift(v as "A" | "B" | "C")}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Shift A</SelectItem>
                    <SelectItem value="B">Shift B</SelectItem>
                    <SelectItem value="C">Shift C</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label className="text-[11px] font-semibold">Produced Metres *</Label>
                  <span className="text-[10px] text-muted-foreground">
                    Max: {progress.remainingQtyMetre.toLocaleString()} MTR
                  </span>
                </div>
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  max={progress.remainingQtyMetre}
                  className="h-8 text-xs font-mono"
                  placeholder="e.g. 300"
                  value={qtyMetre}
                  onChange={(e) => setQtyMetre(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px]">Downtime (min)</Label>
                <Input
                  type="number"
                  min="0"
                  className="h-8 text-xs font-mono"
                  placeholder="e.g. 30"
                  value={downtimeMinutes}
                  onChange={(e) => setDowntimeMinutes(e.target.value)}
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[11px]">Downtime Reason (if applicable)</Label>
                <Select value={downtimeReason} onValueChange={setDowntimeReason}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DOWNTIME_REASONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[11px]">Remark</Label>
                <Input
                  className="h-8 text-xs"
                  placeholder="Optional operator notes..."
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                />
              </div>

              <div className="sm:col-span-4 flex justify-end gap-2 pt-1 border-t">
                <Button size="sm" className="h-8 text-xs" onClick={handleSaveProduction}>
                  Save Production Entry
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[11px] font-semibold">Select Original Entry to Correct *</Label>
                <Select value={selectedEntryId} onValueChange={setSelectedEntryId}>
                  <SelectTrigger className="h-8 text-xs font-mono">
                    <SelectValue placeholder="Select original entry..." />
                  </SelectTrigger>
                  <SelectContent>
                    {progress.entries
                      .filter((e) => e.transactionType === "PRODUCTION")
                      .map((e) => (
                        <SelectItem key={e.id} value={e.id} className="text-xs">
                          {e.productionDate} · Shift {e.shift || "-"} · {e.qtyMetre.toFixed(3)} MTR
                          {e.remark ? ` (${e.remark})` : ""}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Correction Metres (+ / -) *</Label>
                <Input
                  type="number"
                  step="0.001"
                  className="h-8 text-xs font-mono"
                  placeholder="e.g. -20 or +20"
                  value={correctionQtyMetre}
                  onChange={(e) => setCorrectionQtyMetre(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px]">Correction Reason *</Label>
                <Select
                  value={correctionReason}
                  onValueChange={(v) => setCorrectionReason(v as DailyProductionCorrectionReason)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CORRECTION_REASONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 sm:col-span-4">
                <Label className="text-[11px]">
                  Remark {correctionReason === "Other" && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  className="h-8 text-xs"
                  placeholder={
                    correctionReason === "Other"
                      ? "Mandatory explanation for 'Other'..."
                      : "Optional explanation..."
                  }
                  value={correctionRemark}
                  onChange={(e) => setCorrectionRemark(e.target.value)}
                />
              </div>

              <div className="sm:col-span-4 flex justify-end gap-2 pt-1 border-t">
                <Button size="sm" className="h-8 text-xs" onClick={handleSaveCorrection}>
                  Record Correction
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* PRODUCTION & CORRECTION HISTORY TABLE (Steps 8, 9, 10, 34) */}
        <div className="rounded-lg border bg-card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <History className="size-4 text-muted-foreground" />
              <h3 className="text-xs font-bold uppercase tracking-wider">
                Production & Correction Ledger
              </h3>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Total Recorded: {progress.entries.length} items
            </span>
          </div>

          <div className="rounded border overflow-x-auto max-h-48 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b text-[10px] uppercase font-semibold text-muted-foreground sticky top-0">
                <tr>
                  <th className="py-1.5 px-2.5">Date</th>
                  <th className="py-1.5 px-2">Shift</th>
                  <th className="py-1.5 px-2">Type</th>
                  <th className="py-1.5 px-2 text-right">Quantity (MTR)</th>
                  <th className="py-1.5 px-2">Downtime</th>
                  <th className="py-1.5 px-2.5">Reason / Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {progress.entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className={`hover:bg-muted/30 ${
                      entry.transactionType === "CORRECTION"
                        ? "bg-amber-500/5 dark:bg-amber-500/10"
                        : ""
                    }`}
                  >
                    <td className="py-1.5 px-2.5 font-mono">{entry.productionDate}</td>
                    <td className="py-1.5 px-2">Shift {entry.shift || "-"}</td>
                    <td className="py-1.5 px-2">
                      {entry.transactionType === "CORRECTION" ? (
                        <Badge
                          variant="outline"
                          className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px]"
                        >
                          CORRECTION
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 text-[10px]"
                        >
                          PRODUCTION
                        </Badge>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono font-semibold">
                      <span
                        className={
                          entry.qtyMetre < 0
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-foreground"
                        }
                      >
                        {entry.qtyMetre > 0 && entry.transactionType === "CORRECTION" ? "+" : ""}
                        {entry.qtyMetre.toFixed(3)}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 font-mono text-muted-foreground">
                      {entry.downtimeMinutes ? `${entry.downtimeMinutes} min` : "—"}
                    </td>
                    <td className="py-1.5 px-2.5 text-muted-foreground truncate max-w-xs">
                      {entry.correctionReason || entry.downtimeReason || entry.remark || "—"}
                    </td>
                  </tr>
                ))}
                {!progress.entries.length && (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-muted-foreground text-xs">
                      No production entries recorded yet for this Job Card.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="border-t pt-2 flex justify-between items-center sm:justify-between">
          <div className="text-[11px] text-muted-foreground">
            Frontend Execution Simulation Only · No Real Inventory Mutation
          </div>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

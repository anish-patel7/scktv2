import React, { useState, useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  History,
  ShieldCheck,
  Info,
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
import { toast } from "sonner";
import {
  ProductionPlanningService,
  roundQty,
  type ProductionRevision,
  type RevisionReason,
} from "@/services/production-planning.service";
import type { ProductionOrder } from "@/lib/production-store";
import type { CostSheetFull } from "@/lib/cost-sheet-store";

interface ProductionRevisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: ProductionOrder;
  costSheet: CostSheetFull | null;
  onRevisionApplied: (revision: ProductionRevision) => void;
}

const REVISION_REASONS: RevisionReason[] = [
  "Customer Quantity Revision",
  "Production Planning Adjustment",
  "Extra Production",
  "Short Closure",
  "Order Amendment",
  "Correction",
  "Other",
];

export const ProductionRevisionDialog: React.FC<ProductionRevisionDialogProps> = ({
  open,
  onOpenChange,
  order,
  costSheet,
  onRevisionApplied,
}) => {
  const [revisedQtyInput, setRevisedQtyInput] = useState<string>(String(order.qty_metre));
  const [reason, setReason] = useState<RevisionReason>("Customer Quantity Revision");
  const [remarks, setRemarks] = useState<string>("");

  // Sync input when dialog opens or order changes
  React.useEffect(() => {
    setRevisedQtyInput(String(order.qty_metre));
    setReason("Customer Quantity Revision");
    setRemarks("");
  }, [order.id, order.qty_metre, open]);

  const revisedQty = useMemo(() => {
    const val = parseFloat(revisedQtyInput);
    return isNaN(val) || val < 0 ? order.qty_metre : roundQty(val);
  }, [revisedQtyInput, order.qty_metre]);

  const deltaQty = roundQty(revisedQty - order.qty_metre);

  // Compute live revision impact preview
  const impactPreview = useMemo(() => {
    return ProductionPlanningService.calculateProductionRevisionImpact({
      productionOrder: order,
      revisedQty,
      costSheet,
      reason,
      remarks: remarks.trim() || undefined,
      source: "PRODUCTION_ORDER",
    });
  }, [order, revisedQty, costSheet, reason, remarks]);

  const handleApply = () => {
    if (revisedQty <= 0) {
      toast.error("Production quantity must be greater than zero.");
      return;
    }

    if (reason === "Other" && !remarks.trim()) {
      toast.error("Please provide a remark when selecting 'Other'.");
      return;
    }

    try {
      const revision = ProductionPlanningService.applyPlanningQuantityRevision({
        productionOrder: order,
        revisedQty,
        costSheet,
        reason,
        remarks: remarks.trim() || undefined,
        source: "PRODUCTION_ORDER",
      });

      toast.success(
        `Production Order revised: ${order.qty_metre} -> ${revisedQty} ${order.unit || "MTR"} (Delta: ${deltaQty >= 0 ? "+" : ""}${deltaQty})`
      );
      onRevisionApplied(revision);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to apply revision");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 rounded-lg">
              <History className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">
                Revise Production Order Quantity
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Recalculates material deltas, preserves valid allocations, and protects downstream execution without inventory mutation.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Inherited Order Metadata Banner (ENTER ONCE -> REUSE EVERYWHERE) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-muted/40 border text-xs">
          <div>
            <span className="text-muted-foreground block">Order No:</span>
            <span className="font-semibold text-foreground">{order.order_no}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Party:</span>
            <span className="font-semibold text-foreground truncate block">{order.party_name}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Design:</span>
            <span className="font-semibold text-foreground">{order.design_no || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Current Qty:</span>
            <span className="font-bold text-foreground">
              {order.qty_metre.toLocaleString()} {order.unit || "MTR"}
            </span>
          </div>
        </div>

        {/* Revision Input Form */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="revised-qty" className="text-xs font-semibold">
              Revised Quantity ({order.unit || "MTR"}) *
            </Label>
            <Input
              id="revised-qty"
              type="number"
              step="any"
              min="0"
              value={revisedQtyInput}
              onChange={(e) => setRevisedQtyInput(e.target.value)}
              className="font-bold text-base"
            />
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">Delta:</span>
              <span
                className={`font-bold flex items-center gap-0.5 ${
                  deltaQty > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : deltaQty < 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-muted-foreground"
                }`}
              >
                {deltaQty > 0 ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : deltaQty < 0 ? (
                  <TrendingDown className="w-3.5 h-3.5" />
                ) : null}
                {deltaQty > 0 ? `+${deltaQty}` : `${deltaQty}`} {order.unit || "MTR"}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="revision-reason" className="text-xs font-semibold">
              Revision Reason *
            </Label>
            <Select
              value={reason}
              onValueChange={(val) => setReason(val as RevisionReason)}
            >
              <SelectTrigger id="revision-reason" className="text-xs">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {REVISION_REASONS.map((r) => (
                  <SelectItem key={r} value={r} className="text-xs">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="revision-remarks" className="text-xs font-semibold">
              Remarks {reason === "Other" ? "(Required)" : "(Optional)"}
            </Label>
            <Textarea
              id="revision-remarks"
              placeholder={reason === "Other" ? "Specify reason..." : "Additional context..."}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="text-xs h-9 min-h-[38px] resize-none"
            />
          </div>
        </div>

        {/* Delta Policy Notification Banner */}
        {deltaQty > 0 && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
            <TrendingUp className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold">Quantity Increase Rule (+{deltaQty} {order.unit || "MTR"}):</span> Existing valid lot allocations will be <strong>preserved</strong>. Additional allocation requirement is created ONLY for the material delta.
            </div>
          </div>
        )}

        {deltaQty < 0 && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
            <TrendingDown className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold">Quantity Decrease Rule ({deltaQty} {order.unit || "MTR"}):</span> Excess planned allocation is identified. The system proposes trimming excess from the <strong>last planned FIFO lots</strong> to preserve the oldest lots. Downstream Job Cards with excess plans will be marked for review.
            </div>
          </div>
        )}

        {/* Material Delta Table */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span>Material Requirement & Allocation Delta Preview</span>
            </h4>
            <Badge variant="outline" className="text-[10px] font-normal">
              {impactPreview.materialDeltas.length} Material Lines
            </Badge>
          </div>

          <div className="border rounded-lg overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 text-[11px]">
                  <TableHead className="py-2">Type</TableHead>
                  <TableHead className="py-2">Material</TableHead>
                  <TableHead className="py-2 text-right">Prev Required</TableHead>
                  <TableHead className="py-2 text-right">Revised Required</TableHead>
                  <TableHead className="py-2 text-right">Delta Required</TableHead>
                  <TableHead className="py-2 text-right">Existing Planned</TableHead>
                  <TableHead className="py-2 text-right">Impact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {impactPreview.materialDeltas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-xs text-muted-foreground">
                      No material lines found on cost sheet.
                    </TableCell>
                  </TableRow>
                ) : (
                  impactPreview.materialDeltas.map((d, i) => {
                    return (
                      <TableRow key={i} className="text-xs">
                        <TableCell className="py-2 font-medium">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] font-semibold ${
                              d.sourceType === "WARP"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                            }`}
                          >
                            {d.sourceType}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="font-semibold text-foreground">{d.materialCode}</div>
                          <div className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                            {d.materialName}
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-right font-mono">
                          {d.previousRequiredKg !== null ? `${d.previousRequiredKg.toFixed(3)} KG` : "—"}
                        </TableCell>
                        <TableCell className="py-2 text-right font-mono font-semibold">
                          {d.revisedRequiredKg !== null ? `${d.revisedRequiredKg.toFixed(3)} KG` : "—"}
                        </TableCell>
                        <TableCell className="py-2 text-right font-mono">
                          {d.deltaRequiredKg !== null ? (
                            <span
                              className={`font-semibold ${
                                d.deltaRequiredKg > 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : d.deltaRequiredKg < 0
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {d.deltaRequiredKg > 0 ? `+${d.deltaRequiredKg.toFixed(3)}` : d.deltaRequiredKg.toFixed(3)} KG
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="py-2 text-right font-mono text-muted-foreground">
                          {d.existingPlannedKg > 0 ? `${d.existingPlannedKg.toFixed(3)} KG` : "0.000 KG"}
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          {d.impactStatus === "ADDITIONAL_NEEDED" ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px]">
                              +{d.additionalNeededKg.toFixed(3)} KG Needed
                            </Badge>
                          ) : d.impactStatus === "EXCESS_PLANNED" ? (
                            <Badge className="bg-amber-600 hover:bg-amber-600 text-white text-[10px]">
                              -{d.excessPlannedKg.toFixed(3)} KG Excess
                            </Badge>
                          ) : d.impactStatus === "CALCULATION_PENDING" ? (
                            <Badge variant="outline" className="text-orange-500 border-orange-500 text-[10px]">
                              Pending
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-[10px]">
                              No Change
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Safety Note */}
        <div className="flex items-center gap-2 p-2.5 bg-muted/30 border rounded-lg text-[11px] text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Planning Mode Safety:</strong> Applying revision updates the in-memory planning model only. No physical inventory is deducted, no stock reservations are altered, and no historical execution records are modified.
          </span>
        </div>

        <DialogFooter className="flex sm:justify-between items-center gap-2 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            size="sm"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleApply}
            disabled={deltaQty === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            size="sm"
          >
            Apply Revision ({deltaQty >= 0 ? `+${deltaQty}` : `${deltaQty}`} {order.unit || "MTR"})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

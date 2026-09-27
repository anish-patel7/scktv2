import React, { useState } from "react";
import {
  FileCheck2,
  Building2,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Tag,
  AlertCircle,
  BookmarkCheck,
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ProductionPlanningService,
  type LoomProductionPlan,
  type ProductionReleasePreview,
} from "@/services/production-planning.service";
import type { ProductionOrder } from "@/lib/production-store";

interface ProductionReleasePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loomPlan: LoomProductionPlan | null;
  order: ProductionOrder | null;
  onPreviewSaved?: (preview: ProductionReleasePreview) => void;
}

export const ProductionReleasePreviewDialog: React.FC<ProductionReleasePreviewDialogProps> = ({
  open,
  onOpenChange,
  loomPlan,
  order,
  onPreviewSaved,
}) => {
  const [remarks, setRemarks] = useState("");

  if (!loomPlan || !order) return null;

  const costSheet = order.cost_sheet_id
    ? ProductionPlanningService.getCostSheet(order.cost_sheet_id)
    : null;

  const evaluation = ProductionPlanningService.evaluateLoomReadiness(loomPlan, order);

  const handleSaveReleasePreview = () => {
    const result = ProductionPlanningService.createProductionReleasePreview({
      loomPlan,
      order,
      ...(remarks.trim() ? { remarks: remarks.trim() } : {}),
    });

    if (!result.success || !result.preview) {
      toast.error("Cannot save Release Preview", {
        description: result.error || "Loom is not ready for release.",
      });
      return;
    }

    toast.success(`Release Preview saved for ${loomPlan.loomNo}`, {
      description: `Release preview ${result.preview.releasePreviewNo} prepared in planning mode. No production transaction posted.`,
    });

    onPreviewSaved?.(result.preview);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <FileCheck2 className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  PRODUCTION RELEASE PREVIEW
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Loom {loomPlan.loomNo} · {loomPlan.plannedQty.toLocaleString()} MTR release preparation
                </DialogDescription>
              </div>
            </div>
            <Badge className="bg-emerald-600 text-white font-mono text-xs">
              PLANNING PREVIEW ONLY
            </Badge>
          </div>
        </DialogHeader>

        {/* Step 12 Planning Mode Disclaimer Banner */}
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-start gap-2.5">
          <ShieldCheck className="size-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-950 dark:text-emerald-200">
            <span className="font-bold block mb-0.5">PLANNING MODE — NO PRODUCTION TRANSACTION POSTED (Step 12)</span>
            This screen confirms that all upstream planning checks are satisfied to prepare release for{" "}
            <span className="font-mono font-bold">{loomPlan.loomNo}</span>. Saving this preview records planning readiness
            and does not post an actual factory release, load beams, or deduct yarn stock.
          </div>
        </div>

        {/* Inherited Business Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* Card 1: Commercial & Order Context */}
          <div className="p-3.5 rounded-lg border border-border bg-card space-y-2.5">
            <div className="text-[0.6875rem] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border/60 pb-1.5">
              <Building2 className="size-3.5 text-primary" /> Order & Commercial Context
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Production Order:</span>
              <span className="font-mono font-bold text-primary">{order.order_no}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Sales Order:</span>
              <span className="font-mono font-semibold text-foreground">
                {loomPlan.salesOrderNo || order.sales_order_no || "Stock Production"}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Party:</span>
              <span className="font-medium text-foreground">
                {loomPlan.customerName || order.party_name || "—"}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Item:</span>
              <span className="font-medium text-foreground">{loomPlan.itemCode || order.order_no}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Design No:</span>
              <span className="font-mono font-bold text-foreground">{loomPlan.designNo || order.design_no}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Cost Sheet:</span>
              <div className="flex items-center gap-1.5 font-mono">
                <span className="text-foreground">{costSheet?.header.sheet_no || "CS-NONE"}</span>
                <Badge variant="outline" className="text-[0.5625rem]">
                  {costSheet?.header.status || "Approved"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Card 2: Loom, Beam & Readiness Status */}
          <div className="p-3.5 rounded-lg border border-border bg-card space-y-2.5">
            <div className="text-[0.6875rem] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border/60 pb-1.5">
              <Layers className="size-3.5 text-primary" /> Loom & Readiness Dimensions
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Target Loom:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-foreground text-sm">{loomPlan.loomNo}</span>
                <Badge variant="outline" className="text-[0.5625rem]">
                  {loomPlan.loomType} · {loomPlan.pannaInch}"
                </Badge>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Beam Allocated:</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                {loomPlan.beamNo || loomPlan.beamType || "No Beam"}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Planned Release Qty:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                {loomPlan.plannedQty.toLocaleString()} MTR
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Material Status:</span>
              <Badge variant="outline" className="text-[0.625rem] font-mono border-emerald-500/40 text-emerald-600 bg-emerald-500/10">
                {evaluation.materialStatus}
              </Badge>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Warp / Weft Status:</span>
              <div className="flex items-center gap-1 font-mono text-[0.6875rem]">
                <Badge variant="outline" className="text-[0.5625rem] border-emerald-500/40 text-emerald-600">
                  {loomPlan.warpReadiness}
                </Badge>
                <Badge variant="outline" className="text-[0.5625rem] border-emerald-500/40 text-emerald-600">
                  {loomPlan.weftReadiness}
                </Badge>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Revision Review:</span>
              <Badge variant="outline" className="text-[0.625rem] font-mono border-emerald-500/40 text-emerald-600">
                {evaluation.revisionStatus}
              </Badge>
            </div>
          </div>
        </div>

        {/* Optional Planner Remark */}
        <div className="space-y-1.5 pt-1">
          <Label htmlFor="release-remarks" className="text-xs font-semibold text-foreground">
            Release Planning Remarks (Optional)
          </Label>
          <Textarea
            id="release-remarks"
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Add operational notes, priority shift reasons, or shift handover remarks..."
            className="text-xs"
          />
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>

          <Button
            size="sm"
            onClick={handleSaveReleasePreview}
            disabled={!evaluation.isReady}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-bold"
          >
            <BookmarkCheck className="size-4" /> SAVE RELEASE PREVIEW
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

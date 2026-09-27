import React from "react";
import {
  FileText,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
  BookmarkCheck,
  Printer,
  Calendar,
  Building2,
  Tag,
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ProductionPlanningService,
  type JobCardPreview,
} from "@/services/production-planning.service";

interface JobCardPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: JobCardPreview | null;
  onSaved?: () => void;
}

export const JobCardPreviewDialog: React.FC<JobCardPreviewDialogProps> = ({
  open,
  onOpenChange,
  preview,
  onSaved,
}) => {
  if (!preview) return null;

  const totalWeftKg = preview.weftRequirements.reduce((sum, r) => sum + r.expectedQtyKg, 0);

  const handleSavePlan = () => {
    ProductionPlanningService.saveJobCardPreview(preview);
    toast.success(`Job Card Plan saved for ${preview.loomNo} (${preview.plannedQtyMetre.toLocaleString()} MTR)`, {
      description: "Planning draft saved. No real database record or yarn issue created.",
    });
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="size-5 text-indigo-600" />
              <DialogTitle className="text-base font-bold">
                JOB CARD PREPARATION — PREVIEW / PLAN
              </DialogTitle>
            </div>
            <Badge className="bg-indigo-600 text-white font-mono text-xs">
              {preview.jobCardNo}
            </Badge>
          </div>
          <DialogDescription className="text-xs">
            Inherited production and loom context for job card preparation. (Planning contract only — no database mutation).
          </DialogDescription>
        </DialogHeader>

        {/* Safety Disclaimer Banner */}
        <div className="rounded-md border border-indigo-500/30 bg-indigo-500/5 p-3 flex items-start gap-2.5">
          <ShieldCheck className="size-4 text-indigo-600 shrink-0 mt-0.5" />
          <div className="text-xs text-indigo-950 dark:text-indigo-200">
            <span className="font-semibold block mb-0.5">FRONTEND JOB CARD PLAN (Step 18 & 19)</span>
            This action creates a <strong className="font-semibold">Job Card Plan Preview</strong> connected to Loom Plan{" "}
            <span className="font-mono font-bold">{preview.loomNo}</span>. No real database transactions, loom execution records,
            or yarn issues are posted at this stage.
          </div>
        </div>

        {/* Inherited Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* Card 1: Order & Commercial Context */}
          <div className="p-3 rounded-lg border border-border bg-card space-y-2">
            <div className="text-[0.6875rem] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border/60 pb-1.5">
              <Building2 className="size-3.5 text-primary" /> Inherited Order Context
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Production Order:</span>
              <span className="font-mono font-bold text-primary">{preview.productionOrderNo}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Sales Order:</span>
              <span className="font-mono font-semibold text-foreground">
                {preview.salesOrderNo || "Stock Production"}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Party:</span>
              <span className="font-medium text-foreground">{preview.customerName}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Item / Quality:</span>
              <span className="font-medium text-foreground">{preview.itemCode || preview.quality}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Design No:</span>
              <span className="font-mono text-foreground">{preview.designNo || "Standard"}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Priority / Delivery:</span>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[0.625rem]">
                  {preview.priority}
                </Badge>
                <span className="font-mono text-muted-foreground">{preview.deliveryDate || "—"}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Loom & Beam Allocation */}
          <div className="p-3 rounded-lg border border-border bg-card space-y-2">
            <div className="text-[0.6875rem] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border/60 pb-1.5">
              <Layers className="size-3.5 text-primary" /> Loom & Beam Allocation
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Target Loom:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-foreground text-sm">{preview.loomNo}</span>
                <Badge variant="outline" className="text-[0.5625rem]">
                  {preview.loomType} · {preview.pannaInch}"
                </Badge>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Job Card Planned Qty:</span>
              <span className="font-mono font-bold text-primary text-sm">
                {preview.plannedQtyMetre.toLocaleString()} MTR
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Beam Plan / Candidate:</span>
              <span className="font-mono font-bold text-blue-600">
                {preview.beamNo || preview.beamType || "No Beam Linked"}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Warp Readiness:</span>
              <Badge
                variant="outline"
                className={`text-[0.625rem] font-bold ${
                  preview.warpReadiness === "WARP READY"
                    ? "border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30"
                    : "border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950/30"
                }`}
              >
                {preview.warpReadiness}
              </Badge>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Weft Readiness:</span>
              <Badge
                variant="outline"
                className={`text-[0.625rem] font-bold ${
                  preview.weftReadiness === "WEFT READY"
                    ? "border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30"
                    : "border-rose-500 text-rose-700 bg-rose-50 dark:bg-rose-950/30"
                }`}
              >
                {preview.weftReadiness}
              </Badge>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Derived Weft Requirement:</span>
              <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                {totalWeftKg.toFixed(2)} KG
              </span>
            </div>
          </div>
        </div>

        {/* Step 21 Note: Weft Follows Job Card Qty */}
        <div className="rounded-md border border-purple-500/20 bg-purple-500/5 p-3 text-xs text-purple-950 dark:text-purple-200 space-y-1">
          <div className="font-semibold flex items-center gap-1.5">
            <BookmarkCheck className="size-3.5 text-purple-600" />
            STEP 21: Automatic Weft Requirement Derivation
          </div>
          <p className="text-[0.6875rem] text-muted-foreground">
            Weft yarn requirement for this Job Card is derived directly from the allocated Loom quantity (
            {preview.plannedQtyMetre.toLocaleString()} MTR) based on the approved Cost Sheet ratio (~
            {totalWeftKg.toFixed(2)} KG total). Operators are not required to manually re-enter yarn figures.
          </p>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>

          <Button
            size="sm"
            onClick={handleSavePlan}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 font-bold"
          >
            <BookmarkCheck className="size-4" /> Save Job Card Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

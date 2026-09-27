import React, { useState } from "react";
import {
  FileText,
  Building2,
  Layers,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  PackageCheck,
  BookmarkCheck,
  Sparkles,
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ProductionPlanningService,
  type JobCardDraft,
} from "@/services/production-planning.service";
import type { ProductionOrder } from "@/lib/production-store";

interface JobCardDraftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: JobCardDraft | null;
  order: ProductionOrder | null;
  onOpenMaterialIssuePrep?: (draft: JobCardDraft) => void;
  onSaved?: (draft: JobCardDraft) => void;
}

export const JobCardDraftDialog: React.FC<JobCardDraftDialogProps> = ({
  open,
  onOpenChange,
  draft,
  order,
  onOpenMaterialIssuePrep,
  onSaved,
}) => {
  if (!draft || !order) return null;

  const [plannedStart, setPlannedStart] = useState(draft.plannedStart || "");
  const [operatorNote, setOperatorNote] = useState(draft.operatorNote || "");
  const [processNote, setProcessNote] = useState(draft.processNote || "");
  const [remark, setRemark] = useState(draft.remark || "");

  const handleSaveDraft = () => {
    const updated: JobCardDraft = {
      ...draft,
      ...(plannedStart ? { plannedStart } : {}),
      ...(operatorNote ? { operatorNote } : {}),
      ...(processNote ? { processNote } : {}),
      ...(remark ? { remark } : {}),
      updatedAt: new Date().toISOString(),
    };

    ProductionPlanningService.saveJobCardDraft(updated);
    toast.success(`Job Card Draft saved (${updated.draftCardNo})`, {
      description: "Draft saved in planning store. No real Job Card created in database.",
    });

    onSaved?.(updated);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <FileText className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  JOB CARD DRAFT / EXECUTION PREVIEW
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {draft.draftCardNo} · Inherited planning parameters (Step 14 & 16)
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs border-indigo-500/40 text-indigo-600">
                {draft.status}
              </Badge>
              <Badge className="bg-muted text-muted-foreground font-mono text-[0.6875rem]">
                Pending Backend JC #
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Informational Disclaimer Banner */}
        <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-3 flex items-start gap-2.5">
          <ShieldCheck className="size-4 text-indigo-600 shrink-0 mt-0.5" />
          <div className="text-xs text-indigo-950 dark:text-indigo-200">
            <span className="font-bold block mb-0.5">FRONTEND JOB CARD DRAFT (Step 15, 16, 17)</span>
            Business fields (Party, Order, Item, Design, Loom, Beam, Quantity) are inherited directly from upstream planning
            and are strictly read-only to avoid duplicate or conflicting entry. Planners may specify operational notes and
            planned start schedule below.
          </div>
        </div>

        {/* Inherited Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* Card 1: Order & Commercial Context (Read-Only) */}
          <div className="p-3.5 rounded-lg border border-border bg-card space-y-2">
            <div className="text-[0.6875rem] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border/60 pb-1.5">
              <Building2 className="size-3.5 text-primary" /> Inherited Order Context (Read-Only)
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Production Order:</span>
              <span className="font-mono font-bold text-primary">{draft.productionOrderNo}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Sales Order:</span>
              <span className="font-mono font-semibold text-foreground">
                {draft.salesOrderNo || "Stock Production"}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Party:</span>
              <span className="font-medium text-foreground">{draft.customerName}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Item Code:</span>
              <span className="font-medium text-foreground">{draft.itemCode}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Design No / Quality:</span>
              <span className="font-mono font-bold text-foreground">
                {draft.designNo} · {draft.quality}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Cost Sheet Ref:</span>
              <span className="font-mono text-muted-foreground">{draft.costSheetNo || "CS-NONE"}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Priority / Delivery:</span>
              <div className="flex items-center gap-1.5 font-mono">
                <Badge variant="outline" className="text-[0.5625rem]">
                  {draft.priority}
                </Badge>
                <span>{draft.deliveryDate || "—"}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Loom, Beam & Quantity (Read-Only) */}
          <div className="p-3.5 rounded-lg border border-border bg-card space-y-2">
            <div className="text-[0.6875rem] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border/60 pb-1.5">
              <Layers className="size-3.5 text-primary" /> Loom & Beam Allocation (Read-Only)
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Target Loom:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-foreground text-sm">{draft.loomNo}</span>
                <Badge variant="outline" className="text-[0.5625rem]">
                  {draft.loomType} · {draft.pannaInch}"
                </Badge>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Job Card Planned Qty:</span>
              <span className="font-mono font-bold text-primary text-sm">
                {draft.plannedQtyMetre.toLocaleString()} {draft.unit}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Beam Plan / Candidate:</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                {draft.beamNo || draft.beamPlanId || "No Beam Linked"}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Warp Readiness:</span>
              <Badge variant="outline" className="text-[0.625rem] font-mono border-emerald-500/40 text-emerald-600">
                {draft.warpReadiness}
              </Badge>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Weft Readiness:</span>
              <Badge variant="outline" className="text-[0.625rem] font-mono border-emerald-500/40 text-emerald-600">
                {draft.weftReadiness}
              </Badge>
            </div>

            <div className="rounded border border-primary/20 bg-primary/5 p-2 text-[0.6875rem] text-primary space-y-0.5">
              <span className="font-bold block">Tied Quantity Contract (Step 17)</span>
              <span>Draft quantity is strictly inherited from Loom Plan ({draft.plannedQtyMetre.toLocaleString()} MTR). To modify quantity, adjust Loom Planning.</span>
            </div>
          </div>
        </div>

        {/* Editable Planning Fields (Step 16) */}
        <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
            <Clock className="size-3.5 text-primary" /> Execution Planning Fields (Editable)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <Label htmlFor="planned-start" className="text-xs font-medium">Planned Start Date</Label>
              <Input
                id="planned-start"
                type="date"
                value={plannedStart}
                onChange={(e) => setPlannedStart(e.target.value)}
                className="text-xs h-8"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="process-note" className="text-xs font-medium">Process / Weaving Note</Label>
              <Input
                id="process-note"
                placeholder="e.g. 52 PPI, extra selvage tension, jacquard card #12"
                value={processNote}
                onChange={(e) => setProcessNote(e.target.value)}
                className="text-xs h-8"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <Label htmlFor="operator-note" className="text-xs font-medium">Operator / Weaver Note</Label>
              <Input
                id="operator-note"
                placeholder="e.g. Master Weaver Ramesh shift A"
                value={operatorNote}
                onChange={(e) => setOperatorNote(e.target.value)}
                className="text-xs h-8"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="draft-remarks" className="text-xs font-medium">General Planning Remarks</Label>
              <Input
                id="draft-remarks"
                placeholder="Additional notes..."
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                className="text-xs h-8"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>

          <div className="flex items-center gap-2">
            {onOpenMaterialIssuePrep && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-purple-500/40 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/20"
                onClick={() => {
                  onOpenMaterialIssuePrep(draft);
                }}
              >
                <PackageCheck className="size-4" /> Material Issue Preparation
              </Button>
            )}

            <Button
              size="sm"
              onClick={handleSaveDraft}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 font-bold"
            >
              <BookmarkCheck className="size-4" /> Save Job Card Draft
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

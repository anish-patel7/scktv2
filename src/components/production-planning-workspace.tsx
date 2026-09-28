import { useState, useMemo, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Factory,
  Package,
  Layers,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
  ExternalLink,
  Lock,
  ChevronRight,
  ShieldAlert,
  Info,
  Sparkles,
  Trash2,
  CheckSquare,
  SlidersHorizontal,
  FlaskConical,
  History,
  FileText,
  FileCheck2,
  AlertOctagon,
  PackageCheck,
  Gauge,
  ListPlus,
  Route,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { FabricProcessRoutingWorkspace } from "@/components/fabric-process-routing-workspace";
import { toast } from "sonner";
import {
  ProductionPlanningService,
  roundQty,
  sumQty,
  type MaterialRequirement,
  type MaterialReadinessSummary,
  type ReadinessStatus,
  type MaterialAllocationPlan,
  type ProductionOrderAllocationSummary,
  type AllocationStatus,
  type OverallProductionPlanningStatus,
  type LoomProductionPlan,
  type LoomPlanSummary,
  type JobCardPreview,
  type LoomReleaseEvaluation,
  type ProductionReleasePreview,
  type JobCardDraft,
  type JobCardMaterialIssuePreparation,
  type ProductionOrderReleaseSummary,
} from "@/services/production-planning.service";
import { MaterialAllocationDialog } from "@/components/material-allocation-dialog";
import { ProductionRevisionDialog } from "@/components/production-revision-dialog";
import { WarpPlanningDialog } from "@/components/warp-planning-dialog";
import { WeftJobCardDialog } from "@/components/weft-job-card-dialog";
import { LoomPlanningDialog } from "@/components/loom-planning-dialog";
import { JobCardPreviewDialog } from "@/components/job-card-preview-dialog";
import { WhyBlockedDialog } from "@/components/why-blocked-dialog";
import { ProductionReleasePreviewDialog } from "@/components/production-release-preview-dialog";
import { JobCardDraftDialog } from "@/components/job-card-draft-dialog";
import { MaterialIssuePrepDialog } from "@/components/material-issue-prep-dialog";
import { JobCardMaterialLedgerDialog } from "@/components/job-card-material-ledger-dialog";
import { DailyProductionDialog } from "@/components/daily-production-dialog";
import { BulkDailyProductionDialog } from "@/components/bulk-daily-production-dialog";
import { JobCardReceiveDialog } from "@/components/job-card-receive-dialog";
import type { ProductionOrder } from "@/lib/production-store";
import type { SalesOrderItem } from "@/lib/sales-store";
import type { CostSheetFull } from "@/lib/cost-sheet-store";
import { fmt } from "@/lib/costing";

interface ProductionPlanningWorkspaceProps {
  order: ProductionOrder;
  onClose?: () => void;
  onRefresh?: () => void;
}

const READINESS_BADGES: Record<ReadinessStatus, { label: string; class: string; icon: typeof CheckCircle2 }> = {
  READY: {
    label: "READY",
    class: "bg-emerald-600/90 hover:bg-emerald-600 text-white font-bold",
    icon: CheckCircle2,
  },
  SHORTAGE: {
    label: "SHORTAGE",
    class: "bg-rose-600/90 hover:bg-rose-600 text-white font-bold",
    icon: XCircle,
  },
  UNMAPPED: {
    label: "UNMAPPED",
    class: "bg-amber-500/90 hover:bg-amber-500 text-black font-semibold",
    icon: AlertTriangle,
  },
  CALCULATION_PENDING: {
    label: "CALCULATION PENDING",
    class: "bg-orange-500/90 hover:bg-orange-500 text-white font-semibold",
    icon: HelpCircle,
  },
};

const ALLOCATION_STATUS_BADGES: Record<
  AllocationStatus,
  { label: string; class: string; icon: typeof CheckCircle2 }
> = {
  FULLY_ALLOCATED: {
    label: "FULLY ALLOCATED",
    class: "bg-emerald-600 text-white font-bold",
    icon: CheckCircle2,
  },
  PARTIALLY_ALLOCATED: {
    label: "PARTIAL",
    class: "bg-amber-600 text-white font-bold",
    icon: AlertTriangle,
  },
  SHORTAGE: {
    label: "SHORTAGE",
    class: "bg-rose-600 text-white font-bold",
    icon: XCircle,
  },
  NO_ELIGIBLE_LOTS: {
    label: "NO LOTS",
    class: "bg-muted text-muted-foreground font-semibold",
    icon: HelpCircle,
  },
  UNMAPPED: {
    label: "UNMAPPED",
    class: "bg-amber-500 text-black font-semibold",
    icon: AlertTriangle,
  },
  CALCULATION_PENDING: {
    label: "CALC PENDING",
    class: "bg-orange-500 text-white font-semibold",
    icon: HelpCircle,
  },
};

export function ProductionPlanningWorkspace({
  order,
  onClose,
  onRefresh,
}: ProductionPlanningWorkspaceProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  // Allocation Dialog states
  const [selectedReqForAllocation, setSelectedReqForAllocation] = useState<MaterialRequirement | null>(null);
  const [isAllocationDialogOpen, setIsAllocationDialogOpen] = useState(false);

  // Phase 3 Dialog states
  const [isRevisionDialogOpen, setIsRevisionDialogOpen] = useState(false);
  const [isWarpDialogOpen, setIsWarpDialogOpen] = useState(false);
  const [isWeftDialogOpen, setIsWeftDialogOpen] = useState(false);

  // Phase 3B Dialog states
  const [isLoomDialogOpen, setIsLoomDialogOpen] = useState(false);
  const [activeJobCardPreview, setActiveJobCardPreview] = useState<JobCardPreview | null>(null);
  const [isJobCardPreviewOpen, setIsJobCardPreviewOpen] = useState(false);

  // Phase 4A Dialog states
  const [selectedEvaluationForBlockers, setSelectedEvaluationForBlockers] = useState<LoomReleaseEvaluation | null>(null);
  const [isWhyBlockedOpen, setIsWhyBlockedOpen] = useState(false);

  const [selectedLoomPlanForRelease, setSelectedLoomPlanForRelease] = useState<LoomProductionPlan | null>(null);
  const [isReleasePreviewOpen, setIsReleasePreviewOpen] = useState(false);

  const [selectedDraftForView, setSelectedDraftForView] = useState<JobCardDraft | null>(null);
  const [isJobCardDraftOpen, setIsJobCardDraftOpen] = useState(false);

  const [selectedDraftForMaterialPrep, setSelectedDraftForMaterialPrep] = useState<JobCardDraft | null>(null);
  const [isMaterialIssuePrepOpen, setIsMaterialIssuePrepOpen] = useState(false);

  // Phase 4B Material Ledger Execution Simulation states
  const [selectedDraftForLedger, setSelectedDraftForLedger] = useState<JobCardDraft | null>(null);
  const [isMaterialLedgerOpen, setIsMaterialLedgerOpen] = useState(false);

  // Phase 4C Daily Production & Progress states
  const [selectedDraftForDailyProduction, setSelectedDraftForDailyProduction] = useState<JobCardDraft | null>(null);
  const [isDailyProductionOpen, setIsDailyProductionOpen] = useState(false);
  const [isBulkProductionOpen, setIsBulkProductionOpen] = useState(false);

  // Phase 5A Job Card Receive & Roll Formation states
  const [selectedDraftForReceive, setSelectedDraftForReceive] = useState<JobCardDraft | null>(null);
  const [isJobCardReceiveOpen, setIsJobCardReceiveOpen] = useState(false);

  // Phase 5C Fabric Process Routing states
  const [isProcessRoutingOpen, setIsProcessRoutingOpen] = useState(false);

  // Automated Test Suite Viewer states (Phase 1, 2, 3, 3B, 4A, 4B, 4C & 5A)
  const [showTestModal, setShowTestModal] = useState(false);
  const [testResults, setTestResults] = useState<{
    phase1: Record<string, { pass: boolean; details: string }>;
    phase2: Record<string, { pass: boolean; details: string }>;
    phase3: Record<string, { pass: boolean; details: string }>;
    phase3b: Record<string, { pass: boolean; details: string }>;
    phase4a?: Record<string, { pass: boolean; details: string }> | undefined;
    phase4b?: Record<string, { pass: boolean; details: string }> | undefined;
    phase4c?: Record<string, { pass: boolean; details: string }> | undefined;
    phase5a?: Record<string, { pass: boolean; details: string }> | undefined;
  } | null>(null);

  // 1. Resolve Linked Sales Order
  const salesOrder: SalesOrderItem | null = useMemo(() => {
    if (order.sales_order_id) {
      return ProductionPlanningService.getSalesOrder(order.sales_order_id);
    }
    if (order.sales_order_no) {
      const all = ProductionPlanningService.getSalesOrders();
      return all.find((so) => so.order_no === order.sales_order_no) ?? null;
    }
    return null;
  }, [order.sales_order_id, order.sales_order_no]);

  // 2. Resolve Linked Cost Sheet
  const costSheet: CostSheetFull | null = useMemo(() => {
    if (order.cost_sheet_id) {
      return ProductionPlanningService.getCostSheet(order.cost_sheet_id);
    }
    return null;
  }, [order.cost_sheet_id, refreshKey]);

  // 3. Calculate Material Requirements (Phase 1)
  const materialRequirements: MaterialRequirement[] = useMemo(() => {
    if (!costSheet) return [];
    return ProductionPlanningService.calculateMaterialRequirements({
      costSheet,
      productionQty: order.qty_metre,
      productionUnit: order.unit || "MTR",
    });
  }, [costSheet, order.qty_metre, order.unit, refreshKey]);

  // 4. Calculate Readiness Summary (Phase 1)
  const summary: MaterialReadinessSummary = useMemo(() => {
    return ProductionPlanningService.getMaterialReadinessSummary(materialRequirements);
  }, [materialRequirements]);

  // 5. In-Memory Allocation Plans Map for this Order (Phase 2)
  const plansMap = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    refreshKey; // dependency trigger
    const plans = ProductionPlanningService.getAllocationPlansForOrder(order.id);
    const map = new Map<string, MaterialAllocationPlan>();
    for (const p of plans) {
      map.set(p.materialRequirementId, p);
    }
    return map;
  }, [order.id, refreshKey]);

  // 6. Overall Allocation Summary (Phase 2)
  const allocationSummary: ProductionOrderAllocationSummary = useMemo(() => {
    return ProductionPlanningService.calculateOrderAllocationSummary(
      materialRequirements,
      Array.from(plansMap.values())
    );
  }, [materialRequirements, plansMap]);

  // Phase 3 In-Memory Plans & Readiness
  const revisions = useMemo(() => {
    return ProductionPlanningService.getProductionRevisions(order.id);
  }, [order.id, refreshKey]);

  const beamAllocPlan = useMemo(() => {
    return ProductionPlanningService.getBeamAllocationPlan(order.id);
  }, [order.id, refreshKey]);

  const beamProdPlan = useMemo(() => {
    return ProductionPlanningService.getBeamProductionPlan(order.id);
  }, [order.id, refreshKey]);

  const jobCardPlans = useMemo(() => {
    return ProductionPlanningService.getJobCardMaterialPlans(order.id);
  }, [order.id, refreshKey]);

  const orderJobCards = useMemo(() => {
    return ProductionPlanningService.getJobCardsForOrder(order.id);
  }, [order.id, refreshKey]);

  // Phase 3B In-Memory Loom Plans & Summary
  const loomPlans = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    refreshKey;
    return ProductionPlanningService.getLoomPlansForOrder(order.id);
  }, [order.id, refreshKey]);

  const loomSummary: LoomPlanSummary = useMemo(() => {
    return ProductionPlanningService.calculateLoomPlanSummary({
      productionOrder: order,
      plans: loomPlans,
    });
  }, [order, loomPlans]);

  const overallPlanningReadiness: OverallProductionPlanningStatus = useMemo(() => {
    return ProductionPlanningService.calculateProductionPlanningReadiness({
      requirements: materialRequirements,
      allocationSummary,
      productionOrderId: order.id,
    });
  }, [materialRequirements, allocationSummary, order.id, refreshKey]);

  // Phase 4A Production Release Summary
  const releaseSummary: ProductionOrderReleaseSummary = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    refreshKey;
    return ProductionPlanningService.evaluateProductionReadiness(order);
  }, [order, loomPlans, refreshKey]);

  // Phase 4C Production Order Progress
  const orderProgress = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    refreshKey;
    return ProductionPlanningService.getProductionOrderProgress(order);
  }, [order, refreshKey]);

  // Phase 5A Production Order Receive Rollup (Step 37)
  const orderReceiveSummary = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    refreshKey;
    return ProductionPlanningService.getProductionOrderReceiveSummary(order);
  }, [order, refreshKey]);

  // Phase 5C All Roll Drafts across Order for Process Routing
  const allOrderRollDrafts = useMemo(() => {
    return orderReceiveSummary.jobCardsSummary.flatMap((jc) => jc.allRollDrafts);
  }, [orderReceiveSummary]);

  // Split into Warp and Weft lines
  const warpRequirements = materialRequirements.filter((r) => r.sourceType === "WARP");
  const weftRequirements = materialRequirements.filter((r) => r.sourceType === "WEFT");

  const isCustomerOrder =
    (order.production_type || (order.sales_order_no ? "CUSTOMER ORDER" : "STOCK PRODUCTION")) ===
    "CUSTOMER ORDER";

  // Refresh Availability Handler (Step 32)
  const handleRefreshAvailability = () => {
    // Re-check each active plan for staleness against latest inventory
    let staleDetectedCount = 0;
    for (const plan of plansMap.values()) {
      const refreshed = ProductionPlanningService.refreshLotAvailability(plan);
      if (refreshed.isStale) staleDetectedCount++;
    }

    setRefreshKey((k) => k + 1);
    onRefresh?.();

    if (staleDetectedCount > 0) {
      toast.warning(
        `Availability changed: ${staleDetectedCount} allocation plan(s) are now stale. Replan allocation.`
      );
    } else {
      toast.info("Refreshed stock availability and allocation plans against inventory.");
    }
  };

  // Bulk FIFO Generation Handler (Step 35)
  const handleBulkFifo = () => {
    const generated = ProductionPlanningService.generateProductionOrderAllocations(
      order,
      materialRequirements
    );
    setRefreshKey((k) => k + 1);
    toast.success(
      `Generated FIFO allocation proposals for ${generated.length} eligible material line(s).`
    );
  };

  // Clear All Allocations Handler
  const handleClearAllAllocations = () => {
    ProductionPlanningService.clearAllocationPlans(order.id);
    setRefreshKey((k) => k + 1);
    toast.info("Cleared all allocation plans for this Production Order.");
  };

  // Open Allocation Drawer/Modal
  const handleOpenAllocation = (req: MaterialRequirement) => {
    setSelectedReqForAllocation(req);
    setIsAllocationDialogOpen(true);
  };

  // Run Test Suite Runner (Phase 1, Phase 2, Phase 3, Phase 3B, Phase 4A, Phase 4B, Phase 4C & Phase 5A)
  const handleRunTests = () => {
    const p1 = ProductionPlanningService.runVerificationTests();
    const p2 = ProductionPlanningService.runPhase2VerificationTests();
    const p3 = ProductionPlanningService.runPhase3VerificationTests();
    const p3b = ProductionPlanningService.runPhase3BVerificationTests();
    const p4a = ProductionPlanningService.runPhase4AVerificationTests();
    const p4b = ProductionPlanningService.runPhase4BVerificationTests();
    const p4c = ProductionPlanningService.runPhase4CVerificationTests();
    const p5a = ProductionPlanningService.runPhase5AVerificationTests();
    setTestResults({
      phase1: p1,
      phase2: p2,
      phase3: p3,
      phase3b: p3b,
      phase4a: p4a,
      phase4b: p4b,
      phase4c: p4c,
      phase5a: p5a,
    });
    setShowTestModal(true);
  };

  return (
    <div className="space-y-4 text-xs font-sans">
      {/* Workspace Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Factory className="size-5 text-primary" />
            <h2 className="text-base font-bold tracking-tight text-foreground">
              PRODUCTION ORDER — {order.order_no}
            </h2>
            <Badge variant="outline" className="font-mono text-[0.6875rem] uppercase">
              {order.production_type || (isCustomerOrder ? "CUSTOMER ORDER" : "STOCK PRODUCTION")}
            </Badge>
            <Badge
              className={`text-[0.625rem] capitalize ${
                order.status === "completed"
                  ? "bg-emerald-600 text-white"
                  : order.status === "in_progress"
                  ? "bg-primary text-primary-foreground"
                  : order.status === "hold"
                  ? "bg-amber-500 text-black"
                  : "bg-muted text-foreground"
              }`}
            >
              Order Status: {order.status.replace("_", " ")}
            </Badge>
          </div>
          <p className="mt-1 text-[0.6875rem] text-muted-foreground">
            Production Planning & Material Allocation Workspace · Lot-Level FIFO Planning Mode
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRunTests}
            className="h-7 text-xs gap-1.5 border-dashed"
            title="Run Phase 1, 2, 3 & 3B Automated Verification Tests"
          >
            <FlaskConical className="size-3.5 text-primary" /> Test Suite
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsRevisionDialogOpen(true)}
            className="h-7 text-xs gap-1.5 text-indigo-600 border-indigo-300 hover:bg-indigo-50 dark:border-indigo-800 dark:hover:bg-indigo-950/40 font-semibold"
            title="Revise Production Order Quantity & Calculate Material Delta"
          >
            <History className="size-3.5" /> Revise Qty
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsWarpDialogOpen(true)}
            className="h-7 text-xs gap-1.5 text-blue-600 border-blue-300 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950/40 font-semibold"
            title="Warp & Beam Planning (Candidates / New Beam Production Plan)"
          >
            <Layers className="size-3.5" /> Warp / Beam Plan
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsLoomDialogOpen(true)}
            className="h-7 text-xs gap-1.5 text-indigo-600 border-indigo-300 hover:bg-indigo-50 dark:border-indigo-800 dark:hover:bg-indigo-950/40 font-semibold"
            title="Loom Planning & Multi-Loom Allocation (Phase 3B)"
          >
            <Factory className="size-3.5" /> Plan Looms
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsWeftDialogOpen(true)}
            className="h-7 text-xs gap-1.5 text-purple-600 border-purple-300 hover:bg-purple-50 dark:border-purple-800 dark:hover:bg-purple-950/40 font-semibold"
            title="Weft Job Card Material Issue Planning & Yarn Issue Preview"
          >
            <Package className="size-3.5" /> Weft Job Card Plan
          </Button>

          <Button
            size="sm"
            variant="default"
            onClick={handleBulkFifo}
            className="h-7 text-xs gap-1.5 font-semibold"
            title="Generate suggested FIFO allocations for all eligible materials in this order"
          >
            <Sparkles className="size-3.5" /> Generate FIFO Suggestions
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleRefreshAvailability}
            className="h-7 text-xs gap-1.5"
            title="Refresh availability against current inventory"
          >
            <RefreshCw className="size-3.5" /> Refresh Availability
          </Button>

          {plansMap.size > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClearAllAllocations}
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
              title="Clear all allocation plans for this order"
            >
              <Trash2 className="size-3.5" /> Clear Plans
            </Button>
          )}

          {onClose && (
            <Button size="sm" variant="ghost" onClick={onClose} className="h-7 text-xs">
              Close Workspace
            </Button>
          )}
        </div>
      </div>

      {/* Grid of Sections: SOURCE, PRODUCTION, COST SHEET */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* SECTION A: SOURCE */}
        <Card className="border border-border">
          <CardHeader className="py-2.5 px-3.5 border-b border-border bg-muted/40 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-primary" /> A. SOURCE CONTEXT
            </CardTitle>
            <Badge variant="secondary" className="text-[0.5625rem]">
              {isCustomerOrder ? "INHERITED" : "INTERNAL"}
            </Badge>
          </CardHeader>
          <CardContent className="p-3 space-y-2 text-xs">
            <div className="flex justify-between items-baseline border-b border-border/50 pb-1.5">
              <span className="text-muted-foreground text-[0.6875rem]">Production Type:</span>
              <span className="font-semibold text-foreground">
                {isCustomerOrder ? "Customer Order" : "Stock Production"}
              </span>
            </div>

            <div className="flex justify-between items-baseline border-b border-border/50 pb-1.5">
              <span className="text-muted-foreground text-[0.6875rem]">Sales Order #:</span>
              <span className="font-mono font-bold text-primary">
                {order.sales_order_no || salesOrder?.order_no || (isCustomerOrder ? "SO/2543" : "— (Stock)")}
              </span>
            </div>

            <div className="flex justify-between items-baseline border-b border-border/50 pb-1.5">
              <span className="text-muted-foreground text-[0.6875rem]">Customer / Party:</span>
              <span className="font-semibold text-foreground truncate max-w-[160px]" title={order.party_name}>
                {order.party_name || salesOrder?.customer_name || "—"}
              </span>
            </div>

            <div className="flex justify-between items-baseline border-b border-border/50 pb-1.5">
              <span className="text-muted-foreground text-[0.6875rem]">Item / Product:</span>
              <span className="font-mono text-foreground">
                {order.item_code || salesOrder?.item_code || "SL02-SALSA"}
              </span>
            </div>

            <div className="flex justify-between items-baseline">
              <span className="text-muted-foreground text-[0.6875rem]">Party Order #:</span>
              <span className="font-mono text-muted-foreground">
                {order.party_order_no || "PO-LABDHI-99"}
              </span>
            </div>

            {salesOrder && (
              <div className="pt-1">
                <Link
                  to="/sales/orders"
                  className="inline-flex items-center gap-1 text-[0.6875rem] text-primary hover:underline font-semibold"
                >
                  <ExternalLink className="size-3" /> View Sales Order ({salesOrder.order_no})
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SECTION B: PRODUCTION */}
        <Card className="border border-border">
          <CardHeader className="py-2.5 px-3.5 border-b border-border bg-muted/40 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-blue-500" /> B. PRODUCTION DETAILS
            </CardTitle>
            <Badge variant="secondary" className="text-[0.5625rem]">
              USER ENTERED
            </Badge>
          </CardHeader>
          <CardContent className="p-3 space-y-2 text-xs">
            <div className="flex justify-between items-baseline border-b border-border/50 pb-1.5">
              <span className="text-muted-foreground text-[0.6875rem]">Production Order #:</span>
              <span className="font-mono font-bold text-foreground">{order.order_no}</span>
            </div>

            <div className="flex justify-between items-baseline border-b border-border/50 pb-1.5">
              <span className="text-muted-foreground text-[0.6875rem]">Design #:</span>
              <span className="font-mono font-bold text-primary">{order.design_no || "—"}</span>
            </div>

            <div className="flex justify-between items-baseline border-b border-border/50 pb-1.5">
              <span className="text-muted-foreground text-[0.6875rem]">Quality / Description:</span>
              <span className="text-foreground truncate max-w-[160px]" title={order.quality}>
                {order.quality || "—"}
              </span>
            </div>

            <div className="flex justify-between items-baseline border-b border-border/50 pb-1.5">
              <span className="text-muted-foreground text-[0.6875rem]">Production Qty:</span>
              <span className="font-mono font-bold text-foreground">
                {order.qty_metre.toLocaleString()} {order.unit || "MTR"}
              </span>
            </div>

            <div className="flex justify-between items-baseline border-b border-border/50 pb-1.5">
              <span className="text-muted-foreground text-[0.6875rem]">Produced To Date:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {orderProgress.producedToDateMetre.toLocaleString()} {order.unit || "MTR"}
              </span>
            </div>

            <div className="flex justify-between items-baseline border-b border-border/50 pb-1.5">
              <span className="text-muted-foreground text-[0.6875rem]">Remaining Qty:</span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                {orderProgress.remainingQtyMetre.toLocaleString()} {order.unit || "MTR"} ({orderProgress.progressPercent}%)
              </span>
            </div>

            <div className="flex justify-between items-baseline border-b border-border/50 pb-1.5">
              <span className="text-muted-foreground text-[0.6875rem]">Received From Loom:</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {orderReceiveSummary.totalReceivedMetre.toLocaleString()} {order.unit || "MTR"} ({orderReceiveSummary.rollDraftCount} rolls)
              </span>
            </div>

            <div className="flex justify-between items-baseline border-b border-border/50 pb-1.5">
              <span className="text-muted-foreground text-[0.6875rem]">Produced Not Received:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {orderReceiveSummary.producedNotReceivedMetre.toLocaleString()} {order.unit || "MTR"}
              </span>
            </div>

            <div className="flex justify-between items-baseline">
              <span className="text-muted-foreground text-[0.6875rem]">Delivery Target:</span>
              <span className="font-mono text-muted-foreground">
                {order.delivery_date || "15/10/2026"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* SECTION C: COST SHEET LINK */}
        <Card className="border border-border">
          <CardHeader className="py-2.5 px-3.5 border-b border-border bg-muted/40 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500" /> C. COST SHEET LINK
            </CardTitle>
            <Badge variant="secondary" className="text-[0.5625rem]">
              {order.cost_sheet_id ? "LINKED" : "UNLINKED"}
            </Badge>
          </CardHeader>
          <CardContent className="p-3 space-y-2 text-xs">
            {costSheet ? (
              <>
                <div className="flex justify-between items-baseline border-b border-border/50 pb-1.5">
                  <span className="text-muted-foreground text-[0.6875rem]">Cost Sheet Ref:</span>
                  <span className="font-mono font-bold text-primary">
                    {costSheet.header.sheet_no}
                  </span>
                </div>

                <div className="flex justify-between items-baseline border-b border-border/50 pb-1.5">
                  <span className="text-muted-foreground text-[0.6875rem]">Status (Informational):</span>
                  <div className="flex items-center gap-1">
                    <Badge
                      variant="outline"
                      className={`text-[0.625rem] capitalize ${
                        costSheet.header.status === "Approved"
                          ? "border-emerald-500 text-emerald-700 bg-emerald-50/50"
                          : "border-amber-500 text-amber-700 bg-amber-50/50"
                      }`}
                    >
                      {costSheet.header.status}
                    </Badge>
                    <span className="text-[0.5625rem] text-muted-foreground font-mono">(Non-blocking)</span>
                  </div>
                </div>

                <div className="flex justify-between items-baseline border-b border-border/50 pb-1.5">
                  <span className="text-muted-foreground text-[0.6875rem]">Snapshot / Updated:</span>
                  <span className="font-mono text-muted-foreground text-[0.6875rem]">
                    {costSheet.header.updated_at
                      ? new Date(costSheet.header.updated_at).toLocaleDateString()
                      : "Latest Draft"}
                  </span>
                </div>

                <div className="flex justify-between items-baseline border-b border-border/50 pb-1.5">
                  <span className="text-muted-foreground text-[0.6875rem]">Costing Basis:</span>
                  <span className="font-mono text-foreground text-[0.6875rem]">
                    {costSheet.header.unit_basis || "per metre"} · {costSheet.header.length_metre}m
                  </span>
                </div>

                <div className="pt-1 flex items-center justify-between">
                  <span className="text-muted-foreground text-[0.6875rem]">
                    Warp: {warpRequirements.length} | Weft: {weftRequirements.length}
                  </span>
                  <Link
                    to="/cost-sheets"
                    className="inline-flex items-center gap-1 text-[0.6875rem] text-primary hover:underline font-semibold"
                  >
                    <ExternalLink className="size-3" /> View Cost Sheet
                  </Link>
                </div>
              </>
            ) : (
              <div className="py-4 text-center text-muted-foreground space-y-2">
                <AlertTriangle className="size-5 mx-auto text-amber-500" />
                <p>No Cost Sheet linked to this Production Order.</p>
                <Link to="/cost-sheets" className="text-primary hover:underline text-xs font-semibold">
                  Link Cost Sheet in Order Form →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SECTION E: PRODUCTION PLANNING SUMMARY & READINESS (STEP 25 & 26) */}
      <Card className="border border-border bg-gradient-to-r from-card via-muted/20 to-card shadow-sm">
        <CardContent className="p-3.5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-indigo-600 animate-pulse" />
              <span className="text-xs font-bold tracking-wider uppercase text-foreground">
                PRODUCTION PLANNING SUMMARY & READINESS
              </span>
              <Badge variant="outline" className="text-[0.625rem] font-mono">
                PHASE 1 + 2 + 3 + 3B
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[0.6875rem] text-muted-foreground">Overall Readiness:</span>
              <Badge
                className={`text-xs px-2.5 py-0.5 font-bold ${
                  overallPlanningReadiness === "READY FOR NEXT PHASE"
                    ? "bg-emerald-600 text-white"
                    : overallPlanningReadiness === "PLANNING INCOMPLETE"
                    ? "bg-amber-600 text-white"
                    : overallPlanningReadiness === "REVISION REVIEW REQUIRED"
                    ? "bg-orange-600 text-white"
                    : overallPlanningReadiness === "MATERIAL SHORTAGE"
                    ? "bg-rose-600 text-white"
                    : "bg-orange-500 text-white"
                }`}
              >
                {overallPlanningReadiness}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 text-xs">
            <div className="p-2 rounded bg-muted/40 border border-border/50">
              <span className="text-[0.625rem] text-muted-foreground block">Sales Qty</span>
              <span className="font-mono font-bold text-foreground">
                {(salesOrder ? salesOrder.qty_metre : order.qty_metre).toLocaleString()} MTR
              </span>
            </div>
            <div className="p-2 rounded bg-muted/40 border border-border/50">
              <span className="text-[0.625rem] text-muted-foreground block">Production Qty</span>
              <span className="font-mono font-bold text-foreground">
                {order.qty_metre.toLocaleString()} MTR
              </span>
            </div>
            <div className="p-2 rounded bg-muted/40 border border-border/50">
              <span className="text-[0.625rem] text-muted-foreground block">Material Req</span>
              <span className={`font-semibold text-[0.6875rem] block truncate ${
                summary.overallStatus === "MATERIAL READY" ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"
              }`}>
                {summary.overallStatus}
              </span>
            </div>
            <div className="p-2 rounded bg-muted/40 border border-border/50">
              <span className="text-[0.625rem] text-muted-foreground block">Allocation Status</span>
              <span className={`font-semibold text-[0.6875rem] block truncate ${
                allocationSummary.overallAllocationStatus === "ALLOCATION READY" ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"
              }`}>
                {allocationSummary.overallAllocationStatus}
              </span>
            </div>
            <div className="p-2 rounded bg-muted/40 border border-border/50">
              <span className="text-[0.625rem] text-muted-foreground block">Warp Planning</span>
              <span className="font-semibold text-[0.6875rem] block truncate text-blue-700 dark:text-blue-300">
                {beamAllocPlan
                  ? `Allocated (${beamAllocPlan.beamNo})`
                  : beamProdPlan
                  ? `New Beam Planned`
                  : "Plan Required"}
              </span>
            </div>
            <div className="p-2 rounded bg-indigo-500/10 border border-indigo-500/30">
              <span className="text-[0.625rem] text-indigo-700 dark:text-indigo-300 block font-semibold">Loom Planning</span>
              <span className="font-semibold text-[0.6875rem] block truncate text-indigo-700 dark:text-indigo-300 font-mono">
                {loomPlans.length > 0
                  ? `${loomPlans.length} Loom(s) · ${loomSummary.loomPlannedQty}m`
                  : "Unplanned"}
              </span>
            </div>
            <div className="p-2 rounded bg-muted/40 border border-border/50">
              <span className="text-[0.625rem] text-muted-foreground block">Weft Job Cards</span>
              <span className="font-semibold text-[0.6875rem] block truncate text-purple-700 dark:text-purple-300">
                {orderJobCards.length > 0
                  ? `${jobCardPlans.length} / ${orderJobCards.length} Planned`
                  : "No Job Cards"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5-CARD PLANNING DASHBOARD GRID (Phases 1, 2, 3 & 3B) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* 1. Readiness Summary Banner (Phase 1 Stock Lookup) */}
        <Card className="border border-border">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[0.6875rem] font-bold tracking-wider uppercase text-muted-foreground">
                1. AVAILABILITY
              </span>
              <Badge
                className={`text-[0.625rem] px-1.5 py-0 font-bold ${
                  summary.overallStatus === "MATERIAL READY"
                    ? "bg-emerald-600 text-white"
                    : summary.overallStatus === "MATERIAL SHORTAGE"
                    ? "bg-rose-600 text-white"
                    : summary.overallStatus === "MAPPING REQUIRED"
                    ? "bg-amber-500 text-black font-bold"
                    : "bg-orange-500 text-white"
                }`}
              >
                {summary.overallStatus}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <div className="rounded border border-border bg-card px-2 py-0.5 text-center">
                <span className="block text-[0.5625rem] text-muted-foreground">Total Lines</span>
                <span className="font-mono font-bold text-foreground">{summary.totalLines}</span>
              </div>
              <div className="rounded border border-emerald-500/30 bg-emerald-500/5 px-2 py-0.5 text-center">
                <span className="block text-[0.5625rem] text-emerald-700">Ready</span>
                <span className="font-mono font-bold text-emerald-700">{summary.readyLines}</span>
              </div>
              <div className="rounded border border-rose-500/30 bg-rose-500/5 px-2 py-0.5 text-center">
                <span className="block text-[0.5625rem] text-rose-700">Shortage</span>
                <span className="font-mono font-bold text-rose-700">{summary.shortageLines}</span>
              </div>
              <div className="rounded border border-amber-500/30 bg-amber-500/5 px-2 py-0.5 text-center">
                <span className="block text-[0.5625rem] text-amber-700">Unmapped</span>
                <span className="font-mono font-bold text-amber-700">{summary.unmappedLines}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Allocation Summary Banner (Phase 2 FIFO & Planned Allocation) */}
        <Card className="border border-border">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[0.6875rem] font-bold tracking-wider uppercase text-muted-foreground">
                2. LOT ALLOCATION
              </span>
              <Badge
                className={`text-[0.625rem] px-1.5 py-0 font-bold ${
                  allocationSummary.overallAllocationStatus === "ALLOCATION READY"
                    ? "bg-emerald-600 text-white"
                    : allocationSummary.overallAllocationStatus === "ALLOCATION INCOMPLETE"
                    ? "bg-amber-600 text-white"
                    : "bg-orange-500 text-white"
                }`}
              >
                {allocationSummary.overallAllocationStatus}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <div className="rounded border border-border bg-card px-2 py-0.5 text-center">
                <span className="block text-[0.5625rem] text-muted-foreground">Required</span>
                <span className="font-mono font-bold text-foreground">
                  {allocationSummary.totalRequiredKg.toFixed(1)} kg
                </span>
              </div>
              <div className="rounded border border-primary/30 bg-primary/5 px-2 py-0.5 text-center">
                <span className="block text-[0.5625rem] text-primary">Planned</span>
                <span className="font-mono font-bold text-primary">
                  {allocationSummary.totalPlannedKg.toFixed(1)} kg
                </span>
              </div>
              <div className="rounded border border-border bg-card px-2 py-0.5 text-center">
                <span className="block text-[0.5625rem] text-muted-foreground">Remaining</span>
                <span className="font-mono font-bold text-foreground">
                  {allocationSummary.totalRemainingKg.toFixed(1)} kg
                </span>
              </div>
              <div className="rounded border border-emerald-500/30 bg-emerald-500/5 px-2 py-0.5 text-center">
                <span className="block text-[0.5625rem] text-emerald-700">Fully Allocated</span>
                <span className="font-mono font-bold text-emerald-700">
                  {allocationSummary.fullyAllocatedCount}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Warp & Beam Planning Status Card */}
        <Card className="border border-border">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[0.6875rem] font-bold tracking-wider uppercase text-muted-foreground">
                3. WARP / BEAM PLAN
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsWarpDialogOpen(true)}
                className="h-5 px-1.5 text-[0.625rem] text-blue-600 hover:text-blue-700"
              >
                Configure →
              </Button>
            </div>

            <div className="p-2 rounded bg-blue-500/5 border border-blue-500/20 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[0.625rem] text-muted-foreground">Beam Plan Status:</span>
                <Badge className="bg-blue-600 text-white text-[0.5625rem]">
                  {beamAllocPlan ? "EXISTING BEAM" : beamProdPlan ? "NEW BEAM PLAN" : "NOT PLANNED"}
                </Badge>
              </div>
              <p className="text-[0.6875rem] text-foreground font-semibold truncate">
                {beamAllocPlan
                  ? `Beam ${beamAllocPlan.beamNo} (${beamAllocPlan.plannedUseLengthMetre}m)`
                  : beamProdPlan
                  ? `${beamProdPlan.beamType} (${beamProdPlan.plannedLengthMetre}m)`
                  : "Review beam candidates or draft new beam plan"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 4. Loom Planning Status Card (Phase 3B) */}
        <Card className="border border-border">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[0.6875rem] font-bold tracking-wider uppercase text-muted-foreground">
                4. LOOM PLANNING
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsLoomDialogOpen(true)}
                className="h-5 px-1.5 text-[0.625rem] text-indigo-600 hover:text-indigo-700 font-bold"
              >
                Plan Looms →
              </Button>
            </div>

            <div className="p-2 rounded bg-indigo-500/5 border border-indigo-500/20 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[0.625rem] text-muted-foreground">Loom Status:</span>
                <Badge className="bg-indigo-600 text-white text-[0.5625rem]">
                  {loomSummary.overallLoomPlanningStatus}
                </Badge>
              </div>
              <p className="text-[0.6875rem] text-foreground font-semibold truncate font-mono">
                {loomPlans.length > 0
                  ? `${loomSummary.loomPlannedQty.toLocaleString()}m planned on ${loomPlans.length} loom(s)`
                  : "Allocate production across one or more looms"}
              </p>
              {loomSummary.unplannedQty > 0 && (
                <span className="text-[0.5625rem] text-amber-600 dark:text-amber-400 block font-mono font-semibold">
                  Unplanned: {loomSummary.unplannedQty.toLocaleString()} MTR
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 5. Weft Job Card Planning Status Card */}
        <Card className="border border-border">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[0.6875rem] font-bold tracking-wider uppercase text-muted-foreground">
                5. WEFT JOB CARDS
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsWeftDialogOpen(true)}
                className="h-5 px-1.5 text-[0.625rem] text-purple-600 hover:text-purple-700"
              >
                Configure →
              </Button>
            </div>

            <div className="p-2 rounded bg-purple-500/5 border border-purple-500/20 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[0.625rem] text-muted-foreground">Planned Issues:</span>
                <Badge className="bg-purple-600 text-white text-[0.5625rem]">
                  {orderJobCards.length > 0 ? `${jobCardPlans.length}/${orderJobCards.length} Planned` : "No JCs"}
                </Badge>
              </div>
              <p className="text-[0.6875rem] text-foreground font-semibold truncate">
                {jobCardPlans.length > 0
                  ? `${jobCardPlans.reduce((acc, p) => acc + p.plannedIssueQtyKg, 0).toFixed(1)} kg planned across ${jobCardPlans.length} issue(s)`
                  : "Derive Weft requirement and prepare yarn issue previews"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* REVISION HISTORY FRONTEND SECTION (STEP 5) */}
      {revisions.length > 0 && (
        <Card className="border border-border">
          <CardHeader className="py-2.5 px-3.5 border-b border-border bg-muted/40">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <History className="size-4 text-indigo-600" /> REVISION HISTORY ({revisions.length} Revisions)
              </CardTitle>
              <span className="text-[0.6875rem] text-muted-foreground font-normal">
                Frontend tracking of quantity amendments and material recalculations
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="bg-muted/60 text-muted-foreground font-semibold">
                  <TableHead className="h-8">Revision #</TableHead>
                  <TableHead className="h-8">Date</TableHead>
                  <TableHead className="h-8">Source</TableHead>
                  <TableHead className="h-8 text-right">Previous Qty</TableHead>
                  <TableHead className="h-8 text-right">Revised Qty</TableHead>
                  <TableHead className="h-8 text-right font-bold">Delta Qty</TableHead>
                  <TableHead className="h-8">Reason</TableHead>
                  <TableHead className="h-8">Impact Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revisions.map((rev) => (
                  <TableRow key={rev.id} className="hover:bg-muted/40">
                    <TableCell className="py-2 font-mono font-bold text-indigo-600">
                      Rev #{rev.revisionNo}
                    </TableCell>
                    <TableCell className="py-2 font-mono text-muted-foreground">
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant="outline" className="text-[0.625rem]">
                        {rev.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 text-right font-mono">
                      {rev.previousQty.toLocaleString()} {rev.unit}
                    </TableCell>
                    <TableCell className="py-2 text-right font-mono font-semibold">
                      {rev.revisedQty.toLocaleString()} {rev.unit}
                    </TableCell>
                    <TableCell className="py-2 text-right font-mono">
                      <span
                        className={`font-bold ${
                          rev.deltaQty > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : rev.deltaQty < 0
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {rev.deltaQty > 0 ? `+${rev.deltaQty}` : `${rev.deltaQty}`} {rev.unit}
                      </span>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="font-semibold text-foreground">{rev.reason}</span>
                      {rev.remarks && (
                        <span className="text-[0.625rem] text-muted-foreground block">
                          {rev.remarks}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge
                        className={`text-[0.625rem] ${
                          rev.impactStatus === "AUTO_SYNCED"
                            ? "bg-emerald-600 text-white"
                            : "bg-indigo-600 text-white"
                        }`}
                      >
                        {rev.impactStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* SECTION D: MATERIAL REQUIREMENT & LOT ALLOCATION TABLES (WARP & WEFT) */}
      <div className="space-y-4">
        {/* WARP SECTION */}
        <Card className="border border-border">
          <CardHeader className="py-2.5 px-3.5 border-b border-border bg-muted/40">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Layers className="size-4 text-primary" /> WARP MATERIALS ({warpRequirements.length} Lines)
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsWarpDialogOpen(true)}
                  className="h-6 text-[0.625rem] gap-1 text-blue-600 border-blue-300 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950/40 font-semibold"
                >
                  <Layers className="size-3" /> Warp / Beam Plan
                </Button>
                <span className="hidden sm:inline text-[0.6875rem] text-muted-foreground font-normal">
                  Warp requirements feed beam warping & loom beam loading
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <MaterialRequirementTable
              requirements={warpRequirements}
              showBeamHint={true}
              plansMap={plansMap}
              onOpenAllocation={handleOpenAllocation}
            />
          </CardContent>
        </Card>

        {/* WEFT SECTION */}
        <Card className="border border-border">
          <CardHeader className="py-2.5 px-3.5 border-b border-border bg-muted/40">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Package className="size-4 text-primary" /> WEFT MATERIALS ({weftRequirements.length} Lines)
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsWeftDialogOpen(true)}
                  className="h-6 text-[0.625rem] gap-1 text-purple-600 border-purple-300 hover:bg-purple-50 dark:border-purple-800 dark:hover:bg-purple-950/40 font-semibold"
                >
                  <Package className="size-3" /> Weft Job Card Plan
                </Button>
                <span className="hidden sm:inline text-[0.6875rem] text-muted-foreground font-normal">
                  Weft requirements feed loom pirn/cone issue for job card execution
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <MaterialRequirementTable
              requirements={weftRequirements}
              showBeamHint={false}
              plansMap={plansMap}
              onOpenAllocation={handleOpenAllocation}
            />
          </CardContent>
        </Card>

        {/* LOOM PLANNING SECTION (Phase 3B) */}
        <Card className="border border-border">
          <CardHeader className="py-2.5 px-3.5 border-b border-border bg-muted/40">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Factory className="size-4 text-indigo-600" /> LOOM PLANNING & ALLOCATION ({loomPlans.length} Looms Planned)
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsLoomDialogOpen(true)}
                  className="h-6 text-[0.625rem] gap-1 text-indigo-600 border-indigo-300 hover:bg-indigo-50 dark:border-indigo-800 dark:hover:bg-indigo-950/40 font-semibold"
                >
                  <Factory className="size-3" /> Plan Looms
                </Button>
                <span className="hidden sm:inline text-[0.6875rem] text-muted-foreground font-normal">
                  Allocate order quantity across looms and prepare digital job cards
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loomPlans.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-xs space-y-1">
                <Factory className="size-5 mx-auto text-muted-foreground/60" />
                <p className="font-semibold">No Looms Allocated to this Production Order</p>
                <p className="text-[0.6875rem]">
                  Click <strong>Plan Looms</strong> to distribute {order.qty_metre.toLocaleString()} MTR across available looms.
                </p>
              </div>
            ) : (
              <div className="p-0 overflow-x-auto">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="bg-muted/60 text-muted-foreground font-semibold">
                      <TableHead className="h-8">Loom No.</TableHead>
                      <TableHead className="h-8 text-right font-bold">Planned Qty</TableHead>
                      <TableHead className="h-8">Beam Link</TableHead>
                      <TableHead className="h-8">Warp Readiness</TableHead>
                      <TableHead className="h-8">Weft Readiness</TableHead>
                      <TableHead className="h-8">Planning Status</TableHead>
                      <TableHead className="h-8 text-right">Job Card</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loomPlans.map((plan) => (
                      <TableRow key={plan.id} className="hover:bg-muted/40">
                        <TableCell className="py-2 font-mono font-bold text-foreground">
                          {plan.loomNo}
                        </TableCell>
                        <TableCell className="py-2 text-right font-mono font-bold text-primary">
                          {plan.plannedQty.toLocaleString()} {order.unit || "MTR"}
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
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const preview = ProductionPlanningService.createJobCardPreviewFromLoomPlan(plan);
                              setActiveJobCardPreview(preview);
                              setIsJobCardPreviewOpen(true);
                            }}
                            className="h-6 text-[0.625rem] px-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-bold"
                          >
                            <FileText className="size-3 mr-1" /> Prepare JC
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SECTION E: PRODUCTION RELEASE READINESS & EXECUTION PREPARATION (Phase 4A) */}
        <Card className="border border-border">
          <CardHeader className="py-2.5 px-3.5 border-b border-border bg-muted/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileCheck2 className="size-4 text-emerald-600" />
                <CardTitle className="text-xs font-bold uppercase tracking-wider">
                  PRODUCTION RELEASE READINESS & RELEASE MATRIX (Phase 4A)
                </CardTitle>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsBulkProductionOpen(true)}
                  className="h-6 text-[0.625rem] px-2 border-primary/40 text-primary hover:bg-primary/5 font-semibold gap-1"
                  title="Quick / Bulk Daily Production Entry across active Job Cards"
                >
                  <ListPlus className="size-3" /> Quick Bulk Entry
                </Button>
                <span className="text-[0.6875rem] text-muted-foreground font-normal hidden sm:inline">
                  Order Release Status:
                </span>
                <Badge
                  className={`text-[0.6875rem] font-bold font-mono px-2 py-0.5 ${
                    releaseSummary.overallOrderStatus === "READY FOR EXECUTION PREPARATION"
                      ? "bg-emerald-600 text-white"
                      : releaseSummary.overallOrderStatus === "PARTIALLY READY"
                      ? "bg-blue-600 text-white"
                      : releaseSummary.overallOrderStatus === "REVIEW REQUIRED"
                      ? "bg-rose-600 text-white"
                      : "bg-amber-600 text-white"
                  }`}
                >
                  {releaseSummary.overallOrderStatus}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3.5 space-y-3.5">
            {/* Summary Metrics Bar (Step 9) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 rounded-lg border border-border bg-muted/20 text-xs">
              <div>
                <span className="text-muted-foreground block text-[0.6875rem]">Ready Loom Plans</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {releaseSummary.readyLoomPlansCount}{" "}
                  <span className="text-[0.6875rem] font-normal text-muted-foreground">
                    / {loomPlans.length}
                  </span>
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[0.6875rem]">Blocked Loom Plans</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
                  {releaseSummary.blockedLoomPlansCount}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[0.6875rem]">Ready Qty</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {releaseSummary.readyQtyMetre.toLocaleString()} MTR
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[0.6875rem]">Blocked Qty</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
                  {releaseSummary.blockedQtyMetre.toLocaleString()} MTR
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[0.6875rem]">Unplanned Qty</span>
                <span className="font-mono font-bold text-foreground text-sm">
                  {releaseSummary.unplannedQtyMetre.toLocaleString()} MTR
                </span>
              </div>
            </div>

            {/* Planning Exceptions Bar (Step 36) */}
            <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg border border-border/60 bg-muted/10 text-xs">
              <span className="text-[0.6875rem] font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                <AlertOctagon className="size-3.5 text-amber-500" /> Exceptions:
              </span>
              <Badge
                variant="outline"
                className={`text-[0.625rem] font-mono ${
                  releaseSummary.exceptions.beamPendingCount > 0
                    ? "border-amber-500/40 text-amber-700 bg-amber-500/10"
                    : "border-border text-muted-foreground"
                }`}
              >
                {releaseSummary.exceptions.beamPendingCount} Beam Pending
              </Badge>
              <Badge
                variant="outline"
                className={`text-[0.625rem] font-mono ${
                  releaseSummary.exceptions.materialShortageCount > 0
                    ? "border-rose-500/40 text-rose-700 bg-rose-500/10"
                    : "border-border text-muted-foreground"
                }`}
              >
                {releaseSummary.exceptions.materialShortageCount} Material Shortage
              </Badge>
              <Badge
                variant="outline"
                className={`text-[0.625rem] font-mono ${
                  releaseSummary.exceptions.revisionReviewCount > 0
                    ? "border-rose-500/40 text-rose-700 bg-rose-500/10"
                    : "border-border text-muted-foreground"
                }`}
              >
                {releaseSummary.exceptions.revisionReviewCount} Revision Review
              </Badge>
              <Badge
                variant="outline"
                className={`text-[0.625rem] font-mono ${
                  releaseSummary.exceptions.unmappedMaterialCount > 0
                    ? "border-amber-500/40 text-amber-700 bg-amber-500/10"
                    : "border-border text-muted-foreground"
                }`}
              >
                {releaseSummary.exceptions.unmappedMaterialCount} Unmapped Material
              </Badge>
              <Badge
                variant="outline"
                className={`text-[0.625rem] font-mono ${
                  releaseSummary.exceptions.calculationPendingCount > 0
                    ? "border-amber-500/40 text-amber-700 bg-amber-500/10"
                    : "border-border text-muted-foreground"
                }`}
              >
                {releaseSummary.exceptions.calculationPendingCount} Calculation Pending
              </Badge>
            </div>

            {/* Step 35: Release Matrix Table (Desktop) */}
            {releaseSummary.evaluations.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-xs space-y-1">
                <Factory className="size-5 mx-auto text-muted-foreground/60" />
                <p className="font-semibold">No Loom Plans Available to Evaluate Release Readiness</p>
                <p className="text-[0.6875rem]">
                  Click <strong>Plan Looms</strong> above to allocate looms and generate release candidates.
                </p>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto rounded border border-border">
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow className="bg-muted/60 text-muted-foreground font-semibold">
                        <TableHead className="h-8">Loom</TableHead>
                        <TableHead className="h-8 text-right">Planned Qty</TableHead>
                        <TableHead className="h-8 text-right">Produced / Rem</TableHead>
                        <TableHead className="h-8">Beam Link</TableHead>
                        <TableHead className="h-8">Warp</TableHead>
                        <TableHead className="h-8">Weft</TableHead>
                        <TableHead className="h-8">Material</TableHead>
                        <TableHead className="h-8">Job Card</TableHead>
                        <TableHead className="h-8">Revision</TableHead>
                        <TableHead className="h-8">Readiness</TableHead>
                        <TableHead className="h-8 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {releaseSummary.evaluations.map((ev) => {
                        const targetPlan = loomPlans.find((p) => p.id === ev.loomPlanId);
                        return (
                          <TableRow key={ev.loomPlanId} className="hover:bg-muted/40">
                            <TableCell className="py-2 font-mono font-bold text-foreground">
                              {ev.loomNo}
                            </TableCell>
                            <TableCell className="py-2 text-right font-mono font-bold text-primary">
                              {ev.plannedQtyMetre.toLocaleString()} {order.unit || "MTR"}
                            </TableCell>
                            <TableCell className="py-2 text-right font-mono">
                              {(() => {
                                const lp = ProductionPlanningService.getLoomProductionProgress(ev.loomPlanId, order);
                                return (
                                  <div>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400 block">
                                      {lp.producedToDateMetre.toLocaleString()} MTR
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {lp.remainingQtyMetre.toLocaleString()} rem ({lp.progressPercent}%)
                                    </span>
                                  </div>
                                );
                              })()}
                            </TableCell>
                            <TableCell className="py-2 font-mono text-blue-600 font-semibold">
                              {ev.beamNo || ev.beamType || "—"}
                            </TableCell>
                            <TableCell className="py-2">
                              <Badge
                                variant="outline"
                                className={`text-[0.5625rem] font-mono ${
                                  ev.warpStatus === "WARP READY"
                                    ? "border-emerald-500 text-emerald-700 bg-emerald-50/50"
                                    : "border-amber-500 text-amber-700 bg-amber-50/50"
                                }`}
                              >
                                {ev.warpStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2">
                              <Badge
                                variant="outline"
                                className={`text-[0.5625rem] font-mono ${
                                  ev.weftStatus === "WEFT READY"
                                    ? "border-emerald-500 text-emerald-700 bg-emerald-50/50"
                                    : "border-rose-500 text-rose-700 bg-rose-50/50"
                                }`}
                              >
                                {ev.weftStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2">
                              <Badge
                                variant="outline"
                                className={`text-[0.5625rem] font-mono ${
                                  ev.materialStatus === "READY"
                                    ? "border-emerald-500 text-emerald-700 bg-emerald-50/50"
                                    : "border-rose-500 text-rose-700 bg-rose-50/50"
                                }`}
                              >
                                {ev.materialStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2">
                              <Badge
                                variant="outline"
                                className="text-[0.5625rem] font-mono border-indigo-500 text-indigo-700 bg-indigo-50/50"
                              >
                                {ev.jobCardStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2">
                              <Badge
                                variant="outline"
                                className={`text-[0.5625rem] font-mono ${
                                  ev.revisionStatus === "CLEAR"
                                    ? "border-emerald-500 text-emerald-700"
                                    : "border-rose-500 text-rose-700 bg-rose-50/50"
                                }`}
                              >
                                {ev.revisionStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2">
                              <Badge
                                className={`text-[0.5625rem] font-bold ${
                                  ev.isReady
                                    ? "bg-emerald-600 text-white"
                                    : ev.readinessState === "REVISION_REVIEW_REQUIRED"
                                    ? "bg-rose-600 text-white"
                                    : "bg-amber-600 text-white"
                                }`}
                              >
                                {ev.readinessState}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {ev.isReady ? (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      if (targetPlan) {
                                        setSelectedLoomPlanForRelease(targetPlan);
                                        setIsReleasePreviewOpen(true);
                                      }
                                    }}
                                    className="h-6 text-[0.625rem] px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1"
                                  >
                                    <FileCheck2 className="size-3" /> Prepare Release
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedEvaluationForBlockers(ev);
                                      setIsWhyBlockedOpen(true);
                                    }}
                                    className="h-6 text-[0.625rem] px-2 border-rose-400 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-bold gap-1"
                                  >
                                    <AlertOctagon className="size-3" /> Why Blocked?
                                  </Button>
                                )}

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (targetPlan) {
                                      const draft = ProductionPlanningService.getJobCardDraftFromLoomPlan(
                                        targetPlan,
                                        order
                                      );
                                      setSelectedDraftForView(draft);
                                      setIsJobCardDraftOpen(true);
                                    }
                                  }}
                                  className="h-6 text-[0.625rem] px-2 border-indigo-300 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 font-medium"
                                  title="View/Edit Job Card Draft"
                                >
                                  <FileText className="size-3" /> Draft
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (targetPlan) {
                                      const draft = ProductionPlanningService.getJobCardDraftFromLoomPlan(
                                        targetPlan,
                                        order
                                      );
                                      setSelectedDraftForMaterialPrep(draft);
                                      setIsMaterialIssuePrepOpen(true);
                                    }
                                  }}
                                  className="h-6 text-[0.625rem] px-2 border-purple-300 text-purple-700 dark:text-purple-300 hover:bg-purple-50 font-medium"
                                  title="Material Issue Preparation"
                                >
                                  <PackageCheck className="size-3" /> Issues
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (targetPlan) {
                                      const draft = ProductionPlanningService.getJobCardDraftFromLoomPlan(
                                        targetPlan,
                                        order
                                      );
                                      setSelectedDraftForLedger(draft);
                                      setIsMaterialLedgerOpen(true);
                                    }
                                  }}
                                  className="h-6 text-[0.625rem] px-2 border-emerald-400 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 font-medium"
                                  title="Job Card Material Ledger (Phase 4B)"
                                >
                                  <Layers className="size-3" /> Ledger
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (targetPlan) {
                                      const draft = ProductionPlanningService.getJobCardDraftFromLoomPlan(
                                        targetPlan,
                                        order
                                      );
                                      setSelectedDraftForDailyProduction(draft);
                                      setIsDailyProductionOpen(true);
                                    }
                                  }}
                                  className="h-6 text-[0.625rem] px-2 border-blue-400 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/20 font-medium"
                                  title="Log Daily Production & Track Progress (Phase 4C)"
                                >
                                  <Gauge className="size-3" /> Daily Prod
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (targetPlan) {
                                      const draft = ProductionPlanningService.getJobCardDraftFromLoomPlan(
                                        targetPlan,
                                        order
                                      );
                                      setSelectedDraftForReceive(draft);
                                      setIsJobCardReceiveOpen(true);
                                    }
                                  }}
                                  className="h-6 text-[0.625rem] px-2 border-indigo-400 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 font-medium"
                                  title="Receive Produced Fabric & Form Rolls (Phase 5A Simulation)"
                                >
                                  <PackageCheck className="size-3" /> Receive
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Step 42: Mobile Responsive Release Cards */}
                <div className="grid grid-cols-1 gap-2.5 md:hidden">
                  {releaseSummary.evaluations.map((ev) => {
                    const targetPlan = loomPlans.find((p) => p.id === ev.loomPlanId);
                    return (
                      <div
                        key={ev.loomPlanId}
                        className={`p-3 rounded-lg border text-xs space-y-2.5 ${
                          ev.isReady
                            ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/10"
                            : "border-border bg-card"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-foreground">
                              {ev.loomNo}
                            </span>
                            <Badge
                              className={`text-[0.5625rem] font-bold ${
                                ev.isReady ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"
                              }`}
                            >
                              {ev.readinessState}
                            </Badge>
                          </div>
                          <span className="font-mono font-bold text-primary">
                            {ev.plannedQtyMetre.toLocaleString()} {order.unit || "MTR"}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 text-[0.6875rem] text-muted-foreground">
                          <div>Beam: <strong className="text-foreground">{ev.beamNo || "None"}</strong></div>
                          <div>Warp: <strong className="text-foreground">{ev.warpStatus}</strong></div>
                          <div>Weft: <strong className="text-foreground">{ev.weftStatus}</strong></div>
                          <div>Material: <strong className="text-foreground">{ev.materialStatus}</strong></div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/60">
                          {ev.isReady ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                if (targetPlan) {
                                  setSelectedLoomPlanForRelease(targetPlan);
                                  setIsReleasePreviewOpen(true);
                                }
                              }}
                              className="h-6 text-[0.625rem] bg-emerald-600 text-white font-bold gap-1"
                            >
                              <FileCheck2 className="size-3" /> Prepare Release
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedEvaluationForBlockers(ev);
                                setIsWhyBlockedOpen(true);
                              }}
                              className="h-6 text-[0.625rem] border-rose-400 text-rose-700 font-bold gap-1"
                            >
                              <AlertOctagon className="size-3" /> Why Blocked?
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (targetPlan) {
                                const draft = ProductionPlanningService.getJobCardDraftFromLoomPlan(
                                  targetPlan,
                                  order
                                );
                                setSelectedDraftForView(draft);
                                setIsJobCardDraftOpen(true);
                              }
                            }}
                            className="h-6 text-[0.625rem] text-indigo-700 font-medium"
                          >
                            <FileText className="size-3" /> JC Draft
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (targetPlan) {
                                const draft = ProductionPlanningService.getJobCardDraftFromLoomPlan(
                                  targetPlan,
                                  order
                                );
                                setSelectedDraftForMaterialPrep(draft);
                                setIsMaterialIssuePrepOpen(true);
                              }
                            }}
                            className="h-6 text-[0.625rem] text-purple-700 font-medium"
                          >
                            <PackageCheck className="size-3" /> Issues
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (targetPlan) {
                                const draft = ProductionPlanningService.getJobCardDraftFromLoomPlan(
                                  targetPlan,
                                  order
                                );
                                setSelectedDraftForLedger(draft);
                                setIsMaterialLedgerOpen(true);
                              }
                            }}
                            className="h-6 text-[0.625rem] text-emerald-700 font-medium"
                          >
                            <Layers className="size-3" /> Ledger
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (targetPlan) {
                                const draft = ProductionPlanningService.getJobCardDraftFromLoomPlan(
                                  targetPlan,
                                  order
                                );
                                setSelectedDraftForDailyProduction(draft);
                                setIsDailyProductionOpen(true);
                              }
                            }}
                            className="h-6 text-[0.625rem] text-blue-700 font-medium"
                          >
                            <Gauge className="size-3" /> Daily Prod
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (targetPlan) {
                                const draft = ProductionPlanningService.getJobCardDraftFromLoomPlan(
                                  targetPlan,
                                  order
                                );
                                setSelectedDraftForReceive(draft);
                                setIsJobCardReceiveOpen(true);
                              }
                            }}
                            className="h-6 text-[0.625rem] text-indigo-700 dark:text-indigo-300 font-medium"
                          >
                            <PackageCheck className="size-3" /> Receive
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setIsProcessRoutingOpen(true);
                            }}
                            className="h-6 text-[0.625rem] text-indigo-700 dark:text-indigo-300 font-medium"
                          >
                            <Route className="size-3 mr-1" /> Route Plan
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Disclaimers & Future Actions Bar */}
      <div className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-2">
        <div className="flex items-start gap-2 text-[0.6875rem] text-muted-foreground">
          <Info className="size-4 text-primary shrink-0 mt-0.5" />
          <div>
            <strong>Phase 2 Allocation Planning Notice:</strong> All lot suggestions and planned allocations
            are saved in frontend planning memory. No real inventory reservations, yarn issues, purchase
            requisitions, or database deductions are performed.
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild className="h-7 text-xs gap-1">
              <Link to="/inventory/yarn">
                <ExternalLink className="size-3" /> View Yarn Inventory
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="h-7 text-xs gap-1">
              <Link to="/inventory/beam">
                <ExternalLink className="size-3" /> View Beam Inventory
              </Link>
            </Button>
            {costSheet && (
              <Button variant="outline" size="sm" asChild className="h-7 text-xs gap-1">
                <Link to="/cost-sheets">
                  <ExternalLink className="size-3" /> View Cost Sheet
                </Link>
              </Button>
            )}
          </div>

          {/* Disabled Future Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      disabled
                      size="sm"
                      variant="secondary"
                      className="h-7 text-xs gap-1 opacity-50 cursor-not-allowed"
                    >
                      <Lock className="size-3" /> Reserve Material (Phase 3)
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  Real stock reservation will be enabled after Phase 2 planning approval
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      disabled
                      size="sm"
                      variant="secondary"
                      className="h-7 text-xs gap-1 opacity-50 cursor-not-allowed"
                    >
                      <Lock className="size-3" /> Generate Purchase Requisition
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  Automated yarn purchase requisition scheduled for future procurement phase
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      disabled
                      size="sm"
                      variant="secondary"
                      className="h-7 text-xs gap-1 opacity-50 cursor-not-allowed"
                    >
                      <Lock className="size-3" /> Release Production
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  Production order release requires Phase 3 reservation confirmation
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Material Allocation Drawer/Dialog */}
      <MaterialAllocationDialog
        open={isAllocationDialogOpen}
        onOpenChange={setIsAllocationDialogOpen}
        requirement={selectedReqForAllocation}
        order={order}
        existingPlan={
          selectedReqForAllocation ? plansMap.get(selectedReqForAllocation.id) : null
        }
        onPlanSaved={() => {
          setRefreshKey((k) => k + 1);
        }}
      />

      {/* Production Order Quantity Revision Dialog (Phase 3 Part A) */}
      <ProductionRevisionDialog
        open={isRevisionDialogOpen}
        onOpenChange={setIsRevisionDialogOpen}
        order={order}
        costSheet={costSheet}
        onRevisionApplied={() => {
          setRefreshKey((k) => k + 1);
          onRefresh?.();
        }}
      />

      {/* Warp & Beam Planning Dialog (Phase 3 Part B) */}
      <WarpPlanningDialog
        open={isWarpDialogOpen}
        onOpenChange={setIsWarpDialogOpen}
        order={order}
        warpRequirements={warpRequirements}
        costSheet={costSheet}
        allocationPlans={Array.from(plansMap.values())}
        onPlanUpdated={() => {
          setRefreshKey((k) => k + 1);
        }}
      />

      {/* Weft Job Card Material Planning Dialog (Phase 3 Part C) */}
      <WeftJobCardDialog
        open={isWeftDialogOpen}
        onOpenChange={setIsWeftDialogOpen}
        order={order}
        costSheet={costSheet}
        allocationPlans={Array.from(plansMap.values())}
        onPlanSaved={() => {
          setRefreshKey((k) => k + 1);
        }}
      />

      {/* Loom Planning & Multi-Loom Allocation Dialog (Phase 3B) */}
      <LoomPlanningDialog
        open={isLoomDialogOpen}
        onOpenChange={setIsLoomDialogOpen}
        order={order}
        costSheet={costSheet}
        onPlanUpdated={() => {
          setRefreshKey((k) => k + 1);
          onRefresh?.();
        }}
      />

      {/* Job Card Preparation Preview Dialog (Phase 3B) */}
      <JobCardPreviewDialog
        open={isJobCardPreviewOpen}
        onOpenChange={setIsJobCardPreviewOpen}
        preview={activeJobCardPreview}
        onSaved={() => {
          setRefreshKey((k) => k + 1);
          onRefresh?.();
        }}
      />

      {/* Phase 4A Dialogs */}
      <WhyBlockedDialog
        open={isWhyBlockedOpen}
        onOpenChange={setIsWhyBlockedOpen}
        evaluation={selectedEvaluationForBlockers}
        onNavigateToLoomPlanning={() => setIsLoomDialogOpen(true)}
        onNavigateToWarpPlanning={() => setIsWarpDialogOpen(true)}
      />

      <ProductionReleasePreviewDialog
        open={isReleasePreviewOpen}
        onOpenChange={setIsReleasePreviewOpen}
        loomPlan={selectedLoomPlanForRelease}
        order={order}
        onPreviewSaved={() => {
          setRefreshKey((k) => k + 1);
          onRefresh?.();
        }}
      />

      <JobCardDraftDialog
        open={isJobCardDraftOpen}
        onOpenChange={setIsJobCardDraftOpen}
        draft={selectedDraftForView}
        order={order}
        onOpenMaterialIssuePrep={(draft) => {
          setSelectedDraftForMaterialPrep(draft);
          setIsMaterialIssuePrepOpen(true);
        }}
        onSaved={() => {
          setRefreshKey((k) => k + 1);
          onRefresh?.();
        }}
      />

      <MaterialIssuePrepDialog
        open={isMaterialIssuePrepOpen}
        onOpenChange={setIsMaterialIssuePrepOpen}
        draft={selectedDraftForMaterialPrep}
        order={order}
        onOpenLedger={(draft) => {
          setSelectedDraftForLedger(draft);
          setIsMaterialLedgerOpen(true);
        }}
        onSaved={() => {
          setRefreshKey((k) => k + 1);
          onRefresh?.();
        }}
      />

      <JobCardMaterialLedgerDialog
        open={isMaterialLedgerOpen}
        onOpenChange={setIsMaterialLedgerOpen}
        draft={selectedDraftForLedger}
        order={order}
        onUpdated={() => {
          setRefreshKey((k) => k + 1);
          onRefresh?.();
        }}
      />

      {/* Phase 4C Daily Production & Progress Dialogs */}
      <DailyProductionDialog
        open={isDailyProductionOpen}
        onOpenChange={setIsDailyProductionOpen}
        draft={selectedDraftForDailyProduction}
        order={order}
        onOpenIssuePrep={() => {
          if (selectedDraftForDailyProduction) {
            setSelectedDraftForLedger(selectedDraftForDailyProduction);
            setIsMaterialLedgerOpen(true);
          }
        }}
        onUpdated={() => {
          setRefreshKey((k) => k + 1);
          onRefresh?.();
        }}
      />

      <BulkDailyProductionDialog
        open={isBulkProductionOpen}
        onOpenChange={setIsBulkProductionOpen}
        order={order}
        onSaved={() => {
          setRefreshKey((k) => k + 1);
          onRefresh?.();
        }}
      />

      {/* Phase 5A Job Card Receive & Roll Formation Dialog */}
      <JobCardReceiveDialog
        open={isJobCardReceiveOpen}
        onOpenChange={setIsJobCardReceiveOpen}
        draft={selectedDraftForReceive}
        order={order}
        onUpdated={() => {
          setRefreshKey((k) => k + 1);
          onRefresh?.();
        }}
      />

      {/* Phase 5C Fabric Process Routing Workspace Dialog */}
      <Dialog open={isProcessRoutingOpen} onOpenChange={setIsProcessRoutingOpen}>
        <DialogContent className="max-w-6xl max-h-[92vh] flex flex-col p-4 bg-slate-950 border-slate-800 text-slate-100 shadow-2xl">
          <DialogHeader className="pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <Route className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                  <span>Fabric Process Routing Workspace</span>
                  <Badge variant="outline" className="border-indigo-500/40 text-indigo-300 font-mono text-xs">
                    PO: {order.order_no}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Manage downstream process routes, job work planning & sequencing across all rolls of this order.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pt-2">
            <FabricProcessRoutingWorkspace
              order={order}
              jobCards={orderReceiveSummary.jobCardsSummary.map((jc) => ({
                id: jc.jobCardDraftId,
                jobCardNo: jc.jobCardNo,
                loomNo: jc.loomNo,
              })) as any}
              rolls={allOrderRollDrafts}
              onRefresh={() => {
                setRefreshKey((k) => k + 1);
                onRefresh?.();
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Automated Test Suite Modal */}
      {showTestModal && testResults && (
        <TestSuiteResultsDialog
          open={showTestModal}
          onOpenChange={setShowTestModal}
          results={testResults}
        />
      )}
    </div>
  );
}

/**
 * Reusable Desktop Table + Mobile Cards for Material Requirements with Allocation Tracking
 */
function MaterialRequirementTable({
  requirements,
  showBeamHint,
  plansMap,
  onOpenAllocation,
}: {
  requirements: MaterialRequirement[];
  showBeamHint: boolean;
  plansMap: Map<string, MaterialAllocationPlan>;
  onOpenAllocation: (req: MaterialRequirement) => void;
}) {
  if (!requirements.length) {
    return (
      <div className="py-6 text-center text-muted-foreground text-xs">
        No material lines defined in this section.
      </div>
    );
  }

  return (
    <>
      {/* Desktop & Tablet Table (Hidden on small mobile) */}
      <div className="hidden md:block overflow-x-auto">
        <Table className="text-xs">
          <TableHeader>
            <TableRow className="bg-muted/60 text-muted-foreground font-semibold">
              <TableHead className="h-8">Type</TableHead>
              <TableHead className="h-8">Material / Yarn</TableHead>
              <TableHead className="h-8">Material Code</TableHead>
              <TableHead className="h-8 text-right font-bold text-foreground">Required</TableHead>
              <TableHead className="h-8 text-right">Available</TableHead>
              <TableHead className="h-8 text-right font-bold text-primary">Planned (FIFO)</TableHead>
              <TableHead className="h-8 text-right font-bold">Remaining</TableHead>
              <TableHead className="h-8 text-center">Allocation Status</TableHead>
              <TableHead className="h-8">Traceability</TableHead>
              <TableHead className="h-8 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requirements.map((req) => {
              const plan = plansMap.get(req.id);
              const isAllocatable = req.readiness !== "UNMAPPED" && req.readiness !== "CALCULATION_PENDING";

              return (
                <TableRow key={req.id} className="hover:bg-muted/40">
                  <TableCell className="py-2.5 font-bold font-mono">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[0.625rem] ${
                        req.sourceType === "WARP"
                          ? "bg-blue-500/10 text-blue-700"
                          : "bg-purple-500/10 text-purple-700"
                      }`}
                    >
                      {req.sourceType}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <div className="font-semibold text-foreground">{req.materialName}</div>
                    {showBeamHint && req.beamPlanningHint && (
                      <div className="text-[0.625rem] text-muted-foreground mt-0.5 font-mono">
                        {req.beamPlanningHint}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="py-2.5 font-mono font-bold text-primary">
                    {req.materialCode}
                  </TableCell>
                  <TableCell className="py-2.5 text-right font-mono font-bold text-foreground">
                    {req.requiredQty !== null ? `${req.requiredQty.toFixed(3)} kg` : "—"}
                  </TableCell>
                  <TableCell className="py-2.5 text-right font-mono font-semibold text-foreground">
                    {req.availableQty !== null ? `${req.availableQty.toFixed(3)} kg` : "—"}
                  </TableCell>

                  {/* Planned Quantity */}
                  <TableCell className="py-2.5 text-right font-mono font-bold text-primary">
                    {plan ? (
                      <div className="flex items-center justify-end gap-1">
                        <span>{plan.totalPlannedQty.toFixed(3)} kg</span>
                        {plan.isManualOverride && (
                          <Badge variant="outline" className="text-[0.5625rem] px-1 py-0 text-amber-600 border-amber-500/40">
                            Override
                          </Badge>
                        )}
                        {plan.isStale && (
                          <Badge variant="destructive" className="text-[0.5625rem] px-1 py-0">
                            Stale
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">0.000 kg</span>
                    )}
                  </TableCell>

                  {/* Remaining Quantity */}
                  <TableCell
                    className={`py-2.5 text-right font-mono font-bold ${
                      plan && plan.remainingQty > 0
                        ? "text-rose-600"
                        : plan && plan.remainingQty === 0
                        ? "text-emerald-600"
                        : req.shortageQty && req.shortageQty > 0
                        ? "text-rose-600"
                        : "text-muted-foreground"
                    }`}
                  >
                    {plan
                      ? `${plan.remainingQty.toFixed(3)} kg`
                      : req.requiredQty !== null
                      ? `${req.requiredQty.toFixed(3)} kg`
                      : "—"}
                  </TableCell>

                  {/* Status Badge */}
                  <TableCell className="py-2.5 text-center">
                    {plan ? (
                      <Badge className={`text-[0.625rem] px-2 py-0.5 ${ALLOCATION_STATUS_BADGES[plan.allocationStatus].class}`}>
                        {ALLOCATION_STATUS_BADGES[plan.allocationStatus].label}
                      </Badge>
                    ) : (
                      <Badge className={`text-[0.625rem] px-2 py-0.5 ${READINESS_BADGES[req.readiness].class}`}>
                        {READINESS_BADGES[req.readiness].label}
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell className="py-2.5 text-[0.6875rem] font-mono text-muted-foreground">
                    {req.sourceCostSheetNo} · {req.sourceLineLabel}
                  </TableCell>

                  {/* Actions Column */}
                  <TableCell className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {isAllocatable ? (
                        <Button
                          size="sm"
                          variant={plan ? "outline" : "default"}
                          onClick={() => onOpenAllocation(req)}
                          className="h-6 px-2 text-[0.625rem] gap-1 font-semibold"
                        >
                          <SlidersHorizontal className="size-3" />
                          {plan ? "Edit Plan" : "Plan Allocation"}
                        </Button>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  disabled
                                  size="sm"
                                  variant="secondary"
                                  className="h-6 px-2 text-[0.625rem] opacity-50 cursor-not-allowed"
                                >
                                  {req.readiness === "UNMAPPED" ? "Unmapped" : "Basis Pending"}
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">
                              {req.readiness === "UNMAPPED"
                                ? "Map material to inventory first. No name-based guessing permitted."
                                : "Confirm consumption basis first."}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}

                      <Link
                        to="/inventory/yarn"
                        className="inline-flex items-center gap-0.5 text-[0.6875rem] text-primary hover:underline font-semibold"
                      >
                        <ExternalLink className="size-2.5" /> Stock
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card List (Visible only on mobile) */}
      <div className="md:hidden divide-y divide-border">
        {requirements.map((req) => {
          const plan = plansMap.get(req.id);
          const isAllocatable = req.readiness !== "UNMAPPED" && req.readiness !== "CALCULATION_PENDING";

          return (
            <div key={req.id} className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-[0.6875rem] text-primary font-bold mr-1.5">
                    {req.materialCode}
                  </span>
                  <span className="font-semibold text-foreground text-xs">{req.materialName}</span>
                </div>
                {plan ? (
                  <Badge className={`text-[0.625rem] ${ALLOCATION_STATUS_BADGES[plan.allocationStatus].class}`}>
                    {ALLOCATION_STATUS_BADGES[plan.allocationStatus].label}
                  </Badge>
                ) : (
                  <Badge className={`text-[0.625rem] ${READINESS_BADGES[req.readiness].class}`}>
                    {READINESS_BADGES[req.readiness].label}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[0.6875rem] font-mono bg-muted/30 p-2 rounded">
                <div>
                  <span className="text-muted-foreground">Required: </span>
                  <strong>{req.requiredQty !== null ? `${req.requiredQty.toFixed(2)} kg` : "—"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Available: </span>
                  <span>{req.availableQty !== null ? `${req.availableQty.toFixed(2)} kg` : "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Planned: </span>
                  <strong className="text-primary">{plan ? `${plan.totalPlannedQty.toFixed(2)} kg` : "0.00 kg"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Remaining: </span>
                  <strong className={plan && plan.remainingQty > 0 ? "text-rose-600" : "text-emerald-600"}>
                    {plan ? `${plan.remainingQty.toFixed(2)} kg` : req.requiredQty !== null ? `${req.requiredQty.toFixed(2)} kg` : "—"}
                  </strong>
                </div>
              </div>

              {showBeamHint && req.beamPlanningHint && (
                <div className="text-[0.625rem] text-muted-foreground font-mono">
                  {req.beamPlanningHint}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-[0.625rem] text-muted-foreground">
                  Source: {req.sourceCostSheetNo} · {req.sourceLineLabel}
                </span>

                <div className="flex items-center gap-2">
                  {isAllocatable ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenAllocation(req)}
                      className="h-6 px-2 text-[0.625rem] gap-1 font-semibold"
                    >
                      <SlidersHorizontal className="size-3" />
                      {plan ? "Edit Plan" : "Plan Allocation"}
                    </Button>
                  ) : (
                    <span className="text-[0.625rem] text-muted-foreground italic">
                      {req.readiness === "UNMAPPED" ? "Unmapped" : "Basis Pending"}
                    </span>
                  )}
                  <Link to="/inventory/yarn" className="text-primary hover:underline font-semibold flex items-center gap-1 text-[0.625rem]">
                    <ExternalLink className="size-2.5" /> Stock
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/**
 * Interactive Automated Test Suite Verification Dialog
 */
function TestSuiteResultsDialog({
  open,
  onOpenChange,
  results,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: {
    phase1: Record<string, { pass: boolean; details: string }>;
    phase2: Record<string, { pass: boolean; details: string }>;
    phase3?: Record<string, { pass: boolean; details: string }> | undefined;
    phase3b?: Record<string, { pass: boolean; details: string }> | undefined;
    phase4a?: Record<string, { pass: boolean; details: string }> | undefined;
    phase4b?: Record<string, { pass: boolean; details: string }> | undefined;
    phase4c?: Record<string, { pass: boolean; details: string }> | undefined;
    phase5a?: Record<string, { pass: boolean; details: string }> | undefined;
  };
}) {
  const p1Entries = Object.entries(results.phase1);
  const p2Entries = Object.entries(results.phase2);
  const p3Entries = results.phase3 ? Object.entries(results.phase3) : [];
  const p3bEntries = results.phase3b ? Object.entries(results.phase3b) : [];
  const p4aEntries = results.phase4a ? Object.entries(results.phase4a) : [];
  const p4bEntries = results.phase4b ? Object.entries(results.phase4b) : [];
  const p4cEntries = results.phase4c ? Object.entries(results.phase4c) : [];
  const p5aEntries = results.phase5a ? Object.entries(results.phase5a) : [];

  const allPassed =
    p1Entries.every(([, v]) => v.pass) &&
    p2Entries.every(([, v]) => v.pass) &&
    p3Entries.every(([, v]) => v.pass) &&
    p3bEntries.every(([, v]) => v.pass) &&
    p4aEntries.every(([, v]) => v.pass) &&
    p4bEntries.every(([, v]) => v.pass) &&
    p4cEntries.every(([, v]) => v.pass) &&
    p5aEntries.every(([, v]) => v.pass);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto text-xs">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <FlaskConical className="size-4 text-primary" />
              Automated Test Verification Suite (Phases 1, 2, 3, 3B, 4A & 4B)
            </DialogTitle>
            <Badge
              className={`font-bold ${
                allPassed ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
              }`}
            >
              {allPassed ? "ALL TESTS PASS" : "TEST FAILURES DETECTED"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Phase 1 Tests */}
          <div>
            <h4 className="font-bold text-muted-foreground uppercase text-[0.6875rem] tracking-wider mb-2">
              Phase 1 Verification Tests (Test Cases A through E)
            </h4>
            <div className="space-y-1.5 font-mono text-[0.6875rem]">
              {p1Entries.map(([name, r]) => (
                <div
                  key={name}
                  className={`p-2 rounded border flex items-start justify-between gap-2 ${
                    r.pass
                      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300"
                      : "border-rose-500/30 bg-rose-500/5 text-rose-800 dark:text-rose-300"
                  }`}
                >
                  <div>
                    <strong className="block text-foreground">{name}</strong>
                    <span className="text-muted-foreground">{r.details}</span>
                  </div>
                  <Badge variant={r.pass ? "default" : "destructive"} className="text-[0.5625rem]">
                    {r.pass ? "PASS" : "FAIL"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Phase 2 Tests */}
          <div>
            <h4 className="font-bold text-muted-foreground uppercase text-[0.6875rem] tracking-wider mb-2">
              Phase 2 Allocation & FIFO Tests (Test Cases A through H)
            </h4>
            <div className="space-y-1.5 font-mono text-[0.6875rem]">
              {p2Entries.map(([name, r]) => (
                <div
                  key={name}
                  className={`p-2 rounded border flex items-start justify-between gap-2 ${
                    r.pass
                      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300"
                      : "border-rose-500/30 bg-rose-500/5 text-rose-800 dark:text-rose-300"
                  }`}
                >
                  <div>
                    <strong className="block text-foreground">{name}</strong>
                    <span className="text-muted-foreground">{r.details}</span>
                  </div>
                  <Badge variant={r.pass ? "default" : "destructive"} className="text-[0.5625rem]">
                    {r.pass ? "PASS" : "FAIL"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Phase 3 Tests */}
          {p3Entries.length > 0 && (
            <div>
              <h4 className="font-bold text-muted-foreground uppercase text-[0.6875rem] tracking-wider mb-2">
                Phase 3 Revision, Warp/Beam & Weft Job-Card Tests (Test Cases A through J)
              </h4>
              <div className="space-y-1.5 font-mono text-[0.6875rem]">
                {p3Entries.map(([name, r]) => (
                  <div
                    key={name}
                    className={`p-2 rounded border flex items-start justify-between gap-2 ${
                      r.pass
                        ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300"
                        : "border-rose-500/30 bg-rose-500/5 text-rose-800 dark:text-rose-300"
                    }`}
                  >
                    <div>
                      <strong className="block text-foreground">{name}</strong>
                      <span className="text-muted-foreground">{r.details}</span>
                    </div>
                    <Badge variant={r.pass ? "default" : "destructive"} className="text-[0.5625rem]">
                      {r.pass ? "PASS" : "FAIL"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Phase 3B Tests */}
          {p3bEntries.length > 0 && (
            <div>
              <h4 className="font-bold text-muted-foreground uppercase text-[0.6875rem] tracking-wider mb-2">
                Phase 3B Loom Planning & Job Card Preparation Tests (Test Cases A through J)
              </h4>
              <div className="space-y-1.5 font-mono text-[0.6875rem]">
                {p3bEntries.map(([name, r]) => (
                  <div
                    key={name}
                    className={`p-2 rounded border flex items-start justify-between gap-2 ${
                      r.pass
                        ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300"
                        : "border-rose-500/30 bg-rose-500/5 text-rose-800 dark:text-rose-300"
                    }`}
                  >
                    <div>
                      <strong className="block text-foreground">{name}</strong>
                      <span className="text-muted-foreground">{r.details}</span>
                    </div>
                    <Badge variant={r.pass ? "default" : "destructive"} className="text-[0.5625rem]">
                      {r.pass ? "PASS" : "FAIL"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Phase 4A Tests */}
          {p4aEntries.length > 0 && (
            <div>
              <h4 className="font-bold text-muted-foreground uppercase text-[0.6875rem] tracking-wider mb-2">
                Phase 4A Release Readiness, Job Card Draft & Issue Prep Tests (Test Cases A through L)
              </h4>
              <div className="space-y-1.5 font-mono text-[0.6875rem]">
                {p4aEntries.map(([name, r]) => (
                  <div
                    key={name}
                    className={`p-2 rounded border flex items-start justify-between gap-2 ${
                      r.pass
                        ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300"
                        : "border-rose-500/30 bg-rose-500/5 text-rose-800 dark:text-rose-300"
                    }`}
                  >
                    <div>
                      <strong className="block text-foreground">{name}</strong>
                      <span className="text-muted-foreground">{r.details}</span>
                    </div>
                    <Badge variant={r.pass ? "default" : "destructive"} className="text-[0.5625rem]">
                      {r.pass ? "PASS" : "FAIL"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Phase 4B Tests */}
          {p4bEntries.length > 0 && (
            <div>
              <h4 className="font-bold text-muted-foreground uppercase text-[0.6875rem] tracking-wider mb-2">
                Phase 4B Weft Yarn Issue, Additional Issue & Return Simulation Tests (Test Cases A through L)
              </h4>
              <div className="space-y-1.5 font-mono text-[0.6875rem]">
                {p4bEntries.map(([name, r]) => (
                  <div
                    key={name}
                    className={`p-2 rounded border flex items-start justify-between gap-2 ${
                      r.pass
                        ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300"
                        : "border-rose-500/30 bg-rose-500/5 text-rose-800 dark:text-rose-300"
                    }`}
                  >
                    <div>
                      <strong className="block text-foreground">{name}</strong>
                      <span className="text-muted-foreground">{r.details}</span>
                    </div>
                    <Badge variant={r.pass ? "default" : "destructive"} className="text-[0.5625rem]">
                      {r.pass ? "PASS" : "FAIL"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Phase 4C Tests */}
          {p4cEntries.length > 0 && (
            <div>
              <h4 className="font-bold text-muted-foreground uppercase text-[0.6875rem] tracking-wider mb-2">
                Phase 4C Daily Production, Job Card Progress & Expected Material Position Tests (Test Cases A through M)
              </h4>
              <div className="space-y-1.5 font-mono text-[0.6875rem]">
                {p4cEntries.map(([name, r]) => (
                  <div
                    key={name}
                    className={`p-2 rounded border flex items-start justify-between gap-2 ${
                      r.pass
                        ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300"
                        : "border-rose-500/30 bg-rose-500/5 text-rose-800 dark:text-rose-300"
                    }`}
                  >
                    <div>
                      <strong className="block text-foreground">{name}</strong>
                      <span className="text-muted-foreground">{r.details}</span>
                    </div>
                    <Badge variant={r.pass ? "default" : "destructive"} className="text-[0.5625rem]">
                      {r.pass ? "PASS" : "FAIL"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Phase 5A Tests */}
          {p5aEntries.length > 0 && (
            <div>
              <h4 className="font-bold text-muted-foreground uppercase text-[0.6875rem] tracking-wider mb-2">
                Phase 5A Job Card Receive, Fabric Receipt & Roll Formation Tests (Test Cases A through M)
              </h4>
              <div className="space-y-1.5 font-mono text-[0.6875rem]">
                {p5aEntries.map(([name, r]) => (
                  <div
                    key={name}
                    className={`p-2 rounded border flex items-start justify-between gap-2 ${
                      r.pass
                        ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300"
                        : "border-rose-500/30 bg-rose-500/5 text-rose-800 dark:text-rose-300"
                    }`}
                  >
                    <div>
                      <strong className="block text-foreground">{name}</strong>
                      <span className="text-muted-foreground">{r.details}</span>
                    </div>
                    <Badge variant={r.pass ? "default" : "destructive"} className="text-[0.5625rem]">
                      {r.pass ? "PASS" : "FAIL"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

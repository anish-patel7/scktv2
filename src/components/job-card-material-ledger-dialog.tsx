import React, { useState } from "react";
import {
  PackageCheck,
  History,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  PlusCircle,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Boxes,
  Calendar,
  FileText,
  Clock,
  Sparkles,
  Info,
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
  type JobCardDraft,
  type JobCardMaterialLedger,
  type JobCardExecutionSummary,
  type YarnReturnReason,
} from "@/services/production-planning.service";
import type { ProductionOrder } from "@/lib/production-store";

interface JobCardMaterialLedgerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: JobCardDraft | null;
  order: ProductionOrder | null;
  onUpdated?: () => void;
}

export const JobCardMaterialLedgerDialog: React.FC<JobCardMaterialLedgerDialogProps> = ({
  open,
  onOpenChange,
  draft,
  order,
  onUpdated,
}) => {
  if (!draft || !order) return null;

  // State for Sub-modals
  const [activeModal, setActiveModal] = useState<"NONE" | "INITIAL_ISSUE" | "ADDITIONAL_ISSUE" | "RETURN">("NONE");
  const [selectedMaterialCode, setSelectedMaterialCode] = useState<string>("");

  // Initial / Additional Issue form state
  const [issueLotId, setIssueLotId] = useState<string>("");
  const [issueLotNo, setIssueLotNo] = useState<string>("");
  const [issueQty, setIssueQty] = useState<number>(0);
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().split("T")[0] || "");
  const [issueRemark, setIssueRemark] = useState<string>("");

  // Return form state
  const [returnLotId, setReturnLotId] = useState<string>("UNSPECIFIED");
  const [returnLotNo, setReturnLotNo] = useState<string>("UNSPECIFIED / TO VALIDATE");
  const [returnQty, setReturnQty] = useState<number>(0);
  const [returnDate, setReturnDate] = useState<string>(new Date().toISOString().split("T")[0] || "");
  const [returnReason, setReturnReason] = useState<YarnReturnReason>("Unused Material");
  const [returnRemark, setReturnRemark] = useState<string>("");

  // Reload trigger
  const [refreshCount, setRefreshCount] = useState<number>(0);

  // Derive execution summary and ledgers
  const summary: JobCardExecutionSummary = ProductionPlanningService.getJobCardExecutionSummary(draft, order);
  const prep = ProductionPlanningService.getJobCardMaterialIssuePreparation(draft, order);

  // Status badge styling
  const getStatusBadge = (status: JobCardMaterialLedger["status"]) => {
    switch (status) {
      case "FULLY_ISSUED":
        return <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">FULLY ISSUED</Badge>;
      case "PARTIALLY_ISSUED":
        return <Badge className="bg-amber-600/15 text-amber-700 dark:text-amber-400 border-amber-500/30">PARTIALLY ISSUED</Badge>;
      case "RETURN_PENDING":
        return <Badge className="bg-blue-600/15 text-blue-700 dark:text-blue-400 border-blue-500/30">RETURN PENDING</Badge>;
      case "OVER_ISSUED":
        return <Badge className="bg-rose-600/15 text-rose-700 dark:text-rose-400 border-rose-500/30">OVER ISSUED</Badge>;
      case "SETTLED":
        return <Badge className="bg-purple-600/15 text-purple-700 dark:text-purple-400 border-purple-500/30">SETTLED</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground border-border">NOT ISSUED</Badge>;
    }
  };

  // Open Initial Issue modal
  const handleOpenInitialIssue = (ledger: JobCardMaterialLedger) => {
    setSelectedMaterialCode(ledger.materialCode);
    const line = prep.weftIssuePlan.lines.find((l) => l.materialCode === ledger.materialCode);
    const defaultLot = line?.allocatedLots[0];
    if (defaultLot) {
      setIssueLotId(defaultLot.lotId);
      setIssueLotNo(defaultLot.lotNo);
      setIssueQty(defaultLot.allocatedQtyKg);
    } else {
      setIssueLotId(`lot-${ledger.materialCode}`);
      setIssueLotNo(`LOT-${ledger.materialCode}`);
      setIssueQty(ledger.remainingRequirementKg);
    }
    setIssueDate(new Date().toISOString().split("T")[0] || "");
    setIssueRemark("Initial Yarn Issue Simulation");
    setActiveModal("INITIAL_ISSUE");
  };

  // Open Additional Issue modal
  const handleOpenAdditionalIssue = (ledger: JobCardMaterialLedger) => {
    setSelectedMaterialCode(ledger.materialCode);
    const line = prep.weftIssuePlan.lines.find((l) => l.materialCode === ledger.materialCode);
    const defaultLot = line?.allocatedLots[0];
    if (defaultLot) {
      setIssueLotId(defaultLot.lotId);
      setIssueLotNo(defaultLot.lotNo);
    } else {
      setIssueLotId(`lot-${ledger.materialCode}`);
      setIssueLotNo(`LOT-${ledger.materialCode}`);
    }
    setIssueQty(ledger.remainingRequirementKg);
    setIssueDate(new Date().toISOString().split("T")[0] || "");
    setIssueRemark("Additional Yarn Issue Simulation");
    setActiveModal("ADDITIONAL_ISSUE");
  };

  // Open Return modal
  const handleOpenReturn = (ledger: JobCardMaterialLedger) => {
    setSelectedMaterialCode(ledger.materialCode);
    const line = prep.weftIssuePlan.lines.find((l) => l.materialCode === ledger.materialCode);
    const defaultLot = line?.allocatedLots[0];
    if (defaultLot) {
      setReturnLotId(defaultLot.lotId);
      setReturnLotNo(defaultLot.lotNo);
    } else {
      setReturnLotId("UNSPECIFIED");
      setReturnLotNo("UNSPECIFIED / TO VALIDATE");
    }
    setReturnQty(ledger.excessWithProductionKg > 0 ? ledger.excessWithProductionKg : Math.min(1, ledger.netIssuedQtyKg));
    setReturnDate(new Date().toISOString().split("T")[0] || "");
    setReturnReason("Unused Material");
    setReturnRemark("");
    setActiveModal("RETURN");
  };

  // Save Initial Issue Simulation
  const handleSaveInitialIssue = () => {
    if (!selectedMaterialCode || issueQty <= 0) {
      toast.error("Please enter a valid issue quantity > 0");
      return;
    }

    const res = ProductionPlanningService.createInitialYarnIssueSimulation({
      draft,
      order,
      materialCode: selectedMaterialCode,
      lotId: issueLotId,
      lotNo: issueLotNo,
      qtyKg: issueQty,
      transactionDate: issueDate,
      remark: issueRemark,
    });

    if (!res.success) {
      toast.error(res.error || "Failed to save initial issue simulation");
      return;
    }

    toast.success(`Initial Issue simulated: +${issueQty.toFixed(3)} KG for ${selectedMaterialCode}`);
    setActiveModal("NONE");
    setRefreshCount((c) => c + 1);
    onUpdated?.();
  };

  // Save Additional Issue Simulation
  const handleSaveAdditionalIssue = () => {
    if (!selectedMaterialCode || issueQty <= 0) {
      toast.error("Please enter a valid issue quantity > 0");
      return;
    }

    const res = ProductionPlanningService.createAdditionalYarnIssueSimulation({
      draft,
      order,
      materialCode: selectedMaterialCode,
      lotId: issueLotId,
      lotNo: issueLotNo,
      qtyKg: issueQty,
      transactionDate: issueDate,
      remark: issueRemark,
    });

    if (!res.success) {
      toast.error(res.error || "Failed to save additional issue simulation");
      return;
    }

    toast.success(`Additional Issue simulated: +${issueQty.toFixed(3)} KG for ${selectedMaterialCode}`);
    setActiveModal("NONE");
    setRefreshCount((c) => c + 1);
    onUpdated?.();
  };

  // Save Return Simulation
  const handleSaveReturn = () => {
    if (!selectedMaterialCode || returnQty <= 0) {
      toast.error("Please enter a valid return quantity > 0");
      return;
    }

    if (returnReason === "Other" && (!returnRemark || returnRemark.trim() === "")) {
      toast.error("Remark is required when reason is 'Other'");
      return;
    }

    const res = ProductionPlanningService.createYarnReturnSimulation({
      draft,
      order,
      materialCode: selectedMaterialCode,
      qtyKg: returnQty,
      lotId: returnLotId,
      lotNo: returnLotNo,
      reason: returnReason,
      remark: returnRemark,
      returnDate,
    });

    if (!res.success) {
      toast.error(res.error || "Failed to save yarn return simulation");
      return;
    }

    toast.success(`Yarn Return simulated: -${returnQty.toFixed(3)} KG for ${selectedMaterialCode}`);
    setActiveModal("NONE");
    setRefreshCount((c) => c + 1);
    onUpdated?.();
  };

  // Selected ledger for current modal
  const activeLedger = summary.ledgers.find((l) => l.materialCode === selectedMaterialCode);
  const activeLine = prep.weftIssuePlan.lines.find((l) => l.materialCode === selectedMaterialCode);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="space-y-1.5 pb-2 border-b border-border">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <PackageCheck className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                    <span>Job Card Material Ledger</span>
                    <Badge variant="outline" className="font-mono text-xs border-primary/30 text-primary">
                      {draft.draftCardNo}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Operational WEFT Material Issue, Additional Issue & Yarn Return Ledger (Simulation Only)
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[0.6875rem] font-semibold">
                  Doc: {draft.status}
                </Badge>
                {getStatusBadge(summary.overallStatus as any)}
              </div>
            </div>

            {/* Simulation Warning Alert */}
            <div className="mt-2 p-2.5 rounded-md bg-amber-500/10 border border-amber-500/25 flex items-start gap-2 text-amber-800 dark:text-amber-300 text-xs">
              <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <span className="font-bold">FRONTEND EXECUTION SIMULATION ONLY:</span> No authoritative inventory deductions, physical stock mutations, or backend records are created in Phase 4B. Movements are additive/subtractive in-memory contracts.
              </div>
            </div>
          </DialogHeader>

          {/* Context Header */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-muted/40 border border-border/60 text-xs">
            <div>
              <span className="text-muted-foreground block text-[0.6875rem]">Production Order:</span>
              <span className="font-semibold text-foreground">{draft.productionOrderNo}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[0.6875rem]">Loom No:</span>
              <span className="font-semibold text-foreground">{draft.loomNo} ({draft.loomType})</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[0.6875rem]">Customer / Party:</span>
              <span className="font-semibold text-foreground truncate block">{draft.customerName}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[0.6875rem]">Planned Quantity:</span>
              <span className="font-semibold text-foreground">{draft.plannedQtyMetre.toLocaleString()} MTR</span>
            </div>
          </div>

          {/* Aggregate Execution KPIs */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <div className="p-2.5 rounded-lg bg-card border border-border">
              <span className="text-[0.6875rem] text-muted-foreground block">Expected Weft</span>
              <span className="text-sm font-bold text-foreground">{summary.totalExpectedWeftKg.toFixed(3)} KG</span>
            </div>
            <div className="p-2.5 rounded-lg bg-card border border-border">
              <span className="text-[0.6875rem] text-muted-foreground block">Total Issued</span>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                {summary.ledgers.reduce((acc, l) => acc + l.totalIssuedQtyKg, 0).toFixed(3)} KG
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-card border border-border">
              <span className="text-[0.6875rem] text-muted-foreground block">Returned</span>
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                {summary.ledgers.reduce((acc, l) => acc + l.returnedQtyKg, 0).toFixed(3)} KG
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-card border border-border">
              <span className="text-[0.6875rem] text-muted-foreground block">Net Issued</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{summary.totalNetIssuedWeftKg.toFixed(3)} KG</span>
            </div>
            <div className="p-2.5 rounded-lg bg-card border border-border">
              <span className="text-[0.6875rem] text-muted-foreground block">Remaining Req</span>
              <span className="text-sm font-bold text-rose-600 dark:text-rose-400">{summary.totalRemainingWeftKg.toFixed(3)} KG</span>
            </div>
            <div className="p-2.5 rounded-lg bg-card border border-border">
              <span className="text-[0.6875rem] text-muted-foreground block">Excess with Prod</span>
              <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{summary.totalExcessWeftKg.toFixed(3)} KG</span>
            </div>
          </div>

          {/* Warp Context Read-Only Banner (Step 31) */}
          <div className="p-3 rounded-lg bg-muted/20 border border-dashed border-border/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Boxes className="size-4 text-muted-foreground shrink-0" />
              <div>
                <span className="font-semibold text-foreground">Warp Context (Read-Only): </span>
                <span className="text-muted-foreground">
                  Beam {summary.warpContext.beamNo || summary.warpContext.beamPlanId || "TBD"} &bull; {summary.warpContext.beamReadiness}
                </span>
              </div>
            </div>
            <Badge variant="outline" className="text-[0.625rem] border-muted-foreground/30 text-muted-foreground w-fit">
              Warp routed to Warping/Beam execution only
            </Badge>
          </div>

          {/* Material Ledgers List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="size-3.5 text-primary" /> Weft Material Ledgers
              </h3>
              <span className="text-[0.6875rem] text-muted-foreground">
                Formula: Net = (Initial + Addl) &minus; Returned
              </span>
            </div>

            {summary.ledgers.length === 0 ? (
              <div className="p-4 text-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                No Weft material requirements found for this Job Card.
              </div>
            ) : (
              summary.ledgers.map((ledger) => {
                return (
                  <div
                    key={ledger.materialCode}
                    className="p-3.5 rounded-lg bg-card border border-border shadow-xs space-y-3"
                  >
                    {/* Material Title & Actions Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-primary">{ledger.materialCode}</span>
                          <span className="text-xs font-medium text-foreground">{ledger.materialName}</span>
                          {getStatusBadge(ledger.status)}
                        </div>
                        {ledger.recommendedAction && (
                          <div className="mt-1 text-[0.6875rem] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <Info className="size-3 shrink-0" /> {ledger.recommendedAction}
                          </div>
                        )}
                      </div>

                      {/* Operational Simulation Action Buttons */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {ledger.totalIssuedQtyKg === 0 && (
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                            onClick={() => handleOpenInitialIssue(ledger)}
                          >
                            <ArrowUpRight className="size-3.5" /> Initial Issue
                          </Button>
                        )}

                        {ledger.remainingRequirementKg > 0 && ledger.totalIssuedQtyKg > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-blue-500/40 text-blue-600 hover:bg-blue-500/10 gap-1"
                            onClick={() => handleOpenAdditionalIssue(ledger)}
                          >
                            <PlusCircle className="size-3.5" /> Additional Issue
                          </Button>
                        )}

                        {ledger.netIssuedQtyKg > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-amber-500/40 text-amber-600 hover:bg-amber-500/10 gap-1"
                            onClick={() => handleOpenReturn(ledger)}
                          >
                            <RotateCcw className="size-3.5" /> Yarn Return
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Numeric Ledger Breakdown (Step 5, 23) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-9 gap-1.5 text-center text-xs">
                      <div className="p-1.5 rounded bg-muted/30">
                        <span className="text-[0.625rem] text-muted-foreground block">Expected</span>
                        <span className="font-bold text-foreground">{ledger.expectedQtyKg.toFixed(3)}</span>
                      </div>
                      <div className="p-1.5 rounded bg-muted/30">
                        <span className="text-[0.625rem] text-muted-foreground block">Planned</span>
                        <span className="font-bold text-foreground">{ledger.plannedQtyKg.toFixed(3)}</span>
                      </div>
                      <div className="p-1.5 rounded bg-blue-500/5">
                        <span className="text-[0.625rem] text-muted-foreground block">Initial Issued</span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400">+{ledger.initialIssuedQtyKg.toFixed(3)}</span>
                      </div>
                      <div className="p-1.5 rounded bg-blue-500/5">
                        <span className="text-[0.625rem] text-muted-foreground block">Addl Issued</span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400">+{ledger.additionalIssuedQtyKg.toFixed(3)}</span>
                      </div>
                      <div className="p-1.5 rounded bg-blue-500/10">
                        <span className="text-[0.625rem] text-muted-foreground block">Total Issued</span>
                        <span className="font-bold text-blue-700 dark:text-blue-300">{ledger.totalIssuedQtyKg.toFixed(3)}</span>
                      </div>
                      <div className="p-1.5 rounded bg-amber-500/10">
                        <span className="text-[0.625rem] text-muted-foreground block">Returned</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">&minus;{ledger.returnedQtyKg.toFixed(3)}</span>
                      </div>
                      <div className="p-1.5 rounded bg-emerald-500/10">
                        <span className="text-[0.625rem] text-muted-foreground block">Net Issued</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-300">{ledger.netIssuedQtyKg.toFixed(3)}</span>
                      </div>
                      <div className="p-1.5 rounded bg-rose-500/10">
                        <span className="text-[0.625rem] text-muted-foreground block">Remaining</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400">{ledger.remainingRequirementKg.toFixed(3)}</span>
                      </div>
                      <div className="p-1.5 rounded bg-purple-500/10">
                        <span className="text-[0.625rem] text-muted-foreground block">Excess</span>
                        <span className="font-bold text-purple-600 dark:text-purple-400">{ledger.excessWithProductionKg.toFixed(3)}</span>
                      </div>
                    </div>

                    {/* Transaction History for this material (Step 24) */}
                    {ledger.transactions.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/40">
                        <span className="text-[0.6875rem] font-bold text-muted-foreground flex items-center gap-1 mb-1.5">
                          <History className="size-3 text-primary" /> Movement History (Audit Trail):
                        </span>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-[0.6875rem]">
                            <thead>
                              <tr className="text-muted-foreground border-b border-border/40">
                                <th className="pb-1 font-medium">Date</th>
                                <th className="pb-1 font-medium">Type</th>
                                <th className="pb-1 font-medium">Lot No</th>
                                <th className="pb-1 font-medium text-right">Quantity</th>
                                <th className="pb-1 font-medium">Ref / Reason</th>
                                <th className="pb-1 font-medium">Remark</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20 font-mono">
                              {ledger.transactions.map((tx, idx) => {
                                const isIssue = tx.kind === "ISSUE";
                                return (
                                  <tr key={idx} className="hover:bg-muted/30">
                                    <td className="py-1 text-muted-foreground">
                                      {"transactionDate" in tx ? tx.transactionDate : (tx as any).returnDate}
                                    </td>
                                    <td className="py-1">
                                      {isIssue ? (
                                        <Badge variant="outline" className="text-[0.5625rem] py-0 border-blue-500/30 text-blue-600">
                                          {(tx as any).transactionType.replace("_", " ")}
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-[0.5625rem] py-0 border-amber-500/30 text-amber-600">
                                          RETURN
                                        </Badge>
                                      )}
                                    </td>
                                    <td className="py-1 text-primary font-bold">
                                      {tx.lotNo || "UNSPECIFIED"}
                                    </td>
                                    <td className={`py-1 text-right font-bold ${isIssue ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"}`}>
                                      {isIssue ? `+${tx.qtyKg.toFixed(3)}` : `-${tx.qtyKg.toFixed(3)}`} KG
                                    </td>
                                    <td className="py-1 font-sans text-muted-foreground">
                                      {"reason" in tx ? tx.reason : "Job Card Plan"}
                                    </td>
                                    <td className="py-1 font-sans text-muted-foreground truncate max-w-[150px]">
                                      {tx.remark || "—"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between w-full pt-2 border-t border-border">
            <span className="text-[0.6875rem] text-muted-foreground">
              Phase 4B Weft Material Execution Simulation &bull; Non-destructive ledger
            </span>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* SUB-MODAL 1: INITIAL YARN ISSUE SIMULATION */}
      {/* ========================================================================= */}
      <Dialog
        open={activeModal === "INITIAL_ISSUE"}
        onOpenChange={(isOpen) => {
          if (!isOpen) setActiveModal("NONE");
        }}
      >
        <DialogContent className="max-w-md p-4 sm:p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ArrowUpRight className="size-4 text-emerald-600" />
              <span>Simulate Initial Yarn Issue</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confirm lot allocation and issue quantity for Job Card {draft.draftCardNo}.
            </DialogDescription>
          </DialogHeader>

          {activeLedger && (
            <div className="space-y-3.5 py-1 text-xs">
              {/* Context Summary */}
              <div className="p-2.5 rounded bg-muted/40 border border-border/60 grid grid-cols-2 gap-2 text-[0.6875rem]">
                <div>
                  <span className="text-muted-foreground block">Material:</span>
                  <span className="font-bold text-foreground">{activeLedger.materialCode} ({activeLedger.materialName})</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Loom:</span>
                  <span className="font-semibold text-foreground">{draft.loomNo}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Expected Qty:</span>
                  <span className="font-bold text-foreground">{activeLedger.expectedQtyKg.toFixed(3)} KG</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Planned Qty:</span>
                  <span className="font-bold text-foreground">{activeLedger.plannedQtyKg.toFixed(3)} KG</span>
                </div>
              </div>

              {/* Lot Selector */}
              <div className="space-y-1">
                <label className="text-[0.6875rem] font-semibold text-muted-foreground">Select Planned Lot:</label>
                {activeLine && activeLine.allocatedLots.length > 0 ? (
                  <Select
                    value={issueLotId}
                    onValueChange={(val) => {
                      setIssueLotId(val);
                      const selected = activeLine.allocatedLots.find((l) => l.lotId === val);
                      if (selected) {
                        setIssueLotNo(selected.lotNo);
                        setIssueQty(selected.allocatedQtyKg);
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Choose Lot" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeLine.allocatedLots.map((lot) => (
                        <SelectItem key={lot.lotId} value={lot.lotId} className="text-xs">
                          {lot.lotNo} ({lot.locationBin || "Bin"}) &mdash; {lot.allocatedQtyKg.toFixed(3)} KG planned
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={issueLotNo}
                    onChange={(e) => {
                      setIssueLotNo(e.target.value);
                      setIssueLotId(e.target.value);
                    }}
                    placeholder="Lot Number"
                    className="h-8 text-xs font-mono"
                  />
                )}
              </div>

              {/* Issue Qty Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[0.6875rem] font-semibold text-muted-foreground">Issue Quantity (KG):</label>
                  <span className="text-[0.6875rem] text-muted-foreground">Max: {activeLedger.expectedQtyKg.toFixed(3)} KG</span>
                </div>
                <Input
                  type="number"
                  step="0.001"
                  min="0.001"
                  max={activeLedger.expectedQtyKg}
                  value={issueQty}
                  onChange={(e) => setIssueQty(parseFloat(e.target.value) || 0)}
                  className="h-8 text-xs font-bold font-mono"
                />
              </div>

              {/* Date & Remark */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[0.6875rem] font-semibold text-muted-foreground">Issue Date:</label>
                  <Input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[0.6875rem] font-semibold text-muted-foreground">Remark:</label>
                  <Input
                    value={issueRemark}
                    onChange={(e) => setIssueRemark(e.target.value)}
                    placeholder="Optional remark"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setActiveModal("NONE")}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveInitialIssue}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Save Issue Simulation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* SUB-MODAL 2: ADDITIONAL YARN ISSUE SIMULATION */}
      {/* ========================================================================= */}
      <Dialog
        open={activeModal === "ADDITIONAL_ISSUE"}
        onOpenChange={(isOpen) => {
          if (!isOpen) setActiveModal("NONE");
        }}
      >
        <DialogContent className="max-w-md p-4 sm:p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <PlusCircle className="size-4 text-blue-600" />
              <span>Simulate Additional Yarn Issue</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Issue remaining requirement for material {selectedMaterialCode}. Over-issue is blocked.
            </DialogDescription>
          </DialogHeader>

          {activeLedger && (
            <div className="space-y-3.5 py-1 text-xs">
              <div className="p-2.5 rounded bg-muted/40 border border-border/60 grid grid-cols-3 gap-2 text-center text-[0.6875rem]">
                <div>
                  <span className="text-muted-foreground block">Expected Qty:</span>
                  <span className="font-bold text-foreground">{activeLedger.expectedQtyKg.toFixed(3)} KG</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Net Issued:</span>
                  <span className="font-bold text-blue-600">{activeLedger.netIssuedQtyKg.toFixed(3)} KG</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Remaining:</span>
                  <span className="font-bold text-rose-600">{activeLedger.remainingRequirementKg.toFixed(3)} KG</span>
                </div>
              </div>

              {/* Lot Selector */}
              <div className="space-y-1">
                <label className="text-[0.6875rem] font-semibold text-muted-foreground">Issue Lot:</label>
                {activeLine && activeLine.allocatedLots.length > 0 ? (
                  <Select
                    value={issueLotId}
                    onValueChange={(val) => {
                      setIssueLotId(val);
                      const selected = activeLine.allocatedLots.find((l) => l.lotId === val);
                      if (selected) setIssueLotNo(selected.lotNo);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Choose Lot" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeLine.allocatedLots.map((lot) => (
                        <SelectItem key={lot.lotId} value={lot.lotId} className="text-xs">
                          {lot.lotNo} ({lot.locationBin || "Bin"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={issueLotNo}
                    onChange={(e) => {
                      setIssueLotNo(e.target.value);
                      setIssueLotId(e.target.value);
                    }}
                    placeholder="Lot Number"
                    className="h-8 text-xs font-mono"
                  />
                )}
              </div>

              {/* Issue Qty Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[0.6875rem] font-semibold text-muted-foreground">Additional Quantity (KG):</label>
                  <span className="text-[0.6875rem] text-muted-foreground">Max: {activeLedger.remainingRequirementKg.toFixed(3)} KG</span>
                </div>
                <Input
                  type="number"
                  step="0.001"
                  min="0.001"
                  max={activeLedger.remainingRequirementKg}
                  value={issueQty}
                  onChange={(e) => setIssueQty(parseFloat(e.target.value) || 0)}
                  className="h-8 text-xs font-bold font-mono"
                />
              </div>

              {/* Over-issue Notice */}
              <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[0.6875rem]">
                <span className="font-semibold">Over-Issue Rule:</span> Whole cone/package over-issue tolerance is not configured. Quantity cannot exceed remaining requirement ({activeLedger.remainingRequirementKg.toFixed(3)} KG).
              </div>

              {/* Date & Remark */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[0.6875rem] font-semibold text-muted-foreground">Issue Date:</label>
                  <Input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[0.6875rem] font-semibold text-muted-foreground">Remark:</label>
                  <Input
                    value={issueRemark}
                    onChange={(e) => setIssueRemark(e.target.value)}
                    placeholder="Optional remark"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setActiveModal("NONE")}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAdditionalIssue}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              Save Additional Issue Simulation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* SUB-MODAL 3: YARN RETURN SIMULATION */}
      {/* ========================================================================= */}
      <Dialog
        open={activeModal === "RETURN"}
        onOpenChange={(isOpen) => {
          if (!isOpen) setActiveModal("NONE");
        }}
      >
        <DialogContent className="max-w-md p-4 sm:p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <RotateCcw className="size-4 text-amber-600" />
              <span>Simulate Yarn Return</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Return unconsumed or excess material to store for {selectedMaterialCode}.
            </DialogDescription>
          </DialogHeader>

          {activeLedger && (
            <div className="space-y-3.5 py-1 text-xs">
              <div className="p-2.5 rounded bg-muted/40 border border-border/60 grid grid-cols-3 gap-2 text-center text-[0.6875rem]">
                <div>
                  <span className="text-muted-foreground block">Total Issued:</span>
                  <span className="font-bold text-foreground">{activeLedger.totalIssuedQtyKg.toFixed(3)} KG</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Net Issued:</span>
                  <span className="font-bold text-foreground">{activeLedger.netIssuedQtyKg.toFixed(3)} KG</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Max Returnable:</span>
                  <span className="font-bold text-amber-600">{activeLedger.netIssuedQtyKg.toFixed(3)} KG</span>
                </div>
              </div>

              {/* Lot Selector */}
              <div className="space-y-1">
                <label className="text-[0.6875rem] font-semibold text-muted-foreground">Return Lot:</label>
                {activeLine && activeLine.allocatedLots.length > 0 ? (
                  <Select
                    value={returnLotId}
                    onValueChange={(val) => {
                      setReturnLotId(val);
                      const selected = activeLine.allocatedLots.find((l) => l.lotId === val);
                      setReturnLotNo(selected ? selected.lotNo : "UNSPECIFIED / TO VALIDATE");
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Choose Lot" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeLine.allocatedLots.map((lot) => (
                        <SelectItem key={lot.lotId} value={lot.lotId} className="text-xs">
                          {lot.lotNo} ({lot.locationBin || "Bin"})
                        </SelectItem>
                      ))}
                      <SelectItem value="UNSPECIFIED" className="text-xs italic text-muted-foreground">
                        UNSPECIFIED / TO VALIDATE
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={returnLotNo}
                    onChange={(e) => {
                      setReturnLotNo(e.target.value);
                      setReturnLotId(e.target.value);
                    }}
                    placeholder="Lot Number"
                    className="h-8 text-xs font-mono"
                  />
                )}
                {returnLotId === "UNSPECIFIED" && (
                  <span className="text-[0.625rem] text-amber-600 dark:text-amber-400 block italic">
                    LOT TRACEABILITY REQUIRED FOR REAL BACKEND
                  </span>
                )}
              </div>

              {/* Return Qty Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[0.6875rem] font-semibold text-muted-foreground">Return Quantity (KG):</label>
                  <span className="text-[0.6875rem] text-muted-foreground">Limit: &le; {activeLedger.netIssuedQtyKg.toFixed(3)} KG</span>
                </div>
                <Input
                  type="number"
                  step="0.001"
                  min="0.001"
                  max={activeLedger.netIssuedQtyKg}
                  value={returnQty}
                  onChange={(e) => setReturnQty(parseFloat(e.target.value) || 0)}
                  className="h-8 text-xs font-bold font-mono"
                />
              </div>

              {/* Controlled Reason Dropdown (Step 18) */}
              <div className="space-y-1">
                <label className="text-[0.6875rem] font-semibold text-muted-foreground">Return Reason:</label>
                <Select
                  value={returnReason}
                  onValueChange={(val: YarnReturnReason) => setReturnReason(val)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Unused Material">Unused Material</SelectItem>
                    <SelectItem value="Excess Issue">Excess Issue</SelectItem>
                    <SelectItem value="Order Quantity Reduced">Order Quantity Reduced</SelectItem>
                    <SelectItem value="Job Completed">Job Completed</SelectItem>
                    <SelectItem value="Loom Change">Loom Change</SelectItem>
                    <SelectItem value="Quality Concern">Quality Concern</SelectItem>
                    <SelectItem value="Wrong Material">Wrong Material</SelectItem>
                    <SelectItem value="Other">Other (Remark Required)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date & Remark */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[0.6875rem] font-semibold text-muted-foreground">Return Date:</label>
                  <Input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[0.6875rem] font-semibold text-muted-foreground">
                    Remark {returnReason === "Other" && <span className="text-rose-500">*</span>}:
                  </label>
                  <Input
                    value={returnRemark}
                    onChange={(e) => setReturnRemark(e.target.value)}
                    placeholder={returnReason === "Other" ? "Required for 'Other'" : "Optional remark"}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setActiveModal("NONE")}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveReturn}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              Save Return Simulation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

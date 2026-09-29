import React, { useState, useMemo } from "react";
import {
  Route,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ShieldAlert,
  AlertTriangle,
  Info,
  Building2,
  Cpu,
  Layers,
  Sparkles,
  ArrowRight,
  ClipboardCheck,
  Send,
  Eye,
  FileCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FabricProcessRoutingService,
  type FabricProcessRouteStatus,
  type FabricProcessRouteDecision,
  type FabricProcessRoutePlan,
} from "@/services/fabric-process-routing.service";
import {
  FabricProcessExecutionService,
  type FabricProcessIssuePreparation,
} from "@/services/fabric-process-execution.service";
import {
  ProductionPlanningService,
  type FabricRollDraft,
  type RollQualitySummary,
  type JobCardDraft,
} from "@/services/production-planning.service";
import type { ProductionOrder } from "@/lib/production-store";
import { FabricProcessRouteDialog } from "@/components/fabric-process-route-dialog";
import { FabricProcessIssueDialog } from "@/components/fabric-process-issue-dialog";
import { FabricProcessBatchDialog } from "@/components/fabric-process-batch-dialog";

interface FabricProcessRoutingWorkspaceProps {
  order?: ProductionOrder | null;
  jobCards?: JobCardDraft[];
  rolls: FabricRollDraft[];
  onRefresh?: () => void;
}

const ROUTE_STATUS_BADGES: Record<FabricProcessRouteStatus, { label: string; class: string; icon: any }> = {
  READY: { label: "READY", class: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10", icon: CheckCircle2 },
  PLANNED: { label: "PLANNED", class: "border-blue-500/40 text-blue-300 bg-blue-500/10", icon: Info },
  BLOCKED: { label: "BLOCKED", class: "border-rose-500/40 text-rose-300 bg-rose-500/10", icon: ShieldAlert },
  REVIEW_REQUIRED: { label: "REVIEW REQUIRED", class: "border-amber-500/40 text-amber-300 bg-amber-500/10", icon: AlertTriangle },
  NOT_PLANNED: { label: "NOT PLANNED", class: "border-slate-700 text-slate-400 bg-slate-900", icon: Clock },
};

export function FabricProcessRoutingWorkspace({
  order,
  jobCards = [],
  rolls,
  onRefresh,
}: FabricProcessRoutingWorkspaceProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dispositionFilter, setDispositionFilter] = useState<string>("ALL");
  const [executionFilter, setExecutionFilter] = useState<string>("ALL");

  // Selection states for dialogs
  const [selectedRollForRouting, setSelectedRollForRouting] = useState<FabricRollDraft | null>(null);
  const [isRouteDialogOpen, setIsRouteDialogOpen] = useState<boolean>(false);

  const [selectedRollForIssue, setSelectedRollForIssue] = useState<FabricRollDraft | null>(null);
  const [isIssueDialogOpen, setIsIssueDialogOpen] = useState<boolean>(false);

  const [selectedRollIdsForBatch, setSelectedRollIdsForBatch] = useState<Set<string>>(new Set());
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState<boolean>(false);

  // Overall Routing KPIs
  const orderSummary = useMemo(() => {
    return FabricProcessRoutingService.getProductionOrderRoutingSummary(rolls);
  }, [rolls]);

  // Overall Execution Preparation KPIs
  const executionSummary = useMemo(() => {
    return FabricProcessExecutionService.getExecutionWorkspaceSummary(rolls);
  }, [rolls]);

  // Roll-level augmented data
  const augmentedRolls = useMemo(() => {
    return rolls.map((roll) => {
      const qSummary = ProductionPlanningService.getRollQualitySummary(roll);
      const rSummary = FabricProcessRoutingService.getRollRoutingSummary(roll);
      const plan = rSummary.routePlan;
      const currentStep = rSummary.currentStep;
      const activePrep = FabricProcessExecutionService.getActivePreparationForRoll(roll.id);

      // Check staleness if prep exists
      const staleness = activePrep
        ? FabricProcessExecutionService.checkAndMarkPreparationStaleness(activePrep.id, roll)
        : { isStale: false };

      const isReadyToPrepare = currentStep?.status === "READY" && !activePrep;
      const isPrepared = activePrep?.status === "PREPARED";
      const isPrepReviewRequired = staleness.isStale || activePrep?.status === "REVIEW_REQUIRED";

      return {
        roll,
        qSummary,
        rSummary,
        plan,
        currentStep,
        activePrep,
        isReadyToPrepare,
        isPrepared,
        isPrepReviewRequired,
      };
    });
  }, [rolls]);

  // Filtered rows
  const filteredRolls = useMemo(() => {
    return augmentedRolls.filter(({ roll, qSummary, rSummary, plan, isReadyToPrepare, isPrepared, isPrepReviewRequired }) => {
      // Search filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesRoll = roll.temporaryRollNo.toLowerCase().includes(term);
        const matchesOrder = order?.order_no ? order.order_no.toLowerCase().includes(term) : false;
        const matchesItem = order?.item_code ? order.item_code.toLowerCase().includes(term) : false;
        if (!matchesRoll && !matchesOrder && !matchesItem) return false;
      }

      // Status filter
      if (statusFilter !== "ALL") {
        if (statusFilter === "NO_FURTHER_PROCESS") {
          if (rSummary.routeDecision !== "NO_FURTHER_PROCESS") return false;
        } else if (rSummary.routeStatus !== statusFilter) {
          return false;
        }
      }

      // Disposition filter
      if (dispositionFilter !== "ALL") {
        if (qSummary.disposition !== dispositionFilter) return false;
      }

      // Execution preparation filter
      if (executionFilter !== "ALL") {
        if (executionFilter === "READY_TO_PREPARE" && !isReadyToPrepare) return false;
        if (executionFilter === "PREPARED" && !isPrepared) return false;
        if (executionFilter === "REVIEW_REQUIRED" && !isPrepReviewRequired) return false;
      }

      return true;
    });
  }, [augmentedRolls, searchTerm, statusFilter, dispositionFilter, executionFilter, order]);

  // Handle batch selection toggle
  const handleToggleSelectRollForBatch = (rollId: string) => {
    const next = new Set(selectedRollIdsForBatch);
    if (next.has(rollId)) {
      next.delete(rollId);
    } else {
      next.add(rollId);
    }
    setSelectedRollIdsForBatch(next);
  };

  const handleSelectAllReadyForBatch = () => {
    const readyRollIds = augmentedRolls
      .filter((r) => r.isReadyToPrepare)
      .map((r) => r.roll.id);

    if (selectedRollIdsForBatch.size === readyRollIds.length) {
      setSelectedRollIdsForBatch(new Set());
    } else {
      setSelectedRollIdsForBatch(new Set(readyRollIds));
    }
  };

  const handleOpenRouting = (roll: FabricRollDraft) => {
    setSelectedRollForRouting(roll);
    setIsRouteDialogOpen(true);
  };

  const handleOpenIssuePreparation = (roll: FabricRollDraft) => {
    setSelectedRollForIssue(roll);
    setIsIssueDialogOpen(true);
  };

  const selectedBatchRolls = useMemo(() => {
    return rolls.filter((r) => selectedRollIdsForBatch.has(r.id));
  }, [rolls, selectedRollIdsForBatch]);

  return (
    <div className="space-y-4">
      {/* Traceability Breadcrumb (Step 31 & 47) */}
      <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5 font-mono text-[11px] overflow-x-auto py-0.5">
          <span className="text-slate-500">Sales Order</span>
          <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
          <span className="text-slate-400">Production Order ({order?.order_no || "PO"})</span>
          <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
          <span className="text-slate-400">Job Card</span>
          <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
          <span className="text-slate-400">Fabric Receipt</span>
          <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
          <span className="text-slate-400">Roll Quality</span>
          <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
          <span className="text-indigo-300 font-semibold">Process Route</span>
          <ArrowRight className="w-3 h-3 text-indigo-500 shrink-0" />
          <span className="text-emerald-300 font-bold">Process Issue / JW Outward</span>
        </div>
        <span className="text-[10px] text-slate-500 hidden lg:inline">Phase 5D Frontend Preparation Only</span>
      </div>

      {/* KPI Cards: Routing & Execution Statuses (Step 44) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-3">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Rolls</span>
            <span className="text-xl font-bold font-mono text-white">{orderSummary.totalRolls}</span>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-emerald-500/20">
          <CardContent className="p-3">
            <span className="text-[10px] text-emerald-400 uppercase font-semibold block">Ready to Prepare</span>
            <span className="text-xl font-bold font-mono text-emerald-300">{executionSummary.readyForPreparationCount}</span>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-cyan-500/20">
          <CardContent className="p-3">
            <span className="text-[10px] text-cyan-400 uppercase font-semibold block">Prepared</span>
            <span className="text-xl font-bold font-mono text-cyan-300">{executionSummary.preparedCount}</span>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-3">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">No Issue Req.</span>
            <span className="text-xl font-bold font-mono text-slate-300">{executionSummary.noFurtherProcessCount}</span>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-3">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Waiting Previous</span>
            <span className="text-xl font-bold font-mono text-slate-400">{executionSummary.waitingPreviousCount}</span>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-amber-500/20">
          <CardContent className="p-3">
            <span className="text-[10px] text-amber-400 uppercase font-semibold block">Review Required</span>
            <span className="text-xl font-bold font-mono text-amber-300">{executionSummary.reviewRequiredCount}</span>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar & Batch Trigger */}
      <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-1 items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Roll No, Order, Item..."
              className="h-8 pl-8 text-xs bg-slate-950 border-slate-800 text-white placeholder:text-slate-600"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-300 w-36">
              <SelectValue placeholder="Route Status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-xs text-slate-200">
              <SelectItem value="ALL">All Route Statuses</SelectItem>
              <SelectItem value="NOT_PLANNED">Not Planned</SelectItem>
              <SelectItem value="READY">Ready</SelectItem>
              <SelectItem value="PLANNED">Planned</SelectItem>
              <SelectItem value="NO_FURTHER_PROCESS">No Further Process</SelectItem>
              <SelectItem value="BLOCKED">Blocked</SelectItem>
              <SelectItem value="REVIEW_REQUIRED">Review Required</SelectItem>
            </SelectContent>
          </Select>

          <Select value={executionFilter} onValueChange={setExecutionFilter}>
            <SelectTrigger className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-300 w-40">
              <SelectValue placeholder="Execution State" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-xs text-slate-200">
              <SelectItem value="ALL">All Execution States</SelectItem>
              <SelectItem value="READY_TO_PREPARE">Ready to Prepare</SelectItem>
              <SelectItem value="PREPARED">Prepared</SelectItem>
              <SelectItem value="REVIEW_REQUIRED">Review Required</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Batch action button (Steps 33-40) */}
        <div className="flex items-center gap-2 justify-end">
          {selectedRollIdsForBatch.size > 0 && (
            <span className="text-[11px] text-indigo-300 font-mono">
              {selectedRollIdsForBatch.size} roll{selectedRollIdsForBatch.size > 1 ? "s" : ""} selected
            </span>
          )}

          <Button
            size="sm"
            disabled={selectedRollIdsForBatch.size < 2}
            onClick={() => setIsBatchDialogOpen(true)}
            className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Prepare Batch ({selectedRollIdsForBatch.size})</span>
          </Button>
        </div>
      </div>

      {/* Desktop / Tablet Table View (Step 45, 48, 49) */}
      <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900 hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-2.5 px-3 w-8 text-center">
                  <Checkbox
                    checked={
                      selectedRollIdsForBatch.size > 0 &&
                      selectedRollIdsForBatch.size ===
                        augmentedRolls.filter((r) => r.isReadyToPrepare).length
                    }
                    onCheckedChange={handleSelectAllReadyForBatch}
                    className="border-slate-700 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                  />
                </th>
                <th className="py-2.5 px-3">Roll No</th>
                <th className="py-2.5 px-3">Qty (MTR)</th>
                <th className="py-2.5 px-3">QC Status</th>
                <th className="py-2.5 px-3">Route Step</th>
                <th className="py-2.5 px-3">Next Process</th>
                <th className="py-2.5 px-3">Mode & Processor</th>
                <th className="py-2.5 px-3">Execution State</th>
                <th className="py-2.5 px-3 text-center">Route Action</th>
                <th className="py-2.5 px-3 text-center">Execution Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredRolls.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-500 font-sans">
                    No fabric rolls match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredRolls.map(
                  ({
                    roll,
                    qSummary,
                    rSummary,
                    plan,
                    currentStep,
                    activePrep,
                    isReadyToPrepare,
                    isPrepared,
                    isPrepReviewRequired,
                  }) => {
                    const statusMeta =
                      ROUTE_STATUS_BADGES[rSummary.routeStatus] || ROUTE_STATUS_BADGES.NOT_PLANNED;
                    const StatusIcon = statusMeta.icon;

                    const isHold = qSummary.disposition === "HOLD";
                    const isRework = qSummary.disposition === "REWORK";
                    const isNoFurther = rSummary.routeDecision === "NO_FURTHER_PROCESS";
                    const isExternal = currentStep?.executionMode === "EXTERNAL_JOBWORK";
                    const isInternal = currentStep?.executionMode === "INTERNAL";

                    return (
                      <tr key={roll.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3 text-center">
                          {isReadyToPrepare ? (
                            <Checkbox
                              checked={selectedRollIdsForBatch.has(roll.id)}
                              onCheckedChange={() => handleToggleSelectRollForBatch(roll.id)}
                              className="border-slate-700 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                            />
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-indigo-300">
                          {roll.temporaryRollNo}
                        </td>
                        <td className="py-2.5 px-3 text-white font-bold">
                          {roll.qtyMetre.toFixed(3)}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge
                            variant="outline"
                            className="border-slate-700 text-slate-300 text-[10px]"
                          >
                            {qSummary.proposedGrade} · {qSummary.disposition}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 font-sans text-[11px]">
                          {isNoFurther ? (
                            <span className="text-slate-500 italic">No Further Process</span>
                          ) : plan && plan.steps.length > 0 ? (
                            <span className="text-slate-300">
                              Step {currentStep ? currentStep.sequence : 1} of {plan.steps.length}
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-[11px]">
                          {currentStep ? (
                            <span className="text-white font-medium truncate block max-w-[140px]" title={currentStep.processName}>
                              {currentStep.processName}
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-[11px]">
                          {currentStep ? (
                            <div>
                              <Badge
                                variant="outline"
                                className={`text-[9px] ${
                                  isExternal
                                    ? "border-cyan-500/40 text-cyan-300"
                                    : "border-indigo-500/40 text-indigo-300"
                                }`}
                              >
                                {isExternal ? "EXTERNAL" : "INTERNAL"}
                              </Badge>
                              {isExternal && currentStep.jobPartyName && (
                                <span className="text-slate-400 text-[10px] block truncate max-w-[140px]" title={currentStep.jobPartyName}>
                                  {currentStep.jobPartyName}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {isPrepReviewRequired ? (
                            <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-500/10 text-[10px] flex items-center gap-1 w-fit">
                              <AlertTriangle className="w-3 h-3" />
                              Review Req
                            </Badge>
                          ) : isPrepared ? (
                            <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-500/10 text-[10px] flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3" />
                              PREPARED
                            </Badge>
                          ) : isReadyToPrepare ? (
                            <Badge variant="outline" className="border-indigo-500/40 text-indigo-300 bg-indigo-500/10 text-[10px] flex items-center gap-1 w-fit">
                              <Clock className="w-3 h-3" />
                              READY
                            </Badge>
                          ) : isNoFurther ? (
                            <span className="text-slate-500 text-[10px] italic">No Issue Req</span>
                          ) : currentStep?.status === "WAITING_PREVIOUS" ? (
                            <span className="text-slate-500 text-[10px]">Wait Step {currentStep.sequence - 1}</span>
                          ) : isHold ? (
                            <Badge variant="outline" className="border-rose-500/40 text-rose-300 text-[10px]">
                              HOLD
                            </Badge>
                          ) : (
                            <span className="text-slate-600 text-[10px]">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenRouting(roll)}
                            className="h-6 text-[11px] px-2 text-indigo-300 hover:text-white hover:bg-slate-800"
                          >
                            <Route className="w-3 h-3 mr-1" />
                            Route
                          </Button>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isNoFurther ? (
                            <span className="text-slate-500 text-[11px] italic">No Issue Required</span>
                          ) : isHold ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenRouting(roll)}
                              className="h-6 text-[10px] px-2 border-rose-500/40 text-rose-300 hover:bg-rose-950/40"
                            >
                              Why Blocked
                            </Button>
                          ) : currentStep?.status === "WAITING_PREVIOUS" ? (
                            <Button
                              size="sm"
                              disabled
                              variant="ghost"
                              className="h-6 text-[10px] px-2 text-slate-500 cursor-not-allowed"
                            >
                              Waiting Step {currentStep.sequence - 1}
                            </Button>
                          ) : isPrepared ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenIssuePreparation(roll)}
                              className="h-6 text-[11px] px-2.5 border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/40 flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              View Prep
                            </Button>
                          ) : isPrepReviewRequired ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenIssuePreparation(roll)}
                              className="h-6 text-[11px] px-2.5 border-amber-500/40 text-amber-300 hover:bg-amber-950/40 flex items-center gap-1"
                            >
                              <AlertTriangle className="w-3 h-3" />
                              Review Prep
                            </Button>
                          ) : isReadyToPrepare ? (
                            <Button
                              size="sm"
                              onClick={() => handleOpenIssuePreparation(roll)}
                              className={`h-6 text-[11px] px-2.5 text-white font-semibold flex items-center gap-1 ${
                                isExternal
                                  ? "bg-cyan-600 hover:bg-cyan-500"
                                  : "bg-indigo-600 hover:bg-indigo-500"
                              }`}
                            >
                              <Send className="w-3 h-3" />
                              {isExternal ? "Prepare Outward" : "Prepare Internal"}
                            </Button>
                          ) : (
                            <span className="text-slate-600 text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View (Steps 49 & 50) */}
      <div className="md:hidden space-y-3">
        {filteredRolls.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            No fabric rolls match the selected filters.
          </div>
        ) : (
          filteredRolls.map(
            ({
              roll,
              qSummary,
              rSummary,
              plan,
              currentStep,
              activePrep,
              isReadyToPrepare,
              isPrepared,
              isPrepReviewRequired,
            }) => {
              const isHold = qSummary.disposition === "HOLD";
              const isNoFurther = rSummary.routeDecision === "NO_FURTHER_PROCESS";
              const isExternal = currentStep?.executionMode === "EXTERNAL_JOBWORK";

              return (
                <div
                  key={roll.id}
                  className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/90 space-y-2.5 text-xs font-mono"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div>
                      <span className="font-bold text-indigo-300 block">{roll.temporaryRollNo}</span>
                      <span className="text-slate-400 text-[11px] font-sans">
                        {roll.qtyMetre.toFixed(3)} MTR · {qSummary.proposedGrade}
                      </span>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        isPrepReviewRequired
                          ? "border-amber-500/40 text-amber-300"
                          : isPrepared
                          ? "border-emerald-500/40 text-emerald-300"
                          : isReadyToPrepare
                          ? "border-indigo-500/40 text-indigo-300"
                          : "border-slate-700 text-slate-400"
                      }`}
                    >
                      {isPrepReviewRequired
                        ? "REVIEW REQ"
                        : isPrepared
                        ? "PREPARED"
                        : isReadyToPrepare
                        ? "READY"
                        : "UNPREPARED"}
                    </Badge>
                  </div>

                  <div className="text-[11px] space-y-1 font-sans">
                    <div className="text-slate-300">
                      <span className="text-slate-500">Process: </span>
                      <strong className="text-white">{currentStep?.processName || "No process"}</strong>
                    </div>

                    {currentStep && (
                      <div className="text-slate-400 flex items-center justify-between">
                        <span>Mode: <strong className="text-cyan-300">{currentStep.executionMode}</strong></span>
                        {isExternal && currentStep.jobPartyName && (
                          <span className="truncate max-w-[150px]">{currentStep.jobPartyName}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/60 font-sans">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenRouting(roll)}
                      className="h-7 text-xs text-indigo-400 hover:text-white"
                    >
                      Route Planner
                    </Button>

                    {isReadyToPrepare && (
                      <Button
                        size="sm"
                        onClick={() => handleOpenIssuePreparation(roll)}
                        className={`h-7 text-xs text-white font-semibold ${
                          isExternal ? "bg-cyan-600 hover:bg-cyan-500" : "bg-indigo-600 hover:bg-indigo-500"
                        }`}
                      >
                        {isExternal ? "Prepare Outward" : "Prepare Internal"}
                      </Button>
                    )}

                    {isPrepared && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenIssuePreparation(roll)}
                        className="h-7 text-xs border-emerald-500/40 text-emerald-300"
                      >
                        View Prep
                      </Button>
                    )}
                  </div>
                </div>
              );
            }
          )
        )}
      </div>

      {/* Single Roll Issue Preparation Dialog Modal */}
      {selectedRollForIssue && (
        <FabricProcessIssueDialog
          open={isIssueDialogOpen}
          onOpenChange={setIsIssueDialogOpen}
          roll={selectedRollForIssue}
          order={order}
          jobCard={jobCards.find((jc) => jc.id === selectedRollForIssue.jobCardId)}
          onSaved={() => {
            onRefresh?.();
          }}
          onOpenRouteDialog={(r) => {
            setSelectedRollForRouting(r);
            setIsRouteDialogOpen(true);
          }}
        />
      )}

      {/* Multi-Roll Batch Issue Preparation Dialog Modal */}
      <FabricProcessBatchDialog
        open={isBatchDialogOpen}
        onOpenChange={setIsBatchDialogOpen}
        selectedRolls={selectedBatchRolls}
        order={order}
        jobCards={jobCards}
        onBatchSaved={() => {
          setSelectedRollIdsForBatch(new Set());
          onRefresh?.();
        }}
      />

      {/* Route Planning Dialog Modal */}
      {selectedRollForRouting && (
        <FabricProcessRouteDialog
          open={isRouteDialogOpen}
          onOpenChange={setIsRouteDialogOpen}
          roll={selectedRollForRouting}
          order={order}
          jobCard={jobCards.find((jc) => jc.id === selectedRollForRouting.jobCardId)}
          onSaved={() => {
            onRefresh?.();
          }}
        />
      )}
    </div>
  );
}

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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  ProductionPlanningService,
  type FabricRollDraft,
  type RollQualitySummary,
  type JobCardDraft,
} from "@/services/production-planning.service";
import type { ProductionOrder } from "@/lib/production-store";
import { FabricProcessRouteDialog } from "@/components/fabric-process-route-dialog";

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
  const [selectedRollForRouting, setSelectedRollForRouting] = useState<FabricRollDraft | null>(null);
  const [isRouteDialogOpen, setIsRouteDialogOpen] = useState<boolean>(false);

  // Overall KPIs rollup
  const orderSummary = useMemo(() => {
    return FabricProcessRoutingService.getProductionOrderRoutingSummary(rolls);
  }, [rolls]);

  // Roll-level augmented data
  const augmentedRolls = useMemo(() => {
    return rolls.map((roll) => {
      const qSummary = ProductionPlanningService.getRollQualitySummary(roll);
      const rSummary = FabricProcessRoutingService.getRollRoutingSummary(roll);
      const plan = rSummary.routePlan;
      return {
        roll,
        qSummary,
        rSummary,
        plan,
      };
    });
  }, [rolls]);

  // Filtered rows
  const filteredRolls = useMemo(() => {
    return augmentedRolls.filter(({ roll, qSummary, rSummary, plan }) => {
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

      return true;
    });
  }, [augmentedRolls, searchTerm, statusFilter, dispositionFilter, order]);

  const handleOpenRouting = (roll: FabricRollDraft) => {
    setSelectedRollForRouting(roll);
    setIsRouteDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* KPI Summary Cards (Steps 37, 38, 39) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-3">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Rolls</span>
            <span className="text-xl font-bold font-mono text-white">{orderSummary.totalRolls}</span>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-emerald-500/20">
          <CardContent className="p-3">
            <span className="text-[10px] text-emerald-400 uppercase font-semibold block">Route Ready</span>
            <span className="text-xl font-bold font-mono text-emerald-300">{orderSummary.readyCount}</span>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-blue-500/20">
          <CardContent className="p-3">
            <span className="text-[10px] text-blue-400 uppercase font-semibold block">Planned</span>
            <span className="text-xl font-bold font-mono text-blue-300">{orderSummary.plannedCount}</span>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-3">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">No Further Process</span>
            <span className="text-xl font-bold font-mono text-slate-300">{orderSummary.noFurtherProcessCount}</span>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-3">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Not Planned</span>
            <span className="text-xl font-bold font-mono text-slate-400">{orderSummary.notPlannedCount}</span>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-rose-500/20">
          <CardContent className="p-3">
            <span className="text-[10px] text-rose-400 uppercase font-semibold block">Blocked (Hold)</span>
            <span className="text-xl font-bold font-mono text-rose-300">{orderSummary.blockedCount}</span>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-amber-500/20">
          <CardContent className="p-3">
            <span className="text-[10px] text-amber-400 uppercase font-semibold block">Review Required</span>
            <span className="text-xl font-bold font-mono text-amber-300">{orderSummary.reviewRequiredCount}</span>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar (Step 4 & 5) */}
      <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Roll No, Order, Item..."
              className="h-8 pl-8 text-xs bg-slate-950 border-slate-800 text-white placeholder:text-slate-600"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-300 w-44">
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

          <Select value={dispositionFilter} onValueChange={setDispositionFilter}>
            <SelectTrigger className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-300 w-44">
              <SelectValue placeholder="Quality Disposition" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-xs text-slate-200">
              <SelectItem value="ALL">All Dispositions</SelectItem>
              <SelectItem value="PROCESS_REQUIRED">Process Required</SelectItem>
              <SelectItem value="REWORK">Rework</SelectItem>
              <SelectItem value="ACCEPTED">Accepted</SelectItem>
              <SelectItem value="HOLD">Hold</SelectItem>
              <SelectItem value="REJECT">Reject</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-[11px] text-slate-400 font-mono">
          Showing {filteredRolls.length} of {rolls.length} rolls
        </div>
      </div>

      {/* Rolls Process Routing Table (Step 2, 44, 45, 46) */}
      <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-2.5 px-3">Roll No</th>
                <th className="py-2.5 px-3">Qty (MTR)</th>
                <th className="py-2.5 px-3">Item / Design</th>
                <th className="py-2.5 px-3">QC Status</th>
                <th className="py-2.5 px-3">QC Grade</th>
                <th className="py-2.5 px-3">Disposition</th>
                <th className="py-2.5 px-3">Route Decision</th>
                <th className="py-2.5 px-3">Steps</th>
                <th className="py-2.5 px-3">Route Status</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredRolls.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-500 font-sans">
                    No fabric rolls match the selected routing filters.
                  </td>
                </tr>
              ) : (
                filteredRolls.map(({ roll, qSummary, rSummary, plan }) => {
                  const statusMeta = ROUTE_STATUS_BADGES[rSummary.routeStatus] || ROUTE_STATUS_BADGES.NOT_PLANNED;
                  const StatusIcon = statusMeta.icon;

                  const isHold = qSummary.disposition === "HOLD";
                  const isRework = qSummary.disposition === "REWORK";
                  const isProcessRequired = qSummary.disposition === "PROCESS_REQUIRED";

                  return (
                    <tr key={roll.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-indigo-300">
                        {roll.temporaryRollNo}
                      </td>
                      <td className="py-2.5 px-3 text-white font-bold">
                        {roll.qtyMetre.toFixed(3)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-sans">
                        <span className="truncate block max-w-xs">
                          {order?.item_code || "ITEM"} · {order?.design_no || "DESIGN"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant="outline"
                          className={
                            qSummary.inspectionStatus === "INSPECTED"
                              ? "border-emerald-500/40 text-emerald-300 text-[10px]"
                              : "border-slate-700 text-slate-400 text-[10px]"
                          }
                        >
                          {qSummary.inspectionStatus}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className="border-slate-700 text-slate-300 text-[10px]">
                          {qSummary.proposedGrade}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            isHold
                              ? "border-rose-500/40 text-rose-300 bg-rose-500/10"
                              : isRework
                              ? "border-amber-500/40 text-amber-300 bg-amber-500/10"
                              : isProcessRequired
                              ? "border-cyan-500/40 text-cyan-300 bg-cyan-500/10"
                              : "border-slate-700 text-slate-300"
                          }`}
                        >
                          {qSummary.disposition === "NOT_SET" ? "—" : qSummary.disposition}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-sans text-[11px]">
                        {rSummary.routeDecision === "NO_FURTHER_PROCESS" ? (
                          <span className="text-slate-400 italic">No Further Process</span>
                        ) : rSummary.routeDecision === "PROCESS_ROUTE" ? (
                          <span className="text-indigo-300 font-medium">
                            {rSummary.routeType === "QUALITY_REWORK" ? "Quality Rework" : "Standard Route"}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Unplanned</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {plan && plan.steps.length > 0 ? (
                          <div className="flex items-center gap-1.5 font-sans text-[11px]">
                            <span className="text-white font-bold">{plan.steps.length} Steps</span>
                            {rSummary.currentStep && (
                              <span className="text-slate-400 text-[10px]">
                                (Next: {rSummary.currentStep.processName})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[10px]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className={`text-[10px] flex items-center gap-1 w-fit ${statusMeta.class}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusMeta.label}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Button
                          size="sm"
                          variant={plan ? "outline" : "default"}
                          onClick={() => handleOpenRouting(roll)}
                          className={`h-6 text-[11px] px-2.5 ${
                            isHold
                              ? "border-rose-500/40 text-rose-300 hover:bg-rose-950/40"
                              : isRework && !plan
                              ? "bg-amber-600 hover:bg-amber-500 text-white font-semibold"
                              : !plan && isProcessRequired
                              ? "bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                              : "border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40"
                          }`}
                        >
                          <Route className="w-3 h-3 mr-1" />
                          {plan
                            ? "Review Route"
                            : isHold
                            ? "Why Blocked"
                            : isRework
                            ? "Plan Rework"
                            : "Plan Route"}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

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

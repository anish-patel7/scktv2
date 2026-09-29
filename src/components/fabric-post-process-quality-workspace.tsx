import React, { useState, useMemo } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  History,
  Layers,
  Sparkles,
  Search,
  Filter,
  ArrowRight,
  Boxes,
  Clock,
  RefreshCw,
  Route,
  Ban,
  FileCheck2,
  Scale,
  Eye,
  Activity,
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
  FabricPostProcessQualityService,
  type FabricPostProcessInspection,
  type PostProcessQualitySummary,
} from "@/services/fabric-post-process-quality.service";
import {
  FabricRollGenealogyService,
  type FabricRollGenealogyNode,
} from "@/services/fabric-roll-genealogy.service";
import {
  ProductionPlanningService,
  type FabricRollDraft,
  type JobCardDraft,
} from "@/services/production-planning.service";
import { FabricProcessReceiveService } from "@/services/fabric-process-receive.service";
import { FabricProcessRoutingService } from "@/services/fabric-process-routing.service";
import type { ProductionOrder } from "@/lib/production-store";
import { FabricPostProcessQualityDialog } from "./fabric-post-process-quality-dialog";

interface FabricPostProcessQualityWorkspaceProps {
  order?: ProductionOrder | null | undefined;
  jobCards?: JobCardDraft[] | undefined;
  rolls: FabricRollDraft[];
  onRefresh?: (() => void) | undefined;
}

const GRADE_BADGES: Record<string, string> = {
  A: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
  B: "border-blue-500/40 text-blue-300 bg-blue-500/10",
  C: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  REJECT: "border-rose-500/40 text-rose-300 bg-rose-500/10",
  UNASSIGNED: "border-slate-700 text-slate-400 bg-slate-900",
};

const DISPOSITION_BADGES: Record<string, string> = {
  ACCEPTED: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
  HOLD: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  REWORK: "border-orange-500/40 text-orange-300 bg-orange-500/10",
  REJECT: "border-rose-500/40 text-rose-300 bg-rose-500/10",
  PROCESS_REQUIRED: "border-purple-500/40 text-purple-300 bg-purple-500/10",
  NOT_SET: "border-slate-700 text-slate-400 bg-slate-900",
};

export function FabricPostProcessQualityWorkspace({
  order,
  jobCards = [],
  rolls,
  onRefresh,
}: FabricPostProcessQualityWorkspaceProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("ALL");
  const [dispositionFilter, setDispositionFilter] = useState<string>("ALL");
  const [inspectionFilter, setInspectionFilter] = useState<string>("ALL");
  const [reviewFilter, setReviewFilter] = useState<string>("ALL");

  // Selection states for dialog
  const [selectedRollForQuality, setSelectedRollForQuality] = useState<FabricRollDraft | null>(null);
  const [selectedReinspectionFrom, setSelectedReinspectionFrom] = useState<FabricPostProcessInspection | null>(null);
  const [isQualityDialogOpen, setIsQualityDialogOpen] = useState<boolean>(false);

  // Auto-register root nodes in genealogy
  useMemo(() => {
    rolls.forEach((r) => {
      FabricRollGenealogyService.getOrCreateRootFromFabricRollDraft(r);
    });
  }, [rolls]);

  // Retrieve all genealogy nodes
  const allNodes = useMemo(() => {
    return FabricRollGenealogyService.getAllNodes();
  }, [rolls, isQualityDialogOpen]);

  // Augmented row records
  const qualityRows = useMemo(() => {
    return allNodes.map((node) => {
      const summary = FabricPostProcessQualityService.getCurrentQualitySummary(node.id);
      const isLeaf = FabricRollGenealogyService.getChildren(node.id).length === 0;
      const isSuperseded = node.identityStatus === "SUPERSEDED_BY_SPLIT";
      const isEligible = isLeaf && !isSuperseded && node.identityStatus === "ACTIVE";

      // Process context lookup
      const activeReceive = FabricProcessReceiveService.getActiveReceiveForRoll(node.id);
      const routePlan = FabricProcessRoutingService.getRoutePlanForRoll(node.id);

      // Find matching FabricRollDraft or synthesize
      const matchingDraft = rolls.find(
        (r) => r.id === node.id || r.temporaryRollNo === node.rollIdentity
      );

      const draft: FabricRollDraft = matchingDraft || {
        id: node.id,
        receiveDraftId: "rcv-sim",
        jobCardId: node.jobCardId || "jc-sim",
        productionOrderId: node.productionOrderId || "po-sim",
        rollSequence: 1,
        temporaryRollNo: node.rollIdentity,
        qtyMetre: node.quantityMetre,
        inspectionStatus: "UNINSPECTED",
        stockStatus: "DRAFT_GREY",
        isSaleable: false,
      };

      return {
        node,
        draft,
        summary,
        isLeaf,
        isSuperseded,
        isEligible,
        activeReceive,
        routePlan,
      };
    });
  }, [allNodes, rolls, isQualityDialogOpen]);

  // Overall KPIs (Step 50)
  const kpis = useMemo(() => {
    let eligibleCount = 0;
    let inProgressCount = 0;
    let inspectedCount = 0;
    let reinspectionCount = 0;
    let holdCount = 0;
    let reworkCount = 0;
    let reviewRequiredCount = 0;

    for (const row of qualityRows) {
      if (row.isEligible) {
        eligibleCount++;
      }
      if (row.isEligible && row.summary.latestInspection) {
        reinspectionCount++;
      }
      if (row.summary.latestInspection?.inspectionStatus === "INSPECTION_IN_PROGRESS") {
        inProgressCount++;
      }
      if (row.summary.latestInspection?.inspectionStatus === "INSPECTED") {
        inspectedCount++;
      }
      if (row.summary.latestDisposition === "HOLD") {
        holdCount++;
      }
      if (
        row.summary.latestDisposition === "REWORK" ||
        row.summary.latestDisposition === "PROCESS_REQUIRED"
      ) {
        reworkCount++;
      }
      if (row.summary.reviewRequired) {
        reviewRequiredCount++;
      }
    }

    return {
      eligibleCount,
      inProgressCount,
      inspectedCount,
      reinspectionCount,
      holdCount,
      reworkCount,
      reviewRequiredCount,
    };
  }, [qualityRows]);

  // Filtered rows (Step 49)
  const filteredRows = useMemo(() => {
    return qualityRows.filter(({ node, summary, activeReceive }) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesRoll = node.rollIdentity.toLowerCase().includes(term);
        const matchesRoot = node.rootRollIdentity?.toLowerCase().includes(term);
        const matchesOrder = order?.order_no ? order.order_no.toLowerCase().includes(term) : false;
        const matchesProcess = activeReceive?.processName ? activeReceive.processName.toLowerCase().includes(term) : false;
        if (!matchesRoll && !matchesRoot && !matchesOrder && !matchesProcess) {
          return false;
        }
      }

      if (gradeFilter !== "ALL" && summary.latestGrade !== gradeFilter) {
        return false;
      }

      if (dispositionFilter !== "ALL" && summary.latestDisposition !== dispositionFilter) {
        return false;
      }

      if (inspectionFilter !== "ALL") {
        const status = summary.latestInspection?.inspectionStatus || "UNINSPECTED";
        if (status !== inspectionFilter) {
          return false;
        }
      }

      if (reviewFilter !== "ALL") {
        if (reviewFilter === "REVIEW_REQUIRED" && !summary.reviewRequired) {
          return false;
        }
        if (reviewFilter === "CLEAN" && summary.reviewRequired) {
          return false;
        }
      }

      return true;
    });
  }, [qualityRows, searchTerm, gradeFilter, dispositionFilter, inspectionFilter, reviewFilter, order]);

  const handleOpenInspect = (draft: FabricRollDraft, reinspectFrom?: FabricPostProcessInspection) => {
    setSelectedRollForQuality(draft);
    setSelectedReinspectionFrom(reinspectFrom || null);
    setIsQualityDialogOpen(true);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner / Disclaimer */}
      <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">Post-Process Quality & Reinspection Workspace</span>
              <Badge variant="outline" className="border-indigo-500/40 text-indigo-300 text-[10px]">
                PHASE 5G · FRONTEND SIMULATION
              </Badge>
            </div>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Active physical roll quality · Immutable reinspection history · Zero finished stock mutation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="border-slate-700 text-slate-400 text-[10px]">
            Commercial Release: PENDING (PREVIEW)
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            onClick={onRefresh}
            className="h-8 text-xs text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards (Step 50) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-3 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Eligible</span>
              <Boxes className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-xl font-bold font-mono text-white">{kpis.eligibleCount}</div>
            <span className="text-[10px] text-slate-500 block">Active physical leaves</span>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-3 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Inspected</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold font-mono text-emerald-300">{kpis.inspectedCount}</div>
            <span className="text-[10px] text-slate-500 block">100% full coverage</span>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-3 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>In Progress</span>
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-xl font-bold font-mono text-cyan-300">{kpis.inProgressCount}</div>
            <span className="text-[10px] text-slate-500 block">Partial inspection</span>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-3 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Reinspect Ready</span>
              <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-xl font-bold font-mono text-purple-300">{kpis.reinspectionCount}</div>
            <span className="text-[10px] text-slate-500 block">Available / Required</span>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-3 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Quality Hold</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-bold font-mono text-amber-300">{kpis.holdCount}</div>
            <span className="text-[10px] text-slate-500 block">Release blocked</span>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-3 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Rework / Reprocess</span>
              <Route className="w-3.5 h-3.5 text-orange-400" />
            </div>
            <div className="text-xl font-bold font-mono text-orange-300">{kpis.reworkCount}</div>
            <span className="text-[10px] text-slate-500 block">Route review req</span>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-3 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Review Req</span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-xl font-bold font-mono text-rose-300">{kpis.reviewRequiredCount}</div>
            <span className="text-[10px] text-slate-500 block">Variance notice</span>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar (Step 49) */}
      <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search roll identity, root roll, parent..."
              className="pl-9 h-9 text-xs bg-slate-950 border-slate-800 text-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-300 w-32">
                <SelectValue placeholder="Grade: All" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                <SelectItem value="ALL">Grade: All</SelectItem>
                <SelectItem value="A">Grade A</SelectItem>
                <SelectItem value="B">Grade B</SelectItem>
                <SelectItem value="C">Grade C</SelectItem>
                <SelectItem value="REJECT">REJECT</SelectItem>
                <SelectItem value="UNASSIGNED">UNASSIGNED</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dispositionFilter} onValueChange={setDispositionFilter}>
              <SelectTrigger className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-300 w-36">
                <SelectValue placeholder="Disposition: All" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                <SelectItem value="ALL">Disposition: All</SelectItem>
                <SelectItem value="ACCEPTED">ACCEPTED</SelectItem>
                <SelectItem value="HOLD">HOLD</SelectItem>
                <SelectItem value="REWORK">REWORK</SelectItem>
                <SelectItem value="PROCESS_REQUIRED">PROCESS_REQUIRED</SelectItem>
                <SelectItem value="REJECT">REJECT</SelectItem>
                <SelectItem value="NOT_SET">NOT_SET</SelectItem>
              </SelectContent>
            </Select>

            <Select value={inspectionFilter} onValueChange={setInspectionFilter}>
              <SelectTrigger className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-300 w-36">
                <SelectValue placeholder="Status: All" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                <SelectItem value="ALL">Status: All</SelectItem>
                <SelectItem value="INSPECTED">INSPECTED (Full)</SelectItem>
                <SelectItem value="INSPECTION_IN_PROGRESS">IN PROGRESS</SelectItem>
                <SelectItem value="UNINSPECTED">UNINSPECTED</SelectItem>
              </SelectContent>
            </Select>

            <Select value={reviewFilter} onValueChange={setReviewFilter}>
              <SelectTrigger className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-300 w-36">
                <SelectValue placeholder="Review: All" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                <SelectItem value="ALL">Review: All</SelectItem>
                <SelectItem value="REVIEW_REQUIRED">Review Required</SelectItem>
                <SelectItem value="CLEAN">Clean / Normal</SelectItem>
              </SelectContent>
            </Select>

            {(searchTerm || gradeFilter !== "ALL" || dispositionFilter !== "ALL" || inspectionFilter !== "ALL" || reviewFilter !== "ALL") && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSearchTerm("");
                  setGradeFilter("ALL");
                  setDispositionFilter("ALL");
                  setInspectionFilter("ALL");
                  setReviewFilter("ALL");
                }}
                className="h-9 text-xs text-slate-400 hover:text-white"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table View (Step 48, 55, 56, 57) */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 border-collapse min-w-[950px]">
            <thead className="bg-slate-900/90 text-[10px] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">Roll Identity</th>
                <th className="py-3 px-3">Qty (MTR)</th>
                <th className="py-3 px-3">Gen / Root</th>
                <th className="py-3 px-3">Last Process Context</th>
                <th className="py-3 px-3">Coverage</th>
                <th className="py-3 px-3">Grade</th>
                <th className="py-3 px-3">Disposition</th>
                <th className="py-3 px-3">Commercial Release</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 font-sans">
                    No fabric rolls matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRows.map(({ node, draft, summary, isEligible, isSuperseded, activeReceive, routePlan }) => {
                  const latest = summary.latestInspection;
                  const grade = summary.latestGrade;
                  const disp = summary.latestDisposition;

                  return (
                    <tr
                      key={node.id}
                      className={`hover:bg-slate-900/40 transition-colors ${
                        isSuperseded ? "opacity-70 bg-slate-950/40" : ""
                      }`}
                    >
                      {/* Roll Identity */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold ${
                              isEligible
                                ? "text-indigo-300"
                                : isSuperseded
                                ? "text-slate-400 line-through decoration-slate-600"
                                : "text-amber-300"
                            }`}
                          >
                            {node.rollIdentity}
                          </span>
                          {node.generation === 0 && (
                            <Badge variant="outline" className="border-cyan-500/40 text-cyan-300 text-[9px] py-0 px-1">
                              ROOT
                            </Badge>
                          )}
                        </div>
                        {isSuperseded && (
                          <span className="text-[9px] text-slate-500 font-sans block mt-0.5">
                            Superseded by Split
                          </span>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="py-3 px-3 font-bold text-white">
                        {node.quantityMetre.toFixed(3)}
                      </td>

                      {/* Gen / Root */}
                      <td className="py-3 px-3 font-sans text-[11px]">
                        <span className="text-slate-300 block">G{node.generation}</span>
                        <span className="text-[10px] text-slate-500 block truncate max-w-[120px]">
                          Root: {node.rootRollIdentity}
                        </span>
                      </td>

                      {/* Last Process Context */}
                      <td className="py-3 px-3 font-sans text-[11px]">
                        {activeReceive ? (
                          <div>
                            <span className="text-cyan-300 block truncate max-w-[130px]" title={activeReceive.processName}>
                              {activeReceive.processName}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              Recv: {activeReceive.id} ({activeReceive.reconciliation.isCleanExact ? "Clean" : "Review Req"})
                            </span>
                          </div>
                        ) : routePlan?.steps[0] ? (
                          <div>
                            <span className="text-slate-300 block truncate max-w-[130px]">
                              {routePlan.steps[0].processName}
                            </span>
                            <span className="text-[10px] text-slate-500 block">Planned</span>
                          </div>
                        ) : (
                          <span className="text-slate-500">Not Planned</span>
                        )}
                      </td>

                      {/* Coverage */}
                      <td className="py-3 px-3">
                        {latest ? (
                          <div>
                            <span className="text-white font-bold block">{latest.inspectionCoveragePercent}%</span>
                            <span className="text-[10px] text-slate-400 font-sans block">
                              {latest.inspectionStatus === "INSPECTED" ? "Full" : "In Progress"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 font-sans text-[10px]">Uninspected</span>
                        )}
                      </td>

                      {/* Grade */}
                      <td className="py-3 px-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${GRADE_BADGES[grade] || GRADE_BADGES['UNASSIGNED']}`}
                        >
                          Grade {grade}
                        </Badge>
                      </td>

                      {/* Disposition */}
                      <td className="py-3 px-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${DISPOSITION_BADGES[disp] || DISPOSITION_BADGES['NOT_SET']}`}
                        >
                          {disp}
                        </Badge>
                      </td>

                      {/* Commercial Release Preview */}
                      <td className="py-3 px-3 font-sans text-[11px]">
                        <span
                          className={`block truncate max-w-[130px] font-semibold text-[10px] ${
                            summary.latestCommercialReleasePreview === "QUALITY_ACCEPTED_FOR_FUTURE_COMMERCIAL_REVIEW"
                              ? "text-emerald-400"
                              : summary.latestCommercialReleasePreview === "COMMERCIAL_RELEASE_BLOCKED_PREVIEW"
                              ? "text-rose-400"
                              : "text-slate-400"
                          }`}
                          title={summary.latestCommercialReleasePreview}
                        >
                          {summary.latestCommercialReleasePreview === "QUALITY_ACCEPTED_FOR_FUTURE_COMMERCIAL_REVIEW"
                            ? "ACCEPTED (PREVIEW)"
                            : summary.latestCommercialReleasePreview === "NOT_READY_FUTURE_ROUTE_REQUIRED"
                            ? "ROUTE PENDING"
                            : summary.latestCommercialReleasePreview === "COMMERCIAL_RELEASE_BLOCKED_PREVIEW"
                            ? "BLOCKED"
                            : "NOT EVALUATED"}
                        </span>
                      </td>

                      {/* Actions (Step 1, 2, 51) */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 font-sans">
                          {isEligible ? (
                            <>
                              {latest ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenInspect(draft)}
                                    className="h-6 text-[10px] px-2 border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40"
                                  >
                                    <Eye className="w-3 h-3 mr-1" />
                                    View
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenInspect(draft, latest)}
                                    className="h-6 text-[10px] px-2 border-purple-500/40 text-purple-300 hover:bg-purple-950/40"
                                    title="Reinspect Roll"
                                  >
                                    <RefreshCw className="w-3 h-3 mr-1" />
                                    Reinspect
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenInspect(draft)}
                                  className="h-6 text-[10px] px-2.5 border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/40 flex items-center gap-1"
                                >
                                  <ShieldCheck className="w-3 h-3" />
                                  Inspect Quality
                                </Button>
                              )}
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenInspect(draft)}
                              className="h-6 text-[10px] px-2 text-slate-500 hover:text-white"
                              title="View Quality History"
                            >
                              <History className="w-3 h-3 mr-1" />
                              History
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quality Dialog Modal */}
      {selectedRollForQuality && (
        <FabricPostProcessQualityDialog
          open={isQualityDialogOpen}
          onOpenChange={setIsQualityDialogOpen}
          roll={selectedRollForQuality}
          order={order}
          jobCard={jobCards.find((jc) => jc.id === selectedRollForQuality.jobCardId)}
          targetReinspectionFrom={selectedReinspectionFrom}
          onSaved={() => {
            onRefresh?.();
          }}
        />
      )}
    </div>
  );
}

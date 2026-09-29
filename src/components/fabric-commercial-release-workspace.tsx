import React, { useState, useMemo } from "react";
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertOctagon,
  Search,
  Filter,
  Eye,
  History,
  RotateCcw,
  GitBranch,
  Layers,
  ArrowRight,
  Package,
  FileText,
  Ban,
  Check,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FabricCommercialReleaseService,
  type CommercialReleaseReadiness,
  type CommercialReleaseStatus,
  type CommercialReleaseSummary,
} from "@/services/fabric-commercial-release.service";
import {
  FabricRollGenealogyService,
  type FabricRollGenealogyNode,
} from "@/services/fabric-roll-genealogy.service";
import {
  type FabricRollDraft,
  type JobCardDraft,
} from "@/services/production-planning.service";
import type { ProductionOrder } from "@/lib/production-store";
import { FabricCommercialReleaseDialog } from "@/components/fabric-commercial-release-dialog";
import { FabricCommercialReleaseHistory } from "@/components/fabric-commercial-release-history";

interface FabricCommercialReleaseWorkspaceProps {
  order?: ProductionOrder | null | undefined;
  jobCards?: JobCardDraft[] | undefined;
  rolls: FabricRollDraft[];
  onRefresh?: (() => void) | undefined;
}

const READINESS_COLORS: Record<CommercialReleaseReadiness, { label: string; class: string }> = {
  READY_FOR_REVIEW: {
    label: "READY FOR REVIEW",
    class: "border-emerald-500/50 text-emerald-300 bg-emerald-500/15",
  },
  NOT_READY: {
    label: "NOT READY",
    class: "border-amber-500/50 text-amber-300 bg-amber-500/15",
  },
  REVIEW_REQUIRED: {
    label: "REVIEW REQUIRED",
    class: "border-purple-500/50 text-purple-300 bg-purple-500/15",
  },
  BLOCKED: {
    label: "BLOCKED",
    class: "border-rose-500/50 text-rose-300 bg-rose-500/15",
  },
};

const GRADE_COLORS: Record<string, string> = {
  A: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
  B: "border-blue-500/40 text-blue-300 bg-blue-500/10",
  C: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  REJECT: "border-rose-500/40 text-rose-300 bg-rose-500/10",
  UNASSIGNED: "border-slate-700 text-slate-400 bg-slate-900",
};

const DISPOSITION_COLORS: Record<string, string> = {
  ACCEPTED: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
  HOLD: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  REWORK: "border-orange-500/40 text-orange-300 bg-orange-500/10",
  REJECT: "border-rose-500/40 text-rose-300 bg-rose-500/10",
  PROCESS_REQUIRED: "border-purple-500/40 text-purple-300 bg-purple-500/10",
  NOT_SET: "border-slate-700 text-slate-400 bg-slate-900",
};

export function FabricCommercialReleaseWorkspace({
  order,
  jobCards = [],
  rolls,
  onRefresh,
}: FabricCommercialReleaseWorkspaceProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [readinessFilter, setReadinessFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [gradeFilter, setGradeFilter] = useState<string>("ALL");
  const [dispositionFilter, setDispositionFilter] = useState<string>("ALL");

  // Dialog selection state
  const [selectedRollId, setSelectedRollId] = useState<string | null>(null);
  const [isReleaseDialogOpen, setIsReleaseDialogOpen] = useState<boolean>(false);

  // Overall history modal
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);

  // Auto-register root nodes in genealogy
  useMemo(() => {
    rolls.forEach((r) => {
      FabricRollGenealogyService.getOrCreateRootFromFabricRollDraft(r);
    });
  }, [rolls]);

  // Retrieve all nodes from genealogy
  const allNodes = useMemo(() => {
    return FabricRollGenealogyService.getAllNodes();
  }, [rolls, isReleaseDialogOpen]);

  // Compute row data using authoritative service
  const evaluatedRows = useMemo(() => {
    return allNodes.map((node) => {
      const summary: CommercialReleaseSummary = FabricCommercialReleaseService.getCommercialReleaseSummary(node.id);
      const isLeaf = FabricRollGenealogyService.getChildren(node.id).length === 0;
      const isSuperseded = node.identityStatus === "SUPERSEDED_BY_SPLIT";
      const isEligible = isLeaf && !isSuperseded && node.identityStatus === "ACTIVE";

      return {
        node,
        summary,
        isLeaf,
        isSuperseded,
        isEligible,
      };
    });
  }, [allNodes, isReleaseDialogOpen]);

  // KPI calculations
  const kpis = useMemo(() => {
    let readyForReview = 0;
    let notReady = 0;
    let blocked = 0;
    let reviewRequired = 0;
    let releasedSimulation = 0;
    let commercialHold = 0;
    let totalCandidates = 0;

    for (const r of evaluatedRows) {
      if (r.isEligible) {
        if (r.summary.currentReadiness === "READY_FOR_REVIEW") readyForReview++;
        if (r.summary.currentReadiness === "NOT_READY") notReady++;
        if (r.summary.currentReadiness === "BLOCKED") blocked++;
        if (r.summary.currentReadiness === "REVIEW_REQUIRED") reviewRequired++;
      }
      if (r.summary.releaseStatus === "RELEASED_SIMULATION") {
        releasedSimulation++;
        totalCandidates++;
      }
      if (r.summary.latestReleaseDecision === "KEEP_ON_HOLD") {
        commercialHold++;
      }
    }

    return {
      totalRolls: evaluatedRows.length,
      activeLeaves: evaluatedRows.filter((r) => r.isEligible).length,
      readyForReview,
      notReady,
      blocked,
      reviewRequired,
      releasedSimulation,
      commercialHold,
      totalCandidates,
    };
  }, [evaluatedRows]);

  // Filter rows
  const filteredRows = useMemo(() => {
    return evaluatedRows.filter(({ node, summary, isEligible }) => {
      // Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchRoll = node.rollIdentity.toLowerCase().includes(term);
        const matchRoot = node.rootRollIdentity.toLowerCase().includes(term);
        const matchJc = (node.jobCardId || "").toLowerCase().includes(term);
        if (!matchRoll && !matchRoot && !matchJc) return false;
      }

      // Readiness filter
      if (readinessFilter !== "ALL" && summary.currentReadiness !== readinessFilter) {
        return false;
      }

      // Commercial status filter
      if (statusFilter !== "ALL") {
        if (statusFilter === "RELEASED_SIMULATION" && summary.releaseStatus !== "RELEASED_SIMULATION") return false;
        if (statusFilter === "KEEP_ON_HOLD" && summary.latestReleaseDecision !== "KEEP_ON_HOLD") return false;
        if (statusFilter === "REVOKED_SIMULATION" && summary.releaseStatus !== "REVOKED_SIMULATION") return false;
        if (statusFilter === "UNRELEASED" && summary.releaseStatus !== undefined) return false;
      }

      // Grade filter
      if (gradeFilter !== "ALL" && summary.currentGrade !== gradeFilter) {
        return false;
      }

      // Disposition filter
      if (dispositionFilter !== "ALL" && summary.currentDisposition !== dispositionFilter) {
        return false;
      }

      return true;
    });
  }, [evaluatedRows, searchTerm, readinessFilter, statusFilter, gradeFilter, dispositionFilter]);

  const handleOpenReleaseDialog = (nodeId: string) => {
    setSelectedRollId(nodeId);
    setIsReleaseDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Workflow Breadcrumb Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-lg">
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Process Route</span>
          <ArrowRight className="w-3 h-3 text-indigo-500 shrink-0" />
          <span className="text-slate-400">Issue</span>
          <ArrowRight className="w-3 h-3 text-indigo-500 shrink-0" />
          <span className="text-slate-400">Receive</span>
          <ArrowRight className="w-3 h-3 text-indigo-500 shrink-0" />
          <span className="text-slate-400">Quality Inspection</span>
          <ArrowRight className="w-3 h-3 text-indigo-500 shrink-0" />
          <span className="text-emerald-300 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/40">
            Commercial Release Review & Candidate Simulation
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsHistoryModalOpen(true)}
            className="h-7 text-xs border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40"
          >
            <History className="w-3.5 h-3.5 mr-1" />
            Commercial Audit Trail
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onRefresh?.()}
            className="h-7 text-xs text-slate-400 hover:text-white"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid (Step 58) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-3">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Active Leaves</span>
            <span className="text-xl font-bold font-mono text-white">{kpis.activeLeaves}</span>
            <span className="text-[9px] text-slate-500 block">Total: {kpis.totalRolls} rolls</span>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-emerald-500/30">
          <CardContent className="p-3">
            <span className="text-[10px] text-emerald-400 uppercase font-semibold block">Ready for Review</span>
            <span className="text-xl font-bold font-mono text-emerald-300">{kpis.readyForReview}</span>
            <span className="text-[9px] text-emerald-400/70 block">Clean prerequisites</span>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-amber-500/30">
          <CardContent className="p-3">
            <span className="text-[10px] text-amber-400 uppercase font-semibold block">Not Ready</span>
            <span className="text-xl font-bold font-mono text-amber-300">{kpis.notReady}</span>
            <span className="text-[9px] text-amber-400/70 block">Incomplete route/insp</span>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-rose-500/30">
          <CardContent className="p-3">
            <span className="text-[10px] text-rose-400 uppercase font-semibold block">Blocked</span>
            <span className="text-xl font-bold font-mono text-rose-300">{kpis.blocked}</span>
            <span className="text-[9px] text-rose-400/70 block">Hold / Rework / Reject</span>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-purple-500/30">
          <CardContent className="p-3">
            <span className="text-[10px] text-purple-400 uppercase font-semibold block">Review Required</span>
            <span className="text-xl font-bold font-mono text-purple-300">{kpis.reviewRequired}</span>
            <span className="text-[9px] text-purple-400/70 block">Stale / Grade unassigned</span>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-cyan-500/30">
          <CardContent className="p-3">
            <span className="text-[10px] text-cyan-400 uppercase font-semibold block">Released (Sim)</span>
            <span className="text-xl font-bold font-mono text-cyan-300">{kpis.releasedSimulation}</span>
            <span className="text-[9px] text-cyan-400/70 block">Simulation only</span>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-purple-500/40">
          <CardContent className="p-3">
            <span className="text-[10px] text-purple-300 uppercase font-semibold block">Candidates</span>
            <span className="text-xl font-bold font-mono text-purple-300">{kpis.totalCandidates}</span>
            <span className="text-[9px] text-purple-400/80 block">Finished fabric preview</span>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar (Step 57) */}
      <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <Input
              placeholder="Search roll, root, job card..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border-slate-800 pl-8 h-8 text-xs"
            />
          </div>

          <Select value={readinessFilter} onValueChange={setReadinessFilter}>
            <SelectTrigger className="w-[160px] h-8 bg-slate-950 border-slate-800 text-xs">
              <SelectValue placeholder="Readiness" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-xs text-white">
              <SelectItem value="ALL">All Readiness</SelectItem>
              <SelectItem value="READY_FOR_REVIEW">Ready for Review</SelectItem>
              <SelectItem value="NOT_READY">Not Ready</SelectItem>
              <SelectItem value="REVIEW_REQUIRED">Review Required</SelectItem>
              <SelectItem value="BLOCKED">Blocked</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-8 bg-slate-950 border-slate-800 text-xs">
              <SelectValue placeholder="Commercial Status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-xs text-white">
              <SelectItem value="ALL">All Commercial</SelectItem>
              <SelectItem value="RELEASED_SIMULATION">Released (Sim)</SelectItem>
              <SelectItem value="KEEP_ON_HOLD">Commercial Hold</SelectItem>
              <SelectItem value="REVOKED_SIMULATION">Revoked (Sim)</SelectItem>
              <SelectItem value="UNRELEASED">Unreleased</SelectItem>
            </SelectContent>
          </Select>

          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="w-[120px] h-8 bg-slate-950 border-slate-800 text-xs">
              <SelectValue placeholder="Grade" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-xs text-white">
              <SelectItem value="ALL">All Grades</SelectItem>
              <SelectItem value="A">Grade A</SelectItem>
              <SelectItem value="B">Grade B</SelectItem>
              <SelectItem value="C">Grade C</SelectItem>
              <SelectItem value="REJECT">Reject</SelectItem>
              <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dispositionFilter} onValueChange={setDispositionFilter}>
            <SelectTrigger className="w-[140px] h-8 bg-slate-950 border-slate-800 text-xs">
              <SelectValue placeholder="Disposition" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-xs text-white">
              <SelectItem value="ALL">All Dispositions</SelectItem>
              <SelectItem value="ACCEPTED">Accepted</SelectItem>
              <SelectItem value="HOLD">Hold</SelectItem>
              <SelectItem value="REWORK">Rework</SelectItem>
              <SelectItem value="PROCESS_REQUIRED">Process Req.</SelectItem>
              <SelectItem value="REJECT">Reject</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-[11px] text-slate-400 font-mono">
          Showing {filteredRows.length} of {evaluatedRows.length} rolls
        </div>
      </div>

      {/* Main Table: Desktop / Tablet View (Step 56, 59, 60) */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 border-collapse min-w-[1050px]">
            <thead className="bg-slate-950/90 text-[10px] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">Roll Identity</th>
                <th className="py-3 px-3">Qty (MTR)</th>
                <th className="py-3 px-3">Gen / Root</th>
                <th className="py-3 px-3">Route Status</th>
                <th className="py-3 px-3">Quality Summary</th>
                <th className="py-3 px-3">Release Readiness</th>
                <th className="py-3 px-3">Commercial Status</th>
                <th className="py-3 px-3">Finished Candidate</th>
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
                filteredRows.map(({ node, summary, isEligible, isSuperseded }) => {
                  const readinessBadge = READINESS_COLORS[summary.currentReadiness];
                  const grade = summary.currentGrade;
                  const disp = summary.currentDisposition;
                  const isReleased = summary.releaseStatus === "RELEASED_SIMULATION";

                  return (
                    <tr
                      key={node.id}
                      className={`hover:bg-slate-900/50 transition-colors ${
                        isSuperseded ? "opacity-60 bg-slate-950/40" : ""
                      }`}
                    >
                      {/* Roll Identity */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-bold ${
                              isEligible
                                ? "text-indigo-300"
                                : isSuperseded
                                ? "text-slate-500 line-through decoration-slate-600"
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

                      {/* Route Status */}
                      <td className="py-3 px-3 font-sans text-[11px]">
                        {summary.isRouteComplete ? (
                          <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 text-[10px]">
                            Route Complete
                          </Badge>
                        ) : (
                          <span className="text-amber-400 text-[10px] font-mono">
                            Pending Route
                          </span>
                        )}
                      </td>

                      {/* Quality Summary */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className={`text-[10px] ${GRADE_COLORS[grade]}`}>
                            G-{grade}
                          </Badge>
                          <Badge variant="outline" className={`text-[10px] ${DISPOSITION_COLORS[disp]}`}>
                            {disp}
                          </Badge>
                        </div>
                      </td>

                      {/* Release Readiness */}
                      <td className="py-3 px-3">
                        <Badge variant="outline" className={`text-[10px] ${readinessBadge.class}`}>
                          {readinessBadge.label}
                        </Badge>
                      </td>

                      {/* Commercial Status */}
                      <td className="py-3 px-3 font-sans text-[11px]">
                        {summary.releaseStatus === "RELEASED_SIMULATION" ? (
                          <Badge className="bg-emerald-600/30 text-emerald-300 border-emerald-500/40 text-[10px]">
                            RELEASED (SIM)
                          </Badge>
                        ) : summary.latestReleaseDecision === "KEEP_ON_HOLD" ? (
                          <Badge variant="outline" className="border-amber-500/40 text-amber-300 text-[10px]">
                            COMMERCIAL HOLD
                          </Badge>
                        ) : summary.releaseStatus === "REVOKED_SIMULATION" ? (
                          <span className="text-slate-500 text-[10px] line-through">
                            REVOKED (SIM)
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">
                            NOT EVALUATED
                          </span>
                        )}
                      </td>

                      {/* Candidate */}
                      <td className="py-3 px-3">
                        {summary.finishedCandidate ? (
                          <Badge variant="outline" className="border-purple-500/40 text-purple-300 text-[10px] flex items-center gap-1 w-fit">
                            <Sparkles className="w-3 h-3 text-purple-400" />
                            CANDIDATE ONLY
                          </Badge>
                        ) : (
                          <span className="text-slate-600 text-[10px]">—</span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 font-sans">
                          {isEligible ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenReleaseDialog(node.id)}
                              className={`h-6 text-[10px] px-2.5 ${
                                summary.currentReadiness === "READY_FOR_REVIEW"
                                  ? "border-emerald-500/50 text-emerald-300 hover:bg-emerald-950/40"
                                  : isReleased
                                  ? "border-purple-500/50 text-purple-300 hover:bg-purple-950/40"
                                  : "border-slate-700 text-slate-300 hover:bg-slate-800"
                              }`}
                            >
                              <Sparkles className="w-3 h-3 mr-1" />
                              {isReleased ? "View Release" : "Review Release"}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenReleaseDialog(node.id)}
                              className="h-6 text-[10px] px-2 text-slate-500 hover:text-white"
                              title="View Commercial History"
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

      {/* Mobile / Stacked Cards View (Step 60, 61) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
        {filteredRows.map(({ node, summary, isEligible, isSuperseded }) => {
          const readinessBadge = READINESS_COLORS[summary.currentReadiness];
          const isReleased = summary.releaseStatus === "RELEASED_SIMULATION";

          return (
            <Card
              key={node.id}
              className={`bg-slate-900 border ${
                isReleased
                  ? "border-emerald-500/30"
                  : isSuperseded
                  ? "border-slate-800 opacity-60"
                  : "border-slate-800"
              }`}
            >
              <CardContent className="p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="font-bold text-sm text-indigo-300">{node.rollIdentity}</span>
                    {node.generation === 0 && (
                      <Badge variant="outline" className="border-cyan-500/40 text-cyan-300 text-[9px] py-0">
                        ROOT
                      </Badge>
                    )}
                  </div>
                  <span className="font-mono text-sm font-bold text-white">
                    {node.quantityMetre.toFixed(3)} MTR
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-800">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Route:</span>
                    <span className="text-slate-300 font-mono text-[10px]">
                      {summary.isRouteComplete ? "COMPLETE" : "INCOMPLETE"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block">Quality:</span>
                    <span className="text-slate-300 font-mono text-[10px]">
                      G-{summary.currentGrade} · {summary.currentDisposition}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <Badge variant="outline" className={`text-[10px] ${readinessBadge.class}`}>
                    {readinessBadge.label}
                  </Badge>

                  {isEligible ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenReleaseDialog(node.id)}
                      className="h-6 text-[10px] border-indigo-500/40 text-indigo-300"
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      {isReleased ? "View Release" : "Review Release"}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenReleaseDialog(node.id)}
                      className="h-6 text-[10px] text-slate-500"
                    >
                      <History className="w-3 h-3 mr-1" />
                      History
                    </Button>
                  )}
                </div>

                {summary.finishedCandidate && (
                  <div className="p-1.5 rounded bg-purple-950/20 border border-purple-500/20 text-[10px] text-purple-300 flex items-center justify-between">
                    <span>FINISHED FABRIC CANDIDATE</span>
                    <span className="font-semibold text-emerald-400">NON-INVENTORY</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Commercial Release Dialog Modal */}
      {selectedRollId && (
        <FabricCommercialReleaseDialog
          open={isReleaseDialogOpen}
          onOpenChange={setIsReleaseDialogOpen}
          rollNodeIdOrIdentity={selectedRollId}
          order={order}
          jobCard={jobCards[0]}
          onReleaseConfirmed={() => {
            onRefresh?.();
          }}
        />
      )}

      {/* Global Commercial Audit History Modal */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="max-w-4xl bg-slate-900 border-slate-800 text-white font-sans max-h-[88vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-800 pb-3">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-400" />
              <span>Full Commercial Release Simulation History</span>
            </DialogTitle>
          </DialogHeader>
          <FabricCommercialReleaseHistory
            onRefresh={() => {
              onRefresh?.();
            }}
            onReviseRequested={(rel) => {
              setIsHistoryModalOpen(false);
              setSelectedRollId(rel.rollGenealogyNodeId);
              setIsReleaseDialogOpen(true);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

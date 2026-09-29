import React, { useState, useMemo } from "react";
import {
  GitBranch,
  Layers,
  Split,
  History,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  Scale,
  Clock,
  Sparkles,
  RefreshCw,
  FileText,
  ChevronRight,
  Route,
  Activity,
  Boxes,
  HelpCircle,
  Info,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  FabricRollGenealogyService,
  type FabricRollGenealogyNode,
  type RollIdentityStatus,
} from "@/services/fabric-roll-genealogy.service";
import {
  ProductionPlanningService,
  type FabricRollDraft,
  type JobCardDraft,
} from "@/services/production-planning.service";
import type { ProductionOrder } from "@/lib/production-store";
import { FabricRollSplitDialog } from "./fabric-roll-split-dialog";
import { FabricRollGenealogyTree } from "./fabric-roll-genealogy-tree";
import { FabricRollSplitHistory } from "./fabric-roll-split-history";
import { FabricPostProcessQualityDialog } from "./fabric-post-process-quality-dialog";
import { FabricPostProcessQualityService } from "@/services/fabric-post-process-quality.service";
import { FabricCommercialReleaseDialog } from "@/components/fabric-commercial-release-dialog";

interface FabricRollGenealogyWorkspaceProps {
  order?: ProductionOrder | null | undefined;
  jobCards?: JobCardDraft[] | undefined;
  rolls: FabricRollDraft[];
  onRefresh?: (() => void) | undefined;
}

const STATUS_BADGES: Record<RollIdentityStatus, { label: string; class: string }> = {
  ACTIVE: {
    label: "ACTIVE",
    class: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
  },
  SUPERSEDED_BY_SPLIT: {
    label: "SUPERSEDED BY SPLIT",
    class: "border-slate-700 text-slate-400 bg-slate-900/80",
  },
  REVIEW_REQUIRED: {
    label: "REVIEW REQUIRED",
    class: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  },
};

export function FabricRollGenealogyWorkspace({
  order,
  jobCards = [],
  rolls,
  onRefresh,
}: FabricRollGenealogyWorkspaceProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [generationFilter, setGenerationFilter] = useState<string>("ALL");
  const [rootFilter, setRootFilter] = useState<string>("ALL");

  // Selection states for dialogs & details modal
  const [selectedRollForSplit, setSelectedRollForSplit] = useState<FabricRollDraft | null>(null);
  const [isSplitDialogOpen, setIsSplitDialogOpen] = useState<boolean>(false);

  const [selectedNodeForTree, setSelectedNodeForTree] = useState<FabricRollGenealogyNode | null>(null);
  const [isTreeModalOpen, setIsTreeModalOpen] = useState<boolean>(false);

  const [selectedNodeForHistory, setSelectedNodeForHistory] = useState<FabricRollGenealogyNode | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);

  const [selectedNodeForLineage, setSelectedNodeForLineage] = useState<FabricRollGenealogyNode | null>(null);
  const [isLineageModalOpen, setIsLineageModalOpen] = useState<boolean>(false);

  // Phase 5G Quality Dialog state (Step 51)
  const [selectedRollForQuality, setSelectedRollForQuality] = useState<FabricRollDraft | null>(null);
  const [isQualityDialogOpen, setIsQualityDialogOpen] = useState<boolean>(false);

  // Phase 5H Commercial Release Dialog state (Step 50)
  const [selectedRollIdForCommercial, setSelectedRollIdForCommercial] = useState<string | null>(null);
  const [isCommercialDialogOpen, setIsCommercialDialogOpen] = useState<boolean>(false);

  const handleOpenCommercialForNode = (node: FabricRollGenealogyNode) => {
    setSelectedRollIdForCommercial(node.id);
    setIsCommercialDialogOpen(true);
  };

  const handleOpenQualityForNode = (node: FabricRollGenealogyNode) => {
    const matchingDraft = rolls.find((r) => r.id === node.id || r.temporaryRollNo === node.rollIdentity);
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
    setSelectedRollForQuality(draft);
    setIsQualityDialogOpen(true);
  };

  // Auto-register/ensure root nodes for all active fabric roll drafts
  useMemo(() => {
    rolls.forEach((r) => {
      FabricRollGenealogyService.getOrCreateRootFromFabricRollDraft(r);
    });
  }, [rolls]);

  // All nodes from service store
  const allNodes: FabricRollGenealogyNode[] = useMemo(() => {
    return FabricRollGenealogyService.getAllNodes();
  }, [rolls, isSplitDialogOpen]);

  // Overall KPIs (Step 46)
  const kpis = useMemo(() => {
    const rootRolls = allNodes.filter((n) => n.generation === 0).length;
    const activeLeafRolls = allNodes.filter(
      (n) => n.identityStatus === "ACTIVE" && FabricRollGenealogyService.getChildren(n.id).length === 0
    ).length;
    const supersededParents = allNodes.filter(
      (n) => n.identityStatus === "SUPERSEDED_BY_SPLIT"
    ).length;
    const reviewRequired = allNodes.filter(
      (n) => n.identityStatus === "REVIEW_REQUIRED"
    ).length;
    const totalSplitEvents = allNodes.filter(
      (n) => n.generation > 0 && n.splitSequence === 1
    ).length;

    return {
      rootRolls,
      activeLeafRolls,
      supersededParents,
      reviewRequired,
      totalSplitEvents,
    };
  }, [allNodes]);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    return allNodes.filter((node: FabricRollGenealogyNode) => {
      // Search by rollIdentity or displayRollNo
      if (
        searchTerm &&
        !node.rollIdentity.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !node.displayRollNo.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      // Status Filter
      if (statusFilter !== "ALL" && node.identityStatus !== statusFilter) {
        return false;
      }

      // Generation Filter
      if (generationFilter !== "ALL" && String(node.generation) !== generationFilter) {
        return false;
      }

      // Root Filter
      if (rootFilter !== "ALL" && node.rootNodeId !== rootFilter) {
        return false;
      }

      return true;
    });
  }, [allNodes, searchTerm, statusFilter, generationFilter, rootFilter]);

  // Unique root options
  const rootOptions = useMemo(() => {
    const map = new Map<string, string>();
    allNodes.forEach((n: FabricRollGenealogyNode) => {
      if (n.generation === 0) {
        map.set(n.id, n.rollIdentity);
      }
    });
    return Array.from(map.entries());
  }, [allNodes]);

  // Handle open split dialog for a node or roll
  const handleOpenSplit = (node: FabricRollGenealogyNode) => {
    if (!FabricRollGenealogyService.isRollOperationallyActive(node.id)) {
      return;
    }
    // Find matching FabricRollDraft or synthesize draft context
    const matchingDraft = rolls.find(
      (r) => r.id === node.sourceRollDraftId || r.temporaryRollNo === node.displayRollNo
    );

    const targetDraft: FabricRollDraft = matchingDraft || {
      id: node.id,
      receiveDraftId: "rcv-sim",
      jobCardId: node.jobCardId || "jc-sim",
      productionOrderId: node.productionOrderId || "po-sim",
      rollSequence: 1,
      temporaryRollNo: node.displayRollNo || node.rollIdentity,
      qtyMetre: node.quantityMetre,
      inspectionStatus: "UNINSPECTED",
      stockStatus: "DRAFT_GREY",
      isSaleable: false,
    };

    setSelectedRollForSplit(targetDraft);
    setIsSplitDialogOpen(true);
  };

  // Safe Job Card lookups
  const findJobCard = (jobCardId?: string) => {
    if (!jobCardId) return undefined;
    return jobCards.find((jc) => jc.id === jobCardId);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner / Disclaimer */}
      <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">Fabric Roll Genealogy & Split Workspace</span>
              <Badge variant="outline" className="border-indigo-500/40 text-indigo-300 text-[10px]">
                PHASE 5F · FRONTEND SIMULATION
              </Badge>
            </div>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Strict quantity conservation · Immutable parent lineage · Zero legacy inventory mutation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="border-slate-700 text-slate-400 text-[10px]">
            Label: PENDING AUTHORITATIVE ROLL NUMBER
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

      {/* KPI Cards (Step 46) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Root Rolls */}
        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Root Rolls</span>
              <Boxes className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-xl font-bold font-mono text-white">{kpis.rootRolls}</div>
            <span className="text-[10px] text-slate-500 block">Original uncut parent units</span>
          </CardContent>
        </Card>

        {/* Active Leaf Rolls */}
        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Active Leaf Rolls</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-bold font-mono text-emerald-300">{kpis.activeLeafRolls}</div>
            <span className="text-[10px] text-slate-500 block">Operationally active physical rolls</span>
          </CardContent>
        </Card>

        {/* Superseded Parents */}
        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Superseded Parents</span>
              <Layers className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-xl font-bold font-mono text-slate-400">{kpis.supersededParents}</div>
            <span className="text-[10px] text-slate-500 block">Historical parent references</span>
          </CardContent>
        </Card>

        {/* Review Required */}
        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Review Required</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-bold font-mono text-amber-300">{kpis.reviewRequired}</div>
            <span className="text-[10px] text-slate-500 block">Discrepancy / revision alerts</span>
          </CardContent>
        </Card>

        {/* Split Events */}
        <Card className="bg-slate-900/80 border-slate-800 col-span-2 sm:col-span-1">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Split Events</span>
              <Split className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-xl font-bold font-mono text-cyan-300">{kpis.totalSplitEvents}</div>
            <span className="text-[10px] text-slate-500 block">Simulated split operations</span>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar (Step 45) */}
      <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search roll identity, temp roll no, parent..."
              className="pl-9 h-9 text-xs bg-slate-950 border-slate-800 text-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-300 w-36">
                <SelectValue placeholder="Status: All" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                <SelectItem value="ALL">Status: All</SelectItem>
                <SelectItem value="ACTIVE">Active Only</SelectItem>
                <SelectItem value="SUPERSEDED_BY_SPLIT">Superseded Only</SelectItem>
                <SelectItem value="REVIEW_REQUIRED">Review Required</SelectItem>
              </SelectContent>
            </Select>

            {/* Generation Filter */}
            <Select value={generationFilter} onValueChange={setGenerationFilter}>
              <SelectTrigger className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-300 w-32">
                <SelectValue placeholder="Gen: All" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                <SelectItem value="ALL">Gen: All</SelectItem>
                <SelectItem value="0">Gen 0 (Root)</SelectItem>
                <SelectItem value="1">Gen 1 (Child)</SelectItem>
                <SelectItem value="2">Gen 2 (Grandchild)</SelectItem>
                <SelectItem value="3">Gen 3+</SelectItem>
              </SelectContent>
            </Select>

            {/* Root Roll Filter */}
            {rootOptions.length > 1 && (
              <Select value={rootFilter} onValueChange={setRootFilter}>
                <SelectTrigger className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-300 w-36">
                  <SelectValue placeholder="Root Roll: All" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                  <SelectItem value="ALL">Root Roll: All</SelectItem>
                  {rootOptions.map(([id, label]) => (
                    <SelectItem key={id} value={id}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {(searchTerm || statusFilter !== "ALL" || generationFilter !== "ALL" || rootFilter !== "ALL") && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("ALL");
                  setGenerationFilter("ALL");
                  setRootFilter("ALL");
                }}
                className="h-9 text-xs text-slate-400 hover:text-white"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table / Cards View (Step 44, 50, 51, 52) */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden shadow-xl">
        {/* Desktop / Tablet Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 border-collapse min-w-[900px]">
            <thead className="bg-slate-900/90 text-[10px] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">Roll Identity</th>
                <th className="py-3 px-3">Qty (MTR)</th>
                <th className="py-3 px-3">Root / Parent</th>
                <th className="py-3 px-3 text-center">Gen</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Quality Lineage</th>
                <th className="py-3 px-3">Route Lineage</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {filteredNodes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-sans">
                    No fabric rolls matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredNodes.map((node: FabricRollGenealogyNode) => {
                  const statusMeta = STATUS_BADGES[node.identityStatus] || STATUS_BADGES.ACTIVE;
                  const isRoot = node.generation === 0;
                  const isSuperseded = node.identityStatus === "SUPERSEDED_BY_SPLIT";
                  const isActive = node.identityStatus === "ACTIVE";

                  // Parent lookup
                  const parentNode = node.parentNodeId
                    ? FabricRollGenealogyService.getRollNode(node.parentNodeId)
                    : undefined;

                  const isLeaf = FabricRollGenealogyService.getChildren(node.id).length === 0;
                  const existingQuality = FabricPostProcessQualityService.getLatestInspectionForRoll(node.id);

                  return (
                    <tr
                      key={node.id}
                      className={`hover:bg-slate-900/40 transition-colors ${
                        isSuperseded ? "opacity-75 bg-slate-950/40" : ""
                      }`}
                    >
                      {/* Roll Identity */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold ${
                              isActive ? "text-indigo-300" : isSuperseded ? "text-slate-400 line-through decoration-slate-600" : "text-amber-300"
                            }`}
                          >
                            {node.rollIdentity}
                          </span>
                          {isRoot && (
                            <Badge variant="outline" className="border-cyan-500/40 text-cyan-300 text-[9px] py-0 px-1">
                              ROOT
                            </Badge>
                          )}
                        </div>
                        {node.displayRollNo && node.displayRollNo !== node.rollIdentity && (
                          <span className="text-[10px] text-slate-500 font-sans block">
                            Temp: {node.displayRollNo}
                          </span>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="py-3 px-3 font-bold text-white">
                        {node.quantityMetre.toFixed(3)}
                      </td>

                      {/* Root / Parent */}
                      <td className="py-3 px-3 font-sans text-[11px]">
                        {isRoot ? (
                          <span className="text-slate-500">—</span>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="text-slate-300 block truncate max-w-[120px]" title={parentNode?.rollIdentity || node.parentNodeId}>
                              P: {parentNode?.rollIdentity || "Parent"}
                            </span>
                            <span className="text-[10px] text-slate-500 block truncate max-w-[120px]">
                              Root: {node.rootRollIdentity || node.rootNodeId.slice(0, 10)}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Generation */}
                      <td className="py-3 px-3 text-center">
                        <Badge variant="outline" className="border-slate-800 text-slate-400 text-[10px] font-mono">
                          G{node.generation}
                        </Badge>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <Badge variant="outline" className={`text-[10px] ${statusMeta.class}`}>
                          {statusMeta.label}
                        </Badge>
                        {isSuperseded && (
                          <span className="text-[9px] text-slate-500 font-sans block mt-0.5">
                            Use active children
                          </span>
                        )}
                      </td>

                      {/* Quality Lineage (Step 26, 27) */}
                      <td className="py-3 px-3 font-sans text-[11px]">
                        {node.inheritedGrade ? (
                          <div>
                            <span className="text-indigo-300 block">
                              Grade {node.inheritedGrade} ({node.inheritedDisposition || "REF"})
                            </span>
                            <span className="text-[9px] text-slate-500 block">
                              Source reference only
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500">Uninspected</span>
                        )}
                      </td>

                      {/* Route Lineage (Step 28, 38) */}
                      <td className="py-3 px-3 font-sans text-[11px]">
                        {node.sourceParentRoutePlanId ? (
                          <div>
                            <span className="text-slate-300 block">
                              Parent Route Reference
                            </span>
                            <span className="text-[9px] text-amber-400/80 block">
                              Review Required / Not Planned
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500">Not Planned</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 font-sans">
                          {/* Quality Actions (Step 51) */}
                          {isActive && isLeaf ? (
                            existingQuality ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenQualityForNode(node)}
                                className="h-6 text-[10px] px-2 border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/40 flex items-center gap-1"
                                title="View Quality Result / Reinspect"
                              >
                                <ShieldCheck className="w-3 h-3" />
                                View Quality
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenQualityForNode(node)}
                                className="h-6 text-[10px] px-2 border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40 flex items-center gap-1"
                                title="Inspect Quality After Process"
                              >
                                <ShieldCheck className="w-3 h-3" />
                                Inspect After Process
                              </Button>
                            )
                          ) : isSuperseded ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenQualityForNode(node)}
                              className="h-6 text-[10px] px-2 text-slate-400 hover:text-white hover:bg-slate-800 flex items-center gap-1"
                              title="View Historical Quality Audit Trail (No Operational Inspection)"
                            >
                              <History className="w-3 h-3 text-slate-500" />
                              View Quality History
                            </Button>
                          ) : null}

                          {/* Split Action (Step 1, 36) */}
                          {isActive ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenSplit(node)}
                              className="h-6 text-[10px] px-2 border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40 flex items-center gap-1"
                            >
                              <Split className="w-3 h-3" />
                              Split Roll
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              disabled
                              variant="ghost"
                              className="h-6 text-[10px] px-2 text-slate-600 cursor-not-allowed"
                              title="Superseded rolls cannot be split. Use active child rolls."
                            >
                              Split Disabled
                            </Button>
                          )}

                          {/* View Tree */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedNodeForTree(node);
                              setIsTreeModalOpen(true);
                            }}
                            className="h-6 text-[10px] px-2 text-slate-400 hover:text-white hover:bg-slate-800"
                            title="View Genealogy Tree"
                          >
                            <GitBranch className="w-3 h-3" />
                          </Button>

                          {/* Split History */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedNodeForHistory(node);
                              setIsHistoryModalOpen(true);
                            }}
                            className="h-6 text-[10px] px-2 text-slate-400 hover:text-white hover:bg-slate-800"
                            title="Split History"
                          >
                            <History className="w-3 h-3" />
                          </Button>

                          {/* Lineage & Traceability */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedNodeForLineage(node);
                              setIsLineageModalOpen(true);
                            }}
                            className="h-6 text-[10px] px-2 text-slate-400 hover:text-white hover:bg-slate-800"
                            title="Traceability Lineage"
                          >
                            <ChevronRight className="w-3 h-3" />
                          </Button>

                          {/* Commercial Release / History (Step 50) */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenCommercialForNode(node)}
                            className="h-6 text-[10px] px-2 text-slate-400 hover:text-emerald-300 hover:bg-slate-800"
                            title={isActive && isLeaf ? "Review Commercial Release" : "View Commercial History"}
                          >
                            <Sparkles className="w-3 h-3" />
                          </Button>
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

      {/* Split Dialog Modal */}
      {selectedRollForSplit && (
        <FabricRollSplitDialog
          open={isSplitDialogOpen}
          onOpenChange={setIsSplitDialogOpen}
          roll={selectedRollForSplit}
          order={order}
          jobCard={findJobCard(selectedRollForSplit.jobCardId)}
          onSplitConfirmed={() => {
            onRefresh?.();
          }}
        />
      )}

      {/* Genealogy Tree Modal (Step 21) */}
      {selectedNodeForTree && (
        <Dialog open={isTreeModalOpen} onOpenChange={setIsTreeModalOpen}>
          <DialogContent className="max-w-4xl bg-slate-900 border-slate-800 text-white font-sans max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b border-slate-800 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-base font-bold flex items-center gap-2">
                    <GitBranch className="w-5 h-5 text-indigo-400" />
                    <span>Roll Genealogy Tree & Active Leaves</span>
                  </DialogTitle>
                  <DialogDescription className="text-slate-400 text-xs">
                    Root: {selectedNodeForTree.rootRollIdentity} · Inspected Node: {selectedNodeForTree.rollIdentity}
                  </DialogDescription>
                </div>
                <Badge variant="outline" className="border-indigo-500/40 text-indigo-300 font-mono text-xs">
                  {selectedNodeForTree.rollIdentity}
                </Badge>
              </div>
            </DialogHeader>

            <FabricRollGenealogyTree
              rootNodeId={selectedNodeForTree.rootNodeId}
              selectedNodeId={selectedNodeForTree.id}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Split History Modal (Step 30) */}
      {selectedNodeForHistory && (
        <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
          <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-white font-sans max-h-[85vh] overflow-y-auto">
            <DialogHeader className="border-b border-slate-800 pb-3">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-400" />
                  <span>Split History & Revisions</span>
                </DialogTitle>
                <Badge variant="outline" className="border-indigo-500/40 text-indigo-300 font-mono text-xs">
                  {selectedNodeForHistory.rollIdentity}
                </Badge>
              </div>
              <DialogDescription className="text-slate-400 text-xs">
                Audit trail of confirmed roll split plans for {selectedNodeForHistory.rollIdentity}
              </DialogDescription>
            </DialogHeader>

            <FabricRollSplitHistory parentNodeId={selectedNodeForHistory.id} />
          </DialogContent>
        </Dialog>
      )}

      {/* Traceability Lineage Modal (Step 47) */}
      {selectedNodeForLineage && (
        <Dialog open={isLineageModalOpen} onOpenChange={setIsLineageModalOpen}>
          <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-white font-sans">
            <DialogHeader className="border-b border-slate-800 pb-3">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>Full Roll Traceability & Context</span>
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs font-mono">
                Identity: {selectedNodeForLineage.rollIdentity} ({selectedNodeForLineage.quantityMetre.toFixed(3)} MTR)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 font-sans text-xs">
              {/* Upstream Production Lineage (Step 47) */}
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Upstream Production Traceability
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-sans block">Production Order</span>
                    <span className="text-white block">{order?.order_no || selectedNodeForLineage.productionOrderId || "PO-STD"}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-sans block">Job Card</span>
                    <span className="text-white block">{findJobCard(selectedNodeForLineage.jobCardId)?.draftCardNo || selectedNodeForLineage.jobCardId || "JC-STD"}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-sans block">Root Roll</span>
                    <span className="text-cyan-300 block">{selectedNodeForLineage.rootRollIdentity}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-sans block">Direct Parent</span>
                    <span className="text-slate-300 block">{selectedNodeForLineage.parentRollIdentity || "None (Root)"}</span>
                  </div>
                </div>
              </div>

              {/* Quality & Route Context Warnings (Step 27, 28, 48, 49) */}
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Safety & Lineage Constraints
                </span>
                <div className="space-y-1.5 text-[11px] text-slate-300">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Quality Lineage:</strong> Child rolls inherit quality context from parent by reference only. No new inspection has been performed.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Route Planning:</strong> Parent process route is not automatically executed for child rolls. Child routes require explicit review.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Stock & Location:</strong> No warehouse bay or bin has been posted. Roll ID is a frontend genealogy reference pending authoritative stock number.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {/* Phase 5G Post-Process Quality Dialog Modal (Step 51) */}
      {selectedRollForQuality && (
        <FabricPostProcessQualityDialog
          open={isQualityDialogOpen}
          onOpenChange={setIsQualityDialogOpen}
          roll={selectedRollForQuality}
          order={order}
          jobCard={findJobCard(selectedRollForQuality.jobCardId)}
          onSaved={() => {
            onRefresh?.();
          }}
        />
      )}

      {/* Phase 5H Commercial Release Dialog Modal (Step 50) */}
      {selectedRollIdForCommercial && (
        <FabricCommercialReleaseDialog
          open={isCommercialDialogOpen}
          onOpenChange={setIsCommercialDialogOpen}
          rollNodeIdOrIdentity={selectedRollIdForCommercial}
          order={order}
          jobCard={jobCards[0]}
          onReleaseConfirmed={() => {
            onRefresh?.();
          }}
        />
      )}
    </div>
  );
}

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  History,
  Layers,
  Sparkles,
  Plus,
  Trash2,
  RefreshCw,
  Scale,
  Clock,
  ArrowRight,
  Info,
  Route,
  Ban,
  AlertOctagon,
  FileCheck2,
} from "lucide-react";
import {
  FabricPostProcessQualityService,
  calculateCoverage,
  deriveInspectionStatus,
  deriveRouteReviewSignal,
  deriveCommercialReleasePreview,
  validateInspectedQty,
  type FabricPostProcessInspection,
  type InspectionPurpose,
  type PostProcessQualitySummary,
} from "@/services/fabric-post-process-quality.service";
import {
  FabricRollGenealogyService,
  type FabricRollGenealogyNode,
} from "@/services/fabric-roll-genealogy.service";
import {
  ProductionPlanningService,
  type FabricRollDraft,
  type FabricDefectLine,
  type FabricDefectType,
  type FabricGrade,
  type FabricDisposition,
  type JobCardDraft,
} from "@/services/production-planning.service";
import {
  FabricProcessReceiveService,
  type FabricProcessReceiveSimulation,
} from "@/services/fabric-process-receive.service";
import {
  FabricProcessRoutingService,
  type FabricProcessRoutePlan,
} from "@/services/fabric-process-routing.service";
import type { ProductionOrder } from "@/lib/production-store";
import { FabricPostProcessQualityHistory } from "./fabric-post-process-quality-history";

interface FabricPostProcessQualityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roll: FabricRollDraft | null;
  order?: ProductionOrder | null | undefined;
  jobCard?: JobCardDraft | null | undefined;
  sourceProcessReceiveId?: string | undefined;
  targetReinspectionFrom?: FabricPostProcessInspection | null | undefined;
  onSaved?: (() => void) | undefined;
}

const COMMON_DEFECT_TYPES: { value: FabricDefectType; label: string }[] = [
  { value: "broken_end", label: "Broken End" },
  { value: "missing_pick", label: "Missing Pick" },
  { value: "oil_stain", label: "Oil Stain" },
  { value: "oil_mark", label: "Oil Mark" },
  { value: "hole", label: "Hole / Tear" },
  { value: "warp_float", label: "Warp Float" },
  { value: "weft_slub", label: "Weft Slub" },
  { value: "slub", label: "Slub" },
  { value: "tension_variation", label: "Tension Variation" },
  { value: "reed_mark", label: "Reed Mark" },
  { value: "shade_variation", label: "Shade Variation" },
  { value: "width_variation", label: "Width Variation" },
  { value: "stain", label: "Chemical / Dirt Stain" },
  { value: "other", label: "Other" },
];

export function FabricPostProcessQualityDialog({
  open,
  onOpenChange,
  roll,
  order,
  jobCard,
  sourceProcessReceiveId,
  targetReinspectionFrom,
  onSaved,
}: FabricPostProcessQualityDialogProps) {
  const [activeTab, setActiveTab] = useState<"inspect" | "history">("inspect");

  // Form Fields
  const [purpose, setPurpose] = useState<InspectionPurpose>("POST_PROCESS");
  const [inspectedQtyInput, setInspectedQtyInput] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<FabricGrade>("UNASSIGNED");
  const [gradeReason, setGradeReason] = useState<string>("");
  const [disposition, setDisposition] = useState<FabricDisposition | "NOT_SET">("NOT_SET");
  const [dispositionReason, setDispositionReason] = useState<string>("");
  const [reinspectionReason, setReinspectionReason] = useState<string>("");
  const [inspectorName, setInspectorName] = useState<string>("QA Specialist");
  const [remark, setRemark] = useState<string>("");

  // Defects
  const [defects, setDefects] = useState<FabricDefectLine[]>([]);

  // Result state after save
  const [savedInspection, setSavedInspection] = useState<FabricPostProcessInspection | null>(null);

  // Active Roll Genealogy Node Lookup
  const genealogyNode = useMemo(() => {
    if (!roll) return undefined;
    return (
      FabricRollGenealogyService.getRollNode(roll.id) ||
      FabricRollGenealogyService.getRollNodeByIdentity(roll.temporaryRollNo) ||
      FabricRollGenealogyService.getOrCreateRootFromFabricRollDraft(roll)
    );
  }, [roll, open]);

  // Operational eligibility check (Step 1, 6)
  const identityValidation = useMemo(() => {
    if (!genealogyNode) return { eligible: false, message: "No genealogy context." };
    return FabricPostProcessQualityService.validateInspectionRollIdentity(genealogyNode.id);
  }, [genealogyNode, open]);

  // Process Receive Context Lookup (Step 5, 8, 9)
  const linkedReceive = useMemo(() => {
    if (sourceProcessReceiveId) {
      return FabricProcessReceiveService.getReceiveById(sourceProcessReceiveId);
    }
    if (roll) {
      return FabricProcessReceiveService.getActiveReceiveForRoll(roll.id);
    }
    return undefined;
  }, [sourceProcessReceiveId, roll, open]);

  // Process Route Context Lookup (Step 31, 32)
  const routePlan = useMemo(() => {
    if (!roll) return undefined;
    return FabricProcessRoutingService.getRoutePlanForRoll(roll.id);
  }, [roll, open]);

  const isFinalRouteStep = useMemo(() => {
    if (!routePlan || routePlan.steps.length === 0) return false;
    const lastStep = routePlan.steps[routePlan.steps.length - 1];
    return linkedReceive ? lastStep?.id === linkedReceive.routeStepId : false;
  }, [routePlan, linkedReceive]);

  // Prior Phase 5B Quality Context (Step 6)
  const prior5BQuality = useMemo(() => {
    if (!roll) return undefined;
    return ProductionPlanningService.getRollQualitySummary(roll);
  }, [roll, open]);

  // Parent Quality Reference for Child Rolls (Step 7)
  const parentNode = useMemo(() => {
    if (!genealogyNode || !genealogyNode.parentNodeId) return undefined;
    return FabricRollGenealogyService.getRollNode(genealogyNode.parentNodeId);
  }, [genealogyNode]);

  // Latest existing post-process inspection for this roll
  const latestExistingInspection = useMemo(() => {
    if (!genealogyNode) return undefined;
    return FabricPostProcessQualityService.getLatestInspectionForRoll(genealogyNode.id);
  }, [genealogyNode, open, savedInspection]);

  // Previous defects from prior inspection (Step 15: displayed for context, not auto-copied)
  const previousDefects = useMemo(() => {
    if (targetReinspectionFrom) return targetReinspectionFrom.defects;
    if (latestExistingInspection) return latestExistingInspection.defects;
    return [];
  }, [targetReinspectionFrom, latestExistingInspection]);

  // Initialize or Reset Form
  useEffect(() => {
    if (open && genealogyNode) {
      setSavedInspection(null);
      setActiveTab("inspect");

      const rollQty = genealogyNode.quantityMetre;

      if (targetReinspectionFrom) {
        setPurpose("REINSPECTION");
        setInspectedQtyInput(String(rollQty));
        setSelectedGrade("UNASSIGNED"); // Do not auto-copy grade
        setGradeReason("");
        setDisposition("NOT_SET");
        setDispositionReason("");
        setReinspectionReason("");
        setDefects([]); // Start clean: previous defects not auto-copied
      } else {
        setPurpose("POST_PROCESS");
        setInspectedQtyInput(String(rollQty)); // Default full roll length
        setSelectedGrade("UNASSIGNED"); // Default UNASSIGNED
        setGradeReason("");
        setDisposition("NOT_SET");
        setDispositionReason("");
        setReinspectionReason("");
        setDefects([]);
      }
    }
  }, [open, genealogyNode, targetReinspectionFrom]);

  // Parsed and derived quantities
  const parsedInspectedQty = parseFloat(inspectedQtyInput) || 0;
  const rollQty = genealogyNode?.quantityMetre || 0;
  const coverage = calculateCoverage(parsedInspectedQty, rollQty);
  const inspectionStatus = deriveInspectionStatus(parsedInspectedQty, rollQty);

  const isReceiveClean = linkedReceive ? linkedReceive.reconciliation.isCleanExact : true;

  // Real-time Preview calculations via domain service (Step 58)
  const routeSignal = deriveRouteReviewSignal(disposition, isFinalRouteStep);
  const releasePreview = deriveCommercialReleasePreview({
    disposition,
    isRouteCompletePreview: isFinalRouteStep,
    isReceiveCleanExact: isReceiveClean,
    inspectionStatus,
  });

  // Validation
  const qtyValidation = validateInspectedQty(parsedInspectedQty, rollQty);
  const isReinspectionBlocked =
    purpose === "REINSPECTION" && (!reinspectionReason || !reinspectionReason.trim());

  const canSave =
    identityValidation.eligible &&
    qtyValidation.valid &&
    !isReinspectionBlocked &&
    parsedInspectedQty > 0;

  // Handle Defect Operations (Step 16)
  const handleAddDefect = () => {
    const newDefect: FabricDefectLine = {
      id: `def-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      defectType: "other",
      positionMetre: 0,
      severity: "MINOR",
    };
    setDefects([...defects, newDefect]);
  };

  const handleRemoveDefect = (defectId: string) => {
    setDefects(defects.filter((d) => d.id !== defectId));
  };

  const handleUpdateDefect = (defectId: string, updates: Partial<FabricDefectLine>) => {
    setDefects(
      defects.map((d) => (d.id === defectId ? { ...d, ...updates } : d))
    );
  };

  // Handle Save Inspection (Step 34, 35)
  const handleSave = () => {
    if (!canSave || !genealogyNode) return;

    // 1. Create or get draft from service
    const draftRes = FabricPostProcessQualityService.createPostProcessInspectionDraft({
      rollIdentityOrNodeId: genealogyNode.id,
      inspectionPurpose: purpose,
      sourceProcessReceiveId: linkedReceive?.id,
      previousInspectionId: targetReinspectionFrom?.id || latestExistingInspection?.id,
      reinspectionReason: purpose === "REINSPECTION" ? reinspectionReason.trim() : undefined,
    });

    if (!draftRes.success || !draftRes.draft) {
      return;
    }

    // 2. Save through authoritative service
    const saveRes = FabricPostProcessQualityService.savePostProcessInspection({
      inspectionDraft: draftRes.draft,
      inspectedQtyMetre: parsedInspectedQty,
      defects,
      proposedGrade: selectedGrade,
      gradeSource: selectedGrade !== "UNASSIGNED" ? "MANUAL" : "UNASSIGNED",
      gradeReason: gradeReason.trim() || undefined,
      disposition,
      dispositionReason: dispositionReason.trim() || undefined,
      inspectorName: inspectorName.trim() || undefined,
      remark: remark.trim() || undefined,
    });

    if (saveRes.success && saveRes.inspection) {
      setSavedInspection(saveRes.inspection);
      onSaved?.();
    }
  };

  if (!roll || !genealogyNode) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-slate-900 border-slate-800 text-white font-sans max-h-[92vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-800 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <span>
                  {purpose === "REINSPECTION"
                    ? "POST-PROCESS REINSPECTION"
                    : "POST-PROCESS QUALITY INSPECTION"}
                </span>
                <Badge variant="outline" className="border-indigo-500/40 text-indigo-300 text-[10px]">
                  PHASE 5G · FRONTEND SIMULATION
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs mt-0.5">
                Physical roll quality evaluation, defect logging & commercial release preview. Zero stock mutation.
              </DialogDescription>
            </div>

            <Badge variant="outline" className="border-slate-700 text-slate-300 font-mono text-xs">
              Roll: {genealogyNode.rollIdentity}
            </Badge>
          </div>
        </DialogHeader>

        {/* Identity & Superseded Warning (Critical Rule & Step 1, 6) */}
        {!identityValidation.eligible && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              <strong>INSPECTION BLOCKED:</strong> {identityValidation.message}
            </span>
          </div>
        )}

        {/* Source Process Receive Review Banner (Step 33) */}
        {linkedReceive && !linkedReceive.reconciliation.isCleanExact && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>SOURCE PROCESS RECEIVE REQUIRES REVIEW:</strong> Receive #{linkedReceive.id} has unverified quantity variance. Quality inspection status will be marked REVIEW REQUIRED with no commercial release authority.
            </span>
          </div>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="bg-slate-950 border border-slate-800 p-0.5">
            <TabsTrigger
              value="inspect"
              className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
            >
              <FileCheck2 className="w-3.5 h-3.5 mr-1.5" />
              Inspection & Evaluation
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
            >
              <History className="w-3.5 h-3.5 mr-1.5" />
              Quality History & Reinspections
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inspect" className="space-y-4 pt-2">
            {/* Success Summary Banner (Step 35) */}
            {savedInspection && (
              <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between pb-1 border-b border-emerald-500/30 font-bold text-emerald-300">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>POST-PROCESS QUALITY INSPECTION RECORDED</span>
                  </div>
                  <span>{savedInspection.id}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div>Roll: <strong className="text-white">{savedInspection.rollIdentity}</strong></div>
                  <div>Grade: <strong className="text-white">{savedInspection.proposedGrade} ({savedInspection.gradeSource})</strong></div>
                  <div>Disposition: <strong className="text-white">{savedInspection.disposition}</strong></div>
                  <div>Commercial Release: <strong className="text-cyan-300">PENDING (PREVIEW)</strong></div>
                </div>
                <div className="text-[10px] text-emerald-300/80 font-sans">
                  Inventory balances and physical locations remain UNCHANGED. Zero database mutations.
                </div>
              </div>
            )}

            {/* Inherited Roll & Process Context (Step 4 & 5) */}
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] font-sans">
                  Inherited Production & Process Context (Read-Only)
                </span>
                <Badge variant="outline" className="border-slate-800 text-slate-500 text-[10px]">
                  Gen G{genealogyNode.generation} {genealogyNode.generation === 0 ? "Root" : "Child Leaf"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px]">
                <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                  <span className="text-[9px] text-slate-500 uppercase font-sans block">Roll Identity</span>
                  <span className="text-white font-bold truncate block">{genealogyNode.rollIdentity}</span>
                </div>

                <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                  <span className="text-[9px] text-slate-500 uppercase font-sans block">Roll Length</span>
                  <span className="text-emerald-400 font-bold block">{genealogyNode.quantityMetre.toFixed(3)} MTR</span>
                </div>

                <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                  <span className="text-[9px] text-slate-500 uppercase font-sans block">Production Order</span>
                  <span className="text-white truncate block">{order?.order_no || genealogyNode.productionOrderId || "PO-STD"}</span>
                </div>

                <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                  <span className="text-[9px] text-slate-500 uppercase font-sans block">Job Card</span>
                  <span className="text-white truncate block">{jobCard?.draftCardNo || genealogyNode.jobCardId || "JC-STD"}</span>
                </div>

                <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                  <span className="text-[9px] text-slate-500 uppercase font-sans block">Source Process</span>
                  <span className="text-cyan-300 truncate block">
                    {linkedReceive?.processName || routePlan?.steps[0]?.processName || "General Process"}
                  </span>
                </div>

                <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                  <span className="text-[9px] text-slate-500 uppercase font-sans block">Receive Ref</span>
                  <span className="text-slate-300 truncate block">{linkedReceive?.id || "DIRECT ROUTE"}</span>
                </div>
              </div>

              {/* Parent Quality Context for Child Roll (Step 7) */}
              {parentNode && (
                <div className="p-2 rounded bg-indigo-950/20 border border-indigo-500/20 text-indigo-300 text-[10px] font-sans flex items-center justify-between">
                  <span>
                    <strong>PARENT QUALITY REFERENCE:</strong> Parent {parentNode.rollIdentity} Grade: {parentNode.inheritedGrade || "UNASSIGNED"}. Child Roll has not been independently inspected from this reference.
                  </span>
                  <Badge variant="outline" className="border-indigo-500/40 text-indigo-300 text-[9px]">
                    REFERENCE ONLY
                  </Badge>
                </div>
              )}
            </div>

            {/* Reinspection Header & Reason (Step 8 & 9) */}
            {purpose === "REINSPECTION" && (
              <div className="p-3 rounded-xl border border-purple-500/40 bg-purple-950/20 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-purple-300">
                    <RefreshCw className="w-4 h-4" />
                    <span>REINSPECTION LINKED TO PRIOR INSPECTION</span>
                  </div>
                  <Badge variant="outline" className="border-purple-500/40 text-purple-300 text-[10px]">
                    Ref: {targetReinspectionFrom?.id || latestExistingInspection?.id || "PRIOR"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono">
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 text-[10px] uppercase font-sans block">Prior Grade</span>
                    <span className="text-white block">{targetReinspectionFrom?.proposedGrade || latestExistingInspection?.proposedGrade || "—"}</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 text-[10px] uppercase font-sans block">Prior Disposition</span>
                    <span className="text-white block">{targetReinspectionFrom?.disposition || latestExistingInspection?.disposition || "—"}</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 text-[10px] uppercase font-sans block">Prior Date</span>
                    <span className="text-white block">{targetReinspectionFrom?.inspectionDate || latestExistingInspection?.inspectionDate || "—"}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-purple-300">
                    Reinspection Reason <span className="text-rose-400">*</span>
                  </Label>
                  <Input
                    value={reinspectionReason}
                    onChange={(e) => setReinspectionReason(e.target.value)}
                    placeholder="e.g. Reinspection requested following fabric conditioning / supervisor review..."
                    className="h-8 text-xs bg-slate-950 border-purple-500/40 text-white"
                  />
                  {!reinspectionReason.trim() && (
                    <span className="text-[10px] text-rose-400 block font-sans">
                      Reinspection reason is strictly required before saving.
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Inspected Quantity & Coverage Panel (Step 10, 11, 12, 13) */}
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 space-y-3 font-mono text-xs">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide font-sans block">
                Inspected Quantity & Coverage
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-400 font-sans">
                    Inspected Qty (MTR) <span className="text-rose-400">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    max={rollQty}
                    value={inspectedQtyInput}
                    onChange={(e) => setInspectedQtyInput(e.target.value)}
                    className="h-8 text-xs font-mono font-bold bg-slate-900 border-slate-700 text-cyan-300"
                  />
                  {!qtyValidation.valid && (
                    <span className="text-[10px] text-rose-400 font-sans block">{qtyValidation.error}</span>
                  )}
                </div>

                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-sans block">Active Roll Qty</span>
                  <span className="text-white font-bold block">{rollQty.toFixed(3)} MTR</span>
                </div>

                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-sans block">Remaining Uninspected</span>
                  <span className="text-slate-300 block">{coverage.remainingUninspectedQtyMetre.toFixed(3)} MTR</span>
                </div>

                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-sans block">Coverage</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-indigo-400 font-bold">{coverage.inspectionCoveragePercent}%</span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] ${
                        inspectionStatus === "INSPECTED"
                          ? "border-emerald-500/40 text-emerald-300"
                          : "border-amber-500/40 text-amber-300"
                      }`}
                    >
                      {inspectionStatus === "INSPECTED" ? "FULL" : "IN PROGRESS"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Defect Editor & Previous Findings (Step 14, 15, 16) */}
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-300 uppercase tracking-wide block">
                    Defect Findings (Current Inspection)
                  </span>
                  <span className="text-[10px] text-slate-500 font-sans">
                    Log physical defects observed during this inspection run.
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddDefect}
                  className="h-7 text-xs border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Defect
                </Button>
              </div>

              {/* Previous Inspection Findings Context (Step 15: Not copied to current defects) */}
              {previousDefects.length > 0 && (
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    <span>Previous Inspection Findings ({previousDefects.length} defect lines)</span>
                    <Badge variant="outline" className="border-slate-700 text-slate-500 text-[9px] ml-auto">
                      HISTORICAL CONTEXT ONLY
                    </Badge>
                  </div>
                  <div className="space-y-1 text-slate-400 font-mono text-[10px]">
                    {previousDefects.map((pd, pidx) => (
                      <div key={pidx} className="flex items-center gap-2">
                        <span>• {pd.defectType}</span>
                        {pd.positionMetre !== undefined && <span>@ {pd.positionMetre}m</span>}
                        {pd.severity && <span className="text-slate-500">({pd.severity})</span>}
                        {pd.remark && <span className="italic text-slate-500">— {pd.remark}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Defects Table */}
              {defects.length === 0 ? (
                <div className="py-4 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                  No defects logged for this inspection run.
                </div>
              ) : (
                <div className="space-y-2">
                  {defects.map((def, idx) => (
                    <div
                      key={def.id}
                      className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/80 grid grid-cols-1 sm:grid-cols-5 gap-2 items-center text-xs"
                    >
                      <div className="space-y-0.5">
                        <Label className="text-[10px] text-slate-500">Defect Type</Label>
                        <Select
                          value={def.defectType}
                          onValueChange={(v) => handleUpdateDefect(def.id, { defectType: v as FabricDefectType })}
                        >
                          <SelectTrigger className="h-7 text-xs bg-slate-950 border-slate-800 text-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                            {COMMON_DEFECT_TYPES.map((dt) => (
                              <SelectItem key={dt.value} value={dt.value}>
                                {dt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-0.5">
                        <Label className="text-[10px] text-slate-500">Position (MTR)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          value={def.positionMetre !== undefined ? String(def.positionMetre) : ""}
                          onChange={(e) =>
                            handleUpdateDefect(def.id, {
                              positionMetre: parseFloat(e.target.value) || 0,
                            })
                          }
                          placeholder="0.0"
                          className="h-7 text-xs bg-slate-950 border-slate-800 text-white font-mono"
                        />
                      </div>

                      <div className="space-y-0.5">
                        <Label className="text-[10px] text-slate-500">Severity</Label>
                        <Select
                          value={def.severity || "MINOR"}
                          onValueChange={(v) => handleUpdateDefect(def.id, { severity: v as any })}
                        >
                          <SelectTrigger className="h-7 text-xs bg-slate-950 border-slate-800 text-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                            <SelectItem value="MINOR">Minor</SelectItem>
                            <SelectItem value="MAJOR">Major</SelectItem>
                            <SelectItem value="CRITICAL">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-0.5">
                        <Label className="text-[10px] text-slate-500">Remark</Label>
                        <Input
                          value={def.remark || ""}
                          onChange={(e) => handleUpdateDefect(def.id, { remark: e.target.value })}
                          placeholder="Defect detail..."
                          className="h-7 text-xs bg-slate-950 border-slate-800 text-white"
                        />
                      </div>

                      <div className="flex items-end justify-end pt-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveDefect(def.id)}
                          className="h-7 px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quality Grade & Disposition Assessment (Step 17–22) */}
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 space-y-3 text-xs">
              <span className="font-semibold text-slate-300 uppercase tracking-wide block">
                Quality Grade & Disposition Assessment
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Proposed Grade */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] text-slate-400">Proposed Grade</Label>
                    <Badge variant="outline" className="border-slate-700 text-slate-500 text-[9px]">
                      Source: {selectedGrade !== "UNASSIGNED" ? "MANUAL" : "UNASSIGNED"}
                    </Badge>
                  </div>
                  <Select
                    value={selectedGrade}
                    onValueChange={(v) => setSelectedGrade(v as FabricGrade)}
                  >
                    <SelectTrigger className="h-8 text-xs bg-slate-900 border-slate-700 text-white font-mono font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                      <SelectItem value="UNASSIGNED">UNASSIGNED (Default)</SelectItem>
                      <SelectItem value="A">Grade A</SelectItem>
                      <SelectItem value="B">Grade B</SelectItem>
                      <SelectItem value="C">Grade C</SelectItem>
                      <SelectItem value="REJECT">REJECT</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-[10px] text-slate-500 block font-sans">
                    Grade does not independently authorize commercial release.
                  </span>
                </div>

                {/* Disposition (Step 21 & 22) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] text-slate-400">Disposition</Label>
                    <span className="text-[10px] text-slate-500">Independent from Grade</span>
                  </div>
                  <Select
                    value={disposition}
                    onValueChange={(v) => setDisposition(v as any)}
                  >
                    <SelectTrigger className="h-8 text-xs bg-slate-900 border-slate-700 text-white font-mono font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                      <SelectItem value="NOT_SET">NOT_SET</SelectItem>
                      <SelectItem value="ACCEPTED">ACCEPTED</SelectItem>
                      <SelectItem value="HOLD">HOLD (Quality Hold)</SelectItem>
                      <SelectItem value="REWORK">REWORK (Reprocessing)</SelectItem>
                      <SelectItem value="PROCESS_REQUIRED">PROCESS_REQUIRED</SelectItem>
                      <SelectItem value="REJECT">REJECT</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-[10px] text-slate-500 block font-sans">
                    ACCEPTED requires commercial release review before stock release.
                  </span>
                </div>
              </div>

              {/* Disposition Specific Notices (Step 26, 27, 28, 29, 30) */}
              {disposition === "HOLD" && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>
                    <strong>QUALITY HOLD:</strong> Roll is quarantined from downstream release. Future commercial release is BLOCKED PREVIEW.
                  </span>
                </div>
              )}

              {disposition === "REWORK" && (
                <div className="p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs flex items-center gap-2">
                  <Route className="w-4 h-4 shrink-0 text-orange-400" />
                  <span>
                    <strong>PROCESS ROUTE REVIEW REQUIRED:</strong> Reprocessing indicated. Planner must review and schedule rework route. No route is auto-created.
                  </span>
                </div>
              )}

              {disposition === "PROCESS_REQUIRED" && (
                <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs flex items-center gap-2">
                  <Route className="w-4 h-4 shrink-0 text-purple-400" />
                  <span>
                    <strong>PROCESS ROUTE REVIEW REQUIRED:</strong> Additional processing required before release evaluation.
                  </span>
                </div>
              )}

              {disposition === "REJECT" && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <Ban className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>
                    <strong>COMMERCIAL RELEASE BLOCKED (PREVIEW):</strong> Fabric does not meet quality standards. Zero stock scrap or loss is posted.
                  </span>
                </div>
              )}

              {disposition === "ACCEPTED" && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>
                    {isFinalRouteStep
                      ? "QUALITY ACCEPTED — FUTURE COMMERCIAL RELEASE REVIEW ELIGIBLE: Route completed. Commercial release authorization remains pending Phase 5H."
                      : "QUALITY ACCEPTED — INTERMEDIATE PROCESS STEP: Additional route steps remain before commercial release."}
                  </span>
                </div>
              )}
            </div>

            {/* Commercial Release & Downstream Planning Preview (Step 23, 31, 32) */}
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] font-sans">
                  Commercial Release Preview & Signals (Read-Only)
                </span>
                <Badge variant="outline" className="border-indigo-500/40 text-indigo-300 text-[9px]">
                  PREVIEW ONLY
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-sans block">Commercial Release Preview</span>
                  <span className="text-white font-bold block mt-0.5 truncate" title={releasePreview.reason}>
                    {releasePreview.preview}
                  </span>
                  <span className="text-[9px] text-slate-500 font-sans block mt-0.5">{releasePreview.reason}</span>
                </div>

                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-sans block">Route Progression Signal</span>
                  <span className="text-cyan-300 font-bold block mt-0.5">{routeSignal}</span>
                  <span className="text-[9px] text-slate-500 font-sans block mt-0.5">
                    {isFinalRouteStep ? "Route Step: Final Complete" : "Route Step: Intermediate"}
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* History & Reinspections Tab (Step 36) */}
          <TabsContent value="history" className="pt-2">
            <FabricPostProcessQualityHistory
              rollIdentityOrNodeId={genealogyNode.id}
              rollDraft={roll}
              onReinspect={(prevInsp) => {
                setPurpose("REINSPECTION");
                setReinspectionReason("");
                setSelectedGrade("UNASSIGNED");
                setDisposition("NOT_SET");
                setDefects([]);
                setActiveTab("inspect");
              }}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t border-slate-800 pt-3 flex items-center justify-between">
          <div className="text-[10px] text-slate-500 font-sans">
            Simulation only · Zero stock mutation · Zero database writes.
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Close
            </Button>
            <Button
              size="sm"
              disabled={!canSave}
              onClick={handleSave}
              className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Save Post-Process Inspection
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

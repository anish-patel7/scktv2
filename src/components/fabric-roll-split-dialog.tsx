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
  Split,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Scale,
  Sparkles,
  GitBranch,
  History,
  ShieldCheck,
  Lock,
  ArrowRight,
  Info,
} from "lucide-react";
import {
  FabricRollGenealogyService,
  deriveChildRollIdentity,
  sumChildQty,
  validateQuantityConservation,
  type FabricRollGenealogyNode,
  type FabricRollSplitChildInput,
  type FabricRollSplitPlan,
  type SplitValidationResult,
} from "@/services/fabric-roll-genealogy.service";
import {
  FabricProcessRoutingService,
  type FabricProcessRoutePlan,
} from "@/services/fabric-process-routing.service";
import {
  ProductionPlanningService,
  type FabricRollDraft,
  type JobCardDraft,
} from "@/services/production-planning.service";
import type { ProductionOrder } from "@/lib/production-store";
import { FabricRollGenealogyTree } from "./fabric-roll-genealogy-tree";
import { FabricRollSplitHistory } from "./fabric-roll-split-history";

interface FabricRollSplitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roll: FabricRollDraft | null;
  order?: ProductionOrder | null | undefined;
  jobCard?: JobCardDraft | null | undefined;
  desiredProcessQtyMetre?: number | undefined; // Passed when opened from ROLL_SPLIT_REQUIRED
  onSplitConfirmed?: (childNodes: FabricRollGenealogyNode[]) => void;
}

const REASON_SUGGESTIONS = [
  "Partial Process Requirement",
  "Physical Roll Division",
  "Quality Segregation",
  "Customer / Order Requirement",
  "Lot Optimization",
];

interface DraftChildState {
  id: string;
  identity: string;
  qtyInput: string;
  remark: string;
  intendedUse: "PROCESS_ROUTE" | "QUALITY" | "STOCK" | "OTHER";
}

export function FabricRollSplitDialog({
  open,
  onOpenChange,
  roll,
  order,
  jobCard,
  desiredProcessQtyMetre,
  onSplitConfirmed,
}: FabricRollSplitDialogProps) {
  const [activeTab, setActiveTab] = useState<"editor" | "tree" | "history">("editor");
  const [reason, setReason] = useState<string>("");
  const [children, setChildren] = useState<DraftChildState[]>([]);
  const [confirmedPlan, setConfirmedPlan] = useState<FabricRollSplitPlan | null>(null);
  const [confirmedChildren, setConfirmedChildren] = useState<FabricRollGenealogyNode[]>([]);
  const [isProposedSplit, setIsProposedSplit] = useState<boolean>(false);

  // Initialize or fetch root genealogy node for this roll
  const rootNode = useMemo(() => {
    if (!roll) return undefined;
    return FabricRollGenealogyService.getOrCreateRootFromFabricRollDraft(roll);
  }, [roll, open]);

  // Check if roll node is already superseded by split
  const isAlreadySuperseded = useMemo(() => {
    if (!rootNode) return false;
    return !FabricRollGenealogyService.isRollOperationallyActive(rootNode.id);
  }, [rootNode, open, confirmedPlan]);

  // Route context
  const routePlan = useMemo(() => {
    if (!roll) return undefined;
    return FabricProcessRoutingService.getRoutePlanForRoll(roll.id);
  }, [roll, open]);

  // Quality context
  const rollQuality = useMemo(() => {
    if (!roll) return undefined;
    return ProductionPlanningService.getRollQualitySummary(roll);
  }, [roll, open]);

  // Initialize Form
  useEffect(() => {
    if (open && rootNode) {
      setConfirmedPlan(null);
      setConfirmedChildren([]);
      setActiveTab("editor");

      // Check if opened from partial processing requirement (Step 15)
      if (
        desiredProcessQtyMetre &&
        desiredProcessQtyMetre > 0 &&
        desiredProcessQtyMetre < rootNode.quantityMetre
      ) {
        setIsProposedSplit(true);
        setReason(`Split proposal for partial process requirement (${desiredProcessQtyMetre.toFixed(3)} MTR)`);
        const proposal = FabricRollGenealogyService.resolveRollSplitRequirement({
          parentNodeId: rootNode.id,
          desiredProcessQtyMetre,
        });

        if (proposal.plan && proposal.plan.children.length === 2) {
          const c1 = proposal.plan.children[0]!;
          const c2 = proposal.plan.children[1]!;
          setChildren([
            {
              id: "child-1",
              identity: c1.childRollIdentity,
              qtyInput: String(c1.quantityMetre),
              remark: c1.remark || "Allocated for partial process",
              intendedUse: "PROCESS_ROUTE",
            },
            {
              id: "child-2",
              identity: c2.childRollIdentity,
              qtyInput: String(c2.quantityMetre),
              remark: c2.remark || "Remaining roll balance",
              intendedUse: "STOCK",
            },
          ]);
          return;
        }
      }

      setIsProposedSplit(false);
      setReason("");

      // Default 2-child split (50 / 50 split default)
      const half = Number((rootNode.quantityMetre / 2).toFixed(3));
      const rest = Number((rootNode.quantityMetre - half).toFixed(3));

      setChildren([
        {
          id: "child-1",
          identity: deriveChildRollIdentity(rootNode.rollIdentity, 1),
          qtyInput: String(half),
          remark: "",
          intendedUse: "PROCESS_ROUTE",
        },
        {
          id: "child-2",
          identity: deriveChildRollIdentity(rootNode.rollIdentity, 2),
          qtyInput: String(rest),
          remark: "",
          intendedUse: "STOCK",
        },
      ]);
    }
  }, [open, rootNode, desiredProcessQtyMetre]);

  // Derived inputs for service validation
  const serviceChildInputs = useMemo<FabricRollSplitChildInput[]>(() => {
    return children.map((c) => ({
      childRollIdentity: c.identity,
      quantityMetre: parseFloat(c.qtyInput) || 0,
      remark: c.remark.trim() || undefined,
      intendedUse: c.intendedUse,
    }));
  }, [children]);

  // Live Quantity Reconciliation derived strictly via Service Authority (Step 10, 11, 12, 53)
  const validation = useMemo<SplitValidationResult | null>(() => {
    if (!rootNode) return null;
    return FabricRollGenealogyService.validateSplitPlan({
      parentNodeId: rootNode.id,
      children: serviceChildInputs,
      reason,
    });
  }, [rootNode, serviceChildInputs, reason]);

  if (!roll || !rootNode) {
    return null;
  }

  // Add child row (Step 8)
  const handleAddChild = () => {
    const nextSeq = children.length + 1;
    const nextIdentity = deriveChildRollIdentity(rootNode.rollIdentity, nextSeq);
    setChildren((prev) => [
      ...prev,
      {
        id: `child-${Date.now()}-${nextSeq}`,
        identity: nextIdentity,
        qtyInput: "",
        remark: "",
        intendedUse: "PROCESS_ROUTE",
      },
    ]);
  };

  // Remove child row (Step 9: Minimum 2 children)
  const handleRemoveChild = (index: number) => {
    if (children.length <= 2) return;
    setChildren((prev) => {
      const next = prev.filter((_, i) => i !== index);
      // Re-index identities deterministically
      return next.map((item, idx) => ({
        ...item,
        identity: deriveChildRollIdentity(rootNode.rollIdentity, idx + 1),
      }));
    });
  };

  // Update child fields
  const handleUpdateChildQty = (index: number, val: string) => {
    setChildren((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], qtyInput: val };
      }
      return next;
    });
  };

  const handleUpdateChildRemark = (index: number, val: string) => {
    setChildren((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], remark: val };
      }
      return next;
    });
  };

  const handleUpdateChildIntendedUse = (
    index: number,
    val: "PROCESS_ROUTE" | "QUALITY" | "STOCK" | "OTHER"
  ) => {
    setChildren((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], intendedUse: val };
      }
      return next;
    });
  };

  // Confirm Split Simulation (Step 17 & 18)
  const handleConfirmSplit = () => {
    if (!validation || !validation.isValid || isAlreadySuperseded) return;

    const res = FabricRollGenealogyService.confirmSplitSimulation({
      parentNodeId: rootNode.id,
      children: serviceChildInputs,
      reason: reason.trim(),
    });

    if (res.success && res.plan && res.childNodes) {
      setConfirmedPlan(res.plan);
      setConfirmedChildren(res.childNodes);
      onSplitConfirmed?.(res.childNodes);
    }
  };

  const childTotal = validation ? validation.totalChildQtyMetre : 0;
  const difference = validation ? validation.differenceQtyMetre : 0;
  const isExactConservation = validation ? validation.isExactConservation : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-slate-900 border-slate-800 text-white font-sans max-h-[92vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-800 pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Split className="w-5 h-5 text-indigo-400" />
                <span>Fabric Roll Split & Genealogy Simulation</span>
                <Badge variant="outline" className="border-indigo-500/40 text-indigo-300 text-[10px]">
                  PHASE 5F
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Creates immutable child roll identities while preserving parent genealogy. Frontend simulation only.
              </DialogDescription>
            </div>

            <Badge
              variant="outline"
              className={
                isAlreadySuperseded
                  ? "border-slate-700 text-slate-400 bg-slate-950 font-mono text-[10px]"
                  : "border-emerald-500/40 text-emerald-300 bg-emerald-950/20 font-mono text-[10px]"
              }
            >
              {isAlreadySuperseded ? "SUPERSEDED PARENT" : "ACTIVE ROLL"}
            </Badge>
          </div>
        </DialogHeader>

        {/* Inherited Parent Context Header (Step 4) */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 border-b border-slate-800/80 pb-1.5">
            <span className="flex items-center gap-1.5 text-indigo-300">
              <Lock className="w-3.5 h-3.5" />
              Parent Roll Identity & Production Context (Read-Only)
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Roll ID: {roll.id}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 font-mono text-[11px]">
            <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
              <span className="text-[9px] text-slate-500 uppercase font-sans block">Parent Roll</span>
              <span className="text-white font-bold truncate block">{rootNode.rollIdentity}</span>
            </div>

            <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
              <span className="text-[9px] text-slate-500 uppercase font-sans block">Parent Qty</span>
              <span className="text-emerald-400 font-bold block">{rootNode.quantityMetre.toFixed(3)} MTR</span>
            </div>

            <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
              <span className="text-[9px] text-slate-500 uppercase font-sans block">Production Order</span>
              <span className="text-white truncate block">{order?.order_no || rootNode.productionOrderId || "PO-STD"}</span>
            </div>

            <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
              <span className="text-[9px] text-slate-500 uppercase font-sans block">Job Card</span>
              <span className="text-white truncate block">{jobCard?.draftCardNo || rootNode.jobCardId || "JC-STD"}</span>
            </div>

            <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
              <span className="text-[9px] text-slate-500 uppercase font-sans block">Quality Grade</span>
              <span className="text-indigo-300 block">{rollQuality?.proposedGrade || "UNASSIGNED"}</span>
            </div>

            <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
              <span className="text-[9px] text-slate-500 uppercase font-sans block">Route Status</span>
              <span className="text-slate-300 block">{routePlan?.status || "NOT_PLANNED"}</span>
            </div>
          </div>
        </div>

        {/* Proposed Split Notice from Partial Processing (Step 15) */}
        {isProposedSplit && !confirmedPlan && (
          <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                <strong>PROPOSED SPLIT:</strong> Generated automatically to satisfy partial process requirement of {desiredProcessQtyMetre?.toFixed(3)} MTR. Review child quantities below before confirming.
              </span>
            </div>
            <Badge variant="outline" className="border-indigo-500/40 text-indigo-300 text-[10px]">
              PROPOSAL ONLY
            </Badge>
          </div>
        )}

        {/* Superseded Warning (Step 36) */}
        {isAlreadySuperseded && !confirmedPlan && (
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>SUPERSEDED PARENT ROLL:</strong> This roll has already been split. A parent cannot be split again. Please use active child rolls in the Genealogy Tree for further splits.
            </span>
          </div>
        )}

        {/* Tabs: Split Editor, Genealogy Tree, History */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="bg-slate-950 border border-slate-800 p-0.5">
            <TabsTrigger
              value="editor"
              className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
            >
              <Split className="w-3.5 h-3.5 mr-1.5" />
              Split Editor & Reconciliation
            </TabsTrigger>
            <TabsTrigger
              value="tree"
              className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
            >
              <GitBranch className="w-3.5 h-3.5 mr-1.5" />
              Genealogy Tree & Leaves
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
            >
              <History className="w-3.5 h-3.5 mr-1.5" />
              Split History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="space-y-3 pt-2">
            {!confirmedPlan ? (
              <>
                {/* Live Quantity Reconciliation Panel (Step 10, 11, 12) */}
                <div className="p-3 rounded-xl border bg-slate-950/80 border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-300 uppercase tracking-wide text-[11px] flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-indigo-400" />
                      Split Quantity Reconciliation
                    </span>
                    <Badge
                      variant="outline"
                      className={`font-mono text-[10px] ${
                        isExactConservation
                          ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                          : "border-amber-500/40 text-amber-300 bg-amber-500/10"
                      }`}
                    >
                      {isExactConservation ? "VALID SPLIT (EXACT 0.000m)" : "SPLIT QUANTITY MISMATCH"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-sans block">Parent Qty</span>
                      <span className="text-sm font-bold text-white block mt-0.5">
                        {rootNode.quantityMetre.toFixed(3)} MTR
                      </span>
                    </div>

                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-sans block">Child Total</span>
                      <span
                        className={`text-sm font-bold block mt-0.5 ${
                          isExactConservation ? "text-emerald-400" : "text-amber-300"
                        }`}
                      >
                        {childTotal.toFixed(3)} MTR
                      </span>
                    </div>

                    <div
                      className={`p-2 rounded border ${
                        isExactConservation
                          ? "bg-slate-900 border-slate-800"
                          : "bg-amber-950/20 border-amber-500/40"
                      }`}
                    >
                      <span className="text-[10px] text-slate-500 uppercase font-sans block">Difference</span>
                      <span
                        className={`text-sm font-bold block mt-0.5 ${
                          isExactConservation
                            ? "text-emerald-400"
                            : difference > 0
                            ? "text-amber-400"
                            : "text-rose-400"
                        }`}
                      >
                        {difference.toFixed(3)} MTR
                      </span>
                    </div>
                  </div>

                  {/* Governance Notice on Allocation (Never call difference wastage/shortage!) */}
                  {!isExactConservation && (
                    <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-start gap-1.5 font-sans">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        Child Roll quantities must exactly reconcile to Parent Roll quantity.
                        {difference > 0
                          ? ` Under-allocated by ${difference.toFixed(3)} MTR.`
                          : ` Over-allocated by ${Math.abs(difference).toFixed(3)} MTR.`}{" "}
                        This difference is NOT assumed to be wastage or loss.
                      </span>
                    </div>
                  )}
                </div>

                {/* Split Reason (Step 5) */}
                <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-slate-300 font-semibold">
                      Split Reason <span className="text-rose-400">*</span>
                    </Label>
                    <span className="text-[10px] text-slate-500">Required audit explanation</span>
                  </div>

                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Partial process requirement / Physical roll segregation..."
                    disabled={isAlreadySuperseded}
                    className="h-8 text-xs bg-slate-900 border-slate-700 text-white"
                  />

                  {/* Suggestion pills */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] text-slate-500">Suggestions:</span>
                    {REASON_SUGGESTIONS.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setReason(sug)}
                        className="text-[10px] px-2 py-0.5 rounded-full border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Child Lines Editor (Step 6, 7, 8, 9) */}
                <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2.5">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                    <div>
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide block">
                        Child Roll Lines ({children.length})
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Minimum 2 children required. Child identities are generated deterministically.
                      </span>
                    </div>

                    <Button
                      size="sm"
                      onClick={handleAddChild}
                      disabled={isAlreadySuperseded}
                      className="h-7 text-xs bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Child Line
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {children.map((child, idx) => (
                      <div
                        key={child.id}
                        className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/90 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-xs"
                      >
                        {/* Seq & Generated Identity (Step 7) */}
                        <div className="sm:col-span-4 space-y-1">
                          <Label className="text-[10px] text-slate-500 uppercase font-sans">
                            Child #{idx + 1} Identity
                          </Label>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-indigo-300 text-xs truncate">
                              {child.identity}
                            </span>
                            <Badge variant="outline" className="text-[8px] px-1 py-0 border-slate-700 text-slate-500 font-sans">
                              Ref only
                            </Badge>
                          </div>
                        </div>

                        {/* Quantity (Step 6 & 14) */}
                        <div className="sm:col-span-3 space-y-1">
                          <Label className="text-[10px] text-slate-400">
                            Quantity (MTR) <span className="text-rose-400">*</span>
                          </Label>
                          <Input
                            type="number"
                            step="0.001"
                            min="0.001"
                            value={child.qtyInput}
                            onChange={(e) => handleUpdateChildQty(idx, e.target.value)}
                            placeholder="0.000"
                            disabled={isAlreadySuperseded}
                            className="h-7 text-xs font-mono font-bold bg-slate-950 border-slate-700 text-cyan-300"
                          />
                        </div>

                        {/* Intended Use (Step 6) */}
                        <div className="sm:col-span-3 space-y-1">
                          <Label className="text-[10px] text-slate-500">Intended Purpose</Label>
                          <Select
                            value={child.intendedUse}
                            onValueChange={(v: any) => handleUpdateChildIntendedUse(idx, v)}
                            disabled={isAlreadySuperseded}
                          >
                            <SelectTrigger className="h-7 text-[11px] bg-slate-950 border-slate-700 text-slate-300">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800 text-xs text-slate-200">
                              <SelectItem value="PROCESS_ROUTE">Process Routing</SelectItem>
                              <SelectItem value="STOCK">Hold in Stock</SelectItem>
                              <SelectItem value="QUALITY">Quality Segregation</SelectItem>
                              <SelectItem value="OTHER">Other Purpose</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Actions */}
                        <div className="sm:col-span-2 flex items-center justify-end pt-3 sm:pt-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={children.length <= 2 || isAlreadySuperseded}
                            onClick={() => handleRemoveChild(idx)}
                            className="h-7 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-2"
                            title={children.length <= 2 ? "Minimum 2 children required" : "Remove child"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        {/* Remark optional */}
                        <div className="sm:col-span-12">
                          <Input
                            value={child.remark}
                            onChange={(e) => handleUpdateChildRemark(idx, e.target.value)}
                            placeholder="Optional child remark (e.g. piece cutting note)..."
                            disabled={isAlreadySuperseded}
                            className="h-6 text-[10px] bg-slate-950 border-slate-800 text-slate-400"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              /* Confirmation Result Display (Step 18 & 19) */
              <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/20 space-y-3 font-sans text-xs">
                <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    ROLL SPLIT SIMULATION CONFIRMED
                  </div>
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 text-[10px]">
                    SPLIT ID: {confirmedPlan.id}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Historical Parent Card (Step 19) */}
                  <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">
                      Historical Parent Roll
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-white font-bold text-sm">{confirmedPlan.parentRollIdentity}</span>
                      <span className="text-slate-400 font-mono">{confirmedPlan.parentQtyMetre.toFixed(3)} MTR</span>
                    </div>
                    <Badge variant="outline" className="border-slate-700 text-slate-400 text-[9px] mt-1">
                      SUPERSEDED BY SPLIT (NOT ACTIVE FOR NEW ACTIONS)
                    </Badge>
                  </div>

                  {/* Resulting Active Children (Step 20) */}
                  <div className="p-3 rounded-lg bg-slate-950/80 border border-emerald-500/30 space-y-2">
                    <span className="text-[10px] text-emerald-400 uppercase font-mono block">
                      Active Child Rolls ({confirmedChildren.length})
                    </span>
                    <div className="space-y-1 font-mono text-[11px]">
                      {confirmedChildren.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800"
                        >
                          <span className="text-indigo-300 font-bold">{c.rollIdentity}</span>
                          <span className="text-white font-bold">{c.quantityMetre.toFixed(3)} MTR</span>
                          <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[8px] py-0">
                            ACTIVE
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-2 rounded bg-slate-900/80 border border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Inventory Movement: <strong className="text-amber-400">NOT POSTED (Simulation Only)</strong></span>
                  <span>Root Roll: <strong className="text-white">{rootNode.rootRollIdentity}</strong></span>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="tree" className="pt-2">
            <FabricRollGenealogyTree rootNodeId={rootNode.rootNodeId} />
          </TabsContent>

          <TabsContent value="history" className="pt-2">
            <FabricRollSplitHistory parentNodeId={rootNode.id} />
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-[10px] text-slate-500 font-mono">
            Phase 5F In-Memory Genealogy Simulation · Zero Inventory Mutations
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="border-slate-700 text-slate-300 text-xs"
            >
              {confirmedPlan ? "Done" : "Cancel"}
            </Button>

            {!confirmedPlan && (
              <Button
                size="sm"
                disabled={
                  isAlreadySuperseded ||
                  !validation ||
                  !validation.isValid ||
                  !reason.trim()
                }
                onClick={handleConfirmSplit}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Confirm Split Simulation
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

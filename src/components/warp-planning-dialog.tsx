import React, { useState, useMemo } from "react";
import {
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
  PlusCircle,
  Scissors,
  BookmarkCheck,
  Search,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ProductionPlanningService,
  roundQty,
  type MaterialRequirement,
  type BeamCandidate,
  type BeamAllocationPlan,
  type BeamProductionPlan,
  type MaterialAllocationPlan,
} from "@/services/production-planning.service";
import type { ProductionOrder } from "@/lib/production-store";
import type { CostSheetFull } from "@/lib/cost-sheet-store";

interface WarpPlanningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: ProductionOrder;
  warpRequirements: MaterialRequirement[];
  costSheet: CostSheetFull | null;
  allocationPlans: MaterialAllocationPlan[];
  onPlanUpdated: () => void;
}

export const WarpPlanningDialog: React.FC<WarpPlanningDialogProps> = ({
  open,
  onOpenChange,
  order,
  warpRequirements,
  costSheet,
  allocationPlans,
  onPlanUpdated,
}) => {
  // Existing plans
  const existingBeamAlloc = useMemo(() => {
    return ProductionPlanningService.getBeamAllocationPlan(order.id);
  }, [order.id, open]);

  const existingBeamProd = useMemo(() => {
    return ProductionPlanningService.getBeamProductionPlan(order.id);
  }, [order.id, open]);

  // Selected warp line for candidate search
  const [selectedReqId, setSelectedReqId] = useState<string>(
    warpRequirements[0]?.id || ""
  );

  React.useEffect(() => {
    if (warpRequirements.length > 0 && !warpRequirements.some((r) => r.id === selectedReqId)) {
      setSelectedReqId(warpRequirements[0]!.id);
    }
  }, [warpRequirements, selectedReqId]);

  const currentWarpReq = useMemo(() => {
    return warpRequirements.find((r) => r.id === selectedReqId) || warpRequirements[0] || null;
  }, [warpRequirements, selectedReqId]);

  // Candidates for the current warp line
  const candidates: BeamCandidate[] = useMemo(() => {
    if (!currentWarpReq) return [];
    return ProductionPlanningService.getBeamCandidates(currentWarpReq);
  }, [currentWarpReq]);

  // New Beam Plan form state (ENTER ONCE -> REUSE EVERYWHERE)
  const defaultEnds = useMemo(() => {
    if (!costSheet) return 0;
    const warpLines = costSheet.lines.filter((l) => l.section === "warp");
    return warpLines.reduce((acc, l) => acc + (l.quantity || 0), 0);
  }, [costSheet]);

  const [beamType, setBeamType] = useState<string>(
    order.quality ? `${order.quality} Warp Beam` : "Standard Sized Beam"
  );
  const [setNo, setSetNo] = useState<string>("");
  const [totalEnds, setTotalEnds] = useState<number>(defaultEnds || 4000);
  const [plannedLength, setPlannedLength] = useState<number>(order.qty_metre || 1000);
  const [targetLoomId, setTargetLoomId] = useState<string>("none");
  const [remarks, setRemarks] = useState<string>("");

  const looms = useMemo(() => ProductionPlanningService.getLooms(), []);

  // Warp lot allocations inherited from Phase 2
  const warpCompositionBreakdown = useMemo(() => {
    return warpRequirements.map((req) => {
      const plan = allocationPlans.find((p) => p.materialRequirementId === req.id);
      const allocatedLots = (plan?.lines || [])
        .filter((l) => l.plannedQty > 0)
        .map((l) => ({
          lotId: l.lotId,
          lotNo: l.lotNo,
          plannedKg: l.plannedQty,
        }));

      return {
        materialId: req.materialId,
        materialCode: req.materialCode,
        materialName: req.materialName,
        requiredKg: req.requiredQty ?? 0,
        allocatedLots,
      };
    });
  }, [warpRequirements, allocationPlans]);

  // Handler: Allocate Existing Beam Candidate (Planning only)
  const handleAllocateCandidate = (candidate: BeamCandidate) => {
    const plan: BeamAllocationPlan = {
      id: `bplan-${order.id}-${candidate.beamId}`,
      productionOrderId: order.id,
      productionOrderNo: order.order_no,
      beamId: candidate.beamId,
      beamNo: candidate.beamNo,
      beamType: candidate.beamType,
      designNo: order.design_no || "—",
      warpYarnCode: candidate.warpYarnCode,
      availableLengthMetre: candidate.lengthMetre,
      plannedUseLengthMetre: Math.min(candidate.lengthMetre, order.qty_metre),
      locationRack: candidate.locationRack,
      plannedAt: new Date().toISOString(),
      status: "PLANNED",
      remarks: "Selected from existing store inventory candidate (Planning preview only)",
    };

    ProductionPlanningService.createBeamAllocationPlan(plan);
    ProductionPlanningService.clearBeamProductionPlan(order.id);
    toast.success(`Candidate Beam ${candidate.beamNo} allocated to planning.`);
    onPlanUpdated();
  };

  // Handler: Save New Beam Production Plan (Planning only)
  const handleSaveNewBeamPlan = () => {
    if (plannedLength <= 0) {
      toast.error("Planned beam length must be greater than zero.");
      return;
    }

    const selectedLoom = targetLoomId !== "none" ? looms.find((l) => l.id === targetLoomId) : null;

    const plan: BeamProductionPlan = {
      id: `nbp-${order.id}-${Date.now()}`,
      productionOrderId: order.id,
      productionOrderNo: order.order_no,
      salesOrderNo: order.sales_order_no || "SO-DIRECT",
      customerName: order.party_name,
      itemCode: order.item_code || "—",
      designNo: order.design_no || "—",
      costSheetId: costSheet?.header.id || order.cost_sheet_id || "",
      costSheetNo: costSheet?.header.sheet_no || "CS-LINKED",
      beamType,
      setNo: setNo.trim() || undefined,
      totalEnds,
      plannedLengthMetre: plannedLength,
      targetLoomId: selectedLoom ? selectedLoom.id : undefined,
      targetLoomNo: selectedLoom ? selectedLoom.loom_no : undefined,
      warpComposition: warpCompositionBreakdown,
      plannedAt: new Date().toISOString(),
      status: "PLANNED",
      remarks: remarks.trim() || undefined,
    };

    ProductionPlanningService.createBeamProductionPlan(plan);
    ProductionPlanningService.clearBeamAllocationPlan(order.id);
    toast.success("New Beam Production Plan saved in planning mode.");
    onPlanUpdated();
  };

  // Handler: Clear current beam plan
  const handleClearPlan = () => {
    ProductionPlanningService.clearBeamAllocationPlan(order.id);
    ProductionPlanningService.clearBeamProductionPlan(order.id);
    toast.info("Warp beam planning cleared.");
    onPlanUpdated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">
                Warp & Beam Planning
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Evaluate existing beam candidates in store or draft a new beam production plan referencing Phase 2 lot allocations.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Inherited Context Banner (ENTER ONCE -> REUSE EVERYWHERE) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-muted/40 border text-xs">
          <div>
            <span className="text-muted-foreground block">Production Order:</span>
            <span className="font-semibold text-foreground">{order.order_no}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Design:</span>
            <span className="font-semibold text-foreground">{order.design_no || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Order Qty:</span>
            <span className="font-semibold text-foreground">
              {order.qty_metre.toLocaleString()} {order.unit || "MTR"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block">Warp Requirement:</span>
            <span className="font-bold text-foreground">
              {warpRequirements.reduce((acc, r) => acc + (r.requiredQty ?? 0), 0).toFixed(3)} KG
            </span>
          </div>
        </div>

        {/* Current Active Plan Badge / Summary if one already exists */}
        {(existingBeamAlloc || existingBeamProd) && (
          <div className="p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-start justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-600 text-white font-bold text-[10px]">
                  {existingBeamAlloc ? "EXISTING BEAM ALLOCATED" : "NEW BEAM PRODUCTION PLANNED"}
                </Badge>
                <span className="font-semibold text-foreground">
                  {existingBeamAlloc
                    ? `Beam: ${existingBeamAlloc.beamNo} (${existingBeamAlloc.beamType})`
                    : `Planned Beam: ${existingBeamProd?.beamType} • Ends: ${existingBeamProd?.totalEnds} • Length: ${existingBeamProd?.plannedLengthMetre}m`}
                </span>
              </div>
              <p className="text-muted-foreground text-[11px]">
                {existingBeamAlloc
                  ? `Rack: ${existingBeamAlloc.locationRack} • Planned Length: ${existingBeamAlloc.plannedUseLengthMetre}m of ${existingBeamAlloc.availableLengthMetre}m`
                  : `Target Loom: ${existingBeamProd?.targetLoomNo || "Unassigned"} • Reusing ${existingBeamProd?.warpComposition.length} allocated Warp lots`}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearPlan}
              className="text-xs h-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove Plan
            </Button>
          </div>
        )}

        {/* Warp Material Requirement Breakdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Warp Material Lines & Allocated Lots
            </h4>
            <Badge variant="outline" className="text-[10px]">
              {warpRequirements.length} Warp Line{warpRequirements.length > 1 ? "s" : ""}
            </Badge>
          </div>

          <div className="border rounded-lg overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 text-[11px]">
                  <TableHead className="py-2">Warp Material</TableHead>
                  <TableHead className="py-2 text-right">Required (KG)</TableHead>
                  <TableHead className="py-2">Allocated Phase 2 Lots</TableHead>
                  <TableHead className="py-2 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warpCompositionBreakdown.map((warp, idx) => (
                  <TableRow key={idx} className="text-xs">
                    <TableCell className="py-2 font-medium">
                      <div className="font-semibold text-foreground">{warp.materialCode}</div>
                      <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                        {warp.materialName}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-right font-mono font-semibold">
                      {warp.requiredKg.toFixed(3)} KG
                    </TableCell>
                    <TableCell className="py-2">
                      {warp.allocatedLots.length === 0 ? (
                        <span className="text-muted-foreground italic text-[11px]">No lots allocated yet</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {warp.allocatedLots.map((lot, lIdx) => (
                            <Badge
                              key={lIdx}
                              variant="secondary"
                              className="text-[10px] bg-muted font-mono"
                            >
                              {lot.lotNo}: {lot.plannedKg.toFixed(1)}kg
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      <Button
                        variant={currentWarpReq?.materialCode === warp.materialCode ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          const matched = warpRequirements.find((r) => r.materialCode === warp.materialCode);
                          if (matched) setSelectedReqId(matched.id);
                        }}
                        className="text-[10px] h-6 px-2"
                      >
                        Find Candidates
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Warp Planning Options Tabs */}
        <Tabs defaultValue="candidates" className="w-full pt-1">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="candidates" className="text-xs font-semibold">
              Option A: Existing Beam Candidates ({candidates.length})
            </TabsTrigger>
            <TabsTrigger value="new-beam" className="text-xs font-semibold">
              Option B: Plan New Beam Production
            </TabsTrigger>
          </TabsList>

          {/* TAB A: Beam Candidates */}
          <TabsContent value="candidates" className="space-y-3 pt-2">
            <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-800 dark:text-amber-300">
              <Info className="w-4 h-4 shrink-0" />
              <span>
                <strong>Beam Candidate Note:</strong> Beams are presented as candidates based on confirmed safe filters (in store, unallocated to loom, length &gt; 0, matching warp yarn). The planner decides suitability.
              </span>
            </div>

            <div className="border rounded-lg overflow-hidden bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 text-[11px]">
                    <TableHead className="py-2">Beam No</TableHead>
                    <TableHead className="py-2">Type</TableHead>
                    <TableHead className="py-2">Warp Yarn</TableHead>
                    <TableHead className="py-2 text-right">Ends</TableHead>
                    <TableHead className="py-2 text-right">Length (m)</TableHead>
                    <TableHead className="py-2">Location</TableHead>
                    <TableHead className="py-2 text-right">Select</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-xs text-muted-foreground">
                        No beam candidate identified in store matching yarn code{" "}
                        <strong className="text-foreground">{currentWarpReq?.materialCode}</strong>.
                        <div className="mt-1">
                          Switch to <strong>Option B: Plan New Beam Production</strong>.
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    candidates.map((cand) => (
                      <TableRow key={cand.beamId} className="text-xs">
                        <TableCell className="py-2 font-bold text-foreground">
                          {cand.beamNo}
                        </TableCell>
                        <TableCell className="py-2">{cand.beamType}</TableCell>
                        <TableCell className="py-2 font-mono text-muted-foreground">
                          {cand.warpYarnCode}
                        </TableCell>
                        <TableCell className="py-2 text-right font-mono">
                          {cand.totalEnds.toLocaleString()}
                        </TableCell>
                        <TableCell className="py-2 text-right font-mono font-semibold">
                          {cand.lengthMetre.toLocaleString()} MTR
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge variant="outline" className="text-[10px]">
                            {cand.locationRack}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          <Button
                            size="sm"
                            onClick={() => handleAllocateCandidate(cand)}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7"
                          >
                            <BookmarkCheck className="w-3.5 h-3.5 mr-1" />
                            Select Candidate
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* TAB B: New Beam Production Plan */}
          <TabsContent value="new-beam" className="space-y-3 pt-2">
            <div className="p-3 bg-muted/40 border rounded-lg space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="beam-type" className="text-xs font-semibold">
                    Beam Type *
                  </Label>
                  <Input
                    id="beam-type"
                    value={beamType}
                    onChange={(e) => setBeamType(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="set-no" className="text-xs font-semibold">
                    Set No. (Optional)
                  </Label>
                  <Input
                    id="set-no"
                    placeholder="e.g. SET-2026-04"
                    value={setNo}
                    onChange={(e) => setSetNo(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="total-ends" className="text-xs font-semibold">
                    Total Ends (from Cost Sheet) *
                  </Label>
                  <Input
                    id="total-ends"
                    type="number"
                    value={totalEnds}
                    onChange={(e) => setTotalEnds(parseInt(e.target.value) || 0)}
                    className="text-xs h-8 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="planned-length" className="text-xs font-semibold">
                    Planned Beam Length (MTR) *
                  </Label>
                  <Input
                    id="planned-length"
                    type="number"
                    value={plannedLength}
                    onChange={(e) => setPlannedLength(parseFloat(e.target.value) || 0)}
                    className="text-xs h-8 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="target-loom" className="text-xs font-semibold">
                    Target Loom (Optional)
                  </Label>
                  <Select value={targetLoomId} onValueChange={setTargetLoomId}>
                    <SelectTrigger id="target-loom" className="text-xs h-8">
                      <SelectValue placeholder="Select target loom" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">
                        Unassigned (Assign Later)
                      </SelectItem>
                      {looms.map((l) => (
                        <SelectItem key={l.id} value={l.id} className="text-xs">
                          {l.loom_no} ({l.loom_type} • {l.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="beam-remarks" className="text-xs font-semibold">
                    Planning Remarks
                  </Label>
                  <Input
                    id="beam-remarks"
                    placeholder="Warping / sizing instructions..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Automatically reuses Phase 2 allocated yarn lots. Does not alter real inventory or create warping entries.
                  </span>
                </div>

                <Button
                  onClick={handleSaveNewBeamPlan}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                  Save Beam Production Plan
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            size="sm"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

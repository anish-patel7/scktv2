import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, QrCode, Layers, Scissors, Search, GitCommit, ShieldAlert, Scan, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInventory } from "@/hooks/useInventory";
import { fmt } from "@/lib/costing";
import { uid, type FabricRollItem, type FabricStage, type QualityGrade, type StockMovement } from "@/lib/inventory-store";

export const Route = createFileRoute("/inventory/fabric")({
  head: () => ({
    meta: [
      { title: "Fabric & Warehouse Store — WeaveOne ERP" },
      {
        name: "description",
        content:
          "Grey & finished fabric roll inventory, roll splitting lineage (BR-136), quality grading, and QR digital twin genealogy traceability.",
      },
      { property: "og:title", content: "Fabric Store — WeaveOne ERP" },
      { property: "og:description", content: "Perpetual fabric roll store with roll splitting and end-to-end genealogy trace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FabricStorePage,
});

const GRADE_STYLES: Record<QualityGrade, string> = {
  "Grade A": "bg-emerald-600 hover:bg-emerald-700 text-white font-bold",
  "Grade B": "bg-blue-600 text-white",
  "Grade C": "bg-amber-500 text-black",
  Hold: "bg-rose-600 text-white font-bold",
};

const STAGE_STYLES: Record<FabricStage, string> = {
  grey: "bg-muted text-muted-foreground",
  processing: "bg-amber-500/20 text-amber-700 border-amber-300",
  finished: "bg-emerald-600/20 text-emerald-700 border-emerald-300 font-semibold",
  dispatched: "bg-primary text-primary-foreground",
};

function FabricStorePage() {
  const { data, update } = useInventory();
  const [search, setSearch] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const [openSplit, setOpenSplit] = useState(false);
  const [openGenealogy, setOpenGenealogy] = useState(false);
  const [selectedRoll, setSelectedRoll] = useState<FabricRollItem | null>(null);
  const [scanCode, setScanCode] = useState("");
  const [scannedGenealogy, setScannedGenealogy] = useState<FabricRollItem | null>(null);

  // Form state for roll splitting (BR-136)
  const [splitForm, setSplitForm] = useState({
    child1_length: "",
    child2_length: "",
    child1_bay: "BAY-C-02",
    child2_bay: "BAY-C-03",
  });

  const [addForm, setAddForm] = useState({
    roll_no: "",
    piece_no: "",
    item_code: "ITEM-001",
    design_no: "D-015",
    length_metre: "100",
    weight_kg: "15",
    location_bay: "BAY-C-01",
    stage: "grey" as FabricStage,
    grade: "Grade A" as QualityGrade,
    job_card_no: "JC-901",
    beam_no: "BM-101",
    yarn_lot_no: "LOT-Y2026-081",
  });

  // Active rolls (excluding closed parent rolls)
  const activeRolls = data.fabricRolls.filter((r) => !r.is_closed);

  const totalMetres = activeRolls.reduce((sum, r) => sum + r.length_metre, 0);
  const totalWeightKg = activeRolls.reduce((sum, r) => sum + r.weight_kg, 0);
  const totalFinishedRolls = activeRolls.filter((r) => r.stage === "finished").length;
  const totalOnHold = activeRolls.filter((r) => r.grade === "Hold").length;

  const filteredRolls = activeRolls.filter((roll) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      roll.roll_no.toLowerCase().includes(q) ||
      roll.piece_no.toLowerCase().includes(q) ||
      roll.item_code.toLowerCase().includes(q) ||
      roll.design_no.toLowerCase().includes(q) ||
      roll.location_bay.toLowerCase().includes(q) ||
      roll.stage.toLowerCase().includes(q)
    );
  });

  const handleOpenAdd = () => {
    setAddForm({
      roll_no: `ROL-${Math.floor(9904 + data.fabricRolls.length)}`,
      piece_no: `PC-00${data.fabricRolls.length + 1}`,
      item_code: "ITEM-001",
      design_no: "D-015",
      length_metre: "120",
      weight_kg: "18",
      location_bay: `BAY-C-0${(data.fabricRolls.length % 4) + 1}`,
      stage: "grey",
      grade: "Grade A",
      job_card_no: "JC-901",
      beam_no: "BM-101",
      yarn_lot_no: "LOT-Y2026-081",
    });
    setOpenAdd(true);
  };

  const handleCreateRoll = () => {
    if (!addForm.roll_no || !addForm.item_code || !addForm.length_metre) {
      toast.error("Please fill in Roll #, Item Code, and Length");
      return;
    }

    const length = Number(addForm.length_metre) || 0;
    const weight = Number(addForm.weight_kg) || 0;

    const newRollId = uid("rol");
    const newRoll: FabricRollItem = {
      id: newRollId,
      roll_no: addForm.roll_no.trim(),
      piece_no: addForm.piece_no.trim() || "PC-001",
      item_code: addForm.item_code.trim(),
      design_no: addForm.design_no.trim() || "D-015",
      length_metre: length,
      weight_kg: weight,
      location_bay: addForm.location_bay.trim() || "BAY-C-01",
      stage: addForm.stage,
      grade: addForm.grade,
      parent_roll_id: null,
      job_card_no: addForm.job_card_no.trim() || "JC-901",
      beam_no: addForm.beam_no.trim() || "BM-101",
      yarn_lot_no: addForm.yarn_lot_no.trim() || "LOT-Y2026-081",
      qr_code: `QR-${addForm.roll_no.trim()}`,
      created_at: new Date().toISOString(),
    };

    const newMovement: StockMovement = {
      id: uid("mvt"),
      date: new Date().toISOString(),
      movement_type: "roll_weave",
      ref_doc: newRoll.job_card_no || "JC-901",
      item_type: "fabric",
      item_id: newRollId,
      item_label: `Roll ${newRoll.roll_no} (${newRoll.item_code})`,
      qty_change: length,
      unit: "m",
      location_from: "LOOM-WEAVING",
      location_to: newRoll.location_bay,
      user_name: "Fabric Inspector",
      remarks: "New fabric roll entered into stock",
    };

    update((prev) => ({
      ...prev,
      fabricRolls: [newRoll, ...prev.fabricRolls],
      movements: [newMovement, ...prev.movements],
    }));

    toast.success(`Fabric Roll ${newRoll.roll_no} added to stock`);
    setOpenAdd(false);
  };

  const handleOpenSplit = (roll: FabricRollItem) => {
    setSelectedRoll(roll);
    const half = Math.floor(roll.length_metre / 2);
    setSplitForm({
      child1_length: String(half),
      child2_length: String(roll.length_metre - half),
      child1_bay: roll.location_bay,
      child2_bay: roll.location_bay,
    });
    setOpenSplit(true);
  };

  // BR-136 Roll Splitting Implementation
  const handleExecuteSplit = () => {
    if (!selectedRoll) return;

    const len1 = Number(splitForm.child1_length) || 0;
    const len2 = Number(splitForm.child2_length) || 0;

    if (len1 + len2 !== selectedRoll.length_metre) {
      toast.error(
        `Split quantities (${len1}m + ${len2}m = ${len1 + len2}m) must equal parent roll length of ${selectedRoll.length_metre}m.`
      );
      return;
    }

    const weightRatio1 = len1 / selectedRoll.length_metre;
    const weightRatio2 = len2 / selectedRoll.length_metre;

    // Create 2 child rolls referencing parent lineage (BR-136)
    const child1Id = uid("rol");
    const child2Id = uid("rol");

    const child1: FabricRollItem = {
      ...selectedRoll,
      id: child1Id,
      roll_no: `${selectedRoll.roll_no}-A`,
      piece_no: `${selectedRoll.piece_no}-1`,
      length_metre: len1,
      weight_kg: Number((selectedRoll.weight_kg * weightRatio1).toFixed(1)),
      location_bay: splitForm.child1_bay,
      parent_roll_id: selectedRoll.id,
      qr_code: `QR-${selectedRoll.roll_no}-A`,
      created_at: new Date().toISOString(),
    };

    const child2: FabricRollItem = {
      ...selectedRoll,
      id: child2Id,
      roll_no: `${selectedRoll.roll_no}-B`,
      piece_no: `${selectedRoll.piece_no}-2`,
      length_metre: len2,
      weight_kg: Number((selectedRoll.weight_kg * weightRatio2).toFixed(1)),
      location_bay: splitForm.child2_bay,
      parent_roll_id: selectedRoll.id,
      qr_code: `QR-${selectedRoll.roll_no}-B`,
      created_at: new Date().toISOString(),
    };

    // Close parent roll (BR-136)
    const updatedRolls = data.fabricRolls.map((r) => {
      if (r.id === selectedRoll.id) {
        return { ...r, is_closed: true };
      }
      return r;
    });

    const newMovement: StockMovement = {
      id: uid("mvt"),
      date: new Date().toISOString(),
      movement_type: "roll_split",
      ref_doc: selectedRoll.roll_no,
      item_type: "fabric",
      item_id: selectedRoll.id,
      item_label: `Split ${selectedRoll.roll_no} into ${child1.roll_no} & ${child2.roll_no}`,
      qty_change: 0,
      unit: "roll",
      location_from: selectedRoll.location_bay,
      location_to: splitForm.child1_bay,
      user_name: "Warehouse Manager",
      remarks: `BR-136 Lineage split: ${len1}m & ${len2}m`,
    };

    update((prev) => ({
      ...prev,
      fabricRolls: [child1, child2, ...updatedRolls],
      movements: [newMovement, ...prev.movements],
    }));

    toast.success(`Parent roll ${selectedRoll.roll_no} split into ${child1.roll_no} & ${child2.roll_no}`);
    setOpenSplit(false);
  };

  const handleScanGenealogy = () => {
    const code = scanCode.trim().toLowerCase();
    if (!code) {
      toast.error("Please enter a Roll # or QR Code to scan");
      return;
    }

    const match = data.fabricRolls.find(
      (r) => r.roll_no.toLowerCase() === code || r.qr_code.toLowerCase() === code || r.id.toLowerCase() === code
    );

    if (!match) {
      toast.error(`No roll found matching scanned code "${scanCode}" (M31 validation)`);
      setScannedGenealogy(null);
      return;
    }

    setScannedGenealogy(match);
    setOpenGenealogy(true);
    toast.success(`Genealogy retrieved for ${match.roll_no}`);
  };

  return (
    <AppShell
      title="Fabric & Warehouse Store (M30 & M31)"
      breadcrumb={[{ label: "Inventory" }, { label: "Fabric Store" }]}
      actions={
        <Button size="sm" onClick={handleOpenAdd} className="h-7 gap-1 text-xs">
          <Plus className="size-3.5" /> Fabric Roll Entry
        </Button>
      }
    >
      <div className="space-y-4">
        {/* KPI Summary Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Active Fabric Rolls</span>
                <Layers className="size-4 text-primary" />
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-foreground">{activeRolls.length} Rolls</p>
              <span className="text-[0.6875rem] text-muted-foreground">{fmt(totalMetres, 0)} total meters</span>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Total Fabric Weight</span>
                <span className="font-semibold text-emerald-600">KG</span>
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-emerald-600">{fmt(totalWeightKg, 1)} kg</p>
              <span className="text-[0.6875rem] text-muted-foreground">Woven fabric mass</span>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Finished & Inspected</span>
                <Badge variant="outline" className="text-[0.625rem]">Ready</Badge>
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-foreground">{totalFinishedRolls} Rolls</p>
              <span className="text-[0.6875rem] text-muted-foreground">Available for dispatch</span>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Quality Hold</span>
                <ShieldAlert className="size-4 text-rose-600" />
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-rose-600">{totalOnHold} Rolls</p>
              <span className="text-[0.6875rem] text-muted-foreground">Blocked from dispatch</span>
            </CardContent>
          </Card>
        </div>

        {/* Digital Twin Barcode / QR Scanner Tool (M31) */}
        <Card className="border border-border bg-card p-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Scan className="size-5 text-primary" />
              <div>
                <h4 className="text-xs font-bold">Digital Twin QR & Barcode Scanner (M31)</h4>
                <p className="text-[0.6875rem] text-muted-foreground">
                  Scan or enter Roll # / QR Code to reconstruct full genealogy (Dispatched Roll → Finished → Grey → Job Card → Beam → Yarn Lot).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 min-w-[280px]">
              <Input
                value={scanCode}
                onChange={(e) => setScanCode(e.target.value)}
                placeholder="Scan QR (e.g. ROL-9901 or QR-ROL-9901)..."
                className="h-8 text-xs font-mono"
              />
              <Button size="sm" onClick={handleScanGenealogy} className="h-8 text-xs gap-1">
                Trace Genealogy
              </Button>
            </div>
          </div>
        </Card>

        {/* Main Tabs */}
        <Tabs defaultValue="rolls" className="w-full">
          <TabsList className="h-8 text-xs">
            <TabsTrigger value="rolls" className="h-7 text-xs gap-1">
              <Layers className="size-3.5" /> Fabric Roll Register
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rolls" className="space-y-3 mt-3">
            {/* Filter Bar */}
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
              <div className="relative flex-1 min-w-[260px] max-w-md">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search rolls by Roll #, Item Code, Design #, Bay, Stage..."
                  className="pl-9 text-xs"
                />
              </div>
            </div>

            {/* Roll Inventory Table */}
            <Card className="rounded-md border border-border">
              <CardContent className="p-0">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="bg-muted/60 font-semibold text-muted-foreground">
                      <TableHead className="h-8">Roll #</TableHead>
                      <TableHead className="h-8">Piece #</TableHead>
                      <TableHead className="h-8">Item & Design</TableHead>
                      <TableHead className="h-8 text-right">Length (m)</TableHead>
                      <TableHead className="h-8 text-right">Weight (kg)</TableHead>
                      <TableHead className="h-8">Bay Location</TableHead>
                      <TableHead className="h-8">Stage</TableHead>
                      <TableHead className="h-8">Quality Grade</TableHead>
                      <TableHead className="h-8 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRolls.map((roll) => {
                      const isSplitChild = Boolean(roll.parent_roll_id);
                      return (
                        <TableRow key={roll.id} className="hover:bg-muted/40">
                          <TableCell className="py-2 font-mono font-bold text-primary">
                            {roll.roll_no}
                            {isSplitChild && (
                              <Badge variant="outline" className="ml-1.5 text-[0.5625rem] bg-muted/40 font-mono">
                                Split Child
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-2 font-mono text-muted-foreground">{roll.piece_no}</TableCell>
                          <TableCell className="py-2">
                            <div className="font-semibold text-foreground">{roll.item_code}</div>
                            <div className="text-[0.6875rem] text-muted-foreground">Design: {roll.design_no}</div>
                          </TableCell>
                          <TableCell className="py-2 text-right font-mono font-bold">{fmt(roll.length_metre, 0)} m</TableCell>
                          <TableCell className="py-2 text-right font-mono">{fmt(roll.weight_kg, 1)} kg</TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline" className="font-mono text-[0.625rem] bg-muted/30">
                              {roll.location_bay}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline" className={`text-[0.625rem] capitalize ${STAGE_STYLES[roll.stage]}`}>
                              {roll.stage}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2">
                            <Badge className={`text-[0.625rem] ${GRADE_STYLES[roll.grade]}`}>
                              {roll.grade}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedRoll(roll);
                                  setScannedGenealogy(roll);
                                  setOpenGenealogy(true);
                                }}
                                className="size-6 p-0"
                                title="Inspect Traceability Genealogy (M31)"
                              >
                                <GitCommit className="size-3.5 text-primary" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenSplit(roll)}
                                className="h-6 text-[0.6875rem] gap-1 px-2"
                              >
                                <Scissors className="size-3" /> Split Roll (BR-136)
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {!filteredRolls.length && (
                      <TableRow>
                        <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                          No fabric rolls match search criteria.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* New Roll Entry Dialog */}
      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent className="max-w-md p-5 text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">New Fabric Roll Entry</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Roll Number *</Label>
                <Input
                  className="h-8 text-xs font-mono font-bold"
                  value={addForm.roll_no}
                  onChange={(e) => setAddForm({ ...addForm, roll_no: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Piece Number</Label>
                <Input
                  className="h-8 text-xs font-mono"
                  value={addForm.piece_no}
                  onChange={(e) => setAddForm({ ...addForm, piece_no: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Item / Fabric Code *</Label>
                <Input
                  className="h-8 text-xs font-semibold"
                  value={addForm.item_code}
                  onChange={(e) => setAddForm({ ...addForm, item_code: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Design Number</Label>
                <Input
                  className="h-8 text-xs"
                  value={addForm.design_no}
                  onChange={(e) => setAddForm({ ...addForm, design_no: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Length (m) *</Label>
                <Input
                  type="number"
                  className="h-8 text-xs font-mono font-bold"
                  value={addForm.length_metre}
                  onChange={(e) => setAddForm({ ...addForm, length_metre: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Weight (kg)</Label>
                <Input
                  type="number"
                  className="h-8 text-xs font-mono"
                  value={addForm.weight_kg}
                  onChange={(e) => setAddForm({ ...addForm, weight_kg: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Bay Location</Label>
                <Input
                  className="h-8 text-xs font-mono"
                  value={addForm.location_bay}
                  onChange={(e) => setAddForm({ ...addForm, location_bay: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Fabric Stage</Label>
                <Select
                  value={addForm.stage}
                  onValueChange={(v) => setAddForm({ ...addForm, stage: v as FabricStage })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grey">Grey Cloth</SelectItem>
                    <SelectItem value="processing">In Processing</SelectItem>
                    <SelectItem value="finished">Finished Cloth</SelectItem>
                    <SelectItem value="dispatched">Dispatched</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Quality Grade</Label>
                <Select
                  value={addForm.grade}
                  onValueChange={(v) => setAddForm({ ...addForm, grade: v as QualityGrade })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Grade A">Grade A</SelectItem>
                    <SelectItem value="Grade B">Grade B</SelectItem>
                    <SelectItem value="Grade C">Grade C</SelectItem>
                    <SelectItem value="Hold">Hold (Blocked)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setOpenAdd(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateRoll}>
              Save Fabric Roll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Roll Splitting Dialog (BR-136) */}
      <Dialog open={openSplit} onOpenChange={setOpenSplit}>
        <DialogContent className="max-w-md p-5 text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-1.5">
              <Scissors className="size-4 text-primary" /> Roll Splitting & Lineage (BR-136)
            </DialogTitle>
          </DialogHeader>
          {selectedRoll && (
            <div className="space-y-3 py-2">
              <div className="rounded border border-border bg-muted/30 p-2.5 font-mono text-xs space-y-1">
                <div className="font-bold text-primary">Parent Roll: {selectedRoll.roll_no}</div>
                <div>Item: {selectedRoll.item_code} · Total Length: <span className="font-bold text-foreground">{selectedRoll.length_metre}m</span></div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-2 border border-border rounded p-2.5 bg-card">
                  <span className="font-bold text-xs font-mono">Child Roll 1 ({selectedRoll.roll_no}-A)</span>
                  <div className="space-y-1">
                    <Label className="text-xs">Length (m)</Label>
                    <Input
                      type="number"
                      className="h-8 text-xs font-mono font-bold"
                      value={splitForm.child1_length}
                      onChange={(e) => setSplitForm({ ...splitForm, child1_length: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Bay Location</Label>
                    <Input
                      className="h-8 text-xs font-mono"
                      value={splitForm.child1_bay}
                      onChange={(e) => setSplitForm({ ...splitForm, child1_bay: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2 border border-border rounded p-2.5 bg-card">
                  <span className="font-bold text-xs font-mono">Child Roll 2 ({selectedRoll.roll_no}-B)</span>
                  <div className="space-y-1">
                    <Label className="text-xs">Length (m)</Label>
                    <Input
                      type="number"
                      className="h-8 text-xs font-mono font-bold"
                      value={splitForm.child2_length}
                      onChange={(e) => setSplitForm({ ...splitForm, child2_length: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Bay Location</Label>
                    <Input
                      className="h-8 text-xs font-mono"
                      value={splitForm.child2_bay}
                      onChange={(e) => setSplitForm({ ...splitForm, child2_bay: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <p className="text-[0.625rem] text-muted-foreground italic">
                * BR-136: Executing split closes parent roll {selectedRoll.roll_no} and generates 2 child rolls referencing parent lineage.
              </p>
            </div>
          )}
          <DialogFooter className="gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setOpenSplit(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleExecuteSplit}>
              Execute Roll Split
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Genealogy Tree Traceability Inspector Modal (M31) */}
      <Dialog open={openGenealogy} onOpenChange={setOpenGenealogy}>
        <DialogContent className="max-w-lg p-5 text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <GitCommit className="size-4 text-primary" /> Full Unit Genealogy Tree (M31 Digital Twin)
            </DialogTitle>
          </DialogHeader>

          {scannedGenealogy && (
            <div className="space-y-3 py-2">
              <div className="rounded border border-primary/30 bg-primary/5 p-3 space-y-1 font-mono">
                <div className="flex justify-between font-bold text-primary">
                  <span>Target Unit: {scannedGenealogy.roll_no}</span>
                  <Badge variant="outline" className="text-[0.625rem] bg-card">{scannedGenealogy.qr_code}</Badge>
                </div>
                <div className="text-xs text-foreground font-semibold">{scannedGenealogy.item_code} — Design {scannedGenealogy.design_no}</div>
                <div className="text-[0.6875rem] text-muted-foreground">Length: {scannedGenealogy.length_metre}m · Location: {scannedGenealogy.location_bay}</div>
              </div>

              {/* Step by Step Genealogy Chain */}
              <div className="space-y-2 relative pl-4 border-l-2 border-primary/30">
                <div className="relative space-y-0.5">
                  <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-primary inline-block"></span> 1. Fabric Roll Layer
                  </div>
                  <div className="pl-3 text-[0.6875rem] text-muted-foreground font-mono">
                    Roll: {scannedGenealogy.roll_no} ({scannedGenealogy.stage}) · Grade: {scannedGenealogy.grade}
                  </div>
                </div>

                <div className="relative space-y-0.5">
                  <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-600 inline-block"></span> 2. Production Job Card
                  </div>
                  <div className="pl-3 text-[0.6875rem] font-mono text-muted-foreground">
                    Voucher #: {scannedGenealogy.job_card_no || "JC-901"}
                  </div>
                </div>

                <div className="relative space-y-0.5">
                  <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-amber-500 inline-block"></span> 3. Warp Beam Unit
                  </div>
                  <div className="pl-3 text-[0.6875rem] font-mono text-muted-foreground">
                    Beam #: {scannedGenealogy.beam_no || "BM-101"} (Set SET-881)
                  </div>
                </div>

                <div className="relative space-y-0.5">
                  <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-blue-600 inline-block"></span> 4. Supplier Yarn GRN Lot
                  </div>
                  <div className="pl-3 text-[0.6875rem] font-mono text-muted-foreground">
                    Yarn Lot #: {scannedGenealogy.yarn_lot_no || "LOT-Y2026-081"} (Vardhman Yarns Ltd)
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button size="sm" onClick={() => setOpenGenealogy(false)}>
              Close Traceability Tree
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

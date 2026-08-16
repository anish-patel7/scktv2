import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, QrCode, Layers, ArrowRightLeft, Search, Printer, Activity } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { uid, type BeamStockItem, type BeamStockStatus, type StockMovement } from "@/lib/inventory-store";

export const Route = createFileRoute("/inventory/beam")({
  head: () => ({
    meta: [
      { title: "Beam Store & Warping Register — SCKT ERP" },
      {
        name: "description",
        content:
          "In-house and loaded warp beam stock management, rack locations, loom transfers, and barcode/QR label printing.",
      },
      { property: "og:title", content: "Beam Store — SCKT ERP" },
      { property: "og:description", content: "Perpetual warp beam inventory with loom tracking and QR barcode labels." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BeamStorePage,
});

const STATUS_BADGES: Record<BeamStockStatus, { label: string; class: string }> = {
  in_store: { label: "In Store", class: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  loaded_on_loom: { label: "Loaded on Loom", class: "bg-primary text-primary-foreground font-semibold" },
  sizing: { label: "In Sizing Bay", class: "bg-amber-500 hover:bg-amber-600 text-black" },
  depleted: { label: "Depleted", class: "bg-muted text-muted-foreground" },
};

function BeamStorePage() {
  const { data, update } = useInventory();
  const [search, setSearch] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [openTransfer, setOpenTransfer] = useState(false);
  const [openQrModal, setOpenQrModal] = useState(false);
  const [selectedBeam, setSelectedBeam] = useState<BeamStockItem | null>(null);

  // Form states
  const [beamForm, setBeamForm] = useState({
    beam_no: "",
    beam_type: "",
    count: "",
    set_no: "",
    warp_yarn_code: "",
    total_ends: "",
    length_metre: "",
    location_rack: "",
  });

  const [transferForm, setTransferForm] = useState({
    status: "loaded_on_loom" as BeamStockStatus,
    loom_no: "L-01",
    location_rack: "LOOM-SHED-1",
  });

  // Analytics
  const totalBeamsInStore = data.beams.filter((b) => b.status === "in_store").length;
  const totalBeamsLoaded = data.beams.filter((b) => b.status === "loaded_on_loom").length;
  const totalBeamsSizing = data.beams.filter((b) => b.status === "sizing").length;
  const totalWarpMetres = data.beams.reduce((sum, b) => (b.status !== "depleted" ? sum + b.length_metre : sum), 0);

  const filteredBeams = data.beams.filter((beam) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      beam.beam_no.toLowerCase().includes(q) ||
      beam.beam_type.toLowerCase().includes(q) ||
      beam.warp_yarn_code.toLowerCase().includes(q) ||
      beam.set_no.toLowerCase().includes(q) ||
      beam.location_rack.toLowerCase().includes(q) ||
      (beam.loom_no && beam.loom_no.toLowerCase().includes(q))
    );
  });

  const handleOpenCreate = () => {
    setBeamForm({
      beam_no: `BM-${Math.floor(104 + data.beams.length)}`,
      beam_type: "30 Kota Black Beam",
      count: "35 Denier",
      set_no: `SET-${Math.floor(890 + data.beams.length)}`,
      warp_yarn_code: "YRN-75-POLY",
      total_ends: "5444",
      length_metre: "1200",
      location_rack: `RACK-B-0${(data.beams.length % 5) + 1}`,
    });
    setOpenCreate(true);
  };

  const handleCreateBeam = () => {
    if (!beamForm.beam_no || !beamForm.warp_yarn_code || !beamForm.length_metre) {
      toast.error("Please fill in Beam #, Warp Yarn, and Length");
      return;
    }

    const length = Number(beamForm.length_metre) || 0;
    const ends = Number(beamForm.total_ends) || 0;

    const newBeamId = uid("bm");
    const newBeam: BeamStockItem = {
      id: newBeamId,
      beam_no: beamForm.beam_no.trim(),
      beam_type: beamForm.beam_type.trim() || "Warp Beam",
      count: beamForm.count.trim() || "Standard",
      set_no: beamForm.set_no.trim() || "SET-DEFAULT",
      warp_yarn_code: beamForm.warp_yarn_code.trim(),
      total_ends: ends,
      length_metre: length,
      location_rack: beamForm.location_rack.trim() || "RACK-STORE",
      status: "in_store",
      loom_no: null,
      qr_code: `QR-${beamForm.beam_no.trim()}-${beamForm.set_no.trim()}`,
      created_at: new Date().toISOString(),
    };

    const newMovement: StockMovement = {
      id: uid("mvt"),
      date: new Date().toISOString(),
      movement_type: "beam_warping",
      ref_doc: newBeam.set_no,
      item_type: "beam",
      item_id: newBeamId,
      item_label: `${newBeam.beam_no} (${newBeam.beam_type})`,
      qty_change: length,
      unit: "m",
      location_from: "WARPING-SECTION",
      location_to: newBeam.location_rack,
      user_name: "Warping Operator",
      remarks: "New beam warped and stored",
    };

    update((prev) => ({
      ...prev,
      beams: [newBeam, ...prev.beams],
      movements: [newMovement, ...prev.movements],
    }));

    toast.success(`Beam ${newBeam.beam_no} registered in store`);
    setOpenCreate(false);
  };

  const handleOpenTransfer = (beam: BeamStockItem) => {
    setSelectedBeam(beam);
    setTransferForm({
      status: beam.status === "in_store" ? "loaded_on_loom" : "in_store",
      loom_no: beam.loom_no || "L-01",
      location_rack: beam.status === "in_store" ? "LOOM-SHED-1" : "RACK-B-01",
    });
    setOpenTransfer(true);
  };

  const handleExecuteTransfer = () => {
    if (!selectedBeam) return;

    const updatedBeams = data.beams.map((b) => {
      if (b.id !== selectedBeam.id) return b;
      return {
        ...b,
        status: transferForm.status,
        loom_no: transferForm.status === "loaded_on_loom" ? transferForm.loom_no : null,
        location_rack: transferForm.location_rack,
      };
    });

    const newMovement: StockMovement = {
      id: uid("mvt"),
      date: new Date().toISOString(),
      movement_type: "location_transfer",
      ref_doc: selectedBeam.beam_no,
      item_type: "beam",
      item_id: selectedBeam.id,
      item_label: `Beam ${selectedBeam.beam_no}`,
      qty_change: 0,
      unit: "beam",
      location_from: selectedBeam.location_rack,
      location_to: transferForm.location_rack,
      user_name: "Loom Supervisor",
      remarks: `Status updated to ${transferForm.status.replace(/_/g, " ")}`,
    };

    update((prev) => ({
      ...prev,
      beams: updatedBeams,
      movements: [newMovement, ...prev.movements],
    }));

    toast.success(`Beam ${selectedBeam.beam_no} transfer saved`);
    setOpenTransfer(false);
  };

  const handlePrintQr = (beam: BeamStockItem) => {
    setSelectedBeam(beam);
    setOpenQrModal(true);
  };

  return (
    <AppShell
      title="Beam Store & Warping Register (M30)"
      breadcrumb={[{ label: "Inventory" }, { label: "Beam Store" }]}
      actions={
        <Button size="sm" onClick={handleOpenCreate} className="h-7 gap-1 text-xs">
          <Plus className="size-3.5" /> Warped Beam Entry
        </Button>
      }
    >
      <div className="space-y-4">
        {/* KPI Summary Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>In-Store Beams</span>
                <Layers className="size-4 text-emerald-600" />
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-emerald-600">{totalBeamsInStore} Available</p>
              <span className="text-[0.6875rem] text-muted-foreground">Ready for loom mounting</span>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Loaded on Looms</span>
                <Activity className="size-4 text-primary" />
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-primary">{totalBeamsLoaded} Beams Active</p>
              <span className="text-[0.6875rem] text-muted-foreground">Active in weaving shed</span>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Sizing Bay</span>
                <span className="font-semibold text-amber-600">SIZ</span>
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-amber-600">{totalBeamsSizing} Beams</p>
              <span className="text-[0.6875rem] text-muted-foreground">Under sizing processing</span>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Total Warp Length</span>
                <span className="font-semibold text-muted-foreground">MTR</span>
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-foreground">{fmt(totalWarpMetres, 0)} m</p>
              <span className="text-[0.6875rem] text-muted-foreground">Cumulative warp stock</span>
            </CardContent>
          </Card>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search beams by Beam #, Type, Set #, Loom #, Rack..."
              className="pl-9 text-xs"
            />
          </div>
        </div>

        {/* Beam Register Table */}
        <Card className="rounded-md border border-border">
          <CardContent className="p-0">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="bg-muted/60 font-semibold text-muted-foreground">
                  <TableHead className="h-8">Beam #</TableHead>
                  <TableHead className="h-8">Beam Type & Count</TableHead>
                  <TableHead className="h-8">Set #</TableHead>
                  <TableHead className="h-8">Warp Yarn Code</TableHead>
                  <TableHead className="h-8 text-right">Total Ends</TableHead>
                  <TableHead className="h-8 text-right">Length (m)</TableHead>
                  <TableHead className="h-8">Location / Rack</TableHead>
                  <TableHead className="h-8">Status / Loom</TableHead>
                  <TableHead className="h-8 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBeams.map((beam) => {
                  const badgeInfo = STATUS_BADGES[beam.status];
                  return (
                    <TableRow key={beam.id} className="hover:bg-muted/40">
                      <TableCell className="py-2 font-mono font-bold text-primary">
                        {beam.beam_no}
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="font-semibold text-foreground">{beam.beam_type}</div>
                        <div className="text-[0.6875rem] text-muted-foreground">{beam.count}</div>
                      </TableCell>
                      <TableCell className="py-2 font-mono text-muted-foreground">{beam.set_no}</TableCell>
                      <TableCell className="py-2 font-semibold">{beam.warp_yarn_code}</TableCell>
                      <TableCell className="py-2 text-right font-mono">{fmt(beam.total_ends, 0)}</TableCell>
                      <TableCell className="py-2 text-right font-mono font-bold">{fmt(beam.length_metre, 0)} m</TableCell>
                      <TableCell className="py-2">
                        <Badge variant="outline" className="font-mono text-[0.625rem] bg-muted/30">
                          {beam.location_rack}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-1.5">
                          <Badge className={`text-[0.625rem] ${badgeInfo.class}`}>{badgeInfo.label}</Badge>
                          {beam.loom_no && (
                            <Badge variant="outline" className="font-mono text-[0.625rem] bg-primary/10 text-primary border-primary/30">
                              Loom {beam.loom_no}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handlePrintQr(beam)}
                            className="size-6 p-0"
                            title="Print QR Label (M31)"
                          >
                            <QrCode className="size-3.5 text-primary" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenTransfer(beam)}
                            className="h-6 text-[0.6875rem] gap-1 px-2"
                          >
                            <ArrowRightLeft className="size-3" /> Status / Loom
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!filteredBeams.length && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                      No beams match search criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* New Beam Entry Dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-md p-5 text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">New Warped Beam Entry</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Beam Number *</Label>
                <Input
                  className="h-8 text-xs font-mono font-bold"
                  value={beamForm.beam_no}
                  onChange={(e) => setBeamForm({ ...beamForm, beam_no: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Set Number *</Label>
                <Input
                  className="h-8 text-xs font-mono"
                  value={beamForm.set_no}
                  onChange={(e) => setBeamForm({ ...beamForm, set_no: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Beam Type Name</Label>
                <Input
                  className="h-8 text-xs"
                  value={beamForm.beam_type}
                  onChange={(e) => setBeamForm({ ...beamForm, beam_type: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Count / Denier</Label>
                <Input
                  className="h-8 text-xs"
                  value={beamForm.count}
                  onChange={(e) => setBeamForm({ ...beamForm, count: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Warp Yarn Code *</Label>
              <Input
                className="h-8 text-xs font-semibold"
                value={beamForm.warp_yarn_code}
                onChange={(e) => setBeamForm({ ...beamForm, warp_yarn_code: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Total Ends</Label>
                <Input
                  type="number"
                  className="h-8 text-xs font-mono"
                  value={beamForm.total_ends}
                  onChange={(e) => setBeamForm({ ...beamForm, total_ends: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Length (m) *</Label>
                <Input
                  type="number"
                  className="h-8 text-xs font-mono font-bold"
                  value={beamForm.length_metre}
                  onChange={(e) => setBeamForm({ ...beamForm, length_metre: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Rack Location</Label>
                <Input
                  className="h-8 text-xs font-mono"
                  value={beamForm.location_rack}
                  onChange={(e) => setBeamForm({ ...beamForm, location_rack: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setOpenCreate(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateBeam}>
              Save Beam Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Beam Status & Loom Assignment Dialog */}
      <Dialog open={openTransfer} onOpenChange={setOpenTransfer}>
        <DialogContent className="max-w-md p-5 text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Update Beam Location & Status</DialogTitle>
          </DialogHeader>
          {selectedBeam && (
            <div className="space-y-3 py-2">
              <div className="rounded border border-border bg-muted/30 p-2.5 font-mono text-xs space-y-1">
                <div className="font-bold text-primary">{selectedBeam.beam_no} ({selectedBeam.beam_type})</div>
                <div className="text-muted-foreground">Ends: {selectedBeam.total_ends} · Length: {selectedBeam.length_metre}m</div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Beam Status</Label>
                <Select
                  value={transferForm.status}
                  onValueChange={(v) => setTransferForm({ ...transferForm, status: v as BeamStockStatus })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_store">In Store (Available)</SelectItem>
                    <SelectItem value="loaded_on_loom">Loaded on Loom</SelectItem>
                    <SelectItem value="sizing">In Sizing Bay</SelectItem>
                    <SelectItem value="depleted">Depleted / Empty</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {transferForm.status === "loaded_on_loom" && (
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Loom Allocation</Label>
                  <Input
                    className="h-8 text-xs font-mono font-bold"
                    value={transferForm.loom_no}
                    onChange={(e) => setTransferForm({ ...transferForm, loom_no: e.target.value })}
                    placeholder="e.g. L-01"
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs font-medium">Rack / Location</Label>
                <Input
                  className="h-8 text-xs font-mono"
                  value={transferForm.location_rack}
                  onChange={(e) => setTransferForm({ ...transferForm, location_rack: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setOpenTransfer(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleExecuteTransfer}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Thermal Label Printable Modal (M31) */}
      <Dialog open={openQrModal} onOpenChange={setOpenQrModal}>
        <DialogContent className="max-w-xs p-5 text-xs text-center">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center justify-center gap-1.5">
              <QrCode className="size-4 text-primary" /> Beam QR Code Label (M31)
            </DialogTitle>
          </DialogHeader>
          {selectedBeam && (
            <div className="space-y-3 py-3 border border-dashed border-border rounded-lg bg-muted/20 p-4">
              <div className="mx-auto size-24 bg-foreground text-background flex items-center justify-center font-mono text-[0.625rem] font-bold rounded">
                [ QR CODE MATRIX ]<br />
                {selectedBeam.qr_code}
              </div>
              <div>
                <p className="font-mono font-bold text-sm">{selectedBeam.beam_no}</p>
                <p className="text-xs font-semibold">{selectedBeam.beam_type}</p>
                <p className="text-[0.6875rem] font-mono text-muted-foreground">Set: {selectedBeam.set_no}</p>
                <p className="text-[0.6875rem] font-mono text-muted-foreground">Length: {selectedBeam.length_metre}m · Ends: {selectedBeam.total_ends}</p>
              </div>
            </div>
          )}
          <DialogFooter className="justify-center pt-1">
            <Button size="sm" className="gap-1 text-xs" onClick={() => window.print()}>
              <Printer className="size-3.5" /> Print Thermal Label
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

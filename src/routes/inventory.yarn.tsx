import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Package, ArrowDownRight, ArrowUpRight, AlertTriangle, Layers, Search, History } from "lucide-react";
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
import { useInventory } from "@/hooks/useInventory";
import { fmt } from "@/lib/costing";
import { uid, type YarnStockItem, type StockMovement } from "@/lib/inventory-store";

export const Route = createFileRoute("/inventory/yarn")({
  head: () => ({
    meta: [
      { title: "Yarn Store — SCKT ERP" },
      {
        name: "description",
        content:
          "Perpetual lot-wise yarn inventory tracking, bin locations, valuation, reorder level alerts, and FIFO issues.",
      },
      { property: "og:title", content: "Yarn Store — SCKT ERP" },
      { property: "og:description", content: "Yarn stock management with negative stock prevention and FIFO issue guidance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: YarnStorePage,
});

function YarnStorePage() {
  const { data, update } = useInventory();
  const [search, setSearch] = useState("");
  const [openInward, setOpenInward] = useState(false);
  const [openIssue, setOpenIssue] = useState(false);
  const [selectedYarn, setSelectedYarn] = useState<YarnStockItem | null>(null);

  // Form states
  const [inwardForm, setInwardForm] = useState({
    lot_no: "",
    yarn_code: "",
    yarn_name: "",
    supplier_name: "",
    grn_no: "",
    location_bin: "",
    total_kg: "",
    rate_per_kg: "",
    reorder_level_kg: "500",
  });

  const [issueForm, setIssueForm] = useState({
    issue_kg: "",
    ref_doc: "",
    location_to: "WARPING-DEPT",
    remarks: "",
  });

  // Analytics
  const totalYarnKg = data.yarn.reduce((sum, item) => sum + item.available_kg, 0);
  const totalValuation = data.yarn.reduce((sum, item) => sum + item.available_kg * item.rate_per_kg, 0);
  const reorderAlertsCount = data.yarn.filter((item) => item.available_kg <= item.reorder_level_kg).length;

  const filteredYarn = data.yarn.filter((item) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      item.lot_no.toLowerCase().includes(q) ||
      item.yarn_code.toLowerCase().includes(q) ||
      item.yarn_name.toLowerCase().includes(q) ||
      item.location_bin.toLowerCase().includes(q) ||
      item.supplier_name.toLowerCase().includes(q)
    );
  });

  const handleOpenInward = () => {
    setInwardForm({
      lot_no: `LOT-Y${new Date().getFullYear()}-${String(data.yarn.length + 1).padStart(3, "0")}`,
      yarn_code: "YRN-75-POLY",
      yarn_name: "75/36 Poly Filament Bright",
      supplier_name: "Vardhman Yarns Ltd",
      grn_no: `GRN-${Math.floor(8000 + Math.random() * 1000)}`,
      location_bin: `BIN-A-0${(data.yarn.length % 6) + 1}`,
      total_kg: "500",
      rate_per_kg: "190",
      reorder_level_kg: "400",
    });
    setOpenInward(true);
  };

  const handleCreateInward = () => {
    if (!inwardForm.lot_no || !inwardForm.yarn_code || !inwardForm.total_kg) {
      toast.error("Please fill in required fields (Lot #, Yarn code, Qty kg)");
      return;
    }

    const kg = Number(inwardForm.total_kg) || 0;
    const rate = Number(inwardForm.rate_per_kg) || 0;
    const reorder = Number(inwardForm.reorder_level_kg) || 400;

    const newYarnId = uid("yn");
    const newYarn: YarnStockItem = {
      id: newYarnId,
      lot_no: inwardForm.lot_no.trim(),
      yarn_code: inwardForm.yarn_code.trim(),
      yarn_name: inwardForm.yarn_name.trim(),
      supplier_name: inwardForm.supplier_name.trim(),
      grn_no: inwardForm.grn_no.trim(),
      location_bin: inwardForm.location_bin.trim() || "BIN-A-01",
      total_kg: kg,
      reserved_kg: 0,
      available_kg: kg,
      rate_per_kg: rate,
      reorder_level_kg: reorder,
      received_date: new Date().toISOString().slice(0, 10),
      fifo_priority: data.yarn.length + 1,
    };

    const newMovement: StockMovement = {
      id: uid("mvt"),
      date: new Date().toISOString(),
      movement_type: "inward_grn",
      ref_doc: inwardForm.grn_no.trim() || "GRN-NEW",
      item_type: "yarn",
      item_id: newYarnId,
      item_label: `${newYarn.yarn_name} (${newYarn.lot_no})`,
      qty_change: kg,
      unit: "kg",
      location_from: `SUPPLIER: ${newYarn.supplier_name}`,
      location_to: newYarn.location_bin,
      user_name: "Store Keeper",
      remarks: "Inward GRN receipt created",
    };

    update((prev) => ({
      ...prev,
      yarn: [newYarn, ...prev.yarn],
      movements: [newMovement, ...prev.movements],
    }));

    toast.success(`Yarn Receipt ${newYarn.lot_no} created successfully`);
    setOpenInward(false);
  };

  const handleOpenIssue = (item: YarnStockItem) => {
    setSelectedYarn(item);
    setIssueForm({
      issue_kg: "",
      ref_doc: `REQ-${Math.floor(1000 + Math.random() * 9000)}`,
      location_to: "WARPING-DEPT",
      remarks: `Issue for warp set`,
    });
    setOpenIssue(true);
  };

  const handleExecuteIssue = () => {
    if (!selectedYarn) return;
    const issueKg = Number(issueForm.issue_kg) || 0;

    if (issueKg <= 0) {
      toast.error("Please enter a valid issue quantity (kg)");
      return;
    }

    // BR-134 Negative stock prevention
    if (issueKg > selectedYarn.available_kg) {
      toast.error(
        `Issue refused! Requested ${issueKg} kg exceeds available stock of ${selectedYarn.available_kg} kg (BR-134).`
      );
      return;
    }

    const updatedYarn = data.yarn.map((item) => {
      if (item.id !== selectedYarn.id) return item;
      const nextAvailable = item.available_kg - issueKg;
      return {
        ...item,
        available_kg: nextAvailable,
        total_kg: item.total_kg - issueKg,
      };
    });

    const newMovement: StockMovement = {
      id: uid("mvt"),
      date: new Date().toISOString(),
      movement_type: "issue_to_production",
      ref_doc: issueForm.ref_doc || "REQ-ISSUE",
      item_type: "yarn",
      item_id: selectedYarn.id,
      item_label: `${selectedYarn.yarn_name} (${selectedYarn.lot_no})`,
      qty_change: -issueKg,
      unit: "kg",
      location_from: selectedYarn.location_bin,
      location_to: issueForm.location_to || "PRODUCTION",
      user_name: "Store Keeper",
      remarks: issueForm.remarks || "Issued to production",
    };

    update((prev) => ({
      ...prev,
      yarn: updatedYarn,
      movements: [newMovement, ...prev.movements],
    }));

    toast.success(`Issued ${issueKg} kg from ${selectedYarn.lot_no}`);
    setOpenIssue(false);
  };

  return (
    <AppShell
      title="Yarn Store & Inventory (M30)"
      breadcrumb={[{ label: "Inventory" }, { label: "Yarn Store" }]}
      actions={
        <Button size="sm" onClick={handleOpenInward} className="h-7 gap-1 text-xs">
          <Plus className="size-3.5" /> Inward GRN Receipt
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Analytics Top Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Available Yarn Stock</span>
                <Package className="size-4 text-primary" />
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-foreground">{fmt(totalYarnKg, 0)} kg</p>
              <span className="text-[0.6875rem] text-muted-foreground">Across {data.yarn.length} lots</span>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Stock Valuation (Weighted)</span>
                <span className="font-semibold text-emerald-600">INR ₹</span>
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-foreground">₹{fmt(totalValuation, 2)}</p>
              <span className="text-[0.6875rem] text-muted-foreground">FIFO Valuation Engine</span>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Reorder Alerts</span>
                <AlertTriangle className="size-4 text-amber-500" />
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-amber-600">{reorderAlertsCount} Lots</p>
              <span className="text-[0.6875rem] text-muted-foreground">Below minimum safety threshold</span>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Transactions Today</span>
                <History className="size-4 text-muted-foreground" />
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-foreground">{data.movements.length} Logged</p>
              <span className="text-[0.6875rem] text-muted-foreground">Audited perpetual movement</span>
            </CardContent>
          </Card>
        </div>

        {/* Tabs: Perpetual Stock Table & Movement Ledger */}
        <Tabs defaultValue="stock" className="w-full">
          <TabsList className="h-8 text-xs">
            <TabsTrigger value="stock" className="h-7 text-xs gap-1">
              <Layers className="size-3.5" /> Perpetual Stock
            </TabsTrigger>
            <TabsTrigger value="ledger" className="h-7 text-xs gap-1">
              <History className="size-3.5" /> Stock Movements Ledger
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stock" className="space-y-3 mt-3">
            {/* Search Filter Bar */}
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
              <div className="relative flex-1 min-w-[260px] max-w-md">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search yarn by Lot #, Code, Name, Supplier, Bin..."
                  className="pl-9 text-xs"
                />
              </div>
            </div>

            {/* Yarn Stock Table */}
            <Card className="rounded-md border border-border">
              <CardContent className="p-0">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="bg-muted/60 font-semibold text-muted-foreground">
                      <TableHead className="h-8">Lot #</TableHead>
                      <TableHead className="h-8">Yarn Code & Name</TableHead>
                      <TableHead className="h-8">Supplier & GRN</TableHead>
                      <TableHead className="h-8">Bin Location</TableHead>
                      <TableHead className="h-8 text-right">Available (kg)</TableHead>
                      <TableHead className="h-8 text-right">Rate / kg</TableHead>
                      <TableHead className="h-8 text-right">Valuation (₹)</TableHead>
                      <TableHead className="h-8">FIFO Badge</TableHead>
                      <TableHead className="h-8 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredYarn.map((item) => {
                      const valuation = item.available_kg * item.rate_per_kg;
                      const isLowStock = item.available_kg <= item.reorder_level_kg;
                      return (
                        <TableRow key={item.id} className="hover:bg-muted/40">
                          <TableCell className="py-2 font-mono font-bold text-primary">
                            {item.lot_no}
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="font-semibold text-foreground">{item.yarn_code}</div>
                            <div className="text-[0.6875rem] text-muted-foreground">{item.yarn_name}</div>
                          </TableCell>
                          <TableCell className="py-2">
                            <div>{item.supplier_name}</div>
                            <div className="text-[0.6875rem] font-mono text-muted-foreground">{item.grn_no}</div>
                          </TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline" className="font-mono text-[0.625rem] bg-muted/30">
                              {item.location_bin}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 text-right font-mono font-bold">
                            {fmt(item.available_kg, 1)} kg
                            {isLowStock && (
                              <div className="text-[0.625rem] text-amber-600 font-normal">Reorder Alert</div>
                            )}
                          </TableCell>
                          <TableCell className="py-2 text-right font-mono">
                            ₹{fmt(item.rate_per_kg, 2)}
                          </TableCell>
                          <TableCell className="py-2 text-right font-mono font-bold text-foreground">
                            ₹{fmt(valuation, 2)}
                          </TableCell>
                          <TableCell className="py-2">
                            {item.fifo_priority === 1 ? (
                              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[0.625rem]">
                                Issue First (FIFO)
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[0.625rem]">
                                Priority #{item.fifo_priority}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-2 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenIssue(item)}
                              className="h-6 text-[0.6875rem] gap-1 px-2"
                            >
                              <ArrowUpRight className="size-3" /> Issue Yarn
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {!filteredYarn.length && (
                      <TableRow>
                        <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                          No yarn lots match the search.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ledger Content */}
          <TabsContent value="ledger" className="space-y-3 mt-3">
            <Card className="rounded-md border border-border">
              <CardContent className="p-0">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="bg-muted/60 font-semibold text-muted-foreground">
                      <TableHead className="h-8">Timestamp</TableHead>
                      <TableHead className="h-8">Type</TableHead>
                      <TableHead className="h-8">Ref Doc</TableHead>
                      <TableHead className="h-8">Item Label</TableHead>
                      <TableHead className="h-8 text-right">Qty Change</TableHead>
                      <TableHead className="h-8">From → To Location</TableHead>
                      <TableHead className="h-8">User</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.movements.map((mvt) => (
                      <TableRow key={mvt.id} className="hover:bg-muted/40">
                        <TableCell className="py-2 font-mono text-muted-foreground">
                          {new Date(mvt.date).toLocaleString()}
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge
                            variant={mvt.qty_change > 0 ? "default" : "secondary"}
                            className="text-[0.625rem] capitalize"
                          >
                            {mvt.movement_type.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 font-mono font-semibold">{mvt.ref_doc}</TableCell>
                        <TableCell className="py-2">{mvt.item_label}</TableCell>
                        <TableCell
                          className={`py-2 text-right font-mono font-bold ${
                            mvt.qty_change > 0 ? "text-emerald-600" : "text-amber-600"
                          }`}
                        >
                          {mvt.qty_change > 0 ? `+${mvt.qty_change}` : mvt.qty_change} {mvt.unit}
                        </TableCell>
                        <TableCell className="py-2 text-[0.6875rem]">
                          {mvt.location_from} → {mvt.location_to}
                        </TableCell>
                        <TableCell className="py-2 text-muted-foreground">{mvt.user_name}</TableCell>
                      </TableRow>
                    ))}
                    {!data.movements.length && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                          No stock movements logged yet.
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

      {/* Inward GRN Receipt Dialog */}
      <Dialog open={openInward} onOpenChange={setOpenInward}>
        <DialogContent className="max-w-md p-5 text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <ArrowDownRight className="size-4 text-emerald-600" /> Inward Yarn GRN Receipt
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Lot Number *</Label>
                <Input
                  className="h-8 text-xs font-mono font-bold"
                  value={inwardForm.lot_no}
                  onChange={(e) => setInwardForm({ ...inwardForm, lot_no: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">GRN Number *</Label>
                <Input
                  className="h-8 text-xs font-mono"
                  value={inwardForm.grn_no}
                  onChange={(e) => setInwardForm({ ...inwardForm, grn_no: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Yarn Code & Quality *</Label>
              <Input
                className="h-8 text-xs"
                value={inwardForm.yarn_code}
                onChange={(e) => setInwardForm({ ...inwardForm, yarn_code: e.target.value })}
                placeholder="e.g. YRN-75-POLY"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Yarn Description</Label>
              <Input
                className="h-8 text-xs"
                value={inwardForm.yarn_name}
                onChange={(e) => setInwardForm({ ...inwardForm, yarn_name: e.target.value })}
                placeholder="e.g. 75/36 Poly Filament Bright"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Supplier Name</Label>
                <Input
                  className="h-8 text-xs"
                  value={inwardForm.supplier_name}
                  onChange={(e) => setInwardForm({ ...inwardForm, supplier_name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Bin Location</Label>
                <Input
                  className="h-8 text-xs font-mono"
                  value={inwardForm.location_bin}
                  onChange={(e) => setInwardForm({ ...inwardForm, location_bin: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Total Qty (kg) *</Label>
                <Input
                  type="number"
                  className="h-8 text-xs font-mono font-bold"
                  value={inwardForm.total_kg}
                  onChange={(e) => setInwardForm({ ...inwardForm, total_kg: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Rate / kg (₹)</Label>
                <Input
                  type="number"
                  className="h-8 text-xs font-mono"
                  value={inwardForm.rate_per_kg}
                  onChange={(e) => setInwardForm({ ...inwardForm, rate_per_kg: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Reorder Alert (kg)</Label>
                <Input
                  type="number"
                  className="h-8 text-xs font-mono"
                  value={inwardForm.reorder_level_kg}
                  onChange={(e) => setInwardForm({ ...inwardForm, reorder_level_kg: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setOpenInward(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateInward}>
              Receive GRN Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue Yarn Dialog */}
      <Dialog open={openIssue} onOpenChange={setOpenIssue}>
        <DialogContent className="max-w-md p-5 text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <ArrowUpRight className="size-4 text-amber-600" /> Issue Yarn to Production
            </DialogTitle>
          </DialogHeader>

          {selectedYarn && (
            <div className="space-y-3 py-2">
              <div className="rounded border border-border bg-muted/30 p-2.5 space-y-1">
                <div className="flex justify-between font-mono text-xs">
                  <span className="font-bold">{selectedYarn.lot_no}</span>
                  <span className="text-muted-foreground">{selectedYarn.location_bin}</span>
                </div>
                <div className="font-semibold">{selectedYarn.yarn_code} — {selectedYarn.yarn_name}</div>
                <div className="text-[0.6875rem] text-emerald-600 font-bold">
                  Available in Stock: {fmt(selectedYarn.available_kg, 1)} kg
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Issue Quantity (kg) *</Label>
                <Input
                  type="number"
                  className="h-8 text-xs font-mono font-bold"
                  placeholder={`Max ${selectedYarn.available_kg} kg`}
                  value={issueForm.issue_kg}
                  onChange={(e) => setIssueForm({ ...issueForm, issue_kg: e.target.value })}
                />
                <span className="text-[0.625rem] text-muted-foreground">
                  Enforces BR-134 negative stock prevention.
                </span>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Requisition / Ref Doc</Label>
                <Input
                  className="h-8 text-xs font-mono"
                  value={issueForm.ref_doc}
                  onChange={(e) => setIssueForm({ ...issueForm, ref_doc: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Destination Dept / Department</Label>
                <Input
                  className="h-8 text-xs"
                  value={issueForm.location_to}
                  onChange={(e) => setIssueForm({ ...issueForm, location_to: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Remarks</Label>
                <Input
                  className="h-8 text-xs"
                  value={issueForm.remarks}
                  onChange={(e) => setIssueForm({ ...issueForm, remarks: e.target.value })}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setOpenIssue(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleExecuteIssue}>
              Execute Issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

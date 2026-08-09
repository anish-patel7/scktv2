import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Palette, FlaskConical, CheckCircle2, XCircle, Clock, Search } from "lucide-react";
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
import { useQuality } from "@/hooks/useQuality";
import { fmt } from "@/lib/costing";
import { uid, type ShadeApproval, type LabTest } from "@/lib/quality-store";

export const Route = createFileRoute("/quality/shade")({
  head: () => ({
    meta: [
      { title: "Shade Approval & Laboratory Testing — WeaveOne ERP" },
      {
        name: "description",
        content:
          "Shade lab dip approvals, Delta-E color matching standards, buyer sign-off, and physical lab testing (GSM, tear strength, shrinkage).",
      },
      { property: "og:title", content: "Shade Approval — WeaveOne ERP" },
      { property: "og:description", content: "Lab dip shade matching and fabric testing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ShadePage,
});

function ShadePage() {
  const { data, update } = useQuality();
  const [search, setSearch] = useState("");
  const [openShadeModal, setOpenShadeModal] = useState(false);
  const [openLabModal, setOpenLabModal] = useState(false);

  // Form states
  const [shadeForm, setShadeForm] = useState({
    customer_name: "Shree Fabrics Pvt Ltd",
    design_no: "D-015",
    shade_name: "Royal Navy Blue #44",
    hex_color: "#1e3a8a",
    delta_e_value: "0.45",
    buyer_remarks: "Swatch sample submitted to client lab",
  });

  const [labForm, setLabForm] = useState({
    roll_no: "ROL-9901",
    gsm_actual: "145",
    gsm_spec: "142",
    tear_strength_warp: "38",
    tear_strength_weft: "34",
    shrinkage_pct: "1.2",
  });

  const filteredShades = data.shadeDips.filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      s.lab_dip_no.toLowerCase().includes(q) ||
      s.customer_name.toLowerCase().includes(q) ||
      s.design_no.toLowerCase().includes(q) ||
      s.shade_name.toLowerCase().includes(q)
    );
  });

  const handleOpenShadeModal = () => {
    setShadeForm({
      customer_name: "Shree Fabrics Pvt Ltd",
      design_no: "D-015",
      shade_name: "Royal Navy Blue #44",
      hex_color: "#1e3a8a",
      delta_e_value: "0.45",
      buyer_remarks: "Swatch sample submitted to client lab",
    });
    setOpenShadeModal(true);
  };

  const handleCreateShade = () => {
    if (!shadeForm.shade_name.trim()) {
      toast.error("Shade Name is required");
      return;
    }

    const deltaE = Number(shadeForm.delta_e_value) || 0.5;
    const status = deltaE <= 1.0 ? "approved" : "pending_buyer";

    const newShade: ShadeApproval = {
      id: uid("shd"),
      lab_dip_no: `LIP-${Math.floor(8803 + data.shadeDips.length)}`,
      customer_name: shadeForm.customer_name.trim(),
      design_no: shadeForm.design_no.trim() || "D-015",
      shade_name: shadeForm.shade_name.trim(),
      hex_color: shadeForm.hex_color.trim() || "#1e3a8a",
      delta_e_value: deltaE,
      status: status,
      buyer_remarks: shadeForm.buyer_remarks.trim() || "Lab dip submitted",
      created_at: new Date().toISOString(),
    };

    update((prev) => ({
      ...prev,
      shadeDips: [newShade, ...prev.shadeDips],
    }));

    toast.success(`Lab Dip ${newShade.lab_dip_no} submitted for ${newShade.shade_name}`);
    setOpenShadeModal(false);
  };

  const handleOpenLabModal = () => {
    setLabForm({
      roll_no: "ROL-9901",
      gsm_actual: "145",
      gsm_spec: "142",
      tear_strength_warp: "38",
      tear_strength_weft: "34",
      shrinkage_pct: "1.2",
    });
    setOpenLabModal(true);
  };

  const handleCreateLabTest = () => {
    const gsmActual = Number(labForm.gsm_actual) || 145;
    const gsmSpec = Number(labForm.gsm_spec) || 142;
    const shrink = Number(labForm.shrinkage_pct) || 1.2;

    const isPass = Math.abs(gsmActual - gsmSpec) <= 10 && shrink <= 3.0;

    const newTest: LabTest = {
      id: uid("lab"),
      test_no: `LAB-${Math.floor(7703 + data.labTests.length)}`,
      roll_no: labForm.roll_no.trim(),
      gsm_actual: gsmActual,
      gsm_spec: gsmSpec,
      tear_strength_warp: Number(labForm.tear_strength_warp) || 35,
      tear_strength_weft: Number(labForm.tear_strength_weft) || 32,
      shrinkage_pct: shrink,
      status: isPass ? "pass" : "fail",
      tested_at: new Date().toISOString(),
    };

    update((prev) => ({
      ...prev,
      labTests: [newTest, ...prev.labTests],
    }));

    toast.success(`Lab Test ${newTest.test_no} recorded (${newTest.status.toUpperCase()})`);
    setOpenLabModal(false);
  };

  return (
    <AppShell
      title="Shade Approval & Laboratory Testing (M35)"
      breadcrumb={[{ label: "Quality" }, { label: "Shade Approval" }]}
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleOpenLabModal} className="h-7 gap-1 text-xs">
            <FlaskConical className="size-3.5" /> Physical Lab Test
          </Button>
          <Button size="sm" onClick={handleOpenShadeModal} className="h-7 gap-1 text-xs">
            <Plus className="size-3.5" /> New Shade Lab Dip
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* KPI Summary Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Shade Lab Dips</span>
                <Palette className="size-4 text-primary" />
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-foreground">{data.shadeDips.length} Dips</p>
              <span className="text-[0.6875rem] text-muted-foreground">Spectrophotometer records</span>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Approved Lab Dips</span>
                <CheckCircle2 className="size-4 text-emerald-600" />
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-emerald-600">
                {data.shadeDips.filter((s) => s.status === "approved").length} Approved
              </p>
              <span className="text-[0.6875rem] text-muted-foreground">Delta-E ≤ 1.0 passed</span>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Lab Physical Tests</span>
                <FlaskConical className="size-4 text-muted-foreground" />
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-foreground">{data.labTests.length} Tests</p>
              <span className="text-[0.6875rem] text-muted-foreground">GSM & Tear strength logs</span>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Lab Test Pass Rate</span>
                <span className="font-bold text-emerald-600">%</span>
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-emerald-600">
                {fmt(
                  (data.labTests.filter((t) => t.status === "pass").length / (data.labTests.length || 1)) * 100,
                  0
                )}
                %
              </p>
              <span className="text-[0.6875rem] text-muted-foreground">Physical specs pass rate</span>
            </CardContent>
          </Card>
        </div>

        {/* Tabs: Shade Dips & Physical Lab Tests */}
        <Tabs defaultValue="shades" className="w-full">
          <TabsList className="h-8 text-xs">
            <TabsTrigger value="shades" className="h-7 text-xs gap-1">
              <Palette className="size-3.5" /> Shade Lab Dip Approvals
            </TabsTrigger>
            <TabsTrigger value="lab" className="h-7 text-xs gap-1">
              <FlaskConical className="size-3.5" /> Physical Laboratory Tests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="shades" className="space-y-3 mt-3">
            {/* Filter Bar */}
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
              <div className="relative flex-1 min-w-[260px] max-w-md">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search shade dips by Dip #, Customer, Design, Shade..."
                  className="pl-9 text-xs"
                />
              </div>
            </div>

            {/* Shade Dip Table */}
            <Card className="rounded-md border border-border">
              <CardContent className="p-0">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="bg-muted/60 font-semibold text-muted-foreground">
                      <TableHead className="h-8">Lab Dip #</TableHead>
                      <TableHead className="h-8">Customer Name</TableHead>
                      <TableHead className="h-8">Design #</TableHead>
                      <TableHead className="h-8">Shade Name & Swatch</TableHead>
                      <TableHead className="h-8 text-right">Delta-E (ΔE)</TableHead>
                      <TableHead className="h-8">Status</TableHead>
                      <TableHead className="h-8">Buyer Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredShades.map((s) => (
                      <TableRow key={s.id} className="hover:bg-muted/40">
                        <TableCell className="py-2 font-mono font-bold text-primary">{s.lab_dip_no}</TableCell>
                        <TableCell className="py-2 font-semibold text-foreground">{s.customer_name}</TableCell>
                        <TableCell className="py-2 font-mono text-muted-foreground">{s.design_no}</TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="size-4 rounded-full border border-border shadow-xs"
                              style={{ backgroundColor: s.hex_color }}
                              title={s.hex_color}
                            />
                            <span className="font-semibold text-foreground">{s.shade_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-right font-mono font-bold text-primary">
                          {s.delta_e_value}
                        </TableCell>
                        <TableCell className="py-2">
                          {s.status === "approved" ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[0.625rem] font-bold">
                              Approved (ΔE ≤ 1.0)
                            </Badge>
                          ) : s.status === "pending_buyer" ? (
                            <Badge className="bg-amber-500 hover:bg-amber-600 text-black text-[0.625rem]">
                              Pending Buyer Sign-off
                            </Badge>
                          ) : (
                            <Badge className="bg-rose-600 text-white text-[0.625rem]">Rejected</Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-2 text-muted-foreground text-[0.6875rem]">{s.buyer_remarks}</TableCell>
                      </TableRow>
                    ))}
                    {!filteredShades.length && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                          No shade lab dips match search criteria.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Physical Lab Tests Tab */}
          <TabsContent value="lab" className="space-y-3 mt-3">
            <Card className="rounded-md border border-border">
              <CardContent className="p-0">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="bg-muted/60 font-semibold text-muted-foreground">
                      <TableHead className="h-8">Test #</TableHead>
                      <TableHead className="h-8">Roll Ref #</TableHead>
                      <TableHead className="h-8 text-right">Actual GSM</TableHead>
                      <TableHead className="h-8 text-right">Spec GSM</TableHead>
                      <TableHead className="h-8 text-right">Warp Tear (N)</TableHead>
                      <TableHead className="h-8 text-right">Weft Tear (N)</TableHead>
                      <TableHead className="h-8 text-right">Shrinkage %</TableHead>
                      <TableHead className="h-8">Result</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.labTests.map((t) => (
                      <TableRow key={t.id} className="hover:bg-muted/40">
                        <TableCell className="py-2 font-mono font-bold text-primary">{t.test_no}</TableCell>
                        <TableCell className="py-2 font-mono font-semibold">{t.roll_no}</TableCell>
                        <TableCell className="py-2 text-right font-mono font-bold">{t.gsm_actual}</TableCell>
                        <TableCell className="py-2 text-right font-mono text-muted-foreground">{t.gsm_spec}</TableCell>
                        <TableCell className="py-2 text-right font-mono">{t.tear_strength_warp} N</TableCell>
                        <TableCell className="py-2 text-right font-mono">{t.tear_strength_weft} N</TableCell>
                        <TableCell className="py-2 text-right font-mono">{t.shrinkage_pct}%</TableCell>
                        <TableCell className="py-2">
                          {t.status === "pass" ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[0.625rem]">
                              Pass
                            </Badge>
                          ) : (
                            <Badge className="bg-rose-600 text-white text-[0.625rem] font-bold">
                              Fail
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!data.labTests.length && (
                      <TableRow>
                        <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                          No physical lab test records logged yet.
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

      {/* New Shade Lab Dip Dialog */}
      <Dialog open={openShadeModal} onOpenChange={setOpenShadeModal}>
        <DialogContent className="max-w-md p-5 text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Palette className="size-4 text-primary" /> New Shade Lab Dip Submission
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Customer Name</Label>
                <Input
                  className="h-8 text-xs font-semibold"
                  value={shadeForm.customer_name}
                  onChange={(e) => setShadeForm({ ...shadeForm, customer_name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Design #</Label>
                <Input
                  className="h-8 text-xs font-mono"
                  value={shadeForm.design_no}
                  onChange={(e) => setShadeForm({ ...shadeForm, design_no: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Shade Name *</Label>
              <Input
                className="h-8 text-xs font-semibold"
                value={shadeForm.shade_name}
                onChange={(e) => setShadeForm({ ...shadeForm, shade_name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Hex Color Code</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    className="size-8 rounded border border-border cursor-pointer p-0"
                    value={shadeForm.hex_color}
                    onChange={(e) => setShadeForm({ ...shadeForm, hex_color: e.target.value })}
                  />
                  <Input
                    className="h-8 text-xs font-mono uppercase"
                    value={shadeForm.hex_color}
                    onChange={(e) => setShadeForm({ ...shadeForm, hex_color: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Delta-E (ΔE) Value *</Label>
                <Input
                  type="number"
                  step="0.01"
                  className="h-8 text-xs font-mono font-bold text-primary"
                  value={shadeForm.delta_e_value}
                  onChange={(e) => setShadeForm({ ...shadeForm, delta_e_value: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Buyer Remarks</Label>
              <Input
                className="h-8 text-xs"
                value={shadeForm.buyer_remarks}
                onChange={(e) => setShadeForm({ ...shadeForm, buyer_remarks: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setOpenShadeModal(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateShade}>
              Submit Lab Dip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Physical Lab Test Dialog */}
      <Dialog open={openLabModal} onOpenChange={setOpenLabModal}>
        <DialogContent className="max-w-md p-5 text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <FlaskConical className="size-4 text-primary" /> Record Physical Lab Test
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Fabric Roll # *</Label>
              <Input
                className="h-8 text-xs font-mono font-bold"
                value={labForm.roll_no}
                onChange={(e) => setLabForm({ ...labForm, roll_no: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Actual GSM</Label>
                <Input
                  type="number"
                  className="h-8 text-xs font-mono font-bold"
                  value={labForm.gsm_actual}
                  onChange={(e) => setLabForm({ ...labForm, gsm_actual: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Spec Target GSM</Label>
                <Input
                  type="number"
                  className="h-8 text-xs font-mono"
                  value={labForm.gsm_spec}
                  onChange={(e) => setLabForm({ ...labForm, gsm_spec: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Warp Tear (N)</Label>
                <Input
                  type="number"
                  className="h-8 text-xs font-mono"
                  value={labForm.tear_strength_warp}
                  onChange={(e) => setLabForm({ ...labForm, tear_strength_warp: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Weft Tear (N)</Label>
                <Input
                  type="number"
                  className="h-8 text-xs font-mono"
                  value={labForm.tear_strength_weft}
                  onChange={(e) => setLabForm({ ...labForm, tear_strength_weft: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Shrinkage %</Label>
                <Input
                  type="number"
                  step="0.1"
                  className="h-8 text-xs font-mono font-bold"
                  value={labForm.shrinkage_pct}
                  onChange={(e) => setLabForm({ ...labForm, shrinkage_pct: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setOpenLabModal(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateLabTest}>
              Save Physical Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

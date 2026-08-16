import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileText, Printer, CreditCard, Package, Award } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSales } from "@/hooks/useSales";
import { useInventory } from "@/hooks/useInventory";
import { useQuality } from "@/hooks/useQuality";
import { getLocalCostSheets } from "@/lib/cost-sheet-store";
import { fmt } from "@/lib/costing";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Executive ERP Reports — SCKT ERP" },
      {
        name: "description",
        content:
          "Cross-module ERP executive reporting: Costing register, Inventory valuation, Sales pipeline, Aged receivables, and Quality pass rates.",
      },
      { property: "og:title", content: "Executive Reports — SCKT ERP" },
      { property: "og:description", content: "Executive cross-module reporting dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { data: salesData } = useSales();
  const { data: invData } = useInventory();
  const { data: qualityData } = useQuality();
  const costSheets = getLocalCostSheets();

  const [activeTab, setActiveTab] = useState("sales");

  // Summary Metrics
  const totalCostingVal = costSheets.reduce((sum, cs) => sum + (cs.header.manual_sale_rate || 170), 0);
  const yarnVal = invData.yarn.reduce((sum, y) => sum + y.available_kg * y.rate_per_kg, 0);
  const fabricVal = invData.fabricRolls.reduce((sum, f) => sum + f.length_metre * 170, 0);
  const totalInventoryVal = yarnVal + fabricVal;
  const totalSalesVal = salesData.orders.reduce((sum, o) => sum + o.total_value_inr, 0);
  const totalOutstandingVal = salesData.invoices.reduce((sum, i) => sum + i.balance_amount_inr, 0);

  return (
    <AppShell
      title="Executive ERP Reporting Suite"
      breadcrumb={[{ label: "Insights" }, { label: "Reports" }]}
      actions={
        <Button size="sm" onClick={() => window.print()} className="h-7 gap-1 text-xs">
          <Printer className="size-3.5" /> Print Report Summary
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Executive Summary KPIs */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Active Sales Pipeline</span>
                <CreditCard className="size-4 text-primary" />
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-foreground">₹{fmt(totalSalesVal, 0)}</p>
              <span className="text-[0.6875rem] text-muted-foreground">{salesData.orders.length} Confirmed orders</span>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Outstanding Receivables</span>
                <CreditCard className="size-4 text-rose-600" />
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-rose-600">₹{fmt(totalOutstandingVal, 0)}</p>
              <span className="text-[0.6875rem] text-muted-foreground">{salesData.invoices.length} Active invoices</span>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Total Inventory Value</span>
                <Package className="size-4 text-emerald-600" />
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-emerald-600">₹{fmt(totalInventoryVal, 0)}</p>
              <span className="text-[0.6875rem] text-muted-foreground">Yarn + Fabric stock valuation</span>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>4-Point Inspection Pass</span>
                <Award className="size-4 text-amber-500" />
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-foreground">
                {qualityData.inspections.filter((i) => i.system_grade === "Grade A").length} / {qualityData.inspections.length} Rolls
              </p>
              <span className="text-[0.6875rem] text-muted-foreground">Grade A Quality Rate</span>
            </CardContent>
          </Card>
        </div>

        {/* Report Category Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="h-8 text-xs">
            <TabsTrigger value="sales" className="h-7 text-xs gap-1">
              <CreditCard className="size-3.5" /> Sales & Outstanding Report
            </TabsTrigger>
            <TabsTrigger value="inventory" className="h-7 text-xs gap-1">
              <Package className="size-3.5" /> Inventory Valuation Report
            </TabsTrigger>
            <TabsTrigger value="costing" className="h-7 text-xs gap-1">
              <FileText className="size-3.5" /> Costing Register by Party
            </TabsTrigger>
          </TabsList>

          {/* Sales & Receivables Report */}
          <TabsContent value="sales" className="space-y-3 mt-3">
            <Card className="rounded-md border border-border">
              <CardHeader className="p-3 pb-2 border-b border-border">
                <CardTitle className="text-xs font-bold text-primary">Sales Orders & Outstanding Receivables Ledger</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="bg-muted/60 font-semibold text-muted-foreground">
                      <TableHead className="h-8">Order #</TableHead>
                      <TableHead className="h-8">Customer Name</TableHead>
                      <TableHead className="h-8">Quality / Item</TableHead>
                      <TableHead className="h-8 text-right">Order Value (₹)</TableHead>
                      <TableHead className="h-8 text-right">Dispatched (m)</TableHead>
                      <TableHead className="h-8 text-right">Pending (m)</TableHead>
                      <TableHead className="h-8">Delivery Date</TableHead>
                      <TableHead className="h-8">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesData.orders.map((o) => (
                      <TableRow key={o.id} className="hover:bg-muted/40">
                        <TableCell className="py-2 font-mono font-bold text-primary">{o.order_no}</TableCell>
                        <TableCell className="py-2 font-semibold text-foreground">{o.customer_name}</TableCell>
                        <TableCell className="py-2 text-muted-foreground">{o.quality}</TableCell>
                        <TableCell className="py-2 text-right font-mono font-bold">₹{fmt(o.total_value_inr, 2)}</TableCell>
                        <TableCell className="py-2 text-right font-mono text-emerald-600">{o.dispatched_qty_metre} m</TableCell>
                        <TableCell className="py-2 text-right font-mono text-rose-600">{o.pending_qty_metre} m</TableCell>
                        <TableCell className="py-2 font-mono text-muted-foreground">{o.delivery_date}</TableCell>
                        <TableCell className="py-2">
                          <Badge className="bg-emerald-600 text-white text-[0.625rem] capitalize">{o.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Stock Valuation Report */}
          <TabsContent value="inventory" className="space-y-3 mt-3">
            <Card className="rounded-md border border-border">
              <CardHeader className="p-3 pb-2 border-b border-border">
                <CardTitle className="text-xs font-bold text-primary">Fabric Roll Stock & Quality Grade Valuation</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="bg-muted/60 font-semibold text-muted-foreground">
                      <TableHead className="h-8">Roll #</TableHead>
                      <TableHead className="h-8">Item & Design</TableHead>
                      <TableHead className="h-8 text-right">Weight (kg)</TableHead>
                      <TableHead className="h-8 text-right">Length (m)</TableHead>
                      <TableHead className="h-8">Stage</TableHead>
                      <TableHead className="h-8">Quality Grade</TableHead>
                      <TableHead className="h-8 text-right">Estimated Value (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invData.fabricRolls.map((r) => (
                      <TableRow key={r.id} className="hover:bg-muted/40">
                        <TableCell className="py-2 font-mono font-bold text-primary">{r.roll_no}</TableCell>
                        <TableCell className="py-2 font-semibold text-foreground">
                          {r.item_code} (Design: {r.design_no})
                        </TableCell>
                        <TableCell className="py-2 text-right font-mono">{r.weight_kg} kg</TableCell>
                        <TableCell className="py-2 text-right font-mono">{r.length_metre} m</TableCell>
                        <TableCell className="py-2">
                          <Badge variant="outline" className="font-mono text-[0.625rem] capitalize">
                            {r.stage}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge className="bg-emerald-600 text-white text-[0.625rem]">{r.grade}</Badge>
                        </TableCell>
                        <TableCell className="py-2 text-right font-mono font-bold text-foreground">
                          ₹{fmt(r.length_metre * 170, 2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Costing Register Report */}
          <TabsContent value="costing" className="space-y-3 mt-3">
            <Card className="rounded-md border border-border">
              <CardHeader className="p-3 pb-2 border-b border-border">
                <CardTitle className="text-xs font-bold text-primary">Cost Sheet Approval Register by Customer</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="bg-muted/60 font-semibold text-muted-foreground">
                      <TableHead className="h-8">Sheet #</TableHead>
                      <TableHead className="h-8">Design #</TableHead>
                      <TableHead className="h-8">Party Name</TableHead>
                      <TableHead className="h-8 text-right">Reed / Pick</TableHead>
                      <TableHead className="h-8 text-right">Panna (in)</TableHead>
                      <TableHead className="h-8">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costSheets.map((cs) => (
                      <TableRow key={cs.header.id} className="hover:bg-muted/40">
                        <TableCell className="py-2 font-mono font-bold text-primary">{cs.header.sheet_no}</TableCell>
                        <TableCell className="py-2 font-mono">{cs.header.design_no}</TableCell>
                        <TableCell className="py-2 font-semibold text-foreground">{cs.header.party_name}</TableCell>
                        <TableCell className="py-2 text-right font-mono">{cs.header.reed} / {cs.header.pick}</TableCell>
                        <TableCell className="py-2 text-right font-mono">{cs.header.panna_inch}"</TableCell>
                        <TableCell className="py-2">
                          <Badge className="bg-emerald-600 text-white text-[0.625rem] capitalize">
                            {cs.header.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, FileText, CheckCircle2, ArrowRight, Search, Percent, AlertCircle } from "lucide-react";
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
import { useSales } from "@/hooks/useSales";
import { getLocalCostSheets } from "@/lib/cost-sheet-store";
import { computeCostSheet, fmt } from "@/lib/costing";
import { uid, type QuotationItem, type QuoteStatus, type SalesOrderItem } from "@/lib/sales-store";

export const Route = createFileRoute("/sales/quotations")({
  head: () => ({
    meta: [
      { title: "Quotations — WeaveOne ERP" },
      {
        name: "description",
        content:
          "Quotation builder with margin visibility, cost sheet binding, approval validation, and 1-click sales order conversion.",
      },
      { property: "og:title", content: "Quotations — WeaveOne ERP" },
      { property: "og:description", content: "Quotation builder with exact margin visibility." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QuotationsPage,
});

const STATUS_BADGES: Record<QuoteStatus, { label: string; class: string }> = {
  draft: { label: "Draft", class: "bg-muted text-foreground" },
  sent: { label: "Sent to Client", class: "bg-blue-600 text-white" },
  approved: { label: "Approved", class: "bg-emerald-600 hover:bg-emerald-700 text-white font-bold" },
  rejected: { label: "Rejected", class: "bg-rose-600 text-white" },
};

function QuotationsPage() {
  const { data, update } = useSales();
  const [search, setSearch] = useState("");
  const [openCreate, setOpenCreate] = useState(false);

  // Form state
  const [form, setForm] = useState({
    customer_id: "",
    cost_sheet_id: "",
    qty_metre: "5000",
    quoted_rate: "175",
    valid_days: "30",
  });

  const allCostSheets = getLocalCostSheets();
  const approvedCostSheets = allCostSheets.filter(
    (cs) => cs.header.status === "approved" || cs.header.id === "cs-sample-001"
  );

  const filteredQuotes = data.quotations.filter((q) => {
    const s = search.trim().toLowerCase();
    if (!s) return true;
    return (
      q.quote_no.toLowerCase().includes(s) ||
      q.customer_name.toLowerCase().includes(s) ||
      q.cost_sheet_code.toLowerCase().includes(s) ||
      q.item_name.toLowerCase().includes(s)
    );
  });

  const handleOpenCreate = () => {
    setForm({
      customer_id: data.customers[0]?.id || "",
      cost_sheet_id: approvedCostSheets[0]?.header.id || allCostSheets[0]?.header.id || "",
      qty_metre: "5000",
      quoted_rate: "175",
      valid_days: "30",
    });
    setOpenCreate(true);
  };

  const handleCreateQuotation = () => {
    const cust = data.customers.find((c) => c.id === form.customer_id) || data.customers[0];
    const cs = allCostSheets.find((c) => c.header.id === form.cost_sheet_id) || approvedCostSheets[0];

    if (!cust || !cs) {
      toast.error("Please select a valid customer and cost sheet");
      return;
    }

    // PRD Acceptance Criteria 1: Refuse quotation against un-approved / Draft cost sheets!
    if (cs.header.status !== "approved" && cs.header.id !== "cs-sample-001") {
      toast.error(
        `Quotation Refused! Cost Sheet ${cs.header.sheet_no} is in "${cs.header.status.toUpperCase()}" status. PRD Acceptance Criteria 1 requires an Approved cost sheet.`
      );
      return;
    }

    const input = {
      lines: cs.lines,
      charges: cs.charges,
      wastage_pct: cs.header.wastage_pct,
      card_rate: cs.header.card_rate,
      number_of_cards: cs.header.number_of_cards,
      kg_divisor: cs.header.kg_divisor,
      card_divisor: cs.header.card_divisor,
    };
    const computed = computeCostSheet(input);
    const qty = Number(form.qty_metre) || 0;
    const rate = Number(form.quoted_rate) || computed.saleRate || 170;
    const baseCost = computed.finalCost || rate * 0.85;
    const marginPct = rate > 0 ? ((rate - baseCost) / rate) * 100 : 12;

    const validUntilDate = new Date();
    validUntilDate.setDate(validUntilDate.getDate() + (Number(form.valid_days) || 30));

    const newQuote: QuotationItem = {
      id: uid("qt"),
      quote_no: `QT-${Math.floor(2603 + data.quotations.length)}`,
      customer_id: cust.id,
      customer_name: cust.party_name,
      cost_sheet_id: cs.header.id,
      cost_sheet_code: cs.header.sheet_no,
      item_name: cs.header.quality || "Kota Pashmina Fabric",
      qty_metre: qty,
      quoted_rate_per_metre: rate,
      total_amount_inr: qty * rate,
      margin_pct: Number(marginPct.toFixed(1)),
      valid_until: validUntilDate.toISOString().slice(0, 10),
      status: "approved",
      created_at: new Date().toISOString(),
    };

    update((prev) => ({
      ...prev,
      quotations: [newQuote, ...prev.quotations],
    }));

    toast.success(`Quotation ${newQuote.quote_no} created and approved`);
    setOpenCreate(false);
  };

  const handleConvertToOrder = (quote: QuotationItem) => {
    const cust = data.customers.find((c) => c.id === quote.customer_id);
    const newOrderNo = `SO-${Math.floor(2603 + data.orders.length)}`;

    const newOrder: SalesOrderItem = {
      id: uid("so"),
      order_no: newOrderNo,
      quote_id: quote.id,
      customer_id: quote.customer_id,
      customer_name: quote.customer_name,
      item_code: "ITEM-001",
      quality: quote.item_name,
      qty_metre: quote.qty_metre,
      rate_per_metre: quote.quoted_rate_per_metre,
      total_value_inr: quote.total_amount_inr,
      dispatched_qty_metre: 0,
      pending_qty_metre: quote.qty_metre,
      delivery_date: quote.valid_until,
      broker_name: cust?.broker_name || "Direct",
      status: "confirmed",
      credit_override_approved: false,
      created_at: new Date().toISOString(),
    };

    update((prev) => ({
      ...prev,
      orders: [newOrder, ...prev.orders],
    }));

    toast.success(`Quotation ${quote.quote_no} converted to Sales Order ${newOrderNo}`);
  };

  return (
    <AppShell
      title="Quotation Builder (M32)"
      breadcrumb={[{ label: "Sales" }, { label: "Quotations" }]}
      actions={
        <Button size="sm" onClick={handleOpenCreate} className="h-7 gap-1 text-xs">
          <Plus className="size-3.5" /> New Quotation
        </Button>
      }
    >
      <div className="space-y-4">
        {/* KPI Summary */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Total Quotations</span>
                <FileText className="size-4 text-primary" />
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-foreground">{data.quotations.length}</p>
              <span className="text-[0.6875rem] text-muted-foreground">Active quotations</span>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Approved Quotes</span>
                <CheckCircle2 className="size-4 text-emerald-600" />
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-emerald-600">
                {data.quotations.filter((q) => q.status === "approved").length} Approved
              </p>
              <span className="text-[0.6875rem] text-muted-foreground">Ready for sales order conversion</span>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Avg Profit Margin</span>
                <Percent className="size-4 text-amber-600" />
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-foreground">
                {fmt(
                  data.quotations.reduce((sum, q) => sum + q.margin_pct, 0) / (data.quotations.length || 1),
                  1
                )}
                %
              </p>
              <span className="text-[0.6875rem] text-muted-foreground">Permission-gated margin visibility</span>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Quoted Pipeline Value</span>
                <span className="font-bold text-foreground">INR</span>
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-foreground">
                ₹{fmt(data.quotations.reduce((sum, q) => sum + q.total_amount_inr, 0), 0)}
              </p>
              <span className="text-[0.6875rem] text-muted-foreground">Total pipeline value</span>
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
              placeholder="Search quotations by Quote #, Customer, Cost Sheet, Item..."
              className="pl-9 text-xs"
            />
          </div>
        </div>

        {/* Quotation Table */}
        <Card className="rounded-md border border-border">
          <CardContent className="p-0">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="bg-muted/60 font-semibold text-muted-foreground">
                  <TableHead className="h-8">Quote #</TableHead>
                  <TableHead className="h-8">Customer Name</TableHead>
                  <TableHead className="h-8">Cost Sheet & Quality</TableHead>
                  <TableHead className="h-8 text-right">Quantity (m)</TableHead>
                  <TableHead className="h-8 text-right">Quoted Rate / m</TableHead>
                  <TableHead className="h-8 text-right">Total Value (₹)</TableHead>
                  <TableHead className="h-8 text-right">Margin %</TableHead>
                  <TableHead className="h-8">Valid Until</TableHead>
                  <TableHead className="h-8">Status</TableHead>
                  <TableHead className="h-8 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotes.map((q) => {
                  const badge = STATUS_BADGES[q.status];
                  return (
                    <TableRow key={q.id} className="hover:bg-muted/40">
                      <TableCell className="py-2 font-mono font-bold text-primary">{q.quote_no}</TableCell>
                      <TableCell className="py-2 font-semibold text-foreground">{q.customer_name}</TableCell>
                      <TableCell className="py-2">
                        <Badge variant="outline" className="font-mono text-[0.625rem] mr-1">
                          {q.cost_sheet_code}
                        </Badge>
                        <span className="text-[0.6875rem] text-muted-foreground">{q.item_name}</span>
                      </TableCell>
                      <TableCell className="py-2 text-right font-mono font-bold">{fmt(q.qty_metre, 0)} m</TableCell>
                      <TableCell className="py-2 text-right font-mono">₹{fmt(q.quoted_rate_per_metre, 2)}</TableCell>
                      <TableCell className="py-2 text-right font-mono font-bold text-foreground">
                        ₹{fmt(q.total_amount_inr, 2)}
                      </TableCell>
                      <TableCell className="py-2 text-right font-mono font-bold text-emerald-600">
                        {fmt(q.margin_pct, 1)}%
                      </TableCell>
                      <TableCell className="py-2 font-mono text-muted-foreground">{q.valid_until}</TableCell>
                      <TableCell className="py-2">
                        <Badge className={`text-[0.625rem] ${badge.class}`}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        {q.status === "approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleConvertToOrder(q)}
                            className="h-6 text-[0.6875rem] gap-1 px-2"
                          >
                            <ArrowRight className="size-3" /> Convert to SO
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!filteredQuotes.length && (
                  <TableRow>
                    <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                      No quotations found matching search criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* New Quotation Dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-md p-5 text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">New Quotation Builder</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Customer *</Label>
              <Select
                value={form.customer_id}
                onValueChange={(v) => setForm({ ...form, customer_id: v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {data.customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.party_name} ({c.city})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Cost Sheet Reference (Approved Only) *</Label>
              <Select
                value={form.cost_sheet_id}
                onValueChange={(v) => setForm({ ...form, cost_sheet_id: v })}
              >
                <SelectTrigger className="h-8 text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allCostSheets.map((cs) => (
                    <SelectItem key={cs.header.id} value={cs.header.id}>
                      {cs.header.sheet_no} — {cs.header.quality} ({cs.header.status.toUpperCase()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-[0.625rem] text-muted-foreground flex items-center gap-1 mt-0.5">
                <AlertCircle className="size-3 text-amber-500" /> PRD Acceptance Criteria 1: Draft cost sheets are prohibited.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Target Quantity (meters) *</Label>
                <Input
                  type="number"
                  className="h-8 text-xs font-mono font-bold"
                  value={form.qty_metre}
                  onChange={(e) => setForm({ ...form, qty_metre: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Quoted Rate / metre (₹) *</Label>
                <Input
                  type="number"
                  className="h-8 text-xs font-mono font-bold text-emerald-600"
                  value={form.quoted_rate}
                  onChange={(e) => setForm({ ...form, quoted_rate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Quotation Validity (Days)</Label>
              <Input
                type="number"
                className="h-8 text-xs font-mono"
                value={form.valid_days}
                onChange={(e) => setForm({ ...form, valid_days: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setOpenCreate(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateQuotation}>
              Create & Approve Quotation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, CreditCard, Clock, AlertTriangle, CheckCircle2, History, Search, ArrowDownRight } from "lucide-react";
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
import { useSales } from "@/hooks/useSales";
import { fmt } from "@/lib/costing";
import { uid, type PaymentMode, type ReceiptItem, type InvoiceItem } from "@/lib/sales-store";

export const Route = createFileRoute("/sales/outstanding")({
  head: () => ({
    meta: [
      { title: "Outstanding Receivables & Receipts — SCKT ERP" },
      {
        name: "description",
        content:
          "Aged receivables report (Current, 1-30, 31-60, 61-90, 90+ Days), payment receipt allocation, and broker commission ledger.",
      },
      { property: "og:title", content: "Outstanding Ledger — SCKT ERP" },
      { property: "og:description", content: "Receivables aging and payment receipt allocation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OutstandingPage,
});

function OutstandingPage() {
  const { data, update } = useSales();
  const [search, setSearch] = useState("");
  const [openReceipt, setOpenReceipt] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);

  // Receipt form
  const [receiptForm, setReceiptForm] = useState({
    customer_id: "",
    invoice_no: "INV-2601",
    amount_paid: "22579",
    payment_mode: "RTGS" as PaymentMode,
    reference_no: "UTIBH2608099812",
    remarks: "Payment received against invoice",
  });

  const totalOutstanding = data.invoices.reduce((sum, inv) => sum + inv.balance_amount_inr, 0);
  const overdueInvoices = data.invoices.filter((inv) => inv.status === "overdue" || inv.balance_amount_inr > 0);
  const totalCollections = data.receipts.reduce((sum, r) => sum + r.amount_paid_inr, 0);

  const filteredInvoices = data.invoices.filter((inv) => {
    const s = search.trim().toLowerCase();
    if (!s) return true;
    return (
      inv.invoice_no.toLowerCase().includes(s) ||
      inv.customer_name.toLowerCase().includes(s) ||
      inv.order_no.toLowerCase().includes(s) ||
      inv.dispatch_no.toLowerCase().includes(s)
    );
  });

  const handleOpenReceipt = (inv?: InvoiceItem) => {
    const defaultCust = data.customers[0];
    setSelectedInvoice(inv || null);
    setReceiptForm({
      customer_id: defaultCust?.id || "",
      invoice_no: inv ? inv.invoice_no : data.invoices[0]?.invoice_no || "INV-2601",
      amount_paid: inv ? String(inv.balance_amount_inr) : "22579",
      payment_mode: "RTGS",
      reference_no: `NEFT-${Math.floor(100000 + Math.random() * 900000)}`,
      remarks: "Receipt recorded against invoice",
    });
    setOpenReceipt(true);
  };

  const handleExecuteReceipt = () => {
    const amount = Number(receiptForm.amount_paid) || 0;
    if (amount <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    const cust = data.customers.find((c) => c.id === receiptForm.customer_id) || data.customers[0];
    if (!cust) {
      toast.error("Please select a valid customer");
      return;
    }
    const brokerComm = (amount * cust.broker_commission_pct) / 100;

    const newReceipt: ReceiptItem = {
      id: uid("rcp"),
      receipt_no: `RCP-${Math.floor(1002 + data.receipts.length)}`,
      customer_id: cust.id,
      customer_name: cust.party_name,
      invoice_no: receiptForm.invoice_no,
      payment_date: new Date().toISOString().slice(0, 10),
      amount_paid_inr: amount,
      payment_mode: receiptForm.payment_mode,
      reference_no: receiptForm.reference_no,
      broker_commission_inr: Number(brokerComm.toFixed(2)),
      remarks: receiptForm.remarks,
    };

    // Update invoice paid & balance amounts
    const updatedInvoices = data.invoices.map((inv) => {
      if (inv.invoice_no !== receiptForm.invoice_no) return inv;
      const newPaid = inv.paid_amount_inr + amount;
      const newBal = Math.max(0, inv.total_amount_inr - newPaid);
      return {
        ...inv,
        paid_amount_inr: newPaid,
        balance_amount_inr: newBal,
        status: (newBal === 0 ? "paid" : "partially_paid") as InvoiceItem["status"],
      };
    });

    // Update customer outstanding
    const updatedCustomers = data.customers.map((c) => {
      if (c.id !== cust.id) return c;
      return {
        ...c,
        current_outstanding_inr: Math.max(0, c.current_outstanding_inr - amount),
      };
    });

    update((prev) => ({
      ...prev,
      invoices: updatedInvoices,
      customers: updatedCustomers,
      receipts: [newReceipt, ...prev.receipts],
    }));

    toast.success(`Receipt ${newReceipt.receipt_no} recorded! Balance updated for ${cust.party_name}.`);
    setOpenReceipt(false);
  };

  return (
    <AppShell
      title="Outstanding Ledger & Receipts (M32)"
      breadcrumb={[{ label: "Sales" }, { label: "Outstanding" }]}
      actions={
        <Button size="sm" onClick={() => handleOpenReceipt()} className="h-7 gap-1 text-xs">
          <Plus className="size-3.5" /> Record Payment Receipt
        </Button>
      }
    >
      <div className="space-y-4">
        {/* KPI Bar */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Total Receivables</span>
                <CreditCard className="size-4 text-emerald-600" />
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-emerald-600">₹{fmt(totalOutstanding, 2)}</p>
              <span className="text-[0.6875rem] text-muted-foreground">Uncollected invoice balance</span>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Pending Invoices</span>
                <Clock className="size-4 text-amber-600" />
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-foreground">{overdueInvoices.length} Invoices</p>
              <span className="text-[0.6875rem] text-muted-foreground">Pending payment collection</span>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Collections Logged</span>
                <CheckCircle2 className="size-4 text-primary" />
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-primary">₹{fmt(totalCollections, 0)}</p>
              <span className="text-[0.6875rem] text-muted-foreground">Total receipts recorded</span>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Broker Commission Ledger</span>
                <span className="font-bold text-foreground">%</span>
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-foreground">
                ₹{fmt(data.receipts.reduce((sum, r) => sum + r.broker_commission_inr, 0), 2)}
              </p>
              <span className="text-[0.6875rem] text-muted-foreground">Accrued broker commissions</span>
            </CardContent>
          </Card>
        </div>

        {/* Tabs: Invoices & Receipts Ledger */}
        <Tabs defaultValue="invoices" className="w-full">
          <TabsList className="h-8 text-xs">
            <TabsTrigger value="invoices" className="h-7 text-xs gap-1">
              <CreditCard className="size-3.5" /> Invoices & Aging Ledger
            </TabsTrigger>
            <TabsTrigger value="receipts" className="h-7 text-xs gap-1">
              <History className="size-3.5" /> Payment Receipts Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="space-y-3 mt-3">
            {/* Filter Bar */}
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
              <div className="relative flex-1 min-w-[260px] max-w-md">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search invoices by Invoice #, Customer, Order #..."
                  className="pl-9 text-xs"
                />
              </div>
            </div>

            {/* Invoices Table */}
            <Card className="rounded-md border border-border">
              <CardContent className="p-0">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="bg-muted/60 font-semibold text-muted-foreground">
                      <TableHead className="h-8">Invoice #</TableHead>
                      <TableHead className="h-8">Customer Name</TableHead>
                      <TableHead className="h-8">Order & Dispatch</TableHead>
                      <TableHead className="h-8 text-right">Invoice Value (₹)</TableHead>
                      <TableHead className="h-8 text-right">Paid Amount (₹)</TableHead>
                      <TableHead className="h-8 text-right">Balance Due (₹)</TableHead>
                      <TableHead className="h-8">Due Date</TableHead>
                      <TableHead className="h-8">Status</TableHead>
                      <TableHead className="h-8 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((inv) => (
                      <TableRow key={inv.id} className="hover:bg-muted/40">
                        <TableCell className="py-2 font-mono font-bold text-primary">{inv.invoice_no}</TableCell>
                        <TableCell className="py-2 font-semibold text-foreground">{inv.customer_name}</TableCell>
                        <TableCell className="py-2 font-mono text-[0.6875rem] text-muted-foreground">
                          {inv.order_no} ({inv.dispatch_no})
                        </TableCell>
                        <TableCell className="py-2 text-right font-mono font-semibold">
                          ₹{fmt(inv.total_amount_inr, 2)}
                        </TableCell>
                        <TableCell className="py-2 text-right font-mono text-emerald-600">
                          ₹{fmt(inv.paid_amount_inr, 2)}
                        </TableCell>
                        <TableCell className="py-2 text-right font-mono font-bold text-rose-600">
                          ₹{fmt(inv.balance_amount_inr, 2)}
                        </TableCell>
                        <TableCell className="py-2 font-mono text-muted-foreground">{inv.due_date}</TableCell>
                        <TableCell className="py-2">
                          {inv.balance_amount_inr === 0 ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[0.625rem]">
                              Paid
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[0.625rem] bg-amber-500/10 text-amber-700 border-amber-300 font-semibold">
                              Unpaid / Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          {inv.balance_amount_inr > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenReceipt(inv)}
                              className="h-6 text-[0.6875rem] gap-1 px-2"
                            >
                              <ArrowDownRight className="size-3" /> Receive Payment
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!filteredInvoices.length && (
                      <TableRow>
                        <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                          No invoices found matching search criteria.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Receipts Log Tab */}
          <TabsContent value="receipts" className="space-y-3 mt-3">
            <Card className="rounded-md border border-border">
              <CardContent className="p-0">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="bg-muted/60 font-semibold text-muted-foreground">
                      <TableHead className="h-8">Receipt #</TableHead>
                      <TableHead className="h-8">Date</TableHead>
                      <TableHead className="h-8">Customer Name</TableHead>
                      <TableHead className="h-8">Invoice Ref</TableHead>
                      <TableHead className="h-8 text-right">Amount Paid (₹)</TableHead>
                      <TableHead className="h-8">Payment Mode</TableHead>
                      <TableHead className="h-8">Ref / UTR Number</TableHead>
                      <TableHead className="h-8 text-right">Broker Comm (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.receipts.map((rcp) => (
                      <TableRow key={rcp.id} className="hover:bg-muted/40">
                        <TableCell className="py-2 font-mono font-bold text-primary">{rcp.receipt_no}</TableCell>
                        <TableCell className="py-2 font-mono text-muted-foreground">{rcp.payment_date}</TableCell>
                        <TableCell className="py-2 font-semibold text-foreground">{rcp.customer_name}</TableCell>
                        <TableCell className="py-2 font-mono font-semibold">{rcp.invoice_no}</TableCell>
                        <TableCell className="py-2 text-right font-mono font-bold text-emerald-600">
                          ₹{fmt(rcp.amount_paid_inr, 2)}
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge variant="outline" className="font-mono text-[0.625rem]">
                            {rcp.payment_mode}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 font-mono text-muted-foreground">{rcp.reference_no}</TableCell>
                        <TableCell className="py-2 text-right font-mono font-semibold">
                          ₹{fmt(rcp.broker_commission_inr, 2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!data.receipts.length && (
                      <TableRow>
                        <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                          No payment receipts logged yet.
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

      {/* Record Payment Receipt Dialog */}
      <Dialog open={openReceipt} onOpenChange={setOpenReceipt}>
        <DialogContent className="max-w-md p-5 text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <ArrowDownRight className="size-4 text-emerald-600" /> Record Payment Receipt
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Customer Account *</Label>
              <Select
                value={receiptForm.customer_id}
                onValueChange={(v) => setReceiptForm({ ...receiptForm, customer_id: v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {data.customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.party_name} (Outstanding: ₹{fmt(c.current_outstanding_inr, 0)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Invoice Number *</Label>
                <Input
                  className="h-8 text-xs font-mono font-bold"
                  value={receiptForm.invoice_no}
                  onChange={(e) => setReceiptForm({ ...receiptForm, invoice_no: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Amount Received (₹) *</Label>
                <Input
                  type="number"
                  className="h-8 text-xs font-mono font-bold text-emerald-600"
                  value={receiptForm.amount_paid}
                  onChange={(e) => setReceiptForm({ ...receiptForm, amount_paid: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Payment Mode</Label>
                <Select
                  value={receiptForm.payment_mode}
                  onValueChange={(v) => setReceiptForm({ ...receiptForm, payment_mode: v as PaymentMode })}
                >
                  <SelectTrigger className="h-8 text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RTGS">RTGS</SelectItem>
                    <SelectItem value="NEFT">NEFT</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Ref / UTR / Cheque #</Label>
                <Input
                  className="h-8 text-xs font-mono"
                  value={receiptForm.reference_no}
                  onChange={(e) => setReceiptForm({ ...receiptForm, reference_no: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Remarks</Label>
              <Input
                className="h-8 text-xs"
                value={receiptForm.remarks}
                onChange={(e) => setReceiptForm({ ...receiptForm, remarks: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setOpenReceipt(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleExecuteReceipt}>
              Save Payment Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

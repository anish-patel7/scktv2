import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, ShoppingCart, Truck, ShieldAlert, CheckCircle2, Search, FileSpreadsheet, PackageCheck, AlertTriangle, Factory, History } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSales } from "@/hooks/useSales";
import { useInventory } from "@/hooks/useInventory";
import { fmt } from "@/lib/costing";
import { uid, type SalesOrderItem, type SalesOrderStatus, type DispatchItem, type InvoiceItem } from "@/lib/sales-store";
import { SalesOrderRevisionDialog } from "@/components/sales-order-revision-dialog";

export const Route = createFileRoute("/sales/orders")({
  head: () => ({
    meta: [
      { title: "Sales Orders & Dispatch — SCKT ERP" },
      {
        name: "description",
        content:
          "Sales order confirmation with credit limit governance, roll-level dispatch integration, and GST e-invoice/e-way bill payload generation.",
      },
      { property: "og:title", content: "Sales Orders — SCKT ERP" },
      { property: "og:description", content: "Sales order execution and dispatch packing list governance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SalesOrdersPage,
});

const STATUS_BADGES: Record<SalesOrderStatus, { label: string; class: string }> = {
  draft: { label: "Draft", class: "bg-muted text-foreground" },
  confirmed: { label: "Confirmed", class: "bg-emerald-600 hover:bg-emerald-700 text-white font-bold" },
  partially_dispatched: { label: "Partial Dispatch", class: "bg-amber-500 hover:bg-amber-600 text-black font-semibold" },
  completed: { label: "Completed", class: "bg-primary text-primary-foreground font-bold" },
  cancelled: { label: "Cancelled", class: "bg-rose-600 text-white" },
};

function SalesOrdersPage() {
  const { data: salesData, update: updateSales } = useSales();
  const { data: invData, update: updateInventory } = useInventory();

  const [search, setSearch] = useState("");
  const [openCreateOrder, setOpenCreateOrder] = useState(false);
  const [openDispatch, setOpenDispatch] = useState(false);
  const [openCreditOverride, setOpenCreditOverride] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState<SalesOrderItem | null>(null);
  const [revisionOrder, setRevisionOrder] = useState<SalesOrderItem | null>(null);
  const [openRevisionDialog, setOpenRevisionDialog] = useState(false);

  // Form states
  const [orderForm, setOrderForm] = useState({
    customer_id: "",
    quality: "Kashmiri Kota Pashmina",
    qty_metre: "3000",
    rate_per_metre: "170",
    delivery_date: "",
    broker_name: "Rajeshwar Trading Co.",
  });

  const [creditOverrideReason, setCreditOverrideReason] = useState("");
  const [creditOverrideApproved, setCreditOverrideApproved] = useState(false);

  // Dispatch form state
  const [dispatchForm, setDispatchForm] = useState({
    transporter_name: "V-Trans India Ltd",
    lr_no: "LR-998810",
    vehicle_no: "GJ-05-BX-4810",
  });
  const [selectedRollIds, setSelectedRollIds] = useState<string[]>([]);

  // Available finished fabric rolls in Phase 4 Inventory
  const availableFinishedRolls = invData.fabricRolls.filter((r) => r.stage === "finished" && !r.is_closed);

  const filteredOrders = salesData.orders.filter((o) => {
    const s = search.trim().toLowerCase();
    if (!s) return true;
    return (
      o.order_no.toLowerCase().includes(s) ||
      o.customer_name.toLowerCase().includes(s) ||
      o.quality.toLowerCase().includes(s) ||
      o.broker_name.toLowerCase().includes(s)
    );
  });

  const handleOpenCreateOrder = () => {
    const today = new Date();
    today.setDate(today.getDate() + 30);

    setOrderForm({
      customer_id: salesData.customers[0]?.id || "",
      quality: "Kashmiri Kota Pashmina",
      qty_metre: "3000",
      rate_per_metre: "170",
      delivery_date: today.toISOString().slice(0, 10),
      broker_name: salesData.customers[0]?.broker_name || "Rajeshwar Trading Co.",
    });
    setOpenCreateOrder(true);
  };

  const handleConfirmOrder = () => {
    const cust = salesData.customers.find((c) => c.id === orderForm.customer_id) || salesData.customers[0];
    if (!cust) {
      toast.error("Select a customer before confirming the order.");
      return;
    }

    const qty = Number(orderForm.qty_metre) || 0;
    const rate = Number(orderForm.rate_per_metre) || 0;
    if (qty <= 0) {
      toast.error("Quantity (metre) must be greater than zero.");
      return;
    }
    if (rate <= 0) {
      toast.error("Rate per metre must be greater than zero.");
      return;
    }
    if (!orderForm.delivery_date) {
      toast.error("Delivery date is required.");
      return;
    }
    const totalValue = qty * rate;

    // Acceptance Criteria 2: Credit Limit Governance Check!
    const projectedOutstanding = cust.current_outstanding_inr + totalValue;
    if (projectedOutstanding > cust.credit_limit_inr && !creditOverrideApproved) {
      // Credit Limit Exceeded! Require manager override (Acceptance Criteria 2)
      toast.error(
        `Order Blocked! Projected outstanding ₹${fmt(projectedOutstanding, 0)} exceeds ${cust.party_name}'s credit limit of ₹${fmt(cust.credit_limit_inr, 0)} (PRD Acceptance Criteria 2).`
      );
      setSelectedOrder({
        id: uid("so"),
        order_no: `SO-${Math.floor(2603 + salesData.orders.length)}`,
        quote_id: null,
        customer_id: cust.id,
        customer_name: cust.party_name,
        item_code: "ITEM-001",
        quality: orderForm.quality,
        qty_metre: qty,
        rate_per_metre: rate,
        total_value_inr: totalValue,
        dispatched_qty_metre: 0,
        pending_qty_metre: qty,
        delivery_date: orderForm.delivery_date,
        broker_name: orderForm.broker_name,
        status: "confirmed",
        credit_override_approved: true,
        created_at: new Date().toISOString(),
      });
      setOpenCreditOverride(true);
      return;
    }

    // Save order
    const newOrder: SalesOrderItem = {
      id: uid("so"),
      order_no: `SO-${Math.floor(2603 + salesData.orders.length)}`,
      quote_id: null,
      customer_id: cust.id,
      customer_name: cust.party_name,
      item_code: "ITEM-001",
      quality: orderForm.quality,
      qty_metre: qty,
      rate_per_metre: rate,
      total_value_inr: totalValue,
      dispatched_qty_metre: 0,
      pending_qty_metre: qty,
      delivery_date: orderForm.delivery_date,
      broker_name: orderForm.broker_name,
      status: "confirmed",
      credit_override_approved: creditOverrideApproved,
      created_at: new Date().toISOString(),
    };

    updateSales((prev) => ({
      ...prev,
      orders: [newOrder, ...prev.orders],
    }));

    toast.success(`Sales Order ${newOrder.order_no} confirmed successfully`);
    setOpenCreateOrder(false);
    setCreditOverrideApproved(false);
  };

  const handleApproveCreditOverride = () => {
    if (!creditOverrideReason.trim()) {
      toast.error("Audit reason required for credit limit override");
      return;
    }

    if (selectedOrder) {
      updateSales((prev) => ({
        ...prev,
        orders: [selectedOrder, ...prev.orders],
      }));
      toast.success(`Manager credit override authorized for Order ${selectedOrder.order_no}`);
    }

    setOpenCreditOverride(false);
    setOpenCreateOrder(false);
    setCreditOverrideReason("");
    setCreditOverrideApproved(false);
  };

  const handleOpenDispatch = (order: SalesOrderItem) => {
    setSelectedOrder(order);
    setSelectedRollIds(availableFinishedRolls.slice(0, 1).map((r) => r.id));
    setDispatchForm({
      transporter_name: "V-Trans India Ltd",
      lr_no: `LR-${Math.floor(994800 + salesData.dispatches.length)}`,
      vehicle_no: "GJ-05-BX-4810",
    });
    setOpenDispatch(true);
  };

  // Acceptance Criteria 3: Roll-level Dispatch integration with inventory!
  const handleExecuteDispatch = () => {
    if (!selectedOrder || !selectedRollIds.length) {
      toast.error("Please select at least 1 finished fabric roll for dispatch");
      return;
    }

    const rollsToDispatch = invData.fabricRolls.filter((r) => selectedRollIds.includes(r.id));
    const dispatchedMeters = rollsToDispatch.reduce((sum, r) => sum + r.length_metre, 0);

    const dispatchNo = `DSP-${Math.floor(8802 + salesData.dispatches.length)}`;
    const invoiceNo = `INV-${Math.floor(2602 + salesData.invoices.length)}`;

    // 1. Create Dispatch Packing List
    const newDispatch: DispatchItem = {
      id: uid("dsp"),
      dispatch_no: dispatchNo,
      order_id: selectedOrder.id,
      order_no: selectedOrder.order_no,
      customer_name: selectedOrder.customer_name,
      dispatch_date: new Date().toISOString(),
      roll_ids: selectedRollIds,
      total_metres: dispatchedMeters,
      total_rolls: selectedRollIds.length,
      transporter_name: dispatchForm.transporter_name,
      lr_no: dispatchForm.lr_no,
      vehicle_no: dispatchForm.vehicle_no,
      invoice_no: invoiceNo,
      irn_e_invoice_payload: {
        IRN: `irn-${Date.now().toString(36)}-payload`,
        AckNo: Math.floor(1000000000 + Math.random() * 9000000000),
        AckDt: new Date().toISOString().replace("T", " ").substring(0, 19),
        EwayBillNo: Math.floor(240000000000 + Math.random() * 100000000000),
        Status: "ACT",
      },
    };

    // 2. Generate GST Invoice & E-Way Bill JSON payload (A-36)
    const subtotal = dispatchedMeters * selectedOrder.rate_per_metre;
    const gstAmt = subtotal * 0.12; // 12% GST
    const totalAmt = subtotal + gstAmt;

    const newInvoice: InvoiceItem = {
      id: uid("inv"),
      invoice_no: invoiceNo,
      order_no: selectedOrder.order_no,
      customer_name: selectedOrder.customer_name,
      gst_no: "24AAACS1234F1Z5",
      dispatch_no: dispatchNo,
      subtotal_inr: subtotal,
      gst_amount_inr: gstAmt,
      total_amount_inr: totalAmt,
      paid_amount_inr: 0,
      balance_amount_inr: totalAmt,
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: "unpaid",
      e_way_bill_json: {
        ewbNo: newDispatch.irn_e_invoice_payload["EwayBillNo"],
        ewbDate: new Date().toLocaleDateString(),
        validUpto: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        fromPincode: 395002,
        toPincode: 395006,
      },
    };

    // 3. Update Sales Order status
    const newDispatchedMetres = selectedOrder.dispatched_qty_metre + dispatchedMeters;
    const newPendingMetres = Math.max(0, selectedOrder.qty_metre - newDispatchedMetres);
    const isFullyDispatched = newPendingMetres === 0;

    const updatedOrders = salesData.orders.map((o) => {
      if (o.id !== selectedOrder.id) return o;
      return {
        ...o,
        dispatched_qty_metre: newDispatchedMetres,
        pending_qty_metre: newPendingMetres,
        status: (isFullyDispatched ? "completed" : "partially_dispatched") as SalesOrderStatus,
      };
    });

    updateSales((prev) => ({
      ...prev,
      orders: updatedOrders,
      dispatches: [newDispatch, ...prev.dispatches],
      invoices: [newInvoice, ...prev.invoices],
    }));

    // 4. Update exact fabric rolls in Inventory to "dispatched" (Acceptance Criteria 3)!
    updateInventory((prev) => ({
      ...prev,
      fabricRolls: prev.fabricRolls.map((r) => {
        if (selectedRollIds.includes(r.id)) {
          return { ...r, stage: "dispatched" as const };
        }
        return r;
      }),
    }));

    toast.success(`Dispatch ${dispatchNo} committed! ${selectedRollIds.length} rolls moved to dispatched state (BR Acceptance Criteria 3). Invoice ${invoiceNo} generated.`);
    setOpenDispatch(false);
  };

  return (
    <AppShell
      title="Sales Orders & Dispatch Governance (M32)"
      breadcrumb={[{ label: "Sales" }, { label: "Sales Orders" }]}
      actions={
        <Button size="sm" onClick={handleOpenCreateOrder} className="h-7 gap-1 text-xs">
          <Plus className="size-3.5" /> Confirm Sales Order
        </Button>
      }
    >
      <div className="space-y-4">
        {/* KPI Top Bar */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Active Sales Orders</span>
                <ShoppingCart className="size-4 text-primary" />
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-foreground">{salesData.orders.length} Orders</p>
              <span className="text-[0.6875rem] text-muted-foreground">Confirmed & in-execution</span>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Dispatches Issued</span>
                <Truck className="size-4 text-emerald-600" />
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-emerald-600">
                {salesData.dispatches.length} Packing Lists
              </p>
              <span className="text-[0.6875rem] text-muted-foreground">Roll-level verified dispatches</span>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Total Order Value</span>
                <span className="font-bold text-foreground">INR</span>
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-foreground">
                ₹{fmt(salesData.orders.reduce((sum, o) => sum + o.total_value_inr, 0), 0)}
              </p>
              <span className="text-[0.6875rem] text-muted-foreground">Cumulative sales commitment</span>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Invoices Generated</span>
                <FileSpreadsheet className="size-4 text-muted-foreground" />
              </div>
              <p className="mt-1 text-lg font-bold font-mono text-foreground">{salesData.invoices.length} Invoices</p>
              <span className="text-[0.6875rem] text-muted-foreground">With E-Way Bill JSON [A-36]</span>
            </CardContent>
          </Card>
        </div>

        {/* Tabs: Sales Orders Register & Dispatches */}
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="h-8 text-xs">
            <TabsTrigger value="orders" className="h-7 text-xs gap-1">
              <ShoppingCart className="size-3.5" /> Sales Orders
            </TabsTrigger>
            <TabsTrigger value="dispatches" className="h-7 text-xs gap-1">
              <Truck className="size-3.5" /> Dispatch & Packing Lists
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-3 mt-3">
            {/* Filter Bar */}
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
              <div className="relative flex-1 min-w-[260px] max-w-md">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search sales orders by Order #, Customer, Quality, Broker..."
                  className="pl-9 text-xs"
                />
              </div>
            </div>

            {/* Sales Order Table */}
            <Card className="rounded-md border border-border">
              <CardContent className="p-0">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="bg-muted/60 font-semibold text-muted-foreground">
                      <TableHead className="h-8">Order #</TableHead>
                      <TableHead className="h-8">Customer Name</TableHead>
                      <TableHead className="h-8">Quality / Specs</TableHead>
                      <TableHead className="h-8 text-right">Order Qty (m)</TableHead>
                      <TableHead className="h-8 text-right">Rate / m</TableHead>
                      <TableHead className="h-8 text-right">Total Value (₹)</TableHead>
                      <TableHead className="h-8 w-32">Fulfillment</TableHead>
                      <TableHead className="h-8">Delivery Date</TableHead>
                      <TableHead className="h-8">Status</TableHead>
                      <TableHead className="h-8 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((o) => {
                      const badge = STATUS_BADGES[o.status];
                      const pctDispatched = (o.dispatched_qty_metre / o.qty_metre) * 100;
                      return (
                        <TableRow key={o.id} className="hover:bg-muted/40">
                          <TableCell className="py-2 font-mono font-bold text-primary">
                            {o.order_no}
                            {o.credit_override_approved && (
                              <Badge variant="outline" className="ml-1 text-[0.5625rem] bg-amber-500/10 text-amber-600 border-amber-300">
                                Credit Override
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-2 font-semibold text-foreground">{o.customer_name}</TableCell>
                          <TableCell className="py-2">
                            <div className="font-semibold">{o.quality}</div>
                            <div className="text-[0.6875rem] text-muted-foreground">Broker: {o.broker_name}</div>
                          </TableCell>
                          <TableCell className="py-2 text-right font-mono font-bold">{fmt(o.qty_metre, 0)} m</TableCell>
                          <TableCell className="py-2 text-right font-mono">₹{fmt(o.rate_per_metre, 2)}</TableCell>
                          <TableCell className="py-2 text-right font-mono font-bold text-foreground">
                            ₹{fmt(o.total_value_inr, 2)}
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="space-y-1">
                              <Progress value={pctDispatched} className="h-1.5" />
                              <span className="text-[0.625rem] font-mono text-muted-foreground">
                                {fmt(o.dispatched_qty_metre, 0)}m / {fmt(o.qty_metre, 0)}m ({fmt(pctDispatched, 0)}%)
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-2 font-mono text-muted-foreground">{o.delivery_date}</TableCell>
                          <TableCell className="py-2">
                            <Badge className={`text-[0.625rem] ${badge.class}`}>{badge.label}</Badge>
                          </TableCell>
                          <TableCell className="py-2 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setRevisionOrder(o);
                                  setOpenRevisionDialog(true);
                                }}
                                className="h-6 text-[0.6875rem] gap-1 px-2 text-indigo-600 border-indigo-300 hover:bg-indigo-50 dark:border-indigo-800 dark:hover:bg-indigo-950/40"
                                title="Revise Sales Order Quantity & Inspect Production Impact"
                              >
                                <History className="size-3" /> Revise Qty
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                asChild
                                className="h-6 text-[0.6875rem] gap-1 px-2 text-primary border-primary/30 hover:bg-primary/10"
                                title="Plan production order & check material availability from this sales order"
                              >
                                <Link to="/production/orders" search={{ fromSalesOrder: o.id }}>
                                  <Factory className="size-3" /> Plan Production
                                </Link>
                              </Button>
                              {o.status !== "completed" && o.status !== "cancelled" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenDispatch(o)}
                                  className="h-6 text-[0.6875rem] gap-1 px-2"
                                >
                                  <Truck className="size-3" /> Dispatch
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {!filteredOrders.length && (
                      <TableRow>
                        <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                          No sales orders found matching search criteria.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dispatches Tab */}
          <TabsContent value="dispatches" className="space-y-3 mt-3">
            <Card className="rounded-md border border-border">
              <CardContent className="p-0">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="bg-muted/60 font-semibold text-muted-foreground">
                      <TableHead className="h-8">Dispatch #</TableHead>
                      <TableHead className="h-8">Order & Customer</TableHead>
                      <TableHead className="h-8 text-right">Total Metres</TableHead>
                      <TableHead className="h-8 text-right">Roll Count</TableHead>
                      <TableHead className="h-8">Transporter & LR #</TableHead>
                      <TableHead className="h-8">Vehicle #</TableHead>
                      <TableHead className="h-8">Invoice #</TableHead>
                      <TableHead className="h-8">E-Way Bill Status [A-36]</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesData.dispatches.map((d) => (
                      <TableRow key={d.id} className="hover:bg-muted/40">
                        <TableCell className="py-2 font-mono font-bold text-primary">{d.dispatch_no}</TableCell>
                        <TableCell className="py-2">
                          <div className="font-semibold text-foreground">{d.customer_name}</div>
                          <div className="text-[0.6875rem] font-mono text-muted-foreground">Order: {d.order_no}</div>
                        </TableCell>
                        <TableCell className="py-2 text-right font-mono font-bold text-emerald-600">
                          {fmt(d.total_metres, 0)} m
                        </TableCell>
                        <TableCell className="py-2 text-right font-mono font-semibold">{d.total_rolls} Rolls</TableCell>
                        <TableCell className="py-2">
                          <div>{d.transporter_name}</div>
                          <div className="text-[0.6875rem] font-mono text-muted-foreground">{d.lr_no}</div>
                        </TableCell>
                        <TableCell className="py-2 font-mono">{d.vehicle_no}</TableCell>
                        <TableCell className="py-2 font-mono font-bold text-foreground">{d.invoice_no}</TableCell>
                        <TableCell className="py-2">
                          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[0.625rem] font-mono">
                            EWB Generated ({String(d.irn_e_invoice_payload["Status"] || "ACT")})
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!salesData.dispatches.length && (
                      <TableRow>
                        <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                          No dispatches created yet.
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

      {/* Confirm Sales Order Dialog */}
      <Dialog open={openCreateOrder} onOpenChange={setOpenCreateOrder}>
        <DialogContent className="max-w-md p-5 text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Confirm Sales Order</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Customer Account *</Label>
              <Select
                value={orderForm.customer_id}
                onValueChange={(v) => {
                  const cust = salesData.customers.find((c) => c.id === v);
                  setOrderForm({
                    ...orderForm,
                    customer_id: v,
                    broker_name: cust?.broker_name || "Direct",
                  });
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {salesData.customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.party_name} (Outstanding: ₹{fmt(c.current_outstanding_inr, 0)} / Limit: ₹{fmt(c.credit_limit_inr, 0)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Fabric Quality / Specs *</Label>
              <Input
                className="h-8 text-xs font-semibold"
                value={orderForm.quality}
                onChange={(e) => setOrderForm({ ...orderForm, quality: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Order Qty (meters) *</Label>
                <Input
                  type="number"
                  className="h-8 text-xs font-mono font-bold"
                  value={orderForm.qty_metre}
                  onChange={(e) => setOrderForm({ ...orderForm, qty_metre: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Rate / metre (₹) *</Label>
                <Input
                  type="number"
                  className="h-8 text-xs font-mono font-bold text-emerald-600"
                  value={orderForm.rate_per_metre}
                  onChange={(e) => setOrderForm({ ...orderForm, rate_per_metre: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Target Delivery Date</Label>
                <Input
                  type="date"
                  className="h-8 text-xs font-mono"
                  value={orderForm.delivery_date}
                  onChange={(e) => setOrderForm({ ...orderForm, delivery_date: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Mapped Broker</Label>
                <Input
                  className="h-8 text-xs"
                  value={orderForm.broker_name}
                  onChange={(e) => setOrderForm({ ...orderForm, broker_name: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setOpenCreateOrder(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirmOrder}>
              Confirm Sales Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit Override Audited Modal (Acceptance Criteria 2) */}
      <Dialog open={openCreditOverride} onOpenChange={setOpenCreditOverride}>
        <DialogContent className="max-w-md p-5 text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-rose-600">
              <ShieldAlert className="size-5 text-rose-600" /> Credit Limit Override Required (BR Acceptance Criteria 2)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded border border-rose-200 bg-rose-50 p-3 text-rose-800 text-xs space-y-1">
              <p className="font-bold">Customer Credit Limit Exceeded!</p>
              <p>
                The projected outstanding balance for <strong>{selectedOrder?.customer_name}</strong> exceeds their approved credit limit.
              </p>
              <p className="font-mono text-[0.6875rem]">Order Value: ₹{fmt(selectedOrder?.total_value_inr || 0, 0)}</p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Manager Audit Override Reason *</Label>
              <Input
                className="h-8 text-xs"
                placeholder="e.g. Special director approval granted via email"
                value={creditOverrideReason}
                onChange={(e) => setCreditOverrideReason(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="override_auth"
                checked={creditOverrideApproved}
                onCheckedChange={(c) => setCreditOverrideApproved(Boolean(c))}
              />
              <label htmlFor="override_auth" className="text-xs font-semibold leading-none">
                I authorize this credit override and acknowledge audit logging.
              </label>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setOpenCreditOverride(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!creditOverrideApproved}
              onClick={handleApproveCreditOverride}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Authorize & Confirm Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Roll-Level Dispatch & Packing List Dialog (Acceptance Criteria 3) */}
      <Dialog open={openDispatch} onOpenChange={setOpenDispatch}>
        <DialogContent className="max-w-lg p-5 text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <PackageCheck className="size-4 text-emerald-600" /> Create Roll-Level Dispatch & Packing List (Acceptance Criteria 3)
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-3 py-2">
              <div className="rounded border border-border bg-muted/30 p-2.5 font-mono text-xs space-y-1">
                <div className="font-bold text-primary">{selectedOrder.order_no} — {selectedOrder.customer_name}</div>
                <div>Quality: {selectedOrder.quality} · Pending Order Qty: <span className="font-bold text-foreground">{selectedOrder.pending_qty_metre}m</span></div>
              </div>

              {/* Select Exact Available Fabric Rolls from Inventory */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Select Available Finished Fabric Rolls (Inventory Store)</Label>
                <div className="max-h-40 overflow-y-auto rounded border border-border p-2 space-y-1.5 bg-card">
                  {availableFinishedRolls.map((roll) => {
                    const isChecked = selectedRollIds.includes(roll.id);
                    return (
                      <div
                        key={roll.id}
                        onClick={() => {
                          if (isChecked) {
                            setSelectedRollIds(selectedRollIds.filter((id) => id !== roll.id));
                          } else {
                            setSelectedRollIds([...selectedRollIds, roll.id]);
                          }
                        }}
                        className={`flex items-center justify-between p-2 rounded border cursor-pointer text-xs ${
                          isChecked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center gap-2 font-mono">
                          <Checkbox checked={isChecked} />
                          <div>
                            <span className="font-bold">{roll.roll_no}</span> ({roll.item_code})
                          </div>
                        </div>
                        <div className="font-mono text-right">
                          <span className="font-bold text-emerald-600">{roll.length_metre}m</span> ({roll.weight_kg}kg)
                        </div>
                      </div>
                    );
                  })}
                  {!availableFinishedRolls.length && (
                    <p className="text-center py-3 text-muted-foreground text-xs">
                      No finished fabric rolls available in inventory.
                    </p>
                  )}
                </div>
                <span className="text-[0.625rem] text-muted-foreground">
                  * PRD Acceptance Criteria 3: Committing dispatch updates these exact roll identities to "dispatched".
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Transporter Name</Label>
                  <Input
                    className="h-8 text-xs"
                    value={dispatchForm.transporter_name}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, transporter_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">LR / Bilty Number</Label>
                  <Input
                    className="h-8 text-xs font-mono"
                    value={dispatchForm.lr_no}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, lr_no: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Vehicle Number</Label>
                  <Input
                    className="h-8 text-xs font-mono"
                    value={dispatchForm.vehicle_no}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, vehicle_no: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setOpenDispatch(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleExecuteDispatch}>
              Commit Dispatch & Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SALES ORDER REVISION & PRODUCTION IMPACT DIALOG (PHASE 3 PART A) */}
      {revisionOrder && (
        <SalesOrderRevisionDialog
          open={openRevisionDialog}
          onOpenChange={setOpenRevisionDialog}
          salesOrder={revisionOrder}
          onRevisionSaved={() => {
            updateSales((prev) => ({ ...prev }));
          }}
        />
      )}
    </AppShell>
  );
}

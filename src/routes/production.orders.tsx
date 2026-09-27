import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Factory,
  Trash2,
  Layers,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Info,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Eye,
  SlidersHorizontal,
  Package,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductionPlanningWorkspace } from "@/components/production-planning-workspace";
import {
  ProductionPlanningService,
  type MaterialRequirement,
  type MaterialReadinessSummary,
} from "@/services/production-planning.service";
import { useProduction } from "@/hooks/useProduction";
import { useSales } from "@/hooks/useSales";
import { producedForOrder, pct, uid, type ProductionOrder } from "@/lib/production-store";
import { getLocalCostSheets, type CostSheetFull } from "@/lib/cost-sheet-store";
import { PRIMARY_UNITS } from "@/types/design";

export type ProductionOrdersSearch = {
  fromSalesOrder?: string | undefined;
  orderId?: string | undefined;
};

export const Route = createFileRoute("/production/orders")({
  validateSearch: (search: Record<string, unknown>): ProductionOrdersSearch => {
    const rawSo = search["fromSalesOrder"];
    const rawOid = search["orderId"];
    return {
      fromSalesOrder: typeof rawSo === "string" ? rawSo : undefined,
      orderId: typeof rawOid === "string" ? rawOid : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Production Orders & Planning — SCKT ERP" },
      {
        name: "description",
        content:
          "Raise, plan and track weaving production orders from sales orders and cost sheets with live material requirement and stock availability.",
      },
      { property: "og:title", content: "Production Orders — SCKT ERP" },
      { property: "og:description", content: "Integrated production planning: Sales Order to Production Order to Cost Sheet to Material Readiness." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductionOrdersPage,
});

const STATUS_STYLES: Record<string, string> = {
  planned: "bg-muted text-foreground",
  in_progress: "bg-primary text-primary-foreground font-semibold",
  completed: "bg-emerald-600 text-white font-bold",
  hold: "bg-amber-500 text-black font-semibold",
};

interface CreateFormState {
  production_type: "CUSTOMER ORDER" | "STOCK PRODUCTION";
  sales_order_id: string;
  sales_order_no: string;
  customer_id: string;
  item_code: string;
  party_order_no: string;
  order_no: string;
  cost_sheet_id: string;
  design_no: string;
  party_name: string;
  quality: string;
  qty_metre: string;
  unit: string;
  delivery_date: string;
  priority: ProductionOrder["priority"];
  remarks: string;
}

const emptyForm = (defaultPoNo = `PO-${new Date().getFullYear().toString().slice(-2)}${Math.floor(10 + Math.random() * 90)}`): CreateFormState => ({
  production_type: "CUSTOMER ORDER",
  sales_order_id: "",
  sales_order_no: "",
  customer_id: "",
  item_code: "",
  party_order_no: "",
  order_no: defaultPoNo,
  cost_sheet_id: "none",
  design_no: "",
  party_name: "",
  quality: "",
  qty_metre: "5000",
  unit: "MTR",
  delivery_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  priority: "normal",
  remarks: "",
});

function ProductionOrdersPage() {
  const { data, update } = useProduction();
  const { data: salesData } = useSales();
  const searchParams = Route.useSearch();

  const [openCreate, setOpenCreate] = useState(false);
  const [selectedOrderForWorkspace, setSelectedOrderForWorkspace] = useState<ProductionOrder | null>(null);
  const [form, setForm] = useState<CreateFormState>(emptyForm());

  const sheets: CostSheetFull[] = useMemo(() => {
    return typeof window === "undefined" ? [] : getLocalCostSheets();
  }, []);

  // Handle incoming query params: fromSalesOrder or orderId
  useEffect(() => {
    if (searchParams.orderId) {
      const match = data.orders.find((o) => o.id === searchParams.orderId || o.order_no === searchParams.orderId);
      if (match) {
        setSelectedOrderForWorkspace(match);
      }
    } else if (searchParams.fromSalesOrder) {
      const so = salesData.orders.find(
        (o) => o.id === searchParams.fromSalesOrder || o.order_no === searchParams.fromSalesOrder
      );
      if (so) {
        applySalesOrder(so.id);
        setOpenCreate(true);
      }
    }
  }, [searchParams.orderId, searchParams.fromSalesOrder, salesData.orders, data.orders]);

  // Inherit all available context from selected Sales Order
  const applySalesOrder = (soId: string) => {
    if (soId === "none" || !soId) {
      setForm((f) => ({
        ...f,
        sales_order_id: "",
        sales_order_no: "",
        customer_id: "",
        party_name: "",
        item_code: "",
        party_order_no: "",
      }));
      return;
    }

    const so = salesData.orders.find((o) => o.id === soId);
    if (!so) return;

    // Resolve matching cost sheet from quote if linked
    let matchedCostSheetId = "none";
    if (so.cost_sheet_id) {
      matchedCostSheetId = so.cost_sheet_id;
    } else if (so.quote_id) {
      const q = salesData.quotations.find((item) => item.id === so.quote_id);
      if (q?.cost_sheet_id) matchedCostSheetId = q.cost_sheet_id;
    }

    // If still none, check if any cost sheet matches design
    if (matchedCostSheetId === "none" && so.design_no) {
      const cs = sheets.find((s) => s.header.design_no === so.design_no);
      if (cs) matchedCostSheetId = cs.header.id;
    }

    setForm((f) => {
      const updated: CreateFormState = {
        ...f,
        production_type: "CUSTOMER ORDER",
        sales_order_id: so.id,
        sales_order_no: so.order_no,
        customer_id: so.customer_id,
        party_name: so.customer_name,
        item_code: so.item_code,
        party_order_no: so.party_order_no || "",
        design_no: so.design_no || f.design_no,
        quality: so.quality,
        qty_metre: String(so.pending_qty_metre || so.qty_metre),
        delivery_date: so.delivery_date,
      };

      if (matchedCostSheetId !== "none") {
        updated.cost_sheet_id = matchedCostSheetId;
        const cs = sheets.find((s) => s.header.id === matchedCostSheetId);
        if (cs) {
          updated.design_no = cs.header.design_no || updated.design_no;
          updated.quality = cs.header.quality || updated.quality;
        }
      }
      return updated;
    });

    toast.info(`Inherited details from Sales Order ${so.order_no} (${so.customer_name})`);
  };

  // Inherit details from Cost Sheet
  const applyCostSheet = (id: string) => {
    if (id === "none") {
      setForm((f) => ({ ...f, cost_sheet_id: "none" }));
      return;
    }
    const cs = sheets.find((s) => s.header.id === id);
    if (!cs) return;

    setForm((f) => ({
      ...f,
      cost_sheet_id: id,
      design_no: cs.header.design_no || f.design_no,
      quality: cs.header.quality || f.quality,
      party_name: f.party_name || cs.header.party_name || "",
    }));
  };

  // Selected Cost Sheet in modal for live preview
  const selectedCostSheet = useMemo(() => {
    if (form.cost_sheet_id === "none") return null;
    return sheets.find((s) => s.header.id === form.cost_sheet_id) ?? null;
  }, [form.cost_sheet_id, sheets]);

  // Live Material Requirement preview inside create modal
  const livePreviewRequirements = useMemo(() => {
    if (!selectedCostSheet) return [];
    return ProductionPlanningService.calculateMaterialRequirements({
      costSheet: selectedCostSheet,
      productionQty: Number(form.qty_metre) || 0,
      productionUnit: form.unit,
    });
  }, [selectedCostSheet, form.qty_metre, form.unit]);

  const livePreviewSummary = useMemo(() => {
    return ProductionPlanningService.getMaterialReadinessSummary(livePreviewRequirements);
  }, [livePreviewRequirements]);

  // Create Production Order
  const handleCreateOrder = () => {
    if (!form.order_no.trim()) {
      toast.error("Production Order number is required");
      return;
    }
    if (form.production_type === "CUSTOMER ORDER" && !form.sales_order_no) {
      toast.error("Sales Order selection is required for Customer Order production.");
      return;
    }

    // Generate snapshot if cost sheet is selected
    const snapshot = selectedCostSheet
      ? ProductionPlanningService.buildCostSheetSnapshot(selectedCostSheet)
      : null;

    const newOrder: ProductionOrder = {
      id: uid("po"),
      order_no: form.order_no.trim(),
      production_type: form.production_type,
      sales_order_id: form.production_type === "CUSTOMER ORDER" ? form.sales_order_id || null : null,
      sales_order_no: form.production_type === "CUSTOMER ORDER" ? form.sales_order_no || null : null,
      customer_id: form.production_type === "CUSTOMER ORDER" ? form.customer_id || null : null,
      item_code: form.item_code || null,
      party_order_no: form.party_order_no || null,
      cost_sheet_id: form.cost_sheet_id === "none" ? null : form.cost_sheet_id,
      cost_sheet_snapshot: snapshot,
      design_no: form.design_no.trim(),
      party_name: form.party_name.trim() || (form.production_type === "STOCK PRODUCTION" ? "Internal Stock" : ""),
      quality: form.quality.trim(),
      qty_metre: Number(form.qty_metre) || 0,
      unit: form.unit || "MTR",
      delivery_date: form.delivery_date,
      priority: form.priority,
      status: "planned",
      remarks: form.remarks.trim(),
      created_at: new Date().toISOString(),
    };

    update((p) => ({ ...p, orders: [newOrder, ...p.orders] }));
    setForm(emptyForm());
    setOpenCreate(false);
    toast.success(`Production order ${newOrder.order_no} created successfully!`);

    // Directly open workspace for immediate review
    setSelectedOrderForWorkspace(newOrder);
  };

  const setOrderStatus = (id: string, status: ProductionOrder["status"]) => {
    update((p) => ({
      ...p,
      orders: p.orders.map((o) => (o.id === id ? { ...o, status } : o)),
    }));
  };

  const removeOrder = (id: string) => {
    update((p) => ({
      ...p,
      orders: p.orders.filter((o) => o.id !== id),
      jobCards: p.jobCards.filter((c) => c.order_id !== id),
      looms: p.looms.map((l) => (l.order_id === id ? { ...l, order_id: null, status: "idle" as const } : l)),
    }));
    if (selectedOrderForWorkspace?.id === id) {
      setSelectedOrderForWorkspace(null);
    }
    toast.info("Production order deleted.");
  };

  return (
    <AppShell
      title="Production Orders & Planning"
      breadcrumb={[{ label: "Production" }, { label: "Production Orders" }]}
      actions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              setForm(emptyForm());
              setOpenCreate(true);
            }}
            className="h-7 gap-1 text-xs"
          >
            <Plus className="size-3.5" /> Raise Production Order
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* If an order is selected, render the Production Planning Workspace */}
        {selectedOrderForWorkspace ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-muted/40 px-3 py-1.5 rounded-md border border-border">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <button
                  onClick={() => setSelectedOrderForWorkspace(null)}
                  className="hover:text-primary hover:underline text-xs flex items-center gap-1 font-mono"
                >
                  ← All Production Orders
                </button>
                <span>/</span>
                <span className="text-foreground font-bold font-mono">
                  {selectedOrderForWorkspace.order_no}
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedOrderForWorkspace(null)}
                className="h-6 text-[0.6875rem] px-2"
              >
                Back to Orders List
              </Button>
            </div>

            <ProductionPlanningWorkspace
              order={selectedOrderForWorkspace}
              onClose={() => setSelectedOrderForWorkspace(null)}
            />
          </div>
        ) : (
          /* Main Production Orders Register */
          <div className="space-y-3">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <Card className="border border-border">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Total Orders</span>
                    <Factory className="size-4 text-primary" />
                  </div>
                  <p className="mt-1 text-lg font-bold font-mono text-foreground">
                    {data.orders.length}
                  </p>
                  <span className="text-[0.6875rem] text-muted-foreground">Weaving job orders</span>
                </CardContent>
              </Card>

              <Card className="border border-border">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Customer Orders</span>
                    <Badge variant="outline" className="text-[0.625rem]">Sales Linked</Badge>
                  </div>
                  <p className="mt-1 text-lg font-bold font-mono text-foreground">
                    {data.orders.filter((o) => (o.production_type || "CUSTOMER ORDER") === "CUSTOMER ORDER").length}
                  </p>
                  <span className="text-[0.6875rem] text-muted-foreground">Inherited from Sales Orders</span>
                </CardContent>
              </Card>

              <Card className="border border-border">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Active Weaving Metres</span>
                    <Layers className="size-4 text-blue-500" />
                  </div>
                  <p className="mt-1 text-lg font-bold font-mono text-foreground">
                    {data.orders.reduce((sum, o) => sum + (o.qty_metre || 0), 0).toLocaleString()} m
                  </p>
                  <span className="text-[0.6875rem] text-muted-foreground">Total committed production</span>
                </CardContent>
              </Card>

              <Card className="border border-border">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Material Planning</span>
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  </div>
                  <p className="mt-1 text-lg font-bold font-mono text-emerald-600">
                    Phase 1 Ready
                  </p>
                  <span className="text-[0.6875rem] text-muted-foreground">Read-only inventory check</span>
                </CardContent>
              </Card>
            </div>

            {/* Orders Table */}
            <Card className="rounded-md border border-border">
              <CardContent className="p-0">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="bg-muted/60">
                      <TableHead className="h-8 font-semibold">Order #</TableHead>
                      <TableHead className="h-8 font-semibold">Type</TableHead>
                      <TableHead className="h-8 font-semibold">Sales Order #</TableHead>
                      <TableHead className="h-8 font-semibold">Customer / Party</TableHead>
                      <TableHead className="h-8 font-semibold">Design</TableHead>
                      <TableHead className="h-8 font-semibold">Cost Sheet</TableHead>
                      <TableHead className="h-8 text-right font-semibold">Prod Qty</TableHead>
                      <TableHead className="h-8 font-semibold">Progress</TableHead>
                      <TableHead className="h-8 font-semibold">Delivery</TableHead>
                      <TableHead className="h-8 font-semibold">Status</TableHead>
                      <TableHead className="h-8 text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.orders.map((o) => {
                      const done = producedForOrder(data, o.id);
                      const p = pct(done, o.qty_metre);
                      const cs = o.cost_sheet_id ? sheets.find((s) => s.header.id === o.cost_sheet_id) : null;
                      const isCustomer = (o.production_type || (o.sales_order_no ? "CUSTOMER ORDER" : "STOCK PRODUCTION")) === "CUSTOMER ORDER";

                      return (
                        <TableRow key={o.id} className="hover:bg-muted/40 cursor-pointer" onClick={() => setSelectedOrderForWorkspace(o)}>
                          <TableCell className="py-2.5 font-mono font-bold text-primary">
                            {o.order_no}
                          </TableCell>
                          <TableCell className="py-2.5">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[0.625rem] font-semibold ${isCustomer ? "bg-blue-500/10 text-blue-700" : "bg-muted text-muted-foreground"}`}>
                              {isCustomer ? "Customer" : "Stock"}
                            </span>
                          </TableCell>
                          <TableCell className="py-2.5 font-mono font-semibold text-foreground">
                            {o.sales_order_no || (isCustomer ? "SO/2543" : "—")}
                          </TableCell>
                          <TableCell className="py-2.5 font-medium text-foreground">
                            {o.party_name || "—"}
                          </TableCell>
                          <TableCell className="py-2.5 font-mono">
                            {o.design_no || "—"}
                          </TableCell>
                          <TableCell className="py-2.5 font-mono text-[0.6875rem]">
                            {cs ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                                {cs.header.sheet_no}
                                <span className={`text-[0.5625rem] px-1 rounded ${cs.header.status === "approved" ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"}`}>
                                  {cs.header.status || "Draft"}
                                </span>
                              </span>
                            ) : o.cost_sheet_snapshot ? (
                              <span className="font-semibold text-foreground">{o.cost_sheet_snapshot.sheet_no}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="py-2.5 text-right font-mono font-bold text-foreground">
                            {o.qty_metre.toLocaleString()} {o.unit || "MTR"}
                          </TableCell>
                          <TableCell className="py-2.5">
                            <div className="flex items-center gap-2">
                              <Progress value={p} className="h-1.5 w-16" />
                              <span className="font-mono text-[0.6875rem] text-muted-foreground">
                                {done}/{o.qty_metre}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5 font-mono text-muted-foreground">
                            {o.delivery_date || "—"}
                          </TableCell>
                          <TableCell className="py-2.5" onClick={(e) => e.stopPropagation()}>
                            <Select
                              value={o.status}
                              onValueChange={(v) => setOrderStatus(o.id, v as ProductionOrder["status"])}
                            >
                              <SelectTrigger className="h-6 w-28 text-[0.6875rem]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {["planned", "in_progress", "completed", "hold"].map((s) => (
                                  <SelectItem key={s} value={s} className="text-xs capitalize">
                                    {s.replace("_", " ")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedOrderForWorkspace(o)}
                                className="h-6 text-[0.6875rem] gap-1 px-2 text-primary border-primary/30 hover:bg-primary/10"
                                title="Open connected planning workspace & material readiness"
                              >
                                <Eye className="size-3" /> Plan & Readiness
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-6 text-muted-foreground hover:text-destructive"
                                onClick={() => removeOrder(o.id)}
                                title="Delete order"
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {!data.orders.length && (
                      <TableRow>
                        <TableCell colSpan={11} className="py-12 text-center text-muted-foreground">
                          <Factory className="mx-auto mb-2 size-8 opacity-30" />
                          <p className="text-xs font-semibold">No production orders found.</p>
                          <p className="mt-0.5 text-[0.6875rem]">
                            Create one from a Sales Order or stock production run.
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* COMPREHENSIVE RAISE PRODUCTION ORDER DIALOG */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto font-sans text-xs">
          <DialogHeader className="border-b border-border pb-2.5">
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Factory className="size-4 text-primary" /> Raise Production Order
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* SECTION A: SOURCE CONTEXT */}
            <div className="rounded-lg border border-border p-3 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="font-bold uppercase tracking-wider text-[0.6875rem] text-primary flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-primary" /> A. SOURCE SELECTION
                </span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium">
                    <input
                      type="radio"
                      name="prod_type"
                      checked={form.production_type === "CUSTOMER ORDER"}
                      onChange={() => setForm({ ...form, production_type: "CUSTOMER ORDER" })}
                    />
                    Customer Order
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium">
                    <input
                      type="radio"
                      name="prod_type"
                      checked={form.production_type === "STOCK PRODUCTION"}
                      onChange={() =>
                        setForm({
                          ...form,
                          production_type: "STOCK PRODUCTION",
                          sales_order_id: "",
                          sales_order_no: "",
                          party_name: "Internal Stock Buffer",
                        })
                      }
                    />
                    Stock Production
                  </label>
                </div>
              </div>

              {form.production_type === "CUSTOMER ORDER" ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[0.6875rem] font-semibold text-foreground">
                      Select Sales Order *
                    </Label>
                    <Select value={form.sales_order_id || "none"} onValueChange={applySalesOrder}>
                      <SelectTrigger className="h-8 text-xs font-mono">
                        <SelectValue placeholder="Choose Sales Order..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Choose Sales Order...</SelectItem>
                        {salesData.orders.map((so) => (
                          <SelectItem key={so.id} value={so.id}>
                            {so.order_no} · {so.customer_name} ({so.qty_metre}m)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[0.6875rem] font-medium text-muted-foreground">
                      Customer / Party (Inherited)
                    </Label>
                    <Input
                      readOnly
                      className="h-8 text-xs bg-muted/50 cursor-not-allowed font-medium"
                      value={form.party_name}
                      placeholder="Inherited from sales order"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[0.6875rem] font-medium text-muted-foreground">
                      Party Order # (Optional)
                    </Label>
                    <Input
                      className="h-8 text-xs font-mono"
                      value={form.party_order_no}
                      onChange={(e) => setForm({ ...form, party_order_no: e.target.value })}
                      placeholder="e.g. PO-LABDHI-99"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground bg-muted/40 p-2 rounded">
                  Stock Production does not require a customer Sales Order. Production order will be buffered for warehouse stock.
                </div>
              )}
            </div>

            {/* SECTION B: PRODUCTION PARAMETERS */}
            <div className="rounded-lg border border-border p-3 space-y-3">
              <span className="font-bold uppercase tracking-wider text-[0.6875rem] text-primary flex items-center gap-1.5 border-b border-border/60 pb-1.5">
                <span className="size-2 rounded-full bg-blue-500" /> B. PRODUCTION ORDER PARAMETERS
              </span>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-[0.6875rem] font-semibold">Production Order # *</Label>
                  <Input
                    required
                    className="h-8 text-xs font-mono font-bold"
                    value={form.order_no}
                    onChange={(e) => setForm({ ...form, order_no: e.target.value })}
                    placeholder="e.g. JCO/2866 or PO-2603"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[0.6875rem]">Design #</Label>
                  <Input
                    className="h-8 text-xs font-mono"
                    value={form.design_no}
                    onChange={(e) => setForm({ ...form, design_no: e.target.value })}
                    placeholder="D-015"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[0.6875rem]">Item / Quality</Label>
                  <Input
                    className="h-8 text-xs"
                    value={form.quality}
                    onChange={(e) => setForm({ ...form, quality: e.target.value })}
                    placeholder="Kashmiri Kota Pashmina"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[0.6875rem]">Priority</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(v) => setForm({ ...form, priority: v as ProductionOrder["priority"] })}
                  >
                    <SelectTrigger className="h-8 text-xs capitalize">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["low", "normal", "high", "urgent"].map((p) => (
                        <SelectItem key={p} value={p} className="capitalize">
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[0.6875rem] font-semibold">Production Quantity *</Label>
                  <Input
                    type="number"
                    min="1"
                    className="h-8 text-xs font-mono font-bold"
                    value={form.qty_metre}
                    onChange={(e) => setForm({ ...form, qty_metre: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[0.6875rem]">Unit</Label>
                  <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                    <SelectTrigger className="h-8 text-xs font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIMARY_UNITS.map((u) => (
                        <SelectItem key={u} value={u} className="font-mono">
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 col-span-2">
                  <Label className="text-[0.6875rem]">Delivery Target Date</Label>
                  <Input
                    type="date"
                    className="h-8 text-xs font-mono"
                    value={form.delivery_date}
                    onChange={(e) => setForm({ ...form, delivery_date: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* SECTION C: COST SHEET SELECTION */}
            <div className="rounded-lg border border-border p-3 space-y-3 bg-muted/10">
              <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                <span className="font-bold uppercase tracking-wider text-[0.6875rem] text-primary flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500" /> C. COST SHEET LINK (DRAFT ALLOWED)
                </span>
                <span className="text-[0.625rem] text-muted-foreground">
                  Approval is NOT a blocker — Draft cost sheets may be selected freely
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[0.6875rem] font-semibold">Select Cost Sheet</Label>
                  <Select value={form.cost_sheet_id} onValueChange={applyCostSheet}>
                    <SelectTrigger className="h-8 text-xs font-mono">
                      <SelectValue placeholder="Select Cost Sheet..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Manual / No Cost Sheet</SelectItem>
                      {sheets.map((s) => (
                        <SelectItem key={s.header.id} value={s.header.id}>
                          {s.header.sheet_no} · {s.header.design_no} ({s.header.status || "Draft"} · {s.header.unit_basis || "per metre"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCostSheet && (
                  <div className="p-2.5 rounded border border-border bg-card space-y-1 text-[0.6875rem] font-mono">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cost Sheet:</span>
                      <strong>{selectedCostSheet.header.sheet_no} ({selectedCostSheet.header.status || "Draft"})</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Basis:</span>
                      <span>{selectedCostSheet.header.unit_basis || "per metre"} · Cut: {selectedCostSheet.header.length_metre}m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Revision:</span>
                      <span>v{selectedCostSheet.header.version || 1} · {selectedCostSheet.header.updated_at ? new Date(selectedCostSheet.header.updated_at).toLocaleDateString() : "2026-08-08"}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION D: LIVE MATERIAL READINESS PREVIEW */}
            {selectedCostSheet && (
              <div className="rounded-lg border border-border p-3 space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                  <span className="font-bold uppercase tracking-wider text-[0.6875rem] text-primary flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-purple-500" /> D. LIVE MATERIAL READINESS PREVIEW
                  </span>
                  <Badge
                    className={`text-[0.625rem] ${
                      livePreviewSummary.overallStatus === "MATERIAL READY"
                        ? "bg-emerald-600 text-white font-bold"
                        : livePreviewSummary.overallStatus === "MATERIAL SHORTAGE"
                        ? "bg-rose-600 text-white font-bold"
                        : "bg-amber-500 text-black font-bold"
                    }`}
                  >
                    {livePreviewSummary.overallStatus} ({livePreviewSummary.readyLines} Ready / {livePreviewSummary.shortageLines} Shortage)
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="max-h-48 overflow-y-auto border border-border rounded">
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow className="bg-muted/60">
                          <TableHead className="h-7 text-[0.6875rem]">Type</TableHead>
                          <TableHead className="h-7 text-[0.6875rem]">Material</TableHead>
                          <TableHead className="h-7 text-[0.6875rem] text-right">Required (kg)</TableHead>
                          <TableHead className="h-7 text-[0.6875rem] text-right">Stock (kg)</TableHead>
                          <TableHead className="h-7 text-[0.6875rem] text-right">Available (kg)</TableHead>
                          <TableHead className="h-7 text-[0.6875rem] text-right">Shortage (kg)</TableHead>
                          <TableHead className="h-7 text-[0.6875rem] text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {livePreviewRequirements.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="py-1 font-mono text-[0.625rem]">{r.sourceType}</TableCell>
                            <TableCell className="py-1 font-semibold">{r.materialName} ({r.materialCode})</TableCell>
                            <TableCell className="py-1 text-right font-mono font-bold">
                              {r.requiredQty !== null ? `${r.requiredQty.toFixed(2)}` : "—"}
                            </TableCell>
                            <TableCell className="py-1 text-right font-mono text-muted-foreground">
                              {r.stockQty !== null ? `${r.stockQty.toFixed(2)}` : "—"}
                            </TableCell>
                            <TableCell className="py-1 text-right font-mono">
                              {r.availableQty !== null ? `${r.availableQty.toFixed(2)}` : "—"}
                            </TableCell>
                            <TableCell
                              className={`py-1 text-right font-mono font-bold ${
                                r.shortageQty && r.shortageQty > 0 ? "text-rose-600" : "text-muted-foreground"
                              }`}
                            >
                              {r.shortageQty !== null ? `${r.shortageQty.toFixed(2)}` : "—"}
                            </TableCell>
                            <TableCell className="py-1 text-center">
                              <span
                                className={`text-[0.5625rem] px-1.5 py-0.5 rounded font-bold ${
                                  r.readiness === "READY"
                                    ? "bg-emerald-500/10 text-emerald-700"
                                    : r.readiness === "SHORTAGE"
                                    ? "bg-rose-500/10 text-rose-700"
                                    : "bg-amber-500/10 text-amber-700"
                                }`}
                              >
                                {r.readiness}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-[0.625rem] text-muted-foreground">
                    * Preview calculated read-only. Production Order creation locks the Cost Sheet snapshot and generates material requirements.
                  </p>
                </div>
              </div>
            )}

            {/* Remarks */}
            <div className="space-y-1">
              <Label className="text-[0.6875rem]">Production Order Remarks</Label>
              <Input
                className="h-8 text-xs"
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                placeholder="Optional notes for weaving shed and job card allocation"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border pt-3">
            <Button variant="outline" size="sm" onClick={() => setOpenCreate(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateOrder} className="h-8 text-xs gap-1.5">
              <Factory className="size-3.5" /> Confirm & Raise Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

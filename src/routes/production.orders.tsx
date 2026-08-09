import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Factory, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProduction } from "@/hooks/useProduction";
import { producedForOrder, pct, uid, type ProductionOrder } from "@/lib/production-store";
import { getLocalCostSheets } from "@/lib/cost-sheet-store";

export const Route = createFileRoute("/production/orders")({
  head: () => ({
    meta: [
      { title: "Production Orders — WeaveOne" },
      {
        name: "description",
        content:
          "Raise and track weaving production orders from approved cost sheets, with quantity, delivery date, priority and live progress.",
      },
      { property: "og:title", content: "Production Orders — WeaveOne" },
      { property: "og:description", content: "Weaving production orders with live progress rolled up from job cards." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

const STATUS_STYLES: Record<string, string> = {
  planned: "bg-muted text-foreground",
  in_progress: "bg-primary text-primary-foreground",
  completed: "bg-emerald-600 text-white",
  hold: "bg-amber-500 text-black",
};

const emptyForm = () => ({
  order_no: "",
  cost_sheet_id: "none",
  design_no: "",
  party_name: "",
  quality: "",
  qty_metre: "",
  delivery_date: "",
  priority: "normal" as ProductionOrder["priority"],
  remarks: "",
});

function Page() {
  const { data, update } = useProduction();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const sheets = typeof window === "undefined" ? [] : getLocalCostSheets();

  const applySheet = (id: string) => {
    const cs = sheets.find((s) => s.header.id === id);
    setForm((f) => ({
      ...f,
      cost_sheet_id: id,
      design_no: cs?.header.design_no ?? f.design_no,
      party_name: cs?.header.party_name ?? f.party_name,
      quality: cs?.header.quality ?? f.quality,
    }));
  };

  const create = () => {
    if (!form.order_no.trim()) { toast.error("Order number is required"); return; }
    const order: ProductionOrder = {
      id: uid("po"),
      order_no: form.order_no.trim(),
      cost_sheet_id: form.cost_sheet_id === "none" ? null : form.cost_sheet_id,
      design_no: form.design_no.trim(),
      party_name: form.party_name.trim(),
      quality: form.quality.trim(),
      qty_metre: Number(form.qty_metre) || 0,
      delivery_date: form.delivery_date,
      priority: form.priority,
      status: "planned",
      remarks: form.remarks.trim(),
      created_at: new Date().toISOString(),
    };
    update((p) => ({ ...p, orders: [order, ...p.orders] }));
    setForm(emptyForm());
    setOpen(false);
    toast.success(`Production order ${order.order_no} raised`);
  };

  const setStatus = (id: string, status: ProductionOrder["status"]) =>
    update((p) => ({ ...p, orders: p.orders.map((o) => (o.id === id ? { ...o, status } : o)) }));

  const remove = (id: string) =>
    update((p) => ({
      ...p,
      orders: p.orders.filter((o) => o.id !== id),
      jobCards: p.jobCards.filter((c) => c.order_id !== id),
      looms: p.looms.map((l) => (l.order_id === id ? { ...l, order_id: null, status: "idle" as const } : l)),
    }));

  return (
    <AppShell
      title="Production Orders"
      breadcrumb={[{ label: "Production" }, { label: "Production Orders" }]}
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-7 gap-1 text-xs">
              <Plus className="size-3.5" /> New Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-sm">Raise Production Order</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <Field label="Order No.">
                <Input
                  className="h-8 text-xs"
                  value={form.order_no}
                  onChange={(e) => setForm({ ...form, order_no: e.target.value })}
                  placeholder="PO-2603"
                />
              </Field>
              <Field label="From Cost Sheet">
                <Select value={form.cost_sheet_id} onValueChange={applySheet}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Manual entry</SelectItem>
                    {sheets.map((s) => (
                      <SelectItem key={s.header.id} value={s.header.id}>
                        {s.header.sheet_no} · {s.header.design_no}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Design No.">
                <Input className="h-8 text-xs" value={form.design_no} onChange={(e) => setForm({ ...form, design_no: e.target.value })} />
              </Field>
              <Field label="Party">
                <Input className="h-8 text-xs" value={form.party_name} onChange={(e) => setForm({ ...form, party_name: e.target.value })} />
              </Field>
              <Field label="Quality">
                <Input className="h-8 text-xs" value={form.quality} onChange={(e) => setForm({ ...form, quality: e.target.value })} />
              </Field>
              <Field label="Quantity (m)">
                <Input
                  type="number"
                  className="h-8 text-xs"
                  value={form.qty_metre}
                  onChange={(e) => setForm({ ...form, qty_metre: e.target.value })}
                />
              </Field>
              <Field label="Delivery Date">
                <Input
                  type="date"
                  className="h-8 text-xs"
                  value={form.delivery_date}
                  onChange={(e) => setForm({ ...form, delivery_date: e.target.value })}
                />
              </Field>
              <Field label="Priority">
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v as ProductionOrder["priority"] })}
                >
                  <SelectTrigger className="h-8 text-xs">
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
              </Field>
              <div className="col-span-2">
                <Field label="Remarks">
                  <Input className="h-8 text-xs" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
                </Field>
              </div>
            </div>
            <DialogFooter>
              <Button size="sm" className="h-8 text-xs" onClick={create}>
                Raise Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <Card className="rounded-md border border-border">
        <CardContent className="p-0">
          <Table className="text-xs">
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead className="h-8 font-semibold">Order No.</TableHead>
                <TableHead className="h-8 font-semibold">Design</TableHead>
                <TableHead className="h-8 font-semibold">Party</TableHead>
                <TableHead className="h-8 font-semibold">Quality</TableHead>
                <TableHead className="h-8 text-right font-semibold">Qty (m)</TableHead>
                <TableHead className="h-8 font-semibold">Progress</TableHead>
                <TableHead className="h-8 font-semibold">Delivery</TableHead>
                <TableHead className="h-8 font-semibold">Priority</TableHead>
                <TableHead className="h-8 font-semibold">Status</TableHead>
                <TableHead className="h-8 text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.orders.map((o) => {
                const done = producedForOrder(data, o.id);
                const p = pct(done, o.qty_metre);
                return (
                  <TableRow key={o.id} className="hover:bg-muted/40">
                    <TableCell className="py-2 font-mono font-bold text-primary">{o.order_no}</TableCell>
                    <TableCell className="py-2 font-mono">{o.design_no || "—"}</TableCell>
                    <TableCell className="py-2">{o.party_name || "—"}</TableCell>
                    <TableCell className="py-2">{o.quality || "—"}</TableCell>
                    <TableCell className="py-2 text-right font-mono">{o.qty_metre.toLocaleString()}</TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <Progress value={p} className="h-1.5 w-20" />
                        <span className="font-mono text-[0.6875rem] text-muted-foreground">
                          {done}/{o.qty_metre}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 font-mono">{o.delivery_date || "—"}</TableCell>
                    <TableCell className="py-2 capitalize">{o.priority}</TableCell>
                    <TableCell className="py-2">
                      <Select value={o.status} onValueChange={(v) => setStatus(o.id, v as ProductionOrder["status"])}>
                        <SelectTrigger className="h-6 w-32 text-[0.6875rem]">
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
                    <TableCell className="py-2 text-right">
                      <Badge className={`mr-1 text-[0.625rem] capitalize ${STATUS_STYLES[o.status]}`}>
                        {o.status.replace("_", " ")}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={() => remove(o.id)}
                        title="Delete order"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!data.orders.length && (
                <TableRow>
                  <TableCell colSpan={10} className="py-12 text-center text-muted-foreground">
                    <Factory className="mx-auto mb-2 size-8 opacity-30" />
                    <p className="text-xs font-semibold">No production orders yet.</p>
                    <p className="mt-0.5 text-[0.6875rem]">
                      Raise one from an approved{" "}
                      <Link to="/cost-sheets" className="underline">
                        cost sheet
                      </Link>
                      .
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="section-label text-[0.6875rem]">{label}</Label>
      {children}
    </div>
  );
}

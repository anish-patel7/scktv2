import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { producedForOrder, pct, uid, type Loom, type LoomStatus } from "@/lib/production-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/production/looms")({
  head: () => ({
    meta: [
      { title: "Loom Planning — WeaveOne" },
      {
        name: "description",
        content: "Allocate weaving orders to looms, track utilisation, changeovers and maintenance on a live planning board.",
      },
      { property: "og:title", content: "Loom Planning — WeaveOne" },
      { property: "og:description", content: "Loom allocation board with utilisation and changeover visibility." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

const STATUS_TONE: Record<LoomStatus, string> = {
  running: "border-primary/60 bg-primary/10",
  idle: "border-border bg-card",
  maintenance: "border-amber-500/60 bg-amber-500/10",
};

function Page() {
  const { data, update } = useProduction();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ loom_no: "", loom_type: "Jacquard", panna_inch: "", remarks: "" });

  const addLoom = () => {
    if (!form.loom_no.trim()) { toast.error("Loom number is required"); return; }
    const loom: Loom = {
      id: uid("lm"),
      loom_no: form.loom_no.trim(),
      loom_type: form.loom_type,
      panna_inch: Number(form.panna_inch) || 0,
      status: "idle",
      order_id: null,
      remarks: form.remarks.trim(),
    };
    update((p) => ({ ...p, looms: [...p.looms, loom] }));
    setForm({ loom_no: "", loom_type: "Jacquard", panna_inch: "", remarks: "" });
    setOpen(false);
    toast.success(`Loom ${loom.loom_no} added`);
  };

  const allocate = (loomId: string, orderId: string) =>
    update((p) => ({
      ...p,
      looms: p.looms.map((l) =>
        l.id === loomId
          ? {
              ...l,
              order_id: orderId === "none" ? null : orderId,
              status: orderId === "none" ? (l.status === "maintenance" ? "maintenance" : "idle") : "running",
            }
          : l,
      ),
    }));

  const setStatus = (loomId: string, status: LoomStatus) =>
    update((p) => ({
      ...p,
      looms: p.looms.map((l) =>
        l.id === loomId ? { ...l, status, order_id: status === "running" ? l.order_id : null } : l,
      ),
    }));

  const remove = (loomId: string) =>
    update((p) => ({
      ...p,
      looms: p.looms.filter((l) => l.id !== loomId),
      jobCards: p.jobCards.map((c) => (c.loom_id === loomId ? { ...c, loom_id: null } : c)),
    }));

  const running = data.looms.filter((l) => l.status === "running").length;
  const utilisation = pct(running, data.looms.length);

  return (
    <AppShell
      title="Loom Planning"
      breadcrumb={[{ label: "Production" }, { label: "Loom Planning" }]}
      actions={
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[0.6875rem]">
            Utilisation {utilisation}% · {running}/{data.looms.length} running
          </Badge>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 gap-1 text-xs">
                <Plus className="size-3.5" /> Add Loom
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-sm">Add Loom</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="section-label text-[0.6875rem]">Loom No.</Label>
                  <Input className="h-8 text-xs" value={form.loom_no} onChange={(e) => setForm({ ...form, loom_no: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="section-label text-[0.6875rem]">Type</Label>
                  <Select value={form.loom_type} onValueChange={(v) => setForm({ ...form, loom_type: v })}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Jacquard", "Rapier", "Airjet", "Powerloom", "Handloom"].map((t) => (
                        <SelectItem key={t} value={t} className="text-xs">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="section-label text-[0.6875rem]">Panna (inch)</Label>
                  <Input
                    type="number"
                    className="h-8 text-xs"
                    value={form.panna_inch}
                    onChange={(e) => setForm({ ...form, panna_inch: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="section-label text-[0.6875rem]">Remarks</Label>
                  <Input className="h-8 text-xs" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button size="sm" className="h-8 text-xs" onClick={addLoom}>
                  Add Loom
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data.looms.map((l) => {
          const order = data.orders.find((o) => o.id === l.order_id);
          const done = order ? producedForOrder(data, order.id) : 0;
          return (
            <Card key={l.id} className={cn("gap-2 rounded-sm border py-3", STATUS_TONE[l.status])}>
              <CardHeader className="flex flex-row items-center justify-between px-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <span className="font-mono font-bold">{l.loom_no}</span>
                  <span className="text-[0.6875rem] font-normal text-muted-foreground">
                    {l.loom_type} · {l.panna_inch}"
                  </span>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 text-muted-foreground hover:text-destructive"
                  onClick={() => remove(l.id)}
                  title="Remove loom"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2 px-3 text-xs">
                <div className="space-y-1">
                  <Label className="section-label text-[0.6875rem]">Allocated order</Label>
                  <Select value={l.order_id ?? "none"} onValueChange={(v) => allocate(l.id, v)}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">
                        Unallocated
                      </SelectItem>
                      {data.orders.map((o) => (
                        <SelectItem key={o.id} value={o.id} className="text-xs">
                          {o.order_no} · {o.design_no}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="section-label text-[0.6875rem]">Status</Label>
                  <Select value={l.status} onValueChange={(v) => setStatus(l.id, v as LoomStatus)}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["idle", "running", "maintenance"] as LoomStatus[]).map((s) => (
                        <SelectItem key={s} value={s} className="text-xs capitalize">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-[0.6875rem] text-muted-foreground">
                  {order ? `${order.party_name} · ${done}/${order.qty_metre} m woven` : l.remarks || "No allocation"}
                </p>
              </CardContent>
            </Card>
          );
        })}
        {!data.looms.length && (
          <p className="text-xs text-muted-foreground">No looms configured yet — add your first loom.</p>
        )}
      </div>
    </AppShell>
  );
}

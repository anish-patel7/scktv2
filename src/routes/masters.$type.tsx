import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { MASTER_TYPES } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmt } from "@/lib/costing";

export const Route = createFileRoute("/masters/$type")({
  head: () => ({
    meta: [
      { title: "Master Data — WeaveOne" },
      {
        name: "description",
        content:
          "Single-source master registers for yarn, item, party, beam, loom, broker, salesman, colour and process data.",
      },
      { property: "og:title", content: "Master Data — WeaveOne" },
      {
        property: "og:description",
        content: "Centralised textile master data with rate history and de-duplicated records.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MasterPage,
});

function MasterPage() {
  const { type } = Route.useParams();
  const qc = useQueryClient();
  const meta = MASTER_TYPES.find((m) => m.type === type);
  const isMaterial = type === "material";
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    denier: "",
    composition: "",
    rate_per_kg: "",
  });

  const { data = [] } = useQuery({
    queryKey: ["master", type],
    queryFn: async () => {
      if (isMaterial) {
        const { data } = await supabase.from("materials").select("*").order("code");
        return data ?? [];
      }
      const { data } = await supabase
        .from("masters")
        .select("*")
        .eq("master_type", type)
        .order("code");
      return data ?? [];
    },
  });

  const create = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Code and name are required");
      return;
    }
    const res = isMaterial
      ? await supabase.from("materials").insert({
          code: form.code,
          name: form.name,
          composition: form.composition || null,
          denier: form.denier ? Number(form.denier) : null,
          rate_per_kg: Number(form.rate_per_kg || 0),
        })
      : await supabase.from("masters").insert({
          master_type: type,
          code: form.code,
          name: form.name,
          description: form.description || null,
        });
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success("Record added");
    setForm({ code: "", name: "", description: "", denier: "", composition: "", rate_per_kg: "" });
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["master", type] });
  };

  return (
    <AppShell
      title={`${meta?.label ?? "Master"} Master`}
      breadcrumb={[{ label: "Masters" }, { label: meta?.label ?? type }]}
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-7 gap-1 text-xs">
              <Plus className="size-3.5" /> New record
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-sm">New {meta?.label ?? type} record</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="section-label">Code</Label>
                <Input
                  className="h-8 text-xs"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="section-label">Name</Label>
                <Input
                  className="h-8 text-xs"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              {isMaterial ? (
                <>
                  <div className="space-y-1">
                    <Label className="section-label">Composition</Label>
                    <Input
                      className="h-8 text-xs"
                      value={form.composition}
                      onChange={(e) => setForm({ ...form, composition: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="section-label">Denier</Label>
                    <Input
                      className="num h-8 text-xs"
                      value={form.denier}
                      onChange={(e) => setForm({ ...form, denier: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="section-label">Rate / kg</Label>
                    <Input
                      className="num h-8 text-xs"
                      value={form.rate_per_kg}
                      onChange={(e) => setForm({ ...form, rate_per_kg: e.target.value })}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-1 sm:col-span-2">
                  <Label className="section-label">Description</Label>
                  <Input
                    className="h-8 text-xs"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button size="sm" onClick={create}>
                Save record
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <Card className="gap-0 rounded-sm py-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead className="h-8 w-32">Code</TableHead>
                <TableHead className="h-8">Name</TableHead>
                {isMaterial ? (
                  <>
                    <TableHead className="h-8">Composition</TableHead>
                    <TableHead className="h-8 text-right">Denier</TableHead>
                    <TableHead className="h-8 text-right">Rate / kg</TableHead>
                  </>
                ) : (
                  <TableHead className="h-8">Description</TableHead>
                )}
                <TableHead className="h-8 w-20">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r: Record<string, unknown>) => (
                <TableRow key={String(r["id"])}>
                  <TableCell className="num py-1.5">{String(r["code"])}</TableCell>
                  <TableCell className="py-1.5 font-medium">{String(r["name"])}</TableCell>
                  {isMaterial ? (
                    <>
                      <TableCell className="py-1.5">{String(r["composition"] ?? "—")}</TableCell>
                      <TableCell className="num py-1.5 text-right">
                        {fmt(Number(r["denier"] ?? 0), 0)}
                      </TableCell>
                      <TableCell className="num py-1.5 text-right">
                        {fmt(Number(r["rate_per_kg"] ?? 0))}
                      </TableCell>
                    </>
                  ) : (
                    <TableCell className="py-1.5">{String(r["description"] ?? "—")}</TableCell>
                  )}
                  <TableCell className="py-1.5">
                    <Badge variant={r["active"] ? "outline" : "secondary"} className="text-[0.625rem]">
                      {r["active"] ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {!data.length && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No records in this master yet.
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

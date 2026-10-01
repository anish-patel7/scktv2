import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Edit, Trash2, Power, Layers, AlertTriangle, ListTree, Check } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmt } from "@/lib/costing";
import { PartyMasterView } from "@/components/party-master-view";
import { YarnMasterView } from "@/components/yarn-master-view";
import { WarehouseMasterView } from "@/components/warehouse-master-view";
import { ItemMasterView } from "@/components/item-master-view";
import { getLocalWorkTypes, saveLocalWorkTypes } from "@/lib/work-type-store";
import { cn } from "@/lib/utils";

interface GenericMasterItem {
  id: string;
  code: string;
  name: string;
  description?: string | undefined;
  composition?: string | undefined;
  denier?: number | undefined;
  rate_per_kg?: number | undefined;
  active: boolean;
}

interface SubMasterEntry {
  id: string;
  code: string;
  name: string;
  remark?: string | undefined;
}

/** Readable message for a failed Supabase master write/read (no raw JSON / Postgres internals). */
function masterErrorMessage(error: { code?: string; message?: string } | null | undefined): string {
  if (!error) return "Unknown error";
  if (error.code === "23505") return "A record with this code already exists.";
  if (error.code === "42501" || /permission denied|row-level security/i.test(error.message ?? "")) {
    return "You do not have permission to perform this action. Please sign in with an authorised account.";
  }
  return error.message || "Request failed";
}

/** Next auto code: highest existing numeric suffix for the prefix + 1 (never length-based). */
function nextMasterCode(prefix: string, padLen: number, existingCodes: string[]): string {
  const re = new RegExp(`^${prefix}-(\\d+)$`, "i");
  const max = existingCodes.reduce((m, c) => {
    const hit = re.exec(c.trim());
    return hit ? Math.max(m, Number(hit[1])) : m;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(padLen, "0")}`;
}

export const Route = createFileRoute("/masters/$type")({
  head: () => ({
    meta: [
      { title: "Master Data — SCKT ERP" },
      {
        name: "description",
        content:
          "Single-source master registers for yarn, item, party, beam, loom, broker, salesman, colour and process data.",
      },
      { property: "og:title", content: "Master Data — SCKT ERP" },
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
  const isParty = type === "party";
  const isWarehouse = type === "warehouse";

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GenericMasterItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<GenericMasterItem | null>(null);

  // Local state storage for modified generic records
  const [localRecords, setLocalRecords] = useState<Record<string, GenericMasterItem[]>>({});

  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    denier: "",
    composition: "",
    rate_per_kg: "",
  });

  const isWorkType = type === "work_type";

  // Generic masters: the Supabase `masters` table is the only authority (no seed fallback).
  // Work Type remains on its local store (shared with other modules).
  const {
    data: dbFetched = [],
    error: loadError,
    isLoading,
  } = useQuery({
    queryKey: ["master", type],
    enabled: !isParty && !isMaterial && !isWarehouse && type !== "item",
    queryFn: async () => {
      if (isWorkType) {
        return getLocalWorkTypes().map((w) => ({
          id: w.id,
          code: w.code,
          name: w.name,
          description: w.description,
          active: w.active,
        }));
      }
      const { data, error } = await supabase
        .from("masters")
        .select("*")
        .eq("master_type", type)
        .order("code");
      if (error) throw new Error(masterErrorMessage(error));
      return data ?? [];
    },
  });

  // Combined records list
  const activeRecords = useMemo<GenericMasterItem[]>(() => {
    if (isWorkType && localRecords[type]) return localRecords[type];
    return dbFetched.map((r: any) => ({
      id: String(r.id),
      code: String(r.code || ""),
      name: String(r.name || ""),
      description: r.description ? String(r.description) : undefined,
      composition: r.composition ? String(r.composition) : undefined,
      denier: r.denier ? Number(r.denier) : undefined,
      rate_per_kg: r.rate_per_kg ? Number(r.rate_per_kg) : undefined,
      active: r.active !== false,
    }));
  }, [localRecords, type, dbFetched]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeRecords;

    return activeRecords.filter((r: any) => {
      const code = String(r.code || "").toLowerCase();
      const name = String(r.name || "").toLowerCase();
      const desc = String(r.description || r.composition || "").toLowerCase();
      return code.includes(q) || name.includes(q) || desc.includes(q);
    });
  }, [activeRecords, search]);

  if (isWarehouse) {
    return (
      <AppShell
        title="Warehouse Master"
        breadcrumb={[{ label: "Masters" }, { label: "Warehouse" }]}
      >
        <WarehouseMasterView />
      </AppShell>
    );
  }

  if (isParty) {
    return (
      <AppShell
        title="Party Master"
        breadcrumb={[{ label: "Masters" }, { label: "Party" }]}
      >
        <PartyMasterView />
      </AppShell>
    );
  }

  if (isMaterial) {
    return <YarnMasterView />;
  }

  if (type === "item") {
    return (
      <AppShell
        title="Item Master"
        breadcrumb={[{ label: "Masters" }, { label: "Item" }]}
      >
        <ItemMasterView />
      </AppShell>
    );
  }

  const persistWorkTypes = (list: GenericMasterItem[]) => {
    saveLocalWorkTypes(
      list.map((u) => ({
        id: u.id,
        code: u.code,
        name: u.name,
        description: u.description,
        active: u.active,
      }))
    );
    setLocalRecords((prev) => ({ ...prev, [type]: list }));
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    const prefix = type === "beam_colour" ? "BYM" : type === "work_type" ? "WT" : type.slice(0, 3).toUpperCase();
    const padLen = type === "beam_colour" || type === "loom" || type === "process" || type === "work_type" ? 2 : 3;
    setForm({
      code: nextMasterCode(prefix, padLen, activeRecords.map((r) => r.code)),
      name: "",
      description: "",
      denier: "",
      composition: "",
      rate_per_kg: "",
    });
    setOpen(true);
  };

  const handleOpenEdit = (item: GenericMasterItem) => {
    setEditingItem(item);
    setForm({
      code: item.code,
      name: item.name,
      description: item.description || "",
      denier: item.denier ? String(item.denier) : "",
      composition: item.composition || "",
      rate_per_kg: item.rate_per_kg ? String(item.rate_per_kg) : "",
    });
    setOpen(true);
  };

  const saveRecord = async () => {
    const code = form.code.trim();
    const name = form.name.trim();
    if (!code || !name) {
      toast.error("Code and name are required");
      return;
    }
    const duplicate = activeRecords.find(
      (r) => r.code.toLowerCase() === code.toLowerCase() && r.id !== editingItem?.id
    );
    if (duplicate) {
      toast.error(`Code ${code} already exists`);
      return;
    }
    const description = form.description.trim() || null;

    if (isWorkType) {
      const list = editingItem
        ? activeRecords.map((item) =>
            item.id === editingItem.id ? { ...item, code, name, description: description ?? undefined } : item
          )
        : [{ id: `${type}-${Date.now()}`, code, name, description: description ?? undefined, active: true }, ...activeRecords];
      persistWorkTypes(list);
    } else if (editingItem) {
      const { error } = await supabase
        .from("masters")
        .update({ code, name, description })
        .eq("id", editingItem.id);
      if (error) {
        toast.error(`Could not update record: ${masterErrorMessage(error)}`);
        return;
      }
    } else {
      const { error } = await supabase.from("masters").insert({
        master_type: type,
        code,
        name,
        description,
      });
      if (error) {
        toast.error(`Could not create record: ${masterErrorMessage(error)}`);
        return;
      }
    }

    toast.success(editingItem ? `Record ${code} updated successfully` : `New ${meta?.label ?? type} record added`);
    setOpen(false);
    setEditingItem(null);
    await qc.invalidateQueries({ queryKey: ["master", type] });
  };

  const handleDeleteRecord = async (item: GenericMasterItem) => {
    if (isWorkType) {
      persistWorkTypes(activeRecords.filter((r) => r.id !== item.id));
    } else {
      const { error } = await supabase.from("masters").delete().eq("id", item.id);
      if (error) {
        toast.error(`Could not delete record: ${masterErrorMessage(error)}`);
        setDeletingItem(null);
        return;
      }
    }
    toast.success(`Record ${item.code} deleted successfully`);
    setDeletingItem(null);
    await qc.invalidateQueries({ queryKey: ["master", type] });
  };

  const handleToggleStatus = async (item: GenericMasterItem) => {
    const isNowActive = item.active === false;
    if (isWorkType) {
      persistWorkTypes(activeRecords.map((r) => (r.id === item.id ? { ...r, active: isNowActive } : r)));
    } else {
      const { error } = await supabase.from("masters").update({ active: isNowActive }).eq("id", item.id);
      if (error) {
        toast.error(`Could not change status: ${masterErrorMessage(error)}`);
        return;
      }
      await qc.invalidateQueries({ queryKey: ["master", type] });
    }
    toast.success(`Record ${item.code} ${isNowActive ? "activated" : "deactivated"}`);
  };

  return (
    <AppShell
      title={`${meta?.label ?? "Master"} Master`}
      breadcrumb={[{ label: "Masters" }, { label: meta?.label ?? type }]}
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleOpenCreate} className="h-7 gap-1 text-xs">
            <Plus className="size-3.5" /> New Record
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Search & Filter Bar */}
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${meta?.label ?? type} master by code, name, description...`}
              className="pl-9 text-xs"
            />
          </div>

          <Badge variant="secondary" className="text-xs">
            {filteredRows.length} {meta?.label ?? "Master"} Records
          </Badge>
        </div>

        {/* Master Table */}
        <Card className="rounded-md border border-border">
          <CardContent className="p-0">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="bg-muted/60 font-semibold text-muted-foreground">
                  <TableHead className="h-8 w-32">Code</TableHead>
                  <TableHead className="h-8">Name</TableHead>
                  {isMaterial ? (
                    <>
                      <TableHead className="h-8">Composition</TableHead>
                      <TableHead className="h-8 text-right">Denier</TableHead>
                      <TableHead className="h-8 text-right">Rate / kg (GST incl)</TableHead>
                    </>
                  ) : (
                    <TableHead className="h-8">Description</TableHead>
                  )}
                  <TableHead className="h-8 w-24">Status</TableHead>
                  <TableHead className="h-8 text-right w-36">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((r: Record<string, any>) => {
                  const itemObj = r as GenericMasterItem;
                  return (
                    <TableRow key={String(r["id"])} className="hover:bg-muted/40">
                      <TableCell className="num py-2 font-mono font-bold text-primary">
                        {String(r["code"])}
                      </TableCell>
                      <TableCell className="py-2 font-semibold text-foreground">
                        {String(r["name"])}
                      </TableCell>
                      {isMaterial ? (
                        <>
                          <TableCell className="py-2">{String(r["composition"] ?? "—")}</TableCell>
                          <TableCell className="num py-2 text-right font-mono">
                            {fmt(Number(r["denier"] ?? 0), 0)}
                          </TableCell>
                          <TableCell className="num py-2 text-right font-mono font-bold text-foreground">
                            ₹{fmt(Number(r["rate_per_kg"] ?? 0), 2)}
                          </TableCell>
                        </>
                      ) : (
                        <TableCell className="py-2 text-muted-foreground">
                          {String(r["description"] ?? "—")}
                        </TableCell>
                      )}
                      <TableCell className="py-2">
                        <Badge
                          variant={r["active"] !== false ? "default" : "secondary"}
                          className={`text-[0.625rem] capitalize ${
                            r["active"] !== false ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                          }`}
                        >
                          {r["active"] !== false ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-primary"
                            title="Edit Master Record"
                            onClick={() => handleOpenEdit(itemObj)}
                          >
                            <Edit className="size-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "size-7",
                              itemObj.active !== false
                                ? "text-muted-foreground hover:text-amber-600"
                                : "text-emerald-600 hover:text-emerald-700"
                            )}
                            title={itemObj.active !== false ? "Deactivate Record" : "Activate Record"}
                            onClick={() => handleToggleStatus(itemObj)}
                          >
                            <Power className="size-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-destructive"
                            title="Delete Master Record"
                            onClick={() => setDeletingItem(itemObj)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!filteredRows.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                      {loadError ? (
                        <>
                          <AlertTriangle className="mx-auto size-8 text-destructive/60 mb-2" />
                          <p className="text-xs font-semibold text-destructive">Could not load records.</p>
                          <p className="text-[0.6875rem] text-muted-foreground mt-0.5">{loadError.message}</p>
                        </>
                      ) : isLoading ? (
                        <p className="text-xs font-semibold">Loading records…</p>
                      ) : (
                        <>
                          <Layers className="mx-auto size-8 text-muted-foreground/30 mb-2" />
                          <p className="text-xs font-semibold">
                            {search.trim() ? "No records match your search." : "No records in this master yet."}
                          </p>
                          <p className="text-[0.6875rem] text-muted-foreground mt-0.5">
                            Click "+ New Record" to add entry.
                          </p>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* New / Edit Record Modal Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md p-6 text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">
              {editingItem ? `Edit ${meta?.label ?? type} Record` : `New ${meta?.label ?? type} Record`}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Code *</Label>
              <Input
                className="h-8 text-xs font-mono font-bold"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Name *</Label>
              <Input
                className="h-8 text-xs font-semibold"
                placeholder="e.g. Special Finish Master"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            {isMaterial ? (
              <>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Composition</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="e.g. 100% Polyester"
                    value={form.composition}
                    onChange={(e) => setForm({ ...form, composition: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Denier</Label>
                    <Input
                      type="number"
                      className="num h-8 text-xs font-mono"
                      value={form.denier}
                      onChange={(e) => setForm({ ...form, denier: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Rate / kg (GST incl)</Label>
                    <Input
                      type="number"
                      className="num h-8 text-xs font-mono"
                      value={form.rate_per_kg}
                      onChange={(e) => setForm({ ...form, rate_per_kg: e.target.value })}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <Label className="text-xs font-medium">Description / Remark</Label>
                <Input
                  className="h-8 text-xs"
                  placeholder="Additional master specifications..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 border-t border-border pt-3">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={saveRecord} className="h-8 text-xs font-semibold">
              {editingItem ? "Update Record" : "Save Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Record Deletion */}
      <AlertDialog open={Boolean(deletingItem)} onOpenChange={(o) => !o && setDeletingItem(null)}>
        {deletingItem && (
          <AlertDialogContent className="max-w-md p-6 text-xs">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-sm font-bold text-destructive flex items-center gap-2">
                <AlertTriangle className="size-4" />
                Delete {meta?.label ?? type} Record ({deletingItem.code})?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground pt-1">
                Are you sure you want to permanently delete master record{" "}
                <strong>{deletingItem.code} — {deletingItem.name}</strong>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 pt-3 border-t border-border mt-3">
              <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => handleDeleteRecord(deletingItem)}
              >
                Delete Record
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </AppShell>
  );
}

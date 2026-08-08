import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Save, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  computeCostSheet,
  fmt,
  isBlankLine,
  lineCost,
  lineKg,
  type ChargeLine,
  type CostLine,
} from "@/lib/costing";

type Header = {
  sheet_no: string;
  design_no: string;
  party_id: string | null;
  party_name: string;
  quality: string;
  reed: number;
  pick: number;
  panna_inch: number;
  length_metre: number;
  wastage_pct: number;
  card_rate: number;
  number_of_cards: number;
  kg_divisor: number;
  card_divisor: number;
  status: string;
  version: number;
  remarks: string;
};

const uid = () => Math.random().toString(36).slice(2);

const blankLine = (section: "warp" | "weft", sequence: number): CostLine => ({
  id: uid(),
  section,
  label: "",
  material_id: null,
  yarn_name: "",
  quantity: 0,
  denier: 0,
  length_metre: 0,
  panna_inch: 0,
  rate_per_kg: 0,
});

export const emptyHeader = (sheetNo: string): Header => ({
  sheet_no: sheetNo,
  design_no: "",
  party_id: null,
  party_name: "",
  quality: "",
  reed: 0,
  pick: 0,
  panna_inch: 0,
  length_metre: 0,
  wastage_pct: 10,
  card_rate: 0,
  number_of_cards: 0,
  kg_divisor: 9000000,
  card_divisor: 39.37,
  status: "draft",
  version: 1,
  remarks: "",
});

export const defaultLines = (): CostLine[] => [
  ...Array.from({ length: 3 }, (_, i) => blankLine("warp", i + 1)),
  ...Array.from({ length: 6 }, (_, i) => blankLine("weft", i + 1)),
];

export const defaultCharges = (): ChargeLine[] => [
  { id: uid(), charge_name: "Butta", rate: 0, quantity: 0 },
  { id: uid(), charge_name: "RFD", rate: 0, quantity: 0 },
];

function NumCell({
  value,
  onChange,
  dp = 4,
}: {
  value: number;
  onChange: (n: number) => void;
  dp?: number;
}) {
  const [text, setText] = useState<string | null>(null);
  return (
    <input
      className="grid-cell focus:grid-cell-focus"
      inputMode="decimal"
      value={text ?? (value ? String(value) : "")}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const n = Number(text ?? value);
        if (text !== null) {
          if (Number.isNaN(n)) toast.error("Numeric value required");
          else if (n < 0) toast.error("Negative values are rejected");
          else onChange(Number(n.toFixed(dp)));
          setText(null);
        }
      }}
    />
  );
}

export function CostSheetEditor({
  sheetId,
  initialHeader,
  initialLines,
  initialCharges,
}: {
  sheetId?: string;
  initialHeader: Header;
  initialLines: CostLine[];
  initialCharges: ChargeLine[];
}) {
  const navigate = useNavigate();
  const [header, setHeader] = useState<Header>(initialHeader);
  const [lines, setLines] = useState<CostLine[]>(initialLines);
  const [charges, setCharges] = useState<ChargeLine[]>(initialCharges);
  const [saving, setSaving] = useState(false);

  const { data: materials = [] } = useQuery({
    queryKey: ["materials"],
    queryFn: async () => {
      const { data } = await supabase
        .from("materials")
        .select("id,code,name,denier,rate_per_kg")
        .eq("active", true)
        .order("code");
      return data ?? [];
    },
  });

  const { data: parties = [] } = useQuery({
    queryKey: ["masters", "party"],
    queryFn: async () => {
      const { data } = await supabase
        .from("masters")
        .select("id,code,name")
        .eq("master_type", "party")
        .order("name");
      return data ?? [];
    },
  });

  const totals = useMemo(
    () =>
      computeCostSheet({
        lines,
        charges,
        wastage_pct: header.wastage_pct,
        card_rate: header.card_rate,
        number_of_cards: header.number_of_cards,
        kg_divisor: header.kg_divisor,
        card_divisor: header.card_divisor,
      }),
    [lines, charges, header],
  );

  const patchLine = (id: string, patch: Partial<CostLine>) =>
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const save = async (status?: string) => {
    if (!header.sheet_no.trim()) {
      toast.error("Sheet number is required");
      return;
    }
    setSaving(true);
    const { data: userRes } = await supabase.auth.getUser();
    const payload = {
      ...header,
      status: status ?? header.status,
      party_id: header.party_id,
      warp_cost: totals.warpCost,
      weft_cost: totals.weftCost,
      total_kg: totals.totalKg,
      wastage_cost: totals.wastageCost,
      process_cost: totals.processCost,
      card_cost: totals.cardCost,
      final_cost: totals.finalCost,
      sale_rate: totals.saleRate,
      created_by: userRes.user?.id ?? null,
      ...(status === "approved"
        ? { approved_by: userRes.user?.id ?? null, approved_at: new Date().toISOString() }
        : {}),
    };

    let id = sheetId;
    if (id) {
      const { error } = await supabase.from("cost_sheets").update(payload).eq("id", id);
      if (error) {
        setSaving(false);
        toast.error(error.message);
        return;
      }
      await supabase.from("cost_sheet_lines").delete().eq("sheet_id", id);
      await supabase.from("cost_sheet_charges").delete().eq("sheet_id", id);
    } else {
      const { data, error } = await supabase.from("cost_sheets").insert(payload).select("id").single();
      if (error || !data) {
        setSaving(false);
        toast.error(error?.message ?? "Could not save");
        return;
      }
      id = data.id;
    }

    const persistLines = lines
      .filter((l) => !isBlankLine(l))
      .map((l, i) => ({
        sheet_id: id!,
        section: l.section,
        sequence: i + 1,
        label: l.label,
        material_id: l.material_id,
        yarn_name: l.yarn_name,
        quantity: l.quantity,
        denier: l.denier,
        length_metre: l.length_metre,
        panna_inch: l.panna_inch,
        rate_per_kg: l.rate_per_kg,
        calculated_kg: lineKg(l, header.kg_divisor),
        cost: lineCost(l, header.kg_divisor),
      }));
    if (persistLines.length) await supabase.from("cost_sheet_lines").insert(persistLines);

    const persistCharges = charges.map((c, i) => ({
      sheet_id: id!,
      sequence: i + 1,
      charge_name: c.charge_name,
      rate: c.rate,
      quantity: c.quantity,
      amount: c.rate * c.quantity,
    }));
    if (persistCharges.length) await supabase.from("cost_sheet_charges").insert(persistCharges);

    await supabase.from("audit_log").insert({
      entity: "cost_sheet",
      entity_id: id!,
      action: status ? `status:${status}` : sheetId ? "update" : "create",
      details: `${header.sheet_no} · final ${fmt(totals.finalCost)}`,
      actor_id: userRes.user?.id ?? null,
      actor_name: userRes.user?.email ?? null,
    });

    setSaving(false);
    toast.success(status === "approved" ? "Cost sheet approved" : "Cost sheet saved");
    navigate({ to: "/cost-sheets/$id", params: { id: id! } });
  };

  const section = (name: "warp" | "weft") => {
    const rows = lines.filter((l) => l.section === name);
    const isWeft = name === "weft";
    return (
      <Card className="gap-0 rounded-sm py-0">
        <CardHeader className="flex-row items-center justify-between border-b px-4 py-2.5">
          <CardTitle className="text-sm capitalize">{name} section</CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="h-6 gap-1 px-2 text-[0.6875rem]"
            onClick={() => setLines((ls) => [...ls, blankLine(name, rows.length + 1)])}
          >
            <Plus className="size-3" /> Add row
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead className="h-7 w-8">#</TableHead>
                <TableHead className="h-7 w-44">Material</TableHead>
                <TableHead className="h-7 w-28">Label</TableHead>
                <TableHead className="h-7 text-right">{isWeft ? "Picks" : "Ends"}</TableHead>
                <TableHead className="h-7 text-right">Denier</TableHead>
                <TableHead className="h-7 text-right">Length (m)</TableHead>
                <TableHead className="h-7 text-right">Panna (in)</TableHead>
                <TableHead className="h-7 text-right">Rate/kg</TableHead>
                <TableHead className="h-7 text-right">KG</TableHead>
                <TableHead className="h-7 text-right">Cost</TableHead>
                <TableHead className="h-7 w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((l, i) => (
                <TableRow key={l.id} className="hover:bg-muted/30">
                  <TableCell className="num py-0.5 text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="py-0.5">
                    <Select
                      value={l.material_id ?? ""}
                      onValueChange={(v) => {
                        const m = materials.find((x) => x.id === v);
                        patchLine(l.id, {
                          material_id: v,
                          yarn_name: m?.name ?? "",
                          denier: Number(m?.denier ?? 0),
                          rate_per_kg: Number(m?.rate_per_kg ?? 0),
                        });
                      }}
                    >
                      <SelectTrigger className="h-7 rounded-sm text-xs">
                        <SelectValue placeholder="Select yarn" />
                      </SelectTrigger>
                      <SelectContent>
                        {materials.map((m) => (
                          <SelectItem key={m.id} value={m.id} className="text-xs">
                            {m.code} — {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="py-0.5">
                    <input
                      className="grid-cell focus:grid-cell-focus text-left"
                      value={l.label}
                      onChange={(e) => patchLine(l.id, { label: e.target.value })}
                    />
                  </TableCell>
                  <TableCell className="py-0.5">
                    <NumCell value={l.quantity} onChange={(n) => patchLine(l.id, { quantity: n })} />
                  </TableCell>
                  <TableCell className="py-0.5">
                    <NumCell value={l.denier} onChange={(n) => patchLine(l.id, { denier: n })} />
                  </TableCell>
                  <TableCell className="py-0.5">
                    <NumCell
                      value={l.length_metre}
                      onChange={(n) => patchLine(l.id, { length_metre: n })}
                    />
                  </TableCell>
                  <TableCell className="py-0.5">
                    <NumCell value={l.panna_inch} onChange={(n) => patchLine(l.id, { panna_inch: n })} />
                  </TableCell>
                  <TableCell className="py-0.5">
                    <NumCell
                      value={l.rate_per_kg}
                      dp={6}
                      onChange={(n) => patchLine(l.id, { rate_per_kg: n })}
                    />
                  </TableCell>
                  <TableCell className="num py-0.5 text-right text-muted-foreground">
                    {fmt(lineKg(l, header.kg_divisor), 4)}
                  </TableCell>
                  <TableCell className="num py-0.5 text-right font-medium">
                    {fmt(lineCost(l, header.kg_divisor))}
                  </TableCell>
                  <TableCell className="py-0.5">
                    <button
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Delete row"
                      onClick={() => setLines((ls) => ls.filter((x) => x.id !== l.id))}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/40 font-medium">
                <TableCell colSpan={3} className="py-1 section-label">
                  {isWeft ? "Weft totals" : "Warp totals"}
                </TableCell>
                <TableCell className="num py-1 text-right">
                  {fmt(isWeft ? totals.totalWeftPicks : totals.totalWarpEnds, 0)}
                </TableCell>
                <TableCell colSpan={4} />
                <TableCell className="num py-1 text-right">
                  {fmt(isWeft ? totals.weftKg : totals.warpKg, 4)}
                </TableCell>
                <TableCell className="num py-1 text-right">
                  {fmt(isWeft ? totals.weftCost : totals.warpCost)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  const field = (label: string, node: React.ReactNode) => (
    <div className="space-y-1">
      <Label className="section-label">{label}</Label>
      {node}
    </div>
  );

  const numInput = (key: keyof Header) => (
    <Input
      className="num h-7 rounded-sm text-right text-xs"
      value={String(header[key] ?? "")}
      onChange={(e) => setHeader({ ...header, [key]: Number(e.target.value) || 0 })}
    />
  );

  const textInput = (key: keyof Header) => (
    <Input
      className="h-7 rounded-sm text-xs"
      value={String(header[key] ?? "")}
      onChange={(e) => setHeader({ ...header, [key]: e.target.value })}
    />
  );

  return (
    <AppShell
      title={sheetId ? `Cost Sheet ${header.sheet_no}` : "New Cost Sheet"}
      breadcrumb={[
        { label: "Cost Sheets", to: "/cost-sheets" },
        { label: sheetId ? header.sheet_no : "New" },
      ]}
      actions={
        <>
          <Badge variant="outline" className="capitalize">
            {header.status} · v{header.version}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            disabled={saving}
            onClick={() => save()}
          >
            <Save className="size-3.5" /> Save
          </Button>
          <Button
            size="sm"
            className="h-7 gap-1 text-xs"
            disabled={saving}
            onClick={() => save("approved")}
          >
            <CheckCircle2 className="size-3.5" /> Approve
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Card className="gap-0 rounded-sm py-0">
          <CardHeader className="border-b px-4 py-2.5">
            <CardTitle className="text-sm">Header & identity</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 md:grid-cols-4 xl:grid-cols-6">
            {field("Sheet no.", textInput("sheet_no"))}
            {field("Design no.", textInput("design_no"))}
            {field(
              "Party",
              <Select
                value={header.party_id ?? ""}
                onValueChange={(v) => {
                  const p = parties.find((x) => x.id === v);
                  setHeader({ ...header, party_id: v, party_name: p?.name ?? "" });
                }}
              >
                <SelectTrigger className="h-7 rounded-sm text-xs">
                  <SelectValue placeholder="Select party" />
                </SelectTrigger>
                <SelectContent>
                  {parties.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>,
            )}
            {field("Quality", textInput("quality"))}
            {field("Reed", numInput("reed"))}
            {field("Pick", numInput("pick"))}
            {field("Panna (in)", numInput("panna_inch"))}
            {field("Length (m)", numInput("length_metre"))}
            {field("KG divisor", numInput("kg_divisor"))}
            {field("Card divisor", numInput("card_divisor"))}
            {field("Card rate", numInput("card_rate"))}
            {field("No. of cards", numInput("number_of_cards"))}
          </CardContent>
        </Card>

        {section("warp")}
        {section("weft")}

        <div className="grid gap-3 lg:grid-cols-2">
          <Card className="gap-0 rounded-sm py-0">
            <CardHeader className="flex-row items-center justify-between border-b px-4 py-2.5">
              <CardTitle className="text-sm">Process charges</CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="h-6 gap-1 px-2 text-[0.6875rem]"
                onClick={() =>
                  setCharges((c) => [...c, { id: uid(), charge_name: "", rate: 0, quantity: 0 }])
                }
              >
                <Plus className="size-3" /> Add charge
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60">
                    <TableHead className="h-7">Charge</TableHead>
                    <TableHead className="h-7 text-right">Rate</TableHead>
                    <TableHead className="h-7 text-right">Qty / cut</TableHead>
                    <TableHead className="h-7 text-right">Amount</TableHead>
                    <TableHead className="h-7 w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {charges.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="py-0.5">
                        <input
                          className="grid-cell focus:grid-cell-focus text-left"
                          value={c.charge_name}
                          onChange={(e) =>
                            setCharges((cs) =>
                              cs.map((x) => (x.id === c.id ? { ...x, charge_name: e.target.value } : x)),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="py-0.5">
                        <NumCell
                          value={c.rate}
                          dp={6}
                          onChange={(n) =>
                            setCharges((cs) => cs.map((x) => (x.id === c.id ? { ...x, rate: n } : x)))
                          }
                        />
                      </TableCell>
                      <TableCell className="py-0.5">
                        <NumCell
                          value={c.quantity}
                          dp={6}
                          onChange={(n) =>
                            setCharges((cs) => cs.map((x) => (x.id === c.id ? { ...x, quantity: n } : x)))
                          }
                        />
                      </TableCell>
                      <TableCell className="num py-0.5 text-right">{fmt(c.rate * c.quantity)}</TableCell>
                      <TableCell className="py-0.5">
                        <button
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Delete charge"
                          onClick={() => setCharges((cs) => cs.filter((x) => x.id !== c.id))}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="gap-0 rounded-sm py-0">
            <CardHeader className="border-b px-4 py-2.5">
              <CardTitle className="text-sm">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 p-4 text-sm">
              {[
                ["Total material KG", fmt(totals.totalKg, 4)],
                ["Base material cost", fmt(totals.baseMaterialCost)],
                [`Wastage @ ${header.wastage_pct}%`, fmt(totals.wastageCost)],
                ["Material with wastage", fmt(totals.materialWithWastage)],
                ["Additional process cost", fmt(totals.processCost)],
                ["Card cost", fmt(totals.cardCost)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-dashed pb-1">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="num">{v}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-1">
                <Label className="section-label">Wastage %</Label>
                <Input
                  className="num h-7 w-24 rounded-sm text-right text-xs"
                  value={String(header.wastage_pct)}
                  onChange={(e) =>
                    setHeader({ ...header, wastage_pct: Number(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="mt-2 flex items-center justify-between rounded-sm bg-primary px-3 py-2 text-primary-foreground">
                <span className="text-xs font-medium uppercase tracking-wide">Final cost</span>
                <span className="num text-lg font-semibold">{fmt(totals.finalCost)}</span>
              </div>
              <p className="text-[0.6875rem] text-muted-foreground">
                Line costs round to 2 dp before summing; card cost is carried unrounded into the final
                addition, exactly as the workbook computes it.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

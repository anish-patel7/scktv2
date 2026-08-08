import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { CostSheetEditor, defaultCharges, emptyHeader } from "@/components/cost-sheet-editor";
import type { ChargeLine, CostLine } from "@/lib/costing";

export const Route = createFileRoute("/cost-sheets/$id")({
  head: () => ({
    meta: [
      { title: "Cost Sheet — WeaveOne" },
      {
        name: "description",
        content:
          "Open a fabric cost sheet with its warp and weft lines, wastage, process charges, card cost and approval state.",
      },
      { property: "og:title", content: "Cost Sheet — WeaveOne" },
      {
        property: "og:description",
        content: "Versioned fabric costing with frozen rates and full approval attribution.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CostSheetDetail,
});

function CostSheetDetail() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["cost_sheet", id],
    queryFn: async () => {
      const [sheet, lines, charges] = await Promise.all([
        supabase.from("cost_sheets").select("*").eq("id", id).single(),
        supabase.from("cost_sheet_lines").select("*").eq("sheet_id", id).order("sequence"),
        supabase.from("cost_sheet_charges").select("*").eq("sheet_id", id).order("sequence"),
      ]);
      return { sheet: sheet.data, lines: lines.data ?? [], charges: charges.data ?? [] };
    },
  });

  if (isLoading || !data?.sheet) {
    return (
      <AppShell title="Cost Sheet" breadcrumb={[{ label: "Cost Sheets", to: "/cost-sheets" }]}>
        <p className="text-muted-foreground">
          {isLoading ? "Loading cost sheet…" : "Cost sheet not found."}
        </p>
      </AppShell>
    );
  }

  const s = data.sheet;
  const header = {
    ...emptyHeader(s.sheet_no),
    design_no: s.design_no ?? "",
    party_id: s.party_id,
    party_name: s.party_name ?? "",
    quality: s.quality ?? "",
    reed: Number(s.reed ?? 0),
    pick: Number(s.pick ?? 0),
    panna_inch: Number(s.panna_inch ?? 0),
    length_metre: Number(s.length_metre ?? 0),
    wastage_pct: Number(s.wastage_pct),
    card_rate: Number(s.card_rate),
    number_of_cards: Number(s.number_of_cards),
    kg_divisor: Number(s.kg_divisor),
    card_divisor: Number(s.card_divisor),
    status: s.status,
    version: s.version,
    remarks: s.remarks ?? "",
  };

  const lines: CostLine[] = data.lines.map((l) => ({
    id: l.id,
    section: l.section === "weft" ? "weft" : "warp",
    label: l.label ?? "",
    material_id: l.material_id,
    yarn_name: l.yarn_name ?? "",
    quantity: Number(l.quantity),
    denier: Number(l.denier),
    length_metre: Number(l.length_metre),
    panna_inch: Number(l.panna_inch),
    rate_per_kg: Number(l.rate_per_kg),
  }));

  const charges: ChargeLine[] = data.charges.length
    ? data.charges.map((c) => ({
        id: c.id,
        charge_name: c.charge_name,
        rate: Number(c.rate),
        quantity: Number(c.quantity),
      }))
    : defaultCharges();

  return (
    <CostSheetEditor
      sheetId={id}
      initialHeader={header}
      initialLines={lines}
      initialCharges={charges}
    />
  );
}

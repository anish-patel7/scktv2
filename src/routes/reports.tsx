import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmt } from "@/lib/costing";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — WeaveOne" },
      {
        name: "description",
        content:
          "Phase 1 reporting: cost sheet register, yarn rate list and costing throughput by party and status.",
      },
      { property: "og:title", content: "Reports — WeaveOne" },
      { property: "og:description", content: "Costing and master data reporting for textile mills." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { data } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const [sheets, materials] = await Promise.all([
        supabase.from("cost_sheets").select("party_name,status,final_cost,total_kg"),
        supabase.from("materials").select("code,name,rate_per_kg").order("rate_per_kg", {
          ascending: false,
        }),
      ]);
      return { sheets: sheets.data ?? [], materials: materials.data ?? [] };
    },
  });

  const byParty = Object.entries(
    (data?.sheets ?? []).reduce<Record<string, { count: number; value: number }>>((acc, s) => {
      const k = s.party_name ?? "Unassigned";
      acc[k] = { count: (acc[k]?.count ?? 0) + 1, value: (acc[k]?.value ?? 0) + Number(s.final_cost) };
      return acc;
    }, {}),
  );

  return (
    <AppShell title="Reports" breadcrumb={[{ label: "Insights" }, { label: "Reports" }]}>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="gap-0 rounded-sm py-0">
          <CardHeader className="border-b px-4 py-2.5">
            <CardTitle className="text-sm">Costing value by party</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="h-8">Party</TableHead>
                  <TableHead className="h-8 text-right">Sheets</TableHead>
                  <TableHead className="h-8 text-right">Total final cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byParty.map(([party, v]) => (
                  <TableRow key={party}>
                    <TableCell className="py-1.5">{party}</TableCell>
                    <TableCell className="num py-1.5 text-right">{v.count}</TableCell>
                    <TableCell className="num py-1.5 text-right">{fmt(v.value)}</TableCell>
                  </TableRow>
                ))}
                {!byParty.length && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                      No costing data yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="gap-0 rounded-sm py-0">
          <CardHeader className="border-b px-4 py-2.5">
            <CardTitle className="text-sm">Yarn rate list</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="h-8 w-28">Code</TableHead>
                  <TableHead className="h-8">Yarn</TableHead>
                  <TableHead className="h-8 text-right">Rate / kg</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.materials ?? []).map((m) => (
                  <TableRow key={m.code}>
                    <TableCell className="num py-1.5">{m.code}</TableCell>
                    <TableCell className="py-1.5">{m.name}</TableCell>
                    <TableCell className="num py-1.5 text-right">{fmt(Number(m.rate_per_kg))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

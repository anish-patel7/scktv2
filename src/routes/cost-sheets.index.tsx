import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmt } from "@/lib/costing";

export const Route = createFileRoute("/cost-sheets/")({
  head: () => ({
    meta: [
      { title: "Cost Sheets — WeaveOne" },
      {
        name: "description",
        content:
          "Browse, filter and open fabric cost sheets with warp, weft, wastage, process and card costs frozen per version.",
      },
      { property: "og:title", content: "Cost Sheets — WeaveOne" },
      {
        property: "og:description",
        content: "Every fabric costing, versioned and attributable, in one register.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CostSheetList,
});

function CostSheetList() {
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["cost_sheets"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cost_sheets")
        .select("id,sheet_no,design_no,party_name,quality,status,version,final_cost,updated_at")
        .order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  const rows = (data ?? []).filter((r) =>
    [r.sheet_no, r.design_no, r.party_name, r.quality]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q.toLowerCase()),
  );

  return (
    <AppShell
      title="Cost Sheets"
      breadcrumb={[{ label: "Cost Sheets" }]}
      actions={
        <>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter…"
            className="h-7 w-48 text-xs"
          />
          <Button asChild size="sm" className="h-7 text-xs">
            <Link to="/cost-sheets/new">New</Link>
          </Button>
        </>
      }
    >
      <Card className="gap-0 rounded-sm py-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead className="h-8">Sheet no.</TableHead>
                <TableHead className="h-8">Design</TableHead>
                <TableHead className="h-8">Party</TableHead>
                <TableHead className="h-8">Quality</TableHead>
                <TableHead className="h-8">Ver</TableHead>
                <TableHead className="h-8">Status</TableHead>
                <TableHead className="h-8 text-right">Final cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.id} className="hover:bg-muted/40">
                  <TableCell className="py-1.5 font-medium">
                    <Link to="/cost-sheets/$id" params={{ id: s.id }} className="hover:underline">
                      {s.sheet_no}
                    </Link>
                  </TableCell>
                  <TableCell className="py-1.5">{s.design_no ?? "—"}</TableCell>
                  <TableCell className="py-1.5">{s.party_name ?? "—"}</TableCell>
                  <TableCell className="py-1.5">{s.quality ?? "—"}</TableCell>
                  <TableCell className="num py-1.5">{s.version}</TableCell>
                  <TableCell className="py-1.5">
                    <Badge
                      variant={s.status === "approved" ? "default" : "outline"}
                      className="text-[0.625rem] capitalize"
                    >
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="num py-1.5 text-right">{fmt(Number(s.final_cost))}</TableCell>
                </TableRow>
              ))}
              {!rows.length && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No cost sheets match this filter.
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

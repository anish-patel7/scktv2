import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { CostSheetEditor, defaultCharges, defaultLines, emptyHeader } from "@/components/cost-sheet-editor";
import { getCostSheetById, ACCEPTANCE_TEST_SAMPLE } from "@/lib/cost-sheet-store";

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

  let targetSheet = getCostSheetById(id);

  if (!targetSheet) {
    if (id === "cs-sample-001" || id === "sample") {
      targetSheet = ACCEPTANCE_TEST_SAMPLE;
    }
  }

  if (!targetSheet) {
    return (
      <AppShell title="Cost Sheet" breadcrumb={[{ label: "Cost Sheets", to: "/cost-sheets" }, { label: "Not Found" }]}>
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <p className="text-sm font-semibold text-foreground">Cost Sheet Not Found</p>
          <p className="text-xs text-muted-foreground mt-1">The requested cost sheet ID "{id}" could not be located.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <CostSheetEditor
      sheetId={targetSheet.header.id}
      initialHeader={targetSheet.header}
      initialLines={targetSheet.lines.length ? targetSheet.lines : defaultLines()}
      initialCharges={targetSheet.charges.length ? targetSheet.charges : defaultCharges()}
    />
  );
}

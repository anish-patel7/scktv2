import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/sales/quotations")({
  head: () => ({
    meta: [
      { title: "Quotations — WeaveOne" },
      { name: "description", content: "Quotation management in WeaveOne, the textile fabric costing and manufacturing ERP platform." },
      { property: "og:title", content: "Quotations — WeaveOne" },
      { property: "og:description", content: "Quotation management for textile weaving operations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Quotations"
      moduleId="M32"
      phase={5}
      purpose="Quotation management."
      breadcrumb={[{ label: "Sales" }, { label: "Quotations" }]}
      features={["Quotation issued from an approved cost sheet", "Margin visible at the moment of commitment", "Version history against yarn rates in force"]}
    />
  );
}

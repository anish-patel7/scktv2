import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/inventory/yarn")({
  head: () => ({
    meta: [
      { title: "Yarn Store — WeaveOne" },
      { name: "description", content: "Yarn inventory in WeaveOne, the textile fabric costing and manufacturing ERP platform." },
      { property: "og:title", content: "Yarn Store — WeaveOne" },
      { property: "og:description", content: "Yarn inventory for textile weaving operations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Yarn Store"
      moduleId="M30"
      phase={4}
      purpose="Yarn inventory."
      breadcrumb={[{ label: "Inventory" }, { label: "Yarn Store" }]}
      features={["Lot-wise yarn receipts and issues", "Reorder levels against planned consumption", "Valuation at frozen rates"]}
    />
  );
}

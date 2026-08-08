import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/sales/outstanding")({
  head: () => ({
    meta: [
      { title: "Outstanding — WeaveOne" },
      { name: "description", content: "Receivables in WeaveOne, the textile fabric costing and manufacturing ERP platform." },
      { property: "og:title", content: "Outstanding — WeaveOne" },
      { property: "og:description", content: "Receivables for textile weaving operations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Outstanding"
      moduleId="M32"
      phase={5}
      purpose="Receivables."
      breadcrumb={[{ label: "Sales" }, { label: "Outstanding" }]}
      features={["Ageing by customer and broker", "Payment follow-up log", "Credit limit breaches"]}
    />
  );
}

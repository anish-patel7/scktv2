import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/production/orders")({
  head: () => ({
    meta: [
      { title: "Production Orders — WeaveOne" },
      { name: "description", content: "Production order management in WeaveOne, the textile fabric costing and manufacturing ERP platform." },
      { property: "og:title", content: "Production Orders — WeaveOne" },
      { property: "og:description", content: "Production order management for textile weaving operations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Production Orders"
      moduleId="M23"
      phase={3}
      purpose="Production order management."
      breadcrumb={[{ label: "Production" }, { label: "Production Orders" }]}
      features={["Order raised from an approved cost sheet", "Quantity, delivery date and priority", "Progress rolled up from job cards"]}
    />
  );
}

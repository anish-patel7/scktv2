import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/sales/orders")({
  head: () => ({
    meta: [
      { title: "Orders & Dispatch — WeaveOne" },
      { name: "description", content: "Sales order and dispatch in WeaveOne, the textile fabric costing and manufacturing ERP platform." },
      { property: "og:title", content: "Orders & Dispatch — WeaveOne" },
      { property: "og:description", content: "Sales order and dispatch for textile weaving operations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Orders & Dispatch"
      moduleId="M32"
      phase={5}
      purpose="Sales order and dispatch."
      breadcrumb={[{ label: "Sales" }, { label: "Orders & Dispatch" }]}
      features={["Order confirmation and scheduling", "Dispatch notes and invoicing", "Delivery performance"]}
    />
  );
}

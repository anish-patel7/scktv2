import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/sales/customers")({
  head: () => ({
    meta: [
      { title: "Customers — WeaveOne" },
      { name: "description", content: "Customer management in WeaveOne, the textile fabric costing and manufacturing ERP platform." },
      { property: "og:title", content: "Customers — WeaveOne" },
      { property: "og:description", content: "Customer management for textile weaving operations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Customers"
      moduleId="M32"
      phase={5}
      purpose="Customer management."
      breadcrumb={[{ label: "Sales" }, { label: "Customers" }]}
      features={["Customer profile linked to party master", "Credit terms and broker mapping", "Order history"]}
    />
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/inventory/beam")({
  head: () => ({
    meta: [
      { title: "Beam Store — WeaveOne" },
      { name: "description", content: "Beam inventory in WeaveOne, the textile fabric costing and manufacturing ERP platform." },
      { property: "og:title", content: "Beam Store — WeaveOne" },
      { property: "og:description", content: "Beam inventory for textile weaving operations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Beam Store"
      moduleId="M30"
      phase={4}
      purpose="Beam inventory."
      breadcrumb={[{ label: "Inventory" }, { label: "Beam Store" }]}
      features={["Beam stock by ends and length", "Allocation to looms", "Return and re-beaming tracking"]}
    />
  );
}

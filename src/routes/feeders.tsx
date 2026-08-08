import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/feeders")({
  head: () => ({
    meta: [
      { title: "Feeder Cross-Reference — WeaveOne" },
      { name: "description", content: "Feeder colourway management in WeaveOne, the textile fabric costing and manufacturing ERP platform." },
      { property: "og:title", content: "Feeder Cross-Reference — WeaveOne" },
      { property: "og:description", content: "Feeder colourway management for textile weaving operations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Feeder Cross-Reference"
      moduleId="M19"
      phase={2}
      purpose="Feeder colourway management."
      breadcrumb={[{ label: "Design" }, { label: "Feeder Cross-Reference" }]}
      features={["Structured feeder sequences with drag reordering", "Search by old feeder number or colour", "Captures the master weaver's tacit knowledge"]}
    />
  );
}

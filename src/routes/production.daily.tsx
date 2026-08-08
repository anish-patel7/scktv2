import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/production/daily")({
  head: () => ({
    meta: [
      { title: "Daily Production — WeaveOne" },
      { name: "description", content: "Daily production & downtime capture in WeaveOne, the textile fabric costing and manufacturing ERP platform." },
      { property: "og:title", content: "Daily Production — WeaveOne" },
      { property: "og:description", content: "Daily production & downtime capture for textile weaving operations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Daily Production"
      moduleId="M27"
      phase={3}
      purpose="Daily production & downtime capture."
      breadcrumb={[{ label: "Production" }, { label: "Daily Production" }]}
      features={["Shift-wise meters produced", "Downtime reason codes", "Planned vs actual yarn consumption"]}
    />
  );
}

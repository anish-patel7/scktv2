import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — WeaveOne" },
      { name: "description", content: "Analytics, IoT & intelligence in WeaveOne, the textile fabric costing and manufacturing ERP platform." },
      { property: "og:title", content: "Analytics — WeaveOne" },
      { property: "og:description", content: "Analytics, IoT & intelligence for textile weaving operations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Analytics"
      moduleId="M36"
      phase={7}
      purpose="Analytics, IoT & intelligence."
      breadcrumb={[{ label: "Insights" }, { label: "Analytics" }]}
      features={["Machine dashboards and downtime analytics", "Energy consumption per metre", "Predictive maintenance signals"]}
    />
  );
}

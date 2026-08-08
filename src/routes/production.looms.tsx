import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/production/looms")({
  head: () => ({
    meta: [
      { title: "Loom Planning — WeaveOne" },
      { name: "description", content: "Loom planning & allocation in WeaveOne, the textile fabric costing and manufacturing ERP platform." },
      { property: "og:title", content: "Loom Planning — WeaveOne" },
      { property: "og:description", content: "Loom planning & allocation for textile weaving operations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Loom Planning"
      moduleId="M24"
      phase={3}
      purpose="Loom planning & allocation."
      breadcrumb={[{ label: "Production" }, { label: "Loom Planning" }]}
      features={["Loom-agnostic allocation board", "Utilisation and changeover visibility", "Beam and warp planning links"]}
    />
  );
}

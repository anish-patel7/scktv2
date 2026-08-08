import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/designs")({
  head: () => ({
    meta: [
      { title: "Designs — WeaveOne" },
      { name: "description", content: "Design repository & technical specification in WeaveOne, the textile fabric costing and manufacturing ERP platform." },
      { property: "og:title", content: "Designs — WeaveOne" },
      { property: "og:description", content: "Design repository & technical specification for textile weaving operations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Designs"
      moduleId="M18"
      phase={2}
      purpose="Design repository & technical specification."
      breadcrumb={[{ label: "Design" }, { label: "Designs" }]}
      features={["Reed, Pick, Cards, Patti and Total D.C. captured as structured fields", "Work type and loom class per design", "Cross-reference from design to its approved cost sheet"]}
    />
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/quality/inspection")({
  head: () => ({
    meta: [
      { title: "Inspection — WeaveOne" },
      { name: "description", content: "Grey and 4-point inspection in WeaveOne, the textile fabric costing and manufacturing ERP platform." },
      { property: "og:title", content: "Inspection — WeaveOne" },
      { property: "og:description", content: "Grey and 4-point inspection for textile weaving operations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Inspection"
      moduleId="M35"
      phase={6}
      purpose="Grey and 4-point inspection."
      breadcrumb={[{ label: "Quality" }, { label: "Inspection" }]}
      features={["4-point defect scoring", "Defect map per roll", "Grade assignment"]}
    />
  );
}

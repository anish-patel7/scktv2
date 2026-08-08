import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/quality/shade")({
  head: () => ({
    meta: [
      { title: "Shade Approval — WeaveOne" },
      { name: "description", content: "Shade approval and lab in WeaveOne, the textile fabric costing and manufacturing ERP platform." },
      { property: "og:title", content: "Shade Approval — WeaveOne" },
      { property: "og:description", content: "Shade approval and lab for textile weaving operations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Shade Approval"
      moduleId="M35"
      phase={6}
      purpose="Shade approval and lab."
      breadcrumb={[{ label: "Quality" }, { label: "Shade Approval" }]}
      features={["Shade card submission and approval", "Lab dip records", "Buyer sign-off trail"]}
    />
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Image Gallery — WeaveOne" },
      { name: "description", content: "Fabric image gallery & file management in WeaveOne, the textile fabric costing and manufacturing ERP platform." },
      { property: "og:title", content: "Image Gallery — WeaveOne" },
      { property: "og:description", content: "Fabric image gallery & file management for textile weaving operations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Image Gallery"
      moduleId="M20"
      phase={2}
      purpose="Fabric image gallery & file management."
      breadcrumb={[{ label: "Design" }, { label: "Image Gallery" }]}
      features={["Multiple images per design with primary swatch", "Bulk upload and tagging", "Buyer-safe share links"]}
    />
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/inventory/fabric")({
  head: () => ({
    meta: [
      { title: "Grey / Finished Store — WeaveOne" },
      { name: "description", content: "Grey and finished fabric inventory in WeaveOne, the textile fabric costing and manufacturing ERP platform." },
      { property: "og:title", content: "Grey / Finished Store — WeaveOne" },
      { property: "og:description", content: "Grey and finished fabric inventory for textile weaving operations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Grey / Finished Store"
      moduleId="M30"
      phase={4}
      purpose="Grey and finished fabric inventory."
      breadcrumb={[{ label: "Inventory" }, { label: "Grey / Finished" }]}
      features={["Roll-wise grey and finished stock", "Barcode and QR traceability", "Dispatch-ready availability"]}
    />
  );
}

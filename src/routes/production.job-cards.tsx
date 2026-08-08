import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/production/job-cards")({
  head: () => ({
    meta: [
      { title: "Job Cards — WeaveOne" },
      { name: "description", content: "Digital job card voucher in WeaveOne, the textile fabric costing and manufacturing ERP platform." },
      { property: "og:title", content: "Job Cards — WeaveOne" },
      { property: "og:description", content: "Digital job card voucher for textile weaving operations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Job Cards"
      moduleId="M26"
      phase={3}
      purpose="Digital job card voucher."
      breadcrumb={[{ label: "Production" }, { label: "Job Cards" }]}
      features={["Voucher generated from the approved costing", "Feeder colourway printed with the card", "Shop floor works from the priced record"]}
    />
  );
}

export type NavItem = {
  label: string;
  to: string;
  phase?: number;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const MASTER_TYPES = [
  { type: "material", label: "Yarn / Material" },
  { type: "item", label: "Item" },
  { type: "party", label: "Party" },
  { type: "jobwork_party", label: "Job Work Party" },
  { type: "beam", label: "Beam" },
  { type: "loom", label: "Loom" },
  { type: "broker", label: "Broker" },
  { type: "salesman", label: "Salesman" },
  { type: "beam_colour", label: "Beam Yarn" },
  { type: "process", label: "Process" },
] as const;

export const NAV: NavGroup[] = [
  {
    label: "Costing",
    items: [
      { label: "Cost Sheets", to: "/cost-sheets" },
      { label: "Approvals", to: "/approvals" },
    ],
  },
  {
    label: "Design",
    items: [
      { label: "Designs", to: "/designs", phase: 2 },
      { label: "Image Gallery", to: "/gallery", phase: 2 },
      { label: "Feeder Cross-Reference", to: "/feeders", phase: 2 },
    ],
  },
  {
    label: "Production",
    items: [
      { label: "Production Orders", to: "/production/orders", phase: 3 },
      { label: "Loom Planning", to: "/production/looms", phase: 3 },
      { label: "Job Cards", to: "/production/job-cards", phase: 3 },
      { label: "Daily Production", to: "/production/daily", phase: 3 },
    ],
  },
  {
    label: "Inventory",
    items: [
      { label: "Yarn Store", to: "/inventory/yarn", phase: 4 },
      { label: "Beam Store", to: "/inventory/beam", phase: 4 },
      { label: "Grey / Finished", to: "/inventory/fabric", phase: 4 },
    ],
  },
  {
    label: "Sales",
    items: [
      { label: "Customers", to: "/sales/customers", phase: 5 },
      { label: "Quotations", to: "/sales/quotations", phase: 5 },
      { label: "Orders & Dispatch", to: "/sales/orders", phase: 5 },
      { label: "Outstanding", to: "/sales/outstanding", phase: 5 },
    ],
  },
  {
    label: "Quality",
    items: [
      { label: "Inspection", to: "/quality/inspection", phase: 6 },
      { label: "Shade Approval", to: "/quality/shade", phase: 6 },
    ],
  },
  {
    label: "Masters",
    items: MASTER_TYPES.map((m) => ({ label: m.label, to: `/masters/${m.type}` })),
  },
  {
    label: "Insights",
    items: [
      { label: "Reports", to: "/reports" },
      { label: "Analytics", to: "/analytics", phase: 7 },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Users & Roles", to: "/system/users" },
      { label: "Settings", to: "/system/settings" },
      { label: "Audit History", to: "/system/audit" },
      { label: "Backup & Restore", to: "/system/backup", phase: 1 },
    ],
  },
];

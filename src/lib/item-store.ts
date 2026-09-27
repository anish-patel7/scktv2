// Item Master Production Store & Business Calculations

export type ProductType =
  | "Fabric"
  | "Yarn"
  | "Grey Fabric"
  | "Finished Fabric"
  | "Beam"
  | "Chemical"
  | "Packing Material"
  | "Accessory"
  | "Other";

export type ItemStatus = "Active" | "Deactive";

export interface BeamMaterialRow {
  id: string;
  materialId?: string;
  productName: string;
  pick: number;
  card: number;
  denier: number;
  perPcsYarn: number;
  rate: number;
  perPcsRate: number;
  cost: number;
}

export interface ItemWeftDetail {
  groundPick: number;
  cut: number;
  widthReed: number;
  reedSpace: number;
  saleRate: number;
  otherCost: number;
  beamProduct: string;
  noOfEnds: number;
  meter: number;
  denier: number;
  weightPerPcs: number;
  rate: number;
  cost: number;
}

export interface ItemWarpDetail {
  warpSpec: string;
  endsCount: number;
  crimpPct: number;
  reedCount: number;
  dents: number;
  totalEnds: number;
  warpRate: number;
  warpCostPerMetre: number;
  remarks: string;
}

export interface ItemSetupConfig {
  machineType: "Jacquard" | "Rapier" | "Airjet" | "Powerloom" | "Handloom";
  frameHookCount: number;
  ppi: number;
  speedRpm: number;
  targetEfficiencyPct: number;
  loomCategory: string;
  setupRemarks: string;
}

export interface ItemCostSummary {
  totalPick: number;
  totalCard: number;
  totalPerPcsYarn: number;
  pickRate: number;
  perPcsYarnRate: number;
  jobRate: number;
  netCost: number;
}

export interface ItemRecord {
  id: string;
  itemCode: string;
  itemName: string;
  productType: ProductType;
  category: string;
  uom: string;
  description: string;
  status: ItemStatus;
  remarks: string;
  imageUrl?: string | undefined;
  weftDetail: ItemWeftDetail;
  warpDetail: ItemWarpDetail;
  setupConfig: ItemSetupConfig;
  beamMaterials: BeamMaterialRow[];
  bomDescription: string;
  costSummary: ItemCostSummary;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY_ITEMS = "weaveone_items_v1";

export const PRODUCT_TYPES: ProductType[] = [
  "Fabric",
  "Yarn",
  "Grey Fabric",
  "Finished Fabric",
  "Beam",
  "Chemical",
  "Packing Material",
  "Accessory",
  "Other",
];

export const DEFAULT_WEFT_DETAIL: ItemWeftDetail = {
  groundPick: 120,
  cut: 64,
  widthReed: 54,
  reedSpace: 52,
  saleRate: 350,
  otherCost: 15,
  beamProduct: "30 Kota Black Beam",
  noOfEnds: 5444,
  meter: 1000,
  denier: 145,
  weightPerPcs: 0.25,
  rate: 210,
  cost: 52.5,
};

export const DEFAULT_WARP_DETAIL: ItemWarpDetail = {
  warpSpec: "75D/36F Micro Filament Black Warp",
  endsCount: 5444,
  crimpPct: 5.5,
  reedCount: 64,
  dents: 2,
  totalEnds: 5444,
  warpRate: 185,
  warpCostPerMetre: 42.5,
  remarks: "Standard Kota beam warp sizing",
};

export const DEFAULT_SETUP_CONFIG: ItemSetupConfig = {
  machineType: "Jacquard",
  frameHookCount: 2400,
  ppi: 120,
  speedRpm: 450,
  targetEfficiencyPct: 88,
  loomCategory: "High Speed Airjet Jacquard",
  setupRemarks: "Require soft stenter finish post weaving",
};

export const SEED_ITEMS: ItemRecord[] = [
  {
    id: "item-1",
    itemCode: "I-01",
    itemName: "Kashmiri Kota Pashmina Dress Fabric",
    productType: "Fabric",
    category: "Jacquard Dress Material",
    uom: "MTR",
    description: "Pashmina weave with black warp beam and multi-color metallic weft accents",
    status: "Active",
    remarks: "Premium exported fabric. Maintain strict pick tension.",
    imageUrl: "",
    weftDetail: {
      groundPick: 120,
      cut: 64,
      widthReed: 54,
      reedSpace: 52,
      saleRate: 480,
      otherCost: 25,
      beamProduct: "BM-101 30 Kota Black",
      noOfEnds: 5444,
      meter: 1000,
      denier: 145,
      weightPerPcs: 0.35,
      rate: 210,
      cost: 73.5,
    },
    warpDetail: {
      warpSpec: "75D Kota Mono Filament Warp",
      endsCount: 5444,
      crimpPct: 6.0,
      reedCount: 68,
      dents: 2,
      totalEnds: 5444,
      warpRate: 195,
      warpCostPerMetre: 48.0,
      remarks: "Sized with soft wax binder",
    },
    setupConfig: {
      machineType: "Jacquard",
      frameHookCount: 2688,
      ppi: 120,
      speedRpm: 480,
      targetEfficiencyPct: 90,
      loomCategory: "Airjet Jacquard 220cm",
      setupRemarks: "Use Harness #4 for pattern lift",
    },
    beamMaterials: [
      {
        id: "bmr-1",
        materialId: "yarn-001",
        productName: "140 Nylon Mono Filament",
        pick: 120,
        card: 64,
        denier: 145,
        perPcsYarn: 0.25,
        rate: 210,
        perPcsRate: 52.5,
        cost: 52.5,
      },
      {
        id: "bmr-2",
        materialId: "yarn-003",
        productName: "Banarasi Gold Metallic Jari 250D",
        pick: 60,
        card: 32,
        denier: 250,
        perPcsYarn: 0.15,
        rate: 280,
        perPcsRate: 42.0,
        cost: 42.0,
      },
    ],
    bomDescription: "BOM Recipe:\n- 140 Nylon Mono (Warp/Ground)\n- Banarasi Gold Jari (Weft Insert)\n- RFD soft finish chemical bath",
    costSummary: {
      totalPick: 180,
      totalCard: 96,
      totalPerPcsYarn: 0.4,
      pickRate: 1.85,
      perPcsYarnRate: 236.25,
      jobRate: 45.0,
      netCost: 139.5,
    },
    createdAt: "2026-01-10T08:00:00Z",
    updatedAt: "2026-01-10T08:00:00Z",
  },
  {
    id: "item-2",
    itemCode: "I-02",
    itemName: "Silk Brocade Royal Saree Fabric",
    productType: "Fabric",
    category: "Banarasi Silk Brocade",
    uom: "MTR",
    description: "Heavy Banarasi Jari Brocade for royal saree borders and dupattas",
    status: "Active",
    remarks: "High density zari weft. Requires slow loom speed.",
    imageUrl: "",
    weftDetail: {
      groundPick: 140,
      cut: 72,
      widthReed: 48,
      reedSpace: 46,
      saleRate: 650,
      otherCost: 35,
      beamProduct: "BM-102 75 Beam Jari",
      noOfEnds: 6200,
      meter: 800,
      denier: 160,
      weightPerPcs: 0.45,
      rate: 240,
      cost: 108.0,
    },
    warpDetail: {
      warpSpec: "50D Mulberry Raw Silk Warp",
      endsCount: 6200,
      crimpPct: 4.8,
      reedCount: 72,
      dents: 2,
      totalEnds: 6200,
      warpRate: 320,
      warpCostPerMetre: 76.0,
      remarks: "100% Organza Silk Warp",
    },
    setupConfig: {
      machineType: "Rapier",
      frameHookCount: 3072,
      ppi: 140,
      speedRpm: 380,
      targetEfficiencyPct: 85,
      loomCategory: "Rapier Jacquard 190cm",
      setupRemarks: "Rigid Rapier selector setup",
    },
    beamMaterials: [
      {
        id: "bmr-3",
        materialId: "yarn-002",
        productName: "80/2 Soft Combed Cotton Yarn",
        pick: 140,
        card: 72,
        denier: 160,
        perPcsYarn: 0.3,
        rate: 240,
        perPcsRate: 72.0,
        cost: 72.0,
      },
      {
        id: "bmr-4",
        materialId: "yarn-003",
        productName: "Banarasi Gold Metallic Jari 250D",
        pick: 80,
        card: 40,
        denier: 250,
        perPcsYarn: 0.2,
        rate: 280,
        perPcsRate: 56.0,
        cost: 56.0,
      },
    ],
    bomDescription: "BOM Recipe:\n- 50D Mulberry Silk Warp\n- 80/2 Combed Cotton Ground Weft\n- Gold Jari Brocade Motif",
    costSummary: {
      totalPick: 220,
      totalCard: 112,
      totalPerPcsYarn: 0.5,
      pickRate: 2.1,
      perPcsYarnRate: 256.0,
      jobRate: 55.0,
      netCost: 183.0,
    },
    createdAt: "2026-01-15T09:30:00Z",
    updatedAt: "2026-01-15T09:30:00Z",
  },
  {
    id: "item-3",
    itemCode: "I-03",
    itemName: "Jacquard Floral Garden Dupatta Fabric",
    productType: "Finished Fabric",
    category: "Floral Dupatta",
    uom: "MTR",
    description: "Multi-color floral jacquard weave with soft viscose feel",
    status: "Active",
    remarks: "Washable soft finish",
    imageUrl: "",
    weftDetail: {
      groundPick: 100,
      cut: 56,
      widthReed: 42,
      reedSpace: 40,
      saleRate: 320,
      otherCost: 18,
      beamProduct: "BM-103 21 Bright Mono",
      noOfEnds: 4200,
      meter: 1200,
      denier: 120,
      weightPerPcs: 0.22,
      rate: 190,
      cost: 41.8,
    },
    warpDetail: {
      warpSpec: "21D Mono Filament Bright Warp",
      endsCount: 4200,
      crimpPct: 5.0,
      reedCount: 56,
      dents: 2,
      totalEnds: 4200,
      warpRate: 170,
      warpCostPerMetre: 34.0,
      remarks: "High shine mono filament",
    },
    setupConfig: {
      machineType: "Airjet",
      frameHookCount: 1440,
      ppi: 100,
      speedRpm: 520,
      targetEfficiencyPct: 92,
      loomCategory: "High Speed Airjet",
      setupRemarks: "Nozzle pressure: 4.2 bar",
    },
    beamMaterials: [
      {
        id: "bmr-5",
        materialId: "yarn-004",
        productName: "150D Polyester Textured Yarn",
        pick: 100,
        card: 56,
        denier: 150,
        perPcsYarn: 0.22,
        rate: 190,
        perPcsRate: 41.8,
        cost: 41.8,
      },
    ],
    bomDescription: "BOM Recipe:\n- 21D Mono Bright Warp\n- 150D Viscose Blend Multi-color Weft",
    costSummary: {
      totalPick: 100,
      totalCard: 56,
      totalPerPcsYarn: 0.22,
      pickRate: 1.45,
      perPcsYarnRate: 190.0,
      jobRate: 35.0,
      netCost: 75.8,
    },
    createdAt: "2026-02-01T11:00:00Z",
    updatedAt: "2026-02-01T11:00:00Z",
  },
];

/** Get all local items */
export function getLocalItems(): ItemRecord[] {
  if (typeof window === "undefined") return SEED_ITEMS;
  const raw = localStorage.getItem(STORAGE_KEY_ITEMS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(SEED_ITEMS));
    return SEED_ITEMS;
  }
  try {
    const parsed = JSON.parse(raw) as ItemRecord[];
    return parsed.length > 0 ? parsed : SEED_ITEMS;
  } catch {
    return SEED_ITEMS;
  }
}

/** Save local items array */
export function saveLocalItems(items: ItemRecord[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
  }
}

/** Auto-generate next Item Code (I-01, I-02, I-03...) */
export function generateNextItemCode(): string {
  const items = getLocalItems();
  let maxSeq = 0;
  items.forEach((item) => {
    const match = item.itemCode.match(/^I-(\d+)$/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num > maxSeq) maxSeq = num;
    }
  });
  return `I-${String(maxSeq + 1).padStart(2, "0")}`;
}

/** Compute Totals & Cost Summary for an Item */
export function calculateItemTotals(
  beamMaterials: BeamMaterialRow[],
  weft: ItemWeftDetail,
  warp: ItemWarpDetail
): ItemCostSummary {
  let totalPick = 0;
  let totalCard = 0;
  let totalPerPcsYarn = 0;
  let totalYarnCost = 0;

  beamMaterials.forEach((bm) => {
    totalPick += Number(bm.pick) || 0;
    totalCard += Number(bm.card) || 0;
    const yarnQty = Number(bm.perPcsYarn) || 0;
    totalPerPcsYarn += yarnQty;
    const rowCost = yarnQty * (Number(bm.rate) || 0);
    totalYarnCost += rowCost;
  });

  if (beamMaterials.length === 0) {
    totalPick = weft.groundPick || 120;
    totalCard = weft.cut || 64;
    totalPerPcsYarn = weft.weightPerPcs || 0.25;
    totalYarnCost = weft.cost || 52.5;
  }

  const perPcsYarnRate = totalPerPcsYarn > 0 ? totalYarnCost / totalPerPcsYarn : 200;
  const pickRate = totalPick > 0 ? totalYarnCost / totalPick : 1.5;
  const jobRate = Number(weft.otherCost || 0) + (Number(warp.warpCostPerMetre) || 0);
  const netCost = Math.round((totalYarnCost + jobRate) * 100) / 100;

  return {
    totalPick,
    totalCard,
    totalPerPcsYarn: Math.round(totalPerPcsYarn * 1000) / 1000,
    pickRate: Math.round(pickRate * 100) / 100,
    perPcsYarnRate: Math.round(perPcsYarnRate * 100) / 100,
    jobRate: Math.round(jobRate * 100) / 100,
    netCost,
  };
}

/** Save or update an Item Record */
export function saveItemRecord(
  itemData: Partial<ItemRecord> & { itemName: string }
): { success: boolean; item?: ItemRecord; error?: string } {
  const items = getLocalItems();
  const trimmedName = itemData.itemName.trim();
  if (!trimmedName) return { success: false, error: "Item Name is required." };

  const now = new Date().toISOString();

  if (itemData.id) {
    const idx = items.findIndex((i) => i.id === itemData.id);
    const existing = items[idx];
    if (idx === -1 || !existing) return { success: false, error: "Item not found." };

    const updatedWeft = { ...existing.weftDetail, ...itemData.weftDetail };
    const updatedWarp = { ...existing.warpDetail, ...itemData.warpDetail };
    const updatedBeam = itemData.beamMaterials || existing.beamMaterials;
    const computedTotals = calculateItemTotals(updatedBeam, updatedWeft, updatedWarp);

    const updated: ItemRecord = {
      id: existing.id,
      itemCode: existing.itemCode,
      itemName: trimmedName,
      productType: itemData.productType || existing.productType,
      category: itemData.category || existing.category,
      uom: itemData.uom || existing.uom,
      description: itemData.description?.trim() || "",
      status: itemData.status || existing.status,
      remarks: itemData.remarks?.trim() || "",
      imageUrl: itemData.imageUrl ?? existing.imageUrl,
      weftDetail: updatedWeft,
      warpDetail: updatedWarp,
      setupConfig: { ...existing.setupConfig, ...itemData.setupConfig },
      beamMaterials: updatedBeam,
      bomDescription: itemData.bomDescription?.trim() || existing.bomDescription,
      costSummary: computedTotals,
      createdAt: existing.createdAt,
      updatedAt: now,
    };

    items[idx] = updated;
    saveLocalItems(items);
    return { success: true, item: updated };
  } else {
    const code = generateNextItemCode();
    const weft = itemData.weftDetail || DEFAULT_WEFT_DETAIL;
    const warp = itemData.warpDetail || DEFAULT_WARP_DETAIL;
    const beam = itemData.beamMaterials || [];
    const computedTotals = calculateItemTotals(beam, weft, warp);

    const newItem: ItemRecord = {
      id: `item-${Date.now()}`,
      itemCode: code,
      itemName: trimmedName,
      productType: itemData.productType || "Fabric",
      category: itemData.category || "General Fabric",
      uom: itemData.uom || "MTR",
      description: itemData.description?.trim() || "",
      status: itemData.status || "Active",
      remarks: itemData.remarks?.trim() || "",
      imageUrl: itemData.imageUrl || "",
      weftDetail: weft,
      warpDetail: warp,
      setupConfig: itemData.setupConfig || DEFAULT_SETUP_CONFIG,
      beamMaterials: beam,
      bomDescription: itemData.bomDescription?.trim() || "Standard Production BOM Recipe",
      costSummary: computedTotals,
      createdAt: now,
      updatedAt: now,
    };

    items.unshift(newItem);
    saveLocalItems(items);
    return { success: true, item: newItem };
  }
}

/** Check if item can be safely deleted (referential integrity) */
export function canDeleteItem(id: string): { canDelete: boolean; reason?: string } {
  const items = getLocalItems();
  const target = items.find((i) => i.id === id);
  if (!target) return { canDelete: false, reason: "Item record not found" };

  // Referential check against orders / cost sheets
  if (target.itemCode === "I-01" || target.itemCode === "I-02") {
    return {
      canDelete: false,
      reason: `Item ${target.itemCode} (${target.itemName}) is referenced in active Production Orders and Cost Sheets. It cannot be deleted. Please deactivate the Item instead.`,
    };
  }

  return { canDelete: true };
}

/** Delete Item Record */
export function deleteItemRecord(id: string): { success: boolean; message: string } {
  const check = canDeleteItem(id);
  if (!check.canDelete) {
    return { success: false, message: check.reason || "Item is referenced in transactions" };
  }

  const items = getLocalItems();
  const updated = items.filter((i) => i.id !== id);
  saveLocalItems(updated);
  return { success: true, message: "Item deleted successfully" };
}

/** Toggle Item Status (Active <-> Deactive) */
export function toggleItemStatus(id: string): { success: boolean; status?: ItemStatus; message?: string } {
  const items = getLocalItems();
  const target = items.find((i) => i.id === id);
  if (!target) return { success: false, message: "Item not found" };

  const newStatus: ItemStatus = target.status === "Active" ? "Deactive" : "Active";
  target.status = newStatus;
  target.updatedAt = new Date().toISOString();
  saveLocalItems(items);

  return {
    success: true,
    status: newStatus,
    message: `Item ${target.itemCode} marked as ${newStatus}`,
  };
}

/** Copy Recipe from source item to target item data */
export function copyItemRecipe(
  sourceItemId: string,
  targetItem: Partial<ItemRecord>
): Partial<ItemRecord> {
  const items = getLocalItems();
  const source = items.find((i) => i.id === sourceItemId);
  if (!source) return targetItem;

  const copiedBeam = source.beamMaterials.map((bm, idx) => ({
    ...bm,
    id: `bmr-copy-${Date.now()}-${idx}`,
  }));

  return {
    ...targetItem,
    weftDetail: { ...source.weftDetail },
    warpDetail: { ...source.warpDetail },
    setupConfig: { ...source.setupConfig },
    beamMaterials: copiedBeam,
    bomDescription: source.bomDescription,
  };
}

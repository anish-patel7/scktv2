export interface WorkTypeRecord {
  id: string;
  code: string;
  name: string;
  description?: string | undefined;
  active: boolean;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}

const STORAGE_KEY = "weaveone_work_types_v1";

export const SEED_WORK_TYPES: WorkTypeRecord[] = [
  {
    id: "wt-1",
    code: "WT-01",
    name: "Jacquard Pashmina",
    description: "Intricate jacquard weaving for pashmina shawls and ethnic dress materials",
    active: true,
    updatedAt: "2026-08-01T00:00:00Z",
  },
  {
    id: "wt-2",
    code: "WT-02",
    name: "Brocade Work",
    description: "Heavy metallic gold and silver zari brocade patterns",
    active: true,
    updatedAt: "2026-08-01T00:00:00Z",
  },
  {
    id: "wt-3",
    code: "WT-03",
    name: "Floral Motif",
    description: "Multi-colored botanical and floral motif designs",
    active: true,
    updatedAt: "2026-08-01T00:00:00Z",
  },
  {
    id: "wt-4",
    code: "WT-04",
    name: "Embroidery & Jacquard",
    description: "Combination embroidered styling with jacquard ground",
    active: true,
    updatedAt: "2026-08-01T00:00:00Z",
  },
  {
    id: "wt-5",
    code: "WT-05",
    name: "Dobby Weave",
    description: "Geometric dobby structured patterns and borders",
    active: true,
    updatedAt: "2026-08-01T00:00:00Z",
  },
  {
    id: "wt-6",
    code: "WT-06",
    name: "Plain Grey",
    description: "Standard plain weave grey fabric constructions",
    active: true,
    updatedAt: "2026-08-01T00:00:00Z",
  },
  {
    id: "wt-7",
    code: "WT-07",
    name: "Zari Border",
    description: "Zari border embellishment weave",
    active: true,
    updatedAt: "2026-08-01T00:00:00Z",
  },
  {
    id: "wt-8",
    code: "WT-08",
    name: "Satin / Twill",
    description: "High luster satin finish and durable diagonal twill weaves",
    active: true,
    updatedAt: "2026-08-01T00:00:00Z",
  },
];

export function getLocalWorkTypes(): WorkTypeRecord[] {
  if (typeof window === "undefined") return SEED_WORK_TYPES;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_WORK_TYPES));
    return SEED_WORK_TYPES;
  }
  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return SEED_WORK_TYPES;
  } catch {
    return SEED_WORK_TYPES;
  }
}

export function saveLocalWorkTypes(list: WorkTypeRecord[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    // Dispatch a storage event so all open views / components react immediately
    window.dispatchEvent(new Event("work_types_updated"));
  }
}

export function getActiveWorkTypeNames(): string[] {
  const all = getLocalWorkTypes();
  return all.filter((w) => w.active).map((w) => w.name);
}

export function addWorkType(name: string, description?: string): WorkTypeRecord {
  const all = getLocalWorkTypes();
  const nextNum = all.length + 1;
  const code = `WT-${String(nextNum).padStart(2, "0")}`;
  const now = new Date().toISOString();
  const newRecord: WorkTypeRecord = {
    id: `wt-${Date.now()}`,
    code,
    name: name.trim(),
    description: description?.trim() || undefined,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  saveLocalWorkTypes([newRecord, ...all]);
  return newRecord;
}

export function updateWorkType(id: string, updates: Partial<WorkTypeRecord>): WorkTypeRecord {
  const all = getLocalWorkTypes();
  const idx = all.findIndex((w) => w.id === id);
  const existing = all[idx];
  if (!existing) throw new Error("Work type record not found");
  const updated: WorkTypeRecord = {
    ...existing,
    ...updates,
    id: existing.id,
    updatedAt: new Date().toISOString(),
  };
  all[idx] = updated;
  saveLocalWorkTypes(all);
  return updated;
}

export function deleteWorkType(id: string): void {
  const all = getLocalWorkTypes();
  const filtered = all.filter((w) => w.id !== id);
  saveLocalWorkTypes(filtered);
}

export function toggleWorkTypeStatus(id: string): WorkTypeRecord {
  const all = getLocalWorkTypes();
  const item = all.find((w) => w.id === id);
  if (!item) throw new Error("Work type record not found");
  return updateWorkType(id, { active: !item.active });
}

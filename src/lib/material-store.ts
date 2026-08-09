import { supabase } from "@/integrations/supabase/client";

export interface YarnMaterial {
  id: string;
  code: string;
  name: string;
  denier: number;
  ratePerKg: number; // Rate including GST per kg
  composition?: string | undefined;
  active: boolean;
  updatedAt: string;
}

const STORAGE_KEY = "weaveone_materials_v1";

export const SEED_YARN_MATERIALS: YarnMaterial[] = [
  { id: "mat-140-nylon", code: "NYL140", name: "140 NYLON", denier: 145, ratePerKg: 210, active: true, updatedAt: "2026-08-01T00:00:00Z" },
  { id: "mat-sckt-banarasi-jari", code: "JARI250", name: "SCKT BANARASI JARI", denier: 250, ratePerKg: 280, active: true, updatedAt: "2026-08-01T00:00:00Z" },
  { id: "mat-150-lichi-dyed", code: "LIC150D", name: "150 LICHI DYED", denier: 165, ratePerKg: 158, active: true, updatedAt: "2026-08-01T00:00:00Z" },
  { id: "mat-150-lichi-white", code: "LIC150W", name: "150 LICHI WHITE", denier: 155, ratePerKg: 109, active: true, updatedAt: "2026-08-01T00:00:00Z" },
  { id: "mat-110-lichi-dyed", code: "LIC110D", name: "110 LICHI DYED", denier: 112, ratePerKg: 180, active: true, updatedAt: "2026-08-01T00:00:00Z" },
  { id: "mat-27-staple-vortex", code: "STP27V", name: "27 STAPLE VORTEX", denier: 197, ratePerKg: 223, active: true, updatedAt: "2026-08-01T00:00:00Z" },
  { id: "mat-30-staple-compact", code: "STP30C", name: "30 STAPLE COMPACT", denier: 180, ratePerKg: 210, active: true, updatedAt: "2026-08-01T00:00:00Z" },
  { id: "mat-sckt-mx-jari", code: "JARIMX", name: "SCKT MX JARI", denier: 113, ratePerKg: 300, active: true, updatedAt: "2026-08-01T00:00:00Z" },
  { id: "mat-90-24-tpm-mahadev", code: "TPM90M", name: "90/24 TPM MAHADEV", denier: 90, ratePerKg: 284, active: true, updatedAt: "2026-08-01T00:00:00Z" },
  { id: "mat-70-24-tpm-sahajanand", code: "TPM70S", name: "70/24 TPM SAHAJANAND", denier: 70, ratePerKg: 290, active: true, updatedAt: "2026-08-01T00:00:00Z" },
  { id: "mat-sckt-110-nylon-jari", code: "JAR110N", name: "SCKT 110 NYLON JARI", denier: 190, ratePerKg: 357, active: true, updatedAt: "2026-08-01T00:00:00Z" },
  { id: "mat-sckt-40d-nylon-jari", code: "JAR40D", name: "SCKT 40 D NYLON JARI", denier: 90, ratePerKg: 525, active: true, updatedAt: "2026-08-01T00:00:00Z" },
  { id: "mat-21-bright-mono-beam", code: "BAM21M", name: "21 BRIGHT MONO BEAM", denier: 21, ratePerKg: 312, active: true, updatedAt: "2026-08-01T00:00:00Z" },
  { id: "mat-100-brigt-dyed-mina", code: "MIN100D", name: "100 BRIGT DYED MINA", denier: 105, ratePerKg: 212, active: true, updatedAt: "2026-08-01T00:00:00Z" },
  { id: "mat-2151-jari-meera", code: "JAR2151", name: "2151 JARI MEERA", denier: 215, ratePerKg: 310, active: true, updatedAt: "2026-08-01T00:00:00Z" },
  { id: "mat-1830-kasab-jari-mira", code: "KSB1830", name: "1830 KASAB JARI MIRA", denier: 183, ratePerKg: 400, active: true, updatedAt: "2026-08-01T00:00:00Z" },
  { id: "mat-sckt-70d-nc-jari", code: "JAR70NC", name: "SCKT 70D NC JARI", denier: 110, ratePerKg: 315, active: true, updatedAt: "2026-08-01T00:00:00Z" },
  { id: "mat-110-nylon", code: "NYL110", name: "110 NYLON", denier: 115, ratePerKg: 225, active: true, updatedAt: "2026-08-01T00:00:00Z" },
  { id: "mat-rudraraj-banarasi-jari", code: "JARRUD", name: "RUDRARAJ BANARASI JARI", denier: 240, ratePerKg: 285, active: true, updatedAt: "2026-08-01T00:00:00Z" },
  { id: "mat-somani-jari-top-dye", code: "JARSOM", name: "SOMANI JARI TOP DYE", denier: 281, ratePerKg: 331, active: true, updatedAt: "2026-08-01T00:00:00Z" },
  { id: "mat-50-600-top-ded-patta", code: "PAT50600", name: "50/600 TOP DED PATTA BEAM", denier: 60, ratePerKg: 250, active: true, updatedAt: "2026-08-01T00:00:00Z" },
  { id: "mat-40d-jari", code: "JAR40", name: "40 D JARI", denier: 95, ratePerKg: 600, active: true, updatedAt: "2026-08-01T00:00:00Z" },
  { id: "mat-30-kota-black-beam", code: "KOT30B", name: "30 KOTA BLACK BEAM", denier: 35, ratePerKg: 232, active: true, updatedAt: "2026-08-01T00:00:00Z" },
  { id: "mat-multi-chiku-kota-beam", code: "KOTMCB", name: "MULTI CHIKU KOTA BEAM", denier: 38, ratePerKg: 294, active: true, updatedAt: "2026-08-01T00:00:00Z" },
  { id: "mat-30-spun-lalman", code: "SPN30L", name: "30 SPUN LALMAN", denier: 183, ratePerKg: 235, active: true, updatedAt: "2026-08-01T00:00:00Z" },
  { id: "mat-double-kasab-jari", code: "KSBDBL", name: "DOUBLE KASAB JARI", denier: 311, ratePerKg: 315, active: true, updatedAt: "2026-08-01T00:00:00Z" },
  { id: "mat-75-beam-jari", code: "JAR75B", name: "75 BEAM JARI", denier: 160, ratePerKg: 380, active: true, updatedAt: "2026-08-01T00:00:00Z" },
  { id: "mat-30-spun-jigabhai", code: "SPN30J", name: "30 SPUN JIGABHAI", denier: 190, ratePerKg: 220, active: true, updatedAt: "2026-08-01T00:00:00Z" },
];

export function getLocalYarnMaterials(): YarnMaterial[] {
  if (typeof window === "undefined") return SEED_YARN_MATERIALS;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_YARN_MATERIALS));
    return SEED_YARN_MATERIALS;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return SEED_YARN_MATERIALS;
  }
}

export function saveLocalYarnMaterials(materials: YarnMaterial[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(materials));
  }
}

export function findYarnMaterialByNameOrCode(query: string): YarnMaterial | null {
  const all = getLocalYarnMaterials();
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return (
    all.find(
      (m) =>
        m.name.toLowerCase() === q ||
        m.code.toLowerCase() === q ||
        m.name.toLowerCase().includes(q)
    ) || null
  );
}

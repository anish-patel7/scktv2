import { supabase } from "@/integrations/supabase/client";

export interface PartyRecord {
  id: string;
  partyCode: string;
  partyName: string;
  officeName: string;
  addressLine1: string;
  addressLine2?: string | undefined;
  area?: string | undefined;
  city: string;
  district?: string | undefined;
  state: string;
  pinCode: string;
  country: string;
  contactPerson?: string | undefined;
  designation?: string | undefined;
  mobile?: string | undefined;
  alternateMobile?: string | undefined;
  email?: string | undefined;
  whatsappNumber?: string | undefined;
  gstin?: string | undefined;
  pan?: string | undefined;
  jobWorkApplicable: "Yes" | "No";
  jobWorkRemarks?: string | undefined;
  remarks?: string | undefined;
  status: "Active" | "Inactive";
  transactionCount?: number | undefined;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | undefined;
  updatedBy?: string | undefined;
}

const STORAGE_KEY = "weaveone_parties_v1";

// Seed data
export const SEED_PARTIES: PartyRecord[] = [
  {
    id: "party-001",
    partyCode: "PTY-001",
    partyName: "Shree Ram Textiles",
    officeName: "Shree Ram Dyeing & Finishing Unit",
    addressLine1: "Plot 102, Ring Road Industrial Estate",
    addressLine2: "Near Sahara Market",
    area: "Ring Road",
    city: "Surat",
    district: "Surat",
    state: "Gujarat",
    pinCode: "395002",
    country: "India",
    contactPerson: "Ramesh Patel",
    designation: "General Manager",
    mobile: "9825012345",
    alternateMobile: "9825099999",
    email: "ramesh@shreeramtextiles.com",
    whatsappNumber: "9825012345",
    gstin: "24AAACS1234F1Z5",
    pan: "AAACS1234F",
    jobWorkApplicable: "Yes",
    jobWorkRemarks: "Specialized in Banarasi Jari Dyeing & Sizing",
    remarks: "Preferred Job Worker for high-grade Kota Jacquard weaving",
    status: "Active",
    transactionCount: 5,
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-08T00:00:00Z",
  },
  {
    id: "party-002",
    partyCode: "PTY-002",
    partyName: "Vardhman Job Weavers",
    officeName: "Vardhman Weaving Division",
    addressLine1: "Sector 4, MIDC Power Loom Zone",
    area: "Bhiwandi West",
    city: "Bhiwandi",
    district: "Thane",
    state: "Maharashtra",
    pinCode: "421302",
    country: "India",
    contactPerson: "Anil Sharma",
    designation: "Plant Head",
    mobile: "9819098765",
    email: "anil@vardhmanweavers.in",
    whatsappNumber: "9819098765",
    gstin: "27AABCV5678G1Z2",
    pan: "AABCV5678G",
    jobWorkApplicable: "Yes",
    jobWorkRemarks: "High-speed airjet loom job work capacity 50,000m/month",
    remarks: "Reliable production turnaround time",
    status: "Active",
    transactionCount: 2,
    createdAt: "2026-08-02T00:00:00Z",
    updatedAt: "2026-08-08T00:00:00Z",
  },
  {
    id: "party-003",
    partyCode: "PTY-003",
    partyName: "Kothari Processing House",
    officeName: "Kothari Processors Pvt Ltd",
    addressLine1: "GIDC Narol Industrial Park",
    area: "Narol",
    city: "Ahmedabad",
    district: "Ahmedabad",
    state: "Gujarat",
    pinCode: "382405",
    country: "India",
    contactPerson: "Vijay Kothari",
    designation: "Managing Director",
    mobile: "9898011223",
    email: "vijay@kothariprocess.com",
    whatsappNumber: "9898011223",
    gstin: "24AAACK9876E1Z9",
    pan: "AAACK9876E",
    jobWorkApplicable: "Yes",
    jobWorkRemarks: "RFD processing & soft finish master",
    remarks: "Authorized finishing vendor",
    status: "Active",
    transactionCount: 0,
    createdAt: "2026-08-03T00:00:00Z",
    updatedAt: "2026-08-08T00:00:00Z",
  },
];

// Validation Helper Functions
export function validateGSTIN(gstin: string): boolean {
  if (!gstin.trim()) return true; // optional
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return regex.test(gstin.trim().toUpperCase());
}

export function validatePAN(pan: string): boolean {
  if (!pan.trim()) return true; // optional
  const regex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return regex.test(pan.trim().toUpperCase());
}

export function validateMobile(mobile: string): boolean {
  if (!mobile.trim()) return true; // optional
  const regex = /^[6-9]\d{9}$/;
  return regex.test(mobile.trim());
}

export function validatePIN(pin: string): boolean {
  if (!pin.trim()) return true;
  const regex = /^\d{6}$/;
  return regex.test(pin.trim());
}

export function validateEmail(email: string): boolean {
  if (!email.trim()) return true;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.trim());
}

// Local Storage Handlers
export function getLocalParties(): PartyRecord[] {
  if (typeof window === "undefined") return SEED_PARTIES;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_PARTIES));
    return SEED_PARTIES;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return SEED_PARTIES;
  }
}

export function saveLocalParties(parties: PartyRecord[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parties));
  }
}

export function generateNextPartyCode(): string {
  const parties = getLocalParties();
  const maxNum = parties.reduce((max, p) => {
    const match = p.partyCode.match(/^PTY-(\d+)$/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      return num > max ? num : max;
    }
    return max;
  }, 0);
  const nextNum = maxNum + 1;
  return `PTY-${String(nextNum).padStart(3, "0")}`;
}

export function findPossibleDuplicates(
  partyName: string,
  officeName: string,
  gstin?: string,
  mobile?: string,
  excludeId?: string
): PartyRecord | null {
  const parties = getLocalParties();
  const normName = partyName.trim().toLowerCase();
  const normOffice = officeName.trim().toLowerCase();
  const normGstin = gstin ? gstin.trim().toUpperCase() : "";
  const normMobile = mobile ? mobile.trim() : "";

  return (
    parties.find((p) => {
      if (excludeId && p.id === excludeId) return false;

      if (normGstin && p.gstin && p.gstin.toUpperCase() === normGstin) return true;
      if (normMobile && p.mobile && p.mobile === normMobile) return true;

      const pName = p.partyName.trim().toLowerCase();
      const pOffice = p.officeName.trim().toLowerCase();

      if (pName === normName && pOffice === normOffice) return true;
      if (pName === normName) return true;

      return false;
    }) || null
  );
}

export function savePartyRecord(party: PartyRecord): PartyRecord {
  const parties = getLocalParties();
  const now = new Date().toISOString();

  const isNew = !party.id || party.id.startsWith("new-");
  const id = isNew ? `party-${Date.now()}` : party.id;
  const partyCode = party.partyCode.trim() || generateNextPartyCode();

  const formatted: PartyRecord = {
    ...party,
    id,
    partyCode,
    partyName: party.partyName.trim(),
    officeName: party.officeName.trim(),
    addressLine1: party.addressLine1.trim(),
    city: party.city.trim(),
    state: party.state.trim(),
    pinCode: party.pinCode.trim(),
    country: party.country || "India",
    gstin: party.gstin ? party.gstin.trim().toUpperCase() : undefined,
    pan: party.pan ? party.pan.trim().toUpperCase() : undefined,
    status: party.status || "Active",
    jobWorkApplicable: party.jobWorkApplicable || "Yes",
    createdAt: party.createdAt || now,
    updatedAt: now,
  };

  const idx = parties.findIndex((p) => p.id === id);
  if (idx >= 0) {
    parties[idx] = formatted;
  } else {
    parties.unshift(formatted);
  }

  saveLocalParties(parties);

  // Sync to Supabase in background
  (supabase.from as any)("parties").upsert({
    id: formatted.id.startsWith("party-") ? undefined : formatted.id,
    party_code: formatted.partyCode,
    party_name: formatted.partyName,
    office_name: formatted.officeName,
    address_line1: formatted.addressLine1,
    address_line2: formatted.addressLine2 || null,
    area: formatted.area || null,
    city: formatted.city,
    district: formatted.district || null,
    state: formatted.state,
    pin_code: formatted.pinCode,
    country: formatted.country,
    contact_person: formatted.contactPerson || null,
    designation: formatted.designation || null,
    mobile: formatted.mobile || null,
    alternate_mobile: formatted.alternateMobile || null,
    email: formatted.email || null,
    whatsapp_number: formatted.whatsappNumber || null,
    gstin: formatted.gstin || null,
    pan: formatted.pan || null,
    job_work_applicable: formatted.jobWorkApplicable,
    job_work_remarks: formatted.jobWorkRemarks || null,
    remarks: formatted.remarks || null,
    status: formatted.status,
  }).then();

  return formatted;
}

export function clonePartyRecord(sourceId: string): PartyRecord {
  const parties = getLocalParties();
  const source = parties.find((p) => p.id === sourceId);
  if (!source) throw new Error("Source party not found");

  const newCode = generateNextPartyCode();
  const now = new Date().toISOString();

  const cloned: PartyRecord = {
    ...source,
    id: `party-clone-${Date.now()}`,
    partyCode: newCode,
    partyName: `${source.partyName} (Unit 2)`,
    officeName: source.officeName,
    status: "Active",
    transactionCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  return cloned;
}

export function setPartyStatus(id: string, status: "Active" | "Inactive"): PartyRecord | null {
  const parties = getLocalParties();
  const target = parties.find((p) => p.id === id);
  if (!target) return null;

  target.status = status;
  target.updatedAt = new Date().toISOString();
  saveLocalParties(parties);

  return target;
}

export function deletePartyRecord(id: string): { success: boolean; message: string } {
  const parties = getLocalParties();
  const target = parties.find((p) => p.id === id);
  if (!target) return { success: false, message: "Party not found" };

  if (target.transactionCount && target.transactionCount > 0) {
    return {
      success: false,
      message: "This Party is already used in transactions. It cannot be deleted. You can deactivate the Party instead.",
    };
  }

  const updated = parties.filter((p) => p.id !== id);
  saveLocalParties(updated);
  return { success: true, message: "Party deleted successfully" };
}

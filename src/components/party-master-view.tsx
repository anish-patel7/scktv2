import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Copy,
  Power,
  Trash2,
  AlertTriangle,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Briefcase,
  X,
  CheckCircle2,
  ArrowLeft,
  Star,
  Layers,
  ChevronRight,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";

import {
  getLocalParties,
  savePartyRecord,
  clonePartyRecord,
  setPartyStatus,
  deletePartyRecord,
  generateNextPartyCode,
  findPossibleDuplicates,
  getLocalSubParties,
  getSubPartiesByPartyId,
  saveSubPartyRecord,
  generateNextSubPartyCode,
  findSubPartyExactCode,
  findSubPartyFuzzyDuplicate,
  setSubPartyStatus,
  setSubPartyDefault,
  deleteSubPartyRecord,
  validateGSTIN,
  validatePAN,
  validateMobile,
  validatePIN,
  validateEmail,
  LOCATION_TYPES,
  type PartyRecord,
  type SubPartyRecord,
  type PartyType,
  type LocationType,
} from "@/lib/party-store";

export function PartyMasterView() {
  // Main Category Tabs: Purchase Party | Sell Party | Job Party
  const [activeTab, setActiveTab] = useState<PartyType>("Purchase Party");

  // Parties & Sub Parties state
  const [parties, setParties] = useState<PartyRecord[]>(() => getLocalParties());
  const [subParties, setSubParties] = useState<SubPartyRecord[]>(() => getLocalSubParties());

  // View state: Null means showing Main Parties list. If set, showing Sub Parties for that Party.
  const [selectedParentParty, setSelectedParentParty] = useState<PartyRecord | null>(null);

  // Main Party Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");

  // Sub Party Filters & Search
  const [subSearchQuery, setSubSearchQuery] = useState("");
  const [subStatusFilter, setSubStatusFilter] = useState<string>("all");
  const [subLocationFilter, setSubLocationFilter] = useState<string>("all");
  const [subDefaultFilter, setSubDefaultFilter] = useState<string>("all");

  // Form State for Main Party
  const [partyFormOpen, setPartyFormOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<PartyRecord | null>(null);
  const [partyFormData, setPartyFormData] = useState<Partial<PartyRecord>>({});
  const [partyErrors, setPartyErrors] = useState<Partial<Record<keyof PartyRecord, string>>>({});
  const [partyDuplicateMatch, setPartyDuplicateMatch] = useState<PartyRecord | null>(null);

  // Form State for Sub Party
  const [subFormOpen, setSubFormOpen] = useState(false);
  const [editingSubParty, setEditingSubParty] = useState<SubPartyRecord | null>(null);
  const [subFormData, setSubFormData] = useState<Partial<SubPartyRecord>>({});
  const [subErrors, setSubErrors] = useState<Partial<Record<keyof SubPartyRecord, string>>>({});
  const [subExactCodeError, setSubExactCodeError] = useState<string | null>(null);
  const [subFuzzyMatch, setSubFuzzyMatch] = useState<SubPartyRecord | null>(null);

  // Detail & Action Modals
  const [viewingParty, setViewingParty] = useState<PartyRecord | null>(null);
  const [viewingSubParty, setViewingSubParty] = useState<SubPartyRecord | null>(null);
  const [deactivatingParty, setDeactivatingParty] = useState<PartyRecord | null>(null);
  const [deactivatingSubParty, setDeactivatingSubParty] = useState<SubPartyRecord | null>(null);
  const [deleteBlockedMsg, setDeleteBlockedMsg] = useState<string | null>(null);
  const [deletingSubParty, setDeletingSubParty] = useState<SubPartyRecord | null>(null);

  const refreshData = () => {
    const updatedParties = getLocalParties();
    const updatedSubParties = getLocalSubParties();
    setParties(updatedParties);
    setSubParties(updatedSubParties);

    if (selectedParentParty) {
      const refreshedParent = updatedParties.find((p) => p.id === selectedParentParty.id);
      setSelectedParentParty(refreshedParent || null);
    }
  };

  // Compute Sub Parties count map
  const subPartyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    subParties.forEach((sp) => {
      if (sp.status === "Active") {
        counts[sp.partyId] = (counts[sp.partyId] || 0) + 1;
      }
    });
    return counts;
  }, [subParties]);

  // States & Cities for Main Party Filter Dropdowns
  const uniqueStates = useMemo(
    () => Array.from(new Set(parties.map((p) => p.state).filter(Boolean))),
    [parties]
  );
  const uniqueCities = useMemo(
    () => Array.from(new Set(parties.map((p) => p.city).filter(Boolean))),
    [parties]
  );

  // Filtered Main Parties based on Active Category Tab & Filters
  const filteredMainParties = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return parties.filter((p) => {
      // Must match Category Tab
      const matchesTab = (p.partyType || "Job Party") === activeTab;
      if (!matchesTab) return false;

      // Search Filter
      const matchesQuery =
        !q ||
        p.partyCode.toLowerCase().includes(q) ||
        p.partyName.toLowerCase().includes(q) ||
        p.officeName.toLowerCase().includes(q) ||
        (p.contactPerson && p.contactPerson.toLowerCase().includes(q)) ||
        (p.mobile && p.mobile.includes(q)) ||
        p.city.toLowerCase().includes(q) ||
        (p.gstin && p.gstin.toLowerCase().includes(q));

      // Dropdown Filters
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      const matchesState = stateFilter === "all" || p.state === stateFilter;
      const matchesCity = cityFilter === "all" || p.city === cityFilter;

      return matchesQuery && matchesStatus && matchesState && matchesCity;
    });
  }, [parties, activeTab, searchQuery, statusFilter, stateFilter, cityFilter]);

  // Sub Parties for Currently Selected Main Party
  const currentPartySubParties = useMemo(() => {
    if (!selectedParentParty) return [];
    return subParties.filter((sp) => sp.partyId === selectedParentParty.id);
  }, [subParties, selectedParentParty]);

  // Filtered Sub Parties
  const filteredSubParties = useMemo(() => {
    const q = subSearchQuery.trim().toLowerCase();

    return currentPartySubParties.filter((sp) => {
      const matchesQuery =
        !q ||
        sp.subPartyCode.toLowerCase().includes(q) ||
        sp.subPartyName.toLowerCase().includes(q) ||
        (selectedParentParty && selectedParentParty.partyName.toLowerCase().includes(q)) ||
        sp.city.toLowerCase().includes(q) ||
        sp.state.toLowerCase().includes(q) ||
        (sp.gstin && sp.gstin.toLowerCase().includes(q)) ||
        (sp.contactPerson && sp.contactPerson.toLowerCase().includes(q)) ||
        (sp.mobile && sp.mobile.includes(q)) ||
        sp.locationType.toLowerCase().includes(q);

      const matchesStatus = subStatusFilter === "all" || sp.status === subStatusFilter;
      const matchesLocation = subLocationFilter === "all" || sp.locationType === subLocationFilter;
      const matchesDefault =
        subDefaultFilter === "all"
          ? true
          : subDefaultFilter === "yes"
          ? sp.isDefault
          : !sp.isDefault;

      return matchesQuery && matchesStatus && matchesLocation && matchesDefault;
    });
  }, [currentPartySubParties, selectedParentParty, subSearchQuery, subStatusFilter, subLocationFilter, subDefaultFilter]);

  // Handlers for Main Party Form
  const handleNewMainParty = () => {
    const nextCode = generateNextPartyCode(activeTab);
    setEditingParty(null);
    setPartyFormData({
      partyCode: nextCode,
      partyName: "",
      partyType: activeTab,
      officeName: "",
      addressLine1: "",
      addressLine2: "",
      area: "",
      city: "",
      district: "",
      state: "Gujarat",
      pinCode: "",
      country: "India",
      contactPerson: "",
      designation: "",
      mobile: "",
      alternateMobile: "",
      email: "",
      whatsappNumber: "",
      gstin: "",
      pan: "",
      jobWorkApplicable: activeTab === "Job Party" ? "Yes" : "No",
      jobWorkRemarks: "",
      remarks: "",
      status: "Active",
    });
    setPartyErrors({});
    setPartyFormOpen(true);
  };

  const handleEditMainParty = (party: PartyRecord) => {
    setEditingParty(party);
    setPartyFormData({ ...party });
    setPartyErrors({});
    setPartyFormOpen(true);
  };

  const handleCloneMainParty = (party: PartyRecord) => {
    const cloned = clonePartyRecord(party.id);
    setEditingParty(null);
    setPartyFormData(cloned);
    setPartyErrors({});
    setPartyFormOpen(true);
    toast.info(`Cloned party. New Code: ${cloned.partyCode}`);
  };

  const validatePartyForm = (): boolean => {
    const errs: Partial<Record<keyof PartyRecord, string>> = {};

    if (!partyFormData.partyCode?.trim()) errs.partyCode = "Party Code is required";
    if (!partyFormData.partyName?.trim()) errs.partyName = "Party Name is required";
    if (!partyFormData.officeName?.trim()) errs.officeName = "Office Name is required";
    if (!partyFormData.addressLine1?.trim()) errs.addressLine1 = "Address Line 1 is required";
    if (!partyFormData.city?.trim()) errs.city = "City is required";
    if (!partyFormData.state?.trim()) errs.state = "State is required";
    if (!partyFormData.pinCode?.trim()) {
      errs.pinCode = "PIN Code is required";
    } else if (!validatePIN(partyFormData.pinCode)) {
      errs.pinCode = "PIN Code must be 6 digits";
    }

    if (partyFormData.gstin && !validateGSTIN(partyFormData.gstin)) {
      errs.gstin = "Invalid GSTIN format";
    }
    if (partyFormData.pan && !validatePAN(partyFormData.pan)) {
      errs.pan = "Invalid PAN format";
    }
    if (partyFormData.mobile && !validateMobile(partyFormData.mobile)) {
      errs.mobile = "Invalid 10-digit mobile number";
    }
    if (partyFormData.email && !validateEmail(partyFormData.email)) {
      errs.email = "Invalid email format";
    }

    setPartyErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmitPartyForm = (bypassDuplicateCheck = false) => {
    if (!validatePartyForm()) {
      toast.error("Please resolve validation errors before saving");
      return;
    }

    if (!bypassDuplicateCheck) {
      const match = findPossibleDuplicates(
        partyFormData.partyName || "",
        partyFormData.officeName || "",
        partyFormData.gstin,
        partyFormData.mobile,
        editingParty?.id
      );

      if (match) {
        setPartyDuplicateMatch(match);
        return;
      }
    }

    const saved = savePartyRecord(partyFormData as PartyRecord);
    refreshData();
    setPartyFormOpen(false);
    setPartyDuplicateMatch(null);
    toast.success(`Party ${saved.partyCode} (${saved.partyName}) saved successfully!`);
  };

  // Handlers for Sub Party Form
  const handleOpenAddSubParty = (parent: PartyRecord) => {
    const nextCode = generateNextSubPartyCode(parent.id);
    const parentHasSubParties = subParties.some((sp) => sp.partyId === parent.id && sp.status === "Active");

    setEditingSubParty(null);
    setSubExactCodeError(null);
    setSubFormData({
      partyId: parent.id,
      subPartyCode: nextCode,
      subPartyName: "",
      partyType: parent.partyType || activeTab,
      locationType: parent.partyType === "Job Party" ? "Job Work Unit" : "Branch Office",
      locationTypeOther: "",
      addressLine1: parent.addressLine1 || "",
      addressLine2: parent.addressLine2 || "",
      area: parent.area || "",
      city: parent.city || "",
      district: parent.district || "",
      state: parent.state || "Gujarat",
      pinCode: parent.pinCode || "",
      country: parent.country || "India",
      contactPerson: parent.contactPerson || "",
      mobile: parent.mobile || "",
      alternateMobile: parent.alternateMobile || "",
      phone: "",
      email: parent.email || "",
      alternateEmail: "",
      gstin: parent.gstin || "",
      pan: parent.pan || "",
      billingAddress: parent.addressLine1 ? `${parent.addressLine1}, ${parent.city}, ${parent.state}` : "",
      shippingAddress: parent.addressLine1 ? `${parent.addressLine1}, ${parent.city}, ${parent.state}` : "",
      deliveryAddress: parent.addressLine1 ? `${parent.addressLine1}, ${parent.city}, ${parent.state}` : "",
      isDefault: !parentHasSubParties, // Auto-set default if first sub party
      status: "Active",
      remarks: "",
      internalNotes: "",
    });
    setSubErrors({});
    setSubFormOpen(true);
  };

  const handleEditSubParty = (sub: SubPartyRecord) => {
    setEditingSubParty(sub);
    setSubExactCodeError(null);
    setSubFormData({ ...sub });
    setSubErrors({});
    setSubFormOpen(true);
  };

  const validateSubPartyForm = (): boolean => {
    const errs: Partial<Record<keyof SubPartyRecord, string>> = {};

    if (!subFormData.subPartyCode?.trim()) errs.subPartyCode = "Sub Party Code is required";
    if (!subFormData.subPartyName?.trim()) errs.subPartyName = "Sub Party Name is required";
    if (!subFormData.addressLine1?.trim()) errs.addressLine1 = "Address Line 1 is required";
    if (!subFormData.city?.trim()) errs.city = "City is required";
    if (!subFormData.state?.trim()) errs.state = "State is required";

    if (subFormData.gstin && !validateGSTIN(subFormData.gstin)) {
      errs.gstin = "Invalid GSTIN format";
    }
    if (subFormData.pan && !validatePAN(subFormData.pan)) {
      errs.pan = "Invalid PAN format";
    }
    if (subFormData.mobile && !validateMobile(subFormData.mobile)) {
      errs.mobile = "Invalid 10-digit mobile number";
    }
    if (subFormData.email && !validateEmail(subFormData.email)) {
      errs.email = "Invalid email format";
    }

    setSubErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmitSubPartyForm = (bypassFuzzyCheck = false) => {
    if (!validateSubPartyForm()) {
      toast.error("Please resolve validation errors before saving Sub Party");
      return;
    }

    // Tier 1: Check Exact Code Uniqueness under same parent
    const exactCodeMatch = findSubPartyExactCode(
      subFormData.partyId || "",
      subFormData.subPartyCode || "",
      editingSubParty?.id
    );
    if (exactCodeMatch) {
      setSubExactCodeError(`Sub Party Code "${subFormData.subPartyCode}" already exists under this Party.`);
      toast.error("Duplicate Sub Party Code blocked.");
      return;
    }
    setSubExactCodeError(null);

    // Tier 2: Check Fuzzy Name Duplicate Warning
    if (!bypassFuzzyCheck) {
      const fuzzyMatch = findSubPartyFuzzyDuplicate(
        subFormData.partyId || "",
        subFormData.subPartyName || "",
        editingSubParty?.id
      );

      if (fuzzyMatch) {
        setSubFuzzyMatch(fuzzyMatch);
        return;
      }
    }

    // Save Sub Party
    const saved = saveSubPartyRecord(subFormData as SubPartyRecord);
    refreshData();
    setSubFormOpen(false);
    setSubFuzzyMatch(null);
    toast.success(`Sub Party ${saved.subPartyCode} (${saved.subPartyName}) saved successfully!`);
  };

  const handleToggleSubPartyDefault = (sub: SubPartyRecord) => {
    if (sub.isDefault) return; // already default
    if (sub.status === "Inactive") {
      toast.error("Inactive Sub Party cannot be marked as Default");
      return;
    }

    setSubPartyDefault(sub.partyId, sub.id);
    refreshData();
    toast.success(`Marked "${sub.subPartyName}" as Default Sub Party.`);
  };

  const handleToggleSubPartyStatus = (sub: SubPartyRecord) => {
    if (sub.status === "Active") {
      setDeactivatingSubParty(sub);
    } else {
      setSubPartyStatus(sub.id, "Active");
      refreshData();
      toast.success(`Sub Party ${sub.subPartyCode} reactivated.`);
    }
  };

  const confirmDeactivateSubParty = () => {
    if (deactivatingSubParty) {
      setSubPartyStatus(deactivatingSubParty.id, "Inactive");
      refreshData();
      setDeactivatingSubParty(null);
      toast.info(`Sub Party ${deactivatingSubParty.subPartyCode} deactivated.`);
    }
  };

  const handleDeleteSubParty = (sub: SubPartyRecord) => {
    const res = deleteSubPartyRecord(sub.id);
    if (!res.success) {
      setDeleteBlockedMsg(res.message);
    } else {
      refreshData();
      toast.success("Sub Party deleted successfully.");
    }
    setDeletingSubParty(null);
  };

  // Copy Main Address to Transaction Addresses
  const handleCopyMainAddressToTransaction = () => {
    const full = [
      subFormData.addressLine1,
      subFormData.addressLine2,
      subFormData.area,
      subFormData.city,
      subFormData.state,
      subFormData.pinCode,
    ]
      .filter(Boolean)
      .join(", ");

    setSubFormData((prev) => ({
      ...prev,
      billingAddress: full,
      shippingAddress: full,
      deliveryAddress: full,
    }));
    toast.info("Copied main address to billing, shipping, and delivery fields");
  };

  return (
    <div className="space-y-4">
      {/* Category Tabs Header */}
      {!selectedParentParty ? (
        <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border">
            {(["Purchase Party", "Sell Party", "Job Party"] as PartyType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSearchQuery("");
                }}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${
                  activeTab === tab
                    ? "bg-background text-primary shadow-sm border border-border/80 font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50 font-medium"
                }`}
              >
                <Building2 className={`size-3.5 ${activeTab === tab ? "text-primary" : "text-muted-foreground"}`} />
                {tab}
                <Badge
                  variant={activeTab === tab ? "default" : "secondary"}
                  className="text-[0.625rem] px-1.5 py-0 h-4 min-w-5 justify-center"
                >
                  {parties.filter((p) => (p.partyType || "Job Party") === tab).length}
                </Badge>
              </button>
            ))}
          </div>

          <Button size="sm" onClick={handleNewMainParty} className="h-8 gap-1 text-xs font-semibold">
            <Plus className="size-3.5" /> New {activeTab}
          </Button>
        </div>
      ) : (
        /* Breadcrumb Navigation when viewing Sub Parties */
        <div className="flex items-center justify-between gap-3 bg-card border border-border p-3 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 text-xs">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedParentParty(null)}
              className="h-7 text-xs gap-1 font-medium hover:bg-muted"
            >
              <ArrowLeft className="size-3.5" /> Back to Parties
            </Button>
            <span className="text-muted-foreground">/</span>
            <Badge variant="outline" className="text-xs bg-muted/40 font-mono">
              {activeTab}
            </Badge>
            <ChevronRight className="size-3.5 text-muted-foreground" />
            <span className="font-bold text-foreground">{selectedParentParty.partyName}</span>
            <Badge variant="secondary" className="font-mono text-[0.625rem] text-primary font-bold">
              {selectedParentParty.partyCode}
            </Badge>
            <ChevronRight className="size-3.5 text-muted-foreground" />
            <span className="font-bold text-primary">Sub Parties</span>
          </div>

          <Button
            size="sm"
            onClick={() => handleOpenAddSubParty(selectedParentParty)}
            className="h-8 gap-1 text-xs font-semibold"
          >
            <Plus className="size-3.5" /> Add Sub Party
          </Button>
        </div>
      )}

      {/* VIEW 1: MAIN PARTIES TABLE LIST */}
      {!selectedParentParty ? (
        <div className="space-y-4">
          {/* Main Party Search & Filter Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
            <div className="relative flex-1 min-w-[260px] max-w-md">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${activeTab.toLowerCase()} by code, name, city, GSTIN...`}
                className="pl-9 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              {uniqueStates.length > 0 && (
                <Select value={stateFilter} onValueChange={setStateFilter}>
                  <SelectTrigger className="h-8 w-32 text-xs">
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {uniqueStates.map((st) => (
                      <SelectItem key={st} value={st}>
                        {st}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {uniqueCities.length > 0 && (
                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger className="h-8 w-32 text-xs">
                    <SelectValue placeholder="City" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {uniqueCities.map((ct) => (
                      <SelectItem key={ct} value={ct}>
                        {ct}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Badge variant="secondary" className="text-xs">
                {filteredMainParties.length} {activeTab}s
              </Badge>
            </div>
          </div>

          {/* Main Party Table */}
          <Card className="rounded-md border border-border">
            <CardContent className="p-0">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="bg-muted/60 font-semibold text-muted-foreground">
                    <TableHead className="h-8 w-28">Party Code</TableHead>
                    <TableHead className="h-8">Party Name</TableHead>
                    <TableHead className="h-8 w-32">Sub Parties</TableHead>
                    <TableHead className="h-8">City</TableHead>
                    <TableHead className="h-8">State</TableHead>
                    <TableHead className="h-8">GSTIN</TableHead>
                    <TableHead className="h-8 w-24">Status</TableHead>
                    <TableHead className="h-8 text-right w-44">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMainParties.map((p) => {
                    const activeSubsCount = subPartyCounts[p.id] || 0;
                    return (
                      <TableRow key={p.id} className="hover:bg-muted/40">
                        <TableCell className="py-2.5 font-mono font-bold text-primary">
                          <button
                            onClick={() => setViewingParty(p)}
                            className="hover:underline text-left font-mono font-bold"
                          >
                            {p.partyCode}
                          </button>
                        </TableCell>

                        <TableCell className="py-2.5 font-semibold text-foreground">
                          <div>
                            <button
                              onClick={() => setViewingParty(p)}
                              className="hover:underline text-left font-semibold block"
                            >
                              {p.partyName}
                            </button>
                            <span className="text-[0.6875rem] text-muted-foreground">{p.officeName}</span>
                          </div>
                        </TableCell>

                        {/* Sub Parties Column */}
                        <TableCell className="py-2.5">
                          <button
                            onClick={() => setSelectedParentParty(p)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-all"
                            title="Manage Sub Parties"
                          >
                            <Layers className="size-3" />
                            <span>{activeSubsCount} Sub Parties</span>
                          </button>
                        </TableCell>

                        <TableCell className="py-2.5 font-medium">{p.city}</TableCell>
                        <TableCell className="py-2.5 text-muted-foreground">{p.state}</TableCell>
                        <TableCell className="py-2.5 font-mono text-muted-foreground">
                          {p.gstin || "—"}
                        </TableCell>

                        <TableCell className="py-2.5">
                          <Badge
                            variant={p.status === "Active" ? "default" : "secondary"}
                            className={`text-[0.625rem] capitalize ${
                              p.status === "Active" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                            }`}
                          >
                            {p.status}
                          </Badge>
                        </TableCell>

                        <TableCell className="py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-primary"
                              title="Add Sub Party"
                              onClick={() => handleOpenAddSubParty(p)}
                            >
                              <Plus className="size-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-foreground"
                              title="View Sub Parties"
                              onClick={() => setSelectedParentParty(p)}
                            >
                              <Layers className="size-3.5 text-primary" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-foreground"
                              title="View Party"
                              onClick={() => setViewingParty(p)}
                            >
                              <Eye className="size-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-foreground"
                              title="Edit Party"
                              onClick={() => handleEditMainParty(p)}
                            >
                              <Edit className="size-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className={`size-7 ${
                                p.status === "Active"
                                  ? "text-muted-foreground hover:text-destructive"
                                  : "text-emerald-600 hover:bg-emerald-50"
                              }`}
                              title={p.status === "Active" ? "Deactivate" : "Activate"}
                              onClick={() => {
                                if (p.status === "Active") {
                                  setDeactivatingParty(p);
                                } else {
                                  setPartyStatus(p.id, "Active");
                                  refreshData();
                                  toast.success(`Party ${p.partyCode} reactivated`);
                                }
                              }}
                            >
                              <Power className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {!filteredMainParties.length && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                        <Building2 className="mx-auto size-8 text-muted-foreground/30 mb-2" />
                        <p className="text-xs font-semibold">No {activeTab} records match this filter.</p>
                        <p className="text-[0.6875rem] text-muted-foreground mt-0.5">
                          Click "+ New {activeTab}" to add a record.
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* VIEW 2: SUB PARTIES MANAGEMENT LIST FOR SELECTED PARTY */
        <div className="space-y-4">
          {/* Parent Party Summary Banner Card */}
          <Card className="border border-border bg-gradient-to-r from-muted/50 via-card to-background">
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-foreground">{selectedParentParty.partyName}</h3>
                  <Badge variant="outline" className="font-mono text-xs font-bold text-primary bg-primary/5">
                    {selectedParentParty.partyCode}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {selectedParentParty.partyType || activeTab}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Office: <strong className="text-foreground font-medium">{selectedParentParty.officeName}</strong> ·{" "}
                  {selectedParentParty.city}, {selectedParentParty.state}
                  {selectedParentParty.gstin && (
                    <span>
                      {" "}
                      · GSTIN: <strong className="font-mono text-foreground">{selectedParentParty.gstin}</strong>
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditMainParty(selectedParentParty)}
                  className="h-8 text-xs gap-1"
                >
                  <Edit className="size-3.5" /> Edit Main Party
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleOpenAddSubParty(selectedParentParty)}
                  className="h-8 text-xs gap-1 font-semibold"
                >
                  <Plus className="size-3.5" /> Add Sub Party
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sub Party Search & Filter Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
            <div className="relative flex-1 min-w-[260px] max-w-md">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={subSearchQuery}
                onChange={(e) => setSubSearchQuery(e.target.value)}
                placeholder="Search sub party code, name, city, GSTIN, location type..."
                className="pl-9 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={subStatusFilter} onValueChange={setSubStatusFilter}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select value={subLocationFilter} onValueChange={setSubLocationFilter}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue placeholder="Location Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Location Types</SelectItem>
                  {LOCATION_TYPES.map((lt) => (
                    <SelectItem key={lt} value={lt}>
                      {lt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={subDefaultFilter} onValueChange={setSubDefaultFilter}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue placeholder="Default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sub Parties</SelectItem>
                  <SelectItem value="yes">Default Only</SelectItem>
                  <SelectItem value="no">Non-Default</SelectItem>
                </SelectContent>
              </Select>

              <Badge variant="secondary" className="text-xs font-semibold">
                {filteredSubParties.length} Sub Parties
              </Badge>
            </div>
          </div>

          {/* Sub Party Table */}
          <Card className="rounded-md border border-border">
            <CardContent className="p-0">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="bg-muted/60 font-semibold text-muted-foreground">
                    <TableHead className="h-8 w-32">Sub Party Code</TableHead>
                    <TableHead className="h-8">Sub Party Name</TableHead>
                    <TableHead className="h-8">Location Type</TableHead>
                    <TableHead className="h-8">City</TableHead>
                    <TableHead className="h-8">GSTIN</TableHead>
                    <TableHead className="h-8">Contact Person</TableHead>
                    <TableHead className="h-8 w-24">Default</TableHead>
                    <TableHead className="h-8 w-24">Status</TableHead>
                    <TableHead className="h-8 text-right w-36">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubParties.map((sp) => (
                    <TableRow key={sp.id} className="hover:bg-muted/40">
                      <TableCell className="py-2.5 font-mono font-bold text-primary">
                        <button
                          onClick={() => setViewingSubParty(sp)}
                          className="hover:underline text-left font-mono font-bold"
                        >
                          {sp.subPartyCode}
                        </button>
                      </TableCell>

                      <TableCell className="py-2.5 font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setViewingSubParty(sp)}
                            className="hover:underline text-left font-semibold"
                          >
                            {sp.subPartyName}
                          </button>
                          {sp.isDefault && (
                            <Badge
                              variant="outline"
                              className="text-[0.5625rem] h-4 py-0 bg-primary/10 text-primary border-primary/30 gap-1 font-bold"
                            >
                              <Star className="size-2.5 fill-primary text-primary" /> Default
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="py-2.5 font-medium">
                        <Badge variant="secondary" className="text-[0.625rem]">
                          {sp.locationType === "Other" && sp.locationTypeOther
                            ? sp.locationTypeOther
                            : sp.locationType}
                        </Badge>
                      </TableCell>

                      <TableCell className="py-2.5">{sp.city}</TableCell>
                      <TableCell className="py-2.5 font-mono text-muted-foreground">{sp.gstin || "—"}</TableCell>
                      <TableCell className="py-2.5">{sp.contactPerson || "—"}</TableCell>

                      {/* Default Toggle Column */}
                      <TableCell className="py-2.5">
                        <Button
                          variant={sp.isDefault ? "default" : "outline"}
                          size="sm"
                          disabled={sp.status === "Inactive"}
                          onClick={() => handleToggleSubPartyDefault(sp)}
                          className={`h-6 text-[0.625rem] px-2 gap-1 font-semibold ${
                            sp.isDefault
                              ? "bg-primary text-primary-foreground hover:bg-primary/90"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Star className={`size-3 ${sp.isDefault ? "fill-white" : ""}`} />
                          {sp.isDefault ? "Default" : "Set Default"}
                        </Button>
                      </TableCell>

                      <TableCell className="py-2.5">
                        <Badge
                          variant={sp.status === "Active" ? "default" : "secondary"}
                          className={`text-[0.625rem] capitalize ${
                            sp.status === "Active" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                          }`}
                        >
                          {sp.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-foreground"
                            title="View Details"
                            onClick={() => setViewingSubParty(sp)}
                          >
                            <Eye className="size-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-foreground"
                            title="Edit Sub Party"
                            onClick={() => handleEditSubParty(sp)}
                          >
                            <Edit className="size-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className={`size-7 ${
                              sp.status === "Active"
                                ? "text-muted-foreground hover:text-destructive"
                                : "text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={sp.status === "Active" ? "Deactivate" : "Activate"}
                            onClick={() => handleToggleSubPartyStatus(sp)}
                          >
                            <Power className="size-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-destructive"
                            title="Delete Sub Party"
                            onClick={() => setDeletingSubParty(sp)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {!filteredSubParties.length && (
                    <TableRow>
                      <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                        <Layers className="mx-auto size-8 text-muted-foreground/30 mb-2" />
                        <p className="text-xs font-semibold">No Sub Parties found for {selectedParentParty.partyName}.</p>
                        <p className="text-[0.6875rem] text-muted-foreground mt-0.5">
                          Click "+ Add Sub Party" to add a location, office, or branch.
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL 1: NEW / EDIT MAIN PARTY DIALOG */}
      <Dialog open={partyFormOpen} onOpenChange={setPartyFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingParty ? `Edit ${activeTab}` : `New ${activeTab}`}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editingParty
                ? `Update party details for ${editingParty.partyCode}`
                : `Create a main business entity under ${activeTab}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Basic Info */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-primary border-b border-border pb-1">
                BASIC PARTY INFORMATION
              </h4>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Party Code *</Label>
                  <Input
                    className="h-8 text-xs font-mono font-bold bg-muted/40"
                    readOnly
                    value={partyFormData.partyCode || ""}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Party Type *</Label>
                  <Input className="h-8 text-xs font-semibold bg-muted/40" readOnly value={activeTab} />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Status *</Label>
                  <Select
                    value={partyFormData.status || "Active"}
                    onValueChange={(val: "Active" | "Inactive") =>
                      setPartyFormData((prev) => ({ ...prev, status: val }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs font-medium">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Party Name *</Label>
                  <Input
                    className={`h-8 text-xs font-semibold ${partyErrors.partyName ? "border-destructive" : ""}`}
                    placeholder="e.g. ABC Textiles Pvt. Ltd."
                    value={partyFormData.partyName || ""}
                    onChange={(e) =>
                      setPartyFormData((prev) => ({ ...prev, partyName: e.target.value }))
                    }
                  />
                  {partyErrors.partyName && (
                    <span className="text-[0.625rem] text-destructive">{partyErrors.partyName}</span>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Office / Legal Unit Name *</Label>
                  <Input
                    className={`h-8 text-xs ${partyErrors.officeName ? "border-destructive" : ""}`}
                    placeholder="e.g. ABC Corporate Head Office"
                    value={partyFormData.officeName || ""}
                    onChange={(e) =>
                      setPartyFormData((prev) => ({ ...prev, officeName: e.target.value }))
                    }
                  />
                  {partyErrors.officeName && (
                    <span className="text-[0.625rem] text-destructive">{partyErrors.officeName}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-primary border-b border-border pb-1">
                REGISTERED ADDRESS
              </h4>

              <div className="space-y-1">
                <Label className="text-xs">Address Line 1 *</Label>
                <Input
                  className={`h-8 text-xs ${partyErrors.addressLine1 ? "border-destructive" : ""}`}
                  placeholder="Street address or building number"
                  value={partyFormData.addressLine1 || ""}
                  onChange={(e) =>
                    setPartyFormData((prev) => ({ ...prev, addressLine1: e.target.value }))
                  }
                />
                {partyErrors.addressLine1 && (
                  <span className="text-[0.625rem] text-destructive">{partyErrors.addressLine1}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Address Line 2</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="Landmark or locality"
                    value={partyFormData.addressLine2 || ""}
                    onChange={(e) =>
                      setPartyFormData((prev) => ({ ...prev, addressLine2: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Area / Locality</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="e.g. Ring Road"
                    value={partyFormData.area || ""}
                    onChange={(e) => setPartyFormData((prev) => ({ ...prev, area: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">City *</Label>
                  <Input
                    className={`h-8 text-xs ${partyErrors.city ? "border-destructive" : ""}`}
                    placeholder="e.g. Surat"
                    value={partyFormData.city || ""}
                    onChange={(e) => setPartyFormData((prev) => ({ ...prev, city: e.target.value }))}
                  />
                  {partyErrors.city && (
                    <span className="text-[0.625rem] text-destructive">{partyErrors.city}</span>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">State *</Label>
                  <Input
                    className={`h-8 text-xs ${partyErrors.state ? "border-destructive" : ""}`}
                    placeholder="e.g. Gujarat"
                    value={partyFormData.state || ""}
                    onChange={(e) => setPartyFormData((prev) => ({ ...prev, state: e.target.value }))}
                  />
                  {partyErrors.state && (
                    <span className="text-[0.625rem] text-destructive">{partyErrors.state}</span>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">PIN Code *</Label>
                  <Input
                    className={`h-8 text-xs font-mono ${partyErrors.pinCode ? "border-destructive" : ""}`}
                    placeholder="e.g. 395002"
                    maxLength={6}
                    value={partyFormData.pinCode || ""}
                    onChange={(e) =>
                      setPartyFormData((prev) => ({ ...prev, pinCode: e.target.value }))
                    }
                  />
                  {partyErrors.pinCode && (
                    <span className="text-[0.625rem] text-destructive">{partyErrors.pinCode}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Contact & Tax */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-primary border-b border-border pb-1">
                CONTACT & LEGAL DETAILS
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Contact Person</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="Primary contact name"
                    value={partyFormData.contactPerson || ""}
                    onChange={(e) =>
                      setPartyFormData((prev) => ({ ...prev, contactPerson: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Mobile Number</Label>
                  <Input
                    className={`h-8 text-xs font-mono ${partyErrors.mobile ? "border-destructive" : ""}`}
                    placeholder="e.g. 9825012345"
                    maxLength={10}
                    value={partyFormData.mobile || ""}
                    onChange={(e) => setPartyFormData((prev) => ({ ...prev, mobile: e.target.value }))}
                  />
                  {partyErrors.mobile && (
                    <span className="text-[0.625rem] text-destructive">{partyErrors.mobile}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">GSTIN (15 chars)</Label>
                  <Input
                    className={`h-8 text-xs font-mono uppercase ${partyErrors.gstin ? "border-destructive" : ""}`}
                    placeholder="e.g. 24AAACS1234F1Z5"
                    maxLength={15}
                    value={partyFormData.gstin || ""}
                    onChange={(e) =>
                      setPartyFormData((prev) => ({ ...prev, gstin: e.target.value.toUpperCase() }))
                    }
                  />
                  {partyErrors.gstin && (
                    <span className="text-[0.625rem] text-destructive">{partyErrors.gstin}</span>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">PAN (10 chars)</Label>
                  <Input
                    className={`h-8 text-xs font-mono uppercase ${partyErrors.pan ? "border-destructive" : ""}`}
                    placeholder="e.g. AAACS1234F"
                    maxLength={10}
                    value={partyFormData.pan || ""}
                    onChange={(e) =>
                      setPartyFormData((prev) => ({ ...prev, pan: e.target.value.toUpperCase() }))
                    }
                  />
                  {partyErrors.pan && (
                    <span className="text-[0.625rem] text-destructive">{partyErrors.pan}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-border pt-3">
            <Button variant="outline" size="sm" onClick={() => setPartyFormOpen(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={() => handleSubmitPartyForm(false)} className="h-8 text-xs font-semibold">
              Save {activeTab}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: ADD / EDIT SUB PARTY DIALOG */}
      <Dialog open={subFormOpen} onOpenChange={setSubFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              {editingSubParty ? "Edit Sub Party" : "+ Add Sub Party"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add operational branch, factory, warehouse, office, or job work unit under the main Party.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Section 1: Read-Only Parent Info & Code/Name */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-primary border-b border-border pb-1">
                PARENT PARTY & SUB PARTY IDENTIFICATION
              </h4>

              <div className="grid grid-cols-2 gap-3 bg-muted/40 p-3 rounded-lg border border-border">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground">Parent Party [Read Only]</Label>
                  <Input
                    className="h-8 text-xs font-bold text-foreground bg-background"
                    readOnly
                    value={
                      selectedParentParty?.partyName ||
                      parties.find((p) => p.id === subFormData.partyId)?.partyName ||
                      "—"
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground">Party Type [Read Only]</Label>
                  <Input
                    className="h-8 text-xs font-bold text-primary bg-background font-mono"
                    readOnly
                    value={subFormData.partyType || activeTab}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Sub Party Code *</Label>
                  <Input
                    className={`h-8 text-xs font-mono font-bold ${
                      subErrors.subPartyCode || subExactCodeError ? "border-destructive" : ""
                    }`}
                    placeholder="e.g. PTY-001-01"
                    value={subFormData.subPartyCode || ""}
                    onChange={(e) => {
                      setSubFormData((prev) => ({ ...prev, subPartyCode: e.target.value }));
                      setSubExactCodeError(null);
                    }}
                  />
                  {subExactCodeError ? (
                    <span className="text-[0.625rem] text-destructive font-semibold block">
                      {subExactCodeError}
                    </span>
                  ) : subErrors.subPartyCode ? (
                    <span className="text-[0.625rem] text-destructive block">{subErrors.subPartyCode}</span>
                  ) : (
                    <span className="text-[0.625rem] text-muted-foreground block">
                      Unique code under this parent party
                    </span>
                  )}
                </div>

                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Sub Party Name *</Label>
                  <Input
                    className={`h-8 text-xs font-semibold ${subErrors.subPartyName ? "border-destructive" : ""}`}
                    placeholder="e.g. Ahmedabad Office / Surat Branch / Unit 2"
                    value={subFormData.subPartyName || ""}
                    onChange={(e) => setSubFormData((prev) => ({ ...prev, subPartyName: e.target.value }))}
                  />
                  {subErrors.subPartyName && (
                    <span className="text-[0.625rem] text-destructive block">{subErrors.subPartyName}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Location / Branch Type *</Label>
                  <Select
                    value={subFormData.locationType || "Branch Office"}
                    onValueChange={(val: LocationType) =>
                      setSubFormData((prev) => ({ ...prev, locationType: val }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs font-medium">
                      <SelectValue placeholder="Location Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCATION_TYPES.map((lt) => (
                        <SelectItem key={lt} value={lt}>
                          {lt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {subFormData.locationType === "Other" && (
                  <div className="space-y-1">
                    <Label className="text-xs">Specify Other Location</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="e.g. Processing Hub"
                      value={subFormData.locationTypeOther || ""}
                      onChange={(e) =>
                        setSubFormData((prev) => ({ ...prev, locationTypeOther: e.target.value }))
                      }
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs">Status *</Label>
                  <Select
                    value={subFormData.status || "Active"}
                    onValueChange={(val: "Active" | "Inactive") =>
                      setSubFormData((prev) => ({
                        ...prev,
                        status: val,
                        isDefault: val === "Inactive" ? false : (prev.isDefault ?? false),
                      }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs font-medium">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    id="isDefault"
                    checked={Boolean(subFormData.isDefault)}
                    disabled={subFormData.status === "Inactive"}
                    onCheckedChange={(checked) =>
                      setSubFormData((prev) => ({ ...prev, isDefault: checked }))
                    }
                  />
                  <Label htmlFor="isDefault" className="text-xs cursor-pointer font-bold text-foreground">
                    Default Sub Party
                  </Label>
                </div>
              </div>
            </div>

            {/* Section 2: Address Details */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-primary border-b border-border pb-1">
                LOCATION ADDRESS
              </h4>

              <div className="space-y-1">
                <Label className="text-xs">Address Line 1 *</Label>
                <Input
                  className={`h-8 text-xs ${subErrors.addressLine1 ? "border-destructive" : ""}`}
                  placeholder="Plot/Building number and street address"
                  value={subFormData.addressLine1 || ""}
                  onChange={(e) => setSubFormData((prev) => ({ ...prev, addressLine1: e.target.value }))}
                />
                {subErrors.addressLine1 && (
                  <span className="text-[0.625rem] text-destructive block">{subErrors.addressLine1}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Address Line 2</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="Landmark or additional street info"
                    value={subFormData.addressLine2 || ""}
                    onChange={(e) => setSubFormData((prev) => ({ ...prev, addressLine2: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Area / Locality</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="e.g. Ring Road Industrial Area"
                    value={subFormData.area || ""}
                    onChange={(e) => setSubFormData((prev) => ({ ...prev, area: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">City *</Label>
                  <Input
                    className={`h-8 text-xs ${subErrors.city ? "border-destructive" : ""}`}
                    placeholder="e.g. Surat"
                    value={subFormData.city || ""}
                    onChange={(e) => setSubFormData((prev) => ({ ...prev, city: e.target.value }))}
                  />
                  {subErrors.city && (
                    <span className="text-[0.625rem] text-destructive block">{subErrors.city}</span>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">District</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="e.g. Surat"
                    value={subFormData.district || ""}
                    onChange={(e) => setSubFormData((prev) => ({ ...prev, district: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">State *</Label>
                  <Input
                    className={`h-8 text-xs ${subErrors.state ? "border-destructive" : ""}`}
                    placeholder="e.g. Gujarat"
                    value={subFormData.state || ""}
                    onChange={(e) => setSubFormData((prev) => ({ ...prev, state: e.target.value }))}
                  />
                  {subErrors.state && (
                    <span className="text-[0.625rem] text-destructive block">{subErrors.state}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">PIN Code</Label>
                  <Input
                    className="h-8 text-xs font-mono"
                    placeholder="e.g. 395002"
                    maxLength={6}
                    value={subFormData.pinCode || ""}
                    onChange={(e) => setSubFormData((prev) => ({ ...prev, pinCode: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Country</Label>
                  <Input className="h-8 text-xs bg-muted/40" readOnly value="India" />
                </div>
              </div>
            </div>

            {/* Section 3: Tax / Legal */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-primary border-b border-border pb-1">
                TAX & REGISTRATION (SUB PARTY LEVEL)
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Branch GSTIN (15 chars)</Label>
                  <Input
                    className={`h-8 text-xs font-mono uppercase ${subErrors.gstin ? "border-destructive" : ""}`}
                    placeholder="e.g. 24AAACS1234F1Z5"
                    maxLength={15}
                    value={subFormData.gstin || ""}
                    onChange={(e) =>
                      setSubFormData((prev) => ({ ...prev, gstin: e.target.value.toUpperCase() }))
                    }
                  />
                  {subErrors.gstin ? (
                    <span className="text-[0.625rem] text-destructive block">{subErrors.gstin}</span>
                  ) : (
                    <span className="text-[0.625rem] text-muted-foreground block">
                      Specific branch GST registration if different from parent
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">PAN (10 chars)</Label>
                  <Input
                    className={`h-8 text-xs font-mono uppercase ${subErrors.pan ? "border-destructive" : ""}`}
                    placeholder="e.g. AAACS1234F"
                    maxLength={10}
                    value={subFormData.pan || ""}
                    onChange={(e) =>
                      setSubFormData((prev) => ({ ...prev, pan: e.target.value.toUpperCase() }))
                    }
                  />
                  {subErrors.pan && (
                    <span className="text-[0.625rem] text-destructive block">{subErrors.pan}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Section 4: Contact Details */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-primary border-b border-border pb-1">
                CONTACT PERSON & COMMUNICATION
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Contact Person Name</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="Local contact person"
                    value={subFormData.contactPerson || ""}
                    onChange={(e) => setSubFormData((prev) => ({ ...prev, contactPerson: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Mobile Number</Label>
                  <Input
                    className={`h-8 text-xs font-mono ${subErrors.mobile ? "border-destructive" : ""}`}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    value={subFormData.mobile || ""}
                    onChange={(e) => setSubFormData((prev) => ({ ...prev, mobile: e.target.value }))}
                  />
                  {subErrors.mobile && (
                    <span className="text-[0.625rem] text-destructive block">{subErrors.mobile}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Alternate Mobile</Label>
                  <Input
                    className="h-8 text-xs font-mono"
                    placeholder="Secondary mobile"
                    maxLength={10}
                    value={subFormData.alternateMobile || ""}
                    onChange={(e) =>
                      setSubFormData((prev) => ({ ...prev, alternateMobile: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Landline / Phone</Label>
                  <Input
                    className="h-8 text-xs font-mono"
                    placeholder="Landline with STD code"
                    value={subFormData.phone || ""}
                    onChange={(e) => setSubFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Email Address</Label>
                  <Input
                    className={`h-8 text-xs ${subErrors.email ? "border-destructive" : ""}`}
                    placeholder="e.g. branch@company.com"
                    value={subFormData.email || ""}
                    onChange={(e) => setSubFormData((prev) => ({ ...prev, email: e.target.value }))}
                  />
                  {subErrors.email && (
                    <span className="text-[0.625rem] text-destructive block">{subErrors.email}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Section 5: Transaction Addresses */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-1">
                <h4 className="font-bold text-xs uppercase tracking-wider text-primary">
                  TRANSACTION ADDRESSES
                </h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyMainAddressToTransaction}
                  className="h-6 text-[0.6875rem] text-primary hover:text-primary font-semibold"
                >
                  Copy from Location Address
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Billing Address</Label>
                  <Textarea
                    className="text-xs h-16"
                    placeholder="Full billing address..."
                    value={subFormData.billingAddress || ""}
                    onChange={(e) => setSubFormData((prev) => ({ ...prev, billingAddress: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Shipping Address</Label>
                  <Textarea
                    className="text-xs h-16"
                    placeholder="Full shipping address..."
                    value={subFormData.shippingAddress || ""}
                    onChange={(e) =>
                      setSubFormData((prev) => ({ ...prev, shippingAddress: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Delivery Address</Label>
                  <Textarea
                    className="text-xs h-16"
                    placeholder="Full delivery address..."
                    value={subFormData.deliveryAddress || ""}
                    onChange={(e) =>
                      setSubFormData((prev) => ({ ...prev, deliveryAddress: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Section 6: Remarks & Notes */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-primary border-b border-border pb-1">
                REMARKS & INTERNAL NOTES
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Public Remarks</Label>
                  <Textarea
                    className="text-xs h-16"
                    placeholder="Remarks visible on vouchers..."
                    value={subFormData.remarks || ""}
                    onChange={(e) => setSubFormData((prev) => ({ ...prev, remarks: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Internal Notes</Label>
                  <Textarea
                    className="text-xs h-16"
                    placeholder="Internal audit notes..."
                    value={subFormData.internalNotes || ""}
                    onChange={(e) =>
                      setSubFormData((prev) => ({ ...prev, internalNotes: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-border pt-3">
            <Button variant="outline" size="sm" onClick={() => setSubFormOpen(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={() => handleSubmitSubPartyForm(false)} className="h-8 text-xs font-semibold">
              Save Sub Party
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: VIEW MAIN PARTY DETAIL */}
      <Dialog open={Boolean(viewingParty)} onOpenChange={(open) => !open && setViewingParty(null)}>
        {viewingParty && (
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6 text-xs">
            <DialogHeader className="border-b border-border pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-base font-bold flex items-center gap-2">
                    {viewingParty.partyName}
                    <Badge variant={viewingParty.status === "Active" ? "default" : "secondary"}>
                      {viewingParty.status}
                    </Badge>
                  </DialogTitle>
                  <p className="text-xs font-mono font-semibold text-primary mt-0.5">
                    {viewingParty.partyCode} · {viewingParty.officeName}
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1 border-b border-border pb-3">
                <h5 className="font-semibold text-xs text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                  <MapPin className="size-3.5 text-primary" /> Registered Office Address
                </h5>
                <p className="font-medium text-foreground">{viewingParty.addressLine1}</p>
                <p className="text-muted-foreground">
                  {viewingParty.city}, {viewingParty.state} —{" "}
                  <strong className="font-mono text-foreground">{viewingParty.pinCode}</strong>
                </p>
              </div>

              <div className="space-y-1.5 border-b border-border pb-3">
                <h5 className="font-semibold text-xs text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                  <Phone className="size-3.5 text-primary" /> Contact & Tax Information
                </h5>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[0.6875rem]">Contact Person:</span>
                    <span className="font-medium">{viewingParty.contactPerson || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[0.6875rem]">Mobile:</span>
                    <span className="font-mono font-semibold">{viewingParty.mobile || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[0.6875rem]">GSTIN:</span>
                    <span className="font-mono font-bold">{viewingParty.gstin || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[0.6875rem]">PAN:</span>
                    <span className="font-mono font-bold">{viewingParty.pan || "—"}</span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 border-t border-border pt-3">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  const p = viewingParty;
                  setViewingParty(null);
                  setSelectedParentParty(p);
                }}
              >
                <Layers className="size-3.5 mr-1 text-primary" /> View Sub Parties
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setViewingParty(null)} className="h-8 text-xs">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* MODAL 4: VIEW SUB PARTY DETAIL */}
      <Dialog open={Boolean(viewingSubParty)} onOpenChange={(open) => !open && setViewingSubParty(null)}>
        {viewingSubParty && (
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6 text-xs">
            <DialogHeader className="border-b border-border pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-base font-bold flex items-center gap-2">
                    {viewingSubParty.subPartyName}
                    {viewingSubParty.isDefault && (
                      <Badge variant="outline" className="text-[0.625rem] bg-primary/10 text-primary border-primary/30 font-bold">
                        Default
                      </Badge>
                    )}
                    <Badge variant={viewingSubParty.status === "Active" ? "default" : "secondary"}>
                      {viewingSubParty.status}
                    </Badge>
                  </DialogTitle>
                  <p className="text-xs font-mono font-semibold text-primary mt-0.5">
                    {viewingSubParty.subPartyCode} · Location Type: {viewingSubParty.locationType}
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1 border-b border-border pb-3">
                <h5 className="font-semibold text-xs text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                  <MapPin className="size-3.5 text-primary" /> Location Address
                </h5>
                <p className="font-medium text-foreground">
                  {viewingSubParty.addressLine1}
                  {viewingSubParty.addressLine2 ? `, ${viewingSubParty.addressLine2}` : ""}
                </p>
                <p className="text-muted-foreground">
                  {viewingSubParty.area ? `${viewingSubParty.area}, ` : ""}
                  {viewingSubParty.city}, {viewingSubParty.state} —{" "}
                  <strong className="font-mono text-foreground">{viewingSubParty.pinCode || "—"}</strong>
                </p>
              </div>

              <div className="space-y-1.5 border-b border-border pb-3">
                <h5 className="font-semibold text-xs text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                  <Phone className="size-3.5 text-primary" /> Contact & Communication
                </h5>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[0.6875rem]">Contact Person:</span>
                    <span className="font-medium">{viewingSubParty.contactPerson || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[0.6875rem]">Mobile:</span>
                    <span className="font-mono font-semibold">{viewingSubParty.mobile || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[0.6875rem]">Email:</span>
                    <span>{viewingSubParty.email || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[0.6875rem]">Landline:</span>
                    <span className="font-mono">{viewingSubParty.phone || "—"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 border-b border-border pb-3">
                <h5 className="font-semibold text-xs text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                  <FileText className="size-3.5 text-primary" /> Tax Details
                </h5>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[0.6875rem]">Branch GSTIN:</span>
                    <span className="font-mono font-bold text-foreground">{viewingSubParty.gstin || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[0.6875rem]">PAN:</span>
                    <span className="font-mono font-bold text-foreground">{viewingSubParty.pan || "—"}</span>
                  </div>
                </div>
              </div>

              {viewingSubParty.billingAddress && (
                <div className="space-y-1">
                  <span className="text-muted-foreground block text-[0.6875rem] font-semibold">Billing Address:</span>
                  <p className="text-xs bg-muted/40 p-2 rounded">{viewingSubParty.billingAddress}</p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 border-t border-border pt-3">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  const sp = viewingSubParty;
                  setViewingSubParty(null);
                  handleEditSubParty(sp);
                }}
              >
                <Edit className="size-3.5 mr-1" /> Edit Sub Party
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setViewingSubParty(null)} className="h-8 text-xs">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* MODAL 5: SUB PARTY FUZZY DUPLICATE WARNING */}
      <AlertDialog open={Boolean(subFuzzyMatch)} onOpenChange={(open) => !open && setSubFuzzyMatch(null)}>
        {subFuzzyMatch && (
          <AlertDialogContent className="max-w-md text-xs">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-bold flex items-center gap-2 text-amber-600">
                <AlertTriangle className="size-5" /> Similar Sub Party Name Found
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-foreground space-y-2 pt-2">
                <p>A Sub Party with a similar name already exists under this Party:</p>
                <div className="rounded border border-amber-200 bg-amber-50/50 p-3 space-y-1 font-mono text-xs">
                  <p className="font-bold text-amber-900">{subFuzzyMatch.subPartyName}</p>
                  <p className="text-amber-800 font-semibold">Code: {subFuzzyMatch.subPartyCode}</p>
                  <p className="text-amber-800">Location: {subFuzzyMatch.locationType} ({subFuzzyMatch.city})</p>
                  {subFuzzyMatch.gstin && <p className="text-amber-800">GSTIN: {subFuzzyMatch.gstin}</p>}
                </div>
                <p className="text-muted-foreground font-medium pt-1">
                  Do you want to proceed and save this Sub Party?
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel onClick={() => setSubFuzzyMatch(null)} className="h-8 text-xs">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleSubmitSubPartyForm(true)}
                className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                Continue & Save
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>

      {/* MODAL 6: MAIN PARTY DUPLICATE WARNING */}
      <AlertDialog open={Boolean(partyDuplicateMatch)} onOpenChange={(open) => !open && setPartyDuplicateMatch(null)}>
        {partyDuplicateMatch && (
          <AlertDialogContent className="max-w-md text-xs">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-bold flex items-center gap-2 text-amber-600">
                <AlertTriangle className="size-5" /> Possible Duplicate Party Found
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-foreground space-y-2 pt-2">
                <p>A party with matching details already exists in the system:</p>
                <div className="rounded border border-amber-200 bg-amber-50/50 p-3 space-y-1 font-mono text-xs">
                  <p className="font-bold text-amber-900">{partyDuplicateMatch.partyName}</p>
                  <p className="text-amber-800 font-semibold">Code: {partyDuplicateMatch.partyCode}</p>
                  <p className="text-amber-800">Office: {partyDuplicateMatch.officeName}</p>
                  {partyDuplicateMatch.gstin && <p className="text-amber-800">GSTIN: {partyDuplicateMatch.gstin}</p>}
                </div>
                <p className="text-muted-foreground font-medium pt-1">Do you want to continue saving?</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel onClick={() => setPartyDuplicateMatch(null)} className="h-8 text-xs">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleSubmitPartyForm(true)}
                className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                Continue & Save
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>

      {/* MODAL 7: DEACTIVATE CONFIRMATION DIALOG FOR MAIN PARTY */}
      <AlertDialog open={Boolean(deactivatingParty)} onOpenChange={(open) => !open && setDeactivatingParty(null)}>
        {deactivatingParty && (
          <AlertDialogContent className="max-w-md text-xs">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-bold text-foreground">
                Deactivate Party?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground pt-1">
                This party (<strong>{deactivatingParty.partyCode} — {deactivatingParty.partyName}</strong>) will no longer be available for new transactions. Existing records will remain unchanged.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel onClick={() => setDeactivatingParty(null)} className="h-8 text-xs">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setPartyStatus(deactivatingParty.id, "Inactive");
                  refreshData();
                  setDeactivatingParty(null);
                  toast.info(`Party ${deactivatingParty.partyCode} deactivated`);
                }}
                className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold"
              >
                Deactivate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>

      {/* MODAL 8: DEACTIVATE CONFIRMATION DIALOG FOR SUB PARTY */}
      <AlertDialog open={Boolean(deactivatingSubParty)} onOpenChange={(open) => !open && setDeactivatingSubParty(null)}>
        {deactivatingSubParty && (
          <AlertDialogContent className="max-w-md text-xs">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-bold text-foreground">
                Deactivate Sub Party?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground pt-1">
                This Sub Party (<strong>{deactivatingSubParty.subPartyCode} — {deactivatingSubParty.subPartyName}</strong>) will no longer appear in transaction dropdowns. If it was Default, default status will be removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel onClick={() => setDeactivatingSubParty(null)} className="h-8 text-xs">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeactivateSubParty}
                className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold"
              >
                Deactivate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>

      {/* MODAL 9: DELETE CONFIRMATION / DELETE BLOCKED WARNING FOR SUB PARTY */}
      <AlertDialog open={Boolean(deletingSubParty)} onOpenChange={(open) => !open && setDeletingSubParty(null)}>
        {deletingSubParty && (
          <AlertDialogContent className="max-w-md text-xs">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-bold text-destructive">
                Delete Sub Party?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground pt-1">
                Are you sure you want to delete Sub Party <strong>{deletingSubParty.subPartyCode} — {deletingSubParty.subPartyName}</strong>? This action cannot be undone if it has not been used in transactions.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel onClick={() => setDeletingSubParty(null)} className="h-8 text-xs">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDeleteSubParty(deletingSubParty)}
                className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>

      {/* MODAL 10: DELETE BLOCKED WARNING DIALOG */}
      <AlertDialog open={Boolean(deleteBlockedMsg)} onOpenChange={(open) => !open && setDeleteBlockedMsg(null)}>
        <AlertDialogContent className="max-w-md text-xs">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <AlertTriangle className="size-5" /> Cannot Delete Record
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-foreground pt-2">
              {deleteBlockedMsg}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setDeleteBlockedMsg(null)} className="h-8 text-xs">
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

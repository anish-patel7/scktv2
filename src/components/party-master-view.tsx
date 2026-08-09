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
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

import {
  getLocalParties,
  savePartyRecord,
  clonePartyRecord,
  setPartyStatus,
  deletePartyRecord,
  generateNextPartyCode,
  findPossibleDuplicates,
  validateGSTIN,
  validatePAN,
  validateMobile,
  validatePIN,
  validateEmail,
  type PartyRecord,
} from "@/lib/party-store";

export function PartyMasterView() {
  const [parties, setParties] = useState<PartyRecord[]>(() => getLocalParties());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [jobWorkFilter, setJobWorkFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");

  // Form State
  const [formOpen, setFormOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<PartyRecord | null>(null);
  const [formData, setFormData] = useState<Partial<PartyRecord>>({});
  const [errors, setErrors] = useState<Partial<Record<keyof PartyRecord, string>>>({});

  // Modals & Dialogs
  const [viewingParty, setViewingParty] = useState<PartyRecord | null>(null);
  const [duplicateMatch, setDuplicateMatch] = useState<PartyRecord | null>(null);
  const [deactivatingParty, setDeactivatingParty] = useState<PartyRecord | null>(null);
  const [deletingParty, setDeletingParty] = useState<PartyRecord | null>(null);
  const [deleteBlockedMsg, setDeleteBlockedMsg] = useState<string | null>(null);

  const refreshParties = () => {
    setParties(getLocalParties());
  };

  // State & City Options for Filters
  const uniqueStates = useMemo(
    () => Array.from(new Set(parties.map((p) => p.state).filter(Boolean))),
    [parties]
  );
  const uniqueCities = useMemo(
    () => Array.from(new Set(parties.map((p) => p.city).filter(Boolean))),
    [parties]
  );

  // Debounced & Filtered List
  const filteredParties = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return parties.filter((p) => {
      // Search Box Filter
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
      const matchesJobWork = jobWorkFilter === "all" || p.jobWorkApplicable === jobWorkFilter;
      const matchesState = stateFilter === "all" || p.state === stateFilter;
      const matchesCity = cityFilter === "all" || p.city === cityFilter;

      return matchesQuery && matchesStatus && matchesJobWork && matchesState && matchesCity;
    });
  }, [parties, searchQuery, statusFilter, jobWorkFilter, stateFilter, cityFilter]);

  // Open Form for New Party
  const handleNewRecord = () => {
    const nextCode = generateNextPartyCode();
    setEditingParty(null);
    setFormData({
      partyCode: nextCode,
      partyName: "",
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
      jobWorkApplicable: "Yes",
      jobWorkRemarks: "",
      remarks: "",
      status: "Active",
    });
    setErrors({});
    setFormOpen(true);
  };

  // Open Form for Edit Party
  const handleEditRecord = (party: PartyRecord) => {
    setEditingParty(party);
    setFormData({ ...party });
    setErrors({});
    setFormOpen(true);
  };

  // Clone Party
  const handleCloneRecord = (party: PartyRecord) => {
    const cloned = clonePartyRecord(party.id);
    setEditingParty(null); // treat as new cloned form
    setFormData(cloned);
    setErrors({});
    setFormOpen(true);
    toast.info(`Cloned party. New Code: ${cloned.partyCode}`);
  };

  // Field change handler with live validation & auto-uppercase
  const handleFieldChange = (key: keyof PartyRecord, value: string) => {
    let finalVal = value;

    if (key === "gstin" || key === "pan") {
      finalVal = value.toUpperCase();
    }

    setFormData((prev) => ({ ...prev, [key]: finalVal }));

    // Clear field error
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  // Form Validation Check
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof PartyRecord, string>> = {};

    if (!formData.partyCode?.trim()) newErrors.partyCode = "Party Code is required";
    if (!formData.partyName?.trim()) newErrors.partyName = "Party Name is required";
    if (!formData.officeName?.trim()) newErrors.officeName = "Office Name is required";
    if (!formData.addressLine1?.trim()) newErrors.addressLine1 = "Address Line 1 is required";
    if (!formData.city?.trim()) newErrors.city = "City is required";
    if (!formData.state?.trim()) newErrors.state = "State is required";
    if (!formData.pinCode?.trim()) {
      newErrors.pinCode = "PIN Code is required";
    } else if (!validatePIN(formData.pinCode)) {
      newErrors.pinCode = "PIN Code must be a 6-digit number";
    }

    if (formData.gstin && !validateGSTIN(formData.gstin)) {
      newErrors.gstin = "Invalid Indian GSTIN format (e.g. 24AAACS1234F1Z5)";
    }

    if (formData.pan && !validatePAN(formData.pan)) {
      newErrors.pan = "Invalid Indian PAN format (e.g. AAACS1234F)";
    }

    if (formData.mobile && !validateMobile(formData.mobile)) {
      newErrors.mobile = "Invalid 10-digit Indian mobile number";
    }

    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = "Invalid email address format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Handler (with duplicate check)
  const handleSubmitForm = (bypassDuplicateCheck = false) => {
    if (!validateForm()) {
      toast.error("Please resolve validation errors before saving");
      return;
    }

    // Check for duplicate parties unless bypassed
    if (!bypassDuplicateCheck) {
      const match = findPossibleDuplicates(
        formData.partyName || "",
        formData.officeName || "",
        formData.gstin,
        formData.mobile,
        editingParty?.id
      );

      if (match) {
        setDuplicateMatch(match);
        return;
      }
    }

    // Save Party Record
    const saved = savePartyRecord(formData as PartyRecord);
    refreshParties();
    setFormOpen(false);
    setDuplicateMatch(null);
    toast.success(`Party ${saved.partyCode} (${saved.partyName}) saved successfully!`);
  };

  // Toggle Activate / Deactivate
  const handleToggleStatus = (party: PartyRecord) => {
    if (party.status === "Active") {
      setDeactivatingParty(party);
    } else {
      setPartyStatus(party.id, "Active");
      refreshParties();
      toast.success(`Party ${party.partyCode} reactivated`);
    }
  };

  const confirmDeactivate = () => {
    if (deactivatingParty) {
      setPartyStatus(deactivatingParty.id, "Inactive");
      refreshParties();
      setDeactivatingParty(null);
      toast.info(`Party ${deactivatingParty.partyCode} deactivated`);
    }
  };

  // Attempt Delete Party
  const handleDeleteAttempt = (party: PartyRecord) => {
    const res = deletePartyRecord(party.id);
    if (!res.success) {
      setDeleteBlockedMsg(res.message);
    } else {
      refreshParties();
      toast.success("Party deleted successfully");
    }
    setDeletingParty(null);
  };

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search party name, office name, mobile, city, GSTIN..."
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
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

          {/* Job Work Filter */}
          <Select value={jobWorkFilter} onValueChange={setJobWorkFilter}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue placeholder="Job Work" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Job Work</SelectItem>
              <SelectItem value="Yes">Job Work: Yes</SelectItem>
              <SelectItem value="No">Job Work: No</SelectItem>
            </SelectContent>
          </Select>

          {/* State Filter */}
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

          <Badge variant="secondary" className="text-xs">
            {filteredParties.length} Records
          </Badge>

          <Button size="sm" onClick={handleNewRecord} className="h-8 gap-1 text-xs">
            <Plus className="size-3.5" /> New Record
          </Button>
        </div>
      </div>

      {/* Main Party Table */}
      <Card className="rounded-md border border-border">
        <CardContent className="p-0">
          <Table className="text-xs">
            <TableHeader>
              <TableRow className="bg-muted/60 font-semibold text-muted-foreground">
                <TableHead className="h-8 w-24">Code</TableHead>
                <TableHead className="h-8">Party Name</TableHead>
                <TableHead className="h-8">Office Name</TableHead>
                <TableHead className="h-8">City</TableHead>
                <TableHead className="h-8">Contact Person</TableHead>
                <TableHead className="h-8">Mobile</TableHead>
                <TableHead className="h-8 w-24">Status</TableHead>
                <TableHead className="h-8 text-right w-36">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParties.map((p) => (
                <TableRow key={p.id} className="hover:bg-muted/40">
                  <TableCell className="py-2 font-mono font-bold text-primary">
                    <button
                      onClick={() => setViewingParty(p)}
                      className="hover:underline text-left font-mono font-bold"
                    >
                      {p.partyCode}
                    </button>
                  </TableCell>
                  <TableCell className="py-2 font-semibold text-foreground">
                    <button onClick={() => setViewingParty(p)} className="hover:underline text-left font-semibold">
                      {p.partyName}
                    </button>
                  </TableCell>
                  <TableCell className="py-2 text-muted-foreground">{p.officeName}</TableCell>
                  <TableCell className="py-2 font-medium">{p.city}</TableCell>
                  <TableCell className="py-2">{p.contactPerson || "—"}</TableCell>
                  <TableCell className="py-2 font-mono">{p.mobile || "—"}</TableCell>
                  <TableCell className="py-2">
                    <Badge
                      variant={p.status === "Active" ? "default" : "secondary"}
                      className={`text-[0.625rem] capitalize ${
                        p.status === "Active" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                      }`}
                    >
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
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
                        onClick={() => handleEditRecord(p)}
                      >
                        <Edit className="size-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-foreground"
                        title="Clone Party"
                        onClick={() => handleCloneRecord(p)}
                      >
                        <Copy className="size-3.5" />
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
                        onClick={() => handleToggleStatus(p)}
                      >
                        <Power className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {!filteredParties.length && (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    <Building2 className="mx-auto size-8 text-muted-foreground/30 mb-2" />
                    <p className="text-xs font-semibold">No party records match this filter.</p>
                    <p className="text-[0.6875rem] text-muted-foreground mt-0.5">
                      Click "+ New Record" to add a new Job Work party.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* NEW / EDIT PARTY FORM DIALOG */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingParty ? "Edit Party" : "New Party"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editingParty
                ? `Update party details for ${editingParty.partyCode}`
                : "Create a new Job Work party master record."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* 1. BASIC PARTY INFORMATION */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-primary border-b border-border pb-1">
                BASIC PARTY INFORMATION
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Party Code *</Label>
                  <Input
                    className="h-8 text-xs font-mono font-bold bg-muted/40"
                    readOnly
                    value={formData.partyCode || ""}
                  />
                  <span className="text-[0.625rem] text-muted-foreground">Auto-generated unique code</span>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Status *</Label>
                  <Select
                    value={formData.status || "Active"}
                    onValueChange={(val: "Active" | "Inactive") => handleFieldChange("status", val)}
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
                    className={`h-8 text-xs font-semibold ${errors.partyName ? "border-destructive" : ""}`}
                    placeholder="e.g. Shree Ram Textiles"
                    value={formData.partyName || ""}
                    onChange={(e) => handleFieldChange("partyName", e.target.value)}
                  />
                  {errors.partyName && (
                    <span className="text-[0.625rem] text-destructive">{errors.partyName}</span>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Office Name *</Label>
                  <Input
                    className={`h-8 text-xs ${errors.officeName ? "border-destructive" : ""}`}
                    placeholder="e.g. Shree Ram Dyeing & Finishing Unit"
                    value={formData.officeName || ""}
                    onChange={(e) => handleFieldChange("officeName", e.target.value)}
                  />
                  {errors.officeName && (
                    <span className="text-[0.625rem] text-destructive">{errors.officeName}</span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. OFFICE ADDRESS */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-primary border-b border-border pb-1">
                OFFICE ADDRESS
              </h4>

              <div className="space-y-1">
                <Label className="text-xs">Address Line 1 *</Label>
                <Input
                  className={`h-8 text-xs ${errors.addressLine1 ? "border-destructive" : ""}`}
                  placeholder="Street address, building, or plot number"
                  value={formData.addressLine1 || ""}
                  onChange={(e) => handleFieldChange("addressLine1", e.target.value)}
                />
                {errors.addressLine1 && (
                  <span className="text-[0.625rem] text-destructive">{errors.addressLine1}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Address Line 2</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="Landmark or additional street info"
                    value={formData.addressLine2 || ""}
                    onChange={(e) => handleFieldChange("addressLine2", e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Area / Locality</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="e.g. Ring Road Industrial Estate"
                    value={formData.area || ""}
                    onChange={(e) => handleFieldChange("area", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">City *</Label>
                  <Input
                    className={`h-8 text-xs ${errors.city ? "border-destructive" : ""}`}
                    placeholder="e.g. Surat"
                    value={formData.city || ""}
                    onChange={(e) => handleFieldChange("city", e.target.value)}
                  />
                  {errors.city && <span className="text-[0.625rem] text-destructive">{errors.city}</span>}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">District</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="e.g. Surat"
                    value={formData.district || ""}
                    onChange={(e) => handleFieldChange("district", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">State *</Label>
                  <Input
                    className={`h-8 text-xs ${errors.state ? "border-destructive" : ""}`}
                    placeholder="e.g. Gujarat"
                    value={formData.state || ""}
                    onChange={(e) => handleFieldChange("state", e.target.value)}
                  />
                  {errors.state && <span className="text-[0.625rem] text-destructive">{errors.state}</span>}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">PIN Code *</Label>
                  <Input
                    className={`h-8 text-xs font-mono ${errors.pinCode ? "border-destructive" : ""}`}
                    placeholder="e.g. 395002"
                    maxLength={6}
                    value={formData.pinCode || ""}
                    onChange={(e) => handleFieldChange("pinCode", e.target.value)}
                  />
                  {errors.pinCode && <span className="text-[0.625rem] text-destructive">{errors.pinCode}</span>}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Country</Label>
                  <Input className="h-8 text-xs bg-muted/40" readOnly value="India" />
                </div>
              </div>
            </div>

            {/* 3. CONTACT DETAILS */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-primary border-b border-border pb-1">
                CONTACT DETAILS
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Contact Person Name</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="Primary contact person"
                    value={formData.contactPerson || ""}
                    onChange={(e) => handleFieldChange("contactPerson", e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Designation</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="e.g. General Manager / Plant Head"
                    value={formData.designation || ""}
                    onChange={(e) => handleFieldChange("designation", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Mobile Number</Label>
                  <Input
                    className={`h-8 text-xs font-mono ${errors.mobile ? "border-destructive" : ""}`}
                    placeholder="e.g. 9825012345"
                    maxLength={10}
                    value={formData.mobile || ""}
                    onChange={(e) => handleFieldChange("mobile", e.target.value)}
                  />
                  {errors.mobile && <span className="text-[0.625rem] text-destructive">{errors.mobile}</span>}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Alternate Mobile</Label>
                  <Input
                    className="h-8 text-xs font-mono"
                    placeholder="Secondary contact number"
                    maxLength={10}
                    value={formData.alternateMobile || ""}
                    onChange={(e) => handleFieldChange("alternateMobile", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Email Address</Label>
                  <Input
                    className={`h-8 text-xs ${errors.email ? "border-destructive" : ""}`}
                    placeholder="e.g. contact@shreeram.com"
                    value={formData.email || ""}
                    onChange={(e) => handleFieldChange("email", e.target.value)}
                  />
                  {errors.email && <span className="text-[0.625rem] text-destructive">{errors.email}</span>}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">WhatsApp Number</Label>
                  <Input
                    className="h-8 text-xs font-mono"
                    placeholder="WhatsApp contact"
                    value={formData.whatsappNumber || ""}
                    onChange={(e) => handleFieldChange("whatsappNumber", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* 4. TAX DETAILS */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-primary border-b border-border pb-1">
                TAX DETAILS
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">GSTIN (15 characters)</Label>
                  <Input
                    className={`h-8 text-xs font-mono uppercase ${errors.gstin ? "border-destructive" : ""}`}
                    placeholder="e.g. 24AAACS1234F1Z5"
                    maxLength={15}
                    value={formData.gstin || ""}
                    onChange={(e) => handleFieldChange("gstin", e.target.value)}
                  />
                  {errors.gstin && <span className="text-[0.625rem] text-destructive">{errors.gstin}</span>}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">PAN (10 characters)</Label>
                  <Input
                    className={`h-8 text-xs font-mono uppercase ${errors.pan ? "border-destructive" : ""}`}
                    placeholder="e.g. AAACS1234F"
                    maxLength={10}
                    value={formData.pan || ""}
                    onChange={(e) => handleFieldChange("pan", e.target.value)}
                  />
                  {errors.pan && <span className="text-[0.625rem] text-destructive">{errors.pan}</span>}
                </div>
              </div>
            </div>

            {/* 5. JOB WORK DETAILS */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-primary border-b border-border pb-1">
                JOB WORK DETAILS
              </h4>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Job Work Applicable *</Label>
                  <Select
                    value={formData.jobWorkApplicable || "Yes"}
                    onValueChange={(val: "Yes" | "No") => handleFieldChange("jobWorkApplicable", val)}
                  >
                    <SelectTrigger className="h-8 text-xs font-semibold">
                      <SelectValue placeholder="Job Work Applicable" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Job Work Remarks</Label>
                  <Input
                    className="h-8 text-xs"
                    placeholder="Specializations, capacities, or notes..."
                    value={formData.jobWorkRemarks || ""}
                    onChange={(e) => handleFieldChange("jobWorkRemarks", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* 6. REMARKS */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-primary border-b border-border pb-1">
                GENERAL REMARKS
              </h4>
              <Textarea
                className="text-xs h-20"
                placeholder="Internal party remarks, notes, or history..."
                value={formData.remarks || ""}
                onChange={(e) => handleFieldChange("remarks", e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-border pt-3">
            <Button variant="outline" size="sm" onClick={() => setFormOpen(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={() => handleSubmitForm(false)} className="h-8 text-xs font-semibold">
              Save Party
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VIEW PARTY DETAIL MODAL */}
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
              {/* Office Address */}
              <div className="space-y-1 border-b border-border pb-3">
                <h5 className="font-semibold text-xs text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                  <MapPin className="size-3.5 text-primary" /> Office Address
                </h5>
                <p className="font-medium text-foreground">
                  {viewingParty.addressLine1}
                  {viewingParty.addressLine2 ? `, ${viewingParty.addressLine2}` : ""}
                </p>
                <p className="text-muted-foreground">
                  {viewingParty.area ? `${viewingParty.area}, ` : ""}
                  {viewingParty.city}, {viewingParty.district ? `${viewingParty.district}, ` : ""}
                  {viewingParty.state} — <strong className="font-mono text-foreground">{viewingParty.pinCode}</strong> ({viewingParty.country})
                </p>
              </div>

              {/* Contact Details */}
              <div className="space-y-1.5 border-b border-border pb-3">
                <h5 className="font-semibold text-xs text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                  <Phone className="size-3.5 text-primary" /> Contact Details
                </h5>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[0.6875rem]">Contact Person:</span>
                    <span className="font-medium">{viewingParty.contactPerson || "—"} ({viewingParty.designation || "N/A"})</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[0.6875rem]">Mobile Number:</span>
                    <span className="font-mono font-semibold">{viewingParty.mobile || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[0.6875rem]">Email:</span>
                    <span>{viewingParty.email || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[0.6875rem]">WhatsApp:</span>
                    <span className="font-mono">{viewingParty.whatsappNumber || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Tax Details */}
              <div className="space-y-1.5 border-b border-border pb-3">
                <h5 className="font-semibold text-xs text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                  <FileText className="size-3.5 text-primary" /> Tax Details
                </h5>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[0.6875rem]">GSTIN:</span>
                    <span className="font-mono font-bold text-foreground">{viewingParty.gstin || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[0.6875rem]">PAN:</span>
                    <span className="font-mono font-bold text-foreground">{viewingParty.pan || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Job Work & Remarks */}
              <div className="space-y-1.5">
                <h5 className="font-semibold text-xs text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                  <Briefcase className="size-3.5 text-primary" /> Job Work & Internal Remarks
                </h5>
                <p className="text-xs">
                  Job Work Applicable: <strong className="font-semibold">{viewingParty.jobWorkApplicable}</strong>
                </p>
                {viewingParty.jobWorkRemarks && (
                  <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                    {viewingParty.jobWorkRemarks}
                  </p>
                )}
                {viewingParty.remarks && (
                  <p className="text-xs text-muted-foreground italic border-l-2 border-primary/40 pl-2 mt-1">
                    "{viewingParty.remarks}"
                  </p>
                )}
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
                  handleEditRecord(p);
                }}
              >
                <Edit className="size-3.5 mr-1" /> Edit
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  const p = viewingParty;
                  setViewingParty(null);
                  handleCloneRecord(p);
                }}
              >
                <Copy className="size-3.5 mr-1" /> Clone
              </Button>

              <Button
                variant={viewingParty.status === "Active" ? "destructive" : "default"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  const p = viewingParty;
                  setViewingParty(null);
                  handleToggleStatus(p);
                }}
              >
                <Power className="size-3.5 mr-1" />
                {viewingParty.status === "Active" ? "Deactivate" : "Activate"}
              </Button>

              <Button variant="secondary" size="sm" onClick={() => setViewingParty(null)} className="h-8 text-xs">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* DUPLICATE WARNING DIALOG */}
      <AlertDialog open={Boolean(duplicateMatch)} onOpenChange={(open) => !open && setDuplicateMatch(null)}>
        {duplicateMatch && (
          <AlertDialogContent className="max-w-md text-xs">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-bold flex items-center gap-2 text-amber-600">
                <AlertTriangle className="size-5" /> Possible Duplicate Party Found
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-foreground space-y-2 pt-2">
                <p>A party with matching details already exists in the system:</p>
                <div className="rounded border border-amber-200 bg-amber-50/50 p-3 space-y-1 font-mono text-xs">
                  <p className="font-bold text-amber-900">{duplicateMatch.partyName}</p>
                  <p className="text-amber-800 font-semibold">Code: {duplicateMatch.partyCode}</p>
                  <p className="text-amber-800">Office: {duplicateMatch.officeName}</p>
                  {duplicateMatch.gstin && <p className="text-amber-800">GSTIN: {duplicateMatch.gstin}</p>}
                </div>
                <p className="text-muted-foreground font-medium pt-1">Do you want to continue saving?</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel onClick={() => setDuplicateMatch(null)} className="h-8 text-xs">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleSubmitForm(true)}
                className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                Continue & Save
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>

      {/* DEACTIVATE CONFIRMATION DIALOG */}
      <AlertDialog open={Boolean(deactivatingParty)} onOpenChange={(open) => !open && setDeactivatingParty(null)}>
        {deactivatingParty && (
          <AlertDialogContent className="max-w-md text-xs">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-bold text-foreground">
                Deactivate Party?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground pt-1">
                This party (<strong>{deactivatingParty.partyCode} — {deactivatingParty.partyName}</strong>) will no longer be available for new Job Work transactions. Existing records will remain unchanged.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel onClick={() => setDeactivatingParty(null)} className="h-8 text-xs">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeactivate}
                className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold"
              >
                Deactivate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>

      {/* DELETE BLOCKED WARNING DIALOG */}
      <AlertDialog open={Boolean(deleteBlockedMsg)} onOpenChange={(open) => !open && setDeleteBlockedMsg(null)}>
        <AlertDialogContent className="max-w-md text-xs">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <AlertTriangle className="size-5" /> Cannot Delete Party
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

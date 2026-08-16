import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Power,
  Building2,
  MapPin,
  PhoneCall,
  UserCheck,
  AlertTriangle,
  Check,
  X,
  Layers,
  Map,
  Filter,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  getLocalWarehouses,
  generateNextWarehouseCode,
  findSimilarWarehouseName,
  saveWarehouseRecord,
  toggleWarehouseStatus,
  canDeleteWarehouse,
  deleteWarehouseRecord,
  getLocationsByWarehouseId,
  saveWarehouseLocationRecord,
  WAREHOUSE_TYPES,
  type WarehouseRecord,
  type WarehouseType,
  type WarehouseLocationRecord,
} from "@/lib/warehouse-store";

type SortField = "warehouseCode" | "warehouseName" | "warehouseType" | "city" | "locationsCount" | "status";
type SortOrder = "asc" | "desc";

export function WarehouseMasterView() {
  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>(() => getLocalWarehouses());

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Deactive">("All");
  const [typeFilter, setTypeFilter] = useState<string>("All");

  // Table Sorting state
  const [sortField, setSortField] = useState<SortField>("warehouseCode");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Warehouse Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWh, setEditingWh] = useState<WarehouseRecord | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<WarehouseType>("General");
  const [formTypeOther, setFormTypeOther] = useState("");
  const [formAddress1, setFormAddress1] = useState("");
  const [formAddress2, setFormAddress2] = useState("");
  const [formArea, setFormArea] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formDistrict, setFormDistrict] = useState("");
  const [formState, setFormState] = useState("");
  const [formPincode, setFormPincode] = useState("");
  const [formCountry, setFormCountry] = useState("India");
  const [formContactPerson, setFormContactPerson] = useState("");
  const [formMobile, setFormMobile] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRemarks, setFormRemarks] = useState("");
  const [formStatus, setFormStatus] = useState<"Active" | "Deactive">("Active");

  // Similar Name Warning Modal state
  const [similarWhWarning, setSimilarWhWarning] = useState<{
    similarRecord: WarehouseRecord;
    pendingData: Partial<WarehouseRecord> & { warehouseName: string; warehouseType: WarehouseType };
  } | null>(null);

  // Status Toggle Confirmation Dialog state
  const [statusToggleTarget, setStatusToggleTarget] = useState<WarehouseRecord | null>(null);

  // Delete Confirmation / Blocked Modal state
  const [deleteTarget, setDeleteTarget] = useState<WarehouseRecord | null>(null);
  const [deleteBlockedMsg, setDeleteBlockedMsg] = useState<string | null>(null);

  // View Locations Modal state
  const [locationsWh, setLocationsWh] = useState<WarehouseRecord | null>(null);
  const [whLocations, setWhLocations] = useState<WarehouseLocationRecord[]>([]);
  const [newLocName, setNewLocName] = useState("");
  const [newLocDesc, setNewLocDesc] = useState("");
  const [editingLocId, setEditingLocId] = useState<string | null>(null);

  // Refresh list helper
  const refreshWarehouses = () => {
    setWarehouses(getLocalWarehouses());
  };

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingWh(null);
    const nextCode = generateNextWarehouseCode();
    setFormCode(nextCode);
    setFormName("");
    setFormType("General");
    setFormTypeOther("");
    setFormAddress1("");
    setFormAddress2("");
    setFormArea("");
    setFormCity("Surat");
    setFormDistrict("Surat");
    setFormState("Gujarat");
    setFormPincode("");
    setFormCountry("India");
    setFormContactPerson("");
    setFormMobile("");
    setFormPhone("");
    setFormEmail("");
    setFormRemarks("");
    setFormStatus("Active");
    setIsModalOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = (wh: WarehouseRecord) => {
    setEditingWh(wh);
    setFormCode(wh.warehouseCode);
    setFormName(wh.warehouseName);
    setFormType(wh.warehouseType);
    setFormTypeOther(wh.warehouseTypeOther || "");
    setFormAddress1(wh.addressLine1 || "");
    setFormAddress2(wh.addressLine2 || "");
    setFormArea(wh.area || "");
    setFormCity(wh.city || "");
    setFormDistrict(wh.district || "");
    setFormState(wh.state || "");
    setFormPincode(wh.pincode || "");
    setFormCountry(wh.country || "India");
    setFormContactPerson(wh.contactPerson || "");
    setFormMobile(wh.mobile || "");
    setFormPhone(wh.phone || "");
    setFormEmail(wh.email || "");
    setFormRemarks(wh.remarks || "");
    setFormStatus(wh.status);
    setIsModalOpen(true);
  };

  // Open View Locations Modal
  const handleOpenLocations = (wh: WarehouseRecord) => {
    setLocationsWh(wh);
    const locs = getLocationsByWarehouseId(wh.id);
    setWhLocations(locs);
    setNewLocName("");
    setNewLocDesc("");
    setEditingLocId(null);
  };

  // Submit Save Warehouse Form
  const executeSave = (
    data: Partial<WarehouseRecord> & { warehouseName: string; warehouseType: WarehouseType }
  ) => {
    const res = saveWarehouseRecord(data);
    if (!res.success) {
      toast.error(res.error || "Failed to save Warehouse");
      return;
    }

    toast.success(
      editingWh
        ? `Warehouse ${res.warehouse?.warehouseCode} updated successfully!`
        : `Warehouse ${res.warehouse?.warehouseCode} created successfully!`
    );
    setIsModalOpen(false);
    setSimilarWhWarning(null);
    refreshWarehouses();
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim()) {
      toast.error("Warehouse Name is required");
      return;
    }

    const payload: Partial<WarehouseRecord> & { warehouseName: string; warehouseType: WarehouseType } = {
      warehouseName: formName.trim(),
      warehouseType: formType,
      warehouseTypeOther: formType === "Other" ? formTypeOther.trim() : undefined,
      addressLine1: formAddress1.trim() || undefined,
      addressLine2: formAddress2.trim() || undefined,
      area: formArea.trim() || undefined,
      city: formCity.trim() || undefined,
      district: formDistrict.trim() || undefined,
      state: formState.trim() || undefined,
      pincode: formPincode.trim() || undefined,
      country: formCountry.trim() || "India",
      contactPerson: formContactPerson.trim() || undefined,
      mobile: formMobile.trim() || undefined,
      phone: formPhone.trim() || undefined,
      email: formEmail.trim() || undefined,
      remarks: formRemarks.trim() || undefined,
      status: formStatus,
    };

    if (editingWh?.id) {
      payload.id = editingWh.id;
    }

    // Check for similar warehouse name warning
    const similar = findSimilarWarehouseName(formName, editingWh?.id);
    if (similar && !editingWh) {
      setSimilarWhWarning({
        similarRecord: similar,
        pendingData: payload,
      });
      return;
    }

    executeSave(payload);
  };

  // Confirm Status Toggle (Activate / Deactivate)
  const handleConfirmStatusToggle = () => {
    if (!statusToggleTarget) return;

    const res = toggleWarehouseStatus(statusToggleTarget.id);
    if (!res.success) {
      toast.error(res.error || "Failed to change Warehouse status");
      return;
    }

    toast.success(
      `Warehouse ${res.warehouse?.warehouseCode} is now ${res.warehouse?.status}`
    );
    setStatusToggleTarget(null);
    refreshWarehouses();
  };

  // Handle Delete Click (with Safety Check)
  const handleDeleteClick = (wh: WarehouseRecord) => {
    setDeleteTarget(wh);
    const guard = canDeleteWarehouse(wh.id);
    if (!guard.allowed) {
      setDeleteBlockedMsg(guard.reason || "This Warehouse is referenced and cannot be deleted.");
    } else {
      setDeleteBlockedMsg(null);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    const res = deleteWarehouseRecord(deleteTarget.id);
    if (!res.success) {
      toast.error(res.error || "Failed to delete Warehouse");
      return;
    }

    toast.success(`Warehouse ${deleteTarget.warehouseCode} deleted successfully`);
    setDeleteTarget(null);
    setDeleteBlockedMsg(null);
    refreshWarehouses();
  };

  // Save Location inside Locations Modal
  const handleSaveLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationsWh) return;

    if (!newLocName.trim()) {
      toast.error("Location Name is required");
      return;
    }

    const res = saveWarehouseLocationRecord(
      locationsWh.id,
      newLocName,
      newLocDesc,
      editingLocId || undefined
    );

    if (!res.success) {
      toast.error(res.error || "Failed to save Location");
      return;
    }

    toast.success(editingLocId ? "Location updated" : "New Location added");
    setNewLocName("");
    setNewLocDesc("");
    setEditingLocId(null);
    setWhLocations(getLocationsByWarehouseId(locationsWh.id));
    refreshWarehouses();
  };

  // Sort Toggle Handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Filtered & Sorted Warehouses List
  const processedWarehouses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = warehouses.filter((wh) => {
      // Status Filter
      if (statusFilter !== "All" && wh.status !== statusFilter) return false;

      // Type Filter
      if (typeFilter !== "All" && wh.warehouseType !== typeFilter) return false;

      // Search Query
      if (!q) return true;
      const code = wh.warehouseCode.toLowerCase();
      const name = wh.warehouseName.toLowerCase();
      const type = wh.warehouseType.toLowerCase();
      const city = (wh.city || "").toLowerCase();
      const state = (wh.state || "").toLowerCase();
      const contact = (wh.contactPerson || "").toLowerCase();
      const remarks = (wh.remarks || "").toLowerCase();

      return (
        code.includes(q) ||
        name.includes(q) ||
        type.includes(q) ||
        city.includes(q) ||
        state.includes(q) ||
        contact.includes(q) ||
        remarks.includes(q)
      );
    });

    // Sorting
    return filtered.sort((a, b) => {
      let valA: any = a[sortField] || "";
      let valB: any = b[sortField] || "";

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [warehouses, searchQuery, statusFilter, typeFilter, sortField, sortOrder]);

  return (
    <div className="space-y-4">
      {/* Top Action Bar & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search Warehouse by code, name, type, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1 rounded-md border border-border bg-muted/40 p-1">
            {(["All", "Active", "Deactive"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                  statusFilter === st
                    ? "bg-background text-primary shadow-sm border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {st}
                <Badge
                  variant={statusFilter === st ? "default" : "secondary"}
                  className="ml-1.5 px-1 py-0 text-[0.625rem]"
                >
                  {st === "All"
                    ? warehouses.length
                    : warehouses.filter((w) => w.status === st).length}
                </Badge>
              </button>
            ))}
          </div>

          {/* Warehouse Type Dropdown Filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px] h-8 text-xs font-medium bg-background">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Types</SelectItem>
              {WAREHOUSE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button size="sm" onClick={handleOpenCreate} className="h-8 gap-1 text-xs font-semibold">
          <Plus className="size-3.5" /> + New Warehouse
        </Button>
      </div>

      {/* Main Warehouses Table */}
      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60 text-xs hover:bg-muted/60">
              <TableHead
                className="cursor-pointer font-bold text-foreground hover:text-primary"
                onClick={() => handleSort("warehouseCode")}
              >
                <div className="flex items-center gap-1">
                  Code
                  {sortField === "warehouseCode" && (
                    <span className="text-primary">{sortOrder === "asc" ? "↑" : "↓"}</span>
                  )}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer font-bold text-foreground hover:text-primary"
                onClick={() => handleSort("warehouseName")}
              >
                <div className="flex items-center gap-1">
                  Warehouse Name
                  {sortField === "warehouseName" && (
                    <span className="text-primary">{sortOrder === "asc" ? "↑" : "↓"}</span>
                  )}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer font-bold text-foreground hover:text-primary"
                onClick={() => handleSort("warehouseType")}
              >
                <div className="flex items-center gap-1">
                  Type
                  {sortField === "warehouseType" && (
                    <span className="text-primary">{sortOrder === "asc" ? "↑" : "↓"}</span>
                  )}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer font-bold text-foreground hover:text-primary"
                onClick={() => handleSort("city")}
              >
                <div className="flex items-center gap-1">
                  City
                  {sortField === "city" && (
                    <span className="text-primary">{sortOrder === "asc" ? "↑" : "↓"}</span>
                  )}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer text-center font-bold text-foreground hover:text-primary"
                onClick={() => handleSort("locationsCount")}
              >
                <div className="flex items-center justify-center gap-1">
                  Locations
                  {sortField === "locationsCount" && (
                    <span className="text-primary">{sortOrder === "asc" ? "↑" : "↓"}</span>
                  )}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer text-center font-bold text-foreground hover:text-primary"
                onClick={() => handleSort("status")}
              >
                <div className="flex items-center justify-center gap-1">
                  Status
                  {sortField === "status" && (
                    <span className="text-primary">{sortOrder === "asc" ? "↑" : "↓"}</span>
                  )}
                </div>
              </TableHead>
              <TableHead className="text-right font-bold text-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs">
            {processedWarehouses.map((wh) => (
              <TableRow key={wh.id} className="hover:bg-muted/40 transition-colors">
                {/* Code */}
                <TableCell className="font-mono font-bold text-primary">
                  <Badge variant="outline" className="font-mono font-bold text-xs bg-primary/10 text-primary border-primary/30">
                    {wh.warehouseCode}
                  </Badge>
                </TableCell>

                {/* Warehouse Name */}
                <TableCell className="font-semibold text-foreground">
                  <div>
                    <p className="font-semibold text-foreground">{wh.warehouseName}</p>
                    {wh.addressLine1 && (
                      <p className="text-[0.6875rem] text-muted-foreground font-normal truncate max-w-xs">
                        {wh.addressLine1} {wh.area ? `· ${wh.area}` : ""}
                      </p>
                    )}
                  </div>
                </TableCell>

                {/* Type */}
                <TableCell>
                  <Badge variant="outline" className="text-[0.6875rem] font-sans">
                    {wh.warehouseType}
                    {wh.warehouseType === "Other" && wh.warehouseTypeOther
                      ? ` (${wh.warehouseTypeOther})`
                      : ""}
                  </Badge>
                </TableCell>

                {/* City */}
                <TableCell className="text-muted-foreground">
                  {wh.city || "—"}
                  {wh.state ? `, ${wh.state}` : ""}
                </TableCell>

                {/* Locations Count */}
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenLocations(wh)}
                    className="h-6 text-[0.6875rem] px-2 font-mono gap-1 hover:bg-primary/10 hover:text-primary"
                  >
                    <Layers className="size-3 text-primary" />
                    {wh.locationsCount || 0} Locations
                  </Button>
                </TableCell>

                {/* Status */}
                <TableCell className="text-center">
                  <Badge
                    variant="outline"
                    className={`text-[0.6875rem] font-semibold ${
                      wh.status === "Active"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {wh.status}
                  </Badge>
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-primary"
                      onClick={() => handleOpenLocations(wh)}
                      title="View Locations"
                    >
                      <Layers className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-primary"
                      onClick={() => handleOpenEdit(wh)}
                      title="Edit Warehouse"
                    >
                      <Edit className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`size-7 ${
                        wh.status === "Active"
                          ? "text-muted-foreground hover:text-amber-600"
                          : "text-muted-foreground hover:text-emerald-600"
                      }`}
                      onClick={() => setStatusToggleTarget(wh)}
                      title={wh.status === "Active" ? "Deactivate Warehouse" : "Activate Warehouse"}
                    >
                      <Power className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteClick(wh)}
                      title="Delete Warehouse"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {!processedWarehouses.length && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  <p className="text-xs font-semibold">No Warehouse records found matching criteria.</p>
                  <p className="text-[0.6875rem] text-muted-foreground">
                    Try adjusting your search terms or filter selection.
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Warehouse Create / Edit Modal Form */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl text-xs max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Building2 className="size-4 text-primary" />
              {editingWh ? `Edit Warehouse — ${formCode}` : "New Warehouse"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
            {/* Section 1: Basic Information */}
            <div className="space-y-3 rounded-lg border border-border bg-card p-3">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                1. Basic Information
              </h4>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Warehouse Code</Label>
                  <Input
                    value={formCode}
                    readOnly
                    className="h-8 text-xs font-mono font-bold bg-muted text-primary cursor-not-allowed"
                  />
                  <p className="text-[0.625rem] text-muted-foreground">System-generated read-only code</p>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-medium">
                    Warehouse Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. Main Factory Warehouse"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="h-8 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Warehouse Type *</Label>
                  <Select
                    value={formType}
                    onValueChange={(val: WarehouseType) => setFormType(val)}
                  >
                    <SelectTrigger className="h-8 text-xs font-medium">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {WAREHOUSE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Status *</Label>
                  <Select
                    value={formStatus}
                    onValueChange={(val: "Active" | "Deactive") => setFormStatus(val)}
                  >
                    <SelectTrigger className="h-8 text-xs font-medium">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Deactive">Deactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formType === "Other" && (
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Type Description (Other)</Label>
                  <Input
                    placeholder="Describe custom storage facility type..."
                    value={formTypeOther}
                    onChange={(e) => setFormTypeOther(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              )}
            </div>

            {/* Section 2: Address / Location Details */}
            <div className="space-y-3 rounded-lg border border-border bg-card p-3">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="size-3.5 text-primary" /> 2. Address & Physical Location Details
              </h4>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Address Line 1</Label>
                  <Input
                    placeholder="Street / Estate / Plot No."
                    value={formAddress1}
                    onChange={(e) => setFormAddress1(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Address Line 2</Label>
                  <Input
                    placeholder="Building / Landmark"
                    value={formAddress2}
                    onChange={(e) => setFormAddress2(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Area / Locality</Label>
                  <Input
                    placeholder="e.g. Pandesara GIDC"
                    value={formArea}
                    onChange={(e) => setFormArea(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">City</Label>
                  <Input
                    placeholder="e.g. Surat"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">District</Label>
                  <Input
                    placeholder="e.g. Surat"
                    value={formDistrict}
                    onChange={(e) => setFormDistrict(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">State</Label>
                  <Input
                    placeholder="e.g. Gujarat"
                    value={formState}
                    onChange={(e) => setFormState(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Pincode</Label>
                  <Input
                    placeholder="e.g. 395006"
                    value={formPincode}
                    onChange={(e) => setFormPincode(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Country</Label>
                  <Input
                    placeholder="India"
                    value={formCountry}
                    onChange={(e) => setFormCountry(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Contact Details */}
            <div className="space-y-3 rounded-lg border border-border bg-card p-3">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <PhoneCall className="size-3.5 text-primary" /> 3. Operational Contact Details
              </h4>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Contact Person</Label>
                  <Input
                    placeholder="e.g. Store Manager"
                    value={formContactPerson}
                    onChange={(e) => setFormContactPerson(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Mobile Number</Label>
                  <Input
                    placeholder="e.g. 9825000000"
                    value={formMobile}
                    onChange={(e) => setFormMobile(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Phone</Label>
                  <Input
                    placeholder="e.g. 0261-2345678"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Email Address</Label>
                  <Input
                    type="email"
                    placeholder="e.g. warehouse@weaveone.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Remarks */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Remarks</Label>
              <Textarea
                rows={2}
                placeholder="Additional instructions or notes for this storage facility..."
                value={formRemarks}
                onChange={(e) => setFormRemarks(e.target.value)}
                className="text-xs"
              />
            </div>

            <DialogFooter className="gap-2 pt-2 border-t border-border mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="h-8 text-xs font-semibold gap-1">
                <Check className="size-3.5" />
                {editingWh ? "Save Warehouse" : "Create Warehouse"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Fuzzy Similar Name Warning Modal */}
      <AlertDialog
        open={Boolean(similarWhWarning)}
        onOpenChange={(open) => !open && setSimilarWhWarning(null)}
      >
        {similarWhWarning && (
          <AlertDialogContent className="max-w-md text-xs">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-sm font-bold flex items-center gap-2 text-amber-600">
                <AlertTriangle className="size-4" /> Similar Warehouse Already Exists
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground mt-2 space-y-2">
                <p>
                  A similar Warehouse already exists in the system:
                </p>
                <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-2.5 text-foreground font-semibold">
                  "{similarWhWarning.similarRecord.warehouseCode} — {similarWhWarning.similarRecord.warehouseName}"
                  {similarWhWarning.similarRecord.city ? ` (${similarWhWarning.similarRecord.city})` : ""}
                </div>
                <p>Please verify before creating another Warehouse to prevent duplicate facilities.</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 mt-4">
              <AlertDialogCancel onClick={() => setSimilarWhWarning(null)} className="h-8 text-xs">
                Go Back & Edit
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => executeSave(similarWhWarning.pendingData)}
                className="h-8 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white"
              >
                Proceed Anyway
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>

      {/* View Locations Modal (Warehouse -> Location Master Hierarchy) */}
      <Dialog
        open={Boolean(locationsWh)}
        onOpenChange={(open) => !open && setLocationsWh(null)}
      >
        {locationsWh && (
          <DialogContent className="max-w-xl text-xs max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center justify-between border-b border-border pb-2">
                <div className="flex items-center gap-2">
                  <Layers className="size-4 text-primary" />
                  <span>{locationsWh.warehouseCode} — {locationsWh.warehouseName}</span>
                </div>
                <Badge variant="outline" className="text-xs font-mono font-bold">
                  {whLocations.length} Locations
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {/* Form to Add / Edit Location */}
              <form onSubmit={handleSaveLocation} className="rounded-lg border border-border bg-card p-3 space-y-3">
                <h4 className="text-xs font-bold text-foreground">
                  {editingLocId ? "Edit Location" : "+ Add New Location"}
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Location Name *</Label>
                    <Input
                      placeholder="e.g. Ground Floor, Section A"
                      value={newLocName}
                      onChange={(e) => setNewLocName(e.target.value)}
                      className="h-8 text-xs font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Description</Label>
                    <Input
                      placeholder="e.g. Heavy yarn cone storage rack"
                      value={newLocDesc}
                      onChange={(e) => setNewLocDesc(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  {editingLocId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingLocId(null);
                        setNewLocName("");
                        setNewLocDesc("");
                      }}
                      className="h-7 text-xs"
                    >
                      Cancel Edit
                    </Button>
                  )}
                  <Button type="submit" size="sm" className="h-7 text-xs gap-1 font-semibold">
                    <Check className="size-3" />
                    {editingLocId ? "Update Location" : "Add Location"}
                  </Button>
                </div>
              </form>

              {/* Child Locations Table */}
              <div className="overflow-x-auto rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 text-xs">
                      <TableHead className="font-semibold">Location Code</TableHead>
                      <TableHead className="font-semibold">Location Name</TableHead>
                      <TableHead className="font-semibold">Description</TableHead>
                      <TableHead className="text-center font-semibold">Status</TableHead>
                      <TableHead className="text-right font-semibold">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {whLocations.map((loc) => (
                      <TableRow key={loc.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono font-bold text-primary">
                          {loc.locationCode}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">
                          {loc.locationName}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {loc.description || "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-[0.625rem] bg-emerald-500/10 text-emerald-600">
                            {loc.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 text-muted-foreground hover:text-primary"
                            onClick={() => {
                              setEditingLocId(loc.id);
                              setNewLocName(loc.locationName);
                              setNewLocDesc(loc.description || "");
                            }}
                          >
                            <Edit className="size-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}

                    {!whLocations.length && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                          No sub-locations defined for this Warehouse yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Confirmation Dialog for Status Toggle (Deactivate / Activate) */}
      <AlertDialog
        open={Boolean(statusToggleTarget)}
        onOpenChange={(open) => !open && setStatusToggleTarget(null)}
      >
        {statusToggleTarget && (
          <AlertDialogContent className="max-w-md text-xs">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-sm font-bold flex items-center gap-2">
                <Power className="size-4 text-primary" />
                {statusToggleTarget.status === "Active"
                  ? `Deactivate Warehouse ${statusToggleTarget.warehouseCode}?`
                  : `Activate Warehouse ${statusToggleTarget.warehouseCode}?`}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground mt-2">
                {statusToggleTarget.status === "Active" ? (
                  <>
                    Are you sure you want to deactivate <strong>{statusToggleTarget.warehouseCode} ({statusToggleTarget.warehouseName})</strong>?
                    <br />
                    The Warehouse will no longer be available for new inventory transactions. Existing stock and historical transactions will remain unchanged.
                  </>
                ) : (
                  <>
                    Activate <strong>{statusToggleTarget.warehouseCode} ({statusToggleTarget.warehouseName})</strong>?
                    <br />
                    The Warehouse will become active and available for new inventory transactions.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 mt-4">
              <AlertDialogCancel onClick={() => setStatusToggleTarget(null)} className="h-8 text-xs">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmStatusToggle}
                className={`h-8 text-xs font-semibold ${
                  statusToggleTarget.status === "Active"
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                {statusToggleTarget.status === "Active" ? "Deactivate" : "Activate"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>

      {/* Confirmation & Safety Guard Alert Dialog for Delete */}
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteBlockedMsg(null);
          }
        }}
      >
        {deleteTarget && (
          <AlertDialogContent className="max-w-md text-xs">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-sm font-bold flex items-center gap-2 text-destructive">
                <AlertTriangle className="size-4" />
                {deleteBlockedMsg
                  ? `Cannot Delete Warehouse ${deleteTarget.warehouseCode}`
                  : `Delete Warehouse ${deleteTarget.warehouseCode}?`}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground mt-2 font-normal">
                {deleteBlockedMsg ? (
                  <span className="block p-3 rounded-md bg-destructive/10 text-destructive border border-destructive/20 font-medium">
                    {deleteBlockedMsg}
                  </span>
                ) : (
                  <>
                    Are you sure you want to permanently delete{" "}
                    <strong>
                      {deleteTarget.warehouseCode} — {deleteTarget.warehouseName}
                    </strong>
                    ? <br />
                    <span className="text-destructive font-semibold">
                      This action cannot be undone.
                    </span>
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter className="gap-2 mt-4">
              <AlertDialogCancel onClick={() => setDeleteTarget(null)} className="h-8 text-xs">
                {deleteBlockedMsg ? "Close" : "Cancel"}
              </AlertDialogCancel>
              {!deleteBlockedMsg && (
                <AlertDialogAction
                  onClick={handleConfirmDelete}
                  className="h-8 text-xs font-semibold bg-destructive hover:bg-destructive/90 text-white"
                >
                  Delete
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </div>
  );
}

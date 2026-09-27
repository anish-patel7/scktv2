import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Power,
  Eye,
  Copy,
  Layers,
  Check,
  AlertTriangle,
  Upload,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getLocalItems,
  saveItemRecord,
  deleteItemRecord,
  toggleItemStatus,
  canDeleteItem,
  copyItemRecipe,
  generateNextItemCode,
  calculateItemTotals,
  PRODUCT_TYPES,
  DEFAULT_WEFT_DETAIL,
  DEFAULT_WARP_DETAIL,
  DEFAULT_SETUP_CONFIG,
  type ItemRecord,
  type BeamMaterialRow,
  type ProductType,
  type ItemStatus,
  type ItemWeftDetail,
  type ItemWarpDetail,
  type ItemSetupConfig,
} from "@/lib/item-store";
import { getLocalYarnMaterials } from "@/lib/material-store";
import { cn } from "@/lib/utils";

export function ItemMasterView() {
  const [items, setItems] = useState<ItemRecord[]>(() => getLocalItems());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Deactive">("All");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [sortField, setSortField] = useState<"itemCode" | "itemName" | "productType" | "uom" | "status">("itemCode");
  const [sortAsc, setSortAsc] = useState(true);

  // Modal Dialog States
  const [openModal, setOpenModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemRecord | null>(null);
  const [viewingItem, setViewingItem] = useState<ItemRecord | null>(null);
  const [deletingItem, setDeletingItem] = useState<ItemRecord | null>(null);
  const [openCopyDialog, setOpenCopyDialog] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");

  // Form State
  const [formHeader, setFormHeader] = useState<{
    itemCode: string;
    itemName: string;
    productType: ProductType;
    category: string;
    uom: string;
    description: string;
    status: ItemStatus;
    remarks: string;
    imageUrl: string;
  }>({
    itemCode: "",
    itemName: "",
    productType: "Fabric",
    category: "General Fabric",
    uom: "MTR",
    description: "",
    status: "Active",
    remarks: "",
    imageUrl: "",
  });

  const [weftForm, setWeftForm] = useState<ItemWeftDetail>(DEFAULT_WEFT_DETAIL);
  const [warpForm, setWarpForm] = useState<ItemWarpDetail>(DEFAULT_WARP_DETAIL);
  const [setupForm, setSetupForm] = useState<ItemSetupConfig>(DEFAULT_SETUP_CONFIG);
  const [beamRows, setBeamRows] = useState<BeamMaterialRow[]>([]);
  const [bomDesc, setBomDesc] = useState("");

  const yarnsList = useMemo(() => getLocalYarnMaterials(), []);

  // Filter & Sort Items
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const matchesSearch =
          item.itemCode.toLowerCase().includes(search.toLowerCase()) ||
          item.itemName.toLowerCase().includes(search.toLowerCase()) ||
          item.category.toLowerCase().includes(search.toLowerCase()) ||
          item.description.toLowerCase().includes(search.toLowerCase());

        const matchesStatus = statusFilter === "All" || item.status === statusFilter;
        const matchesType = typeFilter === "All" || item.productType === typeFilter;

        return matchesSearch && matchesStatus && matchesType;
      })
      .sort((a, b) => {
        const valA = String(a[sortField]).toLowerCase();
        const valB = String(b[sortField]).toLowerCase();
        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [items, search, statusFilter, typeFilter, sortField, sortAsc]);

  // Totals calculated live
  const computedTotals = useMemo(() => {
    return calculateItemTotals(beamRows, weftForm, warpForm);
  }, [beamRows, weftForm, warpForm]);

  // Open Form for Create
  const handleOpenCreate = () => {
    const nextCode = generateNextItemCode();
    setEditingItem(null);
    setFormHeader({
      itemCode: nextCode,
      itemName: "",
      productType: "Fabric",
      category: "Jacquard Fabric",
      uom: "MTR",
      description: "",
      status: "Active",
      remarks: "",
      imageUrl: "",
    });
    setWeftForm({ ...DEFAULT_WEFT_DETAIL });
    setWarpForm({ ...DEFAULT_WARP_DETAIL });
    setSetupForm({ ...DEFAULT_SETUP_CONFIG });
    setBeamRows([
      {
        id: `bmr-${Date.now()}-1`,
        productName: yarnsList[0]?.name || "140 Nylon Mono Filament",
        pick: 120,
        card: 64,
        denier: 145,
        perPcsYarn: 0.25,
        rate: yarnsList[0]?.ratePerKg || 210,
        perPcsRate: 52.5,
        cost: 52.5,
      },
    ]);
    setBomDesc("Standard Production BOM Recipe");
    setOpenModal(true);
  };

  // Open Form for Edit
  const handleOpenEdit = (item: ItemRecord) => {
    setEditingItem(item);
    setFormHeader({
      itemCode: item.itemCode,
      itemName: item.itemName,
      productType: item.productType,
      category: item.category,
      uom: item.uom,
      description: item.description,
      status: item.status,
      remarks: item.remarks,
      imageUrl: item.imageUrl || "",
    });
    setWeftForm({ ...item.weftDetail });
    setWarpForm({ ...item.warpDetail });
    setSetupForm({ ...item.setupConfig });
    setBeamRows([...item.beamMaterials]);
    setBomDesc(item.bomDescription || "");
    setOpenModal(true);
  };

  // Save Item Record
  const handleSave = () => {
    if (!formHeader.itemName.trim()) {
      toast.error("Item Name is required");
      return;
    }

    const payload: Partial<ItemRecord> & { itemName: string } = {
      ...(editingItem ? { id: editingItem.id } : {}),
      itemName: formHeader.itemName,
      productType: formHeader.productType,
      category: formHeader.category,
      uom: formHeader.uom,
      description: formHeader.description,
      status: formHeader.status,
      remarks: formHeader.remarks,
      imageUrl: formHeader.imageUrl,
      weftDetail: weftForm,
      warpDetail: warpForm,
      setupConfig: setupForm,
      beamMaterials: beamRows,
      bomDescription: bomDesc,
    };

    const res = saveItemRecord(payload);
    if (res.success && res.item) {
      toast.success(editingItem ? `Item ${res.item.itemCode} updated` : `Item ${res.item.itemCode} created`);
      setItems(getLocalItems());
      setOpenModal(false);
    } else {
      toast.error(res.error || "Failed to save Item");
    }
  };

  // Toggle Status
  const handleToggleStatus = (item: ItemRecord) => {
    const res = toggleItemStatus(item.id);
    if (res.success) {
      toast.success(res.message);
      setItems(getLocalItems());
    } else {
      toast.error(res.message || "Could not toggle status");
    }
  };

  // Delete Item
  const handleDelete = (item: ItemRecord) => {
    const check = canDeleteItem(item.id);
    if (!check.canDelete) {
      toast.error(check.reason || "Item cannot be deleted");
      return;
    }
    const res = deleteItemRecord(item.id);
    if (res.success) {
      toast.success(res.message);
      setItems(getLocalItems());
      setDeletingItem(null);
    } else {
      toast.error(res.message);
    }
  };

  // Add Beam Row
  const handleAddBeamRow = () => {
    const newRow: BeamMaterialRow = {
      id: `bmr-${Date.now()}`,
      productName: yarnsList[0]?.name || "New Yarn / Material",
      pick: 100,
      card: 50,
      denier: 150,
      perPcsYarn: 0.2,
      rate: yarnsList[0]?.ratePerKg || 200,
      perPcsRate: 40.0,
      cost: 40.0,
    };
    setBeamRows([...beamRows, newRow]);
  };

  // Update Beam Row
  const handleUpdateBeamRow = (id: string, field: keyof BeamMaterialRow, val: any) => {
    setBeamRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: val };
        if (field === "perPcsYarn" || field === "rate") {
          const qty = Number(field === "perPcsYarn" ? val : updated.perPcsYarn) || 0;
          const rate = Number(field === "rate" ? val : updated.rate) || 0;
          updated.perPcsRate = Math.round(qty * rate * 100) / 100;
          updated.cost = updated.perPcsRate;
        }
        return updated;
      })
    );
  };

  // Select Yarn Master in Beam Row
  const handleSelectYarn = (rowId: string, yarnId: string) => {
    const yarn = yarnsList.find((y) => y.id === yarnId);
    if (!yarn) return;
    setBeamRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const perPcsRate = Math.round(r.perPcsYarn * yarn.ratePerKg * 100) / 100;
        return {
          ...r,
          materialId: yarn.id,
          productName: yarn.name,
          denier: yarn.denier || 150,
          rate: yarn.ratePerKg || 200,
          perPcsRate,
          cost: perPcsRate,
        };
      })
    );
  };

  // Remove Beam Row
  const handleRemoveBeamRow = (id: string) => {
    setBeamRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Copy Recipe Action
  const handleConfirmCopyRecipe = () => {
    if (!selectedSourceId) {
      toast.error("Please select an item to copy recipe from");
      return;
    }

    const currentPartial: Partial<ItemRecord> = {
      weftDetail: weftForm,
      warpDetail: warpForm,
      setupConfig: setupForm,
      beamMaterials: beamRows,
      bomDescription: bomDesc,
    };

    const copied = copyItemRecipe(selectedSourceId, currentPartial);
    if (copied.weftDetail) setWeftForm(copied.weftDetail);
    if (copied.warpDetail) setWarpForm(copied.warpDetail);
    if (copied.setupConfig) setSetupForm(copied.setupConfig);
    if (copied.beamMaterials) setBeamRows(copied.beamMaterials);
    if (copied.bomDescription) setBomDesc(copied.bomDescription);

    toast.success("Recipe copied successfully");
    setOpenCopyDialog(false);
  };

  // Handle Mock Image Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setFormHeader((prev) => ({ ...prev, imageUrl: url }));
      toast.success("Item preview image updated");
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items by code, name, category, specs..."
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center rounded-md border border-border bg-background p-0.5 text-xs">
            {(["All", "Active", "Deactive"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={cn(
                  "px-2.5 py-1 rounded text-[0.6875rem] font-medium transition-colors",
                  statusFilter === st ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Product Type Filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 text-xs w-[140px]">
              <SelectValue placeholder="Product Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All" className="text-xs">All Types</SelectItem>
              {PRODUCT_TYPES.map((pt) => (
                <SelectItem key={pt} value={pt} className="text-xs">{pt}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button size="sm" onClick={handleOpenCreate} className="h-8 gap-1 text-xs font-semibold">
            <Plus className="size-3.5" /> + New Item
          </Button>
        </div>
      </div>

      {/* Main Item Master Table */}
      <Card className="rounded-md border border-border">
        <CardContent className="p-0">
          <Table className="text-xs">
            <TableHeader>
              <TableRow className="bg-muted/60 font-semibold text-muted-foreground">
                <TableHead
                  className="cursor-pointer font-bold text-primary w-24"
                  onClick={() => { setSortField("itemCode"); setSortAsc(!sortAsc); }}
                >
                  Code {sortField === "itemCode" && (sortAsc ? "↑" : "↓")}
                </TableHead>
                <TableHead
                  className="cursor-pointer font-semibold"
                  onClick={() => { setSortField("itemName"); setSortAsc(!sortAsc); }}
                >
                  Item Name {sortField === "itemName" && (sortAsc ? "↑" : "↓")}
                </TableHead>
                <TableHead
                  className="cursor-pointer font-semibold w-32"
                  onClick={() => { setSortField("productType"); setSortAsc(!sortAsc); }}
                >
                  Product Type {sortField === "productType" && (sortAsc ? "↑" : "↓")}
                </TableHead>
                <TableHead
                  className="cursor-pointer font-semibold w-20"
                  onClick={() => { setSortField("uom"); setSortAsc(!sortAsc); }}
                >
                  UOM {sortField === "uom" && (sortAsc ? "↑" : "↓")}
                </TableHead>
                <TableHead
                  className="cursor-pointer font-semibold w-24"
                  onClick={() => { setSortField("status"); setSortAsc(!sortAsc); }}
                >
                  Status {sortField === "status" && (sortAsc ? "↑" : "↓")}
                </TableHead>
                <TableHead className="font-semibold">Remark</TableHead>
                <TableHead className="text-right font-semibold w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="font-mono font-bold text-primary">
                    {item.itemCode}
                  </TableCell>
                  <TableCell className="font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.itemName} className="size-6 rounded object-cover border border-border" />
                      ) : (
                        <div className="size-6 rounded bg-muted/60 flex items-center justify-center text-[0.625rem] font-bold text-muted-foreground">
                          {item.itemCode}
                        </div>
                      )}
                      <span>{item.itemName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[0.625rem] font-medium bg-muted/30">
                      {item.productType}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono font-medium">
                    {item.uom}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={item.status === "Active" ? "default" : "secondary"}
                      className={`text-[0.625rem] capitalize ${
                        item.status === "Active" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                      }`}
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground truncate max-w-[200px]" title={item.remarks}>
                    {item.remarks || item.description || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-primary"
                        title="View Details"
                        onClick={() => setViewingItem(item)}
                      >
                        <Eye className="size-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-primary"
                        title="Edit Item"
                        onClick={() => handleOpenEdit(item)}
                      >
                        <Edit className="size-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "size-7",
                          item.status === "Active"
                            ? "text-muted-foreground hover:text-amber-600"
                            : "text-emerald-600 hover:text-emerald-700"
                        )}
                        title={item.status === "Active" ? "Deactivate Item" : "Activate Item"}
                        onClick={() => handleToggleStatus(item)}
                      >
                        <Power className="size-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        title="Delete Item"
                        onClick={() => setDeletingItem(item)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {!filteredItems.length && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Layers className="mx-auto size-8 text-muted-foreground/30 mb-2" />
                    <p className="text-xs font-semibold">No items match criteria.</p>
                    <p className="text-[0.6875rem] text-muted-foreground mt-0.5">
                      Click "+ New Item" to create your first production item.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Item Master Form Modal (New / Edit Item) */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-[1400px] w-[96vw] p-6 text-xs max-h-[92vh] overflow-y-auto">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-base font-bold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <span>{editingItem ? `Edit Item (${formHeader.itemCode})` : "New Production Item"}</span>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                Code: {formHeader.itemCode} (Auto)
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define manufacturing specifications, Weft/Warp details, Setup configuration, and Beam material grid.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Header Configuration Row */}
            <div className="grid gap-3 sm:grid-cols-4 rounded-lg border border-border bg-card p-3">
              <div className="space-y-1 sm:col-span-1">
                <Label className="text-xs font-medium">Item Code</Label>
                <Input
                  value={formHeader.itemCode}
                  readOnly
                  disabled
                  className="h-8 text-xs font-mono font-bold bg-muted/50 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-semibold text-foreground">Item Name *</Label>
                <Input
                  value={formHeader.itemName}
                  onChange={(e) => setFormHeader({ ...formHeader, itemName: e.target.value })}
                  placeholder="e.g. Kashmiri Pashmina Dress Fabric"
                  className="h-8 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1 sm:col-span-1">
                <Label className="text-xs font-medium">Product Type *</Label>
                <Select
                  value={formHeader.productType}
                  onValueChange={(v) => setFormHeader({ ...formHeader, productType: v as ProductType })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_TYPES.map((pt) => (
                      <SelectItem key={pt} value={pt} className="text-xs">{pt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-medium">Item Category</Label>
                <Input
                  value={formHeader.category}
                  onChange={(e) => setFormHeader({ ...formHeader, category: e.target.value })}
                  placeholder="e.g. Jacquard Dress Material"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1 sm:col-span-1">
                <Label className="text-xs font-medium">UOM</Label>
                <Select
                  value={formHeader.uom}
                  onValueChange={(v) => setFormHeader({ ...formHeader, uom: v })}
                >
                  <SelectTrigger className="h-8 text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["MTR", "PCS", "KG", "YDS", "ROLL"].map((u) => (
                      <SelectItem key={u} value={u} className="text-xs font-mono">{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 sm:col-span-1">
                <Label className="text-xs font-medium">Item Image</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="h-8 text-xs py-1"
                  />
                  {formHeader.imageUrl && (
                    <img src={formHeader.imageUrl} alt="Preview" className="size-7 rounded object-cover border border-border" />
                  )}
                </div>
              </div>
            </div>

            {/* Production Specifications Tabs */}
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid grid-cols-5 h-9 bg-muted/60 p-0.5 text-xs">
                <TabsTrigger value="basic" className="text-xs font-semibold py-1">Basic Config</TabsTrigger>
                <TabsTrigger value="weft" className="text-xs font-semibold py-1">Weft Detail</TabsTrigger>
                <TabsTrigger value="warp" className="text-xs font-semibold py-1">Warp Detail</TabsTrigger>
                <TabsTrigger value="setup" className="text-xs font-semibold py-1">Setup Config</TabsTrigger>
                <TabsTrigger value="status" className="text-xs font-semibold py-1">Status Config</TabsTrigger>
              </TabsList>

              {/* Tab 1: Basic Config */}
              <TabsContent value="basic" className="pt-3 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs font-medium">Description</Label>
                    <Textarea
                      rows={2}
                      value={formHeader.description}
                      onChange={(e) => setFormHeader({ ...formHeader, description: e.target.value })}
                      placeholder="Detailed item description, weave characteristics..."
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs font-medium">General Remark</Label>
                    <Textarea
                      rows={2}
                      value={formHeader.remarks}
                      onChange={(e) => setFormHeader({ ...formHeader, remarks: e.target.value })}
                      placeholder="Special handling instructions, yarn approval notes..."
                      className="text-xs"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Tab 2: Weft Detail */}
              <TabsContent value="weft" className="pt-3 space-y-3">
                <div className="grid gap-3 sm:grid-cols-4 rounded-md border border-border p-3 bg-muted/20">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Ground Pick</Label>
                    <Input
                      type="number"
                      value={weftForm.groundPick}
                      onChange={(e) => setWeftForm({ ...weftForm, groundPick: Number(e.target.value) })}
                      className="num h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Cut</Label>
                    <Input
                      type="number"
                      value={weftForm.cut}
                      onChange={(e) => setWeftForm({ ...weftForm, cut: Number(e.target.value) })}
                      className="num h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Width / Reed (inch)</Label>
                    <Input
                      type="number"
                      value={weftForm.widthReed}
                      onChange={(e) => setWeftForm({ ...weftForm, widthReed: Number(e.target.value) })}
                      className="num h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Reed Space (inch)</Label>
                    <Input
                      type="number"
                      value={weftForm.reedSpace}
                      onChange={(e) => setWeftForm({ ...weftForm, reedSpace: Number(e.target.value) })}
                      className="num h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Sale Rate (₹/m)</Label>
                    <Input
                      type="number"
                      value={weftForm.saleRate}
                      onChange={(e) => setWeftForm({ ...weftForm, saleRate: Number(e.target.value) })}
                      className="num h-8 text-xs font-mono font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Other Cost (₹/m)</Label>
                    <Input
                      type="number"
                      value={weftForm.otherCost}
                      onChange={(e) => setWeftForm({ ...weftForm, otherCost: Number(e.target.value) })}
                      className="num h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs font-medium">Beam Product</Label>
                    <Input
                      value={weftForm.beamProduct}
                      onChange={(e) => setWeftForm({ ...weftForm, beamProduct: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium">No. of Ends</Label>
                    <Input
                      type="number"
                      value={weftForm.noOfEnds}
                      onChange={(e) => setWeftForm({ ...weftForm, noOfEnds: Number(e.target.value) })}
                      className="num h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Meter</Label>
                    <Input
                      type="number"
                      value={weftForm.meter}
                      onChange={(e) => setWeftForm({ ...weftForm, meter: Number(e.target.value) })}
                      className="num h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Denier</Label>
                    <Input
                      type="number"
                      value={weftForm.denier}
                      onChange={(e) => setWeftForm({ ...weftForm, denier: Number(e.target.value) })}
                      className="num h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Weight / Pcs (kg)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={weftForm.weightPerPcs}
                      onChange={(e) => setWeftForm({ ...weftForm, weightPerPcs: Number(e.target.value) })}
                      className="num h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Tab 3: Warp Detail */}
              <TabsContent value="warp" className="pt-3 space-y-3">
                <div className="grid gap-3 sm:grid-cols-4 rounded-md border border-border p-3 bg-muted/20">
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs font-medium">Warp Yarn Spec</Label>
                    <Input
                      value={warpForm.warpSpec}
                      onChange={(e) => setWarpForm({ ...warpForm, warpSpec: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Ends Count</Label>
                    <Input
                      type="number"
                      value={warpForm.endsCount}
                      onChange={(e) => setWarpForm({ ...warpForm, endsCount: Number(e.target.value) })}
                      className="num h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Crimp %</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={warpForm.crimpPct}
                      onChange={(e) => setWarpForm({ ...warpForm, crimpPct: Number(e.target.value) })}
                      className="num h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Reed Count</Label>
                    <Input
                      type="number"
                      value={warpForm.reedCount}
                      onChange={(e) => setWarpForm({ ...warpForm, reedCount: Number(e.target.value) })}
                      className="num h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Dents</Label>
                    <Input
                      type="number"
                      value={warpForm.dents}
                      onChange={(e) => setWarpForm({ ...warpForm, dents: Number(e.target.value) })}
                      className="num h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Warp Rate (₹/kg)</Label>
                    <Input
                      type="number"
                      value={warpForm.warpRate}
                      onChange={(e) => setWarpForm({ ...warpForm, warpRate: Number(e.target.value) })}
                      className="num h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Warp Cost / Metre (₹)</Label>
                    <Input
                      type="number"
                      value={warpForm.warpCostPerMetre}
                      onChange={(e) => setWarpForm({ ...warpForm, warpCostPerMetre: Number(e.target.value) })}
                      className="num h-8 text-xs font-mono font-semibold"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Tab 4: Setup Config */}
              <TabsContent value="setup" className="pt-3 space-y-3">
                <div className="grid gap-3 sm:grid-cols-4 rounded-md border border-border p-3 bg-muted/20">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Machine Type</Label>
                    <Select
                      value={setupForm.machineType}
                      onValueChange={(v) => setSetupForm({ ...setupForm, machineType: v as any })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["Jacquard", "Rapier", "Airjet", "Powerloom", "Handloom"].map((mt) => (
                          <SelectItem key={mt} value={mt} className="text-xs">{mt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Frame / Hook Count</Label>
                    <Input
                      type="number"
                      value={setupForm.frameHookCount}
                      onChange={(e) => setSetupForm({ ...setupForm, frameHookCount: Number(e.target.value) })}
                      className="num h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">PPI (Picks Per Inch)</Label>
                    <Input
                      type="number"
                      value={setupForm.ppi}
                      onChange={(e) => setSetupForm({ ...setupForm, ppi: Number(e.target.value) })}
                      className="num h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Speed (RPM)</Label>
                    <Input
                      type="number"
                      value={setupForm.speedRpm}
                      onChange={(e) => setSetupForm({ ...setupForm, speedRpm: Number(e.target.value) })}
                      className="num h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs font-medium">Loom Category</Label>
                    <Input
                      value={setupForm.loomCategory}
                      onChange={(e) => setSetupForm({ ...setupForm, loomCategory: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs font-medium">Target Efficiency %</Label>
                    <Input
                      type="number"
                      value={setupForm.targetEfficiencyPct}
                      onChange={(e) => setSetupForm({ ...setupForm, targetEfficiencyPct: Number(e.target.value) })}
                      className="num h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Tab 5: Status Config */}
              <TabsContent value="status" className="pt-3 space-y-3">
                <div className="rounded-md border border-border p-4 bg-muted/20 space-y-3">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                    <Power className="size-4 text-primary" />
                    Operational Status Configuration
                  </h4>
                  <p className="text-[0.6875rem] text-muted-foreground">
                    Active items are available for selection in new production orders, cost sheets, and invoices. Deactive items remain available in historical reports.
                  </p>
                  <div className="flex items-center gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                      <input
                        type="radio"
                        name="itemStatus"
                        value="Active"
                        checked={formHeader.status === "Active"}
                        onChange={() => setFormHeader({ ...formHeader, status: "Active" })}
                        className="size-4 text-primary"
                      />
                      <span className="text-emerald-600 font-bold">Active (Available for production & transactions)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                      <input
                        type="radio"
                        name="itemStatus"
                        value="Deactive"
                        checked={formHeader.status === "Deactive"}
                        onChange={() => setFormHeader({ ...formHeader, status: "Deactive" })}
                        className="size-4 text-amber-600"
                      />
                      <span className="text-muted-foreground">Deactive (Restricted from new transactions)</span>
                    </label>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Beam / Material Configuration Section */}
            <div className="rounded-lg border border-border bg-card p-3 space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div>
                  <h4 className="text-xs font-bold text-foreground">BEAM / MATERIAL CONFIGURATION</h4>
                  <p className="text-[0.5625rem] text-muted-foreground">Yarn recipe, pick/card count, denier, rate & per-piece consumption grid.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setOpenCopyDialog(true)}
                    className="h-7 text-xs gap-1 font-semibold"
                  >
                    <Copy className="size-3.5 text-primary" /> Copy Recipe
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddBeamRow}
                    className="h-7 text-xs gap-1 font-semibold"
                  >
                    <Plus className="size-3.5" /> Add Row
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-md border border-border">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="bg-muted/50 text-xs font-semibold">
                      <TableHead className="w-12 text-center">No.</TableHead>
                      <TableHead className="min-w-[260px]">Product / Yarn Name</TableHead>
                      <TableHead className="w-28 min-w-[90px] text-right">Pick</TableHead>
                      <TableHead className="w-28 min-w-[90px] text-right">Card</TableHead>
                      <TableHead className="w-28 min-w-[90px] text-right">Denier</TableHead>
                      <TableHead className="w-32 min-w-[110px] text-right">Per Pcs Yarn (kg)</TableHead>
                      <TableHead className="w-32 min-w-[110px] text-right">Rate (₹/kg)</TableHead>
                      <TableHead className="w-32 min-w-[110px] text-right">Per Pcs Rate (₹)</TableHead>
                      <TableHead className="w-16 text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {beamRows.map((row, idx) => (
                      <TableRow key={row.id} className="hover:bg-muted/30">
                        <TableCell className="text-center font-mono font-bold text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={row.materialId || "custom"}
                            onValueChange={(v) => {
                              if (v !== "custom") handleSelectYarn(row.id, v);
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder={row.productName} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="custom" className="text-xs italic">
                                Custom: {row.productName}
                              </SelectItem>
                              {yarnsList.map((y) => (
                                <SelectItem key={y.id} value={y.id} className="text-xs">
                                  {y.name} ({y.denier || "—"}D · ₹{y.ratePerKg}/kg)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={row.pick}
                            onChange={(e) => handleUpdateBeamRow(row.id, "pick", Number(e.target.value))}
                            className="num h-8 text-xs text-right font-mono px-2.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={row.card}
                            onChange={(e) => handleUpdateBeamRow(row.id, "card", Number(e.target.value))}
                            className="num h-8 text-xs text-right font-mono px-2.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={row.denier}
                            onChange={(e) => handleUpdateBeamRow(row.id, "denier", Number(e.target.value))}
                            className="num h-8 text-xs text-right font-mono px-2.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            step="0.01"
                            value={row.perPcsYarn}
                            onChange={(e) => handleUpdateBeamRow(row.id, "perPcsYarn", Number(e.target.value))}
                            className="num h-8 text-xs text-right font-mono px-2.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={row.rate}
                            onChange={(e) => handleUpdateBeamRow(row.id, "rate", Number(e.target.value))}
                            className="num h-8 text-xs text-right font-mono px-2.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </TableCell>
                        <TableCell className="num text-right font-mono font-bold text-primary">
                          ₹{row.perPcsRate.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveBeamRow(row.id)}
                            title="Delete Row"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}

                    {!beamRows.length && (
                      <TableRow>
                        <TableCell colSpan={9} className="py-4 text-center text-muted-foreground">
                          No yarn/beam materials configured. Click "+ Add Row" or "Copy Recipe".
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* BOM Description & Summary Section */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">BOM Description</Label>
                <Textarea
                  rows={3}
                  value={bomDesc}
                  onChange={(e) => setBomDesc(e.target.value)}
                  placeholder="Comprehensive manufacturing BOM breakdown..."
                  className="text-xs font-mono"
                />
              </div>

              {/* Totals / Cost Summary Live Card */}
              <div className="rounded-lg border border-border bg-card p-3 space-y-2">
                <h4 className="text-xs font-bold text-foreground border-b border-border pb-1">
                  TOTALS / COST SUMMARY
                </h4>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-[0.625rem] text-muted-foreground block">Total Pick</span>
                    <span className="font-mono font-bold text-foreground">{computedTotals.totalPick}</span>
                  </div>
                  <div>
                    <span className="text-[0.625rem] text-muted-foreground block">Total Card</span>
                    <span className="font-mono font-bold text-foreground">{computedTotals.totalCard}</span>
                  </div>
                  <div>
                    <span className="text-[0.625rem] text-muted-foreground block">Total Per Pcs Yarn</span>
                    <span className="font-mono font-bold text-foreground">{computedTotals.totalPerPcsYarn} kg</span>
                  </div>
                  <div>
                    <span className="text-[0.625rem] text-muted-foreground block">Pick Rate</span>
                    <span className="font-mono font-bold text-foreground">₹{computedTotals.pickRate}</span>
                  </div>
                  <div>
                    <span className="text-[0.625rem] text-muted-foreground block">Job Rate</span>
                    <span className="font-mono font-bold text-foreground">₹{computedTotals.jobRate}</span>
                  </div>
                  <div>
                    <span className="text-[0.625rem] text-muted-foreground block">Net Cost / Metre</span>
                    <span className="font-mono font-bold text-primary text-sm">₹{computedTotals.netCost}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-border pt-3 mt-2">
            <Button variant="outline" size="sm" onClick={() => setOpenModal(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} className="h-8 text-xs font-semibold gap-1">
              <Check className="size-3.5" />
              {editingItem ? "Update Record" : "Save Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Recipe Modal Dialog */}
      <Dialog open={openCopyDialog} onOpenChange={setOpenCopyDialog}>
        <DialogContent className="max-w-md p-6 text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Copy className="size-4 text-primary" /> Copy Production Recipe
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select an existing item to copy its Weft, Warp, Setup, and Beam material grid specifications.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Select Source Item</Label>
              <Select value={selectedSourceId} onValueChange={setSelectedSourceId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Choose Item..." />
                </SelectTrigger>
                <SelectContent>
                  {items.map((it) => (
                    <SelectItem key={it.id} value={it.id} className="text-xs">
                      {it.itemCode} — {it.itemName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-border pt-3 mt-2">
            <Button variant="outline" size="sm" onClick={() => setOpenCopyDialog(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirmCopyRecipe} className="h-8 text-xs font-semibold">
              Copy Recipe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Item Details Dialog */}
      <Dialog open={Boolean(viewingItem)} onOpenChange={(o) => !o && setViewingItem(null)}>
        {viewingItem && (
          <DialogContent className="max-w-5xl w-[92vw] p-6 text-xs max-h-[88vh] overflow-y-auto">
            <DialogHeader className="border-b border-border pb-3">
              <DialogTitle className="text-base font-bold flex items-center justify-between">
                <span>{viewingItem.itemCode} — {viewingItem.itemName}</span>
                <Badge variant={viewingItem.status === "Active" ? "default" : "secondary"}>
                  {viewingItem.status}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-4 gap-2 rounded-md border border-border p-3 bg-muted/20">
                <div>
                  <span className="text-[0.625rem] text-muted-foreground block">Product Type</span>
                  <span className="font-semibold">{viewingItem.productType}</span>
                </div>
                <div>
                  <span className="text-[0.625rem] text-muted-foreground block">Category</span>
                  <span className="font-semibold">{viewingItem.category}</span>
                </div>
                <div>
                  <span className="text-[0.625rem] text-muted-foreground block">UOM</span>
                  <span className="font-mono font-semibold">{viewingItem.uom}</span>
                </div>
                <div>
                  <span className="text-[0.625rem] text-muted-foreground block">Net Cost</span>
                  <span className="font-mono font-bold text-primary">₹{viewingItem.costSummary.netCost}/m</span>
                </div>
              </div>

              {/* Beam Grid View */}
              <div className="space-y-1">
                <h4 className="text-xs font-bold">Beam / Material Grid</h4>
                <div className="overflow-x-auto rounded border border-border">
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow className="bg-muted/40 text-xs">
                        <TableHead>Yarn Name</TableHead>
                        <TableHead className="text-right">Pick</TableHead>
                        <TableHead className="text-right">Card</TableHead>
                        <TableHead className="text-right">Denier</TableHead>
                        <TableHead className="text-right">Per Pcs Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingItem.beamMaterials.map((bm) => (
                        <TableRow key={bm.id}>
                          <TableCell className="font-semibold">{bm.productName}</TableCell>
                          <TableCell className="text-right font-mono">{bm.pick}</TableCell>
                          <TableCell className="text-right font-mono">{bm.card}</TableCell>
                          <TableCell className="text-right font-mono">{bm.denier}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-primary">₹{bm.perPcsRate}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Remarks */}
              {viewingItem.remarks && (
                <div className="rounded border border-border p-2 bg-card">
                  <span className="text-[0.625rem] text-muted-foreground font-semibold block">Remark</span>
                  <p className="text-xs text-foreground">{viewingItem.remarks}</p>
                </div>
              )}
            </div>

            <DialogFooter className="pt-3 border-t border-border mt-3">
              <Button size="sm" onClick={() => setViewingItem(null)} className="h-8 text-xs">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Confirmation Dialog for Record Deletion */}
      <AlertDialog open={Boolean(deletingItem)} onOpenChange={(o) => !o && setDeletingItem(null)}>
        {deletingItem && (
          <AlertDialogContent className="max-w-md p-6 text-xs">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-sm font-bold text-destructive flex items-center gap-2">
                <AlertTriangle className="size-4" />
                Delete Item ({deletingItem.itemCode})?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground pt-1">
                Are you sure you want to permanently delete Item{" "}
                <strong>{deletingItem.itemCode} — {deletingItem.itemName}</strong>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 pt-3 border-t border-border mt-3">
              <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => handleDelete(deletingItem)}
              >
                Delete Record
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </div>
  );
}

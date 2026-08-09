import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Upload,
  X,
  Check,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import type { DesignWithDetails, BeamColour, Feeder } from "@/types/design";
import { saveDesign, saveDraft, clearDraft } from "@/lib/design-store";

interface DesignEntryProps {
  initialDesign?: DesignWithDetails | null | undefined;
  isClone?: boolean | undefined;
  onBack: () => void;
  onSaveSuccess: (saved: DesignWithDetails) => void;
}

const BEAM_COLOUR_SUGGESTIONS = [
  "50/600 P.Blue Poly",
  "50/600 Firozi",
  "50/600 P.Green Poly",
  "50/600 Gajri",
  "50/600 Rani Poly",
  "50/600 Gold Lurex",
  "100/144 White Cotton",
  "150/48 Polyester Viscose",
];

const WORK_TYPES = [
  "Jacquard Pashmina",
  "Brocade Work",
  "Floral Motif",
  "Embroidery & Jacquard",
  "Dobhy Weave",
  "Plain Grey",
  "Zari Border",
];

export function DesignEntry({
  initialDesign,
  isClone = false,
  onBack,
  onSaveSuccess,
}: DesignEntryProps) {
  const [designNumber, setDesignNumber] = useState(
    isClone ? "" : initialDesign?.designNumber || ""
  );
  const [designName, setDesignName] = useState(
    initialDesign ? (isClone ? `${initialDesign.designName} (Copy)` : initialDesign.designName) : ""
  );
  const [dn, setDn] = useState(initialDesign?.dn || "");
  const [dnCode, setDnCode] = useState(initialDesign?.dnCode || "");
  const [reed, setReed] = useState<string>(initialDesign?.reed !== undefined ? String(initialDesign.reed) : "");
  const [pick, setPick] = useState<string>(initialDesign?.pick !== undefined ? String(initialDesign.pick) : "");
  const [cards, setCards] = useState<string>(initialDesign?.cards !== undefined ? String(initialDesign.cards) : "");
  const [patti, setPatti] = useState<string>(initialDesign?.patti !== undefined ? String(initialDesign.patti) : "");
  const [totalDC, setTotalDC] = useState<string>(initialDesign?.totalDC !== undefined ? String(initialDesign.totalDC) : "");
  const [totalCut, setTotalCut] = useState<string>(initialDesign?.totalCut !== undefined ? String(initialDesign.totalCut) : "");
  const [work, setWork] = useState(initialDesign?.work || "Jacquard Pashmina");
  const [blueApt, setBlueApt] = useState(initialDesign?.blueApt || "");
  const [description, setDescription] = useState(initialDesign?.description || "");
  const [remarks, setRemarks] = useState(initialDesign?.remarks || "");
  const [image, setImage] = useState(initialDesign?.image || "");

  const [beamColours, setBeamColours] = useState<BeamColour[]>(() => {
    if (initialDesign && initialDesign.beamColours && initialDesign.beamColours.length > 0) {
      return initialDesign.beamColours.map((bc, bIdx) => ({
        ...bc,
        feeders: bc.feeders.map((f, fIdx) => ({
          ...f,
          feederNumber: `FDR-${fIdx + 1}`,
          displayOrder: fIdx + 1,
        })),
      }));
    }
    // Default 1 initial beam colour with 1 feeder
    return [
      {
        id: `bc-${Date.now()}-1`,
        designId: "",
        beamColour: "50/600 P.Blue Poly",
        displayOrder: 1,
        feeders: [
          {
            id: `fdr-${Date.now()}-1`,
            beamColourId: `bc-${Date.now()}-1`,
            feederNumber: "FDR-1",
            colorName: "110/72 N.Blue",
            oldNumber: "5831",
            displayOrder: 1,
          },
        ],
      },
    ];
  });

  const [bcToRemove, setBcToRemove] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-save draft logic
  useEffect(() => {
    const draftData: Partial<DesignWithDetails> = {
      designNumber,
      designName,
      dn: dn || undefined,
      dnCode: dnCode || undefined,
      reed: reed ? Number(reed) : undefined,
      pick: pick ? Number(pick) : undefined,
      cards: cards ? Number(cards) : undefined,
      patti: patti ? Number(patti) : undefined,
      totalDC: totalDC ? Number(totalDC) : undefined,
      totalCut: totalCut ? Number(totalCut) : undefined,
      work: work || undefined,
      blueApt: blueApt || undefined,
      description: description || undefined,
      remarks: remarks || undefined,
      image: image || undefined,
      beamColours,
    };

    const timer = setTimeout(() => {
      saveDraft(draftData);
    }, 500);

    return () => clearTimeout(timer);
  }, [
    designNumber,
    designName,
    dn,
    dnCode,
    reed,
    pick,
    cards,
    patti,
    totalDC,
    totalCut,
    work,
    blueApt,
    description,
    remarks,
    image,
    beamColours,
  ]);

  // Image Upload handler
  const handleImageFile = (file: File) => {
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      toast.error("Unsupported file format. Please upload JPG, PNG, or WEBP.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("File size exceeds maximum limit of 20MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImage(e.target.result as string);
        toast.success("Image uploaded successfully");
      }
    };
    reader.readAsDataURL(file);
  };

  // Add Beam Colour
  const addBeamColour = () => {
    const newBcId = `bc-${Date.now()}-${beamColours.length + 1}`;
    const newBc: BeamColour = {
      id: newBcId,
      designId: initialDesign?.id || "",
      beamColour: BEAM_COLOUR_SUGGESTIONS[beamColours.length % BEAM_COLOUR_SUGGESTIONS.length] || "50/600 P.Blue Poly",
      displayOrder: beamColours.length + 1,
      feeders: [
        {
          id: `fdr-${Date.now()}-1`,
          beamColourId: newBcId,
          feederNumber: "FDR-1",
          colorName: "",
          oldNumber: "",
          displayOrder: 1,
        },
      ],
    };
    setBeamColours([...beamColours, newBc]);
    toast.success("Added new Beam Colour section");
  };

  // Remove Beam Colour
  const confirmRemoveBeamColour = () => {
    if (!bcToRemove) return;
    setBeamColours(
      beamColours
        .filter((bc) => bc.id !== bcToRemove)
        .map((bc, idx) => ({ ...bc, displayOrder: idx + 1 }))
    );
    setBcToRemove(null);
    toast.success("Beam Colour removed");
  };

  // Move Beam Colour
  const moveBeamColour = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === beamColours.length - 1)
    ) {
      return;
    }
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    const updated = [...beamColours];
    const current = updated[index];
    const target = updated[targetIdx];
    if (current && target) {
      updated[index] = target;
      updated[targetIdx] = current;
      setBeamColours(updated.map((bc, idx) => ({ ...bc, displayOrder: idx + 1 })));
    }
  };

  // Add Feeder inside a Beam Colour
  const addFeeder = (beamColourId: string) => {
    setBeamColours(
      beamColours.map((bc) => {
        if (bc.id !== beamColourId) return bc;
        const newFeederIdx = bc.feeders.length + 1;
        const newFeeder: Feeder = {
          id: `fdr-${Date.now()}-${newFeederIdx}`,
          beamColourId,
          feederNumber: `FDR-${newFeederIdx}`,
          colorName: "",
          oldNumber: "",
          displayOrder: newFeederIdx,
        };
        return {
          ...bc,
          feeders: [...bc.feeders, newFeeder],
        };
      })
    );
  };

  // Update Feeder field
  const updateFeeder = (
    beamColourId: string,
    feederId: string,
    field: "colorName" | "oldNumber",
    value: string
  ) => {
    setBeamColours(
      beamColours.map((bc) => {
        if (bc.id !== beamColourId) return bc;
        return {
          ...bc,
          feeders: bc.feeders.map((f) => {
            if (f.id !== feederId) return f;
            return { ...f, [field]: value };
          }),
        };
      })
    );
  };

  // Move Feeder left/right inside a Beam Colour
  const moveFeeder = (beamColourId: string, index: number, direction: "left" | "right" | "up" | "down") => {
    setBeamColours(
      beamColours.map((bc) => {
        if (bc.id !== beamColourId) return bc;
        const isPrev = direction === "left" || direction === "up";
        const isNext = direction === "right" || direction === "down";
        if (
          (isPrev && index === 0) ||
          (isNext && index === bc.feeders.length - 1)
        ) {
          return bc;
        }
        const targetIdx = isPrev ? index - 1 : index + 1;
        const updatedFeeders = [...bc.feeders];
        const currentF = updatedFeeders[index];
        const targetF = updatedFeeders[targetIdx];

        if (currentF && targetF) {
          updatedFeeders[index] = targetF;
          updatedFeeders[targetIdx] = currentF;
        }

        // Auto-renumber feeders
        const renumbered = updatedFeeders.map((f, idx) => ({
          ...f,
          feederNumber: `FDR-${idx + 1}`,
          displayOrder: idx + 1,
        }));

        return { ...bc, feeders: renumbered };
      })
    );
  };

  // Remove Feeder
  const removeFeeder = (beamColourId: string, feederId: string) => {
    setBeamColours(
      beamColours.map((bc) => {
        if (bc.id !== beamColourId) return bc;
        const filtered = bc.feeders.filter((f) => f.id !== feederId);
        // Auto-renumber feeders
        const renumbered = filtered.map((f, idx) => ({
          ...f,
          feederNumber: `FDR-${idx + 1}`,
          displayOrder: idx + 1,
        }));
        return { ...bc, feeders: renumbered };
      })
    );
  };

  // Save handler
  const handleSave = () => {
    if (!designNumber.trim()) {
      toast.error("Design Number is required.");
      return;
    }
    if (!designName.trim()) {
      toast.error("Design Name is required.");
      return;
    }

    // Validate beam colours
    for (let i = 0; i < beamColours.length; i++) {
      const bc = beamColours[i];
      if (!bc || !bc.beamColour.trim()) {
        toast.error(`Beam Colour #${i + 1} must have a name.`);
        return;
      }
      if (bc.feeders.length === 0) {
        toast.error(`Beam Colour "${bc.beamColour}" must have at least one feeder entry.`);
        return;
      }
      for (let j = 0; j < bc.feeders.length; j++) {
        const f = bc.feeders[j];
        if (!f || !f.colorName.trim()) {
          toast.error(`Feeder ${f?.feederNumber || j + 1} in Beam Colour "${bc.beamColour}" requires a Color Name.`);
          return;
        }
      }
    }

    try {
      const payload = {
        id: isClone ? undefined : initialDesign?.id,
        designNumber: designNumber.trim(),
        designName: designName.trim(),
        dn: dn.trim() || undefined,
        dnCode: dnCode.trim() || undefined,
        reed: reed ? Number(reed) : undefined,
        pick: pick ? Number(pick) : undefined,
        cards: cards ? Number(cards) : undefined,
        patti: patti ? Number(patti) : undefined,
        totalDC: totalDC ? Number(totalDC) : undefined,
        totalCut: totalCut ? Number(totalCut) : undefined,
        work: work || undefined,
        blueApt: blueApt.trim() || undefined,
        description: description.trim() || undefined,
        remarks: remarks.trim() || undefined,
        image: image || undefined,
        beamColours,
      };

      const saved = saveDesign(payload);
      clearDraft();
      toast.success(
        isClone
          ? `Design cloned successfully as ${saved.designNumber}!`
          : initialDesign
          ? `Design ${saved.designNumber} updated successfully!`
          : `Design ${saved.designNumber} created successfully!`
      );
      onSaveSuccess(saved);
    } catch (err: any) {
      toast.error(err.message || "Failed to save Design");
    }
  };

  const isEditing = Boolean(initialDesign && !isClone);
  const pageTitle = isClone
    ? "Clone Design"
    : isEditing
    ? `Edit Design — ${initialDesign?.designNumber}`
    : "New Design";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 px-2 text-xs">
            <ArrowLeft className="size-4" /> Back to Designs
          </Button>
          <span className="h-4 w-px bg-border" />
          <h2 className="text-lg font-semibold tracking-tight">{pageTitle}</h2>
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Check className="mr-1 size-3" /> Auto-save: ON
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onBack}>
            Discard
          </Button>
          <Button size="sm" onClick={handleSave} className="gap-1">
            <Check className="size-4" /> Save Design
          </Button>
        </div>
      </div>

      {/* 1. Design Information Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Design Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Row 1: Number, Name, Image Upload */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="designNumber">
                Design Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="designNumber"
                placeholder="e.g. D-015"
                value={designNumber}
                onChange={(e) => setDesignNumber(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="designName">
                Design Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="designName"
                placeholder="e.g. Kashmiri Pashmina"
                value={designName}
                onChange={(e) => setDesignName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="work">Work Type</Label>
              <Select value={work} onValueChange={setWork}>
                <SelectTrigger id="work">
                  <SelectValue placeholder="Select work type" />
                </SelectTrigger>
                <SelectContent>
                  {WORK_TYPES.map((w) => (
                    <SelectItem key={w} value={w}>
                      {w}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Design Image Upload Component */}
          <div className="space-y-1.5">
            <Label>Design Image (JPG, PNG, WEBP — Max 20MB)</Label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files?.[0]) handleImageFile(e.dataTransfer.files[0]);
              }}
              className={`relative flex min-h-28 flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
                isDragOver
                  ? "border-primary bg-primary/5"
                  : image
                  ? "border-border bg-surface"
                  : "border-border hover:bg-accent/50"
              }`}
            >
              {image ? (
                <div className="flex flex-wrap items-center gap-4">
                  <img
                    src={image}
                    alt="Design Preview"
                    className="size-20 rounded-md border border-border object-cover shadow-sm"
                  />
                  <div className="text-left">
                    <p className="text-xs font-medium text-foreground">Design image uploaded</p>
                    <p className="text-[0.6875rem] text-muted-foreground">Supported format JPG/PNG/WEBP</p>
                    <div className="mt-2 flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <RotateCcw className="mr-1 size-3" /> Replace
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setImage("")}
                      >
                        <X className="mr-1 size-3" /> Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className="cursor-pointer flex flex-col items-center justify-center py-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mb-1 size-6 text-muted-foreground" />
                  <p className="text-xs font-medium">Click to upload or drag & drop</p>
                  <p className="text-[0.6875rem] text-muted-foreground">JPG, PNG, WEBP (Max 20MB)</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleImageFile(e.target.files[0]);
                }}
              />
            </div>
          </div>

          {/* Technical Specs Rows */}
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="dn">DN Number</Label>
              <Input id="dn" placeholder="e.g. DN-440" value={dn} onChange={(e) => setDn(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dnCode">DN Code</Label>
              <Input id="dnCode" placeholder="e.g. DN-440-KASH" value={dnCode} onChange={(e) => setDnCode(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reed">Reed</Label>
              <Input id="reed" type="number" placeholder="120" value={reed} onChange={(e) => setReed(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pick">Pick</Label>
              <Input id="pick" type="number" placeholder="160" value={pick} onChange={(e) => setPick(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="cards">Cards</Label>
              <Input id="cards" type="number" placeholder="64" value={cards} onChange={(e) => setCards(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="patti">Patti</Label>
              <Input id="patti" type="number" placeholder="12" value={patti} onChange={(e) => setPatti(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="totalDC">Total D.C.</Label>
              <Input id="totalDC" type="number" placeholder="14400" value={totalDC} onChange={(e) => setTotalDC(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="totalCut">Total Cut</Label>
              <Input id="totalCut" type="number" placeholder="4" value={totalCut} onChange={(e) => setTotalCut(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="blueApt">Blue + APT</Label>
              <Input id="blueApt" placeholder="e.g. Blue-99 / APT-A" value={blueApt} onChange={(e) => setBlueApt(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="remarks">Remarks</Label>
              <Input id="remarks" placeholder="Special weaving instructions or notes..." value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={2}
              placeholder="Comprehensive description of design construction..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. BEAM COLOUR & FEEDER PROGRAM */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">BEAM COLOUR & FEEDER PROGRAM</h3>
            <p className="text-xs text-muted-foreground">
              Define Beam Colours and their respective Feeder sequences. Feeder numbers are automatically managed.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={addBeamColour} className="gap-1">
            <Plus className="size-4" /> Add Beam Colour
          </Button>
        </div>

        {beamColours.map((bc, bcIdx) => (
          <Card key={bc.id} className="border-primary/20 bg-card">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border py-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-xs font-semibold">
                  BEAM COLOUR #{bcIdx + 1}
                </Badge>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    disabled={bcIdx === 0}
                    onClick={() => moveBeamColour(bcIdx, "up")}
                    title="Move Beam Colour Up"
                  >
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    disabled={bcIdx === beamColours.length - 1}
                    onClick={() => moveBeamColour(bcIdx, "down")}
                    title="Move Beam Colour Down"
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setBcToRemove(bc.id)}
              >
                <Trash2 className="mr-1 size-3.5" /> Remove
              </Button>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              <div className="max-w-md space-y-1.5">
                <Label htmlFor={`bc-name-${bc.id}`}>Beam Colour Name *</Label>
                <Input
                  id={`bc-name-${bc.id}`}
                  placeholder="e.g. 50/600 P.Blue Poly"
                  value={bc.beamColour}
                  onChange={(e) =>
                    setBeamColours(
                      beamColours.map((b) => (b.id === bc.id ? { ...b, beamColour: e.target.value } : b))
                    )
                  }
                />
              </div>

              {/* Feeder Program Horizontal Grid Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    FEEDER PROGRAM
                  </h4>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 text-xs gap-1"
                    onClick={() => addFeeder(bc.id)}
                  >
                    <Plus className="size-3" /> Add Feeder
                  </Button>
                </div>

                <div className="overflow-x-auto rounded-md border border-border bg-card">
                  <table className="w-full min-w-max border-collapse text-xs text-center">
                    <thead>
                      <tr className="bg-muted/60 border-b border-border">
                        {bc.feeders.map((f) => (
                          <th key={f.id} className="border-r border-border px-3 py-2 font-mono font-bold text-primary min-w-[140px]">
                            {f.feederNumber}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border">
                        {bc.feeders.map((f) => (
                          <td key={f.id} className="border-r border-border p-2">
                            <Input
                              className="h-9 text-xs text-center font-medium"
                              placeholder="e.g. 110/72 N.Blue"
                              value={f.colorName}
                              onChange={(e) =>
                                updateFeeder(bc.id, f.id, "colorName", e.target.value)
                              }
                            />
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-muted/20">
                        {bc.feeders.map((f, fIdx) => (
                          <td key={f.id} className="border-r border-border p-1.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-6"
                                disabled={fIdx === 0}
                                onClick={() => moveFeeder(bc.id, fIdx, "left")}
                                title="Move Left"
                              >
                                <ArrowLeft className="size-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-6"
                                disabled={fIdx === bc.feeders.length - 1}
                                onClick={() => moveFeeder(bc.id, fIdx, "right")}
                                title="Move Right"
                              >
                                <ArrowRight className="size-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-6 text-destructive hover:bg-destructive/10"
                                onClick={() => removeFeeder(bc.id, f.id)}
                                title="Delete Feeder"
                              >
                                <X className="size-3.5" />
                              </Button>
                            </div>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Remove Beam Colour Confirmation Dialog */}
      <AlertDialog open={Boolean(bcToRemove)} onOpenChange={(open) => !open && setBcToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Beam Colour?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the Beam Colour and all feeder program entries belonging to it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveBeamColour} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

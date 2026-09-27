import React, { useState } from "react";
import {
  ListPlus,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Info,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ProductionPlanningService,
  type BulkDailyProductionRow,
  type JobCardDraft,
} from "@/services/production-planning.service";
import type { ProductionOrder } from "@/lib/production-store";

interface BulkDailyProductionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: ProductionOrder | null;
  onSaved?: () => void;
}

interface EditableRow {
  row: BulkDailyProductionRow;
  draft: JobCardDraft;
  todayQtyMetre: string;
  downtimeMinutes: string;
  downtimeReason: string;
  remark: string;
  expanded: boolean;
  validationError?: string | undefined;
  isValid: boolean;
}

const DOWNTIME_REASONS = [
  "Warp breakage",
  "Weft change",
  "Beam change",
  "Power failure",
  "Mechanical fault",
  "Design change",
  "No operator",
  "Other",
];

export const BulkDailyProductionDialog: React.FC<BulkDailyProductionDialogProps> = ({
  open,
  onOpenChange,
  order,
  onSaved,
}) => {
  if (!order) return null;

  const [productionDate, setProductionDate] = useState<string>(
    new Date().toISOString().split("T")[0] || ""
  );
  const [shift, setShift] = useState<"A" | "B" | "C">("A");

  // Load bulk rows and map drafts
  const [rows, setRows] = useState<EditableRow[]>(() => {
    const rawRows = ProductionPlanningService.getBulkDailyProductionRows(order);
    const drafts = ProductionPlanningService.getJobCardDraftsForOrder(order.id);
    return rawRows.map((r) => {
      const draft =
        drafts.find((d) => d.id === r.jobCardDraftId) ||
        ({
          id: r.jobCardDraftId,
          draftCardNo: r.jobCardNo,
          productionOrderId: r.productionOrderId,
          plannedQtyMetre: r.plannedQtyMetre,
          loomId: r.loomId,
          loomNo: r.loomNo,
          itemCode: r.itemCode,
          designNo: r.designNo,
        } as unknown as JobCardDraft);

      return {
        row: r,
        draft,
        todayQtyMetre: "",
        downtimeMinutes: "",
        downtimeReason: "",
        remark: "",
        expanded: false,
        isValid: true,
      };
    });
  });

  const handleQtyChange = (jobCardId: string, val: string) => {
    setRows((prev) =>
      prev.map((item) => {
        if (item.row.jobCardDraftId !== jobCardId) return item;

        let error: string | undefined = undefined;
        let isValid = true;

        if (val.trim() !== "") {
          const num = parseFloat(val);
          if (isNaN(num) || num <= 0) {
            error = "Quantity must be > 0";
            isValid = false;
          } else {
            const v = ProductionPlanningService.validateDailyProductionQty({
              draft: item.draft,
              entryQty: num,
            });
            if (!v.valid) {
              error = v.error;
              isValid = false;
            }
          }
        }

        return {
          ...item,
          todayQtyMetre: val,
          validationError: error,
          isValid,
        };
      })
    );
  };

  const toggleExpand = (jobCardId: string) => {
    setRows((prev) =>
      prev.map((item) =>
        item.row.jobCardDraftId === jobCardId
          ? { ...item, expanded: !item.expanded }
          : item
      )
    );
  };

  const handleValidateAll = (): boolean => {
    let hasEntries = false;
    let allValid = true;

    setRows((prev) =>
      prev.map((item) => {
        const val = item.todayQtyMetre.trim();
        if (!val) {
          return { ...item, validationError: undefined, isValid: true };
        }

        hasEntries = true;
        const num = parseFloat(val);
        if (isNaN(num) || num <= 0) {
          allValid = false;
          return {
            ...item,
            validationError: "Quantity must be > 0",
            isValid: false,
          };
        }

        const v = ProductionPlanningService.validateDailyProductionQty({
          draft: item.draft,
          entryQty: num,
        });

        if (!v.valid) {
          allValid = false;
          return {
            ...item,
            validationError: v.error,
            isValid: false,
          };
        }

        return { ...item, validationError: undefined, isValid: true };
      })
    );

    if (!hasEntries) {
      toast.info("Please enter today's production quantity for at least one Job Card.");
      return false;
    }

    if (!allValid) {
      toast.error("Some entries have validation errors. Please check the flagged rows.");
      return false;
    }

    toast.success("All entered quantities are valid!");
    return true;
  };

  const handleSaveBulk = () => {
    if (!handleValidateAll()) return;

    const rowsToSave = rows
      .filter((r) => r.todayQtyMetre.trim() !== "" && parseFloat(r.todayQtyMetre) > 0)
      .map((r) => ({
        jobCardDraftId: r.row.jobCardDraftId,
        todayQtyMetre: parseFloat(r.todayQtyMetre),
        shift,
        productionDate,
        ...(r.downtimeMinutes ? { downtimeMinutes: parseInt(r.downtimeMinutes, 10) } : {}),
        ...(r.downtimeReason ? { downtimeReason: r.downtimeReason } : {}),
        ...(r.remark.trim() ? { remark: r.remark.trim() } : {}),
      }));

    if (rowsToSave.length === 0) return;

    const result = ProductionPlanningService.saveBulkDailyProductionSimulation({
      order,
      rows: rowsToSave,
    });

    if (!result.success) {
      toast.error(result.errors.join(", ") || "Failed to save bulk daily production simulation.");
      return;
    }

    toast.success(
      `Saved ${result.createdCount} daily production entries for Shift ${shift}!`
    );
    if (onSaved) onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <ListPlus className="size-5 text-primary" />
                Quick / Bulk Daily Production Entry
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Fast entry across all active Job Cards for {order.order_no} without opening
                individual forms. Validates each row independently.
              </DialogDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {order.order_no} · {order.party_name}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-3 pt-2 border-t">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs font-semibold">Production Date:</Label>
              <Input
                type="date"
                value={productionDate}
                onChange={(e) => setProductionDate(e.target.value)}
                className="h-7 w-36 text-xs font-mono"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Label className="text-xs font-semibold">Shift:</Label>
              <Select value={shift} onValueChange={(v) => setShift(v as "A" | "B" | "C")}>
                <SelectTrigger className="h-7 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Shift A</SelectItem>
                  <SelectItem value="B">Shift B</SelectItem>
                  <SelectItem value="C">Shift C</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogHeader>

        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b text-[10px] uppercase font-semibold text-muted-foreground">
                <tr>
                  <th className="py-2 px-2.5">Job Card</th>
                  <th className="py-2 px-2">Loom</th>
                  <th className="py-2 px-2">Design / Item</th>
                  <th className="py-2 px-2 text-right">Planned (MTR)</th>
                  <th className="py-2 px-2 text-right">Produced (MTR)</th>
                  <th className="py-2 px-2 text-right">Remaining (MTR)</th>
                  <th className="py-2 px-3 text-right w-36">Today Qty (MTR)</th>
                  <th className="py-2 px-2 text-center w-16">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <React.Fragment key={r.row.jobCardDraftId}>
                    <tr
                      className={`hover:bg-muted/30 transition-colors ${
                        !r.isValid ? "bg-rose-50/50 dark:bg-rose-950/20" : ""
                      }`}
                    >
                      <td className="py-2 px-2.5 font-mono font-semibold">
                        {r.row.jobCardNo}
                      </td>
                      <td className="py-2 px-2 font-mono font-medium text-primary">
                        {r.row.loomNo}
                      </td>
                      <td className="py-2 px-2 truncate max-w-[140px] text-muted-foreground">
                        {r.row.designNo || r.row.itemCode || "—"}
                      </td>
                      <td className="py-2 px-2 text-right font-mono">
                        {r.row.plannedQtyMetre.toLocaleString()}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                        {r.row.producedToDateMetre.toLocaleString()}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-amber-600 dark:text-amber-400 font-semibold">
                        {r.row.remainingQtyMetre.toLocaleString()}
                      </td>
                      <td className="py-1.5 px-3 text-right">
                        <Input
                          type="number"
                          step="0.001"
                          placeholder="0.000"
                          className={`h-7 text-xs text-right font-mono font-semibold ${
                            !r.isValid ? "border-rose-500 focus-visible:ring-rose-500" : ""
                          }`}
                          value={r.todayQtyMetre}
                          onChange={(e) =>
                            handleQtyChange(r.row.jobCardDraftId, e.target.value)
                          }
                          disabled={r.row.remainingQtyMetre <= 0}
                        />
                        {r.validationError && (
                          <span className="text-[10px] text-rose-600 dark:text-rose-400 block mt-0.5 truncate max-w-[140px] text-right">
                            {r.validationError}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 text-muted-foreground"
                          onClick={() => toggleExpand(r.row.jobCardDraftId)}
                          title="Expand downtime & remark"
                        >
                          {r.expanded ? (
                            <ChevronDown className="size-3.5" />
                          ) : (
                            <ChevronRight className="size-3.5" />
                          )}
                        </Button>
                      </td>
                    </tr>

                    {/* Collapsible Row Expansion for Downtime and Remarks */}
                    {r.expanded && (
                      <tr className="bg-muted/20 border-b">
                        <td colSpan={8} className="p-2.5">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                            <div>
                              <Label className="text-[10px] text-muted-foreground block">
                                Downtime (Minutes)
                              </Label>
                              <Input
                                type="number"
                                placeholder="0"
                                className="h-7 text-xs font-mono"
                                value={r.downtimeMinutes}
                                onChange={(e) =>
                                  setRows((prev) =>
                                    prev.map((it) =>
                                      it.row.jobCardDraftId === r.row.jobCardDraftId
                                        ? { ...it, downtimeMinutes: e.target.value }
                                        : it
                                    )
                                  )
                                }
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground block">
                                Downtime Reason
                              </Label>
                              <Select
                                value={r.downtimeReason}
                                onValueChange={(v) =>
                                  setRows((prev) =>
                                    prev.map((it) =>
                                      it.row.jobCardDraftId === r.row.jobCardDraftId
                                        ? { ...it, downtimeReason: v }
                                        : it
                                    )
                                  )
                                }
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue placeholder="Select reason..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {DOWNTIME_REASONS.map((reason) => (
                                    <SelectItem key={reason} value={reason}>
                                      {reason}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground block">
                                Remark
                              </Label>
                              <Input
                                placeholder="Operator notes..."
                                className="h-7 text-xs"
                                value={r.remark}
                                onChange={(e) =>
                                  setRows((prev) =>
                                    prev.map((it) =>
                                      it.row.jobCardDraftId === r.row.jobCardDraftId
                                        ? { ...it, remark: e.target.value }
                                        : it
                                    )
                                  )
                                }
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}

                {!rows.length && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground text-xs">
                      No Job Cards found for this Production Order.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="border-t pt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Info className="size-3.5" />
            <span>Each row is validated independently against Job Card remaining quantity.</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleValidateAll}>
              Validate All
            </Button>
            <Button size="sm" className="h-8 text-xs font-semibold" onClick={handleSaveBulk}>
              Save Simulation
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  History,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  Layers,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  ProductionPlanningService,
  roundQty,
  type SalesOrderRevisionImpact,
} from "@/services/production-planning.service";
import { getSales, saveSales, type SalesOrderItem } from "@/lib/sales-store";

interface SalesOrderRevisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salesOrder: SalesOrderItem;
  onRevisionSaved: () => void;
}

export const SalesOrderRevisionDialog: React.FC<SalesOrderRevisionDialogProps> = ({
  open,
  onOpenChange,
  salesOrder,
  onRevisionSaved,
}) => {
  const [revisedQtyInput, setRevisedQtyInput] = useState<string>(String(salesOrder.qty_metre));
  const [reason, setReason] = useState<string>("Customer Quantity Revision");

  React.useEffect(() => {
    setRevisedQtyInput(String(salesOrder.qty_metre));
    setReason("Customer Quantity Revision");
  }, [salesOrder.id, salesOrder.qty_metre, open]);

  const revisedQty = useMemo(() => {
    const val = parseFloat(revisedQtyInput);
    return isNaN(val) || val < 0 ? salesOrder.qty_metre : roundQty(val);
  }, [revisedQtyInput, salesOrder.qty_metre]);

  const deltaQty = roundQty(revisedQty - salesOrder.qty_metre);

  // Calculate live revision impact across linked Production Orders
  const impact = useMemo(() => {
    return ProductionPlanningService.calculateSalesOrderRevisionImpact(salesOrder.id, revisedQty);
  }, [salesOrder.id, revisedQty]);

  const handleApply = () => {
    if (revisedQty <= 0) {
      toast.error("Sales quantity must be greater than zero.");
      return;
    }

    if (impact.syncEligibility === "AUTO_SYNC_ELIGIBLE") {
      // Auto-sync single linked planning Production Order
      const res = ProductionPlanningService.applySalesOrderRevisionAutoSync(salesOrder.id, revisedQty);
      if (res.success) {
        toast.success(
          `Sales Order ${salesOrder.order_no} and linked Production Order ${res.syncedOrderNo} auto-synced to ${revisedQty.toLocaleString()} MTR.`
        );
        onRevisionSaved();
        onOpenChange(false);
      } else {
        toast.error(res.error || "Failed to auto-sync production order.");
      }
    } else {
      // Update Sales Order alone (Case A1, A3, A4)
      const sales = getSales();
      const idx = sales.orders.findIndex((s) => s.id === salesOrder.id);
      if (idx >= 0) {
        const updated = { ...sales.orders[idx]!, qty_metre: revisedQty };
        const updatedList = [...sales.orders];
        updatedList[idx] = updated;
        saveSales({ ...sales, orders: updatedList });
      }

      toast.success(
        `Sales Order updated to ${revisedQty.toLocaleString()} MTR. Linked production orders preserved without guessing.`
      );
      onRevisionSaved();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 rounded-lg">
              <History className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">
                Sales Order Quantity Revision & Production Impact
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Evaluates impact on linked production orders. Never blindly overwrites or guesses order quantities.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Inherited Metadata Banner (ENTER ONCE -> REUSE EVERYWHERE) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-muted/40 border text-xs">
          <div>
            <span className="text-muted-foreground block">Sales Order:</span>
            <span className="font-semibold text-foreground">{salesOrder.order_no}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Customer:</span>
            <span className="font-semibold text-foreground truncate block">{salesOrder.customer_name}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Design:</span>
            <span className="font-semibold text-foreground">{salesOrder.design_no || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Current Sales Qty:</span>
            <span className="font-bold text-foreground">
              {salesOrder.qty_metre.toLocaleString()} MTR
            </span>
          </div>
        </div>

        {/* Quantity Edit Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="revised-so-qty" className="text-xs font-semibold">
              Revised Sales Order Quantity (MTR) *
            </Label>
            <Input
              id="revised-so-qty"
              type="number"
              step="any"
              min="0"
              value={revisedQtyInput}
              onChange={(e) => setRevisedQtyInput(e.target.value)}
              className="font-bold text-base"
            />
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">Sales Delta:</span>
              <span
                className={`font-bold flex items-center gap-0.5 ${
                  deltaQty > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : deltaQty < 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-muted-foreground"
                }`}
              >
                {deltaQty > 0 ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : deltaQty < 0 ? (
                  <TrendingDown className="w-3.5 h-3.5" />
                ) : null}
                {deltaQty > 0 ? `+${deltaQty}` : `${deltaQty}`} MTR
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="so-reason" className="text-xs font-semibold">
              Revision Reason
            </Label>
            <Input
              id="so-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="text-xs"
              placeholder="e.g. Customer requested amendment"
            />
          </div>
        </div>

        {/* Impact Analysis Card */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Production Impact Analysis
            </h4>
            <Badge
              variant="outline"
              className={`text-[10px] font-bold ${
                impact.syncEligibility === "AUTO_SYNC_ELIGIBLE"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                  : impact.syncEligibility === "MULTIPLE_ORDERS"
                  ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30"
                  : impact.syncEligibility === "REVIEW_REQUIRED"
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {impact.syncEligibility === "AUTO_SYNC_ELIGIBLE"
                ? "AUTO SYNC ELIGIBLE"
                : impact.syncEligibility === "MULTIPLE_ORDERS"
                ? "MULTIPLE PRODUCTION ORDERS"
                : impact.syncEligibility === "REVIEW_REQUIRED"
                ? "REVIEW REQUIRED"
                : "NO LINKED PRODUCTION"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-lg bg-card border text-xs">
            <div>
              <span className="text-muted-foreground block">Total Planned Production:</span>
              <span className="font-bold text-sm text-foreground">
                {impact.totalPlannedProductionQty.toLocaleString()} MTR
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Unplanned Sales Qty:</span>
              <span
                className={`font-bold text-sm ${
                  impact.unplannedSalesQty > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {impact.unplannedSalesQty.toLocaleString()} MTR
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Linked Orders:</span>
              <span className="font-semibold text-sm text-foreground">
                {impact.linkedProductionOrders.length} Order{impact.linkedProductionOrders.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          {/* Action Guidance Banner */}
          <div
            className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
              impact.syncEligibility === "AUTO_SYNC_ELIGIBLE"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                : impact.syncEligibility === "MULTIPLE_ORDERS"
                ? "bg-blue-500/10 border-blue-500/30 text-blue-800 dark:text-blue-300"
                : impact.syncEligibility === "REVIEW_REQUIRED"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
                : "bg-muted/40 border-muted text-muted-foreground"
            }`}
          >
            {impact.syncEligibility === "AUTO_SYNC_ELIGIBLE" ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            )}
            <div>
              <span className="font-bold">Recommendation:</span> {impact.suggestedAction}
            </div>
          </div>

          {/* Linked Production Orders Table */}
          {impact.linkedProductionOrders.length > 0 && (
            <div className="border rounded-lg overflow-hidden bg-card mt-2">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 text-[11px]">
                    <TableHead className="py-2">Production Order No</TableHead>
                    <TableHead className="py-2 text-right">Planned Qty (MTR)</TableHead>
                    <TableHead className="py-2">Execution Progress</TableHead>
                    <TableHead className="py-2 text-right">Sync Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {impact.linkedProductionOrders.map((po) => (
                    <TableRow key={po.id} className="text-xs">
                      <TableCell className="py-2 font-bold text-foreground">
                        {po.orderNo}
                      </TableCell>
                      <TableCell className="py-2 text-right font-mono font-semibold">
                        {po.plannedQty.toLocaleString()} MTR
                      </TableCell>
                      <TableCell className="py-2">
                        {po.hasProgress ? (
                          <Badge variant="outline" className="text-amber-600 border-amber-600 text-[10px]">
                            Execution Started
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-600 text-[10px]">
                            Planning Mode Only
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        {impact.syncEligibility === "AUTO_SYNC_ELIGIBLE" ? (
                          <Badge className="bg-emerald-600 text-white text-[10px]">
                            Auto-Sync Eligible
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            Manual Allocation
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between items-center gap-2 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            size="sm"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleApply}
            disabled={deltaQty === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-8"
          >
            {impact.syncEligibility === "AUTO_SYNC_ELIGIBLE"
              ? "Apply Revision & Auto-Sync Linked Order"
              : "Update Sales Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

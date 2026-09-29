import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  Info,
  Scale,
  Clock,
  Sparkles,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  type QuantityReconciliationResult,
  type ReconciliationStatus,
} from "@/services/fabric-process-receive.service";

interface FabricProcessReconciliationPanelProps {
  reconciliation: QuantityReconciliationResult;
  currentProcessName?: string | undefined;
  nextProcessName?: string | undefined;
  isLastStep?: boolean | undefined;
}

const STATUS_CONFIG: Record<
  ReconciliationStatus,
  { label: string; badgeClass: string; icon: any; borderClass: string }
> = {
  CLEAN_EXACT: {
    label: "CLEAN EXACT",
    badgeClass: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
    icon: CheckCircle2,
    borderClass: "border-emerald-500/30 bg-emerald-950/10",
  },
  RECONCILIATION_REQUIRED: {
    label: "RECONCILIATION REQUIRED",
    badgeClass: "border-amber-500/40 text-amber-300 bg-amber-500/10",
    icon: AlertTriangle,
    borderClass: "border-amber-500/30 bg-amber-950/10",
  },
  RECONCILED_WITH_WASTAGE_DECLARATION: {
    label: "WASTAGE REVIEW REQUIRED",
    badgeClass: "border-amber-500/40 text-amber-300 bg-amber-500/10",
    icon: AlertTriangle,
    borderClass: "border-amber-500/30 bg-amber-950/10",
  },
  SHORTAGE_REVIEW_REQUIRED: {
    label: "SHORTAGE REVIEW REQUIRED",
    badgeClass: "border-rose-500/40 text-rose-300 bg-rose-500/10",
    icon: ShieldAlert,
    borderClass: "border-rose-500/30 bg-rose-950/10",
  },
  OVER_RECEIPT_REVIEW_REQUIRED: {
    label: "OVER-RECEIPT REVIEW REQUIRED",
    badgeClass: "border-purple-500/40 text-purple-300 bg-purple-500/10",
    icon: AlertCircle,
    borderClass: "border-purple-500/30 bg-purple-950/10",
  },
  INVALID_DECLARATION: {
    label: "INVALID DECLARATION",
    badgeClass: "border-rose-600 text-rose-200 bg-rose-950/40",
    icon: ShieldAlert,
    borderClass: "border-rose-600/40 bg-rose-950/20",
  },
  STALE_SOURCE_REVIEW: {
    label: "STALE SOURCE REVIEW",
    badgeClass: "border-amber-600 text-amber-200 bg-amber-950/40",
    icon: AlertTriangle,
    borderClass: "border-amber-600/40 bg-amber-950/20",
  },
};

export function FabricProcessReconciliationPanel({
  reconciliation,
  currentProcessName = "Current Process",
  nextProcessName,
  isLastStep = false,
}: FabricProcessReconciliationPanelProps) {
  const meta = STATUS_CONFIG[reconciliation.reconciliationStatus] || STATUS_CONFIG.RECONCILIATION_REQUIRED;
  const StatusIcon = meta.icon;

  const rawVariance = reconciliation.rawVarianceQtyMetre;
  const unexplained = reconciliation.unexplainedVarianceQtyMetre;
  const wastage = reconciliation.declaredWastageQtyMetre;
  const shortage = reconciliation.declaredShortageQtyMetre;
  const isOverReceipt = reconciliation.isOverReceipt;

  return (
    <div className="space-y-3 font-sans text-xs">
      {/* Title & Live Status Header */}
      <div className="flex items-center justify-between p-3 rounded-xl border bg-slate-950/60 border-slate-800">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-slate-200 text-xs tracking-wide uppercase">
            Quantity Reconciliation
          </span>
        </div>
        <Badge variant="outline" className={`font-mono text-[10px] px-2.5 py-0.5 flex items-center gap-1.5 ${meta.badgeClass}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {meta.label}
        </Badge>
      </div>

      {/* Primary Metrics Grid (Separate Columns: Never combine into generic loss) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {/* Issued Qty */}
        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
          <span className="text-[10px] text-slate-400 block uppercase font-medium">Issued Qty</span>
          <span className="text-sm font-bold font-mono text-white block mt-0.5">
            {reconciliation.issuedQtyMetre.toFixed(3)} MTR
          </span>
          <span className="text-[9px] text-slate-500 font-mono">Source preparation</span>
        </div>

        {/* Received Qty */}
        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
          <span className="text-[10px] text-slate-400 block uppercase font-medium">Received Qty</span>
          <span className="text-sm font-bold font-mono text-cyan-300 block mt-0.5">
            {reconciliation.receivedQtyMetre.toFixed(3)} MTR
          </span>
          <span className="text-[9px] text-slate-500 font-mono">Physical return</span>
        </div>

        {/* Quantity Variance (NEVER auto-labelled wastage or shortage) */}
        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
          <span className="text-[10px] text-slate-400 block uppercase font-medium">Quantity Variance</span>
          <span
            className={`text-sm font-bold font-mono block mt-0.5 ${
              isOverReceipt
                ? "text-purple-300"
                : rawVariance > 0
                ? "text-amber-300"
                : "text-emerald-400"
            }`}
          >
            {isOverReceipt ? `+${reconciliation.overReceiptQtyMetre.toFixed(3)}` : rawVariance.toFixed(3)} MTR
          </span>
          <span className="text-[9px] text-slate-500 font-mono">
            {isOverReceipt ? "Over-receipt" : "Issued - Received"}
          </span>
        </div>

        {/* Declared Wastage (Kept strictly separate) */}
        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
          <span className="text-[10px] text-slate-400 block uppercase font-medium">Declared Wastage</span>
          <span
            className={`text-sm font-bold font-mono block mt-0.5 ${
              wastage > 0 ? "text-amber-300" : "text-slate-400"
            }`}
          >
            {wastage.toFixed(3)} MTR
          </span>
          <span className="text-[9px] text-slate-500 font-mono">Process loss (stated)</span>
        </div>

        {/* Declared Shortage (Kept strictly separate) */}
        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
          <span className="text-[10px] text-slate-400 block uppercase font-medium">Declared Shortage</span>
          <span
            className={`text-sm font-bold font-mono block mt-0.5 ${
              shortage > 0 ? "text-rose-300" : "text-slate-400"
            }`}
          >
            {shortage.toFixed(3)} MTR
          </span>
          <span className="text-[9px] text-slate-500 font-mono">Unaccounted (stated)</span>
        </div>

        {/* Unexplained Variance */}
        <div
          className={`p-2.5 rounded-lg border ${
            unexplained > 0
              ? "bg-amber-950/20 border-amber-500/40"
              : isOverReceipt
              ? "bg-purple-950/20 border-purple-500/40"
              : "bg-slate-900 border-slate-800"
          }`}
        >
          <span className="text-[10px] text-slate-400 block uppercase font-medium">Unexplained Variance</span>
          <span
            className={`text-sm font-bold font-mono block mt-0.5 ${
              unexplained > 0
                ? "text-amber-400"
                : isOverReceipt
                ? "text-purple-300"
                : "text-emerald-400"
            }`}
          >
            {unexplained.toFixed(3)} MTR
          </span>
          <span className="text-[9px] text-slate-500 font-mono">Requires explanation</span>
        </div>
      </div>

      {/* Prominent Domain Notifications & Callouts based on Status */}
      {/* 1. Clean Exact */}
      {reconciliation.reconciliationStatus === "CLEAN_EXACT" && (
        <div className="p-3 rounded-lg border border-emerald-500/40 bg-emerald-950/20 text-emerald-300 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold block text-[11px]">CLEAN EXACT RECONCILIATION</span>
            <p className="text-[11px] text-emerald-400/90 leading-relaxed">
              Received quantity matches issued quantity exactly (0.000 MTR variance). Step completion preview is ELIGIBLE.
            </p>
          </div>
        </div>
      )}

      {/* 2. Unexplained Variance */}
      {reconciliation.reconciliationStatus === "RECONCILIATION_REQUIRED" && (
        <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-950/20 text-amber-300 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold block text-[11px]">RECONCILIATION REQUIRED</span>
            <p className="text-[11px] text-amber-300/90 leading-relaxed">
              <strong>{unexplained.toFixed(3)} MTR</strong> remains unexplained. This difference is NOT assumed to be wastage or shortage until explicitly declared.
            </p>
          </div>
        </div>
      )}

      {/* 3. Declared Wastage without configured tolerance */}
      {reconciliation.reconciliationStatus === "RECONCILED_WITH_WASTAGE_DECLARATION" && (
        <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-950/20 text-amber-300 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold block text-[11px]">DECLARED WASTAGE — TOLERANCE NOT CONFIGURED</span>
            <p className="text-[11px] text-amber-300/90 leading-relaxed">
              Operator declared {wastage.toFixed(3)} MTR wastage. Process wastage tolerance is not configured in this phase. Status held as <strong>RECONCILIATION REVIEW REQUIRED</strong>. Step progression blocked.
            </p>
          </div>
        </div>
      )}

      {/* 4. Declared Shortage */}
      {reconciliation.reconciliationStatus === "SHORTAGE_REVIEW_REQUIRED" && (
        <div className="p-3 rounded-lg border border-rose-500/40 bg-rose-950/20 text-rose-300 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold block text-[11px]">SHORTAGE DECLARED — REVIEW REQUIRED</span>
            <p className="text-[11px] text-rose-300/90 leading-relaxed">
              Operator declared {shortage.toFixed(3)} MTR shortage. Processor liability or recovery rules are not settled here. Review required; progression blocked.
            </p>
          </div>
        </div>
      )}

      {/* 5. Over-Receipt Variance */}
      {reconciliation.reconciliationStatus === "OVER_RECEIPT_REVIEW_REQUIRED" && (
        <div className="p-3 rounded-lg border border-purple-500/40 bg-purple-950/20 text-purple-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold block text-[11px]">
              OVER-RECEIPT VARIANCE: {reconciliation.overReceiptQtyMetre.toFixed(3)} MTR
            </span>
            <p className="text-[11px] text-purple-300/90 leading-relaxed">
              Received quantity exceeds issued quantity by {reconciliation.overReceiptQtyMetre.toFixed(3)} MTR. Flagged as OVER-RECEIPT REVIEW REQUIRED (never treated as gain, bonus, or extra stock).
            </p>
          </div>
        </div>
      )}

      {/* 6. Invalid Declaration */}
      {reconciliation.reconciliationStatus === "INVALID_DECLARATION" && (
        <div className="p-3 rounded-lg border border-rose-600 bg-rose-950/30 text-rose-200 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold block text-[11px]">INVALID DECLARATION — SAVE BLOCKED</span>
            <p className="text-[11px] text-rose-300 leading-relaxed">
              {reconciliation.statusMessage} Declared wastage and shortage cannot exceed observed variance.
            </p>
          </div>
        </div>
      )}

      {/* Route Step & Next Step Progression Preview (Steps 25, 26, 27, 28, 29) */}
      <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-slate-300 uppercase tracking-wide">
            Route Progression Simulation Preview
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            Pure Frontend Simulation · No Backend Execution
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {/* Current Step */}
          <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] text-slate-500 block uppercase font-mono">Current Step</span>
            <span className="text-white font-medium block truncate mt-0.5">
              {currentProcessName}
            </span>
            <div className="mt-1.5 flex items-center gap-1.5">
              {reconciliation.canAdvanceRouteStep ? (
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-500/10 text-[9px] font-mono">
                  COMPLETED — SIMULATION
                </Badge>
              ) : (
                <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-500/10 text-[9px] font-mono">
                  REVIEW REQUIRED
                </Badge>
              )}
            </div>
          </div>

          {/* Next Step / Route Completion */}
          <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] text-slate-500 block uppercase font-mono">
              {isLastStep && reconciliation.canAdvanceRouteStep ? "Route Result" : "Next Step"}
            </span>
            {isLastStep && reconciliation.canAdvanceRouteStep ? (
              <div>
                <span className="text-emerald-400 font-semibold block text-[11px] mt-0.5">
                  PROCESS ROUTE COMPLETE — PREVIEW
                </span>
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-500/10 text-[9px] font-mono mt-1.5">
                  ALL STEPS FINISHED
                </Badge>
              </div>
            ) : nextProcessName ? (
              <div>
                <span className="text-white font-medium block truncate mt-0.5">
                  {nextProcessName}
                </span>
                <div className="mt-1.5 flex items-center gap-1.5">
                  {reconciliation.canAdvanceRouteStep ? (
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-500/10 text-[9px] font-mono">
                      READY — SIMULATION
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-slate-700 text-slate-400 bg-slate-900 text-[9px] font-mono">
                      WAITING PREVIOUS
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <span className="text-slate-400 block mt-0.5">
                  {reconciliation.canAdvanceRouteStep ? "Final Route Step" : "Pending Reconciliation"}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">
                  {reconciliation.canAdvanceRouteStep ? "Route complete preview" : "Waiting previous resolution"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Step 29 Guardrails: Last Step UI */}
        {isLastStep && reconciliation.canAdvanceRouteStep && (
          <div className="p-2.5 rounded-lg bg-slate-950/90 border border-indigo-500/30 text-[11px] text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 text-indigo-300 font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Route Completion Governance Guardrails:</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[10px]">
              <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                Commercial Saleability: <strong className="text-amber-400">UNCHANGED</strong>
              </div>
              <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                Finished Stock: <strong className="text-rose-400">NOT CREATED</strong>
              </div>
              <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                Quality Grade: <strong className="text-slate-300">UNCHANGED</strong>
              </div>
            </div>
          </div>
        )}

        {/* Universal Visible Disclaimer (Step 25) */}
        <p className="text-[10px] text-slate-500 italic pt-1">
          * No route or inventory state has been posted to the backend. Simulation only.
        </p>
      </div>
    </div>
  );
}

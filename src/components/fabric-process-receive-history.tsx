import React, { useState } from "react";
import {
  History,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Building2,
  Scale,
  RefreshCw,
  GitCommit,
  Layers,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FabricProcessReceiveService,
  type FabricProcessReceiveSimulation,
  type FabricProcessReceiveRevision,
  type ProcessReceiveStatus,
} from "@/services/fabric-process-receive.service";

interface FabricProcessReceiveHistoryProps {
  rollDraftId: string;
  onSelectReceive?: (receive: FabricProcessReceiveSimulation) => void;
}

const STATUS_BADGES: Record<ProcessReceiveStatus, { label: string; class: string }> = {
  RECONCILED: { label: "RECONCILED (CLEAN)", class: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10" },
  RECEIVED_SIMULATION: { label: "RECEIVED SIMULATION", class: "border-blue-500/40 text-blue-300 bg-blue-500/10" },
  REVIEW_REQUIRED: { label: "REVIEW REQUIRED", class: "border-amber-500/40 text-amber-300 bg-amber-500/10" },
  DRAFT: { label: "DRAFT", class: "border-slate-600 text-slate-300 bg-slate-800" },
  SUPERSEDED: { label: "SUPERSEDED", class: "border-slate-800 text-slate-500 bg-slate-950" },
};

export function FabricProcessReceiveHistory({
  rollDraftId,
  onSelectReceive,
}: FabricProcessReceiveHistoryProps) {
  const [expandedRevisionId, setExpandedRevisionId] = useState<string | null>(null);

  const history = FabricProcessReceiveService.getReceiveHistory(rollDraftId);
  const revisions = FabricProcessReceiveService.getReceiveRevisionHistory(rollDraftId);

  if (history.length === 0) {
    return (
      <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
        <History className="w-5 h-5 text-slate-600" />
        <p>No process receive records found for this roll.</p>
        <span className="text-[11px] text-slate-600">
          Save an internal completion or job work inward simulation to record process receive history.
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2 font-semibold text-slate-300">
          <History className="w-4 h-4 text-indigo-400" />
          <span>Process Receive History ({history.length})</span>
        </div>
        {revisions.length > 0 && (
          <span className="text-[11px] text-indigo-300 font-mono">
            {revisions.length} revision{revisions.length > 1 ? "s" : ""} recorded
          </span>
        )}
      </div>

      {/* Revisions Section (if any revisions exist) */}
      {revisions.length > 0 && (
        <div className="p-3 rounded-xl border border-indigo-500/30 bg-slate-950/70 space-y-2">
          <div className="flex items-center gap-1.5 text-indigo-300 font-semibold text-[11px]">
            <GitCommit className="w-3.5 h-3.5" />
            <span>Audit Trail & Receive Revisions</span>
          </div>

          <div className="space-y-2">
            {revisions.map((rev) => {
              const isExpanded = expandedRevisionId === rev.id;
              const prev = rev.previousReceive;
              const curr = rev.revisedReceive;
              const deltaQty = curr.receivedQtyMetre - prev.receivedQtyMetre;

              return (
                <div
                  key={rev.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 space-y-1.5 text-xs font-mono"
                >
                  <div
                    onClick={() => setExpandedRevisionId(isExpanded ? null : rev.id)}
                    className="flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <Badge variant="outline" className="border-indigo-500/40 text-indigo-300 text-[10px]">
                        Rev #{rev.revisionNumber}
                      </Badge>
                      <span className="text-slate-400 text-[11px]">
                        {new Date(rev.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-slate-400">Delta:</span>
                      <span className={deltaQty >= 0 ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                        {deltaQty >= 0 ? `+${deltaQty.toFixed(3)}` : deltaQty.toFixed(3)} MTR
                      </span>
                    </div>
                  </div>

                  {/* Revision Reason (Always visible) */}
                  <div className="text-[11px] text-slate-300 bg-slate-950/60 p-2 rounded border border-slate-800/80 font-sans">
                    <span className="text-slate-500 font-semibold uppercase text-[10px] block font-mono">
                      Revision Reason:
                    </span>
                    "{rev.reason}"
                  </div>

                  {/* Detailed Comparison Delta if Expanded */}
                  {isExpanded && (
                    <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[10px] font-mono">
                      <div className="p-2 rounded bg-slate-950/80 border border-slate-800">
                        <span className="text-slate-500 block uppercase">Previous Receive (Superseded)</span>
                        <div className="mt-1 space-y-0.5">
                          <div>Received: <strong className="text-slate-300">{prev.receivedQtyMetre.toFixed(3)} MTR</strong></div>
                          <div>Wastage: <span className="text-slate-400">{(prev.declaredWastageQtyMetre || 0).toFixed(3)} MTR</span></div>
                          <div>Shortage: <span className="text-slate-400">{(prev.declaredShortageQtyMetre || 0).toFixed(3)} MTR</span></div>
                          <div>Variance: <span className="text-slate-400">{prev.rawVarianceQtyMetre.toFixed(3)} MTR</span></div>
                          <div>Status: <span className="text-slate-400">{prev.status}</span></div>
                        </div>
                      </div>

                      <div className="p-2 rounded bg-slate-950/80 border border-indigo-500/30">
                        <span className="text-indigo-400 block uppercase">Revised Receive (Active)</span>
                        <div className="mt-1 space-y-0.5">
                          <div>Received: <strong className="text-emerald-400">{curr.receivedQtyMetre.toFixed(3)} MTR</strong></div>
                          <div>Wastage: <span className="text-amber-400">{(curr.declaredWastageQtyMetre || 0).toFixed(3)} MTR</span></div>
                          <div>Shortage: <span className="text-rose-400">{(curr.declaredShortageQtyMetre || 0).toFixed(3)} MTR</span></div>
                          <div>Variance: <span className="text-slate-300">{curr.rawVarianceQtyMetre.toFixed(3)} MTR</span></div>
                          <div>Status: <span className="text-emerald-400">{curr.status}</span></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Receive Records List */}
      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
        {history.map((rec, idx) => {
          const statusMeta = STATUS_BADGES[rec.status] || STATUS_BADGES.DRAFT;
          const isLatest = idx === 0 && rec.status !== "SUPERSEDED";

          return (
            <div
              key={rec.id}
              onClick={() => onSelectReceive?.(rec)}
              className={`p-3.5 rounded-xl border transition-all text-xs ${
                isLatest
                  ? "border-indigo-500/40 bg-slate-900/90 shadow-sm"
                  : rec.status === "SUPERSEDED"
                  ? "border-slate-800/60 bg-slate-950/40 opacity-70"
                  : "border-slate-800 bg-slate-900/50 hover:bg-slate-900/70"
              } ${onSelectReceive ? "cursor-pointer" : ""}`}
            >
              {/* Top Row: Ref, Date, Status */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/70">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-indigo-500/40 text-indigo-300 font-mono text-[10px]">
                    DRAFT-PR #{history.length - idx}
                  </Badge>
                  <span className="text-slate-400 text-[11px] flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {new Date(rec.createdAt).toLocaleString()}
                  </span>
                  {isLatest && (
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[9px] px-1.5 py-0">
                      CURRENT
                    </Badge>
                  )}
                </div>

                <Badge variant="outline" className={`text-[10px] ${statusMeta.class}`}>
                  {statusMeta.label}
                </Badge>
              </div>

              {/* Details Grid (Step 30) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2 font-mono text-[11px]">
                <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block uppercase font-sans">Process</span>
                  <span className="text-white font-semibold truncate block">{rec.processName}</span>
                </div>

                <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block uppercase font-sans">Issued Qty</span>
                  <span className="text-slate-300 font-semibold">{rec.issuedQtyMetre.toFixed(3)} MTR</span>
                </div>

                <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block uppercase font-sans">Received Qty</span>
                  <span className="text-cyan-300 font-semibold">{rec.receivedQtyMetre.toFixed(3)} MTR</span>
                </div>

                <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block uppercase font-sans">Raw Variance</span>
                  <span
                    className={`font-semibold ${
                      rec.rawVarianceQtyMetre > 0
                        ? "text-amber-300"
                        : rec.rawVarianceQtyMetre < 0
                        ? "text-purple-300"
                        : "text-emerald-400"
                    }`}
                  >
                    {rec.rawVarianceQtyMetre.toFixed(3)} MTR
                  </span>
                </div>
              </div>

              {/* Declarations Breakout */}
              <div className="grid grid-cols-3 gap-2 mb-2 font-mono text-[10px]">
                <div className="bg-slate-950/40 p-1.5 rounded border border-slate-800/60">
                  <span className="text-slate-500 block uppercase font-sans">Declared Wastage</span>
                  <span className="text-amber-400">
                    {(rec.declaredWastageQtyMetre || 0).toFixed(3)} MTR
                  </span>
                </div>

                <div className="bg-slate-950/40 p-1.5 rounded border border-slate-800/60">
                  <span className="text-slate-500 block uppercase font-sans">Declared Shortage</span>
                  <span className="text-rose-400">
                    {(rec.declaredShortageQtyMetre || 0).toFixed(3)} MTR
                  </span>
                </div>

                <div className="bg-slate-950/40 p-1.5 rounded border border-slate-800/60">
                  <span className="text-slate-500 block uppercase font-sans">Unexplained</span>
                  <span className="text-slate-300">
                    {rec.unexplainedVarianceQtyMetre.toFixed(3)} MTR
                  </span>
                </div>
              </div>

              {/* Processor Context if External */}
              {rec.executionMode === "EXTERNAL_JOBWORK" && rec.jobPartyName && (
                <div className="mb-2 p-2 rounded bg-slate-950/40 border border-slate-800/60 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Processor: <strong className="text-white">{rec.jobPartyName}</strong></span>
                    {rec.subPartyName && <span className="text-slate-400">({rec.subPartyName})</span>}
                  </div>
                  {rec.processorChallanNo && (
                    <span className="text-slate-400 font-mono text-[10px]">
                      Challan: {rec.processorChallanNo}
                    </span>
                  )}
                </div>
              )}

              {/* Return Timing info (Step 21) */}
              {rec.expectedReturnDate && (
                <div className="mb-2 p-2 rounded bg-slate-950/40 border border-slate-800/60 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400">
                    Expected: {rec.expectedReturnDate} · Actual: {rec.receiveDate}
                  </span>
                  {rec.daysEarlyLate !== undefined && (
                    <span
                      className={
                        rec.daysEarlyLate > 0
                          ? "text-amber-400"
                          : rec.daysEarlyLate < 0
                          ? "text-emerald-400"
                          : "text-slate-400"
                      }
                    >
                      {rec.daysEarlyLate === 0
                        ? "On time"
                        : rec.daysEarlyLate > 0
                        ? `${rec.daysEarlyLate} day(s) late`
                        : `${Math.abs(rec.daysEarlyLate)} day(s) early`}
                    </span>
                  )}
                </div>
              )}

              {/* Review Reason / Warnings */}
              {rec.reviewReason && (
                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>{rec.reviewReason}</span>
                </div>
              )}

              {/* Remark */}
              {rec.remark && (
                <div className="mt-2 text-[11px] text-slate-400 italic">
                  Remark: "{rec.remark}"
                </div>
              )}

              {/* Footer Notice */}
              <div className="mt-2 pt-2 border-t border-slate-800/50 flex items-center justify-between text-[10px] text-slate-500">
                <span>Inventory Mutation: <strong>NOT POSTED</strong></span>
                <span>Stock Position: <strong>{rec.futureStockPosition}</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

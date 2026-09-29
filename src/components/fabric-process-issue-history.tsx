import React from "react";
import { History, Clock, ArrowRight, ShieldCheck, AlertTriangle, FileText, Building2, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  FabricProcessExecutionService,
  type FabricProcessIssuePreparation,
  type FabricProcessIssuePreparationRevision,
  type ProcessIssueStatus,
} from "@/services/fabric-process-execution.service";

interface FabricProcessIssueHistoryProps {
  rollDraftId: string;
  onSelectPreparation?: (prep: FabricProcessIssuePreparation) => void;
}

const STATUS_BADGES: Record<ProcessIssueStatus, { label: string; class: string }> = {
  PREPARED: { label: "PREPARED", class: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10" },
  DRAFT: { label: "DRAFT", class: "border-blue-500/40 text-blue-300 bg-blue-500/10" },
  REVIEW_REQUIRED: { label: "REVIEW REQUIRED", class: "border-amber-500/40 text-amber-300 bg-amber-500/10" },
  SUPERSEDED: { label: "SUPERSEDED", class: "border-slate-700 text-slate-400 bg-slate-900" },
};

export function FabricProcessIssueHistory({
  rollDraftId,
  onSelectPreparation,
}: FabricProcessIssueHistoryProps) {
  const history = FabricProcessExecutionService.getIssuePreparationHistory(rollDraftId);
  const revisions = FabricProcessExecutionService.getIssuePreparationRevisionHistory(rollDraftId);

  if (history.length === 0) {
    return (
      <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
        <History className="w-5 h-5 text-slate-600" />
        <p>No process issue preparation records found for this roll.</p>
        <span className="text-[11px] text-slate-600">
          Save an internal transfer or job work outward preview to record execution preparation.
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2 font-semibold text-slate-300">
          <History className="w-4 h-4 text-indigo-400" />
          <span>Execution Preparation History ({history.length})</span>
        </div>
        {revisions.length > 0 && (
          <span className="text-[11px] text-indigo-300 font-mono">
            {revisions.length} revision{revisions.length > 1 ? "s" : ""} recorded
          </span>
        )}
      </div>

      {/* Preparation Timeline List */}
      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
        {history.map((prep, idx) => {
          const statusMeta = STATUS_BADGES[prep.status] || STATUS_BADGES.DRAFT;
          const isLatest = idx === 0;

          return (
            <div
              key={prep.id}
              onClick={() => onSelectPreparation?.(prep)}
              className={`p-3.5 rounded-xl border transition-all text-xs ${
                isLatest
                  ? "border-indigo-500/40 bg-slate-900/90 shadow-sm"
                  : "border-slate-800 bg-slate-900/50 hover:bg-slate-900/70"
              } ${onSelectPreparation ? "cursor-pointer" : ""}`}
            >
              {/* Top Row: Ref, Date, Status */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/70">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-indigo-500/40 text-indigo-300 font-mono text-[10px]">
                    {prep.executionMode === "EXTERNAL_JOBWORK" ? "DRAFT-JW-OUT" : "INT-XFER"} #{history.length - idx}
                  </Badge>
                  <span className="text-slate-400 text-[11px] flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {new Date(prep.createdAt).toLocaleString()}
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

              {/* Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-2 font-mono text-[11px]">
                <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block uppercase font-sans">Process</span>
                  <span className="text-white font-semibold truncate block">{prep.processName}</span>
                </div>

                <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block uppercase font-sans">Execution Mode</span>
                  <span className="text-cyan-300 font-semibold">{prep.executionMode}</span>
                </div>

                <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block uppercase font-sans">Issue Qty</span>
                  <span className="text-emerald-400 font-semibold">{prep.issueQtyMetre.toFixed(3)} MTR</span>
                </div>

                <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block uppercase font-sans">Route Step</span>
                  <span className="text-slate-300">Step {prep.stepSequence} (Rev #{prep.routeRevision})</span>
                </div>
              </div>

              {/* External Party Context */}
              {prep.executionMode === "EXTERNAL_JOBWORK" && prep.jobPartyName && (
                <div className="mb-2 p-2 rounded bg-slate-950/40 border border-slate-800/60 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Processor: <strong className="text-white">{prep.jobPartyName}</strong></span>
                    {prep.subPartyName && <span className="text-slate-400">({prep.subPartyName})</span>}
                  </div>
                  {prep.expectedReturnDate && (
                    <span className="text-slate-400 font-mono text-[10px]">
                      Expected Return: {prep.expectedReturnDate}
                    </span>
                  )}
                </div>
              )}

              {/* Internal Destination */}
              {prep.executionMode === "INTERNAL" && (
                <div className="mb-2 p-2 rounded bg-slate-950/40 border border-slate-800/60 text-[11px] text-slate-400">
                  Internal Destination: <strong className="text-slate-200">{prep.internalDestinationName || "NOT CONFIGURED"}</strong>
                </div>
              )}

              {/* Review Reason / Warnings */}
              {prep.reviewReason && (
                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>{prep.reviewReason}</span>
                </div>
              )}

              {/* Remarks */}
              {prep.remark && (
                <div className="mt-2 text-[11px] text-slate-400 italic">
                  Note: "{prep.remark}"
                </div>
              )}

              {/* Footer Notice */}
              <div className="mt-2 pt-2 border-t border-slate-800/50 flex items-center justify-between text-[10px] text-slate-500">
                <span>Inventory Mutation: <strong>NONE</strong></span>
                <span>Future Position: <strong>{prep.futureStockPosition}</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

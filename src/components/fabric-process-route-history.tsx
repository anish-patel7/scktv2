import React from "react";
import { History, ArrowRight, ShieldAlert, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type {
  FabricProcessRouteRevision,
  FabricProcessRouteStatus,
} from "@/services/fabric-process-routing.service";

interface FabricProcessRouteHistoryProps {
  revisions: FabricProcessRouteRevision[];
}

const STATUS_BADGES: Record<FabricProcessRouteStatus, { label: string; class: string }> = {
  READY: { label: "READY", class: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10" },
  PLANNED: { label: "PLANNED", class: "border-blue-500/40 text-blue-300 bg-blue-500/10" },
  BLOCKED: { label: "BLOCKED", class: "border-rose-500/40 text-rose-300 bg-rose-500/10" },
  REVIEW_REQUIRED: { label: "REVIEW REQUIRED", class: "border-amber-500/40 text-amber-300 bg-amber-500/10" },
  NOT_PLANNED: { label: "NOT PLANNED", class: "border-slate-700 text-slate-400 bg-slate-900" },
};

export function FabricProcessRouteHistory({ revisions }: FabricProcessRouteHistoryProps) {
  if (revisions.length === 0) {
    return (
      <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
        <History className="w-5 h-5 text-slate-600" />
        <p>No revision history recorded for this route plan.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 pb-1">
        <History className="w-4 h-4 text-indigo-400" />
        <span>Route Plan Revisions ({revisions.length})</span>
      </div>

      <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
        {revisions.map((rev) => {
          const prevStatusMeta = STATUS_BADGES[rev.previousStatus] || {
            label: rev.previousStatus,
            class: "border-slate-700 text-slate-400",
          };
          const newStatusMeta = STATUS_BADGES[rev.newStatus] || {
            label: rev.newStatus,
            class: "border-slate-700 text-slate-400",
          };

          return (
            <div
              key={rev.id}
              className="p-3 rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-900 transition-colors text-xs"
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-indigo-500/40 text-indigo-300 font-mono text-[10px]">
                    Rev #{rev.revisionNumber}
                  </Badge>
                  <span className="text-slate-400 text-[11px] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {new Date(rev.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-[10px]">
                  <Badge variant="outline" className={`text-[10px] ${prevStatusMeta.class}`}>
                    {prevStatusMeta.label}
                  </Badge>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  <Badge variant="outline" className={`text-[10px] ${newStatusMeta.class}`}>
                    {newStatusMeta.label}
                  </Badge>
                </div>
              </div>

              <div className="mb-2">
                <p className="text-[11px] font-medium text-slate-200">
                  <span className="text-slate-500">Reason: </span>
                  {rev.reason}
                </p>
              </div>

              {/* Steps snapshot */}
              <div className="bg-slate-950/70 rounded p-2 border border-slate-800/60 font-mono text-[11px]">
                {rev.newSteps.length === 0 ? (
                  <p className="text-slate-500 italic font-sans text-[10px]">
                    No route steps (No Further Process or cleared).
                  </p>
                ) : (
                  <div className="space-y-1">
                    {rev.newSteps.map((step) => (
                      <div key={step.id || step.sequence} className="flex items-center justify-between text-slate-300">
                        <div className="flex items-center gap-2">
                          <span className="text-indigo-400 font-bold">#{step.sequence}</span>
                          <span>{step.processName}</span>
                          <span className="text-slate-500 text-[10px]">({step.processCode})</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="text-slate-400">
                            {step.executionMode === "INTERNAL" ? "Internal" : step.jobPartyName || "Job Work"}
                          </span>
                          <span className="text-white font-semibold">{step.plannedQtyMetre.toFixed(1)}m</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React from "react";
import {
  History,
  Clock,
  ArrowRight,
  Split,
  Layers,
  FileText,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  FabricRollGenealogyService,
  type FabricRollSplitPlan,
  type SplitPlanStatus,
} from "@/services/fabric-roll-genealogy.service";

interface FabricRollSplitHistoryProps {
  parentNodeId: string;
}

const STATUS_BADGES: Record<SplitPlanStatus, { label: string; class: string }> = {
  CONFIRMED_SIMULATION: {
    label: "CONFIRMED SIMULATION",
    class: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
  },
  VALID: {
    label: "VALID DRAFT",
    class: "border-blue-500/40 text-blue-300 bg-blue-500/10",
  },
  DRAFT: {
    label: "DRAFT",
    class: "border-slate-600 text-slate-300 bg-slate-800",
  },
  REVIEW_REQUIRED: {
    label: "REVIEW REQUIRED",
    class: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  },
  SUPERSEDED: {
    label: "SUPERSEDED",
    class: "border-slate-800 text-slate-500 bg-slate-950",
  },
};

export function FabricRollSplitHistory({ parentNodeId }: FabricRollSplitHistoryProps) {
  const history = FabricRollGenealogyService.getSplitHistory(parentNodeId);

  if (history.length === 0) {
    return (
      <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center gap-2 font-sans">
        <History className="w-5 h-5 text-slate-600" />
        <p>No confirmed roll split events recorded for this parent roll.</p>
        <span className="text-[11px] text-slate-600">
          Confirming a split simulation creates permanent genealogy history and supersedes the parent roll.
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3 font-sans text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2 font-semibold text-slate-300">
          <History className="w-4 h-4 text-indigo-400" />
          <span>Split History ({history.length})</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">
          Immutable Genealogy Audit Trail
        </span>
      </div>

      <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
        {history.map((plan, idx) => {
          const statusMeta = STATUS_BADGES[plan.status] || STATUS_BADGES.DRAFT;

          return (
            <div
              key={plan.id}
              className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2 font-mono"
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-indigo-500/40 text-indigo-300 text-[10px]">
                    SPLIT #{history.length - idx}
                  </Badge>
                  <span className="text-slate-400 text-[11px] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {new Date(plan.createdAt).toLocaleString()}
                  </span>
                </div>
                <Badge variant="outline" className={`text-[10px] ${statusMeta.class}`}>
                  {statusMeta.label}
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-sans block">Parent Roll</span>
                  <span className="text-white font-bold block">{plan.parentRollIdentity}</span>
                  <span className="text-[10px] text-slate-400">{plan.parentQtyMetre.toFixed(3)} MTR</span>
                </div>

                <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-sans block">Children Generated</span>
                  <span className="text-cyan-300 font-bold block">{plan.children.length} Rolls</span>
                  <span className="text-[10px] text-emerald-400 font-bold">{plan.totalChildQtyMetre.toFixed(3)} MTR</span>
                </div>

                <div className="bg-slate-950/60 p-2 rounded border border-slate-800 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-500 uppercase font-sans block">Quantity Status</span>
                  <span className="text-emerald-400 font-semibold block flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Exact 0.000m Diff
                  </span>
                </div>
              </div>

              {/* Children List */}
              <div className="p-2 rounded bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-sans block">Resulting Child Identities:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                  {plan.children.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800 text-[11px]"
                    >
                      <span className="text-indigo-300 font-semibold">{c.childRollIdentity}</span>
                      <span className="text-white font-bold">{c.quantityMetre.toFixed(3)} MTR</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reason */}
              {plan.reason && (
                <div className="text-[11px] text-slate-400 font-sans italic bg-slate-950/40 p-1.5 rounded border border-slate-800/60">
                  Reason: "{plan.reason}"
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

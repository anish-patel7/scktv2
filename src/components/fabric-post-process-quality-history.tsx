import React from "react";
import {
  History,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  FileText,
  CheckCircle2,
  AlertOctagon,
  RefreshCw,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FabricPostProcessQualityService,
  type FabricPostProcessInspection,
  type PostProcessQualitySummary,
} from "@/services/fabric-post-process-quality.service";
import { ProductionPlanningService, type FabricRollDraft } from "@/services/production-planning.service";

interface FabricPostProcessQualityHistoryProps {
  rollIdentityOrNodeId: string;
  rollDraft?: FabricRollDraft | null | undefined;
  onReinspect?: ((previousInspection: FabricPostProcessInspection) => void) | undefined;
}

const GRADE_COLORS: Record<string, string> = {
  A: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
  B: "border-blue-500/40 text-blue-300 bg-blue-500/10",
  C: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  REJECT: "border-rose-500/40 text-rose-300 bg-rose-500/10",
  UNASSIGNED: "border-slate-700 text-slate-400 bg-slate-900",
};

const DISPOSITION_COLORS: Record<string, string> = {
  ACCEPTED: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
  HOLD: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  REWORK: "border-orange-500/40 text-orange-300 bg-orange-500/10",
  REJECT: "border-rose-500/40 text-rose-300 bg-rose-500/10",
  PROCESS_REQUIRED: "border-purple-500/40 text-purple-300 bg-purple-500/10",
  NOT_SET: "border-slate-700 text-slate-400 bg-slate-900",
};

export function FabricPostProcessQualityHistory({
  rollIdentityOrNodeId,
  rollDraft,
  onReinspect,
}: FabricPostProcessQualityHistoryProps) {
  const summary: PostProcessQualitySummary = FabricPostProcessQualityService.getCurrentQualitySummary(
    rollIdentityOrNodeId
  );
  const inspections = FabricPostProcessQualityService.getInspectionHistoryForRoll(
    summary.rollGenealogyNodeId
  );

  // Initial Phase 5B Quality Context if available
  const initial5BSummary = rollDraft
    ? ProductionPlanningService.getRollQualitySummary(rollDraft)
    : undefined;

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Current Quality Summary Banner (Step 39) */}
      <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-slate-200">Current Quality View</span>
            <Badge variant="outline" className="border-indigo-500/40 text-indigo-300 font-mono text-[10px]">
              {summary.rollIdentity}
            </Badge>
          </div>
          <Badge
            variant="outline"
            className={
              summary.isOperationallyActive
                ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10 text-[10px]"
                : "border-slate-700 text-slate-400 bg-slate-900 text-[10px]"
            }
          >
            {summary.isOperationallyActive ? "ACTIVE PHYSICAL ROLL" : "SUPERSEDED BY SPLIT"}
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
          <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-sans block">Current Grade</span>
            <Badge
              variant="outline"
              className={`text-[10px] mt-0.5 ${GRADE_COLORS[summary.latestGrade] || GRADE_COLORS['UNASSIGNED']}`}
            >
              Grade {summary.latestGrade}
            </Badge>
          </div>

          <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-sans block">Disposition</span>
            <Badge
              variant="outline"
              className={`text-[10px] mt-0.5 ${DISPOSITION_COLORS[summary.latestDisposition] || DISPOSITION_COLORS['NOT_SET']}`}
            >
              {summary.latestDisposition}
            </Badge>
          </div>

          <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-sans block">Commercial Release</span>
            <span className="text-slate-300 block truncate text-[10px] mt-1" title={summary.latestCommercialReleasePreview}>
              {summary.latestCommercialReleasePreview === "QUALITY_ACCEPTED_FOR_FUTURE_COMMERCIAL_REVIEW"
                ? "ACCEPTED (PREVIEW)"
                : summary.latestCommercialReleasePreview === "NOT_READY_FUTURE_ROUTE_REQUIRED"
                ? "ROUTE PENDING"
                : summary.latestCommercialReleasePreview === "COMMERCIAL_RELEASE_BLOCKED_PREVIEW"
                ? "BLOCKED"
                : "NOT EVALUATED"}
            </span>
          </div>

          <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-sans block">Inspection Records</span>
            <span className="text-white font-bold block mt-0.5">
              {inspections.length} Record{inspections.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {summary.reviewRequired && (
          <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            <span>
              <strong>Quality Review Notice:</strong> {summary.reviewReasons.join(" · ")}
            </span>
          </div>
        )}
      </div>

      {/* Prior Phase 5B Initial Quality Context (Step 6, 15) */}
      {initial5BSummary && initial5BSummary.inspectionHistory.length > 0 && (
        <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/40 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400 font-semibold text-[11px]">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>Prior Quality Context (Phase 5B Weaving Inspection)</span>
            </div>
            <Badge variant="outline" className="border-slate-700 text-slate-400 text-[9px]">
              SOURCE CONTEXT ONLY
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono text-slate-400">
            <div>
              <span className="text-slate-500 block">Initial Grade:</span>
              <span className="text-indigo-300 font-semibold">{initial5BSummary.proposedGrade}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Initial Disposition:</span>
              <span className="text-slate-300">{initial5BSummary.disposition}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Initial Coverage:</span>
              <span className="text-slate-300">{initial5BSummary.inspectionCoveragePercent}%</span>
            </div>
            <div>
              <span className="text-slate-500 block">Initial Defects:</span>
              <span className="text-slate-300">{initial5BSummary.defectCount} Defect(s)</span>
            </div>
          </div>
        </div>
      )}

      {/* Chronological Post-Process Inspection & Reinspection Records (Step 36, 37, 38) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between pb-1 border-b border-slate-800">
          <div className="flex items-center gap-2 font-semibold text-slate-300">
            <History className="w-4 h-4 text-indigo-400" />
            <span>Post-Process Inspections & Reinspections ({inspections.length})</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Immutable Quality Trail</span>
        </div>

        {inspections.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs font-sans">
            No post-process quality inspections recorded for this roll identity yet.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {inspections.map((insp, idx) => {
              const isLatest = idx === inspections.length - 1;
              const isReinspection = insp.inspectionPurpose === "REINSPECTION";

              return (
                <div
                  key={insp.id}
                  className={`p-3 rounded-xl border font-mono text-[11px] space-y-2 transition-all ${
                    isLatest
                      ? "border-indigo-500/40 bg-slate-900/80 shadow-md"
                      : "border-slate-800 bg-slate-950/60 opacity-85"
                  }`}
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          isReinspection
                            ? "border-purple-500/40 text-purple-300 bg-purple-500/10 text-[9px]"
                            : "border-cyan-500/40 text-cyan-300 bg-cyan-500/10 text-[9px]"
                        }
                      >
                        {isReinspection ? "REINSPECTION" : "POST-PROCESS"}
                      </Badge>
                      <span className="text-white font-bold text-xs">{insp.id}</span>
                      {isLatest && (
                        <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 text-[9px]">
                          CURRENT
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[10px] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {insp.inspectionDate}
                      </span>
                      {summary.isOperationallyActive && isLatest && onReinspect && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onReinspect(insp)}
                          className="h-6 text-[10px] px-2 text-indigo-300 hover:text-white hover:bg-slate-800"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Reinspect
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Core Inspection Attributes */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                    <div className="bg-slate-950/60 p-2 rounded border border-slate-800/60">
                      <span className="text-slate-500 uppercase font-sans block text-[9px]">Grade</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] mt-0.5 ${GRADE_COLORS[insp.proposedGrade] || GRADE_COLORS['UNASSIGNED']}`}
                      >
                        Grade {insp.proposedGrade} ({insp.gradeSource})
                      </Badge>
                    </div>

                    <div className="bg-slate-950/60 p-2 rounded border border-slate-800/60">
                      <span className="text-slate-500 uppercase font-sans block text-[9px]">Disposition</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] mt-0.5 ${DISPOSITION_COLORS[insp.disposition] || DISPOSITION_COLORS['NOT_SET']}`}
                      >
                        {insp.disposition}
                      </Badge>
                    </div>

                    <div className="bg-slate-950/60 p-2 rounded border border-slate-800/60">
                      <span className="text-slate-500 uppercase font-sans block text-[9px]">Coverage</span>
                      <span className="text-white font-bold block mt-0.5">
                        {insp.inspectedQtyMetre.toFixed(3)} / {insp.rollQtyMetre.toFixed(3)} MTR ({insp.inspectionCoveragePercent}%)
                      </span>
                    </div>

                    <div className="bg-slate-950/60 p-2 rounded border border-slate-800/60">
                      <span className="text-slate-500 uppercase font-sans block text-[9px]">Process Context</span>
                      <span className="text-slate-300 block truncate mt-0.5" title={insp.sourceProcessName || "General"}>
                        {insp.sourceProcessName || insp.sourceProcessCode || "Process Stage"}
                      </span>
                    </div>
                  </div>

                  {/* Reinspection Reason Link if applicable (Step 9) */}
                  {isReinspection && (
                    <div className="p-2 rounded bg-purple-500/10 border border-purple-500/20 text-purple-200 text-[10px] font-sans">
                      <div className="flex items-center gap-1 font-semibold text-purple-300">
                        <ArrowRight className="w-3 h-3" />
                        <span>Reinspection Linked to Prior Inspection {insp.previousInspectionId}</span>
                      </div>
                      <p className="mt-0.5 text-purple-200/90 font-mono">
                        Reason: {insp.reinspectionReason || "Not specified"}
                      </p>
                    </div>
                  )}

                  {/* Defect Summary if any */}
                  {insp.defectCount > 0 && (
                    <div className="text-[10px] text-slate-400 font-sans">
                      <span>Defects Observed ({insp.defectCount}): </span>
                      <span className="text-slate-300 font-mono">
                        {insp.defects.map((d) => `${d.defectType}${d.positionMetre ? ` @ ${d.positionMetre}m` : ""}`).join("; ")}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

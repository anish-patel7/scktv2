import React, { useState } from "react";
import {
  History,
  Clock,
  ShieldCheck,
  AlertTriangle,
  FileText,
  CheckCircle2,
  AlertOctagon,
  RefreshCw,
  Layers,
  Sparkles,
  Info,
  Slash,
  Tag,
  Ban,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FabricCommercialReleaseService,
  type FabricCommercialReleaseSimulation,
  type CommercialReleaseStatus,
  type CommercialReleaseDecision,
} from "@/services/fabric-commercial-release.service";

interface FabricCommercialReleaseHistoryProps {
  rollIdentityOrNodeId?: string | undefined;
  onRefresh?: (() => void) | undefined;
  onReviseRequested?: ((release: FabricCommercialReleaseSimulation) => void) | undefined;
}

const DECISION_BADGES: Record<CommercialReleaseDecision, { label: string; class: string }> = {
  RELEASE: {
    label: "RELEASE",
    class: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
  },
  KEEP_ON_HOLD: {
    label: "KEEP ON HOLD (COMMERCIAL)",
    class: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  },
};

const STATUS_BADGES: Record<CommercialReleaseStatus, { label: string; class: string }> = {
  DRAFT: {
    label: "DRAFT",
    class: "border-slate-700 text-slate-400 bg-slate-900",
  },
  RELEASED_SIMULATION: {
    label: "RELEASED — SIMULATION",
    class: "border-emerald-500/50 text-emerald-300 bg-emerald-500/15 font-semibold",
  },
  REVIEW_REQUIRED: {
    label: "REVIEW REQUIRED (STALE)",
    class: "border-rose-500/50 text-rose-300 bg-rose-500/15 font-semibold",
  },
  REVOKED_SIMULATION: {
    label: "REVOKED — SIMULATION",
    class: "border-slate-700 text-slate-400 bg-slate-950 line-through decoration-slate-600",
  },
};

export function FabricCommercialReleaseHistory({
  rollIdentityOrNodeId,
  onRefresh,
  onReviseRequested,
}: FabricCommercialReleaseHistoryProps) {
  const [selectedForRevoke, setSelectedForRevoke] = useState<FabricCommercialReleaseSimulation | null>(null);
  const [revocationReason, setRevocationReason] = useState("");
  const [revokeError, setRevokeError] = useState<string | null>(null);

  // Retrieve records
  const records = rollIdentityOrNodeId
    ? FabricCommercialReleaseService.getReleaseHistoryForRoll(rollIdentityOrNodeId)
    : FabricCommercialReleaseService.getAllReleases();

  // Reverse so latest is first
  const sortedRecords = [...records].reverse();

  const handleRevokeSubmit = () => {
    if (!selectedForRevoke) return;
    if (!revocationReason.trim()) {
      setRevokeError("A revocation reason is required to revoke a commercial release simulation.");
      return;
    }

    const res = FabricCommercialReleaseService.revokeCommercialReleaseSimulation(
      selectedForRevoke.id,
      revocationReason.trim()
    );

    if (!res.success) {
      setRevokeError(res.error || "Failed to revoke simulation.");
      return;
    }

    setSelectedForRevoke(null);
    setRevocationReason("");
    setRevokeError(null);
    onRefresh?.();
  };

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-slate-300">Commercial Release History & Audit Trail</span>
          <Badge variant="outline" className="border-slate-700 text-slate-400 text-[10px]">
            {records.length} {records.length === 1 ? "Record" : "Records"}
          </Badge>
        </div>
        <span className="text-[10px] text-slate-500">Frontend Simulation Only · No Inventory Reversals</span>
      </div>

      {sortedRecords.length === 0 ? (
        <Card className="bg-slate-900/60 border-slate-800 text-center py-8">
          <CardContent className="space-y-2">
            <Clock className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">No commercial release simulations recorded yet.</p>
            <p className="text-[10px] text-slate-500">
              Active rolls evaluated as Ready for Review can be simulated from the Commercial Release dialog.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedRecords.map((rel, index) => {
            const isLatest = index === 0;
            const statusBadge = STATUS_BADGES[rel.status] || STATUS_BADGES.DRAFT;
            const decisionBadge = DECISION_BADGES[rel.decision];

            return (
              <Card
                key={rel.id}
                className={`bg-slate-900/80 border ${
                  isLatest
                    ? rel.status === "RELEASED_SIMULATION"
                      ? "border-emerald-500/40 shadow-sm shadow-emerald-500/10"
                      : rel.status === "REVIEW_REQUIRED"
                      ? "border-rose-500/40 shadow-sm shadow-rose-500/10"
                      : "border-slate-700"
                    : "border-slate-800/80 opacity-85"
                }`}
              >
                <CardContent className="p-3.5 space-y-3">
                  {/* Top Bar: IDs, Status, Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white tracking-wider">
                        {rel.rollIdentity}
                      </span>
                      {rel.generation === 0 && (
                        <Badge variant="outline" className="text-[9px] border-cyan-500/40 text-cyan-300 py-0">
                          ROOT
                        </Badge>
                      )}
                      <span className="text-[11px] text-slate-400 font-mono">
                        ({rel.rollQtyMetre.toFixed(3)} MTR)
                      </span>
                      <Badge variant="outline" className={`text-[10px] ${decisionBadge.class}`}>
                        {decisionBadge.label}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] ${statusBadge.class}`}>
                        {statusBadge.label}
                      </Badge>
                      {isLatest && (
                        <Badge className="bg-indigo-600/30 text-indigo-300 border-indigo-500/40 text-[9px] py-0">
                          CURRENT SNAPSHOT
                        </Badge>
                      )}
                    </div>

                    <div className="text-[10px] text-slate-400 flex items-center gap-2 font-mono">
                      <span>Ref: {rel.id}</span>
                      <span>·</span>
                      <span>{new Date(rel.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Candidate Status & Invariant Assertions */}
                  {rel.finishedFabricCandidateStatus === "CANDIDATE" && rel.candidate && (
                    <div className="p-2.5 rounded bg-purple-950/20 border border-purple-500/30 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-purple-200">
                              FINISHED FABRIC CANDIDATE (DERIVED)
                            </span>
                            <Badge variant="outline" className="border-purple-400 text-purple-300 text-[9px] py-0 font-mono">
                              {rel.candidate.rollIdentity}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-purple-300/80 block mt-0.5">
                            Qty: {rel.candidate.qtyMetre.toFixed(3)} MTR (Inherited) · Grade: {rel.candidate.grade} · Disposition: {rel.candidate.disposition}
                          </span>
                        </div>
                      </div>
                      <div className="text-[10px] text-right space-y-0.5 font-mono">
                        <span className="text-emerald-400 block font-semibold">CANDIDATE ONLY — NOT INVENTORY</span>
                        <span className="text-slate-400 block">Finished Stock Posted: NO</span>
                      </div>
                    </div>
                  )}

                  {/* Context Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-950/60 p-2.5 rounded border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-medium">Quality Inspection</span>
                      <span className="font-mono text-slate-200 text-[11px] truncate block" title={rel.qualityInspectionId}>
                        {rel.qualityInspectionId}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Grade {rel.grade} · {rel.disposition}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-medium">Route Preview</span>
                      <span className="text-slate-200 text-[11px] block font-mono">
                        {rel.isNoFurtherProcess
                          ? "NO FURTHER PROCESS"
                          : rel.routeCompletePreview
                          ? "ROUTE COMPLETE"
                          : "INCOMPLETE"}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                        Plan: {rel.routePlanId || "N/A"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-medium">Readiness at Release</span>
                      <Badge variant="outline" className="text-[9px] border-slate-700 text-slate-300 mt-0.5">
                        {rel.releaseReadiness}
                      </Badge>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {rel.inspectedQtyMetre.toFixed(1)}m Inspected
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-medium">Dispatch Status</span>
                      <span className="text-amber-400/90 text-[11px] font-semibold block font-mono">
                        NOT EVALUATED
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        No Auto-Dispatch
                      </span>
                    </div>
                  </div>

                  {/* Reasons & Remarks */}
                  {rel.releaseReason && (
                    <div className="text-xs bg-emerald-950/20 border border-emerald-500/20 rounded p-2 text-emerald-200">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 block">Release Reason / Remark:</span>
                      <p className="mt-0.5 text-slate-200">{rel.releaseReason}</p>
                    </div>
                  )}

                  {rel.holdReason && (
                    <div className="text-xs bg-amber-950/20 border border-amber-500/20 rounded p-2 text-amber-200">
                      <span className="text-[10px] uppercase font-bold text-amber-400 block">Commercial Hold Reason:</span>
                      <p className="mt-0.5 text-slate-200">{rel.holdReason}</p>
                    </div>
                  )}

                  {rel.staleReason && (
                    <div className="text-xs bg-rose-950/30 border border-rose-500/40 rounded p-2 text-rose-200 flex items-start gap-2">
                      <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] uppercase font-bold text-rose-400 block">Staleness / Review Reason:</span>
                        <p className="mt-0.5 text-slate-200">{rel.staleReason}</p>
                      </div>
                    </div>
                  )}

                  {rel.revocationReason && (
                    <div className="text-xs bg-slate-950 border border-slate-800 rounded p-2 text-slate-400">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Revocation Reason:</span>
                      <p className="mt-0.5 text-slate-300">{rel.revocationReason}</p>
                      <span className="text-[9px] text-slate-400 block mt-1">
                        Zero inventory reversals performed because inventory was never posted.
                      </span>
                    </div>
                  )}

                  {/* Policy and Authority Note */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 border-t border-slate-800/80 pt-2 font-sans">
                    <span className="italic">{rel.authorizationPolicyNote}</span>
                    <span className="font-mono">{rel.simulationModeNote}</span>
                  </div>

                  {/* Actions for Latest Record */}
                  {isLatest && rel.status === "RELEASED_SIMULATION" && (
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
                      {onReviseRequested && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onReviseRequested(rel)}
                          className="h-7 text-xs border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Revise Release
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedForRevoke(rel);
                          setRevocationReason("");
                          setRevokeError(null);
                        }}
                        className="h-7 text-xs border-rose-500/40 text-rose-300 hover:bg-rose-950/40"
                      >
                        <Ban className="w-3 h-3 mr-1" />
                        Revoke Simulation
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Revocation Confirmation Dialog */}
      {selectedForRevoke && (
        <Dialog open={!!selectedForRevoke} onOpenChange={(open) => !open && setSelectedForRevoke(null)}>
          <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-white font-sans">
            <DialogHeader className="border-b border-slate-800 pb-3">
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-400">
                <Ban className="w-5 h-5" />
                <span>Revoke Commercial Release Simulation</span>
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Roll: {selectedForRevoke.rollIdentity} · Release Ref: {selectedForRevoke.id}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="p-2.5 rounded bg-rose-950/30 border border-rose-500/30 text-rose-200 space-y-1">
                <span className="font-semibold block">Revocation Safety Assurance:</span>
                <p className="text-[11px] text-slate-300">
                  This revocation marks the commercial release simulation as REVOKED_SIMULATION.
                  No physical stock reversal or inventory transaction is performed because Finished Stock was never posted.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block text-[11px]">
                  Revocation Reason <span className="text-rose-400">*</span>
                </label>
                <Textarea
                  placeholder="Enter reason for revoking this commercial release simulation..."
                  value={revocationReason}
                  onChange={(e) => setRevocationReason(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-xs min-h-[80px]"
                />
              </div>

              {revokeError && (
                <div className="p-2 rounded bg-rose-900/40 border border-rose-500/40 text-rose-300 text-xs">
                  {revokeError}
                </div>
              )}
            </div>

            <DialogFooter className="border-t border-slate-800 pt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedForRevoke(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRevokeSubmit}
                disabled={!revocationReason.trim()}
                className="text-xs"
              >
                Confirm Revocation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

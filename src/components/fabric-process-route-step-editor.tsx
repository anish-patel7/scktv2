import React, { useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  Trash2,
  Building2,
  Cpu,
  AlertTriangle,
  Info,
  CheckCircle2,
  Clock,
  ShieldAlert,
  MapPin,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FabricProcessRoutingService,
  validateWholeRollRouting,
  type CreateRouteStepInput,
  type FabricProcessExecutionMode,
  type FabricProcessRouteStepStatus,
  type ProcessMasterRecord,
  type RollSplitRequiredResult,
} from "@/services/fabric-process-routing.service";
import type { PartyRecord, SubPartyRecord } from "@/lib/party-store";

interface FabricProcessRouteStepEditorProps {
  step: CreateRouteStepInput;
  index: number;
  totalSteps: number;
  rollQtyMetre: number;
  derivedStatus?: FabricProcessRouteStepStatus | undefined;
  reviewReason?: string | undefined;
  processes: ProcessMasterRecord[];
  eligibleParties: PartyRecord[];
  onChange: (updated: CreateRouteStepInput) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete: () => void;
}

const STEP_STATUS_BADGES: Record<FabricProcessRouteStepStatus, { label: string; class: string; icon: any }> = {
  READY: { label: "READY", class: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10", icon: CheckCircle2 },
  WAITING_PREVIOUS: { label: "WAITING PREVIOUS", class: "border-slate-600 text-slate-300 bg-slate-800", icon: Clock },
  BLOCKED: { label: "BLOCKED", class: "border-rose-500/40 text-rose-300 bg-rose-500/10", icon: ShieldAlert },
  REVIEW_REQUIRED: { label: "REVIEW REQUIRED", class: "border-amber-500/40 text-amber-300 bg-amber-500/10", icon: AlertTriangle },
  PLANNED: { label: "PLANNED", class: "border-blue-500/40 text-blue-300 bg-blue-500/10", icon: Info },
};

export function FabricProcessRouteStepEditor({
  step,
  index,
  totalSteps,
  rollQtyMetre,
  derivedStatus = index === 0 ? "READY" : "WAITING_PREVIOUS",
  reviewReason,
  processes,
  eligibleParties,
  onChange,
  onMoveUp,
  onMoveDown,
  onDelete,
}: FabricProcessRouteStepEditorProps) {
  const [allowManualQtyEdit, setAllowManualQtyEdit] = useState(false);
  const [attemptedQty, setAttemptedQty] = useState(String(step.plannedQtyMetre));

  const sequence = index + 1;
  const statusMeta = STEP_STATUS_BADGES[derivedStatus] || STEP_STATUS_BADGES.PLANNED;
  const StatusIcon = statusMeta.icon;

  const selectedProcess = processes.find((p) => p.id === step.processId);
  const selectedParty = eligibleParties.find((p) => p.id === step.jobPartyId);
  const subParties = step.jobPartyId
    ? FabricProcessRoutingService.getEligibleSubPartyLocations(step.jobPartyId)
    : [];

  // Whole roll validation check
  const wholeRollCheck = validateWholeRollRouting(rollQtyMetre, step.plannedQtyMetre);
  const isSplitRequired = !wholeRollCheck.valid;
  const splitResult: RollSplitRequiredResult | undefined = wholeRollCheck.splitResult;

  const handleProcessChange = (procId: string) => {
    onChange({
      ...step,
      processId: procId,
    });
  };

  const handleModeChange = (mode: FabricProcessExecutionMode) => {
    onChange({
      ...step,
      executionMode: mode,
      // Clear job party if switched to internal
      jobPartyId: mode === "INTERNAL" ? undefined : step.jobPartyId,
      subPartyId: mode === "INTERNAL" ? undefined : step.subPartyId,
    });
  };

  const handlePartyChange = (partyId: string) => {
    onChange({
      ...step,
      jobPartyId: partyId,
      subPartyId: undefined, // reset subParty on party change
    });
  };

  const handleSubPartyChange = (subId: string) => {
    onChange({
      ...step,
      subPartyId: subId === "none" ? undefined : subId,
    });
  };

  const handleQtyChange = (valStr: string) => {
    setAttemptedQty(valStr);
    const parsed = parseFloat(valStr) || 0;
    onChange({
      ...step,
      plannedQtyMetre: parsed,
    });
  };

  return (
    <div
      className={`p-3.5 rounded-xl border transition-all ${
        isSplitRequired
          ? "border-rose-500/60 bg-rose-950/20"
          : derivedStatus === "READY"
          ? "border-emerald-500/30 bg-slate-900/90 shadow-sm"
          : derivedStatus === "REVIEW_REQUIRED"
          ? "border-amber-500/40 bg-amber-950/15"
          : derivedStatus === "BLOCKED"
          ? "border-rose-500/40 bg-rose-950/15"
          : "border-slate-800 bg-slate-900/70"
      }`}
    >
      {/* Step Header */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Badge className="bg-indigo-600 hover:bg-indigo-600 text-white font-mono font-bold text-xs px-2 py-0.5">
            STEP {sequence}
          </Badge>

          {selectedProcess ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <span className="text-indigo-300 font-mono">[{selectedProcess.code}]</span>
              <span>{selectedProcess.name}</span>
            </div>
          ) : (
            <span className="text-xs text-slate-400 italic">Select Process...</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Status Badge */}
          <Badge variant="outline" className={`text-[10px] font-mono flex items-center gap-1 ${statusMeta.class}`}>
            <StatusIcon className="w-3 h-3" />
            {statusMeta.label}
          </Badge>

          {/* Reorder and Delete Controls */}
          <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={index === 0}
              onClick={onMoveUp}
              className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
              title="Move Step Up"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={index === totalSteps - 1}
              onClick={onMoveDown}
              className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
              title="Move Step Down"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-7 w-7 p-0 text-rose-400 hover:text-rose-200 hover:bg-rose-950/40"
              title="Remove Step"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Review reason if any */}
      {reviewReason && (
        <div className="mb-3 p-2 rounded bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{reviewReason}</span>
        </div>
      )}

      {/* Fields Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Canonical Process Selector */}
        <div className="space-y-1">
          <Label className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
            <span>Process Master</span>
            <span className="text-rose-400">*</span>
          </Label>
          <Select value={step.processId} onValueChange={handleProcessChange}>
            <SelectTrigger className="h-8 text-xs bg-slate-950 border-slate-700 text-slate-200">
              <SelectValue placeholder="Choose Process" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-xs text-slate-200">
              {processes.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-indigo-400 font-bold">{p.code}</span>
                    <span>{p.name}</span>
                    {!p.active && (
                      <span className="text-[10px] text-rose-400 font-mono">(Inactive)</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Execution Mode */}
        <div className="space-y-1">
          <Label className="text-[11px] text-slate-400 font-medium">Execution Mode</Label>
          <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-md border border-slate-800">
            <button
              type="button"
              onClick={() => handleModeChange("INTERNAL")}
              className={`py-1 text-[11px] font-medium rounded transition-colors flex items-center justify-center gap-1 ${
                step.executionMode === "INTERNAL"
                  ? "bg-indigo-600 text-white shadow-sm font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Cpu className="w-3 h-3" />
              <span>Internal</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("EXTERNAL_JOBWORK")}
              className={`py-1 text-[11px] font-medium rounded transition-colors flex items-center justify-center gap-1 ${
                step.executionMode === "EXTERNAL_JOBWORK"
                  ? "bg-indigo-600 text-white shadow-sm font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Building2 className="w-3 h-3" />
              <span>Job Work</span>
            </button>
          </div>
        </div>

        {/* Planned Quantity (Whole Roll Enforced) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
              <span>Planned Qty</span>
              <Lock className="w-3 h-3 text-slate-500" />
            </Label>
            <button
              type="button"
              onClick={() => setAllowManualQtyEdit((prev) => !prev)}
              className="text-[10px] text-slate-500 hover:text-indigo-400 underline"
            >
              {allowManualQtyEdit ? "Lock Whole Roll" : "Simulate Partial"}
            </button>
          </div>

          {allowManualQtyEdit ? (
            <Input
              type="number"
              value={attemptedQty}
              onChange={(e) => handleQtyChange(e.target.value)}
              className="h-8 text-xs bg-slate-950 border-slate-700 text-white font-mono"
            />
          ) : (
            <div className="h-8 px-2.5 rounded border border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs font-mono">
              <span className="text-white font-bold">{rollQtyMetre.toFixed(3)} MTR</span>
              <Badge variant="outline" className="border-indigo-500/30 text-indigo-300 text-[10px] py-0 px-1">
                Whole Roll
              </Badge>
            </div>
          )}
        </div>

        {/* Instruction */}
        <div className="space-y-1">
          <Label className="text-[11px] text-slate-400 font-medium">Processing Instruction</Label>
          <Input
            value={step.instruction || ""}
            onChange={(e) => onChange({ ...step, instruction: e.target.value })}
            placeholder="e.g. Soft wash calendaring"
            className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* External Job Work Row: Processor & Processing Unit */}
      {step.executionMode === "EXTERNAL_JOBWORK" && (
        <div className="mt-3 pt-3 border-t border-slate-800/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
          {/* Canonical Job Party */}
          <div className="space-y-1">
            <Label className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
              <Building2 className="w-3 h-3 text-indigo-400" />
              <span>External Job Work Party</span>
              <span className="text-rose-400">*</span>
            </Label>
            <Select value={step.jobPartyId || ""} onValueChange={handlePartyChange}>
              <SelectTrigger
                className={`h-8 text-xs bg-slate-950 border text-slate-200 ${
                  !step.jobPartyId
                    ? "border-amber-500/50"
                    : selectedParty?.status !== "Active"
                    ? "border-rose-500/50"
                    : "border-slate-700"
                }`}
              >
                <SelectValue placeholder="Select Eligible Job Party" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-xs text-slate-200">
                {eligibleParties.length === 0 ? (
                  <div className="p-2 text-center text-slate-500 text-xs">
                    No eligible active Job Parties found in Party Master.
                  </div>
                ) : (
                  eligibleParties.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-indigo-400 font-bold">{p.partyCode}</span>
                        <span>{p.partyName}</span>
                        {p.city && <span className="text-slate-500 text-[10px]">({p.city})</span>}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {selectedParty && (
              <p className="text-[10px] text-slate-400">
                Type: {selectedParty.partyType} · City: {selectedParty.city} · Status:{" "}
                <span className={selectedParty.status === "Active" ? "text-emerald-400" : "text-rose-400"}>
                  {selectedParty.status}
                </span>
              </p>
            )}
          </div>

          {/* Canonical Sub Party / Location Unit */}
          <div className="space-y-1">
            <Label className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
              <MapPin className="w-3 h-3 text-indigo-400" />
              <span>Processing Unit / Location (Optional)</span>
            </Label>
            <Select
              value={step.subPartyId || "none"}
              onValueChange={handleSubPartyChange}
              disabled={!step.jobPartyId || subParties.length === 0}
            >
              <SelectTrigger className="h-8 text-xs bg-slate-950 border-slate-700 text-slate-200">
                <SelectValue placeholder="Select Processing Unit" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-xs text-slate-200">
                <SelectItem value="none" className="text-xs text-slate-400">
                  Default / Main Location
                </SelectItem>
                {subParties.map((sp) => (
                  <SelectItem key={sp.id} value={sp.id} className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-indigo-400">{sp.subPartyCode}</span>
                      <span>{sp.subPartyName}</span>
                      <span className="text-[10px] text-slate-500">[{sp.locationType}]</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-slate-500">
              {subParties.length > 0
                ? `${subParties.length} eligible unit(s) found`
                : "No specialized processing sub-units configured"}
            </p>
          </div>
        </div>
      )}

      {/* Whole-Roll Split Error Warning */}
      {isSplitRequired && splitResult && (
        <div className="mt-3 p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-rose-200 uppercase tracking-wide text-[11px]">
              PARTIAL PROCESSING REQUIRES ROLL SPLIT
            </div>
            <p className="text-[11px] text-rose-300/90">{splitResult.message}</p>
            <div className="flex items-center gap-3 font-mono text-[10px] text-rose-400 pt-0.5">
              <span>Roll: {splitResult.rollQty}m</span>
              <span>Attempted: {splitResult.attemptedProcessQty}m</span>
              <span>Difference: {splitResult.difference.toFixed(3)}m</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

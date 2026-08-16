import { useEffect, useState } from "react";
import {
  getLocalParties,
  getSubPartiesByPartyId,
  type PartyRecord,
  type SubPartyRecord,
  type PartyType,
} from "@/lib/party-store";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin } from "lucide-react";

export interface PartySubPartySelectProps {
  partyType?: PartyType | undefined;
  selectedPartyId?: string | undefined;
  selectedSubPartyId?: string | undefined;
  onPartyChange: (partyId: string, partyRecord?: PartyRecord) => void;
  onSubPartyChange: (subPartyId: string, subPartyRecord?: SubPartyRecord) => void;
  disabled?: boolean | undefined;
  required?: boolean | undefined;
  partyLabel?: string | undefined;
  subPartyLabel?: string | undefined;
  className?: string | undefined;
}

export function PartySubPartySelect({
  partyType,
  selectedPartyId = "",
  selectedSubPartyId = "",
  onPartyChange,
  onSubPartyChange,
  disabled = false,
  required = false,
  partyLabel = "Select Party",
  subPartyLabel = "Select Sub Party",
  className = "grid grid-cols-2 gap-3",
}: PartySubPartySelectProps) {
  const [parties, setParties] = useState<PartyRecord[]>([]);
  const [subParties, setSubParties] = useState<SubPartyRecord[]>([]);

  // Load parties filtered by category & status
  useEffect(() => {
    const all = getLocalParties().filter((p) => p.status === "Active");
    if (partyType) {
      setParties(all.filter((p) => p.partyType === partyType));
    } else {
      setParties(all);
    }
  }, [partyType]);

  // Load sub parties whenever selectedPartyId changes
  useEffect(() => {
    if (!selectedPartyId) {
      setSubParties([]);
      if (selectedSubPartyId) {
        onSubPartyChange("", undefined);
      }
      return;
    }

    const activeSubs = getSubPartiesByPartyId(selectedPartyId, true);
    setSubParties(activeSubs);

    // If current selectedSubPartyId doesn't belong to this party, update or auto-select default
    const existing = activeSubs.find((sp) => sp.id === selectedSubPartyId);
    if (!existing) {
      const defaultSub = activeSubs.find((sp) => sp.isDefault) || activeSubs[0];
      if (defaultSub) {
        onSubPartyChange(defaultSub.id, defaultSub);
      } else {
        onSubPartyChange("", undefined);
      }
    }
  }, [selectedPartyId]);

  const handlePartySelect = (partyId: string) => {
    const p = parties.find((item) => item.id === partyId);
    onPartyChange(partyId, p);

    // Load sub parties immediately and select default
    const activeSubs = getSubPartiesByPartyId(partyId, true);
    setSubParties(activeSubs);
    const defaultSub = activeSubs.find((sp) => sp.isDefault) || activeSubs[0];
    if (defaultSub) {
      onSubPartyChange(defaultSub.id, defaultSub);
    } else {
      onSubPartyChange("", undefined);
    }
  };

  const handleSubPartySelect = (subPartyId: string) => {
    const sp = subParties.find((item) => item.id === subPartyId);
    onSubPartyChange(subPartyId, sp);
  };

  return (
    <div className={className}>
      {/* Main Party Selection */}
      <div className="space-y-1">
        <Label className="text-xs font-medium flex items-center gap-1">
          <Building2 className="size-3 text-primary" />
          {partyLabel} {required && <span className="text-destructive">*</span>}
        </Label>
        <Select value={selectedPartyId} onValueChange={handlePartySelect} disabled={disabled}>
          <SelectTrigger className="h-8 text-xs font-semibold">
            <SelectValue placeholder={`Select ${partyType || "Party"}...`} />
          </SelectTrigger>
          <SelectContent>
            {parties.map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-xs">
                <div className="flex items-center justify-between gap-2 w-full">
                  <span>
                    <strong className="font-mono text-primary font-bold">{p.partyCode}</strong> — {p.partyName}
                  </span>
                  <span className="text-[0.625rem] text-muted-foreground">({p.city})</span>
                </div>
              </SelectItem>
            ))}
            {!parties.length && (
              <SelectItem value="none" disabled className="text-xs text-muted-foreground">
                No active parties found
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Sub Party Selection */}
      <div className="space-y-1">
        <Label className="text-xs font-medium flex items-center gap-1">
          <MapPin className="size-3 text-primary" />
          {subPartyLabel} {required && <span className="text-destructive">*</span>}
        </Label>
        <Select
          value={selectedSubPartyId}
          onValueChange={handleSubPartySelect}
          disabled={disabled || !selectedPartyId || !subParties.length}
        >
          <SelectTrigger className="h-8 text-xs font-medium">
            <SelectValue
              placeholder={
                !selectedPartyId
                  ? "Select Party First"
                  : !subParties.length
                  ? "No Sub Parties"
                  : "Select Sub Party..."
              }
            />
          </SelectTrigger>
          <SelectContent>
            {subParties.map((sp) => (
              <SelectItem key={sp.id} value={sp.id} className="text-xs">
                <div className="flex items-center justify-between gap-2 w-full">
                  <span className="flex items-center gap-1.5">
                    <strong className="font-mono font-bold text-primary">{sp.subPartyCode}</strong>
                    <span>{sp.subPartyName}</span>
                    {sp.isDefault && (
                      <Badge variant="outline" className="text-[0.5625rem] h-4 py-0 bg-primary/10 text-primary border-primary/30">
                        Default
                      </Badge>
                    )}
                  </span>
                  <span className="text-[0.625rem] text-muted-foreground">
                    {sp.locationType} ({sp.city})
                  </span>
                </div>
              </SelectItem>
            ))}
            {!subParties.length && selectedPartyId && (
              <SelectItem value="none" disabled className="text-xs text-muted-foreground">
                No active sub parties available
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

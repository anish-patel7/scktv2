import React, { useState } from "react";
import {
  GitCommit,
  GitBranch,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  Info,
  Scale,
  Sparkles,
  ArrowRight,
  Route,
  Activity,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FabricRollGenealogyService,
  type FabricRollGenealogyNode,
  type GenealogyTreeNode,
  type RollIdentityStatus,
} from "@/services/fabric-roll-genealogy.service";

interface FabricRollGenealogyTreeProps {
  rootNodeId: string;
  onSelectNode?: (node: FabricRollGenealogyNode) => void;
  selectedNodeId?: string | undefined;
}

const STATUS_BADGES: Record<RollIdentityStatus, { label: string; class: string }> = {
  ACTIVE: {
    label: "ACTIVE PHYSICAL ROLL",
    class: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
  },
  SUPERSEDED_BY_SPLIT: {
    label: "SUPERSEDED BY SPLIT",
    class: "border-slate-700 text-slate-400 bg-slate-900/80",
  },
  REVIEW_REQUIRED: {
    label: "REVIEW REQUIRED",
    class: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  },
};

export function FabricRollGenealogyTree({
  rootNodeId,
  onSelectNode,
  selectedNodeId,
}: FabricRollGenealogyTreeProps) {
  const [activeInspectNodeId, setActiveInspectNodeId] = useState<string>(
    selectedNodeId || rootNodeId
  );

  const root = FabricRollGenealogyService.getRollNode(rootNodeId);
  const tree = FabricRollGenealogyService.buildGenealogyTree(rootNodeId);
  const activeLeaves = FabricRollGenealogyService.getActiveLeafRolls(rootNodeId);
  const leafTotal = FabricRollGenealogyService.calculateActiveLeafQuantity(rootNodeId);

  const inspectedNode = FabricRollGenealogyService.getRollNode(activeInspectNodeId) || root;
  const parentOfInspected = inspectedNode?.parentNodeId
    ? FabricRollGenealogyService.getRollNode(inspectedNode.parentNodeId)
    : undefined;
  const siblingsOfInspected = inspectedNode
    ? FabricRollGenealogyService.getSiblings(inspectedNode.id)
    : [];
  const childrenOfInspected = inspectedNode
    ? FabricRollGenealogyService.getChildren(inspectedNode.id)
    : [];

  if (!root || !tree) {
    return (
      <div className="py-8 text-center text-slate-500 text-xs font-sans">
        Genealogy tree not found for node ID: {rootNodeId}
      </div>
    );
  }

  const isReconciled = Math.abs(root.quantityMetre - leafTotal) <= 0.001;

  // Recursive Tree Node Renderer
  const renderTreeNode = (treeNode: GenealogyTreeNode, depth: number = 0) => {
    const node = treeNode.node;
    const isSelected = node.id === inspectedNode?.id;
    const isLeaf = treeNode.children.length === 0;
    const statusMeta = STATUS_BADGES[node.identityStatus] || STATUS_BADGES.ACTIVE;

    return (
      <div key={node.id} className="space-y-1">
        <div
          onClick={() => {
            setActiveInspectNodeId(node.id);
            onSelectNode?.(node);
          }}
          style={{ marginLeft: `${depth * 20}px` }}
          className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer font-mono text-xs ${
            isSelected
              ? "border-indigo-500 bg-indigo-950/40 shadow-sm"
              : node.identityStatus === "ACTIVE"
              ? "border-emerald-500/30 bg-slate-900/80 hover:bg-slate-900"
              : "border-slate-800 bg-slate-950/60 hover:bg-slate-900/60 opacity-80"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-sans">
              {depth === 0 ? "ROOT" : `Gen ${node.generation}`}
            </span>
            <span
              className={`font-bold ${
                node.identityStatus === "ACTIVE" ? "text-emerald-300" : "text-slate-300 line-through"
              }`}
            >
              {node.rollIdentity}
            </span>
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-slate-700 text-slate-400">
              {node.quantityMetre.toFixed(3)} MTR
            </Badge>
          </div>

          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className={`text-[9px] font-sans ${statusMeta.class}`}>
              {node.identityStatus === "ACTIVE"
                ? "ACTIVE LEAF"
                : "SUPERSEDED"}
            </Badge>
          </div>
        </div>

        {/* Children sub-trees */}
        {treeNode.children.length > 0 && (
          <div className="border-l border-slate-800/80 ml-2.5 pl-1 space-y-1">
            {treeNode.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Root & Leaf Quantity Reconciliation Card (Step 24 & 34) */}
      <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        <div className="bg-slate-900 p-2 rounded border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase font-sans block">Root Roll</span>
          <span className="text-white font-bold block truncate">{root.rollIdentity}</span>
          <span className="text-slate-400 text-[10px]">{root.quantityMetre.toFixed(3)} MTR</span>
        </div>

        <div className="bg-slate-900 p-2 rounded border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase font-sans block">Active Physical Leaves</span>
          <span className="text-emerald-400 font-bold block">{activeLeaves.length} Rolls</span>
          <span className="text-slate-400 text-[10px]">{leafTotal.toFixed(3)} MTR Total</span>
        </div>

        <div className="bg-slate-900 p-2 rounded border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase font-sans block">Lineage Depth</span>
          <span className="text-cyan-300 font-bold block">
            {Math.max(0, ...activeLeaves.map((l) => l.generation))} Generations
          </span>
          <span className="text-slate-500 text-[10px] font-sans">Multi-generation</span>
        </div>

        <div className="bg-slate-900 p-2 rounded border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase font-sans block">Leaf Reconciliation</span>
          <Badge
            variant="outline"
            className={`text-[9px] mt-1 ${
              isReconciled
                ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                : "border-rose-500/40 text-rose-300 bg-rose-500/10"
            }`}
          >
            {isReconciled ? "RECONCILED (0.000m)" : "MISMATCH"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left Column: Visual Genealogy Tree (Step 21 & 22) */}
        <div className="lg:col-span-7 p-3 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800 text-[11px]">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
              Genealogy Hierarchy Tree
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Click node to inspect lineage
            </span>
          </div>

          <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
            {renderTreeNode(tree)}
          </div>
        </div>

        {/* Right Column: Lineage Details & Safety Inspection Panel (Step 25 through 29) */}
        <div className="lg:col-span-5 p-3 rounded-xl border border-slate-800 bg-slate-900/80 space-y-2.5">
          {inspectedNode ? (
            <>
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-indigo-400" />
                  {inspectedNode.rollIdentity}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[9px] ${
                    STATUS_BADGES[inspectedNode.identityStatus]?.class || ""
                  }`}
                >
                  {STATUS_BADGES[inspectedNode.identityStatus]?.label || inspectedNode.identityStatus}
                </Badge>
              </div>

              {/* Node Metrics */}
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-sans block">Quantity</span>
                  <span className="text-white font-bold">{inspectedNode.quantityMetre.toFixed(3)} MTR</span>
                </div>

                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-sans block">Generation</span>
                  <span className="text-cyan-300 font-bold">
                    {inspectedNode.generation === 0 ? "Root (0)" : `Child Gen ${inspectedNode.generation}`}
                  </span>
                </div>
              </div>

              {/* Lineage Relationships */}
              <div className="p-2 rounded bg-slate-950/70 border border-slate-800 space-y-1 text-[11px] font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-sans">Root Roll:</span>
                  <span className="text-slate-300">{inspectedNode.rootRollIdentity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-sans">Direct Parent:</span>
                  <span className="text-slate-300">{inspectedNode.parentRollIdentity || "None (Root)"}</span>
                </div>
                {siblingsOfInspected.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-sans">Sibling Rolls:</span>
                    <span className="text-indigo-300">{siblingsOfInspected.map((s) => s.rollIdentity).join(", ")}</span>
                  </div>
                )}
                {childrenOfInspected.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-sans">Split Children:</span>
                    <span className="text-emerald-400 font-bold">{childrenOfInspected.length} child rolls</span>
                  </div>
                )}
              </div>

              {/* Quality Lineage Safety Notice (Step 26 & 27) */}
              <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Quality Lineage Context</span>
                </div>
                <p className="text-[10px] leading-relaxed text-amber-200/90">
                  Child Rolls inherit Quality lineage only (Source Grade: {inspectedNode.inheritedGrade || "UNASSIGNED"}).
                  No new inspection has been performed.
                </p>
              </div>

              {/* Process Route Lineage Safety Notice (Step 28) */}
              <div className="p-2.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                  <Route className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Process Route Lineage Context</span>
                </div>
                <p className="text-[10px] leading-relaxed text-indigo-200/90">
                  Parent route is NOT auto-copied to child rolls. Downstream process routing must be planned independently on child identities.
                </p>
              </div>

              {/* Parent History Disclaimer (Step 29) */}
              {inspectedNode.generation > 0 && (
                <div className="p-2 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-500 italic">
                  * Historical Process Issue and Receive records belong strictly to the parent roll identity and are not falsified onto child rolls.
                </div>
              )}
            </>
          ) : (
            <div className="py-8 text-center text-slate-500 text-xs">
              Select a roll node to inspect lineage details.
            </div>
          )}
        </div>
      </div>

      {/* Active Leaf Rolls Horizontal Strip (Step 24) */}
      <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/10 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Active Physical Rolls Available for Operations ({activeLeaves.length})
          </span>
          <span className="text-[10px] font-mono text-emerald-400">
            Total Available: {leafTotal.toFixed(3)} MTR
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 font-mono text-xs">
          {activeLeaves.map((leaf) => (
            <div
              key={leaf.id}
              onClick={() => {
                setActiveInspectNodeId(leaf.id);
                onSelectNode?.(leaf);
              }}
              className="p-2 rounded-lg bg-slate-900 border border-emerald-500/40 hover:border-emerald-400 cursor-pointer transition-all space-y-0.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-white font-bold truncate">{leaf.rollIdentity}</span>
                <span className="text-emerald-400 font-bold">{leaf.quantityMetre.toFixed(3)}m</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-sans">
                <span>Gen {leaf.generation}</span>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[8px] px-1 py-0">
                  ACTIVE
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

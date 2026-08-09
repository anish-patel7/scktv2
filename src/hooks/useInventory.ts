import { useCallback, useEffect, useState } from "react";
import { getInventory, saveInventory, type InventoryData } from "@/lib/inventory-store";

const EMPTY: InventoryData = { yarn: [], beams: [], fabricRolls: [], movements: [] };

export function useInventory() {
  const [data, setData] = useState<InventoryData>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setData(getInventory());
    setReady(true);
  }, []);

  const update = useCallback((fn: (prev: InventoryData) => InventoryData) => {
    setData((prev) => {
      const next = fn(prev);
      saveInventory(next);
      return next;
    });
  }, []);

  return { data, ready, update };
}

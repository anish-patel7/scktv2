import { useCallback, useEffect, useState } from "react";
import { getProduction, saveProduction, type ProductionData } from "@/lib/production-store";

const EMPTY: ProductionData = { orders: [], looms: [], jobCards: [], daily: [] };

export function useProduction() {
  const [data, setData] = useState<ProductionData>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setData(getProduction());
    setReady(true);
  }, []);

  const update = useCallback((fn: (prev: ProductionData) => ProductionData) => {
    setData((prev) => {
      const next = fn(prev);
      saveProduction(next);
      return next;
    });
  }, []);

  return { data, ready, update };
}

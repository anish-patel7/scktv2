import { useCallback, useEffect, useState } from "react";
import { getSales, saveSales, type SalesData } from "@/lib/sales-store";

const EMPTY: SalesData = {
  customers: [],
  quotations: [],
  orders: [],
  dispatches: [],
  invoices: [],
  receipts: [],
};

export function useSales() {
  const [data, setData] = useState<SalesData>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setData(getSales());
    setReady(true);
  }, []);

  const update = useCallback((fn: (prev: SalesData) => SalesData) => {
    setData((prev) => {
      const next = fn(prev);
      saveSales(next);
      return next;
    });
  }, []);

  return { data, ready, update };
}

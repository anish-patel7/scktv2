import { useCallback, useEffect, useState } from "react";
import { getAnalytics, saveAnalytics, type AnalyticsData } from "@/lib/analytics-store";

const EMPTY: AnalyticsData = {
  looms: [],
  downtimeLogs: [],
  aiSuggestions: [],
};

export function useAnalytics() {
  const [data, setData] = useState<AnalyticsData>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setData(getAnalytics());
    setReady(true);
  }, []);

  const update = useCallback((fn: (prev: AnalyticsData) => AnalyticsData) => {
    setData((prev) => {
      const next = fn(prev);
      saveAnalytics(next);
      return next;
    });
  }, []);

  return { data, ready, update };
}

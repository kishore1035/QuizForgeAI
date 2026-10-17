"use client";

import { useState, useEffect, useCallback } from "react";
import { ApiClient } from "@/lib/api";
import { HealthResponse } from "@/types/api";

export function useBackendHealth() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await ApiClient.getHealth();
      setData(result);
      setLastChecked(new Date());
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unable to connect to backend server";
      setError(errorMessage);
      setData(null);
      setLastChecked(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return {
    health: data,
    isLoading: loading,
    error,
    lastChecked,
    refetch: checkHealth,
    isOnline: !!data && data.status === "ok",
    apiUrl: ApiClient.getBaseUrl(),
  };
}

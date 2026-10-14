import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { errorMessage } from '../services/api';
import { readJson, writeJson } from '../services/storage';

interface Options<T> {
  /** Kunci cache AsyncStorage: data terakhir ditampilkan dulu (offline-friendly), lalu diperbarui dari server. */
  cacheKey?: string;
  /** Data cadangan bila server & cache tidak tersedia (mis. konstanta bawaan app). */
  fallback?: T;
  /** Muat ulang setiap layar kembali fokus. */
  refetchOnFocus?: boolean;
  enabled?: boolean;
}

/**
 * Ambil data dari API dengan cache lokal + fallback.
 * `deps` menentukan kapan data dimuat ulang (mis. filter/kategori), seperti dependency list useEffect.
 */
export function useApiQuery<T>(fetcher: () => Promise<T>, deps: unknown[], options: Options<T> = {}) {
  const { cacheKey, fallback, refetchOnFocus = false, enabled = true } = options;
  const [data, setData] = useState<T | undefined>(fallback);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  const mounted = useRef(true);
  const loadedOnce = useRef(false);
  // deps dibandingkan per nilai lewat string agar daftar dependency hook tetap statis.
  const depsKey = JSON.stringify(deps);

  useLayoutEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async (mode: 'initial' | 'refresh' | 'silent') => {
    if (!enabled) return;
    if (mode === 'initial' && cacheKey && !loadedOnce.current) {
      const cached = await readJson<T>(`@nasjak_cache_${cacheKey}`);
      if (cached !== null && mounted.current) setData(cached);
    }
    try {
      const result = await fetcherRef.current();
      if (!mounted.current) return;
      setData(result);
      setError(null);
      loadedOnce.current = true;
      if (cacheKey) await writeJson(`@nasjak_cache_${cacheKey}`, result);
    } catch (caught) {
      if (mounted.current) setError(errorMessage(caught));
    } finally {
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [cacheKey, enabled]);

  useEffect(() => {
    loadedOnce.current = false;
    load('initial');
  }, [load, depsKey]);

  useFocusEffect(
    useCallback(() => {
      if (refetchOnFocus && loadedOnce.current) load('silent');
    }, [load, refetchOnFocus]),
  );

  return {
    data,
    setData,
    loading: enabled && loading && data === undefined,
    refreshing,
    error,
    refresh: () => {
      setRefreshing(true);
      return load('refresh');
    },
    reload: () => load('silent'),
  };
}

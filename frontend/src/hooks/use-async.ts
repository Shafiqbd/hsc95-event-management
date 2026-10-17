"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface AsyncState<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  reload: () => void;
}

/**
 * Run an async loader on mount and whenever `key` changes (encode the
 * loader's inputs in the key). Results of superseded runs are ignored.
 */
export function useAsync<T>(loader: () => Promise<T>, key = ""): AsyncState<T> {
  const [state, setState] = useState<{ data?: T; error: unknown; loading: boolean }>({ error: null, loading: true });
  const [version, setVersion] = useState(0);
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    let active = true;
    loaderRef.current().then(
      (data) => active && setState({ data, error: null, loading: false }),
      (error: unknown) => active && setState((prev) => ({ data: prev.data, error, loading: false })),
    );
    return () => {
      active = false;
    };
  }, [key, version]);

  const reload = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    setVersion((v) => v + 1);
  }, []);

  return { data: state.data, error: state.error, loading: state.loading, reload };
}

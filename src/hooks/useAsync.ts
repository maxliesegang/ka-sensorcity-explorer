import { useCallback, useEffect, useRef, useState } from "react";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** When the currently held `data` landed (epoch ms), or null while it never has. */
  loadedAt: number | null;
  /** Re-run the loader with the same deps, e.g. from a refresh or retry button. */
  reload: () => void;
}

/** How stale the held data must be before a tab regaining focus refetches it. */
const FOCUS_RELOAD_MIN_AGE_MS = 60 * 1000;

function haveDependenciesChanged(
  previous: readonly unknown[] | null,
  current: readonly unknown[],
): boolean {
  if (previous === null || previous.length !== current.length) return true;
  return current.some((value, index) => !Object.is(value, previous[index]));
}

/**
 * Run an async loader and track {data, loading, error}. The loader receives an
 * AbortSignal and is re-run whenever `deps` change; in-flight requests are
 * aborted on change/unmount to avoid setting state after teardown.
 *
 * Pass `{ enabled: false }` to defer the load (e.g. behind a user action): the
 * loader is not called and the state stays idle until `enabled` flips to true.
 *
 * Pass `{ reloadOnFocus: true }` for live readings: returning to a backgrounded
 * tab refetches, so a page left open all afternoon doesn't keep presenting the
 * morning's values as current. Data younger than FOCUS_RELOAD_MIN_AGE_MS is left
 * alone, so switching tabs back and forth doesn't hammer the service.
 */
export function useAsync<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  deps: unknown[],
  options: { enabled?: boolean; reloadOnFocus?: boolean } = {},
): AsyncState<T> {
  const enabled = options.enabled ?? true;
  const reloadOnFocus = options.reloadOnFocus ?? false;
  // Bumping this re-runs the loader without disturbing the caller's deps.
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<Omit<AsyncState<T>, "reload">>({
    data: null,
    loading: enabled,
    error: null,
    loadedAt: null,
  });

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);
  const lastReloadToken = useRef(reloadToken);
  const previousInputs = useRef<{
    enabled: boolean;
    deps: readonly unknown[];
  } | null>(null);
  const inputsChanged =
    previousInputs.current === null ||
    previousInputs.current.enabled !== enabled ||
    haveDependenciesChanged(previousInputs.current.deps, deps);
  previousInputs.current = { enabled, deps };

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, loading: false, error: null, loadedAt: null });
      return;
    }
    // A reload asks for the same data again, so what's on screen stays there
    // while it arrives. A deps change asks for *different* data — keeping the
    // previous answer would label it as the new one.
    // A dependency change wins over a simultaneous reload. The old data belongs
    // to the previous request and must not be presented as the new result.
    const isReload = lastReloadToken.current !== reloadToken && !inputsChanged;
    lastReloadToken.current = reloadToken;

    const controller = new AbortController();
    setState((s) => ({
      ...s,
      data: isReload ? s.data : null,
      loadedAt: isReload ? s.loadedAt : null,
      loading: true,
      error: null,
    }));
    loader(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setState({ data, loading: false, error: null, loadedAt: Date.now() });
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : String(err);
        setState({ data: null, loading: false, error: message, loadedAt: null });
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, reloadToken, ...deps]);

  // The staleness check reads the age through a ref rather than a dependency:
  // as a dependency it would tear down and re-register the listener after every
  // successful load, when the listener itself never changes.
  const loadedAtRef = useRef(state.loadedAt);
  loadedAtRef.current = state.loadedAt;
  useEffect(() => {
    if (!reloadOnFocus || !enabled) return;
    function onVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      const loadedAt = loadedAtRef.current;
      if (loadedAt != null && Date.now() - loadedAt < FOCUS_RELOAD_MIN_AGE_MS) return;
      reload();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [reloadOnFocus, enabled, reload]);

  return { ...state, reload };
}

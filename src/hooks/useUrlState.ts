// Deep-link state helper: the URL search params ARE the state.
//
// Wraps react-router's `useSearchParams` with the write idiom every view shares
// — copy the current params, set truthy values and delete empty ones, then
// replace (not push) so tweaking a filter doesn't spam the browser history.
// Reads stay direct on the returned `params` (guarded by the `urlParams`
// coercers); this hook only standardizes writes.

import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import { toBool, toBoolParam, toEnum } from "../utils/urlParams";

/**
 * Patch of param → value. A falsy value (`""`, `null`, `undefined`) deletes the
 * key, which keeps default-valued state out of the URL so shared links stay
 * short and only carry what differs from the defaults.
 */
export type ParamUpdates = Record<string, string | null | undefined>;

export function useUrlState() {
  const [params, setParams] = useSearchParams();

  const updateParams = useCallback(
    (updates: ParamUpdates) => {
      const next = new URLSearchParams(params);
      for (const [key, value] of Object.entries(updates)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  return [params, updateParams] as const;
}

/**
 * A single deep-linked value constrained to `allowed`, backed by `key` in the
 * URL. Reads coerce (unknown/absent → `fallback`); writes drop the value from
 * the URL when it equals `fallback`, so a shared link only carries non-default
 * choices. This is the one-liner for adding new enum-shaped deep-link state.
 */
export function useEnumParam<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): [T, (value: T) => void] {
  const [params, updateParams] = useUrlState();
  const value = toEnum(params.get(key), allowed, fallback);
  const setValue = (next: T) =>
    updateParams({ [key]: next === fallback ? null : next });
  return [value, setValue];
}

/** Deep-linked boolean backed by `key`; the value is dropped when it equals `fallback`. */
export function useBoolParam(
  key: string,
  fallback: boolean,
): [boolean, (value: boolean) => void] {
  const [params, updateParams] = useUrlState();
  const value = toBool(params.get(key), fallback);
  const setValue = (next: boolean) =>
    updateParams({ [key]: next === fallback ? null : toBoolParam(next) });
  return [value, setValue];
}

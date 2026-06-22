import { dequal } from "dequal";
import { type Draft, produce, type WritableDraft } from "immer";
import { useState } from "react";
import type { Nullable } from "@/types";

/** Immer-style mutator applied to the full draft object. */
type Recipe<T> = (draft: Draft<T>) => void;

/** Setter for a single field — accepts a value or an updater function. */
type Updater<V> = (next: Nullable<V> | ((prev: V) => V)) => void;

/**
 * @public
 */
export interface UseDraftResult<T extends Record<PropertyKey, unknown>> {
  /** Local editable copy of `source`. Mutate it via `update` or `createUpdater`. */
  draft: T | undefined;

  /** The last synced upstream value. Useful for diffing before saving. */
  source: T | undefined;

  /** `true` when `draft` deep-differs from `source`. Use to gate the save button. */
  isDirty: boolean;

  /**
   * Apply changes to `draft`.
   *
   * Accepts either an immer recipe `(state) => { state.x = 1 }` for nested
   * mutations, or a plain partial object for a shallow merge.
   */
  update: (recipe: Recipe<T> | Partial<T>) => void;

  /**
   * Restore `draft` to `source`, or to an explicit `value` when provided.
   * Also resets `lastSource` so a subsequent identical `source` is not
   * treated as a new upstream change.
   */
  reset: (value?: T) => void;

  /**
   * Build a typed setter scoped to `key`.
   *
   * The returned `Updater` accepts a value or a `(prev) => next` function.
   * When the value is `null` / `undefined`, `defaultValue` is used instead.
   */
  createUpdater: <K extends keyof T>(key: K, defaultValue?: T[K]) => Updater<T[K]>;
}

/**
 * Local editable copy of a server-owned object — tracks edits, detects dirty
 * state, and syncs with upstream changes without clobbering in-progress work.
 *
 * @remarks
 * `draft` starts as a copy of `source`. When `source` changes (deep equality
 * via `dequal`), `draft` follows — unless the user already made edits, in which
 * case their work is preserved. Call `reset()` to abandon edits and pull in the
 * latest `source`.
 *
 * The sync runs during render (no `useEffect`) to avoid a stale-render frame.
 *
 * @typeParam T - Shape of the object being edited. Must be a plain record.
 * @param source - The authoritative object (e.g. from a server response).
 *   May be `undefined` while loading.
 * @returns See {@link UseDraftResult}.
 *
 * @example
 * Basic form with dirty-state guard:
 * ```tsx
 * const { draft, createUpdater, isDirty, reset } = useDraft(serverData);
 *
 * const onNameChange = createUpdater("name");
 *
 * return (
 *   <>
 *     <input value={draft?.name ?? ""} onChange={(e) => onNameChange(e.target.value)} />
 *     {isDirty && <button onClick={() => onSave(draft!)}>Save</button>}
 *     <button onClick={() => reset()}>Discard</button>
 *   </>
 * );
 * ```
 *
 * @public
 */
export function useDraft<T extends Record<PropertyKey, unknown>>(source: T | undefined): UseDraftResult<T> {
  const [draft, setDraft] = useState<T | undefined>(source);
  const [lastSource, setLastSource] = useState(source);

  if (source && source !== lastSource && !dequal(source, lastSource)) {
    const hasEdits = lastSource && !dequal(draft, lastSource);

    if (!hasEdits) setDraft(source);

    setLastSource(source);
  }

  const update = (recipe: Recipe<T> | Partial<T>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return typeof recipe === "function" ? produce(prev, recipe) : { ...prev, ...recipe };
    });
  };

  const reset = (value?: T) => {
    const next = value ?? source;
    if (next) {
      setDraft(next);
      setLastSource(next);
    }
  };

  const createUpdater =
    <K extends keyof T>(key: K, defaultValue?: T[K]): Updater<T[K]> =>
    (next) => {
      update((state) => {
        const writableState = state as WritableDraft<T>;
        const prev = writableState[key] as T[K];
        const resolved = typeof next === "function" ? (next as (p: T[K]) => T[K])(prev) : (next ?? defaultValue);

        writableState[key] = resolved as WritableDraft<T>[K];
      });
    };

  const isDirty = !!source && !!draft && !dequal(draft, source);

  return { draft, update, createUpdater, isDirty, reset, source } as const;
}

import { useCallback, useEffect, useMemo, useState } from 'react';

type IdGetter<T> = (item: T) => string;

export interface UseSelectionResult<T> {
  selectedIds: string[];
  allSelected: boolean;
  someSelected: boolean;
  isSelected: (item: T) => boolean;
  toggleOne: (item: T, isChecked?: boolean) => void;
  toggleAll: (isChecked: boolean) => void;
  clearSelection: () => void;
  setSelectedIds: (ids: string[]) => void;
}

/**
 * Small, focused hook to manage checkbox-style selection for list UIs.
 * - Keeps selection in sync when the underlying list changes.
 * - Works with any id shape via `getId`.
 */
export const useSelection = <T extends object>(
  items: T[],
  getId: IdGetter<T> = (item) => (item as { _id?: string })._id ?? '',
): UseSelectionResult<T> => {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const resolveId = useCallback(
    (item: T): string => {
      const id = getId(item);
      return id?.toString() ?? '';
    },
    [getId],
  );

  // Drop selections that no longer exist in the list.
  useEffect(() => {
    setSelected((prev) => {
      const next = new Set<string>();
      items.forEach((item) => {
        const id = resolveId(item);
        if (id && prev.has(id)) {
          next.add(id);
        }
      });
      return next;
    });
  }, [items, resolveId]);

  const toggleOne = useCallback(
    (item: T, isChecked?: boolean) => {
      const id = resolveId(item);
      if (!id) return;

      setSelected((prev) => {
        const next = new Set(prev);
        const shouldSelect = isChecked ?? !prev.has(id);
        if (shouldSelect) {
          next.add(id);
        } else {
          next.delete(id);
        }
        return next;
      });
    },
    [resolveId],
  );

  const toggleAll = useCallback(
    (isChecked: boolean) => {
      if (!isChecked) {
        setSelected(new Set());
        return;
      }
      const next = new Set<string>();
      items.forEach((item) => {
        const id = resolveId(item);
        if (id) next.add(id);
      });
      setSelected(next);
    },
    [items, resolveId],
  );

  const isSelected = useCallback(
    (item: T) => {
      const id = resolveId(item);
      return selected.has(id);
    },
    [resolveId, selected],
  );

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const setSelectedIds = useCallback((ids: string[]) => setSelected(new Set(ids)), []);

  const selectedIds = useMemo(() => Array.from(selected), [selected]);
  const allSelected = selected.size > 0 && selected.size === items.length;
  const someSelected = selected.size > 0 && selected.size < items.length;

  return { selectedIds, allSelected, someSelected, isSelected, toggleOne, toggleAll, clearSelection, setSelectedIds };
};

import { useCallback, useEffect, useMemo, useState } from 'react';

function readList(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    if (!Array.isArray(parsed)) return [];
    return parsed.map((name) => String(name).trim()).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * A list of names (categories, programmes) kept in localStorage — the only
 * thing this app persists. Names are compared case-insensitively for dedupe but
 * stored exactly as typed, because they land verbatim in the JSON output.
 *
 * Returns [items, { add, remove }]. `add` returns an error string, or null on success.
 */
export default function useLocalStorageList(key) {
  const [items, setItems] = useState(() => readList(key));

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(items));
  }, [key, items]);

  const add = useCallback(
    (raw) => {
      const name = String(raw).trim();
      if (!name) return 'Enter a name first';
      if (items.some((item) => item.toLowerCase() === name.toLowerCase())) {
        return `"${name}" already exists`;
      }

      setItems((prev) => [...prev, name]);
      return null;
    },
    [items]
  );

  const remove = useCallback((name) => {
    setItems((prev) => prev.filter((item) => item !== name));
  }, []);

  const actions = useMemo(() => ({ add, remove }), [add, remove]);

  return [items, actions];
}

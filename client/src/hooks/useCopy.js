import { useCallback, useEffect, useState } from 'react';
import writeToClipboard from '../utils/clipboard';

// Returns [copied, copy] — `copied` flips back to false on its own after a beat.
export default function useCopy(text) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = useCallback(async () => {
    try {
      await writeToClipboard(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }, [text]);

  return [copied, copy];
}

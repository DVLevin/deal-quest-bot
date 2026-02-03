/**
 * Reusable debounce hook for any value type.
 *
 * Returns a debounced version of the input value that only updates
 * after the specified delay has elapsed without new changes.
 * Common use: search input debouncing to avoid excessive API calls.
 */

import { useState, useEffect } from 'react';

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debouncedValue;
}

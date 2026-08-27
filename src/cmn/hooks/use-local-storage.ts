import { LocalStorage } from '@vicinae/api';
import { useCallback, useEffect, useState } from 'react';

/** Vicinae LocalStorage 的 React 封装。 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);

  useEffect(() => {
    let isMounted = true;
    LocalStorage.getItem<string>(key).then(stored => {
      if (!isMounted || stored === undefined) return;
      try {
        setValue(JSON.parse(stored) as T);
      } catch {
        // Ignore values written by older versions in an incompatible format.
      }
    });
    return () => {
      isMounted = false;
    };
  }, [key]);

  const setStoredValue = useCallback(
    async (nextValue: T | ((previous: T) => T)) => {
      setValue(previous => {
        const resolved = nextValue instanceof Function ? nextValue(previous) : nextValue;
        void LocalStorage.setItem(key, JSON.stringify(resolved));
        return resolved;
      });
    },
    [key],
  );

  return { value, setValue: setStoredValue };
}

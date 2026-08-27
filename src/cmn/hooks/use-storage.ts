import { useCallback, useEffect, useState } from 'react';
import { ExpiredStorage } from '../storage';
import { useMemoizedFn } from 'ahooks';

export function useStorage<T>(
  key: string,
  initialValue?: T,
  expireInMs?: number,
): [T | undefined, (value: T | ((prev: T | undefined) => T)) => void, boolean] {
  const [value, setValue] = useState<T | undefined>(initialValue);
  const [isIniting, setIsIniting] = useState(true);

  useEffect(() => {
    let isMounted = true;

    ExpiredStorage.getItem<T>(key)
      .then(storedValue => {
        isMounted && setValue(storedValue ?? initialValue);
      })
      .finally(() => {
        isMounted && setIsIniting(false);
      });

    return () => {
      isMounted = false;
    };
  }, [key]);

  const setStoredValue = useMemoizedFn((newValue: T | ((prev: T | undefined) => T)) => {
    setValue(prev => {
      const valueToStore = newValue instanceof Function ? newValue(prev) : newValue;
      ExpiredStorage.setItem(key, valueToStore, expireInMs);
      return valueToStore;
    });
  });

  return [value, setStoredValue, isIniting];
}

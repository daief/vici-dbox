import { useMemoizedFn } from 'ahooks';
import { useStorage } from './use-storage';

export function useRecentItems<T>(key: string, getKey: (item: T) => string, maxItems = 5) {
  const [items = [], setItems, isIniting] = useStorage<T[]>(key, []);

  const addItem = useMemoizedFn((item: T) => {
    setItems(previous => {
      const currentItems = previous || [];
      return [item, ...currentItems.filter(existing => getKey(existing) !== getKey(item))].slice(0, maxItems);
    });
  });

  return { items, addItem, isIniting };
}

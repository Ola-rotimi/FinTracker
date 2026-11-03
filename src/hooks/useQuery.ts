import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { subscribe } from '@/db/events';

/**
 * Runs `fn` against the database and re-runs it whenever `key` changes or any write
 * calls `notifyChange()`. `key` should encode every input the query depends on.
 */
export function useQuery<T>(key: string, fn: (db: SQLiteDatabase) => Promise<T>) {
  const db = useSQLiteContext();
  const fnRef = useRef(fn);
  const [version, setVersion] = useState(0);
  const [data, setData] = useState<T>();

  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => subscribe(() => setVersion((v) => v + 1)), []);

  useEffect(() => {
    let cancelled = false;
    fnRef.current(db)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((e) => console.warn(`Query "${key}" failed`, e));
    return () => {
      cancelled = true;
    };
  }, [db, key, version]);

  return data;
}

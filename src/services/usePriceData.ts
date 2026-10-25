import { useEffect, useState } from 'react';

import { t } from '../i18n';
export interface AsyncState<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

/**
 * Încarcă date de la `priceProvider` cu stări de încărcare / eroare.
 * `initial` este valoarea afișată până sosesc datele.
 */
export function usePriceData<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList,
  initial: T
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: initial, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetcher()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            loading: false,
            error: err instanceof Error ? err.message : t('The data could not be loaded.'),
          }));
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

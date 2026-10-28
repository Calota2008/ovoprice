import { useCallback, useEffect, useRef, useState } from 'react';
import type { PriceAlertItem, SavedProductItem } from '../types';
import { authProvider, type AuthUser } from './authProvider';
import { COLLECTIONS_KEY, validateCollections, type Collection } from '../utils/collections';
import { validateAlerts, validateSaved } from '../utils/alerts';
import { loadJson, saveJson } from '../utils/storage';
import { deviceSignature, isEmptyLists, planMerge, type MergeLimits, type UserLists } from '../utils/mergeLists';

const GUEST_KEYS = { saved: 'ovoprice_saved_products_v1', alerts: 'ovoprice_alerts_v1', collections: COLLECTIONS_KEY } as const;
const acctKeys = (uid: string) => ({
  saved: `ovoprice_acct_${uid}_saved_v1`,
  alerts: `ovoprice_acct_${uid}_alerts_v1`,
  collections: `ovoprice_acct_${uid}_collections_v1`,
});
const askedKey = (uid: string) => `ovoprice_acct_${uid}_merge_asked_v1`;
const GUEST = 'guest';

export type SyncStatus = 'off' | 'syncing' | 'synced' | 'error';

/** What the device holds that the account does not, offered to the person once after signing in. */
export interface MergeOffer {
  add: { saved: number; alerts: number; collections: number };
  skipped: { saved: number; alerts: number; collections: number };
}

const readLists = (keys: { saved: string; alerts: string; collections: string }): UserLists => ({
  saved: loadJson<SavedProductItem[]>(keys.saved, validateSaved, []),
  alerts: loadJson<PriceAlertItem[]>(keys.alerts, validateAlerts, []),
  collections: loadJson<Collection[]>(keys.collections, validateCollections, []),
});
const clearKeys = (keys: { saved: string; alerts: string; collections: string }) => {
  try {
    localStorage.removeItem(keys.saved);
    localStorage.removeItem(keys.alerts);
    localStorage.removeItem(keys.collections);
  } catch {
    /* storage unavailable */
  }
};

/**
 * Saved products, alerts and collections.
 * - Guest: kept on this device only (the same keys as always).
 * - Signed in with an account that can sync: the account's data is shown and kept on the account.
 *   The device's own (guest) data is never overwritten: it is offered once ("Add to my account?"),
 *   stays on the device, and comes back when the person signs out. The account copy on the device is
 *   removed at sign-out.
 */
export function usePersistedLists(user: AuthUser | null, limits: MergeLimits) {
  const store = user ? authProvider.lists : undefined;
  const scope = user && store ? `acct_${user.id}` : GUEST;

  const [saved, setSaved] = useState<SavedProductItem[]>(() => readLists(GUEST_KEYS).saved);
  const [alerts, setAlerts] = useState<PriceAlertItem[]>(() => readLists(GUEST_KEYS).alerts);
  const [collections, setCollections] = useState<Collection[]>(() => readLists(GUEST_KEYS).collections);
  const [dataScope, setDataScope] = useState<string>(GUEST);
  const [status, setStatus] = useState<SyncStatus>('off');
  const [storageFailed, setStorageFailed] = useState(false);
  const [offer, setOffer] = useState<MergeOffer | null>(null);

  const latest = useRef<UserLists>({ saved, alerts, collections });
  latest.current = { saved, alerts, collections };
  const remoteReady = useRef(false);
  // JSON of what the account is known to hold (last read or last successful save); null = not read yet.
  const knownRemote = useRef<string | null>(null);
  // JSON of what the device remembered of the account when it was opened (before asking the account).
  const baseline = useRef<string>('');
  const lastSynced = useRef<string>('');
  const scopeApplied = useRef<string>(GUEST);
  const limitsRef = useRef(limits);
  limitsRef.current = limits;
  const retryTick = useRef(0);
  const [retry, setRetry] = useState(0);

  const apply = (l: UserLists, scopeName: string) => {
    setSaved(l.saved);
    setAlerts(l.alerts);
    setCollections(l.collections);
    setDataScope(scopeName);
  };
  const jsonOf = (l: UserLists) => JSON.stringify({ saved: l.saved, alerts: l.alerts, collections: l.collections });

  // Switch between guest data and account data, and read the account (again after an error).
  useEffect(() => {
    if (scopeApplied.current !== scope) {
      const previous = scopeApplied.current;
      scopeApplied.current = scope;
      remoteReady.current = false;
      knownRemote.current = null;
      lastSynced.current = '';
      setOffer(null);
      if (scope === GUEST) {
        if (previous !== GUEST) clearKeys(acctKeys(previous.slice('acct_'.length)));
        apply(readLists(GUEST_KEYS), GUEST);
        setStatus('off');
        return;
      }
      // Start from what this device remembers of the account, then ask the account.
      const cache = readLists(acctKeys(scope.slice('acct_'.length)));
      baseline.current = jsonOf(cache);
      apply(cache, scope);
    } else if (scope === GUEST) {
      return;
    }

    const uid = scope.slice('acct_'.length);
    let cancelled = false;
    setStatus('syncing');
    store!.load().then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        setStatus('error');
        return;
      }
      const remote: UserLists = res.lists ?? { saved: [], alerts: [], collections: [] };
      // Edits made on this device since the account was last known (e.g. while offline) are kept, added on top of the account.
      const local = latest.current;
      const unchanged = (knownRemote.current ?? baseline.current) === jsonOf(local);
      const base = unchanged ? remote : planMerge(remote, local, limitsRef.current).merged;
      knownRemote.current = jsonOf(remote);
      lastSynced.current = jsonOf(remote);
      remoteReady.current = true;
      apply(base, scope);
      setStatus('synced');
      // Offer what the device (guest data) holds that the account does not.
      const device = readLists(GUEST_KEYS);
      if (!isEmptyLists(device)) {
        const plan = planMerge(base, device, limitsRef.current);
        const total = (o: { saved: number; alerts: number; collections: number }) => o.saved + o.alerts + o.collections;
        let asked = '';
        try {
          asked = localStorage.getItem(askedKey(uid)) ?? '';
        } catch {
          /* ignore */
        }
        if (total(plan.added) + total(plan.skipped) > 0 && asked !== deviceSignature(device)) {
          setOffer({ add: plan.added, skipped: plan.skipped });
        }
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, retry]);

  // Keep the copy on this device (guest keys for a guest, account keys for the account).
  useEffect(() => {
    if (dataScope !== scope) return;
    const keys = scope === GUEST ? GUEST_KEYS : acctKeys(scope.slice('acct_'.length));
    setStorageFailed(!saveJson(keys.saved, saved));
  }, [saved, dataScope, scope]);
  useEffect(() => {
    if (dataScope !== scope) return;
    saveJson((scope === GUEST ? GUEST_KEYS : acctKeys(scope.slice('acct_'.length))).collections, collections);
  }, [collections, dataScope, scope]);
  useEffect(() => {
    if (dataScope !== scope) return;
    saveJson((scope === GUEST ? GUEST_KEYS : acctKeys(scope.slice('acct_'.length))).alerts, alerts);
  }, [alerts, dataScope, scope]);

  // Send changes to the account (only after it was read, so an empty device can never wipe the account).
  useEffect(() => {
    if (scope === GUEST || dataScope !== scope || !remoteReady.current) return;
    const json = jsonOf({ saved, alerts, collections });
    if (json === lastSynced.current) return;
    const timer = setTimeout(async () => {
      setStatus('syncing');
      const ok = await store!.save({ saved, alerts, collections });
      if (ok) {
        lastSynced.current = json;
        knownRemote.current = json;
        setStatus('synced');
      } else {
        setStatus('error');
      }
    }, 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved, alerts, collections, dataScope, scope]);

  // After an error, try again when the connection is back.
  useEffect(() => {
    if (status !== 'error') return;
    const again = () => {
      retryTick.current += 1;
      setRetry(retryTick.current);
    };
    window.addEventListener('online', again);
    return () => window.removeEventListener('online', again);
  }, [status]);

  const retryNow = useCallback(() => {
    retryTick.current += 1;
    setRetry(retryTick.current);
  }, []);

  const acceptOffer = useCallback(() => {
    if (!user) return;
    const plan = planMerge(latest.current, readLists(GUEST_KEYS), limitsRef.current);
    apply(plan.merged, scope);
    try {
      localStorage.setItem(askedKey(user.id), deviceSignature(readLists(GUEST_KEYS)));
    } catch {
      /* ignore */
    }
    setOffer(null);
  }, [user, scope]);

  const declineOffer = useCallback(() => {
    if (user) {
      try {
        localStorage.setItem(askedKey(user.id), deviceSignature(readLists(GUEST_KEYS)));
      } catch {
        /* ignore */
      }
    }
    setOffer(null);
  }, [user]);

  return {
    savedItems: saved,
    setSavedItems: setSaved,
    alerts,
    setAlerts,
    collections,
    setCollections,
    storageFailed,
    syncStatus: status,
    retrySync: retryNow,
    mergeOffer: offer,
    acceptMergeOffer: acceptOffer,
    declineMergeOffer: declineOffer,
    dataScope,
  };
}

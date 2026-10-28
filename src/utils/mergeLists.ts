import type { PriceAlertItem, SavedProductItem } from '../types';
import { COLLECTION_LIMITS, type Collection } from './collections';

/** Everything that is kept for a person and synced to their account. */
export interface UserLists {
  saved: SavedProductItem[];
  alerts: PriceAlertItem[];
  collections: Collection[];
}

export interface MergeLimits {
  savedProducts: number;
  alerts: number;
}

export interface MergePlan {
  merged: UserLists;
  /** What is really added from the device. */
  added: { saved: number; alerts: number; collections: number };
  /** What did not fit under the limits and stays only on the device. */
  skipped: { saved: number; alerts: number; collections: number };
}

export const savedKey = (i: SavedProductItem): string => i.productId ?? i.id;

/**
 * Adds what the device has to what the account already has. Nothing in the account is changed or removed;
 * device items that are already there (same product / same collection name) are not added twice, and the
 * limits are respected: the first items that fit are added, the rest are reported as skipped.
 */
export function planMerge(account: UserLists, device: UserLists, limits: MergeLimits): MergePlan {
  const have = new Set(account.saved.map(savedKey));
  const freshSaved = device.saved.filter((i) => !have.has(savedKey(i)));
  const savedRoom = Math.max(0, limits.savedProducts - account.saved.length);
  const addSaved = freshSaved.slice(0, savedRoom);

  const haveAlerts = new Set(account.alerts.map((a) => a.productId));
  const freshAlerts = device.alerts.filter((a) => !haveAlerts.has(a.productId));
  const alertRoom = Math.max(0, limits.alerts - account.alerts.length);
  const addAlerts = freshAlerts.slice(0, alertRoom);

  const savedAfter = [...addSaved, ...account.saved];
  const keysAfter = new Set(savedAfter.map(savedKey));
  const names = new Set(account.collections.map((c) => c.name.toLowerCase()));
  const freshCollections = device.collections.filter((c) => !names.has(c.name.toLowerCase()));
  const collRoom = Math.max(0, COLLECTION_LIMITS.maxCollections - account.collections.length);
  const addCollections = freshCollections.slice(0, collRoom).map((c) => ({
    ...c,
    // a collection only lists products that are saved in the account
    productIds: c.productIds.filter((p) => keysAfter.has(p)),
  }));
  // ids must stay unique inside the account
  const usedIds = new Set(account.collections.map((c) => c.id));
  const collections = [
    ...account.collections,
    ...addCollections.map((c) => (usedIds.has(c.id) ? { ...c, id: `${c.id}-d` } : c)),
  ];

  return {
    merged: { saved: savedAfter, alerts: [...addAlerts, ...account.alerts], collections },
    added: { saved: addSaved.length, alerts: addAlerts.length, collections: addCollections.length },
    skipped: {
      saved: freshSaved.length - addSaved.length,
      alerts: freshAlerts.length - addAlerts.length,
      collections: freshCollections.length - addCollections.length,
    },
  };
}

/** A short fingerprint of what the device has, so the same offer is not repeated after "Not now". */
export function deviceSignature(lists: UserLists): string {
  const parts = [
    ...lists.saved.map((i) => `s:${savedKey(i)}`),
    ...lists.alerts.map((a) => `a:${a.productId}`),
    ...lists.collections.map((c) => `c:${c.name.toLowerCase()}`),
  ].sort();
  return parts.join('|');
}

export const isEmptyLists = (l: UserLists): boolean => l.saved.length === 0 && l.alerts.length === 0 && l.collections.length === 0;

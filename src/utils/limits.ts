/**
 * What a person may keep without paying. One place to change the numbers.
 * Visitors get a taste (1 product, 1 alert); a free account gets room for real use.
 * A paid plan can be added later as a third entry; nothing else in the app has to know the numbers.
 */
export interface PlanLimits {
  /** Products in "Saved". */
  savedProducts: number;
  /** Price alerts (one per product). */
  alerts: number;
  /** Whether new collections (and sharing them) are allowed. */
  collections: boolean;
}

export const GUEST_LIMITS: PlanLimits = { savedProducts: 1, alerts: 1, collections: false };
export const ACCOUNT_LIMITS: PlanLimits = { savedProducts: 10, alerts: 3, collections: true };

export type LimitKind = 'saved' | 'alerts' | 'collections';

export const limitsFor = (signedIn: boolean): PlanLimits => (signedIn ? ACCOUNT_LIMITS : GUEST_LIMITS);

/** How many of the given new items still fit. Existing items above the limit are never removed. */
export const roomLeft = (current: number, limit: number): number => Math.max(0, limit - current);

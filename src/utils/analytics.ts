/**
 * Optional, local-only event hook. Nothing is stored or sent anywhere:
 * events only reach listeners registered with `onTrack` (e.g. a future analytics adapter).
 * Payloads never contain personal data, only product ids and store domains.
 */
export type TrackedEventName =
  | 'reel_viewed'
  | 'reel_shared'
  | 'product_details_opened'
  | 'compare_prices_clicked'
  | 'offer_opened'
  | 'product_saved'
  | 'product_unsaved';

export interface TrackedEvent {
  name: TrackedEventName;
  at: number;
  productId?: string;
  storeDomain?: string;
}

type Listener = (event: TrackedEvent) => void;

const listeners = new Set<Listener>();

export function onTrack(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function trackEvent(name: TrackedEventName, data: { productId?: string; storeDomain?: string } = {}): void {
  const event: TrackedEvent = { name, at: Date.now(), ...data };
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (err) {
      console.error('Analytics listener failed', err);
    }
  });
}

/**
 * Photo analyses used today on this device (for the "2 of 3 left today" counter).
 * This is only a friendly counter: the real protection against costs is the limit on the server.
 */
const KEY = 'ovoprice_photo_quota_v1';

const today = () => new Date().toISOString().slice(0, 10);

export function photosUsedToday(): number {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    return raw && raw.day === today() && Number.isFinite(raw.used) ? Math.max(0, raw.used) : 0;
  } catch {
    return 0;
  }
}

export function countPhotoUsed(): number {
  const used = photosUsedToday() + 1;
  try {
    localStorage.setItem(KEY, JSON.stringify({ day: today(), used }));
  } catch {
    /* storage unavailable: the server limit still applies */
  }
  return used;
}

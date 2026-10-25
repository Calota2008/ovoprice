/** Citire/scriere JSON în localStorage, fără excepții (modul privat, cotă plină etc.). */

export function loadJson<T>(key: string, validate: (value: unknown) => T | null, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const checked = validate(JSON.parse(raw));
    return checked ?? fallback;
  } catch {
    return fallback;
  }
}

export function saveJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`Could not save "${key}"`, err);
    return false;
  }
}

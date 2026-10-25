/** Utilitare pentru coduri de bare GTIN (EAN-8, UPC-A, EAN-13, GTIN-14). */

const VALID_LENGTHS = [8, 12, 13, 14];

/** Păstrează doar cifrele. */
export function digitsOnly(input: string): string {
  return input.replace(/\D/g, '');
}

/** Verifică lungimea și cifra de control (algoritmul GS1). */
export function isValidGtin(input: string): boolean {
  const code = digitsOnly(input);
  if (!VALID_LENGTHS.includes(code.length)) return false;
  const digits = code.split('').map(Number);
  const check = digits.pop() as number;
  const sum = digits
    .reverse()
    .reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

/**
 * Normalizează la EAN-13 când e posibil (UPC-A 12 cifre => prefix 0),
 * ca același produs să fie găsit indiferent de formatul scanat.
 */
export function normalizeGtin(input: string): string {
  const code = digitsOnly(input);
  if (code.length === 12) return `0${code}`;
  if (code.length === 14 && code.startsWith('0')) return code.slice(1);
  return code;
}

export type EanProblem = 'empty' | 'length' | 'checksum';

/** Motivul pentru care un cod introdus manual nu e valid (sau null dacă e valid). */
export function explainInvalidGtin(input: string): EanProblem | null {
  const code = digitsOnly(input);
  if (!code) return 'empty';
  if (!VALID_LENGTHS.includes(code.length)) return 'length';
  if (!isValidGtin(code)) return 'checksum';
  return null;
}

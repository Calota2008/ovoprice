import { useEffect, useState } from 'react';

/** Same breakpoint as Tailwind `lg:` (1024 px). Phones and tablets get false and keep their layout. */
const QUERY = '(min-width: 1024px)';

const matches = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches;

export function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(matches);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(QUERY);
    const onChange = () => setDesktop(mq.matches);
    onChange();
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return desktop;
}

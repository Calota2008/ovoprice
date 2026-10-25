import React from 'react';
import { FlaskConical } from 'lucide-react';
import { priceProvider } from '../services/priceProvider';

/** Etichetă mică "DEMO". Apare doar cât timp sursa de date este demonstrativă. */
export const DemoBadge: React.FC<{ className?: string; label?: string }> = ({
  className = '',
  label = 'DEMO',
}) => {
  if (!priceProvider.isDemo) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 text-[9px] font-bold tracking-wider uppercase ${className}`}
      title="Date demonstrative, nu sunt prețuri reale"
    >
      <FlaskConical className="w-2.5 h-2.5" />
      {label}
    </span>
  );
};

/** Banner global: spune clar că prețurile și ofertele nu sunt reale. */
export const DemoBanner: React.FC = () => {
  if (!priceProvider.isDemo) return null;
  return (
    <div
      role="status"
      className="mx-4 mt-2 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-900"
    >
      <FlaskConical className="w-3.5 h-3.5 mt-0.5 shrink-0" />
      <span>
        <strong>Date demonstrative.</strong> Prețurile, ofertele, istoricul și alertele de aici sunt exemple, nu oferte reale. Verifică
        mereu prețul final pe site-ul comerciantului.
      </span>
    </div>
  );
};

/** Notă de subsol pentru ecrane cu prețuri. */
export const DemoFootnote: React.FC<{ className?: string }> = ({ className = '' }) => {
  if (!priceProvider.isDemo) return null;
  return (
    <p className={`text-[10px] text-amber-800/80 text-center ${className}`}>
      Date demonstrative · nu reprezintă oferte reale
    </p>
  );
};

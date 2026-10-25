import React from 'react';
import { ExternalLink, ShieldCheck, CheckCircle2, X } from 'lucide-react';
import { StoreOffer } from '../types';

interface ExternalRedirectModalProps {
  offer: StoreOffer | null;
  onClose: () => void;
}

export const ExternalRedirectModal: React.FC<ExternalRedirectModalProps> = ({
  offer,
  onClose,
}) => {
  if (!offer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 relative animate-in slide-in-from-bottom-4 duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-md"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[11px] font-mono tracking-wider text-emerald-700 font-bold uppercase">
            Instant Merchant Handover
          </span>
        </div>

        <h3 className="text-lg font-bold text-slate-900 mb-1">
          Redirecting to {offer.storeName}
        </h3>
        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
          You will complete your purchase directly on {offer.storeDomain}. OvoPrice never adds markups or stores payment data.
        </p>

        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 mb-4 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-600">Estimated Landed Price:</span>
            <span className="font-bold text-slate-900 text-sm tnum">
              {offer.totalLandedPrice.toFixed(2).replace('.', ',')} €
            </span>
          </div>
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>Fulfillment Partner:</span>
            <span className="font-medium text-slate-700">{offer.sellerName}</span>
          </div>
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>Delivery:</span>
            <span className="text-emerald-700 font-medium">{offer.deliveryEstimate}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-600 mb-5 bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200/60">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Estimated Total Cost: Checkout terms and shipping policies set by retailer.</span>
        </div>

        <div className="flex flex-col gap-2">
          <a
            href={offer.affiliateUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <span>Proceed to {offer.storeName}</span>
            <ExternalLink className="w-4 h-4" />
          </a>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-xs text-slate-600 font-medium hover:text-slate-900 transition-colors"
          >
            Stay on OvoPrice
          </button>
        </div>
      </div>
    </div>
  );
};

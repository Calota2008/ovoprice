import React from 'react';
import {
  Link2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
  Truck,
  Scan,
  TrendingDown,
  ExternalLink,
  Store,
  Info,
  Hash,
  Sparkles,
  Camera,
} from 'lucide-react';
import { RecognizedRetailerLink, VisualAnalysisResult, Product } from '../../types';
import { DemoBadge } from '../DemoBadge';

interface VisualMatchResultScreenProps {
  onCompareOffers: () => void;
  onRescan: () => void;
  recognizedRetailerLink?: RecognizedRetailerLink | null;
  visualAnalysisResult?: VisualAnalysisResult | null;
  onOpenProduct?: (product: Product) => void;
  onOpenVisualMatcher?: (tab?: 'link' | 'photo' | 'barcode') => void;
}

export type ProductDomain =
  | 'kitchen_furniture'
  | 'kitchen_appliances'
  | 'living_furniture'
  | 'electronics'
  | 'general';

interface RetailerCategoryProfile {
  domain: ProductDomain;
  isKitchen: boolean;
  isKitchenFurniture: boolean;
  isKitchenAppliance: boolean;
  ikeaQuery: string;
  xxxlutzQuery: string;
  hoeffnerQuery: string;
  moemaxQuery: string;
  moebelixQuery: string;
  furnitureSearchTerm: string;
  mediaMarktQuery: string;
  mediaMarktTitle: string;
  mediaMarktSubtitle: string;
  ottoQuery: string;
  amazonQuery: string;
  googleQuery: string;
  showFurnitureRetailers: boolean;
  showMediaMarkt: boolean;
}

/**
 * Deterministically derives a domain category profile, safe category nouns for strict
 * furniture catalog search engines, and tailored MediaMarkt queries based on the combined evidence
 * from category, objectName, and retailerSearchQuery.
 */
function deriveRetailerProfile(result: VisualAnalysisResult): RetailerCategoryProfile {
  const combined = `${result.category} ${result.objectName} ${result.retailerSearchQuery}`.toLowerCase();

  // 1. Kitchen Appliances Detection (Dedicated search on MediaMarkt, OTTO, Amazon)
  const isOven = combined.includes('backofen') || combined.includes('einbaubackofen') || (/\bofen\b/.test(combined) && !combined.includes('mikrowelle'));
  const isHob = combined.includes('kochfeld') || combined.includes('induktionskochfeld') || combined.includes('ceranfeld') || combined.includes('cooktop') || combined.includes('herdplatte');
  const isDishwasher = combined.includes('geschirrspüler') || combined.includes('spülmaschine') || combined.includes('dishwasher');
  const isHood = combined.includes('dunstabzug') || combined.includes('dunstabzugshaube') || combined.includes('abzugshaube') || combined.includes('exhaust hood') || combined.includes('range hood');
  const isFridge = combined.includes('kühlschrank') || combined.includes('gefrierschrank') || combined.includes('kühl-gefrier') || combined.includes('refrigerator') || combined.includes('side-by-side');
  const isMicrowave = combined.includes('mikrowelle') || combined.includes('microwave');
  const isKitchenMachine = combined.includes('küchenmaschine') || combined.includes('thermomix') || combined.includes('food processor');

  const isAppliancePrimary = isOven || isHob || isDishwasher || isHood || isFridge || isMicrowave || isKitchenMachine;

  // 2. Kitchen Furniture Detection (Fitted kitchens, units, cabinets, kitchen islands)
  const isKitchenCabinetOrUnit =
    combined.includes('küchenzeile') ||
    combined.includes('einbauküche') ||
    combined.includes('küchenblock') ||
    combined.includes('kücheninsel') ||
    combined.includes('küchenschrank') ||
    combined.includes('spülschrank') ||
    combined.includes('miniküche') ||
    combined.includes('winkelküche') ||
    combined.includes('küchenmöbel');

  const hasGeneralKitchen =
    combined.includes('küch') ||
    combined.includes('kuech') ||
    combined.includes('kitchen');

  // Case A: Specific Kitchen Appliances (MediaMarkt is primary; furniture stores hidden)
  if (isAppliancePrimary && !isKitchenCabinetOrUnit) {
    let applianceQuery = 'Einbaugeräte Küche';
    let applianceName = 'Kitchen Appliances';
    if (isOven) {
      applianceQuery = 'Einbaubackofen';
      applianceName = 'Built-in Ovens';
    } else if (isHob) {
      applianceQuery = 'Induktionskochfeld';
      applianceName = 'Induction Cooktops';
    } else if (isDishwasher) {
      applianceQuery = 'Geschirrspüler';
      applianceName = 'Dishwashers';
    } else if (isHood) {
      applianceQuery = 'Dunstabzugshaube';
      applianceName = 'Range Hoods';
    } else if (isFridge) {
      applianceQuery = 'Kühlschrank';
      applianceName = 'Refrigerators';
    } else if (isMicrowave) {
      applianceQuery = 'Mikrowelle';
      applianceName = 'Microwaves';
    }

    return {
      domain: 'kitchen_appliances',
      isKitchen: true,
      isKitchenFurniture: false,
      isKitchenAppliance: true,
      ikeaQuery: applianceQuery,
      xxxlutzQuery: applianceQuery,
      hoeffnerQuery: applianceQuery,
      moemaxQuery: applianceQuery,
      moebelixQuery: applianceQuery,
      furnitureSearchTerm: applianceQuery,
      mediaMarktQuery: applianceQuery,
      mediaMarktTitle: `Search ${applianceName} on MediaMarkt.de`,
      mediaMarktSubtitle: `Dedicated appliance search for "${applianceQuery}"`,
      ottoQuery: applianceQuery,
      amazonQuery: applianceQuery,
      googleQuery: `${applianceQuery} kaufen`,
      showFurnitureRetailers: false, // Appliances belong on tech/electronics stores, not furniture stores
      showMediaMarkt: true,
    };
  }

  // Case B: Kitchen Furniture (Fitted kitchens, Küchenzeile, Einbauküche)
  if (isKitchenCabinetOrUnit || (hasGeneralKitchen && !isAppliancePrimary)) {
    return {
      domain: 'kitchen_furniture',
      isKitchen: true,
      isKitchenFurniture: true,
      isKitchenAppliance: false,
      ikeaQuery: 'Küche', // CRITICAL: 'Küche' matches IKEA's kitchen planner & systems. 'Küchenzeile' on IKEA returns chairs & lamps!
      xxxlutzQuery: 'Küchenzeile', // Documented search keyword for XXXLutz Küchenzeilen & Küchenblöcke
      hoeffnerQuery: 'Küche', // Höffner catalogs kitchens under 'Küche' / /kueche. 'Küchenzeile' produces 0 items on Höffner.
      moemaxQuery: 'Küchenzeile', // Mömax searches 'Küchenzeilen mit Geräten'
      moebelixQuery: 'Küchenzeile', // Möbelix AT searches 'Küchenzeilen'
      furnitureSearchTerm: 'Küchenzeile',
      mediaMarktQuery: 'Einbaugeräte Küche',
      mediaMarktTitle: 'Search Kitchen Appliances on MediaMarkt.de',
      mediaMarktSubtitle: 'Built-in ovens, cooktops & dishwashers for kitchens',
      ottoQuery: 'Küchenzeile', // Clean query for OTTO to prevent 0-hit fallback to chairs & lamps
      amazonQuery: 'Küchenzeile', // Clean query for Amazon to focus on kitchen units
      googleQuery: `${result.retailerSearchQuery || 'Küchenzeile'} kaufen`,
      showFurnitureRetailers: true,
      showMediaMarkt: false, // CRITICAL: MediaMarkt does NOT sell kitchen furniture! Must not be presented as kitchen furniture store
    };
  }

  // 3. Living Room, Bedroom & Dining Furniture
  const isSofa =
    combined.includes('sofa') ||
    combined.includes('couch') ||
    combined.includes('wohnlandschaft') ||
    combined.includes('ecksofa') ||
    combined.includes('ottomane') ||
    combined.includes('polsterecke') ||
    combined.includes('recamiere');

  if (isSofa) {
    return {
      domain: 'living_furniture',
      isKitchen: false,
      isKitchenFurniture: false,
      isKitchenAppliance: false,
      ikeaQuery: 'Sofa',
      xxxlutzQuery: 'Sofa',
      hoeffnerQuery: 'Sofa',
      moemaxQuery: 'Sofa',
      moebelixQuery: 'Sofa',
      furnitureSearchTerm: 'Sofa',
      mediaMarktQuery: result.retailerSearchQuery,
      mediaMarktTitle: 'Search on MediaMarkt.de',
      mediaMarktSubtitle: `Product search for "${result.retailerSearchQuery}"`,
      ottoQuery: 'Sofa',
      amazonQuery: 'Sofa',
      googleQuery: `${result.retailerSearchQuery || 'Sofa'} kaufen`,
      showFurnitureRetailers: true,
      showMediaMarkt: false, // Sofas are not sold at MediaMarkt
    };
  }

  const isBed =
    combined.includes('bett') ||
    combined.includes('bed') ||
    combined.includes('boxspring') ||
    combined.includes('matratze') ||
    combined.includes('schlafzimmer') ||
    combined.includes('polsterbett');

  if (isBed) {
    return {
      domain: 'living_furniture',
      isKitchen: false,
      isKitchenFurniture: false,
      isKitchenAppliance: false,
      ikeaQuery: 'Bett',
      xxxlutzQuery: 'Bett',
      hoeffnerQuery: 'Bett',
      moemaxQuery: 'Bett',
      moebelixQuery: 'Bett',
      furnitureSearchTerm: 'Bett',
      mediaMarktQuery: result.retailerSearchQuery,
      mediaMarktTitle: 'Search on MediaMarkt.de',
      mediaMarktSubtitle: `Product search for "${result.retailerSearchQuery}"`,
      ottoQuery: 'Bett',
      amazonQuery: 'Bett',
      googleQuery: `${result.retailerSearchQuery || 'Bett'} kaufen`,
      showFurnitureRetailers: true,
      showMediaMarkt: false, // Beds are not sold at MediaMarkt
    };
  }

  const isTable =
    combined.includes('esstisch') ||
    combined.includes('couchtisch') ||
    combined.includes('schreibtisch') ||
    combined.includes('beistelltisch') ||
    combined.includes('dining table') ||
    combined.includes('desk') ||
    (/\btisch\b/.test(combined) && !combined.includes('praktisch'));

  if (isTable) {
    const tableNoun = combined.includes('couchtisch')
      ? 'Couchtisch'
      : combined.includes('schreibtisch')
      ? 'Schreibtisch'
      : 'Esstisch';
    return {
      domain: 'living_furniture',
      isKitchen: false,
      isKitchenFurniture: false,
      isKitchenAppliance: false,
      ikeaQuery: tableNoun,
      xxxlutzQuery: tableNoun,
      hoeffnerQuery: tableNoun,
      moemaxQuery: tableNoun,
      moebelixQuery: tableNoun,
      furnitureSearchTerm: tableNoun,
      mediaMarktQuery: result.retailerSearchQuery,
      mediaMarktTitle: 'Search on MediaMarkt.de',
      mediaMarktSubtitle: `Product search for "${result.retailerSearchQuery}"`,
      ottoQuery: tableNoun,
      amazonQuery: tableNoun,
      googleQuery: `${result.retailerSearchQuery || tableNoun} kaufen`,
      showFurnitureRetailers: true,
      showMediaMarkt: false,
    };
  }

  const isChair =
    combined.includes('stuhl') ||
    combined.includes('sessel') ||
    combined.includes('chair') ||
    combined.includes('armchair') ||
    combined.includes('hocker');

  if (isChair) {
    const chairNoun = combined.includes('sessel') ? 'Sessel' : 'Stuhl';
    return {
      domain: 'living_furniture',
      isKitchen: false,
      isKitchenFurniture: false,
      isKitchenAppliance: false,
      ikeaQuery: chairNoun,
      xxxlutzQuery: chairNoun,
      hoeffnerQuery: chairNoun,
      moemaxQuery: chairNoun,
      moebelixQuery: chairNoun,
      furnitureSearchTerm: chairNoun,
      mediaMarktQuery: result.retailerSearchQuery,
      mediaMarktTitle: 'Search on MediaMarkt.de',
      mediaMarktSubtitle: `Product search for "${result.retailerSearchQuery}"`,
      ottoQuery: chairNoun,
      amazonQuery: chairNoun,
      googleQuery: `${result.retailerSearchQuery || chairNoun} kaufen`,
      showFurnitureRetailers: true,
      showMediaMarkt: false,
    };
  }

  const isStorage =
    combined.includes('schrank') ||
    combined.includes('kleiderschrank') ||
    combined.includes('kommode') ||
    combined.includes('regal') ||
    combined.includes('sideboard') ||
    combined.includes('wardrobe') ||
    combined.includes('cabinet') ||
    combined.includes('shelf');

  if (isStorage) {
    const storageNoun = combined.includes('kleiderschrank')
      ? 'Kleiderschrank'
      : combined.includes('kommode')
      ? 'Kommode'
      : combined.includes('regal')
      ? 'Regal'
      : 'Schrank';
    return {
      domain: 'living_furniture',
      isKitchen: false,
      isKitchenFurniture: false,
      isKitchenAppliance: false,
      ikeaQuery: storageNoun,
      xxxlutzQuery: storageNoun,
      hoeffnerQuery: storageNoun,
      moemaxQuery: storageNoun,
      moebelixQuery: storageNoun,
      furnitureSearchTerm: storageNoun,
      mediaMarktQuery: result.retailerSearchQuery,
      mediaMarktTitle: 'Search on MediaMarkt.de',
      mediaMarktSubtitle: `Product search for "${result.retailerSearchQuery}"`,
      ottoQuery: storageNoun,
      amazonQuery: storageNoun,
      googleQuery: `${result.retailerSearchQuery || storageNoun} kaufen`,
      showFurnitureRetailers: true,
      showMediaMarkt: false,
    };
  }

  const isGeneralFurniture =
    combined.includes('möbel') ||
    combined.includes('furniture') ||
    combined.includes('wohnen') ||
    combined.includes('einrichtung');

  if (isGeneralFurniture) {
    return {
      domain: 'living_furniture',
      isKitchen: false,
      isKitchenFurniture: false,
      isKitchenAppliance: false,
      ikeaQuery: 'Möbel',
      xxxlutzQuery: 'Möbel',
      hoeffnerQuery: 'Möbel',
      moemaxQuery: 'Möbel',
      moebelixQuery: 'Möbel',
      furnitureSearchTerm: 'Möbel',
      mediaMarktQuery: result.retailerSearchQuery,
      mediaMarktTitle: 'Search on MediaMarkt.de',
      mediaMarktSubtitle: `Product search for "${result.retailerSearchQuery}"`,
      ottoQuery: result.retailerSearchQuery,
      amazonQuery: result.retailerSearchQuery,
      googleQuery: `${result.retailerSearchQuery} kaufen`,
      showFurnitureRetailers: true,
      showMediaMarkt: false,
    };
  }

  // 4. Electronics & Vacuums
  const isElectronics =
    combined.includes('elektronik') ||
    combined.includes('electronics') ||
    combined.includes('haushaltsgerät') ||
    combined.includes('haushaltsgeräte') ||
    combined.includes('appliance') ||
    combined.includes('staubsauger') ||
    combined.includes('vacuum') ||
    combined.includes('dyson') ||
    combined.includes('saugroboter') ||
    combined.includes('fernseher') ||
    combined.includes('tv') ||
    combined.includes('kaffee') ||
    combined.includes('coffee') ||
    combined.includes('kopfhörer') ||
    combined.includes('headphone') ||
    combined.includes('audio') ||
    combined.includes('smartphone') ||
    combined.includes('handy') ||
    combined.includes('laptop') ||
    combined.includes('computer') ||
    combined.includes('waschmaschine') ||
    combined.includes('trockner') ||
    combined.includes('projector') ||
    combined.includes('beamer');

  if (isElectronics) {
    return {
      domain: 'electronics',
      isKitchen: false,
      isKitchenFurniture: false,
      isKitchenAppliance: false,
      ikeaQuery: result.retailerSearchQuery,
      xxxlutzQuery: result.retailerSearchQuery,
      hoeffnerQuery: result.retailerSearchQuery,
      moemaxQuery: result.retailerSearchQuery,
      moebelixQuery: result.retailerSearchQuery,
      furnitureSearchTerm: result.retailerSearchQuery,
      mediaMarktQuery: result.retailerSearchQuery,
      mediaMarktTitle: 'Search on MediaMarkt.de',
      mediaMarktSubtitle: `Product search for "${result.retailerSearchQuery}"`,
      ottoQuery: result.retailerSearchQuery,
      amazonQuery: result.retailerSearchQuery,
      googleQuery: `${result.retailerSearchQuery} kaufen`,
      showFurnitureRetailers: false, // Hide furniture stores for Dyson, TVs, headphones, etc.
      showMediaMarkt: true,
    };
  }

  // 5. General / Unknown Category Fallback
  return {
    domain: 'general',
    isKitchen: false,
    isKitchenFurniture: false,
    isKitchenAppliance: false,
    ikeaQuery: result.retailerSearchQuery,
    xxxlutzQuery: result.retailerSearchQuery,
    hoeffnerQuery: result.retailerSearchQuery,
    moemaxQuery: result.retailerSearchQuery,
    moebelixQuery: result.retailerSearchQuery,
    furnitureSearchTerm: result.retailerSearchQuery,
    mediaMarktQuery: result.retailerSearchQuery,
    mediaMarktTitle: 'Search on MediaMarkt.de',
    mediaMarktSubtitle: `Product search for "${result.retailerSearchQuery}"`,
    ottoQuery: result.retailerSearchQuery,
    amazonQuery: result.retailerSearchQuery,
    googleQuery: `${result.retailerSearchQuery} kaufen`,
    showFurnitureRetailers: false, // Show only universal marketplaces (Google, Amazon, OTTO)
    showMediaMarkt: false,
  };
}

export const VisualMatchResultScreen: React.FC<VisualMatchResultScreenProps> = ({
  onCompareOffers,
  onRescan,
  recognizedRetailerLink,
  visualAnalysisResult,
  onOpenProduct,
  onOpenVisualMatcher,
}) => {
  // If a real retailer link was recognized (MediaMarkt / OTTO), show retailer-specific view
  if (recognizedRetailerLink) {
    const retailerDisplayName = recognizedRetailerLink.retailerName;
    const RETAILER_STYLE: Record<RecognizedRetailerLink['retailerKey'], { bg: string; btn: string; badge: string }> = {
      mediamarkt: { bg: 'bg-red-600', btn: 'bg-red-600 hover:bg-red-700 active:bg-red-800', badge: 'bg-red-50 text-red-700 border border-red-200' },
      otto: { bg: 'bg-blue-600', btn: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800', badge: 'bg-blue-50 text-blue-700 border border-blue-200' },
      amazon: { bg: 'bg-amber-500', btn: 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700', badge: 'bg-amber-50 text-amber-800 border border-amber-200' },
      ebay: { bg: 'bg-slate-700', btn: 'bg-slate-800 hover:bg-slate-900 active:bg-black', badge: 'bg-slate-100 text-slate-700 border border-slate-300' },
    };
    const style = RETAILER_STYLE[recognizedRetailerLink.retailerKey];
    const buttonLabel = `Deschide la ${retailerDisplayName.replace(/ Germany$/, '')}`;
    const matched = recognizedRetailerLink.matchedProduct ?? null;

    return (
      <div className="pb-8 space-y-4">
        {/* Top Banner: Recognized Retailer Link */}
        <div className="bg-slate-100 rounded-xl p-3 border border-slate-200 flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-lg text-white flex items-center justify-center shrink-0 ${style.bg}`}>
              <Store className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                MAGAZIN RECUNOSCUT
              </span>
              <p className="text-xs font-semibold text-slate-900 truncate">
                {retailerDisplayName}
              </p>
            </div>
          </div>

          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${style.badge}`}>
            {recognizedRetailerLink.hostname}
          </span>
        </div>

        {/* Verification Status Header */}
        <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-xl p-3 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Link analizat</span>
            </div>
            <span className="text-[11px] font-mono text-emerald-800 font-semibold">
              doar adresa, fără cereri către magazin
            </span>
          </div>

          <p className="text-[11px] text-emerald-800 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Domeniu recunoscut: {recognizedRetailerLink.hostname}</span>
          </p>
        </div>

        {/* Retailer Link Details Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-base">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Link de produs recunoscut</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold uppercase tracking-wider">
              {retailerDisplayName}
            </span>
          </div>

          {/* Extracted Article ID chip if available */}
          {recognizedRetailerLink.articleId && (
            <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <Hash className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="text-slate-600 font-medium">{recognizedRetailerLink.idLabel ?? 'ID articol'}:</span>
              <span className="font-mono font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                {recognizedRetailerLink.articleId}
              </span>
            </div>
          )}

          {/* Linkul introdus Box */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Linkul introdus
            </label>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 break-all leading-relaxed select-all">
              {recognizedRetailerLink.submittedUrl}
            </div>
          </div>

          {/* Catalog match by name (needs user verification) */}
          {matched ? (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-2">
              <p className="text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                Posibil produs din catalog (potrivire după numele din link)
              </p>
              <div className="flex items-center gap-3">
                <img src={matched.image} alt={matched.title} className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">{matched.title}</p>
                  <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
                    de la {matched.bestPrice.toFixed(2).replace('.', ',')} € <DemoBadge />
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-slate-500">Verifică dacă este același model înainte să compari prețurile.</p>
              {onOpenProduct && (
                <button
                  onClick={() => onOpenProduct(matched)}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg cursor-pointer"
                >
                  Compară prețurile pentru acest produs
                </button>
              )}
            </div>
          ) : (
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-950">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Prețul nu a fost citit din link</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Am recunoscut magazinul, dar nu am găsit produsul în catalogul OvoPrice și nu citim prețuri live de pe pagina magazinului.
                {recognizedRetailerLink.slugGuess ? ' Poți căuta produsul după numele din link.' : ''} Prețul actual și stocul se văd pe site-ul magazinului.
              </p>
              {recognizedRetailerLink.slugGuess && onOpenVisualMatcher && (
                <p className="text-[11px] font-mono text-amber-900 break-words">„{recognizedRetailerLink.slugGuess}”</p>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {/* Primary View on Retailer Button */}
          <a
            href={recognizedRetailerLink.submittedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full py-3.5 px-4 text-white font-bold text-sm rounded-lg flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer ${style.btn}`}
          >
            <span>{buttonLabel}</span>
            <ExternalLink className="w-4 h-4" />
          </a>

          {/* Secondary Rescan / Enter another link button */}
          <button
            onClick={onRescan}
            className="w-full py-3 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Scan className="w-3.5 h-3.5 text-slate-500" />
            <span>Analizează alt link</span>
          </button>
        </div>

        {/* Trust Marks */}
        <div className="flex items-center justify-center gap-6 text-[11px] text-slate-500 pt-2 font-medium">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Linkul rămâne neschimbat</span>
          </div>
          <div className="flex items-center gap-1">
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            <span>Se deschide în filă nouă</span>
          </div>
        </div>
      </div>
    );
  }

  // If real Gemini photo analysis was performed, render multimodal visual result screen
  if (visualAnalysisResult) {
    const profile = deriveRetailerProfile(visualAnalysisResult);
    const query = visualAnalysisResult.retailerSearchQuery;
    const mediamarktSearchUrl = `https://www.mediamarkt.de/de/search.html?query=${encodeURIComponent(
      profile.mediaMarktQuery
    )}`;
    const ottoSearchUrl = `https://www.otto.de/suche/${encodeURIComponent(
      profile.ottoQuery
    )}/`;
    const amazonSearchUrl = `https://www.amazon.de/s?k=${encodeURIComponent(
      profile.amazonQuery
    )}`;
    const googleDetailedSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(
      profile.googleQuery
    )}`;

    // Expanded furniture retailer search URLs (Germany & Austria) using verified retailer search endpoints and conservative terms
    const furnitureQuery = profile.furnitureSearchTerm;
    const ikeaQuery = profile.ikeaQuery;
    const xxxlutzQuery = profile.xxxlutzQuery;
    const hoeffnerQuery = profile.hoeffnerQuery;
    const moemaxQuery = profile.moemaxQuery;
    const moebelixQuery = profile.moebelixQuery;

    const ikeaDeSearchUrl = `https://www.ikea.com/de/de/search/?q=${encodeURIComponent(ikeaQuery)}`;
    const ikeaAtSearchUrl = `https://www.ikea.com/at/de/search/?q=${encodeURIComponent(ikeaQuery)}`;
    const xxxlutzDeSearchUrl = `https://www.xxxlutz.de/s/?q=${encodeURIComponent(xxxlutzQuery)}`;
    const xxxlutzAtSearchUrl = `https://www.xxxlutz.at/s/?q=${encodeURIComponent(xxxlutzQuery)}`;
    const hoeffnerDeSearchUrl = `https://www.hoeffner.de/suche?anfrage=${encodeURIComponent(hoeffnerQuery)}`;
    const moemaxDeSearchUrl = `https://www.moemax.de/s/?q=${encodeURIComponent(moemaxQuery)}`;
    const moemaxAtSearchUrl = `https://www.moemax.at/s/?q=${encodeURIComponent(moemaxQuery)}`;
    const moebelixDeSearchUrl = `https://www.moebelix.de/s/?q=${encodeURIComponent(moebelixQuery)}`;
    const moebelixAtSearchUrl = `https://www.moebelix.at/s/?q=${encodeURIComponent(moebelixQuery)}`;

    return (
      <div className="pb-8 space-y-4">
        {/* Top Banner: AI Identification Badge */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl p-3.5 text-white flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-emerald-200" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider block">
                AI-POWERED VISUAL ANALYSIS
              </span>
              <p className="text-xs font-semibold text-white truncate">
                Gemini 3.8 Flash Vision Model
              </p>
            </div>
          </div>

          <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-emerald-100 text-[10px] font-mono font-medium shrink-0">
            {visualAnalysisResult.timestamp || 'Live Result'}
          </span>
        </div>

        {/* Verification Status Banner */}
        <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-xl p-3 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Visual Analysis Complete</span>
            </div>
            <span className="text-[11px] font-mono text-emerald-800 font-semibold">
              Identified Object
            </span>
          </div>

          <p className="text-[11px] text-emerald-800 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Physical characteristics & retailer queries extracted</span>
          </p>
        </div>

        {/* Product Identity Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3.5">
          <div className="flex items-start gap-3">
            {visualAnalysisResult.imagePreviewUrl && (
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                <img
                  src={visualAnalysisResult.imagePreviewUrl}
                  alt={visualAnalysisResult.objectName}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider">
                  {visualAnalysisResult.category}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 leading-snug">
                {visualAnalysisResult.objectName}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mt-1">
                {visualAnalysisResult.description}
              </p>
            </div>
          </div>
        </div>

        {/* Observable Characteristics Card */}
        {visualAnalysisResult.observableCharacteristics?.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2">
              <Scan className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Observable Characteristics
              </h4>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {visualAnalysisResult.observableCharacteristics.map((char, index) => (
                <span
                  key={index}
                  className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs font-medium text-slate-800 flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>{char}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Real Retailer Search Queries & Direct Links */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-blue-600" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Find on Verified Retailers
              </h4>
            </div>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              Live Search Links
            </span>
          </div>

          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Generated Retailer Query:
            </div>
            <p className="font-mono font-semibold text-slate-900 break-words">
              "{visualAnalysisResult.retailerSearchQuery}"
            </p>
          </div>

          <div className="space-y-2 pt-1">
            {/* MediaMarkt */}
            {profile.showMediaMarkt && (
              <a
                href={mediamarktSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full p-3 rounded-lg border border-red-200 hover:border-red-400 bg-red-50/40 hover:bg-red-50 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-6 h-6 rounded bg-red-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                    MM
                  </span>
                  <div className="min-w-0 text-left">
                    <p className="text-xs font-bold text-slate-900 group-hover:text-red-700 transition-colors">
                      {profile.mediaMarktTitle}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {profile.mediaMarktSubtitle}
                    </p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-red-600 shrink-0 ml-2" />
              </a>
            )}

            {/* OTTO */}
            <a
              href={ottoSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full p-3 rounded-lg border border-blue-200 hover:border-blue-400 bg-blue-50/40 hover:bg-blue-50 transition-colors flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-6 h-6 rounded bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                  OT
                </span>
                <div className="min-w-0 text-left">
                  <p className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                    Search on OTTO.de
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {profile.isKitchenFurniture
                      ? 'Catalog search for "Küchenzeile" on otto.de'
                      : `Catalog search for "${profile.ottoQuery}" on otto.de`}
                  </p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0 ml-2" />
            </a>

              {/* Amazon.de */}
              <a
                href={amazonSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full p-3 rounded-lg border border-amber-200 hover:border-amber-400 bg-amber-50/40 hover:bg-amber-50 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-6 h-6 rounded bg-amber-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                    AM
                  </span>
                  <div className="min-w-0 text-left">
                    <p className="text-xs font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                      Search on Amazon.de
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {profile.isKitchenFurniture
                        ? 'Marketplace offers for "Küchenzeile" on amazon.de'
                        : `Marketplace offers for "${profile.amazonQuery}" on amazon.de`}
                    </p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-amber-600 shrink-0 ml-2" />
              </a>

              {/* Detailed Google Shopping Search */}
              <a
                href={googleDetailedSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full p-3 rounded-lg border border-emerald-200 hover:border-emerald-400 bg-emerald-50/40 hover:bg-emerald-50 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-6 h-6 rounded bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                    GO
                  </span>
                  <div className="min-w-0 text-left">
                    <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      Detailed Google Shopping Search
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      Broad web & merchant search for "{profile.googleQuery}"
                    </p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 shrink-0 ml-2" />
              </a>
            </div>

            {/* Built-in Kitchen Appliances Callout for Fitted Kitchens */}
            {profile.isKitchenFurniture && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Kitchen Appliances & Technology (MediaMarkt.de)</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                    Appliances Only
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  MediaMarkt specializes in kitchen electrical appliances, not kitchen cabinetry. To equip this kitchen with built-in ovens, induction cooktops, or dishwashers:
                </p>
                <a
                  href={`https://www.mediamarkt.de/de/search.html?query=${encodeURIComponent('Einbaugeräte Küche')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full p-2.5 rounded-lg border border-red-200 hover:border-red-400 bg-white hover:bg-red-50/50 transition-colors flex items-center justify-between group cursor-pointer shadow-2xs mt-1"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded bg-red-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                      MM
                    </span>
                    <span className="text-xs font-semibold text-slate-800 group-hover:text-red-700 truncate">
                      Search Built-in Kitchen Appliances on MediaMarkt.de
                    </span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-600 shrink-0 ml-1" />
                </a>
              </div>
            )}

            {/* Expanded Furniture Retailers (Online Catalogs • DE & AT) */}
            {profile.showFurnitureRetailers && (
              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      {profile.isKitchenFurniture
                        ? 'Kitchen & Fitted Unit Retailers (DE & AT)'
                        : 'Furniture & Living Retailers (DE & AT)'}
                    </h5>
                    <p className="text-[10px] text-slate-500">
                      {profile.isKitchenFurniture
                        ? 'Catalog search: IKEA ("Küche") • XXXLutz, Mömax, Möbelix AT ("Küchenzeile") • Höffner ("Küche")'
                        : `Standard catalog search: "${profile.furnitureSearchTerm}" • Ships across Germany & Austria`}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                    Online Catalog
                  </span>
                </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* IKEA Germany */}
                <a
                  href={ikeaDeSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-lg border border-slate-200 hover:border-blue-400 bg-slate-50/60 hover:bg-white transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded bg-blue-700 text-yellow-300 font-black text-[9px] flex items-center justify-center shrink-0">
                      IK
                    </span>
                    <div className="min-w-0 text-left">
                      <p className="text-xs font-bold text-slate-800 group-hover:text-blue-700 transition-colors truncate">
                        IKEA Deutschland
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">ikea.com/de</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-1">
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 text-slate-700">DE</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                  </div>
                </a>

                {/* IKEA Austria */}
                <a
                  href={ikeaAtSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-lg border border-slate-200 hover:border-blue-400 bg-slate-50/60 hover:bg-white transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded bg-blue-700 text-yellow-300 font-black text-[9px] flex items-center justify-center shrink-0">
                      IK
                    </span>
                    <div className="min-w-0 text-left">
                      <p className="text-xs font-bold text-slate-800 group-hover:text-blue-700 transition-colors truncate">
                        IKEA Österreich
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">ikea.com/at</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-1">
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-100 text-red-800 border border-red-200">AT</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                  </div>
                </a>

                {/* XXXLutz Germany */}
                <a
                  href={xxxlutzDeSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-lg border border-slate-200 hover:border-red-400 bg-slate-50/60 hover:bg-white transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded bg-red-600 text-white font-black text-[9px] flex items-center justify-center shrink-0">
                      XL
                    </span>
                    <div className="min-w-0 text-left">
                      <p className="text-xs font-bold text-slate-800 group-hover:text-red-700 transition-colors truncate">
                        XXXLutz Deutschland
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">xxxlutz.de</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-1">
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 text-slate-700">DE</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-600" />
                  </div>
                </a>

                {/* XXXLutz Austria */}
                <a
                  href={xxxlutzAtSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-lg border border-slate-200 hover:border-red-400 bg-slate-50/60 hover:bg-white transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded bg-red-600 text-white font-black text-[9px] flex items-center justify-center shrink-0">
                      XL
                    </span>
                    <div className="min-w-0 text-left">
                      <p className="text-xs font-bold text-slate-800 group-hover:text-red-700 transition-colors truncate">
                        XXXLutz Österreich
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">xxxlutz.at</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-1">
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-100 text-red-800 border border-red-200">AT</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-600" />
                  </div>
                </a>

                {/* Möbel Höffner Germany */}
                <a
                  href={hoeffnerDeSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-lg border border-slate-200 hover:border-red-400 bg-slate-50/60 hover:bg-white transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded bg-red-700 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                      HÖ
                    </span>
                    <div className="min-w-0 text-left">
                      <p className="text-xs font-bold text-slate-800 group-hover:text-red-700 transition-colors truncate">
                        Möbel Höffner
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">hoeffner.de</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-1">
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 text-slate-700">DE</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-600" />
                  </div>
                </a>

                {/* Mömax Germany */}
                <a
                  href={moemaxDeSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-lg border border-slate-200 hover:border-green-400 bg-slate-50/60 hover:bg-white transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded bg-emerald-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                      MX
                    </span>
                    <div className="min-w-0 text-left">
                      <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition-colors truncate">
                        Mömax Deutschland
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">moemax.de</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-1">
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 text-slate-700">DE</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
                  </div>
                </a>

                {/* Mömax Austria */}
                <a
                  href={moemaxAtSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-lg border border-slate-200 hover:border-green-400 bg-slate-50/60 hover:bg-white transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded bg-emerald-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                      MX
                    </span>
                    <div className="min-w-0 text-left">
                      <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition-colors truncate">
                        Mömax Österreich
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">moemax.at</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-1">
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-100 text-red-800 border border-red-200">AT</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
                  </div>
                </a>

                {/* Möbelix Germany */}
                <a
                  href={moebelixDeSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-lg border border-slate-200 hover:border-yellow-500 bg-slate-50/60 hover:bg-white transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded bg-yellow-500 text-slate-900 font-bold text-[9px] flex items-center justify-center shrink-0">
                      MÖ
                    </span>
                    <div className="min-w-0 text-left">
                      <p className="text-xs font-bold text-slate-800 group-hover:text-amber-700 transition-colors truncate">
                        Möbelix Deutschland
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">moebelix.de</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-1">
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 text-slate-700">DE</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600" />
                  </div>
                </a>

                {/* Möbelix Austria */}
                <a
                  href={moebelixAtSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-lg border border-slate-200 hover:border-yellow-500 bg-slate-50/60 hover:bg-white transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded bg-yellow-500 text-slate-900 font-bold text-[9px] flex items-center justify-center shrink-0">
                      MÖ
                    </span>
                    <div className="min-w-0 text-left">
                      <p className="text-xs font-bold text-slate-800 group-hover:text-amber-700 transition-colors truncate">
                        Möbelix Österreich
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">moebelix.at</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-1">
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-100 text-red-800 border border-red-200">AT</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600" />
                  </div>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Comparable Alternatives Card */}
        {visualAnalysisResult.alternatives?.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2.5">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Comparable Alternatives & Related Matches
            </h4>
            <div className="grid grid-cols-1 gap-2 pt-1">
              {visualAnalysisResult.alternatives.map((alt, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3"
                >
                  <span className="font-medium text-slate-800 line-clamp-2 leading-snug flex-1 min-w-0">
                    {alt}
                  </span>
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(alt)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700 hover:text-slate-900 shrink-0 self-start sm:self-center transition-colors shadow-2xs group cursor-pointer"
                    title={`Search "${alt}" on Google`}
                  >
                    <span className="whitespace-nowrap">Google Search</span>
                    <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-slate-600 shrink-0" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transparency Notice / Safeguard Disclosure */}
        <div className="bg-slate-100 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 space-y-1.5 shadow-2xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <Info className="w-4 h-4 text-slate-600 shrink-0" />
            <span>Pricing & Inventory Notice</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-600">
            Price, shipping rates, and live stock availability cannot be verified from a photograph alone. OvoPrice does not fabricate merchant inventory or prices. Please open the verified retailer links above to view current availability, live discounts, and delivery conditions.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            onClick={onRescan}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-lg flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Scan Another Photo or Link</span>
          </button>

          <button
            onClick={onCompareOffers}
            className="w-full py-3 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <span>View Sample Comparison Offers</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* Trust Marks */}
        <div className="flex items-center justify-center gap-6 text-[11px] text-slate-500 pt-2 font-medium">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Direct Retailer Links</span>
          </div>
          <div className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Multimodal Vision</span>
          </div>
        </div>
      </div>
    );
  }

  // Nothing to show (no link and no photo analysis yet)
  return (
    <div className="pb-8 pt-10 text-center space-y-3">
      <p className="text-sm text-slate-600">Nu ai analizat încă niciun link sau nicio poză.</p>
      <button
        onClick={() => onOpenVisualMatcher?.('link')}
        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
      >
        Analizează un link
      </button>
    </div>
  );
};

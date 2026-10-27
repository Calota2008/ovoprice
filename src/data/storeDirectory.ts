/**
 * Directory of retailers in Germany and Austria, tagged by the KIND of products they usually sell.
 * This is a list of well-known shops, not a price source: it says nothing about stock, prices or
 * whether a given shop sells a given product. Only shops whose range is well known are listed;
 * add a shop only when you are sure of its country and range.
 */
export type StoreGroup = 'electronics' | 'appliances' | 'diy' | 'furniture' | 'drugstore' | 'beauty' | 'general';

export interface DirectoryStore {
  key: string;
  name: string;
  /** Domain per country the shop serves with its own site. */
  domains: Partial<Record<'DE' | 'AT', string>>;
  groups: StoreGroup[];
  /** Search page of the shop; only the shops whose search address is known have one. */
  search?: Partial<Record<'DE' | 'AT', (q: string) => string>>;
}

const enc = encodeURIComponent;

export const STORE_DIRECTORY: DirectoryStore[] = [
  {
    key: 'mediamarkt',
    name: 'MediaMarkt',
    domains: { DE: 'mediamarkt.de', AT: 'mediamarkt.at' },
    groups: ['electronics', 'appliances'],
    search: {
      DE: (q) => `https://www.mediamarkt.de/de/search.html?query=${enc(q)}`,
      AT: (q) => `https://www.mediamarkt.at/de/search.html?query=${enc(q)}`,
    },
  },
  {
    key: 'saturn',
    name: 'Saturn',
    domains: { DE: 'saturn.de', AT: 'saturn.at' },
    groups: ['electronics', 'appliances'],
    search: {
      DE: (q) => `https://www.saturn.de/de/search.html?query=${enc(q)}`,
      AT: (q) => `https://www.saturn.at/de/search.html?query=${enc(q)}`,
    },
  },
  { key: 'expert', name: 'Expert', domains: { DE: 'expert.de', AT: 'expert.at' }, groups: ['electronics', 'appliances'] },
  { key: 'euronics', name: 'Euronics', domains: { DE: 'euronics.de', AT: 'euronics.at' }, groups: ['electronics', 'appliances'] },
  { key: 'cyberport', name: 'Cyberport', domains: { DE: 'cyberport.de', AT: 'cyberport.at' }, groups: ['electronics'] },
  { key: 'alternate', name: 'Alternate', domains: { DE: 'alternate.de', AT: 'alternate.at' }, groups: ['electronics'] },
  { key: 'notebooksbilliger', name: 'notebooksbilliger.de', domains: { DE: 'notebooksbilliger.de' }, groups: ['electronics'] },
  { key: 'conrad', name: 'Conrad', domains: { DE: 'conrad.de', AT: 'conrad.at' }, groups: ['electronics', 'diy'] },
  { key: 'hartlauer', name: 'Hartlauer', domains: { AT: 'hartlauer.at' }, groups: ['electronics'] },
  { key: 'hornbach', name: 'Hornbach', domains: { DE: 'hornbach.de', AT: 'hornbach.at' }, groups: ['diy'] },
  { key: 'bauhaus', name: 'Bauhaus', domains: { DE: 'bauhaus.info', AT: 'bauhaus.at' }, groups: ['diy'] },
  { key: 'obi', name: 'OBI', domains: { DE: 'obi.de', AT: 'obi.at' }, groups: ['diy'] },
  { key: 'ikea', name: 'IKEA', domains: { DE: 'ikea.com/de', AT: 'ikea.com/at' }, groups: ['furniture'] },
  { key: 'xxxlutz', name: 'XXXLutz', domains: { DE: 'xxxlutz.de', AT: 'xxxlutz.at' }, groups: ['furniture'] },
  { key: 'moebelix', name: 'Möbelix', domains: { AT: 'moebelix.at' }, groups: ['furniture'] },
  { key: 'dm', name: 'dm', domains: { DE: 'dm.de', AT: 'dm.at' }, groups: ['drugstore'] },
  { key: 'rossmann', name: 'Rossmann', domains: { DE: 'rossmann.de' }, groups: ['drugstore'] },
  { key: 'bipa', name: 'BIPA', domains: { AT: 'bipa.at' }, groups: ['drugstore'] },
  { key: 'douglas', name: 'Douglas', domains: { DE: 'douglas.de', AT: 'douglas.at' }, groups: ['beauty'] },
  // General marketplaces: they sell almost every kind of product, so they always apply.
  {
    key: 'amazon',
    name: 'Amazon',
    // Austria is served by amazon.de.
    domains: { DE: 'amazon.de', AT: 'amazon.de' },
    groups: ['general'],
    search: {
      DE: (q) => `https://www.amazon.de/s?k=${enc(q)}`,
      AT: (q) => `https://www.amazon.de/s?k=${enc(q)}`,
    },
  },
  {
    key: 'otto',
    name: 'OTTO',
    domains: { DE: 'otto.de' },
    groups: ['general'],
    search: { DE: (q) => `https://www.otto.de/suche/${enc(q)}/` },
  },
];

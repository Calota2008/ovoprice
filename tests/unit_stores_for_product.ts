// Run with: npx tsx tests/unit_stores_for_product.ts
import { storesForProduct, groupsForProduct } from '../src/utils/storesForProduct';
import { STORE_DIRECTORY } from '../src/data/storeDirectory';
let fails = 0;
const check = (n: string, ok: boolean) => { console.log((ok ? 'PASS ' : 'FAIL ') + n); if (!ok) fails++; };
const names = (p: { category?: string; title?: string }, c: string) => storesForProduct(p, c).stores.map((s) => s.name);

const dryer = { category: 'Haartrockner', title: 'Dyson Supersonic Haartrockner' };
const nd = names(dryer, 'DE');
check('hair dryer (DE): electronics, appliance and drugstore shops', ['MediaMarkt', 'Saturn', 'dm', 'Rossmann'].every((n) => nd.includes(n)));
check('hair dryer (DE): no furniture, DIY or supermarket-like shops', !['IKEA', 'XXXLutz', 'Hornbach', 'OBI', 'Bauhaus'].some((n) => nd.includes(n)));
check('hair dryer (DE): general marketplaces come last', nd.slice(-2).join() === 'Amazon,OTTO');
const na = names(dryer, 'AT');
check('hair dryer (AT): Austrian shops, no German-only shops', na.includes('Hartlauer') === true && na.includes('BIPA') && !na.includes('Rossmann') && !na.includes('OTTO') && !na.includes('notebooksbilliger.de'));
check('Austria uses amazon.de (there is no amazon.at)', storesForProduct(dryer, 'AT').stores.find((s) => s.key === 'amazon')?.domain === 'amazon.de');

const drill = { category: 'CORDLESS DRILL', title: 'Bosch Professional GSR 12V' };
const nb = names(drill, 'DE');
check('drill: DIY shops and Conrad, no furniture or drugstore', ['Hornbach', 'OBI', 'Bauhaus', 'Conrad'].every((n) => nb.includes(n)) && !['IKEA', 'dm', 'MediaMarkt'].some((n) => nb.includes(n)));

const sofa = { category: 'Möbel', title: 'Sofa 3-Sitzer' };
const ns = names(sofa, 'DE');
check('furniture: furniture shops, no electronics shops', ['IKEA', 'XXXLutz'].every((n) => ns.includes(n)) && !['MediaMarkt', 'Saturn', 'Hornbach'].some((n) => ns.includes(n)));

const tv = { category: 'FERNSEHER & HOME CINEMA', title: 'LG OLED C3 55"' };
const nt = names(tv, 'DE');
check('TV: electronics shops, no drugstore/furniture/DIY', ['MediaMarkt', 'Saturn', 'Cyberport', 'Expert'].every((n) => nt.includes(n)) && !['dm', 'IKEA', 'Hornbach'].some((n) => nt.includes(n)));
check('headphones are electronics', groupsForProduct({ category: 'AUDIO & KOPFHÖRER' }).includes('electronics'));

const unknown = { category: 'ZZZ', title: 'Something unrecognised' };
const r = storesForProduct(unknown, 'DE');
check('unknown type: not matched, only general shops', !r.matched && r.stores.map((s) => s.key).join() === 'amazon,otto');

check('unknown country falls back to Germany', storesForProduct(tv, 'XX').stores.every((s) => s.domain !== 'hartlauer.at'));
check('every link is https', ['DE', 'AT'].every((c) => [dryer, drill, sofa, tv, unknown].every((p) => storesForProduct(p, c).stores.every((s) => s.url.startsWith('https://')))));
check('own search links only for known search pages', storesForProduct(tv, 'DE').stores.filter((s) => s.ownSearch).map((s) => s.key).sort().join() === 'amazon,mediamarkt,otto,saturn');
check('fallback link is a web search limited to the shop', storesForProduct(tv, 'DE').stores.find((s) => s.key === 'cyberport')!.url.includes('site%3Acyberport.de'));
check('query is encoded', storesForProduct({ category: 'TV', title: 'A&B "x" 55″' }, 'DE').stores.find((s) => s.key === 'amazon')!.url === 'https://www.amazon.de/s?k=' + encodeURIComponent('A&B "x" 55″'));
check('every directory shop serves at least one country and has a group', STORE_DIRECTORY.every((s) => (s.domains.DE || s.domains.AT) && s.groups.length > 0));
check('no shop appears twice', new Set(STORE_DIRECTORY.map((s) => s.key)).size === STORE_DIRECTORY.length);
console.log(fails ? `\nFAILED: ${fails}` : '\nALL PASS'); process.exit(fails ? 1 : 0);

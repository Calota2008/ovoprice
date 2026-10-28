// Run with: npx tsx tests/unit_merge_lists.ts
import { planMerge, deviceSignature, isEmptyLists, UserLists } from '../src/utils/mergeLists';
let bad = 0;
const check = (n: string, ok: boolean) => { console.log((ok ? 'PASS ' : 'FAIL ') + n); if (!ok) bad++; };
const s = (id: string, productId?: string): any => ({ id, productId, title: id, currentPrice: 1 });
const a = (productId: string): any => ({ id: `alert-${productId}`, productId, title: productId, targetPrice: 1, currentPrice: 2 });
const c = (id: string, name: string, productIds: string[]) => ({ id, name, productIds });
const L = { savedProducts: 10, alerts: 3 };
const empty: UserLists = { saved: [], alerts: [], collections: [] };

let r = planMerge(empty, { saved: [s('x'), s('y')], alerts: [a('x')], collections: [c('c1', 'Gifts', ['x'])] }, L);
check('empty account takes everything from the device', r.added.saved === 2 && r.added.alerts === 1 && r.added.collections === 1 && r.skipped.saved === 0);
check('collection keeps products that are saved', r.merged.collections[0].productIds.join() === 'x');

r = planMerge({ saved: [s('x')], alerts: [], collections: [] }, { saved: [s('x'), s('y')], alerts: [], collections: [] }, L);
check('a product already in the account is not added twice', r.added.saved === 1 && r.merged.saved.length === 2);
check('the account items are untouched and keep their order', r.merged.saved[1].id === 'x');

const many = Array.from({ length: 12 }, (_, i) => s(`p${i}`));
r = planMerge({ saved: Array.from({ length: 8 }, (_, i) => s(`q${i}`)), alerts: [], collections: [] }, { saved: many, alerts: [], collections: [] }, L);
check('limits: only the first items that fit are added (2 of 12)', r.added.saved === 2 && r.skipped.saved === 10 && r.merged.saved.length === 10);
r = planMerge({ saved: [], alerts: [a('1'), a('2')], collections: [] }, { saved: [], alerts: [a('3'), a('4')], collections: [] }, L);
check('alert limit of 3: one added, one skipped', r.added.alerts === 1 && r.skipped.alerts === 1 && r.merged.alerts.length === 3);

r = planMerge({ saved: [], alerts: [], collections: [c('c9', 'gifts', [])] }, { saved: [], alerts: [], collections: [c('c1', 'Gifts', []), c('c2', 'Home', [])] }, L);
check('collections with the same name (any case) are not duplicated', r.added.collections === 1 && r.merged.collections.map((x) => x.name).join() === 'gifts,Home');
r = planMerge({ saved: [], alerts: [], collections: [c('c1', 'A', [])] }, { saved: [], alerts: [], collections: [c('c1', 'B', [])] }, L);
check('collection ids stay unique', new Set(r.merged.collections.map((x) => x.id)).size === 2);
check('nothing on the device -> nothing added', (() => { const q = planMerge({ saved: [s('x')], alerts: [], collections: [] }, empty, L); return q.added.saved === 0 && q.merged.saved.length === 1; })());
check('signature is stable and order independent', deviceSignature({ saved: [s('b'), s('a')], alerts: [], collections: [] }) === deviceSignature({ saved: [s('a'), s('b')], alerts: [], collections: [] }));
check('isEmptyLists', isEmptyLists(empty) && !isEmptyLists({ saved: [s('x')], alerts: [], collections: [] }));
process.exit(bad ? 1 : 0);

// Run: npx tsx tests/unit_collections_similar.ts
import { pruneCollections, validateCollections, toggleInCollection, explainCollectionName } from '../src/utils/collections';
import { findSimilar } from '../src/utils/similar';
const checks: [string, boolean][] = [];
const c = [{ id: '1', name: 'A', productIds: ['x', 'y'] }, { id: '2', name: 'B', productIds: ['y'] }];
checks.push(['prune drops unsaved ids', JSON.stringify(pruneCollections(c, ['x']).map((k) => k.productIds)) === '[["x"],[]]']);
checks.push(['prune returns same array when unchanged', pruneCollections(c, ['x', 'y']) === c]);
checks.push(['toggle add/remove', toggleInCollection(c, '2', 'z')[1].productIds.join() === 'y,z' && toggleInCollection(c, '1', 'x')[0].productIds.join() === 'y']);
checks.push(['validate rejects non-array', validateCollections({}) === null]);
checks.push(['validate cleans entries', validateCollections([{ id: 'a', name: ' Hi ', productIds: ['p', 'p', 3] }, { id: 'a', name: 'dup', productIds: [] }, null, { id: 'b', name: '', productIds: [] }])!.length === 1]);
checks.push(['name: empty/dup/long/limit', explainCollectionName('', c) === 'empty' && explainCollectionName('a', c) === 'duplicate' && explainCollectionName('x'.repeat(31), c) === 'too-long' && explainCollectionName('a', c, '1') === null]);
const cat = [{ id: 'a', category: 'TV' }, { id: 'b', category: 'tv' }, { id: 'c', category: 'Audio' }, { id: 'e' }];
checks.push(['similar same category, not self', findSimilar(cat, cat[0]).map((p) => p.id).join() === 'b']);
checks.push(['similar empty when none / no category', findSimilar(cat, cat[2]).length === 0 && findSimilar(cat, cat[3]).length === 0]);
checks.forEach(([n, ok]) => console.log((ok ? 'PASS ' : 'FAIL ') + n));
process.exit(checks.every(([, ok]) => ok) ? 0 : 1);

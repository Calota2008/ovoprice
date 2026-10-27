// Run with: npx tsx tests/unit_share_list.ts
import { encodeList, decodeList, buildShareUrl, readSharedListFromLocation, SHARE_LIMITS } from '../src/utils/shareList';
let fails = 0;
const check = (n: string, ok: boolean) => { console.log((ok ? 'PASS ' : 'FAIL ') + n); if (!ok) fails++; };
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');

const rt = decodeList(encodeList({ name: 'Cadouri Crăciun ☃', productIds: ['a-1', 'b_2', 'a-1'] }));
check('round trip keeps unicode name and de-duplicates ids', rt?.name === 'Cadouri Crăciun ☃' && rt.productIds.join() === 'a-1,b_2');
check('link has no "=" padding or "+" "/"', !/[=+/]/.test(encodeList({ name: 'x?>~', productIds: ['a'] })));
const url = buildShareUrl({ origin: 'https://ovoprice.com', pathname: '/' }, { name: 'Wishlist', productIds: ['p1'] });
check('share url shape', url.startsWith('https://ovoprice.com/?list='));
check('read from location search', readSharedListFromLocation('?x=1&' + url.split('?')[1])?.name === 'Wishlist');
check('missing / empty / garbage -> null', decodeList(null) === null && decodeList('') === null && decodeList('%%%') === null && decodeList('abc') === null);
check('wrong version -> null', decodeList(b64({ v: 2, n: 'x', p: ['a'] })) === null);
check('no products -> null', decodeList(b64({ v: 1, n: 'x', p: [] })) === null);
check('empty / blank name -> null', decodeList(b64({ v: 1, n: '   ', p: ['a'] })) === null);
check('wrong types -> null', decodeList(b64({ v: 1, n: 5, p: ['a'] })) === null && decodeList(b64({ v: 1, n: 'x', p: 'a' })) === null);
check('invalid ids are dropped', decodeList(b64({ v: 1, n: 'x', p: ['ok', '../etc', '<script>', 'a b', 5, 'x'.repeat(81)] }))?.productIds.join() === 'ok');
check('all ids invalid -> null', decodeList(b64({ v: 1, n: 'x', p: ['<b>'] })) === null);
check('name is cut to the limit and control chars removed', decodeList(b64({ v: 1, n: 'a\u0000b' + 'z'.repeat(100), p: ['a'] }))!.name.length <= SHARE_LIMITS.maxNameLength && !/[\u0000-\u001f]/.test(decodeList(b64({ v: 1, n: 'a\u0000b', p: ['a'] }))!.name));
check('at most 50 products', decodeList(b64({ v: 1, n: 'x', p: Array.from({ length: 80 }, (_, i) => 'p' + i) }))!.productIds.length === SHARE_LIMITS.maxProducts);
check('huge input rejected', decodeList('a'.repeat(5000)) === null);
check('invalid UTF-8 -> null', decodeList(Buffer.from([0xff, 0xfe, 0xfd]).toString('base64url')) === null);
console.log(fails ? `\nFAILED: ${fails}` : '\nALL PASS'); process.exit(fails ? 1 : 0);

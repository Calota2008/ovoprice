// Runs the REAL source of the delete-account Edge Function with a fake Supabase client (no network).
// Run: npx tsx tests/unit_delete_account_fn.mts
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, '../supabase/functions/delete-account/index.ts'), 'utf8')
  .replace(/import \{ createClient \} from "npm:@supabase\/supabase-js@2";/, 'const createClient = (globalThis as any).__create;');
const tmp = path.join(os.tmpdir(), `fn_under_test_${process.pid}.mts`);
fs.writeFileSync(tmp, src);
let handler: any; const deleted: string[] = [];
(globalThis as any).Deno = { env: { get: (k: string) => ({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'srv' } as any)[k] }, serve: (h: any) => { handler = h; } };
(globalThis as any).__create = () => ({ auth: {
  getUser: async (t: string) => t === 'good.jwt' ? { data: { user: { id: 'U1' } }, error: null } : { data: { user: null }, error: { message: 'bad' } },
  admin: { deleteUser: async (id: string) => { deleted.push(id); return { error: null }; } } } });
await import(tmp);
fs.unlinkSync(tmp);
const call = async (m: string, h: Record<string, string> = {}) => { const r = await handler(new Request('https://f/', { method: m, headers: h })); return { s: r.status, o: r.headers.get('Access-Control-Allow-Origin') }; };
let fails = 0; const ck = (n: string, ok: boolean) => { console.log((ok ? 'PASS ' : 'FAIL ') + n); if (!ok) fails++; };
let r = await call('POST'); ck('no token -> 401, nothing deleted', r.s === 401 && !deleted.length);
r = await call('POST', { Authorization: 'Bearer sb_publishable_xxx' }); ck('publishable key -> 401, nothing deleted', r.s === 401 && !deleted.length);
r = await call('POST', { Authorization: 'Bearer aaa.bbb.ccc' }); ck('fake jwt -> 401, nothing deleted', r.s === 401 && !deleted.length);
r = await call('GET', { Authorization: 'Bearer good.jwt' }); ck('GET -> 405, nothing deleted', r.s === 405 && !deleted.length);
r = await call('OPTIONS', { Origin: 'https://evil.example' }); ck('preflight from unknown origin gets no allow-origin', r.s === 204 && r.o === null);
r = await call('OPTIONS', { Origin: 'https://ovoprice.com' }); ck('preflight from ovoprice.com allowed', r.s === 204 && r.o === 'https://ovoprice.com');
r = await call('POST', { Authorization: 'Bearer good.jwt' }); ck('valid session -> 200 and deletes ONLY that user', r.s === 200 && deleted.length === 1 && deleted[0] === 'U1');
process.exit(fails ? 1 : 0);

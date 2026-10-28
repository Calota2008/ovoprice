# Account sync of saved products, alerts and collections, with Supabase answers MOCKED (nothing is sent anywhere).
# Start: VITE_SUPABASE_GOOGLE= npx vite --port 5198 --strictPort --host 127.0.0.1   (default config = Supabase on)
# Run:   python3 tests/e2e_account_sync.py [base_url]
import json, re, sys
from playwright.sync_api import sync_playwright
U = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5198/'
fails = []
def check(n, ok):
    print(('PASS ' if ok else 'FAIL ') + n)
    if not ok: fails.append(n)
CORS = {'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*'}
UID = '11111111-1111-1111-1111-111111111111'
USER = {'id': UID, 'aud': 'authenticated', 'role': 'authenticated', 'email': 'anna.muster@example.com', 'email_confirmed_at': '2026-01-01T00:00:00Z', 'app_metadata': {}, 'user_metadata': {'country': 'DE', 'language': 'en'}, 'created_at': '2026-01-01T00:00:00Z'}
SESSION = {'access_token': 'a.b.c', 'token_type': 'bearer', 'expires_in': 3600, 'expires_at': 4102444800, 'refresh_token': 'r', 'user': USER}
SAVED_KEY, ALERTS_KEY = 'ovoprice_saved_products_v1', 'ovoprice_alerts_v1'
ACCT_SAVED = f'ovoprice_acct_{UID}_saved_v1'

def setup(pg, st):
    def handler(route):
        req = route.request; url = req.url
        if req.method == 'OPTIONS': return route.fulfill(status=204, headers=CORS)
        if '/auth/v1/user' in url: return route.fulfill(status=200, headers=CORS, content_type='application/json', body=json.dumps(USER))
        if '/auth/v1/logout' in url: return route.fulfill(status=204, headers=CORS)
        if '/rest/v1/profiles' in url:
            if req.method == 'GET': return route.fulfill(status=200, headers=CORS, content_type='application/json', body=json.dumps({'country': 'DE', 'language': 'en', 'display_name': None}))
            return route.fulfill(status=204, headers=CORS)
        if '/rest/v1/user_lists' in url:
            if req.method == 'GET':
                st['gets'] += 1
                if st.get('mode') == 'fail': return route.fulfill(status=500, headers=CORS, content_type='application/json', body='{"message":"boom"}')
                return route.fulfill(status=200, headers=CORS, content_type='application/json', body=json.dumps([st['row']] if st.get('row') else []))
            body = json.loads(req.post_data or '{}')
            if st.get('mode') == 'save-fail': return route.fulfill(status=500, headers=CORS, content_type='application/json', body='{"message":"boom"}')
            st['posts'].append(body); st['row'] = {k: body[k] for k in ('saved', 'alerts', 'collections')}
            return route.fulfill(status=201, headers=CORS)
        return route.continue_()
    pg.route('**/tvoytveusenqoxxrunjr.supabase.co/**', handler)

def item(i, pid=None): return {'id': i, 'productId': pid, 'title': f'Item {i}', 'currentPrice': 10, 'status': 'TRACKING'}
def sign_in(pg):
    pg.get_by_role('button', name='User Profile').click(); pg.get_by_role('banner').get_by_role('button', name='Sign in').click(); pg.wait_for_timeout(250)
    d = pg.get_by_role('dialog'); d.get_by_label('Email address').fill('anna.muster@example.com'); d.get_by_role('button', name=re.compile('Email me')).click(); pg.wait_for_timeout(300)
    d.get_by_label('6-digit code').fill('123456'); d.get_by_role('button', name='Verify and continue').click(); pg.wait_for_timeout(900)
def sign_out(pg):
    pg.get_by_role('button', name='User Profile').click(); pg.get_by_role('button', name='Sign out').first.click(); pg.wait_for_timeout(500)
def ls(pg, k): return pg.evaluate("(k)=>localStorage.getItem(k)", k)
def new_page(b, st, guest_saved=None, guest_alerts=None, collections=None):
    ctx = b.new_context(viewport={'width': 390, 'height': 900}, locale='en-US'); pg = ctx.new_page(); pg.on('pageerror', lambda e: ERRS.append(str(e)))
    # OTP + verify are mocked on top of the shared handler
    def auth(route):
        req = route.request
        if req.method == 'OPTIONS': return route.fulfill(status=204, headers=CORS)
        if '/auth/v1/otp' in req.url: return route.fulfill(status=200, headers=CORS, content_type='application/json', body='{}')
        if '/auth/v1/verify' in req.url: return route.fulfill(status=200, headers=CORS, content_type='application/json', body=json.dumps(SESSION))
        return route.fallback()
    setup(pg, st); pg.route('**/tvoytveusenqoxxrunjr.supabase.co/auth/v1/**', auth)
    init = "if(!sessionStorage.getItem('__seeded')){sessionStorage.setItem('__seeded','1');localStorage.setItem('ovoprice_lang_v1','en');"
    if guest_saved is not None: init += f"localStorage.setItem({SAVED_KEY!r},{json.dumps(json.dumps(guest_saved))});"
    if guest_alerts is not None: init += f"localStorage.setItem({ALERTS_KEY!r},{json.dumps(json.dumps(guest_alerts))});"
    if collections is not None: init += f"localStorage.setItem('ovoprice_collections_v1',{json.dumps(json.dumps(collections))});"
    pg.add_init_script(init + "}")
    return ctx, pg
ERRS = []
def saved_page(pg): pg.get_by_role('navigation', name='Main Navigation').get_by_role('button', name='Saved').click(); pg.wait_for_timeout(400)
def alert_obj(pid): return {'id': f'alert-{pid}', 'productId': pid, 'title': pid, 'targetPrice': 50, 'currentPrice': 60, 'previousPrice': 65, 'status': 'WATCHING', 'isUnread': False, 'createdAt': '2026-10-01T10:00:00.000Z'}

with sync_playwright() as p:
    b = p.chromium.launch()
    # 1) guest data + empty account: the offer appears, nothing is uploaded before the person agrees
    st = {'gets': 0, 'posts': [], 'row': None}
    ctx, pg = new_page(b, st, guest_saved=[item('g1'), item('g2')], guest_alerts=[alert_obj('g1')], collections=[{'id': 'c1', 'name': 'Gifts', 'productIds': ['g1']}])
    pg.goto(U); pg.wait_for_timeout(700); sign_in(pg)
    sheet = pg.get_by_test_id('merge-sheet')
    check('1: offer shown after sign-in with the device counts', sheet.count() == 1 and sheet.get_by_text('Add what you saved on this device to your account?').count() == 1 and sheet.locator('dd').all_inner_texts() == ['2', '1', '1'])
    check('1: the account was read, nothing uploaded yet', st['gets'] >= 1 and not st['posts'])
    saved_page(pg) if False else None
    sheet.get_by_role('button', name='Add to my account').click(); pg.wait_for_timeout(1500)
    check('1: after "Add" the account row holds the device items', len(st['posts']) == 1 and [x['id'] for x in st['posts'][0]['saved']] == ['g1', 'g2'] and len(st['posts'][0]['alerts']) == 1 and st['posts'][0]['collections'][0]['name'] == 'Gifts' and st['posts'][0]['user_id'] == UID)
    check('1: sheet closed; device (guest) data is untouched', pg.get_by_test_id('merge-sheet').count() == 0 and len(json.loads(ls(pg, SAVED_KEY))) == 2)
    saved_page(pg)
    check('1: Saved shows "Saved to your account"', pg.get_by_text(re.compile('Saved to your account')).count() == 1 and pg.get_by_text('Item g1').count() >= 1)
    # an edit on the account is sent
    pg.get_by_role('button', name='Remove from saved').first.click(); pg.wait_for_timeout(1500)
    check('1: removing a product is synced', len(st['posts']) == 2 and len(st['posts'][-1]['saved']) == 1)
    # sign out: the device's own list comes back, the account copy leaves the device
    sign_out(pg); saved_page(pg) if False else None
    pg.get_by_role('navigation', name='Main Navigation').get_by_role('button', name='Saved').click(); pg.wait_for_timeout(400)
    check('1: sign-out shows the device list again (both items)', pg.get_by_text('Item g1').count() >= 1 and pg.get_by_text('Item g2').count() >= 1)
    check('1: the account copy is removed from the device at sign-out', ls(pg, ACCT_SAVED) is None)
    # signing in again: same device data, already answered -> no second offer; account data (1 item) is shown
    sign_in(pg)
    check('1: no second offer for the same device data', pg.get_by_test_id('merge-sheet').count() == 0)
    pg.get_by_role('navigation', name='Main Navigation').get_by_role('button', name='Saved').click(); pg.wait_for_timeout(400)
    check('1: account data is shown after signing in again (1 item)', pg.get_by_text('Item g2').count() >= 1 and pg.get_by_text('Item g1').count() == 0)
    check('1: no page errors', not ERRS); ctx.close()

    # 2) "Not now": nothing is uploaded, the account stays empty, the device keeps its data
    st = {'gets': 0, 'posts': [], 'row': None}
    ctx, pg = new_page(b, st, guest_saved=[item('g1')])
    pg.goto(U); pg.wait_for_timeout(700); sign_in(pg)
    pg.get_by_test_id('merge-sheet').get_by_role('button', name='Not now').click(); pg.wait_for_timeout(1200)
    check('2: Not now: nothing uploaded', not st['posts'] and pg.get_by_test_id('merge-sheet').count() == 0)
    saved_page(pg)
    check('2: account list is empty while signed in', pg.get_by_text('Item g1').count() == 0)
    check('2: device data still stored', len(json.loads(ls(pg, SAVED_KEY))) == 1)
    sign_out(pg)
    pg.get_by_role('navigation', name='Main Navigation').get_by_role('button', name='Saved').click(); pg.wait_for_timeout(400)
    check('2: after sign-out the device list is back', pg.get_by_text('Item g1').count() >= 1)
    ctx.close()

    # 3) account has data, device is empty: no offer, account data shown
    st = {'gets': 0, 'posts': [], 'row': {'saved': [item('r1'), item('r2')], 'alerts': [], 'collections': []}}
    ctx, pg = new_page(b, st)
    pg.goto(U); pg.wait_for_timeout(700); sign_in(pg)
    saved_page(pg)
    check('3: no offer when the device has nothing', pg.get_by_test_id('merge-sheet').count() == 0)
    check('3: account items are shown', pg.get_by_text('Item r1').count() >= 1 and pg.get_by_text('Item r2').count() >= 1)
    check('3: reading the account does not write it back', not st['posts'])
    # session restored on reload (the returning visitor)
    pg.reload(); pg.wait_for_timeout(1500); saved_page(pg)
    check('3: after a reload the account items are there again', pg.get_by_text('Item r1').count() >= 1 and not st['posts'])
    ctx.close()

    # 4) limits when adding device data to an account that is nearly full
    st = {'gets': 0, 'posts': [], 'row': {'saved': [item(f'r{i}') for i in range(9)], 'alerts': [], 'collections': []}}
    ctx, pg = new_page(b, st, guest_saved=[item('g1'), item('g2'), item('g3')])
    pg.goto(U); pg.wait_for_timeout(700); sign_in(pg)
    sheet = pg.get_by_test_id('merge-sheet')
    check('4: only what fits is offered (1 of 3) and the rest is explained', sheet.locator('dd').all_inner_texts() == ['1'] and sheet.get_by_text('2 items do not fit under the limits and stay only on this device.').count() == 1)
    sheet.get_by_role('button', name='Add to my account').click(); pg.wait_for_timeout(1500)
    check('4: the account ends with exactly 10 saved', len(st['posts'][-1]['saved']) == 10)
    ctx.close()

    # 5) account cannot be reached: honest message, no upload; works after "Try again"
    st = {'gets': 0, 'posts': [], 'row': {'saved': [item('r1')], 'alerts': [], 'collections': []}, 'mode': 'fail'}
    ctx, pg = new_page(b, st)
    pg.goto(U); pg.wait_for_timeout(700); sign_in(pg); saved_page(pg)
    check('5: unreachable account is explained, with Try again', pg.get_by_text('Could not reach your account.', exact=False).count() == 1 and pg.get_by_role('button', name='Try again').count() == 1)
    check('5: nothing is written while the account was not read', not st['posts'])
    st['mode'] = 'ok'; pg.get_by_role('button', name='Try again').click(); pg.wait_for_timeout(1200)
    check('5: Try again reads the account', pg.get_by_text('Item r1').count() >= 1 and pg.get_by_text(re.compile('Saved to your account')).count() == 1)
    ctx.close()

    # 6) a save failure shows the error and keeps the change on the device
    st = {'gets': 0, 'posts': [], 'row': {'saved': [item('r1'), item('r2')], 'alerts': [], 'collections': []}}
    ctx, pg = new_page(b, st)
    pg.goto(U); pg.wait_for_timeout(700); sign_in(pg); saved_page(pg)
    st['mode'] = 'save-fail'
    pg.get_by_role('button', name='Remove from saved').first.click(); pg.wait_for_timeout(1500)
    check('6: failed upload is explained', pg.get_by_text('Could not reach your account.', exact=False).count() == 1)
    check('6: the change stays on the device (1 item cached)', len(json.loads(ls(pg, ACCT_SAVED))) == 1)
    ctx.close()
    check('no page errors', not ERRS)
    b.close()
print('\nFAILED: %d' % len(fails) if fails else '\nALL PASS'); sys.exit(1 if fails else 0)

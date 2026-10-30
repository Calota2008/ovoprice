# PC: "See all" (price drops / new products) in 3 columns; photo result and shared list in a medium reading width.
# Phones unchanged. Needs: VITE_SUPABASE_URL= VITE_CONTACT_EMAIL= npx vite --port 5199 --host 127.0.0.1
import re, sys, json, base64, os, tempfile
from playwright.sync_api import sync_playwright
U = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5199/'
fails = []
def check(n, ok):
    print(('PASS ' if ok else 'FAIL ') + n)
    if not ok: fails.append(n)
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')
tmp = os.path.join(tempfile.mkdtemp(), 'p.png'); open(tmp, 'wb').write(PNG)
OK = {'objectName': 'Samsung TV', 'category': 'TV', 'description': 'd', 'observableCharacteristics': ['black'], 'retailerSearchQuery': 'samsung tv 55', 'alternatives': []}
with sync_playwright() as p:
    b = p.chromium.launch()
    for w, label in [(1280, 'PC'), (390, 'phone')]:
        ctx = b.new_context(viewport={'width': w, 'height': 900}); pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.add_init_script("localStorage.setItem('ovoprice_lang_v1','en')")
        for kind, tid in [('Price drops', 'see-all-drops'), ('New products', 'see-all-new')]:
            pg.goto(U); pg.wait_for_timeout(700)
            pg.get_by_role('button', name=f'See all: {kind}').click(); pg.wait_for_timeout(500)
            items = pg.get_by_test_id('see-all-list').locator('> li')
            ys = [round(items.nth(i).bounding_box()['y']) for i in range(min(3, items.count()))]
            if label == 'PC':
                check(f'PC "{kind}" see all: items side by side in a row', pg.get_by_test_id(tid).count() == 1 and len(ys) >= 2 and len(set(ys)) == 1)
                check(f'PC "{kind}": page uses the wide width', pg.locator('main').bounding_box()['width'] > 900)
            else:
                check(f'phone "{kind}": list one under the other as before', len(set(ys)) == len(ys))
        if label == 'PC':
            pg.goto(U); pg.wait_for_timeout(600); pg.get_by_role('button', name='See all: Price drops').click(); pg.wait_for_timeout(500)
            pg.get_by_test_id('see-all-list').get_by_role('button', name=re.compile('Compare prices')).and_(pg.locator(':enabled')).first.click(); pg.wait_for_timeout(600)
            check('PC see all: "Compare prices" opens the PC product page', pg.get_by_test_id('product-desktop').count() == 1)
            # photo result screen: medium width
            pg.route('**/api/analyze-image', lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps(OK)))
            pg.goto(U + '?previewAccount=1'); pg.wait_for_timeout(500)
            pg.get_by_role('button', name='User Profile').click(); pg.get_by_role('button', name='Create an account').first.click(); pg.wait_for_timeout(250)
            d = pg.get_by_role('dialog'); d.get_by_role('textbox').first.fill('anna.muster@example.com'); d.get_by_role('button', name=re.compile('Email me')).first.click(); pg.wait_for_timeout(400)
            pg.get_by_test_id('home-find-options').get_by_role('button').nth(2).click(); pg.wait_for_timeout(300)
            pg.get_by_test_id('photo-gallery-input').set_input_files(tmp); pg.wait_for_timeout(600)
            pg.get_by_role('button', name='Analyze Photo with Gemini').click(); pg.wait_for_timeout(1500)
            mw = pg.locator('main').bounding_box()['width']
            check(f'PC photo result: medium reading width ({int(mw)} px, wider than a phone, not full width)', 600 < mw <= 800 and pg.get_by_text('Samsung TV').count() >= 1)
        check(f'{label}: no horizontal overflow, no errors', pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth') and not errs)
        ctx.close()
    b.close()
print('\nFAILED: %d' % len(fails) if fails else '\nALL PASS'); sys.exit(1 if fails else 0)

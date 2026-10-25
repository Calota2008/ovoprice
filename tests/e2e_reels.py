"""E2E for the Reels module. Usage: python tests/e2e_reels.py [base_url]  (dev server must be running)."""
import re, sys
from playwright.sync_api import sync_playwright

U = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5199/'
fails = []
def check(name, ok):
    print(('PASS ' if ok else 'FAIL ') + name)
    if not ok: fails.append(name)

PRODUCTS = [('Dyson', 'Dyson V15'), ('Sony', 'Sony WH-1000XM5'), ('Samsung', 'Samsung Crystal'),
            ('Magnifica', "Magnifica"), ('Magcubic', 'Magcubic')]

def open_reels(pg):
    pg.goto(U); pg.wait_for_timeout(600)
    pg.get_by_role('button', name=re.compile('Discover Reels')).click(); pg.wait_for_timeout(700)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 430, 'height': 900}, has_touch=True)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    open_reels(pg)
    check('entry from Home opens Reels', pg.get_by_text('1 of 5').is_visible())
    check('no ReelCart branding left', pg.get_by_text(re.compile('ReelCart', re.I)).count() == 0)
    check('no invented discount/original price', pg.locator('text=/-\\d+%/').count() == 0 and pg.locator('.line-through').count() == 0)
    check('DEMO label visible', pg.get_by_text('DEMO').first.is_visible())
    check('demo preview labelled (no fake video)', pg.get_by_text(re.compile('no video yet')).is_visible())
    check('no mute button without video', pg.get_by_role('button', name=re.compile('Mute|Unmute')).count() == 0)
    check('no Share/More placeholder buttons', pg.get_by_label('Share product').count() == 0 and pg.get_by_label('More options').count() == 0)

    # navigation: buttons, keyboard, swipe
    pg.get_by_label('Next Reel').click(); pg.wait_for_timeout(200)
    check('next -> 2 of 5', pg.get_by_text('2 of 5').is_visible())
    pg.get_by_label('Previous Reel').click(); pg.wait_for_timeout(200)
    check('previous -> 1 of 5', pg.get_by_text('1 of 5').is_visible())
    pg.get_by_label('Previous Reel').click(); pg.wait_for_timeout(200)
    check('previous wraps -> 5 of 5', pg.get_by_text('5 of 5').is_visible())
    pg.keyboard.press('ArrowDown'); pg.wait_for_timeout(200)
    check('ArrowDown -> 1 of 5', pg.get_by_text('1 of 5').is_visible())
    cdp = ctx.new_cdp_session(pg)
    def swipe(y0, y1):
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': 200, 'y': y0}]})
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    def swipe2(y0, y1):
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': 200, 'y': y0}]})
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': 200, 'y': y1}]})
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    swipe2(500, 300); pg.wait_for_timeout(300)
    check('swipe up -> next (2 of 5)', pg.get_by_text('2 of 5').is_visible())
    swipe2(300, 500); pg.wait_for_timeout(300)
    check('swipe down -> previous (1 of 5)', pg.get_by_text('1 of 5').is_visible())
    swipe2(500, 480); pg.wait_for_timeout(300)
    check('tiny swipe ignored', pg.get_by_text('1 of 5').is_visible())

    # correct product per reel through Compare Prices / View Details
    for i, (key, label) in enumerate(PRODUCTS):
        open_reels(pg)
        for _ in range(i):
            pg.get_by_label('Next Reel').click(); pg.wait_for_timeout(120)
        title_ok = pg.get_by_role('heading', name=re.compile(key)).first.is_visible()
        pg.get_by_role('button', name='Compare Prices').click(); pg.wait_for_timeout(700)
        body = pg.inner_text('body')
        others = [k for k, _ in PRODUCTS if k != key and k in body]
        check(f'compare opens exact product: {key}', title_ok and key in body and not others)
        # open an offer -> redirect modal with a valid link
        card = pg.locator('[role=button], button').filter(has_text=re.compile('€')).first
        pg.go_back() if False else None
        pg.get_by_role('button', name=re.compile('Back|back')).first.click(); pg.wait_for_timeout(500)
        check(f'back from compare keeps same reel: {key}', pg.get_by_role('heading', name=re.compile(key)).first.is_visible())
        pg.get_by_role('button', name='View Details').click(); pg.wait_for_timeout(600)
        body = pg.inner_text('body')
        check(f'details open exact product: {key}', key in body and not [k for k, _ in PRODUCTS if k != key and k in body])

    # Save / persist / filters
    open_reels(pg)
    pg.get_by_label('Next Reel').click(); pg.wait_for_timeout(150)      # Sony
    pg.get_by_role('button', name='Save product').click(); pg.wait_for_timeout(200)
    check('save -> Saved state immediately', pg.get_by_role('button', name='Remove from Saved').is_visible())
    pg.reload(); pg.wait_for_timeout(600)
    pg.get_by_role('button', name=re.compile('Discover Reels')).click(); pg.wait_for_timeout(600)
    pg.get_by_label('Next Reel').click(); pg.wait_for_timeout(150)
    check('saved persists after reload', pg.get_by_role('button', name='Remove from Saved').is_visible())
    pg.get_by_role('tab', name='Saved Products').click(); pg.wait_for_timeout(300)
    check('Saved Products filter lists only saved (1 of 1)', pg.get_by_text('1 of 1').is_visible() and pg.get_by_role('heading', name=re.compile('Sony')).is_visible())
    pg.get_by_role('button', name='Remove from Saved').click(); pg.wait_for_timeout(300)
    check('unsave in saved tab -> empty state', pg.get_by_text(re.compile("haven't saved")).is_visible())
    pg.get_by_role('button', name='Back to For You').click(); pg.wait_for_timeout(300)
    check('back to For You shows all', pg.get_by_text('1 of 5').is_visible())
    pg.get_by_role('tab', name='Categories').click(); pg.wait_for_timeout(200)
    pg.get_by_role('button', name='HEADPHONES').click(); pg.wait_for_timeout(300)
    check('category filter works (1 of 1 Sony)', pg.get_by_text('1 of 1').is_visible() and pg.get_by_role('heading', name=re.compile('Sony')).is_visible())
    check('single reel hides prev/next', pg.get_by_label('Next Reel').count() == 0)
    pg.get_by_role('button', name='All', exact=True).click(); pg.wait_for_timeout(200)
    check('category All restores list', pg.get_by_text('1 of 5').is_visible())

    # Saved from Reel visible on Saved screen & corrupt storage
    pg.get_by_label('Next Reel').click(); pg.wait_for_timeout(150)
    pg.get_by_role('button', name='Save product').click(); pg.wait_for_timeout(200)
    pg.get_by_role('button', name=re.compile('^Saved$|Saved')).last.click(); pg.wait_for_timeout(500)
    check('Saved screen shows product saved from Reel', pg.get_by_text(re.compile('Sony')).first.is_visible())
    pg.evaluate("localStorage.setItem('ovoprice_saved_products_v1','{bad')")
    open_reels(pg)
    check('corrupt storage does not break Reels', pg.get_by_text('1 of 5').is_visible())
    check('no page errors', not errs)
    if errs: print(errs[:3])
    ctx.close(); b.close()
print('FAILED:', fails or 'none')
sys.exit(1 if fails else 0)

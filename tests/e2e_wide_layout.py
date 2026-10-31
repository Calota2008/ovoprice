# Wide screens (PC): top navigation instead of the bottom bar, Home in two columns, product rows as grids.
# The phone layout must stay as it was. Needs: VITE_SUPABASE_URL= VITE_CONTACT_EMAIL= npx vite --port 5199 --host 127.0.0.1
import re, sys
from playwright.sync_api import sync_playwright
fails = []
def check(n, ok):
    print(('PASS ' if ok else 'FAIL ') + n)
    if not ok: fails.append(n)
U = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5199/'
with sync_playwright() as p:
    b = p.chromium.launch()
    def page(w, h):
        pg = b.new_page(viewport={'width': w, 'height': h}); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.add_init_script("localStorage.setItem('ovoprice_lang_v1','en')")
        pg.goto(U); pg.wait_for_timeout(900); return pg, errs
    # ---- 1280 px
    pg, errs = page(1280, 900)
    nav = pg.get_by_role('navigation', name='Main Navigation')
    check('wide: one main navigation, inside the header', nav.count() == 1 and pg.locator('header nav').count() >= 1 and pg.locator('header').get_by_role('navigation', name='Main Navigation').count() == 1)
    check('wide: nav has Home, Search, Saved, Alerts, Reels', all(nav.get_by_role('button', name=n, exact=True).count() == 1 for n in ['Home', 'Search', 'Saved', 'Alerts', 'Reels']))
    check('wide: Home is marked as the current page', nav.get_by_role('button', name='Home', exact=True).get_attribute('aria-current') == 'page')
    box = pg.locator('main').bounding_box()
    check('wide: page is wide (more than a phone column)', box and box['width'] > 900)
    hero = pg.get_by_text('Scan / Find Product').first.bounding_box(); head = pg.get_by_role('heading', name=re.compile('The real price')).bounding_box()
    check('wide: headline and scan card sit side by side', hero and head and hero['x'] > head['x'] + head['width'] - 40 and abs(hero['y'] - head['y']) < 200)
    cards = pg.get_by_test_id('home-price-drops').locator('li')
    ys = [cards.nth(i).bounding_box()['y'] for i in range(cards.count())]
    check('wide: price-drop cards are in one row (grid)', len(ys) >= 3 and max(ys) - min(ys) < 4)
    check('wide: 6 reel thumbnails visible', pg.get_by_test_id('home-reel-thumbs').locator('> div:visible').count() == 6)
    check('wide: no horizontal overflow', pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
    nav.get_by_role('button', name='Saved', exact=True).click(); pg.wait_for_timeout(400)
    check('wide: nav works (Saved opens, marked current)', pg.get_by_role('heading', name='Saved products').count() == 1 and nav.get_by_role('button', name='Saved', exact=True).get_attribute('aria-current') == 'page')
    nav.get_by_role('button', name='Reels', exact=True).click(); pg.wait_for_timeout(600)
    check('wide: Reels opens from the top nav', pg.get_by_role('button', name='Next Reel').count() >= 1)
    check('wide: no page errors', not errs); pg.close()
    # ---- phone 390 px: as before
    pg, errs = page(390, 844)
    nav = pg.get_by_role('navigation', name='Main Navigation')
    check('phone: only the bottom bar is shown', nav.count() == 1 and pg.locator('header').get_by_role('navigation', name='Main Navigation').count() == 0)
    cards = pg.get_by_test_id('home-price-drops').locator('li')
    check('phone: rows still scroll sideways (3 reel thumbs, rail not a grid)', pg.get_by_test_id('home-reel-thumbs').locator('> div:visible').count() == 3 and cards.nth(1).bounding_box()['x'] > cards.nth(0).bounding_box()['x'] and abs(cards.nth(1).bounding_box()['y'] - cards.nth(0).bounding_box()['y']) < 4)
    check('phone: no horizontal overflow', pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
    check('phone: no page errors', not errs); pg.close()
    # ---- tablet 768 px: still the phone-style layout
    pg, errs = page(768, 900)
    check('tablet: bottom bar kept, no overflow', pg.get_by_role('navigation', name='Main Navigation').count() == 1 and pg.locator('header').get_by_role('navigation', name='Main Navigation').count() == 0 and pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
    b.close()
print('\nFAILED: %d' % len(fails) if fails else '\nALL PASS'); sys.exit(1 if fails else 0)

# "See all" lists for Price drops and New products (demo). Needs: VITE_SUPABASE_URL= VITE_CONTACT_EMAIL= npx vite --port 5199 --host 127.0.0.1
import re, sys
from playwright.sync_api import sync_playwright
U = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5199/'
fails = []
def check(n, ok):
    print(('PASS ' if ok else 'FAIL ') + n)
    if not ok: fails.append(n)
def names(pg, tid):
    return pg.get_by_test_id(tid).locator('li p.font-bold').all_inner_texts()
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 390, 'height': 900}); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script("localStorage.setItem('ovoprice_lang_v1','en')")
    pg.goto(U); pg.wait_for_timeout(800)
    check('both rows have a "See all" link', pg.get_by_role('button', name=re.compile('See all')).count() == 2)
    h = pg.get_by_role('button', name='See all: Price drops').bounding_box()
    check('"See all" is at least 44 px tall', h['height'] >= 44)
    pg.get_by_role('button', name='See all: Price drops').click(); pg.wait_for_timeout(500)
    check('Price drops list opens with title and back', pg.get_by_test_id('see-all-drops').count() == 1 and pg.get_by_role('button', name='Go back').count() == 1)
    check('shows 3 products and the example note', len(names(pg, 'see-all-drops')) == 3 and pg.get_by_text('3 products · example items, not real offers').count() == 1)
    check('default order = biggest discount (De\'Longhi -38% first)', names(pg, 'see-all-drops')[0].startswith("De'Longhi"))
    pg.get_by_role('button', name='Lowest price').click()
    check('lowest price order (Bosch 139 first)', names(pg, 'see-all-drops')[0].startswith('Bosch') and pg.get_by_role('button', name='Lowest price').get_attribute('aria-pressed') == 'true')
    pg.get_by_role('button', name='Category').click()
    check('category order (Coffee first)', 'Magnifica' in names(pg, 'see-all-drops')[0])
    btns = pg.get_by_test_id('see-all-drops').locator('li button')
    check('every product has Compare prices + Details, min 44 px', btns.count() == 6 and all(x.bounding_box()['height'] >= 44 for x in btns.all()))
    check('no horizontal page overflow', pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
    pg.get_by_role('button', name=re.compile('^Compare prices: Sony')).click(); pg.wait_for_timeout(700)
    check('Compare prices goes straight to the offers', pg.get_by_text(re.compile('offers|Offers')).count() >= 1 and pg.get_by_test_id('see-all-drops').count() == 0)
    pg.get_by_role('button', name='Go back').click(); pg.wait_for_timeout(400)
    check('back returns to the list', pg.get_by_test_id('see-all-drops').count() == 1)
    pg.get_by_role('button', name=re.compile('^Details: Sony')).click(); pg.wait_for_timeout(700)
    check('Details opens the product page', pg.get_by_role('heading', name='Product Details').count() == 1)
    pg.get_by_role('button', name='Go back').click(); pg.wait_for_timeout(300); pg.get_by_role('button', name='Go back').click(); pg.wait_for_timeout(400)
    check('back twice returns Home', pg.get_by_test_id('home-price-drops').count() == 1)
    pg.get_by_role('button', name='See all: New products').click(); pg.wait_for_timeout(500)
    check('New products list: 2 items, NEW badges, no prices', len(names(pg, 'see-all-new')) == 2 and pg.get_by_test_id('see-all-new').get_by_text('NEW', exact=True).count() == 2 and pg.get_by_test_id('see-all-new').get_by_text(re.compile('€')).count() == 0)
    dis = pg.get_by_test_id('see-all-new').locator('li', has_text='Samsung').locator('button[disabled]')
    check('item without catalog details has disabled buttons and a note', dis.count() == 2 and pg.get_by_text('Details are not available for this example yet.').count() >= 1)
    check('Demo data note is shown', pg.get_by_text("Demo data. Always check the final price on the merchant's website.").count() == 1)
    # German
    pg.close(); pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script("localStorage.setItem('ovoprice_lang_v1','de')"); pg.goto(U); pg.wait_for_timeout(800)
    pg.get_by_role('button', name=re.compile('Alle ansehen')).first.click(); pg.wait_for_timeout(500)
    check('German: title, sort chip and buttons', pg.get_by_role('button', name='Größter Rabatt').count() == 1 and pg.get_by_role('button', name=re.compile('^Preise vergleichen')).count() >= 1)
    check('no page errors', not errs)
    b.close()
print('\nFAILED: %d' % len(fails) if fails else '\nALL PASS'); sys.exit(1 if fails else 0)

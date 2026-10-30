# PC search (1024 px and up): filters on the left, products in a 3-column grid. Phone layout unchanged.
# Needs: VITE_SUPABASE_URL= VITE_CONTACT_EMAIL= npx vite --port 5199 --host 127.0.0.1
import re, sys
from playwright.sync_api import sync_playwright
U = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5199/'
fails = []
def check(n, ok):
    print(('PASS ' if ok else 'FAIL ') + n)
    if not ok: fails.append(n)
def prices(pg):
    g = pg.get_by_test_id('search-desktop-grid').locator('li')
    return [float(re.search(r'(\d+),(\d\d) €', g.nth(i).inner_text()).group(0)[:-2].replace(',', '.')) for i in range(g.count())]
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1280, 'height': 900}); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script("localStorage.setItem('ovoprice_lang_v1','en')")
    pg.goto(U); pg.wait_for_timeout(800)
    pg.get_by_role('navigation', name='Main Navigation').get_by_role('button', name='Search', exact=True).click(); pg.wait_for_timeout(400)
    pg.get_by_role('searchbox').fill('o'); pg.wait_for_timeout(700)
    grid = pg.get_by_test_id('search-desktop-grid').locator('li')
    check('PC: sidebar + grid shown', pg.get_by_test_id('search-desktop').count() == 1 and grid.count() == 5)
    ys = sorted(set(round(grid.nth(i).bounding_box()['y']) for i in range(grid.count())))
    check('PC: 3 per row (5 products -> 2 rows)', len(ys) == 2)
    pr = prices(pg); check(f'PC: sorted lowest first {pr}', pr == sorted(pr))
    pg.get_by_role('combobox', name='Sort').select_option('savings'); pg.wait_for_timeout(300)
    check('PC: sort can be changed', pg.get_by_role('combobox', name='Sort').input_value() == 'savings')
    pg.get_by_role('combobox', name='Sort').select_option('lowest'); pg.wait_for_timeout(200)
    side = pg.get_by_role('complementary', name='Filters')
    side.get_by_role('checkbox').first.check(); pg.wait_for_timeout(300)
    check('PC: category filter narrows the list', 0 < grid.count() < 5)
    side.get_by_role('button', name='Clear filters').click(); pg.wait_for_timeout(300)
    check('PC: clear filters shows all again', grid.count() == 5)
    pg.get_by_label('Maximum price').fill('300'); pg.wait_for_timeout(300)
    check('PC: max price filter', grid.count() >= 1 and all(x <= 300 for x in prices(pg)))
    pg.get_by_label('Minimum price').fill('280'); pg.wait_for_timeout(300)
    check('PC: min + max price filter', all(280 <= x <= 300 for x in prices(pg)) and grid.count() >= 1)
    pg.get_by_label('Minimum price').fill('9999'); pg.wait_for_timeout(300)
    check('PC: nothing matches -> message, not an empty page', pg.get_by_text('No products match the selected filter.').count() == 1)
    side.get_by_role('button', name='Clear filters').click(); pg.wait_for_timeout(300)
    side.get_by_role('checkbox', name='Free shipping only').check(); pg.wait_for_timeout(300)
    n_free = grid.count(); check('PC: free shipping filter works', 0 < n_free <= 5)
    side.get_by_role('button', name='Clear filters').click(); pg.wait_for_timeout(300)
    side.get_by_role('checkbox', name='OTTO').check(); pg.wait_for_timeout(300)
    check('PC: store filter works', 0 < grid.count() <= 5)
    side.get_by_role('button', name='Clear filters').click(); pg.wait_for_timeout(300)
    check('PC: no horizontal overflow', pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
    grid.first.get_by_role('button').click(); pg.wait_for_timeout(600)
    check('PC: a product opens the PC product page', pg.get_by_test_id('product-desktop').count() == 1)
    check('PC: no page errors', not errs); ctx.close()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}); pg = ctx.new_page()
    pg.add_init_script("localStorage.setItem('ovoprice_lang_v1','en')")
    pg.goto(U); pg.wait_for_timeout(800)
    pg.get_by_role('navigation', name='Main Navigation').get_by_role('button', name='Search', exact=True).click(); pg.wait_for_timeout(400)
    pg.get_by_role('searchbox').fill('o'); pg.wait_for_timeout(700)
    check('phone: list layout as before (no sidebar)', pg.get_by_test_id('search-desktop').count() == 0 and pg.get_by_role('button', name=re.compile('Free shipping')).count() == 1)
    ctx.close(); b.close()
print('\nFAILED: %d' % len(fails) if fails else '\nALL PASS'); sys.exit(1 if fails else 0)

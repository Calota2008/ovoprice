# PC product page (1024 px and up): summary, offers table, history, quick alert, stores. Phone layout unchanged.
# Needs: VITE_SUPABASE_URL= VITE_CONTACT_EMAIL= npx vite --port 5199 --host 127.0.0.1
import re, sys
from playwright.sync_api import sync_playwright
U = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5199/'
fails = []
def check(n, ok):
    print(('PASS ' if ok else 'FAIL ') + n)
    if not ok: fails.append(n)

def open_sony(pg):
    pg.goto(U); pg.wait_for_timeout(800)
    pg.get_by_role('button', name='Search', exact=True).first.click(); pg.wait_for_timeout(400)
    pg.locator('main').get_by_text('Sony WH-1000XM5').first.click(); pg.wait_for_timeout(500)
    pg.locator('main').get_by_text('Sony WH-1000XM5 Noise Cancelling').first.click(); pg.wait_for_timeout(700)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1280, 'height': 900}); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script("localStorage.setItem('ovoprice_lang_v1','en')")
    open_sony(pg)
    check('PC: desktop product layout shown', pg.get_by_test_id('product-desktop').count() == 1)
    check('PC: page uses the wide width', pg.locator('main').bounding_box()['width'] > 900)
    rows = pg.get_by_test_id('desktop-offers-table').locator('tbody tr')
    check('PC: offers table has 4 offers', rows.count() == 4)
    totals = [float(re.search(r'(\d+),(\d\d) €', rows.nth(i).locator('td').nth(3).inner_text()).group(0).replace(' €','').replace(',','.')) for i in range(rows.count())]
    check(f'PC: sorted by total price {totals}', totals == sorted(totals))
    check('PC: best price at top = big price', pg.get_by_test_id('desktop-best-price').inner_text().startswith('289,00'))
    check('PC: first row marked BEST', 'BEST' in rows.nth(0).inner_text())
    check('PC: price note says order is not by commission', pg.get_by_text(re.compile('not by commission')).count() == 1)
    check('PC: price history chart shown', pg.get_by_role('img', name='Price history').count() == 1)
    check('PC: where-to-look stores shown', pg.get_by_test_id('stores-for-product').count() == 1)
    check('PC: no horizontal overflow', pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
    # go to store -> redirect dialog
    rows.nth(1).get_by_role('button', name=re.compile('Go to Amazon')).click(); pg.wait_for_timeout(400)
    check('PC: "To the store" opens the leave-site dialog for that store', pg.get_by_text(re.compile('Proceed to', re.I)).count() >= 1 and pg.get_by_text(re.compile('Amazon')).count() >= 1)
    pg.get_by_role('button', name='Close', exact=True).first.click(); pg.wait_for_timeout(300)
    # save
    pg.get_by_test_id('product-desktop').get_by_role('button', name='Save', exact=True).click(); pg.wait_for_timeout(300)
    check('PC: Save works', pg.get_by_test_id('product-desktop').get_by_role('button', name='Saved', exact=True).get_attribute('aria-pressed') == 'true')
    # store name -> offer details
    rows.nth(2).get_by_role('button', name=re.compile('MediaMarkt')).first.click(); pg.wait_for_timeout(500)
    check('PC: store name opens offer details', pg.get_by_test_id('product-desktop').count() == 0)
    open_sony(pg)
    # quick alert
    pg.get_by_test_id('desktop-alert-input').fill('270')
    pg.get_by_role('button', name='Set', exact=True).click(); pg.wait_for_timeout(600)
    check('PC: quick alert creates the alert and opens Alerts', pg.get_by_text(re.compile('270,00')).count() >= 1 and pg.get_by_test_id('product-desktop').count() == 0)
    open_sony(pg)
    check('PC: alert box now shows the saved target and "Update"', pg.get_by_test_id('desktop-alert-input').input_value() == '270' and pg.get_by_role('button', name='Update', exact=True).count() == 1)
    pg.get_by_role('button', name='See full history').click(); pg.wait_for_timeout(500)
    check('PC: "See full history" opens the history screen', pg.get_by_test_id('product-desktop').count() == 0)
    check('PC: no page errors', not errs); ctx.close()
    # phone: unchanged
    ctx = b.new_context(viewport={'width': 390, 'height': 844}); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script("localStorage.setItem('ovoprice_lang_v1','en')")
    open_sony(pg)
    check('phone: old product layout (no desktop view)', pg.get_by_test_id('product-desktop').count() == 0 and pg.get_by_role('button', name=re.compile('Compare offers')).count() == 1)
    check('phone: no overflow, no errors', pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth') and not errs); ctx.close()
    b.close()
print('\nFAILED: %d' % len(fails) if fails else '\nALL PASS'); sys.exit(1 if fails else 0)

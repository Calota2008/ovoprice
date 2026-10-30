# PC: offer details, comparison (= product page with the offers table), price history, set alert. Phone unchanged.
# Needs: VITE_SUPABASE_URL= VITE_CONTACT_EMAIL= npx vite --port 5199 --host 127.0.0.1
import re, sys
from playwright.sync_api import sync_playwright
U = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5199/'
fails = []
def check(n, ok):
    print(('PASS ' if ok else 'FAIL ') + n)
    if not ok: fails.append(n)
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1280, 'height': 900}); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script("localStorage.setItem('ovoprice_lang_v1','en')")
    def product():
        pg.goto(U); pg.wait_for_timeout(700)
        pg.get_by_role('navigation', name='Main Navigation').get_by_role('button', name='Search', exact=True).click(); pg.wait_for_timeout(300)
        pg.get_by_role('searchbox').fill('sony'); pg.wait_for_timeout(700)
        pg.get_by_test_id('search-desktop-grid').locator('button').first.click(); pg.wait_for_timeout(700)
    product()
    pg.get_by_test_id('desktop-offers-table').get_by_role('button', name=re.compile('Amazon')).first.click(); pg.wait_for_timeout(600)
    check('PC details: two-column layout', pg.get_by_test_id('breakdown-desktop').count() == 1)
    check('PC details: final price of the chosen offer (299,00 €)', pg.get_by_test_id('breakdown-final-price').inner_text().startswith('299,00'))
    check('PC details: no fixed bottom bar on PC', pg.locator('.fixed.bottom-0').count() == 0)
    pg.get_by_role('button', name=re.compile('^MediaMarkt')).click(); pg.wait_for_timeout(400)
    check('PC details: "Other offers" switches the offer (311,99 €)', pg.get_by_test_id('breakdown-final-price').inner_text().startswith('311,99'))
    pg.get_by_test_id('breakdown-desktop').get_by_role('button', name='Go to store').click(); pg.wait_for_timeout(400)
    check('PC details: "Go to store" opens the leave-site dialog', pg.get_by_text(re.compile('Proceed to', re.I)).count() >= 1)
    pg.get_by_role('button', name='Close', exact=True).first.click(); pg.wait_for_timeout(300)
    pg.get_by_role('button', name=re.compile('Back to the comparison')).click(); pg.wait_for_timeout(500)
    check('PC details: back to the comparison -> product page with offers table', pg.get_by_test_id('desktop-offers-table').count() == 1)
    pg.get_by_test_id('product-desktop').get_by_role('button', name='See full history').click(); pg.wait_for_timeout(600)
    check('PC history: wide layout', pg.get_by_test_id('history-desktop').count() == 1 and pg.locator('main').bounding_box()['width'] > 900)
    pg.get_by_role('button', name=re.compile('Set target price alert')).click(); pg.wait_for_timeout(1300)
    check('PC history: alert from the history works (Alerts opens)', pg.get_by_test_id('alerts-desktop').count() == 1 and pg.get_by_test_id('alerts-desktop-table').locator('tbody tr').count() == 1)
    product()
    pg.get_by_test_id('product-desktop').get_by_role('button', name='Price alert', exact=True).click(); pg.wait_for_timeout(600)
    check('PC set alert: two-column layout', pg.get_by_test_id('set-alert-desktop').count() == 1)
    pg.get_by_role('button', name=re.compile(r'-10%')).click(); pg.wait_for_timeout(200)
    pg.get_by_role('button', name=re.compile('Set price alert')).click(); pg.wait_for_timeout(1300)
    check('PC set alert: saves the -10% target (260,10 €)', pg.get_by_text(re.compile('260,10')).count() >= 1 and pg.get_by_test_id('alerts-desktop').count() == 1)
    check('PC: no horizontal overflow', pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
    check('PC: no page errors', not errs); ctx.close()
    # phone: the comparison is still its own screen, details keep the bottom bar
    ctx = b.new_context(viewport={'width': 390, 'height': 844}); pg = ctx.new_page()
    pg.add_init_script("localStorage.setItem('ovoprice_lang_v1','en')")
    pg.goto(U); pg.wait_for_timeout(800)
    pg.get_by_role('button', name='Search', exact=True).first.click(); pg.wait_for_timeout(400)
    pg.locator('main').get_by_text('Sony WH-1000XM5').first.click(); pg.wait_for_timeout(500)
    pg.locator('main').get_by_text('Sony WH-1000XM5 Noise Cancelling').first.click(); pg.wait_for_timeout(600)
    pg.get_by_role('button', name=re.compile('Compare offers')).click(); pg.wait_for_timeout(600)
    check('phone: comparison screen as before (no PC product page)', pg.get_by_test_id('product-desktop').count() == 0 and pg.get_by_test_id('desktop-offers-table').count() == 0)
    ctx.close(); b.close()
print('\nFAILED: %d' % len(fails) if fails else '\nALL PASS'); sys.exit(1 if fails else 0)

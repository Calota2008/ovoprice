# PC Alerts (1024 px and up): alerts as a table, a banner when a target is reached, help on the right. Phone unchanged.
# Needs: VITE_SUPABASE_URL= VITE_CONTACT_EMAIL= npx vite --port 5199 --host 127.0.0.1
import re, sys
from playwright.sync_api import sync_playwright
U = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5199/'
fails = []
def check(n, ok):
    print(('PASS ' if ok else 'FAIL ') + n)
    if not ok: fails.append(n)
def set_alert(pg, price):
    nav = pg.get_by_role('navigation', name='Main Navigation')
    nav.get_by_role('button', name='Search', exact=True).click(); pg.wait_for_timeout(300)
    pg.get_by_role('searchbox').fill('sony'); pg.wait_for_timeout(700)
    pg.get_by_test_id('search-desktop-grid').locator('button').first.click(); pg.wait_for_timeout(700)
    pg.get_by_test_id('desktop-alert-input').fill(price)
    pg.get_by_role('button', name=re.compile('^(Set|Update)$')).click(); pg.wait_for_timeout(700)
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1280, 'height': 900}); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script("localStorage.setItem('ovoprice_lang_v1','en')")
    pg.goto(U); pg.wait_for_timeout(800)
    pg.get_by_role('navigation', name='Main Navigation').get_by_role('button', name='Alerts', exact=True).click(); pg.wait_for_timeout(400)
    check('PC: empty alerts in the wide layout', pg.get_by_test_id('alerts-desktop').count() == 1 and pg.get_by_text('You have no alerts').count() == 1)
    check('PC: honest "how it works" note on the right', pg.get_by_text('How it works now').count() == 1)
    set_alert(pg, '270')
    rows = pg.get_by_test_id('alerts-desktop-table').locator('tbody tr')
    check('PC: alert listed in a table', rows.count() == 1 and '270,00 €' in rows.first.inner_text() and '289,00 €' in rows.first.inner_text())
    check('PC: shows how much is left (19,00 € to go)', '19,00 € to go' in rows.first.inner_text())
    check('PC: no "target reached" banner yet', pg.get_by_test_id('alerts-reached-banner').count() == 0)
    set_alert(pg, '300')
    check('PC: target above the price -> banner + "Target reached"', pg.get_by_test_id('alerts-reached-banner').count() == 1 and 'Target reached' in pg.get_by_test_id('alerts-desktop-table').inner_text())
    check('PC: no horizontal overflow', pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
    pg.get_by_test_id('alerts-reached-banner').get_by_role('button', name='View offer').click(); pg.wait_for_timeout(600)
    check('PC: "View offer" opens the product', pg.get_by_test_id('alerts-desktop').count() == 0)
    pg.get_by_role('navigation', name='Main Navigation').get_by_role('button', name='Alerts', exact=True).click(); pg.wait_for_timeout(400)
    pg.get_by_role('button', name=re.compile('Delete alert for')).click(); pg.wait_for_timeout(300)
    check('PC: delete works', pg.get_by_text('You have no alerts').count() == 1)
    pg.get_by_role('button', name='Create').click(); pg.wait_for_timeout(400)
    check('PC: "Create" leads on to pick a product', pg.get_by_test_id('alerts-desktop').count() == 0)
    check('PC: no page errors', not errs); ctx.close()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}); pg = ctx.new_page()
    pg.add_init_script("localStorage.setItem('ovoprice_lang_v1','en')")
    pg.goto(U); pg.wait_for_timeout(800)
    pg.get_by_role('navigation', name='Main Navigation').get_by_role('button', name='Alerts', exact=True).click(); pg.wait_for_timeout(400)
    check('phone: old Alerts layout', pg.get_by_test_id('alerts-desktop').count() == 0 and pg.get_by_role('heading', name='Price alerts').count() == 1)
    ctx.close(); b.close()
print('\nFAILED: %d' % len(fails) if fails else '\nALL PASS'); sys.exit(1 if fails else 0)

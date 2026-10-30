# PC Saved (1024 px and up): collections on the left, saved products as a table. Phone layout unchanged.
# Needs: VITE_SUPABASE_URL= VITE_CONTACT_EMAIL= npx vite --port 5199 --host 127.0.0.1
import re, sys, json
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
    pg.goto(U); pg.wait_for_timeout(800)
    nav = pg.get_by_role('navigation', name='Main Navigation')
    nav.get_by_role('button', name='Saved', exact=True).click(); pg.wait_for_timeout(400)
    check('PC: empty Saved shows the empty message in the wide layout', pg.get_by_test_id('saved-desktop').count() == 1 and pg.get_by_text("You haven't saved any products yet").count() == 1)
    nav.get_by_role('button', name='Search', exact=True).click(); pg.wait_for_timeout(300)
    pg.get_by_role('searchbox').fill('sony'); pg.wait_for_timeout(700)
    pg.get_by_test_id('search-desktop-grid').locator('button').first.click(); pg.wait_for_timeout(700)
    pg.get_by_test_id('product-desktop').get_by_role('button', name='Save', exact=True).click(); pg.wait_for_timeout(300)
    # pretend it was saved at a higher price -> the table shows the drop
    pg.evaluate("""() => { const k = Object.keys(localStorage).find(k => k.includes('saved')); const v = JSON.parse(localStorage.getItem(k)); v[0].savedPrice = 299; localStorage.setItem(k, JSON.stringify(v)); }""")
    pg.reload(); pg.wait_for_timeout(900)
    pg.get_by_role('navigation', name='Main Navigation').get_by_role('button', name='Saved', exact=True).click(); pg.wait_for_timeout(500)
    rows = pg.get_by_test_id('saved-desktop-table').locator('tbody tr')
    check('PC: saved product listed in the table', rows.count() == 1 and 'Sony' in rows.first.inner_text())
    check('PC: price now shown', '289,00 €' in rows.first.inner_text())
    check('PC: change since saved shown (▼ 10,00 €)', '▼ 10,00 €' in rows.first.inner_text())
    check('PC: limit meter in the sidebar (1 of 1 saved for a guest)', pg.get_by_text('1 of 1 saved').count() >= 1)
    check('PC: no horizontal overflow (table fits)', pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth') and rows.first.get_by_role('button', name='Remove from saved').is_visible())
    rows.first.get_by_role('button', name=re.compile('Set alert')).click(); pg.wait_for_timeout(600)
    check('PC: "+ Set alert" opens the alert screen for that product', pg.get_by_test_id('saved-desktop').count() == 0 and pg.get_by_text(re.compile('Sony')).count() >= 1)
    pg.get_by_role('navigation', name='Main Navigation').get_by_role('button', name='Saved', exact=True).click(); pg.wait_for_timeout(400)
    pg.get_by_test_id('saved-desktop-table').get_by_role('button', name='View product').click(); pg.wait_for_timeout(600)
    check('PC: "View product" opens the product page', pg.get_by_test_id('product-desktop').count() == 1)
    pg.get_by_role('navigation', name='Main Navigation').get_by_role('button', name='Saved', exact=True).click(); pg.wait_for_timeout(400)
    pg.get_by_role('complementary', name='Collections').get_by_role('button', name='New collection').click(); pg.wait_for_timeout(300)
    check('PC: guest -> "New collection" explains the account limit', pg.get_by_text(re.compile('account', re.I)).count() >= 1)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    pg.goto(U); pg.wait_for_timeout(700)
    pg.get_by_role('navigation', name='Main Navigation').get_by_role('button', name='Saved', exact=True).click(); pg.wait_for_timeout(400)
    pg.get_by_test_id('saved-desktop-table').get_by_role('button', name='Remove from saved').click(); pg.wait_for_timeout(300)
    check('PC: remove works', pg.get_by_text("You haven't saved any products yet").count() == 1)
    check('PC: no page errors', not errs); ctx.close()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}); pg = ctx.new_page()
    pg.add_init_script("localStorage.setItem('ovoprice_lang_v1','en')")
    pg.goto(U); pg.wait_for_timeout(800)
    pg.get_by_role('navigation', name='Main Navigation').get_by_role('button', name='Saved', exact=True).click(); pg.wait_for_timeout(400)
    check('phone: old Saved layout', pg.get_by_test_id('saved-desktop').count() == 0 and pg.get_by_role('heading', name='Saved products').count() == 1)
    ctx.close(); b.close()
print('\nFAILED: %d' % len(fails) if fails else '\nALL PASS'); sys.exit(1 if fails else 0)

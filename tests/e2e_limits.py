# Limits: visitors keep 1 saved product and 1 alert; a free account 10 and 3; collections need an account.
# Needs a dev server: VITE_SUPABASE_URL= VITE_CONTACT_EMAIL= npx vite --port 5199 --host 127.0.0.1
import json, re, sys
from playwright.sync_api import sync_playwright
U = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5199/'
fails = []
def check(n, ok):
    print(('PASS ' if ok else 'FAIL ') + n)
    if not ok: fails.append(n)
def open_product(pg, q, title):
    pg.get_by_role('button', name=re.compile('^Search$')).first.click(); pg.wait_for_timeout(300)
    pg.get_by_placeholder(re.compile('Product, model')).fill(q); pg.wait_for_timeout(800)
    pg.get_by_text(re.compile(title)).first.click(); pg.wait_for_timeout(500)
def set_alert(pg):
    pg.get_by_role('button', name=re.compile('Price alert')).click(); pg.wait_for_timeout(400)
    pg.get_by_role('button', name=re.compile('Set price alert')).click(); pg.wait_for_timeout(1500)
def sign_in_preview(pg, url):
    """Signs in with the LOCAL TEST ACCOUNT (dev only), so account-only features can be tested."""
    pg.goto(url + '?previewAccount=1'); pg.wait_for_timeout(500)
    pg.get_by_role('button', name='User Profile').click(); pg.get_by_role('button', name='Create an account').click(); pg.wait_for_timeout(250)
    d = pg.get_by_role('dialog'); d.get_by_label('Email address').fill('anna.muster@example.com')
    d.get_by_role('button', name=re.compile('Email me')).click(); pg.wait_for_timeout(300)
def dialog(pg): return pg.get_by_role('dialog')
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 390, 'height': 900}); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script("localStorage.setItem('ovoprice_lang_v1','en')")
    pg.goto(U); pg.wait_for_timeout(600)
    # ---------- VISITOR: 1 saved product
    open_product(pg, 'xm5', 'Sony WH-1000XM5'); pg.get_by_role('button', name=re.compile('^Save$')).click(); pg.wait_for_timeout(300)
    check('visitor: the first save works', dialog(pg).count() == 0 and pg.get_by_role('button', name='Saved', exact=True).count() == 2)
    pg.get_by_role('navigation', name='Main Navigation').get_by_role('button', name='Saved').click(); pg.wait_for_timeout(400)
    check('visitor: Saved shows "1 of 1 saved", the limit note and a Create an account button', pg.get_by_text('1 of 1 saved').count() == 1 and pg.get_by_text('You have reached the limit of saved products: 1').count() == 1 and pg.get_by_text('create a free account to save up to 10', exact=False).count() >= 1 and pg.get_by_role('main').get_by_role('button', name='Create an account').count() == 1)
    check('visitor: the note says nothing is deleted', pg.get_by_text('Nothing you saved is deleted.', exact=False).count() >= 1)
    open_product(pg, 'dyson', 'Dyson V15'); pg.get_by_role('button', name=re.compile('^Save$')).click(); pg.wait_for_timeout(300)
    check('visitor: 2nd save is explained (no error) and offers an account', dialog(pg).count() == 1 and dialog(pg).get_by_text('You have reached the limit of saved products: 1').count() == 1 and dialog(pg).get_by_text('create a free account to save up to 10', exact=False).count() == 1 and dialog(pg).get_by_role('button', name='Create an account').count() == 1 and dialog(pg).get_by_role('button', name='I already have an account').count() == 1)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    check('visitor: Esc closes the dialog; Dyson was not saved', dialog(pg).count() == 0 and pg.get_by_role('button', name='Saved', exact=True).count() == 1)
    pg.get_by_role('button', name=re.compile('^Save$')).click(); pg.wait_for_timeout(300)
    dialog(pg).get_by_role('button', name='Manage saved products').click(); pg.wait_for_timeout(400)
    check('visitor: "Manage saved products" opens the Saved list', pg.get_by_role('heading', name='Saved products').count() == 1 and pg.get_by_text('1 of 1 saved').count() == 1)
    pg.get_by_role('button', name='Remove from saved').first.click(); pg.wait_for_timeout(300)
    check('visitor: removing is always possible; the limit note goes away', pg.get_by_text('You have reached the limit of saved products: 1').count() == 0)
    open_product(pg, 'dyson', 'Dyson V15'); pg.get_by_role('button', name=re.compile('^Save$')).click(); pg.wait_for_timeout(300)
    check('visitor: after removing it, saving another works', dialog(pg).count() == 0 and pg.get_by_role('button', name='Saved', exact=True).count() == 2)
    pg.get_by_role('button', name=re.compile('^Save$')).count()
    # the offer leads to the account sheet
    open_product(pg, 'xm5', 'Sony WH-1000XM5'); pg.get_by_role('button', name=re.compile('^Save$')).click(); pg.wait_for_timeout(300)
    dialog(pg).get_by_role('button', name='Create an account').click(); pg.wait_for_timeout(400)
    check('visitor: "Create an account" hands over to the account sheet', pg.get_by_role('dialog').count() == 1 and pg.get_by_text('You have reached the limit').count() == 0)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    # collections: locked
    pg.get_by_role('navigation', name='Main Navigation').get_by_role('button', name='Saved').click(); pg.wait_for_timeout(400)
    pg.get_by_role('button', name='New collection').click(); pg.wait_for_timeout(300)
    check('visitor: "New collection" explains that an account is needed', dialog(pg).count() == 1 and dialog(pg).get_by_text('Collections need an account').count() == 1 and pg.get_by_label('Collection name').count() == 0)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    check('no page errors (visitor saved part)', not errs)
    ctx.close()

    # ---------- VISITOR: 1 alert
    ctx = b.new_context(viewport={'width': 390, 'height': 900}); pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script("localStorage.setItem('ovoprice_lang_v1','en')")
    pg.goto(U); pg.wait_for_timeout(600)
    open_product(pg, 'xm5', 'Sony WH-1000XM5'); set_alert(pg)
    check('visitor: the first alert works', pg.get_by_role('heading', name='Price alerts').count() == 1 and dialog(pg).count() == 0)
    pg.goto(U); pg.wait_for_timeout(500)
    open_product(pg, 'dyson', 'Dyson V15')
    pg.get_by_role('button', name=re.compile('Price alert')).click(); pg.wait_for_timeout(600)
    pg.get_by_role('button', name=re.compile('Set price alert')).click(); pg.wait_for_timeout(800)
    check('visitor: 2nd alert is explained, stays on the set-alert screen, offers an account', dialog(pg).count() == 1 and dialog(pg).get_by_text('You have reached the limit of price alerts: 1').count() == 1 and dialog(pg).get_by_text('create a free account to set up to 3', exact=False).count() == 1 and pg.get_by_role('heading', name='Save & Track Product').count() == 1)
    dialog(pg).get_by_role('button', name='Manage price alerts').click(); pg.wait_for_timeout(400)
    check('visitor: "Manage price alerts" opens Alerts with only the first alert', pg.get_by_role('heading', name='Price alerts').count() == 1 and pg.get_by_text('Dyson V15').count() == 0)
    pg.goto(U); pg.wait_for_timeout(500)
    open_product(pg, 'xm5', 'Sony WH-1000XM5'); set_alert(pg)
    check('visitor: changing the target of the existing alert is allowed', dialog(pg).count() == 0 and pg.get_by_role('heading', name='Price alerts').count() == 1)
    check('no page errors (visitor alert part)', not errs)
    ctx.close()

    # ---------- ACCOUNT (local test account): 10 saved, 3 alerts, collections
    ctx = b.new_context(viewport={'width': 390, 'height': 900}); pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script("localStorage.setItem('ovoprice_lang_v1','en')")
    sign_in_preview(pg, U); pg.wait_for_timeout(300)
    open_product(pg, 'xm5', 'Sony WH-1000XM5'); pg.get_by_role('button', name=re.compile('^Save$')).click(); pg.wait_for_timeout(200)
    item = json.loads(pg.evaluate("localStorage.getItem('ovoprice_saved_products_v1')"))[0]
    seeds = []
    for i in range(9):
        c = dict(item); c['id'] = f'seed-{i}'; c['title'] = f'Seed product {i}'; c.pop('productId', None); seeds.append(c)
    pg.evaluate("(v)=>localStorage.setItem('ovoprice_saved_products_v1', v)", json.dumps(seeds + [item]))
    pg.goto(U); pg.wait_for_timeout(700)
    pg.get_by_role('navigation', name='Main Navigation').get_by_role('button', name='Saved').click(); pg.wait_for_timeout(400)
    check('account: 10 are allowed; Saved shows "10 of 10 saved" and no sign-up button', pg.get_by_text('10 of 10 saved').count() == 1 and pg.get_by_role('main').get_by_role('button', name='Create an account').count() == 0)
    open_product(pg, 'dyson', 'Dyson V15'); pg.get_by_role('button', name=re.compile('^Save$')).click(); pg.wait_for_timeout(300)
    check('account: the 11th save is explained without a sign-up offer', dialog(pg).count() == 1 and dialog(pg).get_by_text('You have reached the limit of saved products: 10').count() == 1 and dialog(pg).get_by_role('button', name='Create an account').count() == 0 and dialog(pg).get_by_role('button', name='Manage saved products').count() == 1)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    pg.get_by_role('navigation', name='Main Navigation').get_by_role('button', name='Saved').click(); pg.wait_for_timeout(400)
    pg.get_by_role('button', name='New collection').click(); pg.wait_for_timeout(300)
    check('account: "New collection" opens the name form', dialog(pg).count() == 0 and pg.get_by_label('Collection name').count() == 1)
    check('no page errors (account saved part)', not errs)
    ctx.close()
    ctx = b.new_context(viewport={'width': 390, 'height': 900}); pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script("localStorage.setItem('ovoprice_lang_v1','en')")
    sign_in_preview(pg, U); pg.wait_for_timeout(300)
    for q, title in (('xm5', 'Sony WH-1000XM5'), ('dyson', 'Dyson V15'), ('magcubic', 'Magcubic')):
        open_product(pg, q, title); set_alert(pg)
        pg.goto(U); pg.wait_for_timeout(500)
    open_product(pg, 'delonghi', "De'Longhi")
    pg.get_by_role('button', name=re.compile('Price alert')).click(); pg.wait_for_timeout(600)
    pg.get_by_role('button', name=re.compile('Set price alert')).click(); pg.wait_for_timeout(800)
    check('account: 3 alerts allowed, the 4th is explained without a sign-up offer', dialog(pg).count() == 1 and dialog(pg).get_by_text('You have reached the limit of price alerts: 3').count() == 1 and dialog(pg).get_by_role('button', name='Create an account').count() == 0)
    check('no horizontal overflow', pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
    check('no page errors (account alerts part)', not errs)
    ctx.close(); b.close()
print('\nFAILED: %d' % len(fails) if fails else '\nALL PASS'); sys.exit(1 if fails else 0)

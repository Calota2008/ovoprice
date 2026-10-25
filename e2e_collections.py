# Saved collections e2e. Start `npx vite --port 5199 --host 127.0.0.1`, then: python3 tests/e2e_collections.py [base_url]
import re, sys
from playwright.sync_api import sync_playwright
U = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5199/'
fails = []
def check(n, ok):
    print(('PASS ' if ok else 'FAIL ') + n)
    if not ok: fails.append(n)
def tab(pg, name): return pg.get_by_role('tab', name=re.compile(name))
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 430, 'height': 900}); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(U); pg.wait_for_timeout(600)
    # save two products from the Search screen
    for q in ['xm5', 'dyson']:
        pg.get_by_role('button', name=re.compile('^Search$')).first.click(); pg.wait_for_timeout(300)
        pg.get_by_placeholder(re.compile('Product, model')).fill(q); pg.wait_for_timeout(800)
        pg.get_by_text(re.compile('Sony WH-1000XM5' if q == 'xm5' else 'Dyson V15')).first.click(); pg.wait_for_timeout(500)
        pg.get_by_role('button', name=re.compile('^Save$')).click(); pg.wait_for_timeout(200)
        pg.goto(U); pg.wait_for_timeout(500)
    pg.get_by_role('button', name=re.compile('^Saved$')).click(); pg.wait_for_timeout(400)
    check('saved: 2 products', pg.get_by_text('2 products').first.is_visible())
    check('no collections yet: only All tab', tab(pg, 'All').is_visible() and pg.get_by_role('tab').count() == 1)
    # create
    pg.get_by_role('button', name='New collection').click()
    pg.get_by_role('button', name='Create').click()
    check('empty name rejected', pg.get_by_role('alert').filter(has_text='Enter a name').is_visible())
    pg.get_by_label('Collection name').fill('Wishlist'); pg.get_by_role('button', name='Create').click(); pg.wait_for_timeout(200)
    check('collection created (0)', tab(pg, 'Wishlist \\(0\\)').is_visible())
    pg.get_by_role('button', name='New collection').click()
    pg.get_by_label('Collection name').fill('wishlist'); pg.get_by_role('button', name='Create').click()
    check('duplicate name rejected (case-insensitive)', pg.get_by_role('alert').filter(has_text='already exists').is_visible())
    pg.get_by_role('button', name='Cancel').click()
    # add a product
    pg.get_by_role('button', name='Collections', exact=True).first.click()
    pg.get_by_role('group').get_by_label('Wishlist').check(); pg.wait_for_timeout(200)
    check('counter updates to (1)', tab(pg, 'Wishlist \\(1\\)').is_visible())
    check('"In: Wishlist" shown on card', pg.get_by_text('In: Wishlist').is_visible())
    tab(pg, 'Wishlist').click(); pg.wait_for_timeout(200)
    check('filter shows only 1 product', pg.get_by_role('button', name='View product').count() == 1)
    # persists after reload
    pg.reload(); pg.wait_for_timeout(600)
    pg.get_by_role('button', name=re.compile('^Saved$')).click(); pg.wait_for_timeout(300)
    check('collection persists after reload', tab(pg, 'Wishlist \\(1\\)').is_visible())
    # rename
    tab(pg, 'Wishlist').click(); pg.get_by_role('button', name='Rename').click()
    pg.get_by_label('Collection name').fill('Gifts'); pg.get_by_role('button', name='Save name').click(); pg.wait_for_timeout(200)
    check('renamed', tab(pg, 'Gifts \\(1\\)').is_visible())
    # removing the product from Saved drops it from the collection
    tab(pg, 'All').click(); pg.wait_for_timeout(200)
    n_before = pg.get_by_role('button', name='Remove from saved').count()
    pg.get_by_role('button', name='Remove from saved').first.click(); pg.wait_for_timeout(300)
    check('removing saved product works', pg.get_by_role('button', name='Remove from saved').count() == n_before - 1)
    # delete collection (two-step), products stay saved
    tab(pg, 'Gifts').click(); pg.get_by_role('button', name='Delete collection').click()
    check('delete needs confirmation', pg.get_by_role('button', name='Confirm delete collection').is_visible())
    pg.get_by_role('button', name='Confirm delete collection').click(); pg.wait_for_timeout(200)
    check('collection deleted, back on All', tab(pg, 'All').is_visible() and pg.get_by_role('tab').count() == 1)
    check('products still saved', pg.get_by_role('button', name='View product').count() >= 1)
    # corrupt storage must not crash
    pg.evaluate("localStorage.setItem('ovoprice_collections_v1','{broken')"); pg.reload(); pg.wait_for_timeout(600)
    pg.get_by_role('button', name=re.compile('^Saved$')).click(); pg.wait_for_timeout(300)
    check('corrupt collections: app renders', tab(pg, 'All').is_visible())
    check('no page errors', not errs)
    b.close()
print('FAILED:', fails or 'none')

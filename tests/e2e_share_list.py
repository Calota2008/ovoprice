# Share a list by link: sender copies a link, a person with a fresh browser opens it, sees the list, saves it.
# Start: VITE_SUPABASE_URL= VITE_CONTACT_EMAIL= npx vite --port 5199 --host 127.0.0.1
import re, sys, base64, json
from playwright.sync_api import sync_playwright
U = 'http://127.0.0.1:5199/'
fails = []
def check(n, ok):
    print(('PASS ' if ok else 'FAIL ') + n)
    if not ok: fails.append(n)
def link(obj): return U + '?list=' + base64.urlsafe_b64encode(json.dumps(obj).encode()).decode().rstrip('=')
def new(b, perms=None, lang='en'):
    ctx = b.new_context(viewport={'width': 430, 'height': 900}, permissions=perms or [], locale=f'{lang}-{lang.upper()}')
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script(f"if(!localStorage.getItem('ovoprice_lang_v1'))localStorage.setItem('ovoprice_lang_v1','{lang}')")
    return ctx, pg, errs
def save_two(pg):
    pg.goto(U); pg.wait_for_timeout(600)
    for q in ['xm5', 'dyson']:
        pg.get_by_role('button', name=re.compile('^Search$')).first.click(); pg.wait_for_timeout(300)
        pg.get_by_placeholder(re.compile('Product, model')).fill(q); pg.wait_for_timeout(800)
        pg.get_by_text(re.compile('Sony WH-1000XM5' if q == 'xm5' else 'Dyson V15')).first.click(); pg.wait_for_timeout(500)
        pg.get_by_role('button', name=re.compile('^Save$')).click(); pg.wait_for_timeout(200)
        pg.goto(U); pg.wait_for_timeout(500)
    pg.get_by_role('button', name=re.compile('^Saved$')).click(); pg.wait_for_timeout(400)
def make_list(pg, name='Gifts'):
    pg.get_by_role('button', name='New collection').click()
    pg.get_by_label('Collection name').fill(name); pg.get_by_role('button', name='Create').click(); pg.wait_for_timeout(200)
    for i in range(2):
        pg.get_by_role('button', name='Collections', exact=True).nth(i).click(); pg.wait_for_timeout(150)
        pg.get_by_role('group').get_by_label(name).check(); pg.wait_for_timeout(200)
    pg.get_by_role('tab', name=re.compile(name)).click(); pg.wait_for_timeout(200)

with sync_playwright() as p:
    b = p.chromium.launch()
    # --- sender
    ctx, pg, errs = new(b, ['clipboard-read', 'clipboard-write'])
    save_two(pg); make_list(pg)
    check('Share list button shows for a collection with products', pg.get_by_role('button', name='Share list').is_visible())
    pg.get_by_role('button', name='Share list').click(); pg.wait_for_timeout(400)
    check('confirmation message shown', pg.get_by_text('Link copied. Anyone with the link can see this list.').is_visible())
    url = pg.evaluate('navigator.clipboard.readText()')
    check('copied link points to the app with ?list=', url.startswith(U + '?list='))
    check('link carries no e-mail or personal data', '@' not in url and len(url) < 400)
    pg.get_by_role('tab', name='All').click(); pg.wait_for_timeout(200)
    check('no Share list button on the "All" view', pg.get_by_role('button', name='Share list').count() == 0)
    check('sender: no page errors', not errs); ctx.close()

    # --- receiver (fresh browser)
    ctx, pg, errs = new(b)
    pg.goto(url); pg.wait_for_timeout(1200)
    sl = pg.get_by_test_id('shared-list')
    check('shared list screen opens straight from the link', sl.count() == 1)
    check('list name shown as heading', pg.get_by_role('heading', name='Gifts').count() == 1)
    check('both products listed with price and DEMO badge', sl.get_by_role('listitem').count() == 2 and sl.get_by_text('DEMO').count() == 2)
    check('global Demo data banner still shown', pg.get_by_text('Demo data.').first.is_visible())
    check('privacy note about the link shown', sl.get_by_text('Anyone with the link can see this list').count() == 1)
    check('header has back button', pg.get_by_role('button', name='Go back').count() == 1)
    check('no horizontal overflow on a phone', pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
    sl.get_by_role('button', name='Save all to my products').click(); pg.wait_for_timeout(300)
    check('Saved: 2 confirmation', pg.get_by_text('Saved: 2').count() == 1)
    check('button replaced by "already saved"', pg.get_by_text('All of these are already saved.').count() == 1)
    pg.goto(U); pg.wait_for_timeout(500)
    pg.get_by_role('button', name=re.compile('^Saved$')).click(); pg.wait_for_timeout(400)
    check('receiver now has the 2 products saved (persisted)', pg.get_by_text('2 products').first.is_visible())
    # a second visit does not duplicate
    pg.goto(url); pg.wait_for_timeout(900)
    check('reopening shows "already saved", no duplicates', pg.get_by_text('All of these are already saved.').count() == 1)
    pg.get_by_test_id('shared-list').get_by_role('listitem').first.get_by_role('button').click(); pg.wait_for_timeout(600)
    check('tapping a product opens its details', pg.get_by_test_id('shared-list').count() == 0 and pg.get_by_text('Compare').count() >= 1)
    check('receiver: no page errors', not errs); ctx.close()

    # --- bad and partial links
    ctx, pg, errs = new(b)
    pg.goto(U + '?list=garbage'); pg.wait_for_timeout(700)
    check('invalid link is ignored: Home is shown', pg.get_by_test_id('shared-list').count() == 0 and pg.get_by_role('button', name='Voice search').count() == 1)
    pg.goto(link({'v': 1, 'n': '<img src=x onerror=alert(1)>', 'p': ['nope-123']})); pg.wait_for_timeout(900)
    check('name with markup is shown as plain text, no script runs', pg.get_by_role('heading').filter(has_text='<img src=x').count() == 1 and pg.locator('img[src=x]').count() == 0)
    check('unknown product: "no longer available" note, no save button', pg.get_by_text('1 products from this list are no longer available.').count() == 1 and pg.get_by_role('button', name='Save all to my products').count() == 0)
    check('bad link: no page errors', not errs); ctx.close()

    # --- clipboard blocked -> link shown in a field
    ctx, pg, errs = new(b)
    save_two(pg); make_list(pg, 'Mutare')
    pg.evaluate("Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(new Error('blocked'))},configurable:true})")
    pg.get_by_role('button', name='Share list').click(); pg.wait_for_timeout(400)
    field = pg.get_by_label('Copy this link:')
    check('when copying fails the link is shown in a field', field.count() == 1 and field.input_value().startswith(U + '?list='))
    ctx.close()

    # --- native share sheet used when available, cancel is silent
    ctx, pg, errs = new(b)
    save_two(pg); make_list(pg, 'Cadou')
    pg.evaluate("window.__shared=null; navigator.share=(d)=>{window.__shared=d;return Promise.resolve()}; 0")
    pg.get_by_role('button', name='Share list').click(); pg.wait_for_timeout(300)
    sh = pg.evaluate('window.__shared')
    check('native share sheet gets title and url', bool(sh) and sh['title'] == 'Cadou' and sh['url'].startswith(U + '?list='))
    pg.evaluate("navigator.share=()=>Promise.reject(Object.assign(new Error('x'),{name:'AbortError'})); 0")
    pg.get_by_role('button', name='Share list').click(); pg.wait_for_timeout(300)
    check('cancelling the share sheet shows no message or error', pg.get_by_label('Copy this link:').count() == 0 and pg.get_by_text('Link copied').count() == 0)
    check('share: no page errors', not errs); ctx.close()

    # --- German
    ctx, pg, errs = new(b, lang='de')
    pg.goto(link({'v': 1, 'n': 'Geschenke', 'p': ['nope-1']})); pg.wait_for_timeout(900)
    check('German: shared list texts', pg.get_by_text('Mit dir geteilt').count() == 1 and pg.get_by_text('Produkte: 1').count() == 1)
    check('German: no page errors', not errs); ctx.close(); b.close()
print('\nFAILED: %d' % len(fails) if fails else '\nALL PASS'); sys.exit(1 if fails else 0)

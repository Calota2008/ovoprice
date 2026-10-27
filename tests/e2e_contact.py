# "Contact us" button: shown only when VITE_CONTACT_EMAIL is a valid address, never invented.
# Needs two dev servers:
#   VITE_SUPABASE_URL= VITE_CONTACT_EMAIL=            npx vite --port 5199 --host 127.0.0.1   (no address)
#   VITE_SUPABASE_URL= VITE_CONTACT_EMAIL=support@example.com npx vite --port 5196 --host 127.0.0.1   (with address)
import sys
from playwright.sync_api import sync_playwright
fails=[]
def check(n,ok):
    print(('PASS ' if ok else 'FAIL ')+n)
    if not ok: fails.append(n)
def open_settings(pg,url):
    pg.goto(url); pg.wait_for_timeout(500)
    pg.get_by_role('button',name='User Profile').click(); pg.get_by_role('button',name='Account settings').click(); pg.wait_for_timeout(300)
with sync_playwright() as p:
    b=p.chromium.launch()
    for label,url,expect in [('without address','http://127.0.0.1:5199/',False),('with address','http://127.0.0.1:5196/',True)]:
        ctx=b.new_context(viewport={'width':430,'height':900},locale='en-US'); pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        open_settings(pg,url)
        link=pg.get_by_role('link',name='Contact us')
        if expect:
            check(f'{label}: Contact us is shown', link.count()==1 and link.is_visible())
            href=link.get_attribute('href') or ''
            check(f'{label}: mailto the configured address with a subject', href.startswith('mailto:support@example.com?subject='))
        else:
            check(f'{label}: no Contact us button and no Help section', link.count()==0 and pg.get_by_role('heading',name='Help').count()==0)
        check(f'{label}: no page errors', not errs)
        ctx.close()
    # German label
    ctx=b.new_context(viewport={'width':430,'height':900},locale='de-DE'); pg=ctx.new_page()
    pg.add_init_script("localStorage.setItem('ovoprice_lang_v1','de')")
    pg.goto('http://127.0.0.1:5196/'); pg.wait_for_timeout(500)
    pg.get_by_role('button',name='Benutzerprofil').click(); pg.get_by_role('button',name='Kontoeinstellungen').click(); pg.wait_for_timeout(300)
    check('German: button is "Kontakt"', pg.get_by_role('link',name='Kontakt').count()==1)
    ctx.close(); b.close()
print('\nFAILED: %d'%len(fails) if fails else '\nALL PASS'); sys.exit(1 if fails else 0)

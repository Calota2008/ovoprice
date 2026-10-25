# Auth UI e2e (no backend). Start `npx vite --port 5199 --host 127.0.0.1`, then: python3 tests/e2e_auth_ui.py [shots_dir]
import re, sys, os
from playwright.sync_api import sync_playwright
U='http://127.0.0.1:5199/'; S=sys.argv[1] if len(sys.argv)>1 else None
fails=[]
def check(n,ok):
    print(('PASS ' if ok else 'FAIL ')+n)
    if not ok: fails.append(n)
def shot(pg,n):
    if S: os.makedirs(S,exist_ok=True); pg.screenshot(path=f'{S}/{n}.png')
with sync_playwright() as p:
    b=p.chromium.launch()
    for name,vp in [('mobile',{'width':430,'height':900}),('desktop',{'width':1280,'height':800})]:
        pg=b.new_context(viewport=vp).new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.goto(U); pg.wait_for_timeout(600)
        pg.get_by_role('button',name='User Profile').click()
        check(f'{name}: popover has Sign in + Create account', pg.get_by_role('button',name='Sign in').is_visible() and pg.get_by_role('button',name='Create an account').is_visible())
        pg.get_by_role('button',name='Create an account').click(); pg.wait_for_timeout(200)
        d=pg.get_by_role('dialog')
        check(f'{name}: create sheet opens', d.is_visible() and d.get_by_text('Keep your finds on every device').is_visible())
        check(f'{name}: benefits shown on create', d.get_by_text('Saved products and collections, synced').is_visible())
        shot(pg,f'auth_create_{name}')
        d.get_by_role('button',name='Continue with Google').click(); pg.wait_for_timeout(200)
        check(f'{name}: google -> honest not-connected notice', d.get_by_role('status').is_visible() and 'switched on' in d.get_by_role('status').inner_text())
        d.get_by_role('button',name=re.compile('Email me')).click()
        check(f'{name}: empty email -> error', d.get_by_role('alert').is_visible())
        d.get_by_label('Email address').fill('not-an-email'); d.get_by_role('button',name=re.compile('Email me')).click()
        check(f'{name}: invalid email -> error', 'valid email' in d.get_by_role('alert').inner_text())
        d.get_by_label('Email address').fill('me@example.com'); d.get_by_role('button',name=re.compile('Email me')).click(); pg.wait_for_timeout(150)
        check(f'{name}: valid email -> notice, no error', d.get_by_role('alert').count()==0 and d.get_by_role('status').is_visible())
        d.get_by_role('button',name='Sign in').click()
        check(f'{name}: switch to sign-in mode', d.get_by_text('Welcome back').is_visible() and d.get_by_text('Saved products and collections, synced').count()==0)
        shot(pg,f'auth_signin_{name}')
        pg.keyboard.press('Escape'); pg.wait_for_timeout(150)
        check(f'{name}: Esc closes', pg.get_by_role('dialog').count()==0)
        pg.get_by_role('button',name='User Profile').click(); pg.get_by_role('button',name='Sign in').click()
        pg.get_by_role('button',name='Continue as guest').click()
        check(f'{name}: continue as guest closes', pg.get_by_role('dialog').count()==0)
        check(f'{name}: no page errors', not errs)
    # nudge on Saved, dismiss persists
    ctx=b.new_context(viewport={'width':430,'height':900}); pg=ctx.new_page(); pg.goto(U); pg.wait_for_timeout(500)
    pg.get_by_role('button',name=re.compile('^Search$')).first.click(); pg.wait_for_timeout(300)
    pg.get_by_placeholder(re.compile('Product, model')).fill('xm5'); pg.wait_for_timeout(800)
    pg.get_by_text(re.compile('Sony WH-1000XM5')).first.click(); pg.wait_for_timeout(400)
    pg.get_by_role('button',name=re.compile('^Save$')).click(); pg.wait_for_timeout(200); pg.goto(U); pg.wait_for_timeout(400)
    pg.get_by_role('button',name=re.compile('^Saved$')).click(); pg.wait_for_timeout(300)
    check('saved: nudge visible for guest', pg.get_by_text('Saved on this device only.').is_visible())
    shot(pg,'auth_nudge_saved')
    pg.get_by_role('button',name='Dismiss').click(); pg.reload(); pg.wait_for_timeout(500)
    pg.get_by_role('button',name=re.compile('^Saved$')).click(); pg.wait_for_timeout(300)
    check('saved: nudge stays dismissed after reload', pg.get_by_text('Saved on this device only.').count()==0)
    b.close()
print('FAILED:', fails or 'none')

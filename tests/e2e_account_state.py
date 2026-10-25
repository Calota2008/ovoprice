# Signed-in screens, checked with the LOCAL TEST ACCOUNT (dev only, ?previewAccount=1). Start
# `npx vite --port 5199 --host 127.0.0.1`, then: python3 tests/e2e_account_state.py [shots_dir]
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
        ctx=b.new_context(viewport=vp,locale='en-US'); pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        # guest by default: the test account never appears on its own
        pg.goto(U); pg.wait_for_timeout(500)
        pg.get_by_role('button',name='User Profile').click()
        check(f'{name}: guest by default (Sign in shown, no TEST badge)', pg.get_by_role('button',name='Sign in').is_visible() and pg.get_by_text('TEST ACCOUNT').count()==0)
        pg.keyboard.press('Escape'); pg.mouse.click(5,5); pg.wait_for_timeout(100)
        # opt in
        pg.goto(U+'?previewAccount=1'); pg.wait_for_timeout(500)
        pg.get_by_role('button',name='User Profile').click(); pg.get_by_role('button',name='Create an account').click(); pg.wait_for_timeout(250)
        d=pg.get_by_role('dialog'); d.get_by_role('radio',name='Austria').click()
        d.get_by_label('Email address').fill('anna.muster@example.com'); d.get_by_role('button',name=re.compile('Email me')).click(); pg.wait_for_timeout(300)
        check(f'{name}: sheet closes after test sign-up', pg.get_by_role('dialog').count()==0)
        check(f'{name}: country from sign-up kept (Austria)', pg.evaluate("localStorage.getItem('ovoprice_country_v1')")=='AT')
        btn=pg.get_by_role('button',name='User Profile')
        check(f'{name}: header avatar shows initials AM', btn.inner_text().strip()=='AM')
        btn.click(); pop=pg.locator('div.absolute').filter(has_text='anna.muster@example.com').first
        check(f'{name}: popover shows name + email', pg.get_by_text('Anna Muster').first.is_visible() and pg.get_by_text('anna.muster@example.com').first.is_visible())
        check(f'{name}: popover is clearly labelled TEST ACCOUNT', pg.get_by_text('TEST ACCOUNT').first.is_visible() and pg.get_by_text('nothing is sent or stored on a server').first.is_visible())
        check(f'{name}: no sign-in buttons while signed in', pg.get_by_role('button',name='Sign in').count()==0 and pg.get_by_role('button',name='Create an account').count()==0)
        shot(pg,f'account_popover_{name}')
        pg.get_by_role('button',name='Account settings').click(); pg.wait_for_timeout(300)
        check(f'{name}: settings account card (name, email, sign out)', pg.get_by_text('Anna Muster').first.is_visible() and pg.get_by_role('button',name='Sign out').count()>=1 and pg.get_by_text('You\'re browsing as a guest').count()==0)
        shot(pg,f'account_settings_{name}')
        # nudge hidden while signed in
        pg.get_by_role('navigation').get_by_role('button',name=re.compile('^Saved')).click(); pg.wait_for_timeout(300)
        check(f'{name}: no sign-in nudge on Saved', pg.get_by_text('Saved on this device only.').count()==0)
        # persists through a reload (same browser session)
        pg.reload(); pg.wait_for_timeout(500)
        check(f'{name}: stays signed in after reload', pg.get_by_role('button',name='User Profile').inner_text().strip()=='AM')
        # German labels
        pg.get_by_role('button',name='User Profile').click(); pg.get_by_role('button',name='Account settings').click(); pg.wait_for_timeout(250)
        pg.get_by_role('radiogroup',name='Language').get_by_role('radio',name='Deutsch').click(); pg.wait_for_timeout(200)
        check(f'{name}: DE sign-out + test labels', pg.get_by_role('button',name='Abmelden').count()>=1 and pg.get_by_text('TESTKONTO').count()>=1)
        pg.get_by_role('radiogroup',name='Sprache').get_by_role('radio',name='English').click()
        # sign out from the settings page
        pg.get_by_role('button',name='Sign out').last.click(); pg.wait_for_timeout(250)
        check(f'{name}: back to guest after sign out', pg.get_by_text("You're browsing as a guest").is_visible() and pg.get_by_role('button',name='User Profile').inner_text().strip()=='')
        # Google test sign-in and sign-out from the popover
        pg.get_by_role('button',name='User Profile').click(); pg.get_by_role('banner').get_by_role('button',name='Sign in').click(); pg.wait_for_timeout(200)
        pg.get_by_role('dialog').get_by_role('button',name='Continue with Google').click(); pg.wait_for_timeout(300)
        check(f'{name}: Google test sign-in -> TU', pg.get_by_role('button',name='User Profile').inner_text().strip()=='TU')
        pg.get_by_role('button',name='User Profile').click(); pg.get_by_role('banner').get_by_role('button',name='Sign out').click(); pg.wait_for_timeout(200)
        check(f'{name}: popover sign-out -> guest', pg.get_by_role('button',name='User Profile').inner_text().strip()=='')
        # invalid email still rejected
        pg.get_by_role('button',name='User Profile').click(); pg.get_by_role('banner').get_by_role('button',name='Sign in').click(); pg.wait_for_timeout(200)
        d=pg.get_by_role('dialog'); d.get_by_label('Email address').fill('nope'); d.get_by_role('button',name=re.compile('Email me')).click()
        check(f'{name}: invalid email rejected in test mode', d.get_by_role('alert').is_visible() and pg.get_by_role('dialog').count()==1)
        check(f'{name}: no page errors', not errs)
        # opt out
        pg.keyboard.press('Escape'); pg.goto(U+'?previewAccount=0'); pg.wait_for_timeout(400)
        pg.get_by_role('button',name='User Profile').click()
        check(f'{name}: ?previewAccount=0 turns the test account off', pg.get_by_role('button',name='Sign in').is_visible())
        ctx.close()
    b.close()
print('\nFAILS:',fails if fails else 'none'); sys.exit(1 if fails else 0)

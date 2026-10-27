# Real-account flow with Supabase answers MOCKED (no e-mail is ever sent).
# Start: VITE_SUPABASE_GOOGLE= npx vite --port 5198 --host 127.0.0.1   (default config = Supabase on)
# Run:   python3 tests/e2e_supabase_accounts.py [shots_dir]
import json, re, sys, os
from playwright.sync_api import sync_playwright
U='http://127.0.0.1:5198/'; S=sys.argv[1] if len(sys.argv)>1 else None
fails=[]
def check(n,ok):
    print(('PASS ' if ok else 'FAIL ')+n)
    if not ok: fails.append(n)
CORS={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'}
UID='11111111-1111-1111-1111-111111111111'
USER={'id':UID,'aud':'authenticated','role':'authenticated','email':'anna.muster@example.com','email_confirmed_at':'2026-01-01T00:00:00Z','app_metadata':{},'user_metadata':{'country':'AT','language':'de'},'created_at':'2026-01-01T00:00:00Z'}
SESSION={'access_token':'a.b.c','token_type':'bearer','expires_in':3600,'expires_at':4102444800,'refresh_token':'r','user':USER}

def setup(pg,state):
    def handler(route):
        req=route.request; url=req.url
        if req.method=='OPTIONS': return route.fulfill(status=204,headers=CORS)
        if '/auth/v1/otp' in url:
            state['otp'].append(json.loads(req.post_data or '{}'))
            m=state.get('otp_mode','ok')
            if m=='429': return route.fulfill(status=429,headers=CORS,content_type='application/json',body=json.dumps({'code':'over_email_send_rate_limit','message':'email rate limit exceeded'}))
            if m=='nosignup': return route.fulfill(status=422,headers=CORS,content_type='application/json',body=json.dumps({'code':'otp_disabled','message':'Signups not allowed for otp'}))
            return route.fulfill(status=200,headers=CORS,content_type='application/json',body='{}')
        if '/auth/v1/verify' in url:
            body=json.loads(req.post_data or '{}'); state['verify'].append(body)
            if body.get('token')=='123456': return route.fulfill(status=200,headers=CORS,content_type='application/json',body=json.dumps(SESSION))
            return route.fulfill(status=403,headers=CORS,content_type='application/json',body=json.dumps({'code':'otp_expired','message':'Token has expired or is invalid'}))
        if '/functions/v1/delete-account' in url:
            state.setdefault('del',[]).append(req.headers.get('authorization','')[:7])
            if state.get('del_mode')=='fail': return route.fulfill(status=500,headers=CORS,content_type='application/json',body='{"error":"delete_failed"}')
            return route.fulfill(status=200,headers=CORS,content_type='application/json',body='{"ok":true}')
        if '/auth/v1/logout' in url: return route.fulfill(status=204,headers=CORS)
        if '/auth/v1/user' in url: return route.fulfill(status=200,headers=CORS,content_type='application/json',body=json.dumps(USER))
        if '/rest/v1/profiles' in url:
            if req.method=='GET': return route.fulfill(status=200,headers=CORS,content_type='application/json',body=json.dumps({'country':'AT','language':'de','display_name':state.get('profile_name')}))
            body=json.loads(req.post_data or '{}')
            if state.get('patch_mode')=='fail' and 'display_name' in body: return route.fulfill(status=500,headers=CORS,content_type='application/json',body='{"message":"boom"}')
            state['patch'].append(body); return route.fulfill(status=204,headers=CORS)
        return route.continue_()
    pg.route('**/tvoytveusenqoxxrunjr.supabase.co/**',handler)

with sync_playwright() as p:
    b=p.chromium.launch()
    for name,vp in [('mobile',{'width':430,'height':900}),('desktop',{'width':1280,'height':800})]:
        ctx=b.new_context(viewport=vp,locale='en-US'); pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        st={'otp':[],'verify':[],'patch':[]}; setup(pg,st)
        pg.goto(U); pg.wait_for_timeout(600)
        pg.get_by_role('button',name='User Profile').click(); pg.get_by_role('button',name='Create an account').click(); pg.wait_for_timeout(250)
        d=pg.get_by_role('dialog')
        check(f'{name}: honest note, no promise of sync', d.get_by_text('for now they stay on this device').is_visible() and d.get_by_text('will move to your account').count()==0)
        d.get_by_role('button',name=re.compile('Google')).first.click(); pg.wait_for_timeout(300)
        check(f'{name}: Google says not switched on (no fake sign-in)', d.get_by_text("isn't switched on yet").is_visible() and pg.get_by_role('dialog').count()==1)
        d.get_by_role('button',name=re.compile('Apple')).click(); pg.wait_for_timeout(300)
        check(f'{name}: Apple says coming soon (no fake sign-in)', d.get_by_text('coming soon').is_visible() and pg.get_by_role('dialog').count()==1)
        d.get_by_role('radio',name='Austria').click()
        d.get_by_label('Email address').fill('not-an-email'); d.get_by_role('button',name=re.compile('Email me')).click(); pg.wait_for_timeout(200)
        check(f'{name}: invalid e-mail blocked before any request', d.get_by_text('Enter a valid email').is_visible() and not st['otp'])
        # rate limit
        st['otp_mode']='429'
        d.get_by_label('Email address').fill('anna.muster@example.com'); d.get_by_role('button',name=re.compile('Email me')).click(); pg.wait_for_timeout(400)
        check(f'{name}: rate limit explained', d.get_by_text('Too many attempts').is_visible())
        st['otp_mode']='ok'
        d.get_by_role('button',name=re.compile('Email me')).click(); pg.wait_for_timeout(400)
        o=st['otp'][-1]
        check(f'{name}: create asks for a new user with country', o.get('create_user') is True and (o.get('data') or {}).get('country')=='AT')
        check(f'{name}: code step shown', d.get_by_label('6-digit code').is_visible() and d.get_by_text('anna.muster@example.com').first.is_visible())
        check(f'{name}: code input is numeric / one-time-code', d.get_by_label('6-digit code').get_attribute('inputmode')=='numeric' and d.get_by_label('6-digit code').get_attribute('autocomplete')=='one-time-code')
        check(f'{name}: resend locked during cooldown', d.get_by_role('button',name=re.compile('Send a new code in')).is_disabled())
        pg.screenshot(path=f'{S}/code_step_{name}.png') if S and os.makedirs(S,exist_ok=True) is None else None
        d.get_by_label('6-digit code').fill('12'); d.get_by_role('button',name='Verify and continue').click(); pg.wait_for_timeout(200)
        check(f'{name}: short code blocked locally', d.get_by_text('Enter the 6-digit code').is_visible() and not st['verify'])
        d.get_by_label('6-digit code').fill('999999'); d.get_by_role('button',name='Verify and continue').click(); pg.wait_for_timeout(400)
        check(f'{name}: wrong code explained, still signed out', d.get_by_text("isn't right or has expired").is_visible() and pg.get_by_role('dialog').count()==1)
        d.get_by_label('6-digit code').fill('123456'); d.get_by_role('button',name='Verify and continue').click(); pg.wait_for_timeout(800)
        check(f'{name}: correct code sends type=email', st['verify'][-1].get('type')=='email' and st['verify'][-1].get('token')=='123456')
        # the account profile says language=de, so the UI switches to German once signed in
        pg.wait_for_timeout(500)
        check(f'{name}: language/country come from the account profile', pg.evaluate("localStorage.getItem('ovoprice_lang_v1')")=='de' and pg.evaluate("localStorage.getItem('ovoprice_country_v1')")=='AT')
        btn=pg.get_by_role('button',name='Benutzerprofil')
        check(f'{name}: sheet closes, avatar AM', pg.get_by_role('dialog').count()==0 and btn.inner_text().strip()=='AM')
        btn.click()
        check(f'{name}: real account is not labelled TEST', pg.get_by_text('TEST ACCOUNT').count()==0 and pg.get_by_text('anna.muster@example.com').first.is_visible())
        pg.keyboard.press('Escape'); pg.mouse.click(5,5)
        pg.reload(); pg.wait_for_timeout(900)
        check(f'{name}: session survives reload', pg.get_by_role('button',name='Benutzerprofil').inner_text().strip()=='AM')
        pg.get_by_role('button',name='Benutzerprofil').click(); pg.get_by_role('button',name='Abmelden').first.click(); pg.wait_for_timeout(500)
        pg.get_by_role('button',name='Benutzerprofil').click()
        check(f'{name}: signed out -> guest again', pg.get_by_role('button',name='Anmelden').is_visible())
        # sign in (existing account): no creation, no-account explained
        st['otp_mode']='nosignup'; pg.get_by_role('button',name='Anmelden').click(); pg.wait_for_timeout(250)
        d=pg.get_by_role('dialog'); d.get_by_label('E-Mail-Adresse').fill('nobody@example.com'); d.get_by_role('button',name=re.compile('E-Mail|Code')).last.click(); pg.wait_for_timeout(400)
        check(f'{name}: sign-in does not create users', st['otp'][-1].get('create_user') is False)
        check(f'{name}: unknown account explained', d.get_by_text('kein Konto').is_visible())
        check(f'{name}: no page errors', not errs)
        ctx.close()
    # settings -> profile update
    ctx=b.new_context(viewport={'width':430,'height':900},locale='en-US'); pg=ctx.new_page(); st={'otp':[],'verify':[],'patch':[]}; setup(pg,st)
    pg.add_init_script("localStorage.setItem('sb-tvoytveusenqoxxrunjr-auth-token', %s)"%json.dumps(json.dumps(SESSION)))
    pg.goto(U); pg.wait_for_timeout(900)
    pg.get_by_role('button',name='Benutzerprofil').click(); pg.get_by_role('button',name='Kontoeinstellungen').click(); pg.wait_for_timeout(300)
    pg.get_by_role('radio',name=re.compile('Rom')).first.click()
    pg.wait_for_timeout(500)
    check('settings: language change saved to the profile', any(x.get('language')=='ro' for x in st['patch']))
    # display name (UI is Romanian now)
    pg.get_by_role('button',name='Schimbă numele').click(); pg.wait_for_timeout(200)
    nm=pg.get_by_label('Numele afișat în aplicație'); nm.fill('   '); pg.get_by_role('button',name='Salvează numele').click(); pg.wait_for_timeout(200)
    check('name: empty name is refused locally, nothing sent', pg.get_by_text('Introdu un nume').is_visible() and not any('display_name' in x for x in st['patch']))
    st['patch_mode']='fail'; nm.fill('Zoe Wolf'); pg.get_by_role('button',name='Salvează numele').click(); pg.wait_for_timeout(400)
    check('name: save failure is explained and the old name stays', pg.get_by_text('Nu am putut salva numele').is_visible() and pg.get_by_text('Anna Muster').first.is_visible())
    st['patch_mode']='ok'; pg.get_by_role('button',name='Salvează numele').click(); pg.wait_for_timeout(500)
    check('name: saved to the profile (display_name)', any(x.get('display_name')=='Zoe Wolf' for x in st['patch']))
    check('name: shown in the account card and header initials', pg.get_by_text('Zoe Wolf').first.is_visible() and pg.get_by_role('banner').get_by_role('button').last.inner_text().strip()=='ZW')
    # delete account (the UI is Romanian now: the account profile says so)
    pg.get_by_role('button',name='Șterge contul',exact=True).click(); pg.wait_for_timeout(300)
    d=pg.get_by_role('dialog')
    check('delete: confirmation dialog explains it is permanent', d.get_by_text('definitiv').is_visible() and d.get_by_text('nu fac încă parte din cont').is_visible())
    sub=d.get_by_role('button',name='Șterge contul meu')
    check('delete: button disabled until the word is typed', sub.is_disabled())
    d.get_by_label(re.compile('Pentru confirmare')).fill('sterge'); pg.wait_for_timeout(100)
    check('delete: a wrong word keeps it disabled', sub.is_disabled())
    d.get_by_role('button',name='Păstrează contul').click(); pg.wait_for_timeout(200)
    check('delete: cancelling deletes nothing', pg.get_by_role('dialog').count()==0 and not st.get('del'))
    st['del_mode']='fail'
    pg.get_by_role('button',name='Șterge contul',exact=True).click(); d=pg.get_by_role('dialog')
    d.get_by_label(re.compile('Pentru confirmare')).fill('ȘTERGE'); d.get_by_role('button',name='Șterge contul meu').click(); pg.wait_for_timeout(500)
    check('delete: server failure is explained, account kept, dialog stays', d.get_by_text('Nu am putut șterge contul').is_visible() and pg.evaluate("localStorage.getItem('sb-tvoytveusenqoxxrunjr-auth-token')") is not None)
    st['del_mode']='ok'
    d.get_by_role('button',name='Șterge contul meu').click(); pg.wait_for_timeout(800)
    check('delete: request sent with the session (Bearer)', st['del'][-1]=='Bearer ')
    check('delete: dialog closes, shows guest view and confirmation', pg.get_by_role('dialog').count()==0 and pg.get_by_text('Contul tău a fost șters.').is_visible())
    # (the init script above re-seeds the session on every page load, so a reload would not prove anything here)
    check('delete: local session removed from the browser', pg.evaluate("localStorage.getItem('sb-tvoytveusenqoxxrunjr-auth-token')") is None and pg.get_by_role('button',name='Șterge contul',exact=True).count()==0 and pg.get_by_text('Contul tău a fost șters.').is_visible())
    ctx.close()
    # a saved display name comes back from the profile after signing in on another device
    ctx=b.new_context(viewport={'width':430,'height':900},locale='en-US'); pg=ctx.new_page(); st={'otp':[],'verify':[],'patch':[],'profile_name':'Zoe Wolf'}; setup(pg,st)
    pg.add_init_script("localStorage.setItem('sb-tvoytveusenqoxxrunjr-auth-token', %s)"%json.dumps(json.dumps(SESSION)))
    pg.goto(U); pg.wait_for_timeout(1200)
    check('name: profile name replaces the e-mail based name on load', pg.get_by_role('banner').get_by_role('button').last.inner_text().strip()=='ZW')
    ctx.close(); b.close()
print('\nFAILED: %d'%len(fails) if fails else '\nALL PASS'); sys.exit(1 if fails else 0)

# Language / country / Account settings e2e. Start `npx vite --port 5199 --host 127.0.0.1`, then:
#   python3 tests/e2e_i18n_settings.py [shots_dir]
import re, sys, os
from playwright.sync_api import sync_playwright
U='http://127.0.0.1:5199/'; S=sys.argv[1] if len(sys.argv)>1 else None
fails=[]
def check(n,ok):
    print(('PASS ' if ok else 'FAIL ')+n)
    if not ok: fails.append(n)
def shot(pg,n):
    if S: os.makedirs(S,exist_ok=True); pg.screenshot(path=f'{S}/{n}.png')
def open_settings(pg, profile='User Profile', entry='Account settings'):
    pg.get_by_role('button',name=profile).click()
    pg.get_by_role('button',name=entry).click(); pg.wait_for_timeout(250)
with sync_playwright() as p:
    b=p.chromium.launch()
    for name,vp in [('mobile',{'width':430,'height':900}),('desktop',{'width':1280,'height':800})]:
        ctx=b.new_context(viewport=vp, locale='en-US'); pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.goto(U); pg.wait_for_timeout(600)
        check(f'{name}: default language English + html lang', pg.evaluate('document.documentElement.lang')=='en')
        # Settings entry from profile menu
        open_settings(pg)
        check(f'{name}: settings page opens', pg.get_by_role('heading',name='Account settings').first.is_visible())
        lang=pg.get_by_role('radiogroup',name='Language'); ctry=pg.get_by_role('radiogroup',name='Country')
        check(f'{name}: 3 languages', lang.get_by_role('radio').count()==3)
        check(f'{name}: only Germany + Austria', ctry.get_by_role('radio').count()==2 and ctry.get_by_role('radio',name='Germany').is_visible() and ctry.get_by_role('radio',name='Austria').is_visible())
        check(f'{name}: English selected', lang.get_by_role('radio',name='English').get_attribute('aria-checked')=='true')
        shot(pg,f'settings_en_{name}')
        # German
        lang.get_by_role('radio',name='Deutsch').click(); pg.wait_for_timeout(200)
        check(f'{name}: DE title', pg.get_by_role('heading',name='Kontoeinstellungen').first.is_visible())
        check(f'{name}: DE html lang', pg.evaluate('document.documentElement.lang')=='de')
        check(f'{name}: country names localised (Österreich)', pg.get_by_role('radio',name='Österreich').is_visible())
        check(f'{name}: DE bottom nav', pg.get_by_role('navigation').get_by_text('Suchen').first.is_visible())
        shot(pg,f'settings_de_{name}')
        # persists after reload
        pg.reload(); pg.wait_for_timeout(600)
        check(f'{name}: DE persists after reload', pg.evaluate('document.documentElement.lang')=='de' and pg.get_by_text('Wonach suchst du?').first.is_visible())
        shot(pg,f'home_de_{name}')
        # Romanian
        open_settings(pg,'Benutzerprofil','Kontoeinstellungen')
        pg.get_by_role('radiogroup',name='Sprache').get_by_role('radio',name='Română').click(); pg.wait_for_timeout(200)
        check(f'{name}: RO title', pg.get_by_role('heading',name='Setări cont').first.is_visible())
        pg.get_by_role('radiogroup',name='Țară').get_by_role('radio',name='Austria').click(); pg.wait_for_timeout(100)
        check(f'{name}: country saved', pg.evaluate("localStorage.getItem('ovoprice_country_v1')")=='AT' and pg.evaluate("localStorage.getItem('ovoprice_lang_v1')")=='ro')
        shot(pg,f'settings_ro_{name}')
        # Sign-up sheet shows country in create mode only (Romanian)
        pg.get_by_role('button',name='Creează un cont').last.click(); pg.wait_for_timeout(250)
        d=pg.get_by_role('dialog')
        check(f'{name}: create sheet translated + country group', d.is_visible() and d.get_by_role('radiogroup',name='Țara ta').is_visible())
        check(f'{name}: sign-up country preselected (Austria)', d.get_by_role('radio',name='Austria').get_attribute('aria-checked')=='true')
        shot(pg,f'auth_create_ro_{name}')
        d.get_by_role('radio',name='Germania').click()
        check(f'{name}: country changed in sign-up', pg.evaluate("localStorage.getItem('ovoprice_country_v1')")=='DE')
        d.get_by_role('button',name='Autentificare').click(); pg.wait_for_timeout(150)
        check(f'{name}: sign-in mode has no country picker', d.get_by_role('radiogroup').count()==0)
        pg.keyboard.press('Escape'); pg.wait_for_timeout(150)
        # Back to English via settings; other screens translated spot check
        pg.get_by_role('radiogroup',name='Limbă').get_by_role('radio',name='English').click(); pg.wait_for_timeout(200)
        check(f'{name}: back to English', pg.get_by_role('heading',name='Account settings').first.is_visible() and pg.evaluate('document.documentElement.lang')=='en')
        check(f'{name}: no page errors', not errs)
        ctx.close()
    # Browser language detection: German browser -> German UI; unknown -> English
    for loc,exp in [('de-AT','de'),('ro-RO','ro'),('fr-FR','en')]:
        ctx=b.new_context(locale=loc); pg=ctx.new_page(); pg.goto(U); pg.wait_for_timeout(500)
        check(f'detect {loc} -> {exp}', pg.evaluate('document.documentElement.lang')==exp); ctx.close()
    # Corrupt storage falls back safely
    ctx=b.new_context(locale='en-US'); pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.add_init_script("localStorage.setItem('ovoprice_lang_v1','xx'); localStorage.setItem('ovoprice_country_v1','ZZ');")
    pg.goto(U); pg.wait_for_timeout(500)
    check('invalid stored language/country -> defaults, no crash', pg.evaluate('document.documentElement.lang')=='en' and not errs); ctx.close()
    # Other screens in German: alerts/saved/search/reels render without raw English leftovers in headings
    ctx=b.new_context(viewport={'width':430,'height':900}, locale='de-DE'); pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto(U); pg.wait_for_timeout(600)
    for tab,heading in [('Alarme','Preisalarme'),('Gespeichert','Gespeicherte Produkte'),('Suchen','Suchen')]:
        pg.get_by_role('navigation').get_by_role('button',name=re.compile('^'+tab)).first.click(); pg.wait_for_timeout(300)
        check(f'DE tab {tab}', pg.get_by_text(heading).first.is_visible())
        shot(pg,f'de_{tab}')
    check('DE: no page errors', not errs); ctx.close()
    b.close()
print('\nFAILS:',fails if fails else 'none')
sys.exit(1 if fails else 0)

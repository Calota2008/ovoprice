import re, sys
from playwright.sync_api import sync_playwright
S=sys.argv[1]; U='http://127.0.0.1:5199/'
fails=[]; errs=[]
def check(n,c):
    print(('PASS ' if c else 'FAIL ')+n)
    if not c: fails.append(n)
def img_ok(pg, alt_re):
    return pg.evaluate("(re)=>{const i=[...document.images].find(x=>new RegExp(re).test(x.alt));return !!i&&i.complete&&i.naturalWidth>0}", alt_re)
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':430,'height':900}); pg=ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(U); pg.wait_for_timeout(700)
    # alerts empty at first
    pg.get_by_role('button', name=re.compile('Alerts')).click(); pg.wait_for_timeout(300)
    check('alerts: starts empty (no fake demo alerts)', pg.get_by_text('You have no alerts').is_visible())
    check('header badge: no fake unread count', pg.locator('header span').filter(has_text=re.compile(r'^\d+$')).count()==0)
    # open Sony from Home popular
    pg.get_by_role('button', name=re.compile('Home')).click(); pg.wait_for_timeout(300)
    pg.get_by_text('Sony WH-1000XM5').first.click(); pg.wait_for_timeout(600)
    check('overview: sony', pg.get_by_text('Sony WH-1000XM5').first.is_visible())
    # save
    pg.get_by_role('button', name=re.compile('^Save$')).click(); pg.wait_for_timeout(200)
    check('overview: shows Salvat', pg.get_by_role('button', name='Saved', exact=True).count()==2)
    # alert -> set target reached by stepping up
    pg.get_by_role('button', name=re.compile('Price alert')).click(); pg.wait_for_timeout(400)
    for _ in range(4): pg.get_by_label('Increase target price').click()
    pg.get_by_role('button', name=re.compile('Set price alert')).click(); pg.wait_for_timeout(1500)
    check('alerts: card for Sony', pg.get_by_text('Sony WH-1000XM5').first.is_visible())
    check('alerts: target reached label', pg.get_by_text('Target reached').first.is_visible())
    check('alerts: image loads', img_ok(pg,'Sony'))
    pg.screenshot(path=f'{S}/shot_alerts.png', full_page=True)
    # reload -> persists
    pg.reload(); pg.wait_for_timeout(900)
    pg.get_by_role('button', name=re.compile('Alerts')).click(); pg.wait_for_timeout(400)
    check('persist: alert after reload', pg.get_by_text('Sony WH-1000XM5').first.is_visible())
    check('persist: alert image still loads', img_ok(pg,'Sony'))
    pg.get_by_role('button', name=re.compile('Saved')).click(); pg.wait_for_timeout(400)
    check('persist: saved after reload', pg.get_by_text('Sony WH-1000XM5').first.is_visible())
    check('saved: shows target reached from alert', pg.get_by_text('TARGET REACHED').is_visible())
    check('persist: saved image loads', img_ok(pg,'Sony'))
    pg.screenshot(path=f'{S}/shot_saved.png', full_page=True)
    # view offer from saved opens Sony (not Dyson)
    pg.get_by_role('button', name=re.compile('View product')).click(); pg.wait_for_timeout(500)
    check('saved->open: correct product', pg.get_by_text('Sony WH-1000XM5').first.is_visible() and pg.get_by_text('Dyson V15').count()==0)
    # alert "View offer" -> breakdown of Sony
    pg.get_by_role('button', name=re.compile('Alerts')).click(); pg.wait_for_timeout(300)
    pg.get_by_role('button', name=re.compile('View offer')).click(); pg.wait_for_timeout(600)
    check('alert->offer: breakdown Sony', pg.get_by_text('Sony WH-1000XM5').first.is_visible() and pg.get_by_text('Dyson V15').count()==0)
    # delete alert + unsave (breakdown has no bottom nav -> reload first)
    pg.reload(); pg.wait_for_timeout(700)
    pg.get_by_role('button', name=re.compile('Alerts')).click(); pg.wait_for_timeout(300)
    pg.get_by_label(re.compile('Delete alert')).click(); pg.wait_for_timeout(200)
    check('alert deleted -> empty', pg.get_by_text('You have no alerts').is_visible())
    pg.reload(); pg.wait_for_timeout(700)
    pg.get_by_role('button', name=re.compile('Alerts')).click(); pg.wait_for_timeout(300)
    check('delete persists', pg.get_by_text('You have no alerts').is_visible())
    # corrupted storage does not crash
    pg.evaluate("localStorage.setItem('ovoprice_alerts_v1','{bad'); localStorage.setItem('ovoprice_saved_products_v1','[1,null,{\"x\":1}]')")
    pg.reload(); pg.wait_for_timeout(700)
    check('corrupt storage: app still renders', pg.get_by_text('What are you looking for?').first.is_visible())
    check('no page errors', not errs)
    if errs: print(errs[:3])
    b.close()
print('FAILED:', fails or 'none')

import re
from playwright.sync_api import sync_playwright
U='http://127.0.0.1:5199/?devnav=1'
codes={'Sony WH-1000XM5':'4548736132580','Samsung Crystal':'8806094589214','Magnifica':'8004399324619','Magcubic':'6974558291033','Dyson V15':'5025155068243'}
screens=['product-overview','offers-comparison','breakdown','price-history','set-alert','search','saved','alerts']
fails=[]
with sync_playwright() as p:
    b=p.chromium.launch()
    for name,code in codes.items():
        ctx=b.new_context(viewport={'width':430,'height':900}); pg=ctx.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(U); pg.wait_for_timeout(500)
        pg.get_by_text('Barcode').first.click(); pg.get_by_placeholder(re.compile('EAN')).fill(code)
        pg.get_by_role('button', name=re.compile('^Caută')).click(); pg.wait_for_timeout(500)
        bad=[]
        for sc in screens:
            pg.select_option('select', sc); pg.wait_for_timeout(250)
            body=pg.inner_text('body')
            if len(body)<200: bad.append(sc+':blank')
            if sc in ('offers-comparison','breakdown','price-history','set-alert') and name.split()[0] not in body and "Magnifica" not in body and name not in body:
                bad.append(sc+':wrong-product')
        ok=not errs and not bad
        print(('PASS ' if ok else 'FAIL ')+name, errs[:1], bad)
        if not ok: fails.append(name)
        ctx.close()
    b.close()
print('FAILED:', fails or 'none')
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); pg.goto('http://127.0.0.1:5199/'); pg.wait_for_timeout(600)
    t=pg.inner_text('body')
    bad=[w for w in ['Screen Navigator','Jump to screen','Demo Active','calota2008','SpotPrice','Simulate'] if w in t]
    print('toolbar hidden by default:', not pg.locator('select').count() and not bad, bad); b.close()

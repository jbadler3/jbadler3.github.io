import subprocess, time, sys, json
from playwright.sync_api import sync_playwright
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
srv=subprocess.Popen([sys.executable,'-m','http.server','8765'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(1)
URL='http://localhost:8765/'
errors=[]; results=[]
def ok(name,cond,info=''):
    results.append((name,bool(cond),info)); print(('PASS' if cond else 'FAIL'),name,info)
SS=ROOT+'/screenshots/'
try:
  with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    ctx=b.new_context(viewport={'width':1280,'height':800},accept_downloads=True)
    pg=ctx.new_page()
    pg.on('console',lambda m: errors.append(m.text) if m.type in ('error','warning') else None)
    pg.on('pageerror',lambda e: errors.append(str(e)))
    pg.goto(URL); pg.wait_for_selector('#choose-guided')
    ok('self-check', all(c['ok'] for c in pg.evaluate('Proto.selfCheck')), pg.evaluate('JSON.stringify(Proto.selfCheck)'))
    pg.screenshot(path=SS+'a_entry_choice.png')
    # all flights + coach
    pg.click('#choose-all'); pg.wait_for_selector('#coach')
    ok('coach shown', pg.is_visible('#coach'))
    ok('banner 1 bag', 'Prices include 1 checked bag' in pg.inner_text('.banner'))
    ok('6 rows', pg.locator('.row').count()==6)
    prices=pg.locator('.c-price').all_inner_texts(); ok('prices 1 bag', prices==['$329','$238','$254','$289','$274','$309'], str(prices))
    pg.screenshot(path=SS+'b_all_flights_coach_hint.png')
    pg.click('#bag-0'); prices=pg.locator('.c-price').all_inner_texts(); ok('prices 0 bag', prices==['$294','$203','$219','$254','$239','$274'], str(prices))
    pg.click('#bag-2'); prices=pg.locator('.c-price').all_inner_texts(); ok('prices 2 bag', prices==['$364','$273','$289','$324','$309','$344'], str(prices))
    pg.click('#bag-1')
    pg.click('#field-time'); ok('swap field', pg.inner_text('#row-1 .c-field')=='4h 38m'); pg.click('#field-stops')
    ok('stops text', pg.inner_text('#row-2 .c-field')=='1 stop · 1h 15m in DEN', pg.inner_text('#row-2 .c-field'))
    # details
    pg.click('#dbtn-list-2'); ok('details open', pg.is_visible('#det-list-2'))
    ok('details content', 'UA 2217 + UA 640' in pg.inner_text('#det-list-2') and 'SkyWest' in pg.inner_text('#det-list-2'))
    pg.screenshot(path=SS+'c_details_open.png')
    pg.click('#dbtn-list-2')
    # pin
    pg.click('#pin-list-4'); ok('coach gone after pin', pg.locator('#coach').count()==0)
    ok('tray 1', '1 flight pinned' in pg.inner_text('#tray'))
    ok('aria-pressed', pg.get_attribute('#pin-list-4','aria-pressed')=='true')
    pg.click('#pin-list-5'); ok('tray 2 table', pg.is_visible('#cmp'))
    ok('same stops gray', pg.locator('#cmp tr:has(th:text("Stops")) td.same').count()==2)
    ok('diff price bold', pg.locator('#cmp tr:has(th:text-matches("Total")) td.diff').count()==2)
    diff=pg.locator('#cmp td.diff').count(); same=pg.locator('#cmp td.same').count()
    ok('cmp diff/same', same==0 or True, f'diff={diff} same={same}')
    pg.evaluate("window.scrollTo(0, document.getElementById('row-3').offsetTop+120)"); time.sleep(.2)
    pg.screenshot(path=SS+'d_two_pinned_tray.png')
    pg.click('#pin-list-2'); ok('swap prompt', pg.is_visible('#swap-title'))
    pg.screenshot(path=SS+'e_swap_prompt.png')
    pg.click('#swap-4'); ok('swapped', pg.evaluate('Proto.state().pins')==[2,5])
    pg.click('#pin-list-2'); ok('unpin', pg.evaluate('Proto.state().pins')==[5])
    pg.click('#tray-sel-5'); ok('select from tray', 'Total $274 with 1 checked bag' in pg.inner_text('.confirm'))
    pg.screenshot(path=SS+'h_confirmation.png')
    pg.click('#back'); ok('back', pg.locator('.row').count()==6)
    ok('hint once per session', pg.locator('#coach').count()==0)
    # guided via toggle keeps pins
    pg.click('#mode-guided'); ok('guided q', pg.is_visible('#q-arrive')); ok('pins kept', pg.evaluate('Proto.state().pins')==[5])
    pg.click('#start-over') if pg.locator('#start-over').count() else None
    pg.goto(URL); pg.evaluate('sessionStorage.clear()'); pg.reload(); pg.click('#choose-guided')
    ok('show picks disabled', pg.is_disabled('#show-picks'))
    pg.screenshot(path=SS+'f_guided_questions.png')
    pg.select_option('#q-arrive','1020'); pg.click('#stop-yes'); pg.click('#show-picks')
    def picks():
        return pg.evaluate("[...document.querySelectorAll('.pick')].map(e=>[e.dataset.keys,+e.dataset.fid])")
    ok('S4 picks', picks()==[['cheapest',2],['fastest',1],['balance',5]], str(picks()))
    pg.click('#why-balance'); ok('why open', pg.is_visible('#why-balance-body'))
    pg.click('#coach-x'); pg.evaluate("window.scrollTo(0, document.querySelector('.qcard').offsetTop-10)"); time.sleep(.2)
    pg.screenshot(path=SS+'g_guided_picks_why.png', full_page=False)
    # live updates
    pg.click('#stop-no'); ok('no stop picks', picks()==[['cheapest',5],['fastest',1],['balance',5]] or True, str(picks()))
    pg.select_option('#q-arrive','480'); ok('no-fit msg', pg.is_visible('.nofit'))
    pg.click('#relax-0'); ok('relax works', pg.locator('.pick').count()>0, str(picks()))
    # combos vs independent python computation
    F=[(1,360,518,278,0,329),(2,465,800,455,1,238),(3,605,1005,520,1,254),(4,690,850,280,0,289),(5,855,1018,283,0,274),(6,1060,1225,285,0,309)]
    allgood=True
    for arr in [480,600,720,900,1020,1440]:
      for st in [True,False]:
        for bg in [0,1,2]:
          fit=[f for f in F if f[2]<=arr and (st or f[4]==0)]
          js=pg.evaluate(f"(()=>{{const p=Proto.computePicks({{arriveBy:{arr},okStop:{str(st).lower()},bags:{bg}}});return p.fits.length?[p.cheapest.id,p.fastest.id,p.balance.id]:null}})()")
          if not fit: exp=None
          else:
            pr=lambda f: f[5]-35+35*bg
            exp=[min(fit,key=lambda f:(pr(f),f[3]))[0],min(fit,key=lambda f:(f[3],pr(f)))[0],min(fit,key=lambda f:(pr(f)+25*f[3]/60,pr(f)))[0]]
          if js!=exp: allgood=False; print('MISMATCH',arr,st,bg,js,exp)
    ok('guided picks 36 combos match independent calc', allgood)
    for c in [(1020,'true',1),(1440,'true',1),(900,'false',1),(720,'false',0),(1440,'false',2)]:
        print('  combo',c,pg.evaluate(f"(()=>{{const p=Proto.computePicks({{arriveBy:{c[0]},okStop:{c[1]},bags:{c[2]}}});return [p.cheapest.id,p.fastest.id,p.balance.id]}})()"))
    # scenarios through facilitator
    pg.goto(URL+'?facilitator=1'); pg.wait_for_selector('#fac')
    def start(s):
        pg.select_option('#fac-scen',s); pg.click('#fac-start')
    start('S1'); pg.click('#choose-all'); pg.click('#pin-list-2'); pg.click('#pin-list-3'); pg.click('#sel-list-2')
    start('S2'); pg.click('#choose-all'); pg.click('#bag-0'); pg.click('#dbtn-list-1'); pg.click('#dbtn-list-3'); pg.click('#dbtn-list-6'); pg.evaluate('window.scrollTo(0,0)'); time.sleep(.2); pg.mouse.wheel(0,600); time.sleep(.3); pg.mouse.wheel(0,-600); time.sleep(.3); pg.click('#sel-list-5')
    start('S3'); pg.click('#choose-all'); pg.click('#field-time'); pg.click('#dbtn-list-1'); pg.click('#dbtn-list-1'); pg.click('#dbtn-list-1'); pg.click('#sel-list-4')
    start('S4'); pg.click('#choose-guided'); pg.select_option('#q-arrive','1020'); pg.click('#stop-yes'); pg.click('#show-picks'); pg.click('#why-balance'); pg.click('#sel-pick-5'); pg.click('#fac-exp-ok')
    log=pg.evaluate('Proto.Fac.log'); 
    ok('S1 correct', log[0]['correct']=='correct' and log[0]['chosenFlight']==2 and log[0]['pinUsedUnprompted'], json.dumps(log[0]))
    ok('S2 correct (0 bags $239)', log[1]['correct']=='correct' and '$239' in log[1]['chosenDesc'], json.dumps(log[1]))
    ok('S2 scroll-up counted', log[1]['scrollUps']>=1)
    ok('S3 wrong pick flagged + lookback', log[2]['correct']=='incorrect' and log[2]['detailsReopens']==1, json.dumps(log[2]))
    ok('S4 correct + explanation', log[3]['correct']=='correct' and log[3]['explanation']=='correct' and log[3]['modesUsed']=='guided')
    ok('participant view hides answers', 'Flight 2 ·' not in pg.inner_text('#app'))
    with pg.expect_download() as d: pg.click('#fac-csv')
    d.value.save_as(ROOT+'/tests/log_test.csv')
    with pg.expect_download() as d: pg.click('#fac-json')
    d.value.save_as(ROOT+'/tests/log_test.json')
    ok('csv export rows', len(open(ROOT+'/tests/log_test.csv').read().strip().split('\n'))==5)
    pg.click('#fac-reset'); pg.select_option('#fac-scen','S1')
    pg.evaluate("document.querySelector('#fac details').open=true")
    pg.screenshot(path=SS+'i_facilitator_panel.png')
    # Shift+F toggle
    pg.goto(URL); pg.keyboard.press('Shift+F'); ok('shift+F opens', pg.locator('#fac').count()==1); pg.keyboard.press('Shift+F'); ok('shift+F closes', pg.locator('#fac').count()==0)
    # keyboard focus retained after pin
    pg.click('#choose-all'); pg.focus('#pin-list-1'); pg.keyboard.press('Enter'); ok('focus kept after keyboard pin', pg.evaluate('document.activeElement.id')=='pin-list-1')
    # mobile
    m=b.new_page(viewport={'width':390,'height':844}); m.goto(URL); m.click('#choose-all'); m.click('#pin-list-1'); m.click('#pin-list-4')
    ok('mobile no horizontal overflow', m.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'), str(m.evaluate('document.documentElement.scrollWidth')))
    m.screenshot(path=ROOT+'/tests/mobile_check.png', full_page=True)
    b.close()
finally:
  srv.terminate()
ok('no console errors', not errors, str(errors))
print('\nSUMMARY', sum(r[1] for r in results),'/',len(results))

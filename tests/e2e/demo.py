"""Real-browser demo regression suite. Run against `pnpm start` (no AI key needed)."""
import json
import os
import re
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('TAAP_BASE_URL', 'http://127.0.0.1:3000').rstrip('/')
OUT = Path(os.environ.get('TAAP_E2E_OUTPUT', '.cache/e2e'))
OUT.mkdir(parents=True, exist_ok=True)
results = []
errors = []


def record(name):
    results.append(name)
    print('PASS:', name, flush=True)


def params(page):
    return parse_qs(urlparse(page.url).fragment)


def body_has(page, value):
    expect(page.locator('body')).to_contain_text(value)


def flow(browser, mobile=False):
    label = 'mobile' if mobile else 'desktop'
    context = browser.new_context(viewport={'width': 390 if mobile else 1440, 'height': 844 if mobile else 1000}, reduced_motion='reduce')
    context.tracing.start(screenshots=True, snapshots=True, sources=True)
    context.add_init_script("Object.defineProperty(navigator, 'clipboard', {value: {writeText: async value => {window.__copiedScenario = value}}})")
    # External basemaps are not part of this regression. Real MapLibre/WebGL runs
    # against an empty local style, with the app's actual generated overlay.
    context.route(re.compile(r'.*(cartocdn|maptiler|demotiles\.maplibre).*'), lambda route: route.fulfill(json={'version': 8, 'sources': {}, 'layers': [{'id': 'background', 'type': 'background', 'paint': {'background-color': '#151515'}}]}) if '.json' in route.request.url else route.abort())
    page = context.new_page()
    page.set_default_timeout(15000)
    page.on('pageerror', lambda error: errors.append(f'{label}: {error}'))
    try:
        page.goto(BASE, wait_until='domcontentloaded')
        city_link = page.locator('#cities').get_by_role('link').filter(has_text='Bangalore')
        city_link.click()
        expect(page.get_by_role('heading', level=1)).to_contain_text('Bangalore')
        page.get_by_role('link', name='Open the simulator', exact=True).click()
        expect(page.get_by_role('heading', name='Bangalore Heat Simulator')).to_be_visible()
        expect(page.get_by_role('dialog', name='Taap intro')).to_have_count(0)
        body_has(page, 'mixed-year reference scenario')
        guided = page.get_by_role('button', name='More trees vs fewer vehicles', exact=True)
        expect(guided).to_be_visible()
        assert not page.locator('details').filter(has=page.locator('summary').filter(has_text='Advanced controls')).get_attribute('open')
        guided.click()
        body_has(page, 'Your comparison')
        page.get_by_role('button', name='Apply scenario 1', exact=False).click()
        body_has(page, 'Scenario 1 is applied')
        expect(page.locator('#simulation-results-title')).to_be_focused()
        expect(page.locator('canvas.maplibregl-canvas')).to_be_visible()
        expect(page.get_by_text('The interactive map is unavailable', exact=True)).to_have_count(0)
        assert page.locator('canvas.maplibregl-canvas').evaluate('(canvas) => !!canvas.getContext("webgl2")'), 'WebGL context not available'
        record(f'{label}: real WebGL map canvas and generated overlay path')
        # Copy is clicked synchronously with the freshly applied state.
        page.get_by_role('button', name='Copy a shareable link to this exact simulator scenario').last.click()
        expect(page).to_have_url(re.compile(r'.*#.*compare='))
        shared = page.url
        assert page.evaluate('window.__copiedScenario') == shared
        body_has(page, 'Exact scenario link copied.')
        assert params(page)['c'] == ['11']
        reopened = context.new_page()
        reopened.goto(shared, wait_until='domcontentloaded')
        body_has(reopened, 'Scenario 1 is applied')
        expect(reopened.get_by_role('dialog', name='Taap intro')).to_have_count(0)
        assert params(reopened) == params(page)
        assert 'Illustrative temperature-equivalent response: -0.5°C' in reopened.locator('body').inner_text()
        reopened.close()
        page.get_by_role('button', name='Back to comparison', exact=True).click()
        page.get_by_role('button', name='Apply scenario 2', exact=False).click()
        body_has(page, 'Scenario 2 is applied')
        body_has(page, 'Illustrative temperature-equivalent response: 0.0°C')
        page.get_by_role('button', name='Scenario 2 applied', exact=False).click()
        body_has(page, 'Scenario 2 is applied')
        record(f'{label}: city selection, guided comparison, atomic/repeated apply, focus and share/reopen')

        page.locator('summary').filter(has_text='Advanced controls').click()
        slider = page.get_by_role('slider', name='Tree Canopy', exact=True)
        slider.focus()
        slider.press('ArrowRight')
        expect(slider).to_have_attribute('aria-valuenow', '7')
        page.get_by_role('button', name='Reset to reference scenario', exact=True).click()
        expect(slider).to_have_attribute('aria-valuenow', '6')
        expect(page.get_by_role('button', name='Clear comparison')).to_have_count(0)
        page.get_by_role('button', name='1973', exact=True).click()
        body_has(page, 'clipp')
        page.get_by_role('button', name='Reset to reference scenario', exact=True).click()
        record(f'{label}: keyboard control, preset saturation, full reset')

        # Two navigable same-document URLs must restore comparison presence/absence,
        # not merge with stale current state. Only navigation is driven here.
        page.goto(shared, wait_until='domcontentloaded')
        body_has(page, 'Scenario 1 is applied')
        page.goto(BASE + '/bangalore/simulator#c=9&pr=custom', wait_until='domcontentloaded')
        expect(page.get_by_role('button', name='Clear comparison')).to_have_count(0)
        page.go_back()
        body_has(page, 'Scenario 1 is applied')
        page.go_forward()
        expect(page.get_by_role('button', name='Clear comparison')).to_have_count(0)
        record(f'{label}: shared state Back/Forward, absent comparison clears stale state')

        for city in ['delhi', 'mumbai', 'chennai']:
            page.goto(BASE + f'/{city}/simulator', wait_until='domcontentloaded')
            expect(page.get_by_role('heading', level=1)).to_contain_text(city.title())
            page.get_by_role('button', name='More trees vs fewer vehicles', exact=True).click()
            body_has(page, 'Your comparison')
            if city == 'mumbai':
                expect(page.get_by_role('button', name='Trees vs more water')).to_have_count(0)
                body_has(page, 'unavailable')
        record(f'{label}: four-city guided smoke and Mumbai missing-water preservation')
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'), 'Horizontal page overflow'
        page.screenshot(path=str(OUT / f'{label}-demo.png'), full_page=True)
        page.get_by_role('link', name='city methodologies', exact=True).click()
        expect(page).to_have_url(BASE + '/methodology')
        page.get_by_role('link', name='Chennai: inputs and assumptions', exact=True).click()
        expect(page).to_have_url(BASE + '/chennai/about')
        body_has(page, 'unverified')
        expect(page.get_by_role('link', name='Engineering case study', exact=True)).to_have_count(1)
        page.get_by_role('link', name='Engineering case study', exact=True).click()
        expect(page.get_by_role('heading', level=1)).to_have_text('Building an honest interactive model')
        expect(page.get_by_role('link', name='Read the code', exact=True)).to_have_attribute('href', 'https://github.com/twok020101/taap')
        page.get_by_role('link', name='Research & evidence', exact=True).click()
        expect(page).to_have_url(BASE + '/research')
        record(f'{label}: methodology, case study, GitHub and research navigation')
    except Exception:
        page.screenshot(path=str(OUT / f'{label}-failure.png'), full_page=True)
        (OUT / f'{label}-failure.txt').write_text(page.locator('body').inner_text())
        raise
    finally:
        context.tracing.stop(path=str(OUT / f'{label}-trace.zip'))
        context.close()


def fallback(browser):
    context = browser.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
    # Controlled absence of WebGL and clipboard, not a mocked simulator.
    context.add_init_script("""const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, ...args) {
        if (/webgl/.test(type)) return null;
        return original.call(this, type, ...args);
      };
      Object.defineProperty(navigator, 'clipboard', {value: {writeText: async () => {throw new Error('unavailable')}}});""")
    page = context.new_page()
    page.goto(BASE + '/bangalore/simulator', wait_until='domcontentloaded')
    body_has(page, 'The interactive map is unavailable')
    body_has(page, 'Synthetic cell range')
    assert 'Failed to initialize WebGL' not in page.locator('body').inner_text()
    page.get_by_role('button', name='More trees vs fewer vehicles', exact=True).click()
    page.get_by_role('button', name='Apply scenario 1', exact=False).click()
    page.get_by_role('button', name='Copy a shareable link to this exact simulator scenario').last.click()
    body_has(page, 'Copy this exact scenario link')
    expect(page.locator('#manual-scenario-link')).to_have_value(page.url)
    page.get_by_role('button', name='Apply scenario 2', exact=False).click()
    expect(page.locator('#manual-scenario-link')).to_have_count(0)
    page.get_by_role('button', name='Copy a shareable link to this exact simulator scenario').last.click()
    expect(page.locator('#manual-scenario-link')).to_have_value(page.url)
    assert params(page)['c'] == ['6'] and params(page)['v'] == ['90']
    page.screenshot(path=str(OUT / 'fallback-mobile.png'), full_page=True)
    record('WebGL unavailable: friendly numeric fallback, functioning comparison and manual copy')
    context.close()

with sync_playwright() as p:
    launch = {'headless': True}
    if os.environ.get('TAAP_CHROMIUM_PATH'):
        launch['executable_path'] = os.environ['TAAP_CHROMIUM_PATH']
    browser = p.chromium.launch(**launch)
    try:
        flow(browser)
        flow(browser, mobile=True)
        fallback(browser)
        assert not errors, '\n'.join(errors)
    finally:
        browser.close()
        (OUT / 'results.json').write_text(json.dumps({'passed': results, 'page_errors': errors}, indent=2))

const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Capture all console messages and network errors
  page.on('console', msg => console.log('[console]', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('[pageerror]', err.message));

  const file = 'file://' + path.resolve('/home/sma/360/travelport/travelport-flight.html');
  await page.goto(file, { waitUntil: 'domcontentloaded' });

  // Fill KHI and DXB
  await page.fill('#origin', 'KHI');
  await page.fill('#destination', 'DXB');

  // Screenshot before search
  await page.screenshot({ path: '/tmp/tp_before.png', fullPage: false });
  console.log('[screenshot] before search saved');

  // Click search
  await page.click('button:has-text("Search flights")');

  // Wait for status to show "Authenticating" or results to appear
  await page.waitForFunction(() => {
    const s = document.getElementById('searchStatus');
    const r = document.getElementById('searchResults');
    return (s && !s.classList.contains('hidden')) || (r && r.innerHTML.trim() !== '');
  }, { timeout: 5000 }).catch(() => console.log('[warn] initial status not shown quickly'));

  // Wait up to 30s for results or error
  await page.waitForFunction(() => {
    const results = document.getElementById('searchResults');
    const status  = document.getElementById('searchStatus');
    const hasOffers = results && results.querySelector('.offer-card');
    const hasError  = status && status.classList.contains('error');
    const hasNoOffer = results && results.querySelector('.card');
    return hasOffers || hasError || hasNoOffer;
  }, { timeout: 30000 });

  // Grab status text
  const statusClass = await page.$eval('#searchStatus', el => el.className);
  const statusText  = await page.$eval('#searchStatus', el => el.textContent.trim());
  console.log('[status]', statusClass, '|', statusText);

  // Count offer cards
  const offerCount = await page.$$eval('.offer-card', cards => cards.length);
  console.log('[offer-count]', offerCount);

  // Grab offer content
  const offers = await page.$$eval('.offer-card', cards => cards.map(c => ({
    route:  c.querySelector('.seg-route')?.textContent   || '(no route)',
    flight: c.querySelector('.seg-flight')?.textContent  || '(no flight badge)',
    times:  c.querySelector('.seg-times')?.textContent   || '(no times)',
    price:  c.querySelector('.offer-price')?.textContent || '(no price)',
  })));
  offers.forEach((o, i) => console.log(`[offer-${i+1}]`, JSON.stringify(o)));

  // Check raw JSON section
  const rawVisible = await page.$eval('#searchRaw', el => el.style.display !== 'none');
  console.log('[raw-json-visible]', rawVisible);

  // Screenshot of results
  await page.screenshot({ path: '/tmp/tp_results.png', fullPage: true });
  console.log('[screenshot] results saved to /tmp/tp_results.png');

  // ── probe 1: empty origin ──────────────────────────────────────────────────
  await page.fill('#origin', '');
  await page.click('button:has-text("Search flights")');
  await page.waitForTimeout(300);
  const emptyOriginStatus = await page.$eval('#searchStatus', el => ({
    cls: el.className, txt: el.textContent.trim()
  }));
  console.log('[probe-empty-origin]', JSON.stringify(emptyOriginStatus));

  // ── probe 2: round trip — return date shown ───────────────────────────────
  await page.fill('#origin', 'KHI');
  await page.selectOption('#tripType', 'round_trip');
  await page.waitForTimeout(200);
  const retVisible = await page.$eval('#returnFieldWrap', el => el.style.display !== 'none');
  console.log('[probe-round-trip-field]', retVisible ? 'return field visible' : 'return field HIDDEN');

  await browser.close();
})();

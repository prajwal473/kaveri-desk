import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function verifyResponsiveUI() {
  console.log('[Verify] Launching Microsoft Edge headless for responsive UI verification...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext();

  const screenshotDir = 'C:\\Users\\Prajwal\\.gemini\\antigravity\\brain\\ebc96ee6-8a78-4ad0-b518-9713bada27f8\\screenshots';
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const viewports = [
    { name: 'mobile-360px', width: 360, height: 740 },
    { name: 'tablet-768px', width: 768, height: 1024 },
    { name: 'desktop-1280px', width: 1280, height: 800 },
  ];

  const pagesToTest = [
    { path: '/', name: 'today' },
    { path: '/approvals', name: 'approvals' },
    { path: '/chat', name: 'chat' },
    { path: '/scenario-lab', name: 'scenario-lab' },
    { path: '/data-explorer', name: 'data-explorer' },
    { path: '/audit-log', name: 'audit-log' },
  ];

  const results = [];

  for (const vp of viewports) {
    const page = await context.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });

    for (const p of pagesToTest) {
      const url = `http://localhost:3000${p.path}`;
      console.log(`[Verify] Testing ${p.name} at ${vp.name} (${vp.width}x${vp.height})...`);

      await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });

      // Check horizontal overflow
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      const title = await page.title();
      results.push({
        page: p.name,
        viewport: vp.name,
        width: vp.width,
        overflow,
        title,
        status: overflow ? 'OVERFLOW_DETECTED' : 'PASS',
      });

      // Save screenshot for primary today & approvals screens
      if (p.name === 'today' || p.name === 'scenario-lab') {
        const shotPath = path.join(screenshotDir, `${p.name}-${vp.name}.png`);
        await page.screenshot({ path: shotPath, fullPage: false });
      }

      if (overflow) {
        console.error(`[ALERT] Horizontal overflow on ${p.name} at ${vp.name}!`);
      }
    }

    await page.close();
  }

  // Test Interactive Approval Flow at desktop
  console.log('[Verify] Testing interactive Approve flow...');
  const testPage = await context.newPage();
  await testPage.setViewportSize({ width: 1280, height: 800 });
  await testPage.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

  // Wait for top cards
  await testPage.waitForSelector('text=Top 3 Critical Priorities', { timeout: 10000 });
  console.log('[Verify] Top 3 Hero Cards confirmed on screen.');

  // Find and click Review Details on the first hero card
  const reviewLink = testPage.locator('text=Review Details').first();
  await reviewLink.click();
  await testPage.waitForURL(/\/issues\//, { timeout: 10000 });
  console.log('[Verify] Successfully navigated to Issue Detail screen:', testPage.url());

  // Confirm step trail and options comparison table are rendered
  await testPage.waitForSelector('text=Agent Autonomous Decision Trail', { timeout: 10000 });
  await testPage.waitForSelector('text=Operational Options Evaluated by Engine', { timeout: 10000 });
  console.log('[Verify] Step trail & Options table verified on Issue Detail screen.');

  const issueShotPath = path.join(screenshotDir, 'issue-detail-1280px.png');
  await testPage.screenshot({ path: issueShotPath, fullPage: false });

  await testPage.close();
  await browser.close();

  console.log('\n=== RESPONSIVE VERIFICATION RESULTS ===');
  console.table(results);

  const hasFailures = results.some((r) => r.status !== 'PASS');
  if (hasFailures) {
    console.error('[Verify] Verification found issues.');
    process.exit(1);
  } else {
    console.log('[Verify] All responsive checks PASSED with 0 horizontal overflows!');
  }
}

verifyResponsiveUI().catch((err) => {
  console.error('[Verify] Error:', err);
  process.exit(1);
});

// @ts-nocheck
// Playwright is NOT installed in this project yet.
// To run: pnpm add -D @playwright/test && pnpm exec playwright install chromium
// Then: pnpm exec playwright test tests/e2e/dedup-flow.spec.js
const { test, expect } = require('@playwright/test');

test.describe('dedup feature e2e', () => {
  test.skip('1. enable embedding -> backfill -> cluster appears', async ({ page }) => {
    await page.goto('/');
    // TODO: visit settings, enable embedding via PUT /api/embedding/config
    // TODO: trigger backfill via POST /api/embedding/backfill
    // TODO: wait for completion (poll Task table or UI status)
    // TODO: navigate to /duplicates
    // TODO: expect at least one cluster card visible
  });

  test.skip('2. post question -> badge appears in list', async ({ page }) => {
    // TODO: visit a project, create a question similar to an existing one
    // TODO: navigate to questions list
    // TODO: expect DuplicateBadge with count >= 2
  });

  test.skip('3. cross-project page filter works', async ({ page }) => {
    await page.goto('/duplicates');
    // TODO: toggle onlyDivergent switch
    // TODO: expect list filters correctly
  });

  test.skip('4. feedback updates trust curve', async ({ page }) => {
    // TODO: submit feedback on a cluster via API or sidebar UI
    // TODO: visit /trust
    // TODO: expect bucket counts updated
  });

  test.skip('5. embedding API down -> UI shows error state', async ({ page }) => {
    // TODO: simulate embedding endpoint down (mock fetch or stop server)
    // TODO: visit /duplicates
    // TODO: expect error banner
  });
});

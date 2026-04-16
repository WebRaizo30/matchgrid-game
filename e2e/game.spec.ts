import { expect, test } from '@playwright/test';

test.describe('MatchGrid', () => {
  test('board loads and score increases after a valid swap', async ({ page }) => {
    await page.goto('/?difficulty=normal&level=0');

    const gate = page.locator('#mg-difficulty-gate');
    if (await gate.isVisible()) {
      await page.locator('[data-difficulty="normal"]').click();
    }

    await page.waitForSelector('.mg-board .mg-cell');

    const scoreEl = page.locator('.mg-hud__score');
    const initial = await scoreEl.textContent();
    const initialScore = Number(initial?.trim().split(/\s*\/\s*/)[0] ?? '0');

    const cols = await page.locator('.mg-board .mg-cell').count();
    expect(cols).toBeGreaterThan(4);

    let best = initialScore;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const a = page.locator(`.mg-board .mg-cell[data-row="${r}"][data-col="${c}"]`);
        const b = page.locator(`.mg-board .mg-cell[data-row="${r}"][data-col="${c + 1}"]`);
        if ((await a.count()) === 0 || (await b.count()) === 0) {
          continue;
        }
        // Blocked cells are disabled — Playwright cannot click them (unlike a human using a different UX).
        if (!(await a.isEnabled()) || !(await b.isEnabled())) {
          continue;
        }
        await a.click();
        await b.click();
        await page.waitForTimeout(520);
        const t = await scoreEl.textContent();
        const n = Number(t?.trim().split(/\s*\/\s*/)[0] ?? '0');
        if (n > best) {
          best = n;
          break;
        }
      }
      if (best > initialScore) {
        break;
      }
    }

    expect(best).toBeGreaterThan(initialScore);
  });

  test('high contrast toggle changes aria state', async ({ page }) => {
    await page.goto('/?difficulty=normal');
    const gate = page.locator('#mg-difficulty-gate');
    if (await gate.isVisible()) {
      await page.locator('[data-difficulty="normal"]').click();
    }
    const btn = page.locator('#mg-btn-contrast');
    const before = await btn.getAttribute('aria-pressed');
    await btn.click();
    const after = await btn.getAttribute('aria-pressed');
    expect(before).not.toEqual(after);
  });
});

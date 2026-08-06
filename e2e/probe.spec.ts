import { test } from "@playwright/test";
test("probe icon network", async ({ page }) => {
  page.on("requestfailed", (r) => console.log("FAILED", r.url(), r.failure()?.errorText));
  page.on("response", (r) => { if (r.status() >= 400) console.log("BAD STATUS", r.status(), r.url()); });
  for (const name of ["iconGiftRegular", "iconCalendarRegular", "iconStarRegular", "iconHomeRegular"]) {
    const url = `https://static.toss.im/icons/svg/icn-${name}.svg`;
    try {
      const res = await page.request.get(url, { timeout: 5000 });
      console.log("DIRECT", name, res.status());
    } catch (e) {
      console.log("DIRECT ERR", name, String(e));
    }
  }
  await page.waitForTimeout(500);
});

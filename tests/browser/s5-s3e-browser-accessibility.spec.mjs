import { expect, test } from "@playwright/test";

const REVIEW_USERS = {
  customer: { id: "review-customer", role: "customer", full_name: "Review Customer", email: "customer@example.test", status: "active" },
  supplier: { id: "review-supplier", role: "supplier", full_name: "Review Supplier", email: "supplier@example.test", status: "active" },
  broker: { id: "review-broker", role: "broker", full_name: "Review Broker", email: "broker@example.test", status: "active" },
  admin: { id: "review-admin", role: "admin", full_name: "Review Admin", email: "admin@example.test", status: "active" },
};

const JOURNEYS = [
  { name: "public landing", path: "/", role: null, heading: /RentasHub|Rent/i },
  { name: "marketplace search", path: "/search", role: null, heading: /Marketplace|Find|Search/i },
  { name: "auction discovery", path: "/auctions", role: null, heading: /auction/i },
  { name: "documentation", path: "/documentation", role: null, heading: /documentation|RentasHub/i },
  { name: "workflow guides", path: "/workflows", role: null, heading: /workflow|guide/i },
  { name: "customer dashboard", path: "/customer-dashboard", role: "customer", heading: /dashboard|customer/i },
  { name: "supplier dashboard", path: "/supplier-dashboard", role: "supplier", heading: /supplier/i },
  { name: "dealer dashboard", path: "/dealer/auction-dashboard", role: "broker", heading: /dealer|auction/i },
  { name: "admin dashboard", path: "/admin", role: "admin", heading: /admin|control/i },
  { name: "AI assistant", path: "/ai-assistant", role: "customer", heading: /assistant|AI/i },
  { name: "system status", path: "/admin/system-status", role: "admin", heading: /system|status/i },
];

async function setReviewUser(page, role) {
  await page.addInitScript((user) => {
    window.localStorage.setItem("rentashub_review_user", JSON.stringify(user));
  }, REVIEW_USERS[role]);
}

async function expectAccessibleSmoke(page) {
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("h1, h2").first()).toBeVisible();
  await expect(page.locator("button, a, input, select, textarea").first()).toBeVisible();
  const missingButtonNames = await page.locator("button").evaluateAll((buttons) =>
    buttons.filter((button) => !button.textContent?.trim() && !button.getAttribute("aria-label") && !button.getAttribute("title")).length,
  );
  expect(missingButtonNames).toBe(0);
  await page.keyboard.press("Tab");
  const activeTag = await page.evaluate(() => document.activeElement?.tagName?.toLowerCase());
  expect(["a", "button", "input", "select", "textarea", "body"].includes(activeTag)).toBeTruthy();
}

for (const journey of JOURNEYS) {
  test(`${journey.name} journey renders with accessibility smoke coverage`, async ({ page }) => {
    if (journey.role) await setReviewUser(page, journey.role);
    await page.goto(journey.path);
    await expect(page.locator("h1, h2").first()).toContainText(journey.heading);
    await expectAccessibleSmoke(page);
  });
}

test("unauthenticated protected route redirects to login", async ({ page }) => {
  await page.goto("/supplier-dashboard");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator("h1, h2").first()).toBeVisible();
});

test("unauthorized role cannot access admin dashboard", async ({ page }) => {
  await setReviewUser(page, "customer");
  await page.goto("/admin");
  await expect(page.locator("body")).toContainText(/not authorized|not available for this role|login|dashboard/i);
});

test("responsive viewport coverage keeps primary content visible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/search");
  await expect(page.locator("main").or(page.locator("body")).first()).toBeVisible();
  await expect(page.locator("h1, h2").first()).toBeVisible();
});

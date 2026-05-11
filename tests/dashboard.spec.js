import { expect, test } from "@playwright/test";

function collectCriticalConsole(page) {
  const errors = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  page.on("pageerror", (error) => {
    errors.push(error.message);
  });

  return errors;
}

test("app and dashboard route load with saved scripts and no critical console errors", async ({ page }) => {
  const consoleErrors = collectCriticalConsole(page);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Flying Scripts" }).first()).toBeVisible();
  await expect(page.getByTestId("artifact-list")).toBeVisible();
  await expect(page.getByTestId("three-dashboard")).toBeVisible();
  await expect(page.getByTestId("selected-script-inspector")).toBeVisible();
  await expect(
    page.getByTestId("artifact-list").getByText("React query cache hook"),
  ).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Flying Scripts" }).first()).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test("user can search, select, and inspect a saved script", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("artifact-search").fill("Python");
  await expect(
    page.getByTestId("artifact-list").getByText("Python AST dependency mapper"),
  ).toBeVisible();
  await expect(
    page.getByTestId("artifact-list").getByText("React query cache hook"),
  ).not.toBeVisible();

  await page
    .getByTestId("artifact-list")
    .getByRole("button", { name: /Python AST dependency mapper/i })
    .click();
  await expect(page.getByTestId("selected-script-inspector")).toContainText(
    "Python AST dependency mapper",
  );
  await expect(page.getByTestId("selected-script-inspector")).toContainText("map_imports");
});

test("command palette opens with keyboard search and quick preview selection", async ({ page }) => {
  await page.goto("/");

  await page.keyboard.press("ControlOrMeta+K");
  await expect(page.getByTestId("command-palette")).toBeVisible();
  await page.getByTestId("command-palette-input").fill("rate-limit");
  await page
    .getByTestId("command-palette")
    .getByRole("button", { name: /Node API rate-limit middleware/i })
    .click();

  await expect(page.getByTestId("command-palette")).not.toBeVisible();
  await expect(page.getByTestId("selected-script-inspector")).toContainText(
    "Node API rate-limit middleware",
  );
});

test("main navigation and backend-like data path handle empty search state gracefully", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Script Library" }).click();
  await expect(page).toHaveURL(/#library/);

  await page.getByTestId("artifact-search").fill("zzzz-no-script");
  await expect(page.getByTestId("artifact-empty-state")).toBeVisible();
  await expect(page.getByTestId("three-dashboard")).toBeVisible();
});

test("responsive viewport renders the dashboard controls without overflow smoke failures", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Flying Scripts" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "New script" })).toBeVisible();
  await expect(page.getByTestId("three-dashboard")).toBeVisible();

  const bodyWidth = await page.locator("body").evaluate((body) => body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(410);
});

import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!window.sessionStorage.getItem("codearch.e2eStorageReset")) {
      window.localStorage.removeItem("codearch.savedCodeArtifacts.v1");
      window.localStorage.removeItem("codearch.savedCodeArtifacts.v2");
      window.sessionStorage.setItem("codearch.e2eStorageReset", "true");
    }
  });
});

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
  await expect(page.getByRole("heading", { name: "Command Center" }).first()).toBeVisible();
  await expect(page.getByTestId("artifact-list")).toBeVisible();
  await expect(page.getByTestId("three-dashboard")).toBeVisible();
  await expect(page.getByTestId("selected-script-inspector")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Deploy Readiness" })).toBeVisible();
  await expect(
    page.getByTestId("artifact-list").getByText("db.client.py"),
  ).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Command Center" }).first()).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test("user can search, select, and inspect a saved script", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("artifact-search").fill("Python");
  await expect(
    page.getByTestId("artifact-list").getByText("data.pipeline.py"),
  ).toBeVisible();
  await expect(
    page.getByTestId("artifact-list").getByText("auth.middleware.js"),
  ).not.toBeVisible();

  await page
    .getByTestId("artifact-list")
    .getByRole("button", { name: /data.pipeline.py/i })
    .click();
  await expect(page.getByTestId("selected-script-inspector")).toContainText(
    "data.pipeline.py",
  );
  await expect(page.getByTestId("selected-script-inspector")).toContainText("run_pipeline");
});

test("command palette opens with keyboard search and quick preview selection", async ({ page }) => {
  await page.goto("/");

  await page.keyboard.press("ControlOrMeta+K");
  await expect(page.getByTestId("command-palette")).toBeVisible();
  await page.getByTestId("command-palette-input").fill("auth");
  await page
    .getByTestId("command-palette")
    .getByRole("button", { name: /auth.middleware.js/i })
    .click();

  await expect(page.getByTestId("command-palette")).not.toBeVisible();
  await expect(page.getByTestId("selected-script-inspector")).toContainText(
    "auth.middleware.js",
  );
});

test("main navigation and backend-like data path handle empty search state gracefully", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Artifacts" }).click();
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

  await expect(page.getByRole("heading", { name: "Command Center" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "New Script" })).toBeVisible();
  await expect(page.getByTestId("three-dashboard")).toBeVisible();

  const bodyWidth = await page.locator("body").evaluate((body) => body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(410);
});

test("user can create and edit a saved script", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "New Script" }).click();
  const editor = page.getByRole("dialog");
  await editor.getByLabel("Title").fill("cache.guard.ts");
  await editor.getByRole("textbox", { name: "Language" }).fill("TypeScript");
  await editor.getByRole("textbox", { name: "Collection" }).fill("Frontend");
  await editor.getByLabel("Tags").fill("cache, guard");
  await editor.getByLabel("Description").fill("Protects cache reads with an explicit fallback.");
  await editor.getByLabel("Code").fill("export const guard = (value) => value ?? null;");
  await editor.getByRole("button", { name: "Save script" }).click();

  await expect(page.getByTestId("artifact-list")).toContainText("cache.guard.ts");
  await expect(page.getByTestId("selected-script-inspector")).toContainText("cache.guard.ts");

  await page.getByRole("button", { name: "Edit selected script" }).click();
  const editEditor = page.getByRole("dialog");
  await editEditor.getByLabel("Description").fill("Updated cache guard description.");
  await editEditor.getByRole("button", { name: "Save changes" }).click();

  await expect(page.getByTestId("selected-script-inspector")).toContainText(
    "Updated cache guard description.",
  );
});

test("deploy readiness panel exposes Vercel commands and verification status", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Deploy Readiness" })).toBeVisible();
  await expect(page.getByText("3/4 checks passed")).toBeVisible();
  await expect(page.getByText("npx vercel --prod --yes")).toBeVisible();
});

test("user can favorite and pin a script with persistent quick views", async ({ page }) => {
  await page.goto("/");

  const artifactList = page.getByTestId("artifact-list");
  await artifactList.getByRole("button", { name: /data.pipeline.py/i }).click();

  const inspector = page.getByTestId("selected-script-inspector");
  await inspector.getByRole("button", { name: "Add to favorites" }).click();
  await inspector.getByRole("button", { name: "Pin script" }).click();

  await expect(
    inspector.getByRole("button", { name: "Remove from favorites" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(inspector.getByRole("button", { name: "Unpin script" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByLabel("Sort scripts").selectOption("favorites");
  const favoriteRow = artifactList.getByRole("button", { name: /data.pipeline.py/i });
  await expect(favoriteRow).toContainText("Favorite");

  await page.getByLabel("Sort scripts").selectOption("pinned");
  const pinnedRow = artifactList.getByRole("button", { name: /data.pipeline.py/i });
  await expect(pinnedRow).toContainText("Pinned");

  await page.reload();
  await page.getByLabel("Sort scripts").selectOption("pinned");

  const persistedPinnedRow = page
    .getByTestId("artifact-list")
    .getByRole("button", { name: /data.pipeline.py/i });
  await expect(persistedPinnedRow).toContainText("Pinned");
  await persistedPinnedRow.click();

  const reloadedInspector = page.getByTestId("selected-script-inspector");
  await expect(
    reloadedInspector.getByRole("button", { name: "Remove from favorites" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    reloadedInspector.getByRole("button", { name: "Unpin script" }),
  ).toHaveAttribute("aria-pressed", "true");
});

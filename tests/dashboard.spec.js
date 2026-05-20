import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!window.sessionStorage.getItem("codearch.e2eStorageReset")) {
      window.localStorage.removeItem("codearch.savedCodeArtifacts.v1");
      window.localStorage.removeItem("codearch.savedCodeArtifacts.v2");
      window.localStorage.removeItem("codearch.savedCodeArtifacts.v3");
      window.localStorage.removeItem("codearch.theme");
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
  await expect(page.getByRole("heading", { name: "CodeArch Workbench" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Write, run, and save code" })).toBeVisible();
  await expect(page.getByTestId("selected-script-inspector")).toBeVisible();

  await page.goto("/library");
  await expect(page.getByRole("heading", { name: "Search, organize, and reuse saved code" })).toBeVisible();
  await expect(page.getByTestId("artifact-list")).toBeVisible();
  await expect(
    page.getByTestId("artifact-list").getByText("db.client.py"),
  ).toBeVisible();
  await expect(page.getByTestId("artifact-list").getByText("react.auth.context.jsx")).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "CodeArch Workbench" }).first()).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test("Figma command-center tokens and desktop layout proportions are applied", async ({ page }) => {
  await page.setViewportSize({ width: 1728, height: 1050 });
  await page.goto("/");
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");

  const tokens = await page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    return {
      bg: styles.getPropertyValue("--bg").trim(),
      surface: styles.getPropertyValue("--surface").trim(),
      surfaceSoft: styles.getPropertyValue("--surface-soft").trim(),
      ink: styles.getPropertyValue("--ink").trim(),
      muted: styles.getPropertyValue("--muted").trim(),
      border: styles.getPropertyValue("--border").trim(),
      gold: styles.getPropertyValue("--gold").trim(),
      codeSurface: styles.getPropertyValue("--code-surface").trim(),
      codeString: styles.getPropertyValue("--code-string").trim(),
      codeNumber: styles.getPropertyValue("--code-number").trim(),
      codeFunction: styles.getPropertyValue("--code-function").trim(),
      codeMethod: styles.getPropertyValue("--code-method").trim(),
    };
  });

  expect(tokens).toEqual({
    bg: "#08090D",
    surface: "#101218",
    surfaceSoft: "#171A22",
    ink: "#F8F3EA",
    muted: "#B7A895",
    border: "#2B303A",
    gold: "#E6B64F",
    codeSurface: "#0B1020",
    codeString: "#8EE8A8",
    codeNumber: "#C9A7FF",
    codeFunction: "#8FD3FF",
    codeMethod: "#F6C177",
  });

  const sidebarBox = await page.getByTestId("app-sidebar").boundingBox();
  const topbarBox = await page.getByTestId("top-command-bar").boundingBox();
  const canvasBox = await page.getByTestId("workbench-canvas").boundingBox();
  const railBox = await page.getByTestId("right-intelligence-rail").boundingBox();
  const editorBox = await page.locator(".workbench-editor").boundingBox();
  const bodyWidth = await page.locator("body").evaluate((body) => body.scrollWidth);
  const topbarPosition = await page
    .getByTestId("top-command-bar")
    .evaluate((node) => getComputedStyle(node).position);

  expect(sidebarBox?.width).toBeGreaterThanOrEqual(240);
  expect(sidebarBox?.width).toBeLessThanOrEqual(252);
  expect(topbarBox?.height).toBeGreaterThanOrEqual(70);
  expect(topbarBox?.height).toBeLessThanOrEqual(84);
  expect(canvasBox?.width).toBeGreaterThanOrEqual(900);
  expect(canvasBox?.width).toBeLessThanOrEqual(960);
  expect(railBox?.width).toBeGreaterThanOrEqual(420);
  expect(railBox?.width).toBeLessThanOrEqual(452);
  expect(editorBox?.width).toBeGreaterThan(860);
  await expect(page.getByTestId("smart-save-autopilot")).toBeHidden();
  expect(railBox?.x).toBeGreaterThan((canvasBox?.x ?? 0) + (canvasBox?.width ?? 0) - 1);
  expect(bodyWidth).toBeLessThanOrEqual(1728);
  expect(topbarPosition).toBe("sticky");

  await page.getByRole("button", { name: "Smart Save tools" }).click();
  await expect(page.getByTestId("smart-save-autopilot")).toBeVisible();
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe("light");
});

test("user can search, select, and inspect a saved script", async ({ page }) => {
  await page.goto("/library");

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
  await page.getByRole("button", { name: "Show more details" }).click();
  await expect(page.getByTestId("selected-script-inspector")).toContainText("run_pipeline");
});

test("snippet rows hide metadata until Show more is opened", async ({ page }) => {
  await page.goto("/library");

  const dataRow = page.getByTestId("artifact-row").filter({ hasText: "data.pipeline.py" }).first();
  await expect(dataRow).toContainText("Python");
  await expect(dataRow).not.toContainText("pandas");
  await expect(dataRow).not.toContainText("Data");

  await dataRow.getByRole("button", { name: "Show more" }).click();
  await expect(dataRow).toContainText("pandas");
  await expect(dataRow).toContainText("Data");
  await expect(dataRow.getByRole("button", { name: "Show less" })).toHaveAttribute("aria-expanded", "true");
});

test("workbench editor renders pastel syntax tokens while typing", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("textbox", { name: "Workbench code" }).fill(`function paint(value = 7) {
  return console.log("mint", value.toFixed(2));
}`);

  const editor = page.getByTestId("code-editor-shell");
  await expect(editor.locator(".syntax-token--string")).toContainText('"mint"');
  await expect(editor.locator(".syntax-token--number").first()).toContainText("7");
  await expect(editor.locator(".syntax-token--function")).toContainText("paint");
  await expect(editor.locator(".syntax-token--method").first()).toContainText("log");
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

test("command palette can pin and filter from artifact actions", async ({ page }) => {
  await page.goto("/");

  await page.keyboard.press("ControlOrMeta+K");
  await page.getByTestId("command-palette-input").fill("auth.middleware.js");

  const palette = page.getByTestId("command-palette");
  await palette.getByRole("button", { name: "Pin" }).first().click();
  await expect(palette).not.toBeVisible();

  await page.getByRole("link", { name: "Library" }).click();
  await page.getByLabel("Sort scripts").selectOption("pinned");
  await expect(
    page.getByTestId("artifact-row").filter({ hasText: "auth.middleware.js" }).first(),
  ).toContainText("Pinned");

  await page.keyboard.press("ControlOrMeta+K");
  await page.getByTestId("command-palette-input").fill("auth.middleware.js");
  await page
    .getByTestId("command-palette")
    .getByRole("button", { name: "Collection" })
    .first()
    .click();

  await expect(page).toHaveURL(/\/library$/);
  await expect(page.getByLabel("Filter scripts by collection")).not.toHaveValue("all");
});

test("main navigation and backend-like data path handle empty search state gracefully", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Library" }).click();
  await expect(page).toHaveURL(/\/library$/);

  await page.getByTestId("artifact-search").fill("zzzz-no-script");
  await expect(page.getByTestId("artifact-empty-state")).toBeVisible();
  await page.getByRole("link", { name: "Workbench" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Write, run, and save code" })).toBeVisible();
});

test("responsive viewport renders the dashboard controls without overflow smoke failures", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "CodeArch Workbench" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "New Draft" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Write, run, and save code" })).toBeVisible();

  const bodyWidth = await page.locator("body").evaluate((body) => body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(410);
});

test("user can run code in the workbench, then save and edit a script", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("textbox", { name: "Workbench code" }).fill("console.log('premium run');\nreturn 7 * 6;");
  await page.getByRole("button", { name: "Run code" }).click();
  await expect(page.getByTestId("workbench-console")).toContainText("premium run");
  await expect(page.getByTestId("workbench-console")).toContainText("Return value: 42");

  await page.getByLabel("Workbench title").fill("cache.guard.ts");
  await page.getByLabel("Workbench language").fill("JavaScript");
  await page.getByRole("button", { name: "Save snippet" }).click();

  await page.getByRole("link", { name: "Library" }).click();
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

test("Smart Save Autopilot analyzes pasted code, warns on duplicates, and saves edited metadata", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("textbox", { name: "Workbench code" }).fill(`export function authMiddleware(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).end();
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(403).end();
  }
}`);

  await page.getByRole("button", { name: "Smart Save tools" }).click();
  await page.getByRole("button", { name: "Analyze with Smart Save" }).click();
  await expect(page.getByTestId("smart-save-review")).toBeVisible();
  await expect(page.getByTestId("smart-save-duplicate-warning")).toContainText("auth.middleware.js");

  await page.getByLabel("Smart Save title").fill("auth.middleware.reviewed.js");
  await page.getByLabel("Smart Save collection").fill("Security");
  await page.getByLabel("Smart Save tags").fill("javascript, auth, security, middleware");
  await page.getByRole("button", { name: "Confirm Smart Save" }).click();

  await expect(page.getByTestId("smart-save-success")).toContainText("auth.middleware.reviewed.js saved.");
  await page.getByRole("button", { name: "View snippet" }).click();
  await expect(page).toHaveURL(/\/library$/);
  await expect(page.getByTestId("selected-script-inspector")).toContainText("auth.middleware.reviewed.js");
  await page.getByRole("button", { name: "Show more details" }).click();
  await expect(page.getByTestId("selected-script-inspector")).toContainText("Security");
});

test("Smart Save Autopilot can save instantly with local fallback metadata", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("textbox", { name: "Workbench code" }).fill(`from fastapi import APIRouter

router = APIRouter(prefix="/tasks", tags=["tasks"])

@router.get("/")
async def list_tasks():
    return await repository.list()`);

  await page.getByRole("button", { name: "Smart Save tools" }).click();
  await page.getByRole("button", { name: "Save instantly" }).click();
  await expect(page.getByTestId("smart-save-success")).toBeVisible();
  await page.getByRole("button", { name: "View snippet" }).click();
  await expect(page.getByTestId("selected-script-inspector")).toContainText("FastAPI");
  await page.getByRole("button", { name: "Show more details" }).click();
  await expect(page.getByTestId("selected-script-inspector")).toContainText("Backend");
});

test("user can load a boilerplate template and save it without manual metadata", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Choose boilerplate snippet").selectOption("artifact-boilerplate-array-loops");
  await expect(page.getByLabel("Workbench title")).toHaveValue("array.loops.js");
  await page.getByRole("button", { name: "Run code" }).click();
  await expect(page.getByTestId("workbench-console")).toContainText("developer", { timeout: 10000 });
  await page.getByRole("button", { name: "Save snippet" }).click();

  await page.getByRole("button", { name: "Show more details" }).click();
  await expect(page.getByTestId("selected-script-inspector")).toContainText("Archive health");
  await page.getByRole("link", { name: "Library" }).click();
  await expect(page.getByTestId("artifact-list")).toContainText("array.loops.js");
});

test("selected snippets can be opened in the workbench for quick reuse", async ({ page }) => {
  await page.goto("/library");

  await page
    .getByTestId("artifact-list")
    .getByRole("button", { name: /data.pipeline.py/i })
    .click();
  await page.getByRole("button", { name: "Use in workbench" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByLabel("Workbench title")).toHaveValue("data.pipeline.py");
  await expect(page.getByRole("textbox", { name: "Workbench code" })).toHaveValue(/run_pipeline/);
});

test("user can favorite and pin a script with persistent quick views", async ({ page }) => {
  await page.goto("/library");

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
  const favoriteRow = artifactList.getByTestId("artifact-row").filter({ hasText: "data.pipeline.py" }).first();
  await expect(favoriteRow).toContainText("Favorite");

  await page.getByLabel("Sort scripts").selectOption("pinned");
  const pinnedRow = artifactList.getByTestId("artifact-row").filter({ hasText: "data.pipeline.py" }).first();
  await expect(pinnedRow).toContainText("Pinned");

  await page.reload();
  await page.getByLabel("Sort scripts").selectOption("pinned");

  const persistedPinnedRow = page
    .getByTestId("artifact-list")
    .getByTestId("artifact-row")
    .filter({ hasText: "data.pipeline.py" })
    .first();
  await expect(persistedPinnedRow).toContainText("Pinned");
  await persistedPinnedRow.getByRole("button", { name: /data.pipeline.py/i }).click();

  const reloadedInspector = page.getByTestId("selected-script-inspector");
  await expect(
    reloadedInspector.getByRole("button", { name: "Remove from favorites" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    reloadedInspector.getByRole("button", { name: "Unpin script" }),
  ).toHaveAttribute("aria-pressed", "true");
});

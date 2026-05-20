export const boilerplateCodeSnippets = [
  {
    id: "artifact-boilerplate-react-auth-context",
    title: "react.auth.context.jsx",
    language: "JSX",
    tags: ["boilerplate", "react", "auth", "context"],
    collection: "Boilerplates",
    summary: "React auth provider with login, logout, user state, and a small useAuth hook.",
    source: "CodeArch boilerplate library",
    code: `import { createContext, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  async function login(credentials) {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) throw new Error("Login failed");
    const nextUser = await response.json();
    setUser(nextUser);
    return nextUser;
  }

  function logout() {
    setUser(null);
  }

  const value = useMemo(() => ({ user, login, logout }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}`,
    usageCount: 0,
    favorite: true,
    createdAt: "2026-05-19T09:00:00.000Z",
    updatedAt: "2026-05-19T09:00:00.000Z",
  },
  {
    id: "artifact-boilerplate-express-jwt-auth",
    title: "express.jwt.auth.js",
    language: "JavaScript",
    tags: ["boilerplate", "auth", "express", "jwt"],
    collection: "Boilerplates",
    summary: "Express bearer-token middleware with explicit 401 and 403 JSON responses.",
    source: "CodeArch boilerplate library",
    code: `import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}`,
    usageCount: 0,
    createdAt: "2026-05-19T09:01:00.000Z",
    updatedAt: "2026-05-19T09:01:00.000Z",
  },
  {
    id: "artifact-boilerplate-fastapi-auth",
    title: "fastapi.auth.dependency.py",
    language: "Python",
    tags: ["boilerplate", "auth", "fastapi", "jwt"],
    collection: "Boilerplates",
    summary: "FastAPI dependency that extracts and validates an authorization token.",
    source: "CodeArch boilerplate library",
    code: `from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

security = HTTPBearer(auto_error=False)

async def require_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
):
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )

    user = verify_access_token(credentials.credentials)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid token",
        )

    return user`,
    usageCount: 0,
    createdAt: "2026-05-19T09:02:00.000Z",
    updatedAt: "2026-05-19T09:02:00.000Z",
  },
  {
    id: "artifact-boilerplate-use-local-storage",
    title: "useLocalStorage.js",
    language: "JavaScript",
    tags: ["boilerplate", "react", "hook", "storage"],
    collection: "Boilerplates",
    summary: "React hook for localStorage state with JSON parsing and write failure guards.",
    source: "CodeArch boilerplate library",
    code: `import { useEffect, useState } from "react";

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage can fail in private browsing or quota-limited environments.
    }
  }, [key, value]);

  return [value, setValue];
}`,
    usageCount: 0,
    favorite: true,
    createdAt: "2026-05-19T09:03:00.000Z",
    updatedAt: "2026-05-19T09:03:00.000Z",
  },
  {
    id: "artifact-boilerplate-use-fetch-state",
    title: "useFetchState.js",
    language: "JavaScript",
    tags: ["boilerplate", "react", "hook", "api"],
    collection: "Boilerplates",
    summary: "React fetch hook with loading, error, cancellation, and refetch support.",
    source: "CodeArch boilerplate library",
    code: `import { useCallback, useEffect, useState } from "react";

export function useFetchState(url, options = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: true });

  const load = useCallback(async (signal) => {
    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const response = await fetch(url, { ...options, signal });
      if (!response.ok) throw new Error(\`Request failed: \${response.status}\`);
      const data = await response.json();
      setState({ data, error: null, loading: false });
    } catch (error) {
      if (error.name !== "AbortError") {
        setState({ data: null, error: error.message, loading: false });
      }
    }
  }, [url, options]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return { ...state, refetch: () => load() };
}`,
    usageCount: 0,
    createdAt: "2026-05-19T09:04:00.000Z",
    updatedAt: "2026-05-19T09:04:00.000Z",
  },
  {
    id: "artifact-boilerplate-use-debounce",
    title: "useDebounce.js",
    language: "JavaScript",
    tags: ["boilerplate", "react", "hook", "input"],
    collection: "Boilerplates",
    summary: "Small debounce hook for search inputs and fast-changing form state.",
    source: "CodeArch boilerplate library",
    code: `import { useEffect, useState } from "react";

export function useDebounce(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeoutId);
  }, [delay, value]);

  return debounced;
}`,
    usageCount: 0,
    createdAt: "2026-05-19T09:05:00.000Z",
    updatedAt: "2026-05-19T09:05:00.000Z",
  },
  {
    id: "artifact-boilerplate-react-card-component",
    title: "PremiumCard.jsx",
    language: "JSX",
    tags: ["boilerplate", "react", "component", "card"],
    collection: "Boilerplates",
    summary: "Reusable React card component with header, actions, and content slot.",
    source: "CodeArch boilerplate library",
    code: `export function PremiumCard({ eyebrow, title, actions, children }) {
  return (
    <article className="premium-card">
      <header className="premium-card__header">
        <div>
          {eyebrow ? <p className="premium-card__eyebrow">{eyebrow}</p> : null}
          <h2>{title}</h2>
        </div>
        {actions ? <div className="premium-card__actions">{actions}</div> : null}
      </header>
      <div className="premium-card__content">{children}</div>
    </article>
  );
}`,
    usageCount: 0,
    favorite: true,
    createdAt: "2026-05-19T09:06:00.000Z",
    updatedAt: "2026-05-19T09:06:00.000Z",
  },
  {
    id: "artifact-boilerplate-react-form-card",
    title: "FormCard.jsx",
    language: "JSX",
    tags: ["boilerplate", "react", "form", "component"],
    collection: "Boilerplates",
    summary: "Accessible form card with submit state, error message, and action buttons.",
    source: "CodeArch boilerplate library",
    code: `export function FormCard({ title, error, isSaving, onSubmit, children }) {
  return (
    <form className="form-card" onSubmit={onSubmit}>
      <header>
        <h2>{title}</h2>
        {error ? <p role="alert">{error}</p> : null}
      </header>
      <div className="form-card__fields">{children}</div>
      <footer>
        <button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </button>
      </footer>
    </form>
  );
}`,
    usageCount: 0,
    createdAt: "2026-05-19T09:07:00.000Z",
    updatedAt: "2026-05-19T09:07:00.000Z",
  },
  {
    id: "artifact-boilerplate-array-loops",
    title: "array.loops.js",
    language: "JavaScript",
    tags: ["boilerplate", "loops", "arrays", "utilities"],
    collection: "Boilerplates",
    summary: "Common JavaScript array loops for map, filter, reduce, grouping, and lookup maps.",
    source: "CodeArch boilerplate library",
    code: `const users = [
  { id: 1, name: "Ada", role: "admin" },
  { id: 2, name: "Grace", role: "developer" },
  { id: 3, name: "Linus", role: "developer" },
];

const names = users.map((user) => user.name);
const developers = users.filter((user) => user.role === "developer");
const countByRole = users.reduce((acc, user) => {
  acc[user.role] = (acc[user.role] ?? 0) + 1;
  return acc;
}, {});
const userById = new Map(users.map((user) => [user.id, user]));

console.log({ names, developers, countByRole, firstUser: userById.get(1) });
return countByRole;`,
    usageCount: 0,
    favorite: true,
    createdAt: "2026-05-19T09:08:00.000Z",
    updatedAt: "2026-05-19T09:08:00.000Z",
  },
  {
    id: "artifact-boilerplate-async-retry",
    title: "async.retry.js",
    language: "JavaScript",
    tags: ["boilerplate", "async", "retry", "safety"],
    collection: "Boilerplates",
    summary: "Retry helper with backoff delay for unstable network or API operations.",
    source: "CodeArch boilerplate library",
    code: `export async function retry(operation, retries = 3, delayMs = 300) {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  throw lastError;
}`,
    usageCount: 0,
    createdAt: "2026-05-19T09:09:00.000Z",
    updatedAt: "2026-05-19T09:09:00.000Z",
  },
  {
    id: "artifact-boilerplate-fetch-helper",
    title: "api.client.js",
    language: "JavaScript",
    tags: ["boilerplate", "api", "fetch", "errors"],
    collection: "Boilerplates",
    summary: "Fetch helper that centralizes JSON headers and consistent error messages.",
    source: "CodeArch boilerplate library",
    code: `const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export async function apiClient(path, options = {}) {
  const response = await fetch(\`\${API_BASE_URL}\${path}\`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error ?? \`Request failed: \${response.status}\`);
  }

  return payload;
}`,
    usageCount: 0,
    favorite: true,
    createdAt: "2026-05-19T09:10:00.000Z",
    updatedAt: "2026-05-19T09:10:00.000Z",
  },
  {
    id: "artifact-boilerplate-express-crud-router",
    title: "express.crud.router.js",
    language: "JavaScript",
    tags: ["boilerplate", "express", "crud", "api"],
    collection: "Boilerplates",
    summary: "Express CRUD router skeleton with consistent status codes and JSON responses.",
    source: "CodeArch boilerplate library",
    code: `import { Router } from "express";

export function createCrudRouter(repository) {
  const router = Router();

  router.get("/", async (_, res) => {
    res.json(await repository.list());
  });

  router.post("/", async (req, res) => {
    const created = await repository.create(req.body);
    res.status(201).json(created);
  });

  router.patch("/:id", async (req, res) => {
    const updated = await repository.update(req.params.id, req.body);
    res.json(updated);
  });

  router.delete("/:id", async (req, res) => {
    await repository.remove(req.params.id);
    res.status(204).end();
  });

  return router;
}`,
    usageCount: 0,
    createdAt: "2026-05-19T09:11:00.000Z",
    updatedAt: "2026-05-19T09:11:00.000Z",
  },
  {
    id: "artifact-boilerplate-fastapi-crud",
    title: "fastapi.crud.router.py",
    language: "Python",
    tags: ["boilerplate", "fastapi", "crud", "api"],
    collection: "Boilerplates",
    summary: "FastAPI router skeleton with create, list, update, and delete endpoints.",
    source: "CodeArch boilerplate library",
    code: `from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/items", tags=["items"])

@router.get("/")
async def list_items():
    return await repository.list()

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_item(payload: ItemCreate):
    return await repository.create(payload)

@router.patch("/{item_id}")
async def update_item(item_id: str, payload: ItemUpdate):
    item = await repository.update(item_id, payload)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(item_id: str):
    await repository.remove(item_id)`,
    usageCount: 0,
    createdAt: "2026-05-19T09:12:00.000Z",
    updatedAt: "2026-05-19T09:12:00.000Z",
  },
  {
    id: "artifact-boilerplate-playwright-smoke",
    title: "playwright.smoke.spec.js",
    language: "JavaScript",
    tags: ["boilerplate", "playwright", "testing", "smoke"],
    collection: "Boilerplates",
    summary: "Playwright smoke test that checks the main route, console errors, and a critical CTA.",
    source: "CodeArch boilerplate library",
    code: `import { expect, test } from "@playwright/test";

test("home route is healthy", async ({ page }) => {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("/");
  await expect(page.getByRole("heading").first()).toBeVisible();
  await expect(page.getByRole("button").first()).toBeVisible();
  expect(errors).toEqual([]);
});`,
    usageCount: 0,
    createdAt: "2026-05-19T09:13:00.000Z",
    updatedAt: "2026-05-19T09:13:00.000Z",
  },
  {
    id: "artifact-boilerplate-error-boundary",
    title: "ErrorBoundary.jsx",
    language: "JSX",
    tags: ["boilerplate", "react", "error", "safety"],
    collection: "Boilerplates",
    summary: "Class-based React error boundary with a compact fallback UI.",
    source: "CodeArch boilerplate library",
    code: `import { Component } from "react";

export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("UI crashed", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <section role="alert">
          <h2>Something went wrong.</h2>
          <p>{this.state.error.message}</p>
        </section>
      );
    }

    return this.props.children;
  }
}`,
    usageCount: 0,
    createdAt: "2026-05-19T09:14:00.000Z",
    updatedAt: "2026-05-19T09:14:00.000Z",
  },
  {
    id: "artifact-boilerplate-zod-env",
    title: "env.validation.ts",
    language: "TypeScript",
    tags: ["boilerplate", "env", "validation", "config"],
    collection: "Boilerplates",
    summary: "Environment validation pattern that fails fast when required settings are missing.",
    source: "CodeArch boilerplate library",
    code: `const requiredEnv = ["DATABASE_URL", "JWT_SECRET"] as const;

export function readEnv() {
  const missing = requiredEnv.filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error(\`Missing environment variables: \${missing.join(", ")}\`);
  }

  return {
    databaseUrl: process.env.DATABASE_URL!,
    jwtSecret: process.env.JWT_SECRET!,
    nodeEnv: process.env.NODE_ENV ?? "development",
  };
}`,
    usageCount: 0,
    createdAt: "2026-05-19T09:15:00.000Z",
    updatedAt: "2026-05-19T09:15:00.000Z",
  },
  {
    id: "artifact-boilerplate-sql-user-table",
    title: "users.table.sql",
    language: "SQL",
    tags: ["boilerplate", "sql", "auth", "database"],
    collection: "Boilerplates",
    summary: "User table schema with unique email, role, password hash, and timestamps.",
    source: "CodeArch boilerplate library",
    code: `create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index users_email_idx on users (lower(email));`,
    usageCount: 0,
    createdAt: "2026-05-19T09:16:00.000Z",
    updatedAt: "2026-05-19T09:16:00.000Z",
  },
  {
    id: "artifact-boilerplate-python-cli",
    title: "python.cli.py",
    language: "Python",
    tags: ["boilerplate", "python", "cli", "argparse"],
    collection: "Boilerplates",
    summary: "Python CLI entry point using argparse and a clean main function.",
    source: "CodeArch boilerplate library",
    code: `import argparse

def main():
    parser = argparse.ArgumentParser(description="Run the project task.")
    parser.add_argument("--name", default="CodeArch")
    args = parser.parse_args()

    print(f"Hello, {args.name}!")

if __name__ == "__main__":
    main()`,
    usageCount: 0,
    createdAt: "2026-05-19T09:17:00.000Z",
    updatedAt: "2026-05-19T09:17:00.000Z",
  },
  {
    id: "artifact-boilerplate-node-cli",
    title: "node.cli.js",
    language: "JavaScript",
    tags: ["boilerplate", "node", "cli", "script"],
    collection: "Boilerplates",
    summary: "Node CLI starter that parses simple flags and exits with useful status codes.",
    source: "CodeArch boilerplate library",
    code: `#!/usr/bin/env node

const args = new Map(
  process.argv.slice(2).map((item) => {
    const [key, value = "true"] = item.replace(/^--/, "").split("=");
    return [key, value];
  }),
);

const name = args.get("name") ?? "CodeArch";
console.log(\`Hello, \${name}!\`);`,
    usageCount: 0,
    createdAt: "2026-05-19T09:18:00.000Z",
    updatedAt: "2026-05-19T09:18:00.000Z",
  },
  {
    id: "artifact-boilerplate-react-table",
    title: "DataTable.jsx",
    language: "JSX",
    tags: ["boilerplate", "react", "table", "component"],
    collection: "Boilerplates",
    summary: "Responsive React table component with empty state and row click support.",
    source: "CodeArch boilerplate library",
    code: `export function DataTable({ rows, columns, onSelect }) {
  if (!rows.length) {
    return <p role="status">No records found.</p>;
  }

  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} onClick={() => onSelect?.(row)}>
              {columns.map((column) => (
                <td key={column.key}>{row[column.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}`,
    usageCount: 0,
    createdAt: "2026-05-19T09:19:00.000Z",
    updatedAt: "2026-05-19T09:19:00.000Z",
  },
  {
    id: "artifact-boilerplate-date-format",
    title: "date.formatter.js",
    language: "JavaScript",
    tags: ["boilerplate", "date", "utility", "format"],
    collection: "Boilerplates",
    summary: "Safe date formatting helper with invalid-date fallback.",
    source: "CodeArch boilerplate library",
    code: `export function formatDate(value, options = {}) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    ...options,
  }).format(date);
}

console.log(formatDate(new Date()));
return formatDate("2026-05-19T09:20:00.000Z");`,
    usageCount: 0,
    createdAt: "2026-05-19T09:20:00.000Z",
    updatedAt: "2026-05-19T09:20:00.000Z",
  },
];

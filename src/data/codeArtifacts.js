export const seedCodeArtifacts = [
  {
    id: "artifact-react-cache-hook",
    title: "React query cache hook",
    language: "JavaScript",
    tags: ["react", "hooks", "cache"],
    collection: "Frontend Systems",
    summary: "A compact hook for cached async lookups with stale-state protection.",
    code: `export function useCachedQuery(key, loader) {
  const [state, setState] = useState({ status: "idle", data: null });

  useEffect(() => {
    let active = true;
    setState({ status: "loading", data: null });

    loader(key).then((data) => {
      if (active) setState({ status: "ready", data });
    });

    return () => {
      active = false;
    };
  }, [key, loader]);

  return state;
}`,
    usageCount: 42,
    createdAt: "2026-04-09T16:20:00.000Z",
    updatedAt: "2026-05-11T17:45:00.000Z",
  },
  {
    id: "artifact-python-ast-map",
    title: "Python AST dependency mapper",
    language: "Python",
    tags: ["python", "ast", "analysis"],
    collection: "Architecture Intelligence",
    summary: "Extracts import relationships from a Python file for architecture graphs.",
    code: `import ast
from pathlib import Path

def map_imports(file_path: str) -> list[str]:
    tree = ast.parse(Path(file_path).read_text())
    imports = []

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imports.extend(alias.name for alias in node.names)
        if isinstance(node, ast.ImportFrom) and node.module:
            imports.append(node.module)

    return sorted(set(imports))`,
    usageCount: 31,
    createdAt: "2026-03-28T11:05:00.000Z",
    updatedAt: "2026-05-10T21:18:00.000Z",
  },
  {
    id: "artifact-sql-migration-guard",
    title: "Postgres migration guard",
    language: "SQL",
    tags: ["postgres", "migration", "safety"],
    collection: "Database Reliability",
    summary: "Wraps risky DDL changes in an advisory-lock protected migration block.",
    code: `BEGIN;

SELECT pg_advisory_xact_lock(918273645);

ALTER TABLE code_artifacts
  ADD COLUMN IF NOT EXISTS last_indexed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_code_artifacts_language
  ON code_artifacts(language);

COMMIT;`,
    usageCount: 18,
    createdAt: "2026-02-20T08:30:00.000Z",
    updatedAt: "2026-05-08T14:52:00.000Z",
  },
  {
    id: "artifact-node-rate-limit",
    title: "Node API rate-limit middleware",
    language: "JavaScript",
    tags: ["node", "api", "security"],
    collection: "Backend Controls",
    summary: "A dependency-free token bucket middleware for small internal APIs.",
    code: `const buckets = new Map();

export function rateLimit({ limit = 60, windowMs = 60000 } = {}) {
  return function middleware(req, res, next) {
    const key = req.ip ?? "anonymous";
    const now = Date.now();
    const bucket = buckets.get(key) ?? { count: 0, resetAt: now + windowMs };

    if (now > bucket.resetAt) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }

    bucket.count += 1;
    buckets.set(key, bucket);

    if (bucket.count > limit) {
      return res.status(429).json({ error: "Rate limit exceeded" });
    }

    return next();
  };
}`,
    usageCount: 27,
    createdAt: "2026-01-19T19:05:00.000Z",
    updatedAt: "2026-05-06T10:11:00.000Z",
  },
  {
    id: "artifact-css-fluid-panel",
    title: "Fluid glass panel system",
    language: "CSS",
    tags: ["css", "dashboard", "design-system"],
    collection: "Interface Polish",
    summary: "Reusable glass panel treatment with accessible contrast and restrained depth.",
    code: `.panel {
  background:
    linear-gradient(145deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04)),
    rgba(8, 13, 22, 0.82);
  border: 1px solid rgba(174, 214, 255, 0.16);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.36);
  backdrop-filter: blur(20px);
}`,
    usageCount: 36,
    createdAt: "2026-04-15T13:12:00.000Z",
    updatedAt: "2026-05-09T09:24:00.000Z",
  },
  {
    id: "artifact-bash-release-check",
    title: "Release readiness check",
    language: "Shell",
    tags: ["release", "qa", "automation"],
    collection: "Delivery Automation",
    summary: "Small release gate for lint, tests, build, and artifact sanity checks.",
    code: `#!/usr/bin/env bash
set -euo pipefail

npm run lint
npm run build
npm run test:e2e

test -d dist
test -f dist/index.html
echo "release candidate is ready"`,
    usageCount: 14,
    createdAt: "2026-02-06T18:42:00.000Z",
    updatedAt: "2026-05-03T22:07:00.000Z",
  },
];

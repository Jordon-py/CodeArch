export const seedCodeArtifacts = [
  {
    id: "artifact-db-client",
    title: "db.client.py",
    language: "Python",
    tags: ["database", "sqlalchemy", "connection"],
    collection: "Backend",
    summary: "Database engine client using SQLAlchemy with connection pooling and health checks.",
    source: "Code_Arch API",
    code: `import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

def get_engine():
    url = os.getenv("DATABASE_URL")
    return create_engine(url, pool_pre_ping=True)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=get_engine(),
)`,
    usageCount: 64,
    favorite: true,
    createdAt: "2026-04-09T16:20:00.000Z",
    updatedAt: "2026-05-17T17:45:00.000Z",
  },
  {
    id: "artifact-auth-middleware",
    title: "auth.middleware.js",
    language: "JavaScript",
    tags: ["auth", "middleware", "security"],
    collection: "Backend",
    summary: "Express middleware for bearer-token authorization with safe 401 and 403 responses.",
    source: "Node service starter",
    code: `export function authMiddleware(req, res, next) {
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
}`,
    usageCount: 48,
    favorite: true,
    createdAt: "2026-03-28T11:05:00.000Z",
    updatedAt: "2026-05-17T15:18:00.000Z",
  },
  {
    id: "artifact-data-pipeline",
    title: "data.pipeline.py",
    language: "Python",
    tags: ["ml", "pipeline", "pandas"],
    collection: "Data",
    summary: "Compact feature pipeline that cleans records, builds features, and runs a model.",
    source: "ML experiments",
    code: `def run_pipeline(data):
    clean = clean_data(data)
    features = build_features(clean)
    model = load_model()
    return model.predict(features)`,
    usageCount: 37,
    createdAt: "2026-02-20T08:30:00.000Z",
    updatedAt: "2026-05-17T13:52:00.000Z",
  },
  {
    id: "artifact-user-service",
    title: "user.service.js",
    language: "JavaScript",
    tags: ["service", "user", "api"],
    collection: "Backend",
    summary: "User lookup service with explicit not-found handling for API routes.",
    source: "Account service",
    code: `export async function getUser(id) {
  const user = await db.users.findById(id);

  if (!user) {
    throw new Error("Not found");
  }

  return user;
}`,
    usageCount: 31,
    createdAt: "2026-01-19T19:05:00.000Z",
    updatedAt: "2026-05-17T12:11:00.000Z",
  },
  {
    id: "artifact-calculate-utils",
    title: "calculate.utils.js",
    language: "JavaScript",
    tags: ["math", "utilities", "arrays"],
    collection: "Utilities",
    summary: "Small utility functions for sum and average operations with readable reducers.",
    source: "Shared utilities",
    code: `export function sum(a, b) {
  return a + b;
}

export function avg(arr) {
  return arr.reduce(sum, 0) / arr.length;
}`,
    usageCount: 22,
    createdAt: "2026-04-15T13:12:00.000Z",
    updatedAt: "2026-05-17T10:24:00.000Z",
  },
  {
    id: "artifact-api-routes",
    title: "api.routes.js",
    language: "JavaScript",
    tags: ["express", "routes", "health"],
    collection: "Backend",
    summary: "Express route module with a health check endpoint and reusable router export.",
    source: "API bootstrap",
    code: `import express from "express";
const router = express.Router();

router.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

export default router;`,
    usageCount: 18,
    createdAt: "2026-02-06T18:42:00.000Z",
    updatedAt: "2026-05-16T22:07:00.000Z",
  },
  {
    id: "artifact-release-check",
    title: "release.check.sh",
    language: "Shell",
    tags: ["release", "qa", "automation"],
    collection: "Delivery",
    summary: "Small release gate for lint, tests, build, and artifact sanity checks.",
    source: "Delivery automation",
    code: `#!/usr/bin/env bash
set -euo pipefail

npm run lint
npm run build
npm run test:e2e

test -d dist
test -f dist/index.html`,
    usageCount: 14,
    createdAt: "2026-02-06T18:42:00.000Z",
    updatedAt: "2026-05-15T22:07:00.000Z",
  },
];

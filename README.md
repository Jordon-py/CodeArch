# CodeArch Command Center

CodeArch is a premium local-first code archive for writing, running, saving, searching, filtering, previewing, editing, importing, exporting, and reusing code snippets. The current app is a React/Vite workspace with a dedicated snippet library, collection intelligence, localStorage persistence, and Smart Save Autopilot for fast code-first capture.

## Stack

- React 19
- Vite
- Plain JavaScript / JSX
- Global CSS design system in `src/styles/codearch.css`
- LocalStorage-backed snippet repository in `src/services/codeArtifactRepository.js`
- FastAPI Smart Save sidecar in `server/app`
- Pydantic request, response, and AI-output contracts
- Ollama local LLM provider with deterministic fallback
- Playwright e2e tests

## Main Features

- Write code directly in the Code Workbench with a premium editor surface and syntax-colored preview.
- Run JavaScript safely in an isolated browser worker with captured logs, warnings, errors, and return values.
- Paste code first, analyze it with Smart Save Autopilot, review editable metadata, then confirm save.
- Save instantly with local deterministic metadata if Ollama or the FastAPI sidecar is unavailable.
- Generate title, language, tags, collection, description, use case, framework, dependencies, related snippets, duplicate warnings, and risk notes.
- Warn about exact and near duplicates before saving.
- Warn when pasted code appears to contain obvious secrets such as tokens, API keys, passwords, or private keys.
- Navigate between a focused Workbench page and a dedicated Library page at `/library`.
- Start from 20 useful boilerplates for auth, React hooks, cards, API clients, CRUD routes, loops, CLIs, tests, SQL, and utilities.
- Search saved scripts by title, language, collection, tag, source, summary, and code.
- Use the Collection Board to review collection health, pinned/favorite counts, top languages, top tags, and move selected snippets.
- Open the command palette with `Ctrl+K` or `Cmd+K`, then search metadata/code and open, copy, edit, pin, filter, or show related snippets.
- Select a script and inspect description, tags, size, line count, related snippets, source, and code.
- Import and export CodeArch JSON archives.
- Responsive dashboard layout for desktop, tablet, and mobile.

## Smart Save Autopilot

Smart Save Autopilot is a local-first save assistant:

```text
User pastes code
Frontend computes immediate deterministic preview and duplicate warnings
Frontend optionally calls FastAPI sidecar
FastAPI checks duplicates before AI
FastAPI calls local Ollama with a Pydantic-generated JSON schema
Pydantic validates the model output
Invalid output retries once with a repair prompt
Second failure, timeout, or offline Ollama falls back to deterministic extraction
Frontend shows editable suggestions
User confirms save to localStorage
```

No remote AI service is called by default. Ollama is expected to run on the same machine.

### Smart Save API

Sidecar entry point:

```text
server/app/main.py
```

Routes:

- `GET /health`
- `POST /api/smart-save/analyze`

Pydantic models live in `server/app/schemas.py`:

- `SmartSaveRequest`
- `SnippetMetadata`
- `DuplicateCandidate`
- `SmartSaveSuggestion`
- `SmartSaveResponse`
- `ErrorResponse`

The Ollama provider lives in `server/app/provider.py`. Deterministic metadata and duplicate detection live in `server/app/deterministic.py`.

### Recommended Ollama Model

Recommended local model:

```bash
ollama pull qwen2.5-coder:7b
```

The default sidecar model is `qwen2.5-coder:7b`. You can also try `llama3.1` or `deepseek-coder` if those are already installed locally.

### Environment Variables

Frontend:

```bash
VITE_SMART_SAVE_API_URL=http://127.0.0.1:8008
```

If `VITE_SMART_SAVE_API_URL` is not set, the frontend uses the browser-side deterministic fallback and still saves snippets normally.

Backend:

```bash
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5-coder:7b
OLLAMA_TIMEOUT_SECONDS=20
SMART_SAVE_ALLOWED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
```

### Start the Frontend

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173` or the URL Vite prints.

### Start Ollama

Install Ollama from `https://ollama.com`, then run:

```bash
ollama serve
ollama pull qwen2.5-coder:7b
```

On many systems `ollama serve` is managed by the Ollama desktop app or background service.

### Start the Smart Save Sidecar

From a second terminal:

```bash
cd server
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8008
```

Then start the frontend with `VITE_SMART_SAVE_API_URL=http://127.0.0.1:8008`.

PowerShell example:

```powershell
$env:VITE_SMART_SAVE_API_URL="http://127.0.0.1:8008"
npm run dev
```

### Example Smart Save Request

```json
{
  "code": "from fastapi import APIRouter\nrouter = APIRouter()",
  "existingSnippets": [
    {
      "id": "artifact-fastapi-auth",
      "title": "fastapi.auth.dependency.py",
      "language": "Python",
      "tags": ["python", "fastapi", "auth"],
      "collection": "Backend",
      "code": "from fastapi import Depends"
    }
  ],
  "currentCollections": ["Backend", "Frontend", "Security"],
  "userProvidedTitle": "",
  "userProvidedLanguage": ""
}
```

### Example Smart Save Response

```json
{
  "suggestion": {
    "title": "fastapi-router.py",
    "language": "Python",
    "tags": ["python", "fastapi", "api", "backend"],
    "collection": "Backend",
    "description": "Reusable FastAPI snippet with 2 lines.",
    "useCase": "Use when starting or extending a FastAPI API route.",
    "framework": "FastAPI",
    "dependencies": ["fastapi"],
    "confidence": 0.72,
    "warnings": [],
    "riskNotes": [],
    "relatedSnippetIds": ["artifact-fastapi-auth"],
    "duplicateCandidates": []
  },
  "duplicateCandidates": [],
  "fallbackUsed": true,
  "provider": "deterministic-fallback",
  "validationStatus": "fallback",
  "warnings": ["Ollama is unavailable; deterministic fallback was used."]
}
```

### Fallback Behavior

Smart Save does not require Ollama. If the sidecar URL is unset, the sidecar is down, Ollama is down, Ollama times out, or the model returns invalid structured output twice, CodeArch falls back to deterministic extraction.

Fallback extraction detects:

- Language from syntax and imports.
- Titles from function, class, component, route, or import hints.
- Tags from language, imports, framework names, security keywords, and file patterns.
- Collection from framework and topic signals.
- Dependencies from Python imports and JavaScript/TypeScript imports.
- Exact duplicates and near duplicates against saved snippets.
- Possible secrets from common token, key, password, private-key, and bearer-token patterns.

## Privacy And Security

- Smart Save sends code only to the configured local FastAPI sidecar and local Ollama instance.
- No remote AI provider is used by default.
- The backend avoids logging full pasted code.
- Pydantic validates AI-generated structured output before it is returned to the frontend.
- Obvious secrets are detected and surfaced as warnings before save.
- Duplicate detection runs before AI so the user gets deterministic warnings even when Ollama is unavailable.

## Troubleshooting

- `VITE_SMART_SAVE_API_URL` is unset: Smart Save uses browser fallback only. This is expected.
- `Ollama is unavailable`: start Ollama or continue with deterministic fallback.
- `Connection refused 127.0.0.1:11434`: Ollama is installed but not running.
- `CORS error`: make sure `SMART_SAVE_ALLOWED_ORIGINS` includes your Vite origin.
- `422 Unprocessable Entity`: the request body does not match `SmartSaveRequest`.
- `validationStatus: fallback`: Ollama output failed validation or Ollama was unavailable, and deterministic fallback protected the save flow.
- Saved snippets missing after refresh: localStorage may have been cleared. CodeArch stores browser-local data only.

## Verification

Frontend:

```bash
npm run lint
npm run build
npm run test:e2e -- --reporter=line --workers=1
```

Backend:

```bash
cd server
python -m pytest tests -q
```

Sidecar smoke check:

```bash
cd server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8008
```

Then call `http://127.0.0.1:8008/health` and `POST /api/smart-save/analyze`.

## Data Model

Saved snippets are stored in browser localStorage under `codearch.savedCodeArtifacts.v3`.

Snippet fields:

- `id`
- `title`
- `language`
- `tags`
- `collection`
- `summary`
- `source`
- `code`
- `usageCount`
- `favorite`
- `pinned`
- `health`
- `relatedIds`
- `versionHistory`
- `createdAt`
- `updatedAt`

## Deployment

Vercel is the intended frontend host.

Build settings:

- Build command: `npm run build`
- Output directory: `dist`
- Framework preset: Vite

Deploy:

```bash
npx vercel --yes
npx vercel --prod --yes
```

`vercel.json` includes a SPA fallback rewrite to serve `index.html` for deep links.

The Smart Save sidecar is local-first by design. For deployment, keep it private or host it on a trusted backend with explicit CORS and no remote AI provider unless you intentionally change that architecture.

## Project Structure

```text
server/
  app/
    deterministic.py
    main.py
    provider.py
    schemas.py
  tests/
    test_smart_save.py
  requirements.txt
src/
  components/
    AppShell.jsx
    CodeWorkbench.jsx
    CollectionBoard.jsx
    CommandPalette.jsx
    DashboardMetricsPanel.jsx
    ScriptLibrary.jsx
    SelectedScriptInspector.jsx
    SnippetEditor.jsx
  data/
    boilerplateSnippets.js
    codeArtifacts.js
  hooks/
    useCodeArtifacts.js
  pages/
    DashboardPage.jsx
  services/
    codeArtifactRepository.js
    smartSaveAutopilot.js
  utils/
    collectionInsights.js
    commandPaletteSearch.js
  styles/
    codearch.css
tests/
  dashboard.spec.js
scripts/
  run-e2e.mjs
```

## Portfolio Screenshots

| Desktop dashboard | Mobile dashboard |
| --- | --- |
| <img src="public/portfolio/codearch-desktop.png" alt="CodeArch desktop dashboard showing the premium workbench, artifact intelligence panel, and script library." width="720"> | <img src="public/portfolio/codearch-mobile.png" alt="CodeArch mobile dashboard showing the responsive code workbench layout." width="280"> |

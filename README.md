# Trade Store UI

This is a TypeScript React Single Page Application (SPA) built with Vite, Material UI, react-hook-form, and MSW for mocking. It implements a Trade Store UI: list, create/edit trades with client-side business validation, and tests.

Features:

- Trades list with MUI DataGrid (pagination, sorting)
- Create/Edit trade form using react-hook-form + Yup
- Mock API using MSW (in-browser for dev, server for tests)
- Unit & integration tests: Jest + React Testing Library
- E2E tests: Playwright (headless in CI)
- CI workflow configured (GitHub Actions) to lint, typecheck, build, run tests, run Playwright, and audit dependencies

Quick start (local):

1. Install dependencies

   npm ci

2. Start dev server

   npm run dev

3. Run unit tests

   npm test

4. Run Playwright E2E (ensure app served, e.g., `npm run preview` for a build)

   npm run e2e

Notes:

- CI is configured in `.github/workflows/ci.yml` and will fail the run if npm audit reports critical vulnerabilities.
- This is a minimal starter scaffolding focusing on the requested flows; expand as needed (Redux, code splitting, a11y tooling, Sentry integration, etc.).

## Switching to a real backend (using .env)

You can point the app to a real API by setting Vite environment variables. Create a `.env` file in the project root (do not commit secrets) or set env vars in your shell.

Example `.env` (copy from `.env.example`):

```
# .env
VITE_API_BASE=http://localhost:3000/trades
VITE_DISABLE_MSW=true
```

Notes:

- `VITE_API_BASE` sets the base URL used by the app's `apiClient`.
- `VITE_DISABLE_MSW=true` disables the in-browser MSW worker so requests are sent to the network. On Windows you can set these env vars for the session and then run the dev server:

```powershell
$env:VITE_API_BASE = 'http://localhost:3000/trades'; $env:VITE_DISABLE_MSW = 'true'; npm run dev
```

If you prefer an npm script to start with live API, install `cross-env` and add a script (example):

```json
"scripts": {
   "start:live": "cross-env VITE_DISABLE_MSW=true VITE_API_BASE=http://localhost:3000 vite"
}
```

CI: set the same env vars in your GitHub Actions workflow if you want tests or E2E to run against a staging API.

# Echo Prism Vault

A Vite + React + TypeScript frontend scaffold that integrates with Supabase. This README shows how to run the frontend locally, connect to or run a Supabase backend, and other developer notes.

## What this repo contains

- Frontend built with Vite, React, and TypeScript.
- UI components in `src/components` (shadcn-style components).
- Supabase integration in `src/integrations/supabase` and a local `supabase/` folder with migrations.

## Quick prerequisites

- Node.js (v18+ recommended) and `npm` installed. You can also use `pnpm` or `bun` if you prefer (a `bun.lockb` is present).
- (Optional, for local Supabase) Supabase CLI: https://supabase.com/docs/guides/cli

## Quick start (frontend only)

Open PowerShell and run:

```powershell
# from repo root
cd "c:\\Users\\MAYANK\\MAYDAY THINGS\\MAY PROJECTS\\echo-prism-vault"

# install dependencies
npm install

# start dev server
npm run dev
```

- Vite dev server will print the local URL (typically http://localhost:5173). Open that in your browser.
- To build a production bundle: `npm run build`.
- To preview a production build locally: `npm run preview`.

## Supabase backend

This project already includes a Supabase client at `src/integrations/supabase/client.ts` and a `supabase/` directory with migrations and `config.toml`.

Notes and options:

1. Remote Supabase project (quick):
	- The current `client.ts` contains a Supabase URL and publishable key. That works for local development but is not secure for production.
	- Recommended: store keys in environment variables instead of committing secrets. See the next section.

2. Local Supabase (recommended for development):
	- Install the Supabase CLI: https://supabase.com/docs/guides/cli
	- Start local Supabase from the repo root:

```powershell
# start the Supabase local stack (run this in a separate terminal)

```

	- Apply migrations in `supabase/migrations` using the Supabase CLI. The exact command varies with CLI versions; two common approaches:
	  - `supabase db push` (push the schema)
	  - or run the SQL files directly against your local DB using psql.

3. Environment variables

- It's best to avoid leaving API keys in source. Create a `.env.local` (add to `.gitignore`) and add keys like:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

- Then update `src/integrations/supabase/client.ts` to use `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY` instead of hard-coded values. Example:

```ts
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
```

Restart the dev server after changing env vars.

## Security reminder

- Never commit service_role or other secret keys.
- Use environment variables for secrets and rotate keys if they are accidentally committed.

## Useful file locations

- Frontend entry: `src/main.tsx`
- Supabase client: `src/integrations/supabase/client.ts`
- Supabase types: `src/integrations/supabase/types.ts`
- Supabase local config & migrations: `supabase/`

## Troubleshooting

- If Vite doesn't start, check that Node and npm are installed and your PATH is correct.
- If Supabase CLI commands fail, ensure Docker is running (Supabase local depends on Docker) and that your CLI is up to date.

## Next steps (suggestions)

- Replace hard-coded Supabase keys with environment vars.
- Wire up authentication flows and protect any server-only routes with proper keys.
- Add a short CONTRIBUTING or DEVELOPMENT.md if you want onboarding instructions for collaborators.

---

## Deploying (frontend + 24/7 Supabase backend)

Goal: host the frontend publicly (GitHub Pages) and use a hosted Supabase project for a 24/7 database and auth. This keeps your site live all the time and allows you to assign a custom domain.

High-level plan (recommended)

1. Create a hosted Supabase project at https://supabase.com (free tier available) and note the Project URL (eg. `https://xyzcompany.supabase.co`) and the anon/public key and the service_role key (from Project Settings > API).
2. Add the needed secrets to your GitHub repository (Settings > Secrets & Variables > Actions):
	- `VITE_SUPABASE_URL` -> your Supabase project URL (eg. `https://xyzcompany.supabase.co`)
	- `VITE_SUPABASE_ANON_KEY` -> the anon/public key
	- `SUPABASE_SERVICE_ROLE_KEY` -> service_role key (only needed for migrations/CI)
	- `SUPABASE_ACCESS_TOKEN` -> a CLI access token if you want GitHub Actions to run `supabase db push` automatically
3. Enable GitHub Pages for this repo (the provided GitHub Actions workflow builds and deploys the `dist` folder): the `deploy.yml` workflow will run on pushes to `main` and publish the built `dist` to Pages.
4. Apply the `supabase/migrations` to your hosted project:
	- Option A (manual): run locally with Supabase CLI and push migrations from this repo:

```powershell
# install and login to supabase CLI locally (requires Docker for local dev only)
# but for a hosted project you only need the CLI for migrations/push
npm install -g supabase
supabase login
# point CLI at your project and push migrations
supabase db push --project-ref your-project-ref
```

	- Option B (CI): use the included `.github/workflows/supabase_migrations.yml`. This workflow will run `supabase db push` in CI using `SUPABASE_ACCESS_TOKEN` and `SUPABASE_SERVICE_ROLE_KEY` from repo secrets. Add those secrets first in GitHub > Settings > Secrets for Actions.

5. Configure Supabase Auth settings (Project > Authentication > Settings):
	- Set the "Site URL" to your production URL (GitHub Pages URL or your custom domain).
	- During development you may disable email confirmations to make signup immediate, but keep it enabled for production security.

6. Custom domain: after GitHub Pages publishes the site, follow GitHub Pages docs to add a custom domain and update DNS records. After the domain is ready, update Supabase Auth "Site URL" to match your domain.

Secrets/keys reference

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are used by the frontend (Vite exposes `import.meta.env.VITE_*`). Keep these as repository secrets and also in local `.env.local` for local dev.
- `SUPABASE_SERVICE_ROLE_KEY` is sensitive (server-only). Only add it to GitHub Actions secrets. Do NOT publish it in client code.
- `SUPABASE_ACCESS_TOKEN` is the token used by the Supabase CLI to authenticate in CI. Create it in your Supabase account (Project > Settings > Service Key / or via the supabase dashboard user tokens) and add it as a GitHub secret.

Notes about GitHub Pages vs other hosts

- GitHub Pages is free and easy. The provided workflow deploys the Vite `dist` output to Pages.
- If you prefer automatic HTTPS, simple environment management, and a very fast global CDN, consider Vercel or Netlify — both have built-in env var management and integrate with Supabase easily.

Final checks I ran for you

- Added a GitHub Actions workflow to build & deploy the frontend (`.github/workflows/deploy.yml`).
- Added a workflow to run Supabase migrations (`.github/workflows/supabase_migrations.yml`) — set the secrets above to enable it.

If you want, I can:
- Automatically create a `.github/` secret configuration PR for you (I cannot upload secrets on your behalf, but I can open a PR with the workflow and instructions),
- Or I can switch the frontend deployment to Vercel (which is even simpler to connect to a custom domain and has automatic deployments on pushes).

---

If you'd like, I can continue now and:

- Guide you step-by-step to create a hosted Supabase project and the exact values to add to GitHub Secrets (I can show the UI clicks and the exact names to copy).
- Or, I can try to run migrations from CI once you add `SUPABASE_ACCESS_TOKEN` and `SUPABASE_SERVICE_ROLE_KEY` to the repo secrets.

Tell me which one you prefer and I'll proceed.

# Deploying to GitHub Pages

## Prerequisites

- A GitHub repository with this project pushed to it
- GitHub Pages enabled on the repository

## Setup (one-time)

1. **Push the repo to GitHub** (if not already):

   ```bash
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```

2. **Enable GitHub Pages with Actions deployment**:

   - Go to your repo on GitHub
   - Navigate to **Settings > Pages**
   - Under **Source**, select **GitHub Actions**

That's it. The workflow file at `.github/workflows/deploy.yml` is already configured.

## How it works

Every push to `main` (or manual trigger via **Actions > Deploy to GitHub Pages > Run workflow**) will:

1. Check out the code
2. Install dependencies (`npm ci` in `web-app/`)
3. Build the app (`npm run build`) with the correct base path
4. Deploy the `web-app/dist/` folder to GitHub Pages

The Vite `base` path is set automatically via the `VITE_BASE_PATH` environment variable in the workflow, so all asset URLs are prefixed with `/<repo-name>/`.

## Accessing the site

After the first successful deploy, your site will be at:

```
https://<your-username>.github.io/<repo-name>/
```

## Manual deploy / re-deploy

Go to **Actions > Deploy to GitHub Pages > Run workflow** and click the green button.

## Local preview of the production build

```bash
cd web-app
npm run build
npx vite preview
```

## Troubleshooting

- **404 on page load**: Make sure GitHub Pages source is set to "GitHub Actions" (not "Deploy from a branch").
- **Broken assets/blank page**: The `VITE_BASE_PATH` must match your repo name. The workflow handles this automatically.
- **Build fails**: Run `npm run build` locally in `web-app/` to reproduce and fix errors before pushing.

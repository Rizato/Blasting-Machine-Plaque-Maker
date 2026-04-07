import { defineConfig } from 'vite';

export default defineConfig({
  // For GitHub Pages: set to '/<repo-name>/' or use env var
  // For root domain or Cloudflare Pages: leave as '/'
  base: process.env.VITE_BASE_PATH || '/',
});

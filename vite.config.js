import { defineConfig } from 'vite';

// base './' so the build works from any subfolder (GitHub Pages, artifact preview, file hosting)
export default defineConfig({
  base: './',
});

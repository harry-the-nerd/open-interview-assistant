import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative paths so the built index.html loads from file:// inside Electron.
  base: './',
  server: { port: 5180 },
});

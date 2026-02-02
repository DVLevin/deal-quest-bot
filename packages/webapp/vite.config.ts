import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import mkcert from 'vite-plugin-mkcert';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tailwindcss(), mkcert(), tsconfigPaths()],
  base: '/',
  build: { outDir: 'dist', target: 'es2020' },
  server: { host: true },
});

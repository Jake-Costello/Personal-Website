import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react()],
    base: env.VITE_BASE_PATH || '/',
    build: {
      target: 'es2022',
      rolldownOptions: {
        input: {
          home: fileURLToPath(new URL('./index.html', import.meta.url)),
          arcade: fileURLToPath(new URL('./arcade/index.html', import.meta.url)),
        },
      },
    },
  };
});

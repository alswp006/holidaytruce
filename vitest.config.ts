import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  cacheDir: './.vitecache',
  plugins: [
    {
      name: 'dbg-resolve-rr',
      enforce: 'pre',
      async resolveId(source, importer) {
        if (source === 'react-router-dom' || source === 'react-router') {
          const r = await this.resolve(source, importer, { skipSelf: true });
          // eslint-disable-next-line no-console
          console.log('RESOLVE', source, 'from', importer?.split('/').slice(-2).join('/'), '->', r?.id);
        }
        return null;
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: { exclude: ['react-router-dom', 'react-router'] },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    pool: 'forks',
    poolOptions: { forks: { minForks: 1, maxForks: 2 } },
  },
});

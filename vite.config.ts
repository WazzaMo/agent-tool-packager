import { defineConfig } from 'vite';
import { resolve } from 'path';
import { builtinModules } from 'module';

export default defineConfig({
  build: {
    target: 'node24',
    ssr: true, // We are building for Node
    lib: {
      entry: resolve(__dirname, 'src/cli.ts'),
      formats: ['es'],
      fileName: 'cli',
    },
    rollupOptions: {
      external: [
        ...builtinModules,
        ...builtinModules.map(m => `node:${m}`),
      ],
      output: {
        banner: '#!/usr/bin/env node\n',
        inlineDynamicImports: true,
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
    minify: true,
  },
  ssr: {
    noExternal: true, // Bundle all dependencies
  },
  resolve: {
    alias: {
      // If there are any aliases in tsconfig
    }
  }
});

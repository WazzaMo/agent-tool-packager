import { defineConfig } from 'vite';
import { resolve } from 'path';
import { builtinModules } from 'module';
import fs from 'node:fs';

const version = fs.readFileSync('project-version', 'utf8').trim();

export default defineConfig({
  define: {
    'process.env.ATP_VERSION': JSON.stringify(version),
  },
  build: {
    target: 'node24',
    ssr: true, // We are building for Node
    lib: {
      entry: resolve(__dirname, 'src/atp.ts'),
      formats: ['es'],
      fileName: 'atp',
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
      // @iarna/toml's generated parser uses eval(); expected for that dependency. Node CLI bundle only.
      onwarn(warning, defaultHandler) {
        const msg = String(warning.message ?? '');
        if (msg.includes('@iarna/toml') && msg.toLowerCase().includes('eval')) {
          return;
        }
        defaultHandler(warning);
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

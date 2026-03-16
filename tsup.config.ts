import { defineConfig } from 'tsup';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  entry: ['apps/cli/src/index.ts'],
  format: ['esm'],
  target: 'node22',
  outDir: 'dist-pkg',
  splitting: false,
  clean: true,
  external: ['commander', 'chalk', 'inquirer', 'ora', 'zod'],
  noExternal: ['@sydev/core'],
  banner: { js: '#!/usr/bin/env node' },
  define: {
    'process.env.SYDEV_VERSION': JSON.stringify(pkg.version),
    '__BUNDLED__': 'true',
  },
});

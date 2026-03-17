import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    sourcemap: true,
    minify: false,
    external: ['react'],
    splitting: false,
  },
  {
    entry: { react: 'src/react.tsx' },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    minify: false,
    external: ['react'],
    splitting: false,
  },
]);

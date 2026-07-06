import { defineConfig } from 'tsup';

// Dual CJS + ESM + d.ts so the NestJS api (CommonJS/NodeNext) and the Next.js
// web app (ESM/bundler) can both consume the shared contract without friction.
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    api: 'src/api.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
});

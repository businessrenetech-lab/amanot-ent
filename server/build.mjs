// ============================================================================
// Bundles the TypeScript backend into plain Node ESM in server/dist/ using
// esbuild. No type-checking (that's `npm run lint`) — just fast transpilation
// so Hostinger's "Setup Node.js App" can run `node server/dist/server.js`
// without needing tsx / ts-node installed in production.
//   Run:  npm run build:server
// ============================================================================
import { build } from 'esbuild';

const shared = {
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  // keep third-party + built-in deps external; only our own TS gets bundled in
  packages: 'external',
  logLevel: 'info',
  // esm-out needs these shims for CJS deps that reference require/__dirname
  banner: {
    js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);",
  },
};

await build({
  ...shared,
  entryPoints: {
    server: 'server/src/server.ts',
    migrate: 'server/src/migrate.ts',
    seed: 'server/src/seed.ts',
    'create-admin': 'server/src/create-admin.ts',
    'import-electronics': 'server/src/import-electronics.ts',
  },
  outdir: 'server/dist',
});

console.log('✓ Backend bundled to server/dist/ (server.js, migrate.js, seed.js)');

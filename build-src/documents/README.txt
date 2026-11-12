Document converter vendor build

The generated files are already included in vendor/documents, so the website needs no build step.

To rebuild deliberately with Node 24 and pnpm:
1. In this directory run: pnpm install --frozen-lockfile
2. From the website root run: node build-src/documents/build.mjs

Only the browser-specific imports are bundled. PDF.js is copied as the legacy ESM build to support browsers that do not yet provide newer typed-array methods. Its worker, CMaps, standard fonts and licenses are copied locally.

build.mjs can also use the isolated .draft/build-documents dependency directory used during development. Do not publish .draft or node_modules.

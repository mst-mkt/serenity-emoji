import { defineConfig } from 'vite-plus'

export default defineConfig({
  pack: {
    entry: ['src/main.ts'],
    format: ['esm'],
    dts: false,
    // bundle the declared dependencies; onlyImport asserts dist/main.mjs stays standalone
    deps: {
      alwaysBundle: [/^@serenity-emoji\//, /^@gunshi\//, 'gunshi', 'emoji-name-map', 'valibot'],
      onlyImport: [],
    },
  },
})

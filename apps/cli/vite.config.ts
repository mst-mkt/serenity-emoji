import { defineConfig } from 'vite-plus'

export default defineConfig({
  pack: {
    entry: ['src/main.ts'],
    format: ['esm'],
    dts: false,
    banner: '#!/usr/bin/env node',
    deps: {
      alwaysBundle: [/^@serenity-emoji\//, /^@gunshi\//, 'gunshi', 'emoji-name-map', 'valibot'],
      onlyImport: [],
    },
  },
})

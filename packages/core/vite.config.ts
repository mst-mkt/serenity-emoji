import { defineConfig } from 'vite-plus'

export default defineConfig({
  run: {
    tasks: {
      dev: 'vp pack --no-clean --watch',
    },
  },
  pack: {
    entry: 'src/index.ts',
    dts: {
      tsgo: true,
    },
    sourcemap: true,
  },
})

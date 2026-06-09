import { defineConfig } from 'vite-plus'

export default defineConfig({
  run: {
    tasks: {
      dev: {
        command: 'wrangler dev',
        cache: false,
      },
    },
  },
  staged: {
    '*': 'vp check --fix',
  },
  test: {
    include: ['./src/**/*.test.{ts,tsx}'],
  },
  fmt: {
    semi: false,
    singleQuote: true,
    sortImports: {},
    sortPackageJson: {
      sortScripts: false,
    },
  },
  lint: {
    ignorePatterns: ['cloudflare-env.d.ts'],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
})

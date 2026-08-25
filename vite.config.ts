import { defineConfig } from 'vite-plus'

export default defineConfig({
  run: {
    tasks: {
      dev: {
        command: 'wrangler dev',
        cache: false,
      },
      'gen:types': {
        command: 'wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts',
        cache: false,
      },
      deploy: {
        command: 'wrangler deploy',
        cache: false,
      },
      'test:ci': {
        command: 'vp test run --reporter=default --reporter=github-actions',
      },
    },
  },
  staged: {
    '*': 'vp check --fix',
  },
  test: {
    include: ['./src/**/*.test.{ts,tsx}', './scripts/**/*.test.{ts,tsx}'],
  },
  fmt: {
    ignorePatterns: ['cloudflare-env.d.ts'],
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

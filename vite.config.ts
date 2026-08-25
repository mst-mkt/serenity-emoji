import { defineConfig } from 'vite-plus'

export default defineConfig({
  run: {
    tasks: {
      dev: {
        command: 'vp run @serenity-emoji/api#dev',
        cache: false,
      },
      'gen:types': {
        command: 'vp run @serenity-emoji/api#gen:types',
        cache: false,
      },
      deploy: {
        command: 'vp run @serenity-emoji/api#deploy',
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
    include: [
      './packages/*/src/**/*.test.{ts,tsx}',
      './packages/font/scripts/**/*.test.{ts,tsx}',
      './apps/*/src/**/*.test.{ts,tsx}',
    ],
  },
  fmt: {
    ignorePatterns: ['apps/api/cloudflare-env.d.ts'],
    semi: false,
    singleQuote: true,
    sortImports: {},
    sortPackageJson: {
      sortScripts: false,
    },
  },
  lint: {
    ignorePatterns: ['apps/api/cloudflare-env.d.ts'],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
})

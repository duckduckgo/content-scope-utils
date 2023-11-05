import { defineConfig } from '@playwright/test'

export default defineConfig({
  projects: [
    // {
    //     name: 'windows',
    //     testMatch: [],
    //     use: { injectName: 'windows', platform: 'windows' }
    // },
    // {
    //   name: 'apple',
    //   testMatch: ['*.spec.js'],
    //   testDir: 'integration-tests',
    //   use: { injectName: 'apple', platform: 'macos' },
    // },
    {
      name: 'http',
      testMatch: ['*.spec.js'],
      testDir: 'integration-tests',
      use: { injectName: 'apple', platform: 'macos' },
    },
  ],
  // eslint-disable-next-line no-undef
  fullyParallel: !process.env.CI,
  /* Retry on CI only */
  // eslint-disable-next-line no-undef
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  // eslint-disable-next-line no-undef
  workers: process.env.CI ? 1 : 2,

  // eslint-disable-next-line no-undef
  reporter: process.env.CI ? 'github' : [['html', { open: 'never' }]],
  use: {
    actionTimeout: 1000,
    trace: 'on-first-retry',
  },
})

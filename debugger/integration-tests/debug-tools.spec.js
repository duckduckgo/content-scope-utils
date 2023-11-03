import { test } from '@playwright/test'
import { DebugToolsPage } from './page-objects/debug-tools.js'

test.describe('debug tools', () => {
  test.describe('navigation', () => {
    test('loads the application, defaults to remote resource editor', async ({ page, baseURL }, workerInfo) => {
      const dt = DebugToolsPage.create(page, baseURL, workerInfo)
      await dt.enabled()
      await dt.openRemoteResourceEditor({ id: 'privacy-configuration' })
      await dt.features.canToggle()
    })
  })
})

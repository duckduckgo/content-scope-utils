import { testHttp as test } from './utils.mjs'
import { DebugToolsPage } from './page-objects/debug-tools.js'

test.describe('debug tools', () => {
  test.describe('navigation', () => {
    test('loads the application, defaults to remote resource editor', async ({ page, http }, workerInfo) => {
      const dt = DebugToolsPage.create(page, http.addresses[0], workerInfo)
      await dt.enabled()
      await dt.openRemoteResourceEditor({ id: 'privacy-configuration' })
      await dt.features.canToggle()
    })
  })
})

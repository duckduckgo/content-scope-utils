import { test } from '@playwright/test'
import { DebugToolsPage } from './page-objects/debug-tools.js'

test.describe('debug tools privacy config', () => {
  test.describe('transforms', () => {
    test('updates the hash and version', async ({ page, baseURL, context }, workerInfo) => {
      await context.grantPermissions(['clipboard-write', 'clipboard-read', 'accessibility-events'])
      const dt = DebugToolsPage.create(page, baseURL, workerInfo)
      const initial = {
        unprotectedTemporary: [],
        features: {
          abc: {
            state: 'enabled',
            exceptions: [],
            settings: {
              a: 'b',
              c: ['d'],
            },
            hash: 'abc',
          },
        },
      }
      const edited = {
        unprotectedTemporary: [],
        features: {
          abc: {
            state: 'enabled',
            exceptions: [],
            settings: {
              a: 'b',
              c: ['d'],
              d: { e: 'f' },
            },
            hash: 'abc',
          },
        },
      }
      const editedString = JSON.stringify(edited, null, 2)

      await dt.enabled()

      const jsonString = JSON.stringify(initial, null, 2)

      /** @type {import('../schema/__generated__/schema.types.js').RemoteResource} */
      const resource = dt.resources.remoteResources.privacyConfig(jsonString)

      await dt.withPrivacyConfig(resource)
      await dt.openRemoteResourceEditor({ id: 'privacy-configuration' })
      await dt.features.canToggle('abc')
      await dt.switchesTo('inline')
      await dt.editor.setsEditorValue({ editorKind: 'inline', editorPath: resource.id }, editedString)
      await dt.editor.clicksSave(resource, editedString)

      const saved = await dt.savedWithValue()
      dt.features.featureHasUpdatedHash(saved.source.debugTools.content, 'abc')
      dt.features.configHasUpdatedVersion(saved.source.debugTools.content)
    })
  })
})

import { test } from '@playwright/test'
import { DebugToolsPage } from './page-objects/debug-tools.js'

test.describe('debug tools privacy config', () => {
  test.describe('transforms', () => {
    test('updates the hash and version', async ({ page, baseURL }, workerInfo) => {
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
      await dt.withPrivacyConfig(initial)
      await dt.openRemoteResourceEditor()
      await dt.features.canToggle('abc')
      await dt.switchesTo('inline')
      await dt.editor.setsEditorValueTo(editedString)
      await dt.editor.clicksSave()
      const saved = await dt.savedWithValue()
      dt.features.featureHasUpdatedHash(saved.source.debugTools.content, 'abc')
      dt.features.configHasUpdatedVersion(saved.source.debugTools.content)
    })
  })
})

import { test } from '@playwright/test'
import { DebugToolsPage } from './page-objects/debug-tools.js'

test.describe('debug tools privacy config', () => {
  test.describe('transforms', () => {
    test('updates the hash', async ({ page, baseURL }, workerInfo) => {
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
      await dt.hasLoadedWithFeature('abc')
      await dt.switchesTo('inline')
      await dt.editsPreview(editedString)
      await dt.submitsEditorSave()
      const saved = await dt.savedWithValue()
      dt.featureHasUpdatedHash(saved.source.debugTools.content, 'abc')
    })
  })
})

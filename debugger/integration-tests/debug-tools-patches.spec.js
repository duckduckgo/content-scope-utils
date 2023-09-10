import { test } from '@playwright/test'
import { DebugToolsPage } from './page-objects/debug-tools'

/**
 * Feature: Patches
 *
 *   Scenario: copying a patch for an override
 *
 *     Given I have edited a remote resource
 *     When I save + apply it
 *     Then I can copy the patch to my clipboard
 *     And I can view and adjust the patch
 *
 *   Scenario: generating a patch from current edits
 *
 *     Given I have edited a remote resource
 *     But I don't want to save + apply the changes yet
 *     Then I can still generate a patch based off my changes and adjust it
 *
 *   Scenario: applying a patch
 *
 *     When I have access to a patch (clipboard or otherwise)
 *     Then I can apply it to the current resource
 */

test.describe.skip('Feature: Patches', () => {
  test('Scenario: copying a patch for an override', async ({ page, baseURL }, workerInfo) => {
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
        },
      },
    }
    const editedString = JSON.stringify(edited, null, 2)

    await test.step('Given I have edited a remote resource', async () => {
      await dt.enabled()
      await dt.withPrivacyConfig(initial)
      await dt.openRemoteResourceEditor()
      await dt.hasLoadedWithFeature('abc')
      await dt.switchesTo('inline')
      await dt.editsPreview(editedString)
    })

    await test.step('When I save + apply it', async () => {
      await dt.submitsEditorSave()
    })

    await test.step('Then I can copy the patch to my clipboard', async () => {
      await dt.copyPatchFromOverride(initial, edited)
    })

    await test.step('And it will be saved in localStorage', async () => {
      await dt.patchIsStoredInLocalStorage('privacy-configuration', initial, edited)
    })
  })
  test('Scenario: restoring a patch', async ({ page, baseURL }, workerInfo) => {
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
        },
      },
    }

    await test.step('Given I have previously saved an edit', async () => {
      await dt.withExistingPatches()
      await dt.enabled()
      await dt.withEditedPrivacyConfig(edited)
    })

    await test.step('When I load the page', async () => {
      await dt.openRemoteResourceEditor()
      await dt.hasLoadedWithFeature('abc')
    })

    await test.step('Then I can still copy the patch to my clipboard', async () => {
      await dt.copyPatchFromOverride(initial, edited)
    })
  })
})

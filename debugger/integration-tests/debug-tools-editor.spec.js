import { test } from '@playwright/test'
import { DebugToolsPage, DEFAULT_BASE_VALUE } from './page-objects/debug-tools'

test.describe('editor', () => {
  test('updates a resource', async ({ page, baseURL }, workerInfo) => {
    const dt = DebugToolsPage.create(page, baseURL, workerInfo)
    await dt.enabled()
    await dt.withTestResources()
    await dt.openRemoteResourceEditor()
    await dt.switchesTo('inline')
    await dt.editor.setsEditorValueTo()
    await dt.editor.saves('test-resource')
  })
  test('shows editor error and allows it to be reverted (simple)', async ({ page, baseURL }, workerInfo) => {
    const dt = DebugToolsPage.create(page, baseURL, workerInfo)
    await dt.enabled()
    await dt.withTestResources()
    await dt.withSimpleEditor()
    await dt.openRemoteResourceEditor()
    await dt.switchesTo('inline')
    await dt.editor.setsEditorValueTo('shane')
    await dt.revertsErrorFromPopup()
    await dt.editor.waitForEditorToHaveValue(JSON.stringify(JSON.parse(DEFAULT_BASE_VALUE), null, 4))
  })
  test('reverts editor content (simple)', async ({ page, baseURL }, workerInfo) => {
    const dt = DebugToolsPage.create(page, baseURL, workerInfo)
    await dt.enabled()
    await dt.withTestResources()
    await dt.withSimpleEditor()
    await dt.openRemoteResourceEditor()
    await dt.switchesTo('inline')
    await dt.editor.setsEditorValueTo('[]') // valid json
    await dt.editor.revertEditorContent()
    await dt.editor.waitForEditorToHaveValue(JSON.stringify(JSON.parse(DEFAULT_BASE_VALUE), null, 4))
  })
  test('handles when input cannot be used with toggles (because of edits)', async ({ page, baseURL }, workerInfo) => {
    const dt = DebugToolsPage.create(page, baseURL, workerInfo)
    await dt.enabled()
    await dt.openRemoteResourceEditor()
    await dt.features.canToggle()
    await dt.switchesTo('inline')
    await dt.editor.setsEditorValueTo('[]') // <- completely invalid type for this resource
    await dt.switchesTo('toggles')
    await dt.showsErrorText('Cannot use toggles because the format was invalidated (probably because of edits)')
  })
  test('handles when a global toggle is clicked', async ({ page, baseURL }, workerInfo) => {
    const dt = DebugToolsPage.create(page, baseURL, workerInfo)
    await dt.enabled()
    await dt.openRemoteResourceEditor()
    await dt.features.canToggle()

    await test.step('toggles a feature globally', async () => {
      await dt.features.toggleGlobally('autofill')
    })

    await test.step('switches to diff view + saves', async () => {
      await dt.switchesTo('diff')
      await dt.editor.clicksSave()
      const saved = await dt.savedWithValue()
      dt.features.featureWasDisabledGlobally(saved.source.debugTools.content, 'autofill')
    })
  })
  test('switches editor kind', async ({ page, baseURL }, workerInfo) => {
    const dt = DebugToolsPage.create(page, baseURL, workerInfo)
    await dt.enabled()
    await dt.openRemoteResourceEditor()
    await dt.features.canToggle()
    await dt.switchesTo('inline')
    await dt.editor.setsEditorValueTo()

    await test.step('switches to diff view + makes an edit', async () => {
      await dt.switchesTo('diff')
      await dt.editor.setsEditorValueTo('[]')
    })

    await test.step('switches back to inline view, edits should remain', async () => {
      await dt.switchesTo('inline')
      await dt.editor.stillHasEditedValue('[]')
    })
  })
})

import { test } from '@playwright/test'
import {
  DebugToolsPage,
  DEFAULT_BASE_VALUE,
  DEFAULT_EDIT_VALUE,
  DEFAULT_UPDATE_VALUE,
} from './page-objects/debug-tools'
import { Resources } from './page-objects/resources'

test.describe('editor', () => {
  test('updates a resource current content', async ({ page, baseURL }, workerInfo) => {
    const dt = DebugToolsPage.create(page, baseURL, workerInfo)

    const resource = dt.resources.remoteResources.testResource(DEFAULT_BASE_VALUE)
    const updated = Resources.updatedResource(resource, DEFAULT_UPDATE_VALUE)

    await test.step('setup mocks', async () => {
      dt.mocks.defaultResponses({
        getRemoteResource: resource,
        updateResource: updated,
      })
    })

    await test.step('navigate and edit value', async () => {
      await dt.enabled()
      await dt.openRemoteResourceEditor()
      await dt.switchesTo('inline')
      await dt.editor.setsEditorValue({ editorKind: 'inline', editorPath: updated.id }, updated.current.contents)
    })

    await test.step('assert messages and editor values are correct', async () => {
      await dt.editor.saves(resource, { editorPath: resource.id, editorKind: 'inline' }, updated.current.contents)
    })
  })
  // test.only('shows editor error and allows it to be reverted (simple)', async ({ page, baseURL }, workerInfo) => {
  //   const dt = DebugToolsPage.create(page, baseURL, workerInfo)
  //   await dt.enabled()
  //   await dt.withTestResources()
  //   await dt.withGlobalConfig({ editor: 'simple' })
  //   await dt.openRemoteResourceEditor()
  //   await dt.switchesTo('inline')
  //   await dt.editor.setsEditorValueTo('shane')
  //   await dt.revertsErrorFromPopup()
  //   await dt.editor.waitForEditorToHaveValue(JSON.stringify(JSON.parse(DEFAULT_BASE_VALUE), null, 4))
  // })
  // test('reverts editor content (simple)', async ({ page, baseURL }, workerInfo) => {
  //   const dt = DebugToolsPage.create(page, baseURL, workerInfo)
  //   await dt.enabled()
  //   await dt.withTestResources()
  //   await dt.withGlobalConfig({ editor: 'simple' })
  //   await dt.openRemoteResourceEditor()
  //   await dt.switchesTo('inline')
  //   await dt.editor.setsEditorValueTo('[]') // valid json
  //   await dt.editor.revertEditorContent()
  //   await dt.editor.waitForEditorToHaveValue(JSON.stringify(JSON.parse(DEFAULT_BASE_VALUE), null, 4))
  // })
  test('handles when input cannot be used with toggles (because of edits)', async ({ page, baseURL }, workerInfo) => {
    const dt = DebugToolsPage.create(page, baseURL, workerInfo)
    await dt.enabled()
    await dt.openRemoteResourceEditor()
    await dt.features.canToggle()
    await dt.switchesTo('inline')
    await dt.editor.setsEditorValue({ editorKind: 'inline', editorPath: 'privacy-configuration' }, '[]') // <- completely invalid type for this resource
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

      const resource = dt.resources.remoteResources.privacyConfig()
      const json = JSON.parse(resource.current.contents)
      json.features['autofill'].state = 'disabled'
      const as_string = JSON.stringify(json)
      const expectedUpdate = Resources.updatedResource(resource, as_string)
      await dt.editor.clicksSave(resource, expectedUpdate.current.contents)

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
    await dt.editor.setsEditorValue({ editorKind: 'inline', editorPath: 'privacy-configuration' }, DEFAULT_EDIT_VALUE)

    await test.step('switches to diff view + makes an edit', async () => {
      await dt.switchesTo('diff')
      await dt.editor.setsEditorValue({ editorKind: 'diff', editorPath: 'current/privacy-configuration' }, '[]')
    })

    await test.step('switches back to inline view, edits should remain', async () => {
      await dt.switchesTo('inline')
      await dt.editor.stillHasEditedValue({ editorKind: 'inline', editorPath: 'privacy-configuration' }, '[]')
    })
  })
})

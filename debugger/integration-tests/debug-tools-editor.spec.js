import { DebugToolsPage, DEFAULT_EDIT_VALUE, DEFAULT_UPDATE_VALUE } from './page-objects/debug-tools'
import { testHttp as test } from './utils.mjs'
import { remoteResourceSchema } from '../schema/__generated__/schema.parsers.mjs'

test.describe.only('editor', () => {
  test('updates a resource current content', async ({ page, http }, workerInfo) => {
    const dt = DebugToolsPage.create(page, http.addresses[0], workerInfo)
    const id = 'test-text'

    await test.step('setup mocks', async () => {
      await dt.enabled()
    })

    await test.step('navigate and edit value', async () => {
      await dt.openRemoteResourceEditor({ id })
      await dt.switchesTo('inline')
      await dt.editor.setsEditorValue({ editorKind: 'inline', editorPath: id }, DEFAULT_UPDATE_VALUE)
    })

    await test.step('assert messages and editor values are correct', async () => {
      await dt.editor.saves(id, { editorPath: id, editorKind: 'inline' }, DEFAULT_UPDATE_VALUE)
    })
  })
  // test.only('shows editor error and allows it to be reverted (simple)', async ({ page, http }, workerInfo) => {
  //   const dt = DebugToolsPage.create(page, http.addresses[0], workerInfo)
  //   await dt.enabled()
  //   await dt.withGlobalConfig({ editor: 'simple' })
  //   await dt.openRemoteResourceEditor({ id: 'privacy-configuration' })
  //   await dt.switchesTo('inline')
  //   await dt.editor.setsEditorValue({ editorKind: 'inline', editorPath: 'privacy-configuration' }, 'shane')
  //   await page.pause()
  //   await dt.revertsErrorFromPopup()
  //   // await dt.editor.waitForEditorToHaveValue(JSON.stringify(JSON.parse(DEFAULT_BASE_VALUE), null, 4))
  // })
  // test('reverts editor content (simple)', async ({ page, baseURL }, workerInfo) => {
  //   const dt = DebugToolsPage.create(page, baseURL, workerInfo)
  //   await dt.enabled()
  //   await dt.withTestResources()
  //   await dt.withGlobalConfig({ editor: 'simple' })
  //   await dt.openRemoteResourceEditor({ id: 'privacy-configuration' })
  //   await dt.switchesTo('inline')
  //   await dt.editor.setsEditorValueTo('[]') // valid json
  //   await dt.editor.revertEditorContent()
  //   await dt.editor.waitForEditorToHaveValue(JSON.stringify(JSON.parse(DEFAULT_BASE_VALUE), null, 4))
  // })
  test('handles when input cannot be used with toggles (because of edits)', async ({ page, http }, workerInfo) => {
    const dt = DebugToolsPage.create(page, http.addresses[0], workerInfo)
    await dt.enabled()
    await dt.openRemoteResourceEditor({ id: 'privacy-configuration' })
    await dt.features.canToggle()
    await dt.switchesTo('inline')
    await dt.editor.setsEditorValue({ editorKind: 'inline', editorPath: 'privacy-configuration' }, '[]') // <- completely invalid type for this resource
    await dt.switchesTo('toggles')
    await dt.showsErrorText('Cannot use toggles because the format was invalidated (probably because of edits)')
  })
  test('handles when a global toggle is clicked', async ({ page, http }, workerInfo) => {
    const dt = DebugToolsPage.create(page, http.addresses[0], workerInfo)
    await dt.enabled()
    await dt.openRemoteResourceEditor({ id: 'privacy-configuration' })
    await dt.features.canToggle()

    await test.step('toggles a feature globally', async () => {
      await dt.features.toggleGlobally('autofill')
    })

    await test.step('switches to diff view + saves', async () => {
      await dt.switchesTo('diff')
      const { responseJson } = await dt.editor.savesWithReqAndRes()
      const response = remoteResourceSchema.parse(responseJson)
      dt.features.featureWasDisabledGlobally(response.current.contents, 'autofill')
    })
  })
  test('switches editor kind', async ({ page, http }, workerInfo) => {
    const dt = DebugToolsPage.create(page, http.addresses[0], workerInfo)
    await dt.enabled()
    await dt.openRemoteResourceEditor({ id: 'privacy-configuration' })
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
  test('switches resource during editing', async ({ page, http }, workerInfo) => {
    const dt = DebugToolsPage.create(page, http.addresses[0], workerInfo)
    await dt.enabled()

    await dt.openRemoteResourceEditor({ id: 'privacy-configuration' })
    // await dt.features.canToggle()
    await dt.switchesTo('diff')
    await page.pause()
  })
})

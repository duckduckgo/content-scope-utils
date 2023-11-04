import { testHttp as test } from './utils.mjs'
import { DebugToolsPage } from './page-objects/debug-tools.js'
import { remoteResourceSchema } from '../schema/__generated__/schema.parsers.mjs'

test.describe('debug tools privacy config', () => {
  test.describe('transforms', () => {
    test('updates fields on save', async ({ page, http, context }, workerInfo) => {
      await context.grantPermissions(['clipboard-write', 'clipboard-read', 'accessibility-events'])
      const dt = await DebugToolsPage.create(page, http.addresses[0], workerInfo)
      const id = 'single-config'
      await dt.enabled()
      await dt.openRemoteResourceEditor({ id })

      await dt.features.canToggle('a')
      await dt.switchesTo('inline')
      const original = await dt.editor.readCurrentValue({ editorKind: 'inline', editorPath: id })
      const json = JSON.parse(original)
      const originalHash = json.features.a.hash
      const originalVersion = json.version

      // make the change
      json.features.a.exceptions.push({
        domain: 'duckduckgo.com',
      })

      // set the changes into the editor
      const asModifiedJson = JSON.stringify(json, null, 2)
      await dt.editor.setsEditorValue({ editorKind: 'inline', editorPath: id }, asModifiedJson)

      // save and get the response
      const { responseJson } = await dt.editor.savesWithReqAndRes()

      // parse the response for the types
      const resource = remoteResourceSchema.parse(responseJson)

      // assert hash updated
      dt.features.featureHasUpdatedHash(resource.current.contents, 'a', originalHash)

      // assert version updated
      dt.features.configHasUpdatedVersion(resource.current.contents, originalVersion)
    })
  })
})

import { expect } from '@playwright/test'
import { DEFAULT_EDIT_VALUE } from './debug-tools'
import { mockResponses } from '@duckduckgo/content-scope-scripts/packages/messaging/lib/test-utils.mjs'
import { Resources } from './resources'

/**
 * @typedef {import('../../src/js/remote-resources/remote-resources.machine').EditorKind} EditorKind
 * @typedef {{editorKind: EditorKind; editorPath: string}} EditorLocator
 */

export class Editor {
  /**
   * @param {import("@playwright/test").Page} page
   * @param {import("./mocks").Mocks} mocks
   */
  constructor(page, mocks, resources) {
    this.page = page
    this.mocks = mocks
    this.resources = resources
    this.$ = new (class Selectors {
      editorSave = () => page.getByRole('button', { name: 'Save + Apply' })
      revertButton = () => page.getByRole('button', { name: 'Revert' })
      footer = () => page.getByTestId('Footer')
    })()
  }

  get values() {
    const page = this.page
    return {
      editorValue: () => page.evaluate(() => window._test_editor_value()),
    }
  }

  async waitForEditorToHaveValue(value) {
    await this.page.waitForFunction(
      ({ value }) => {
        // keep trying the editor, value may be set asynchronously
        // this will timeout after 1000ms
        const editor = document.querySelector('.monaco-editor')?.querySelector('.lines-content')
        const match = editor?.textContent === value
        console.log(editor?.textContent?.length, value.length)
        // console.log({ match, value, editor: editor?.textContent })
        return match
      },
      { value },
      { timeout: 5000 },
    )
  }

  /**
   * @param {EditorLocator} editorLocator
   * @param {string} value
   */
  async setsEditorValue(editorLocator, value) {
    // this makes sure the JS is compiled/loaded
    const { page } = this
    const editor = this.editorLocator(editorLocator)
    await editor.click()
    await editor.press('Meta+KeyA')
    await editor.press('Delete')
    const path = '/' + [editorLocator.editorKind, editorLocator.editorPath].join('/')
    await page.evaluate(
      ({ value, path }) => {
        if (!window.__playwright_01) return
        if (!(path in window.__playwright_01['models'])) {
          throw new Error('missing path model' + path)
        }
        window.__playwright_01['models'][path].setValue(value)
      },
      { value, path },
    )
    return this.readCurrentValue(editorLocator)
  }

  /**
   * @param {EditorLocator} editorLocator
   * @return {import("@playwright/test").Locator}
   */
  editorLocator(editorLocator) {
    const editorPath = '/' + [editorLocator.editorKind, editorLocator.editorPath].join('/')
    const editor = this.page.locator(`[data-uri="file://${editorPath}"]`)
    return editor
  }

  /**
   * @param {EditorLocator} editorLocator
   * @return {Promise<*|string>}
   */
  async readCurrentValue(editorLocator) {
    const originalString = await this.editorLocator(editorLocator).locator('.lines-content').textContent()

    // remove non-breaking spaces from editor output
    return originalString?.replace(/\u00A0/g, ' ') || ''
  }

  /**
   * Before we save in the editor, we want to be sure the response is going to be correct
   * @param {import('../../schema/__generated__/schema.types').RemoteResource} resource
   * @param {string} expected
   * @deprecated
   */
  async clicksSave(resource, expected) {
    // ensure the saved result->response is correct
    const updated = Resources.updatedResource(resource, expected)
    await this.page.evaluate(mockResponses, {
      responses: {
        updateResource: updated,
      },
    })

    // actually save
    await this.$.editorSave().click()
    await this.page.pause()
    await this.mocks.waitForCallCount({ method: 'updateResource', count: 1 })
  }

  async savesWithReqAndRes() {
    const [req] = await Promise.all([
      this.page.waitForRequest((req) => {
        if (req.url().includes('specialPages/debugToolsPage')) {
          if (req.postDataJSON().method === 'updateResource') {
            return true
          }
        }
        return false
      }),
      await this.$.editorSave().click(),
    ])
    const requestJson = req.postDataJSON().params
    const resp = await req.response()
    const { result } = (await resp?.json()) || {}
    return { requestJson, responseJson: result }
  }

  /**
   * @param {string} id
   * @param {EditorLocator} editorLocator
   * @param {string} expectedValue
   * @return {Promise<void>}
   */
  async saves(id, editorLocator, expectedValue) {
    // actually save
    const { requestJson, responseJson } = await this.savesWithReqAndRes()

    expect(requestJson).toMatchObject({
      id,
      source: {
        debugTools: {
          content: expectedValue,
        },
      },
    })

    // return value was correct
    expect(responseJson.id).toEqual(id)
    expect(responseJson.current.contents).toEqual(expectedValue)

    // reflected to editor
    const currentValue = await this.readCurrentValue(editorLocator)
    expect(currentValue).toEqual(expectedValue)
  }

  /**
   * @param {EditorLocator} editorLocator
   * @param expected
   * @return {Promise<void>}
   */
  async stillHasEditedValue(editorLocator, expected = DEFAULT_EDIT_VALUE) {
    const actual = await this.readCurrentValue(editorLocator)
    expect(actual).toBe(expected)
  }

  async revertEditorContent() {
    await this.$.footer().locator(this.$.revertButton()).click()
  }
}

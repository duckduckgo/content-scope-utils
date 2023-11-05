import { expect } from '@playwright/test'
import { DEFAULT_EDIT_VALUE } from './debug-tools'

/**
 * @typedef {import('../../src/js/remote-resources/remote-resources.machine').EditorKind} EditorKind
 * @typedef {{editorKind: EditorKind; editorPath: string}} EditorLocator
 */

export class Editor {
  /**
   * @param {import("@playwright/test").Page} page
   * @param {import("./debug-tools").DebugToolsPage} debugToolsPage
   */
  constructor(page, debugToolsPage) {
    this.page = page
    this.debugToolsPage = debugToolsPage
    this.$ = new (class Selectors {
      editorSave = () => page.getByRole('button', { name: 'Save + Apply' })
      revertButton = () => page.getByRole('button', { name: 'Revert' })
      footer = () => page.getByTestId('Footer')
    })()
  }

  /**
   * @param {EditorLocator} editorLocator
   * @param {string} value
   */
  async setsEditorValue(editorLocator, value) {
    // this makes sure the JS is compiled/loaded
    const { page } = this
    const editor = this.editorLocator(editorLocator)
    if (this.debugToolsPage.globalConfig.editor === 'monaco') {
      await editor.click()
      await editor.press('Meta+KeyA')
      await editor.press('Delete')
      const modelPath = '/' + [editorLocator.editorKind, editorLocator.editorPath].join('/')
      await page.evaluate(
        ({ value, modelPath }) => {
          if (!window.__playwright_01) return
          if (!(modelPath in window.__playwright_01['models'])) {
            throw new Error('missing modelPath model' + modelPath)
          }
          window.__playwright_01['models'][modelPath].setValue(value)
        },
        { value, modelPath },
      )
    } else if (this.debugToolsPage.globalConfig.editor === 'simple') {
      await editor.waitFor()
      await editor.fill(value)
    }
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
   * @return {Promise<string>}
   */
  async readCurrentValue(editorLocator) {
    if (this.debugToolsPage.globalConfig.editor === 'monaco') {
      const originalString = await this.editorLocator(editorLocator).locator('.lines-content').textContent()
      // remove non-breaking spaces from editor output
      return originalString?.replace(/\u00A0/g, ' ') || ''
    } else if (this.debugToolsPage.globalConfig.editor === 'simple') {
      const originalString = await this.editorLocator(editorLocator).inputValue()
      return originalString || ''
    }
    throw new Error('todo implement readCurrentValue')
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
  async hasValue(editorLocator, expected = DEFAULT_EDIT_VALUE) {
    const actual = await this.readCurrentValue(editorLocator)
    expect(actual).toBe(expected)
  }

  async revertEditorContent() {
    await this.$.footer().locator(this.$.revertButton()).click()
  }
}

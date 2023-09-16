import { expect } from '@playwright/test'
import { DEFAULT_EDIT_VALUE } from './debug-tools'
import { mockResponses } from '@duckduckgo/content-scope-scripts/packages/messaging/lib/test-utils.mjs'
import { Resources } from './resources'

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
        const editor = window._test_editor_value()
        const match = editor === value
        return match
      },
      { value },
      { timeout: 5000 },
    )
  }

  /**
   *
   */
  async setsEditorValueTo(value = DEFAULT_EDIT_VALUE) {
    // this makes sure the JS is compiled/loaded
    await this.page.evaluate(({ value }) => window._test_editor_set_value(value), { value })
  }

  /**
   * Before we save in the editor, we want to be sure the response is going to be correct
   */
  async clicksSave() {
    // ensure the saved result->response is correct
    const string = await this.page.evaluate(() => window._test_editor_value())
    const resource = Resources.updatedResource(this.resources.remoteResources.privacyConfig(), string)

    await this.page.evaluate(mockResponses, {
      responses: {
        updateResource: resource,
      },
    })

    // actually save
    await this.$.editorSave().click()
    await this.mocks.waitForCallCount({ method: 'updateResource', count: 1 })
  }

  async saves(id = 'privacy-configuration', expected = DEFAULT_EDIT_VALUE) {
    await this.clicksSave()
    const calls = await this.mocks.waitForCallCount({ method: 'updateResource', count: 1 })
    expect(calls[0].payload.params).toMatchObject({
      id,
      source: {
        debugTools: {
          content: expected,
        },
      },
    })
    await this.waitForEditorToHaveValue(expected)
  }

  async stillHasEditedValue(expected = DEFAULT_EDIT_VALUE) {
    const actual = await this.values.editorValue()
    expect(actual).toBe(expected)
  }

  async revertEditorContent() {
    await this.$.footer().locator(this.$.revertButton()).click()
  }
}

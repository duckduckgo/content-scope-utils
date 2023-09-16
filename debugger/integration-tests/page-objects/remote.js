import { expect } from '@playwright/test'

export class Remote {
  /**
   * @param {import("@playwright/test").Page} page
   * @param {import("./mocks").Mocks} mocks
   * @param {import("./editor").Editor} editor
   */
  constructor(page, mocks, editor) {
    this.page = page
    this.mocks = mocks
    this.editor = editor

    this.$ = new (class Selectors {
      remoteFormInput = () => page.getByPlaceholder('enter a url')
      remoteFormRefresh = () => page.getByRole('button', { name: 'Refresh 🔄' })
      remoteFormOverride = () => page.getByRole('button', { name: 'Override ✏️' })
      remoteFormCopy = () => page.getByRole('button', { name: 'Copy 📄' })
      remoteFormSave = () => page.getByRole('button', { name: 'Save', exact: true })
    })()
  }

  async clickToOverride() {
    await this.$.remoteFormOverride().click()
  }

  async overrideRemoteUrl() {
    await this.clickToOverride()
    await this.$.remoteFormCopy().click()
    await this.$.remoteFormInput().fill('https://example.com/override.json')
  }

  async submitRemoteUrlForm() {
    await this.$.remoteFormSave().click()
  }

  async refreshedRemote() {
    const calls = await this.mocks.waitForCallCount({ method: 'updateResource', count: 1 })
    expect(calls[0].payload.params).toMatchObject({
      id: 'privacy-configuration',
      source: {
        remote: {
          url: 'https://example.com/macos-config.json', // <-- this is the same as the current!
        },
      },
    })
    const expected = '{\n    "updated": true\n}'
    await this.editor.waitForEditorToHaveValue(expected)
  }

  async savedNewRemoteUrl() {
    const calls = await this.mocks.waitForCallCount({ method: 'updateResource', count: 1 })
    expect(calls[0].payload.params).toMatchObject({
      id: 'privacy-configuration',
      source: {
        remote: {
          url: 'https://example.com/override.json',
        },
      },
    })
    const expected = '{\n    "updated": true\n}'
    await this.editor.waitForEditorToHaveValue(expected)
  }

  async refreshesCurrentResource() {
    await this.$.remoteFormRefresh().click()
  }
}

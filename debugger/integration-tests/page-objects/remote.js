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

  async overrideRemoteUrl(url = 'https://example.com/override.json') {
    await this.clickToOverride()
    await this.$.remoteFormCopy().click()
    await this.$.remoteFormInput().fill(url)
  }

  async submitRemoteUrlForm() {
    await this.$.remoteFormSave().click()
  }

  /**
   * @param {string} minutesSeconds
   * @return {Promise<void>}
   */
  async refreshedRemote(minutesSeconds) {
    const calls = await this.mocks.waitForCallCount({ method: 'updateResource', count: 1 })
    expect(calls[0].payload.params).toMatchObject({
      id: 'privacy-configuration',
      source: {
        remote: {
          url: 'https://example.com/macos-config.json', // <-- this is the same as the current!
        },
      },
    })
    await this.page.getByTestId('last-fetched-date').getByText(minutesSeconds).waitFor()
  }

  async savedNewRemoteUrl(override) {
    const calls = await this.mocks.waitForCallCount({ method: 'updateResource', count: 1 })
    expect(calls[0].payload.params).toMatchObject({
      id: 'privacy-configuration',
      source: {
        remote: {
          url: override,
        },
      },
    })
  }

  async refreshesCurrentResource() {
    await this.$.remoteFormRefresh().click()
  }
}

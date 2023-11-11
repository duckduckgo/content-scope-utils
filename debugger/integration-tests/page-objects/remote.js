import { expect } from '@playwright/test'
import { remoteResourceSchema } from '../../schema/__generated__/schema.parsers.mjs'
import invariant from 'tiny-invariant'
import { date } from '../../src/js/lib'

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
      remoteUrl = () => page.getByTestId('remote-resource-state.remote-url')
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
   * @param {object} params
   * @param {string} params.id
   * @return {Promise<void>}
   */
  async refreshesRemote(params) {
    const originalUrl = (await this.$.remoteUrl().textContent())?.trim()

    // prettier-ignore
    const [req] = await Promise.all([
      this.waitForUpdate(),
      this.$.remoteFormRefresh().click()
    ])

    // check the out-going message
    const requestJson = req.postDataJSON().params
    expect(requestJson).toMatchObject({
      id: params.id,
      source: {
        remote: {
          url: originalUrl, // <-- this is the same as captured from the page.
        },
      },
    })

    // check the response
    const resp = await req.response()
    const { result } = (await resp?.json()) || {}
    const parsed = remoteResourceSchema.parse(result)
    invariant('remote' in parsed.current.source)

    // check in the page
    const asDisplayDate = date(parsed.current.source.remote.fetchedAt)
    await this.page.getByTestId('last-fetched-date').getByText(asDisplayDate).waitFor()
  }

  /**
   * @param {object} params
   * @param {string} params.id
   * @param {string} params.url
   * @return {Promise<void>}
   */
  async savedNewRemoteUrl(params) {
    // prettier-ignore
    const [req] = await Promise.all([
      this.waitForUpdate(),
      this.$.remoteFormSave().click()
    ])

    // check the out-going message
    const requestJson = req.postDataJSON().params
    expect(requestJson).toMatchObject({
      id: params.id,
      source: {
        remote: {
          url: params.url, // <-- this is the same as captured from the page.
        },
      },
    })

    // UI updates
    await this.page.getByText('CURRENT OVERRIDE:').waitFor()
    await this.page.getByText(params.url).waitFor()
  }

  waitForUpdate() {
    return this.page.waitForRequest((req) => {
      if (req.url().includes('specialPages/debugToolsPage')) {
        if (req.postDataJSON().method === 'updateResource') {
          return true
        }
      }
      return false
    })
  }

  async opensResourceInNewTab({ id }) {
    await this.page
      .locator('a')
      .filter({ hasText: new RegExp('rr/' + id), hasNotText: 'localhost' })
      .nth(0)
      .click()
    const page1Promise = this.page.waitForEvent('popup')
    await page1Promise
    const v = (await page1Promise).url()
    expect(v).toContain(id)
  }

  async opensExtraInfo() {
    await this.page.getByRole('button', { name: 'Info' }).click()
  }
}

import { forwardConsole, withMockedWebkitHandlers } from './webkit.js'

/**
 * This represents "examples/bundled/index.html"
 */
export class BundledExamplePage {
  /**
   * @param {import("playwright-core").Page} page
   */
  constructor(page) {
    this.page = page
    forwardConsole(page)
  }

  /**
   * @param {import("../../lib/messaging/webkit.js").WebkitMessagingConfig} config
   */
  async withInjectedConfig(config) {
    const params = new URLSearchParams()
    params.set('injected', JSON.stringify(config))
    await this.page.goto('/?' + params.toString())
  }

  /**
   * @param {Record<string, any>} mocks
   * @returns {Promise<void>}
   */
  async withMocks(mocks) {
    await withMockedWebkitHandlers(this.page, mocks)
  }

  /**
   * @returns {Promise<unknown[]>}
   */
  async getPageOutputs() {
    return await this.page.evaluate(() => {
      const outputs = []
      const elements = document.querySelectorAll('code')
      for (let element of elements) {
        const json = JSON.parse(element?.textContent || '{}')
        outputs.push(json)
      }
      return outputs
    })
  }
}

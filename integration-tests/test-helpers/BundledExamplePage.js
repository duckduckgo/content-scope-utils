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
   * @param {Record<string, any>} config
   */
  async withInjectedConfig(config) {
    const params = new URLSearchParams()
    params.set('injected', JSON.stringify(config))
    await this.page.goto('/?' + params.toString())
  }

  /**
   * @param {"webkit" | "windows"} kind
   * @param {Record<string, any>} mocks
   * @returns {Promise<void>}
   */
  async withMocks(kind, mocks) {
    switch (kind) {
      case 'webkit':
        await withMockedWebkitHandlers(this.page, mocks)
        break
      case 'windows':
        throw new Error('unreachable, windows mocks not added yet.')
    }
  }

  /**
   * @returns {Promise<unknown[]>}
   */
  async getPageOutputs() {
    return await this.page.evaluate(() => {
      const outputs = []
      const elements = document.querySelectorAll('code')
      console.log('👋 code elements found:', elements.length)
      for (let element of elements) {
        const json = JSON.parse(element?.textContent || '{}')
        outputs.push(json)
      }
      return outputs
    })
  }
}

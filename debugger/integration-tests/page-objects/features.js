import { expect } from '@playwright/test'

export class Features {
  /**
   * @param {import("@playwright/test").Page} page
   */
  constructor(page) {
    this.page = page
    this.$ = new (class Selectors {
      loaded = () => page.locator('[data-loaded="true"]')
      featureToggle = (named) => page.getByLabel(`toggle ${named} globally`)
      domainExceptionAddButton = () => page.getByRole('button', { name: 'Add a domain' })
      domainExceptionInput = () => page.getByPlaceholder('enter a domain')
      domainExceptionUpdate = () => page.getByTestId('DomainForm').getByRole('button', { name: 'Save' })
      /**
       * @param {string} featureName
       * @param {string} domain
       */
      domainExceptionsAddForFeature = (featureName, domain) => page.getByLabel(`toggle ${featureName} for ${domain}`)
      domainExceptionContainer = () => page.getByTestId('DomainForm')
      domainExceptionEdit = () => page.getByRole('button', { name: 'Edit' })
      domainExceptionNew = () => page.getByRole('button', { name: 'New' })
      tabSelector = () => page.locator('[name="tab-select"]')
      singleTabButton = () => page.getByLabel('Use open tab domain:')
      domainFormShowing = () => page.getByTestId('DomainForm.showing')
    })()
  }

  /**
   * @param {string} featureName
   */
  async toggleGlobally(featureName) {
    // toggle inside the 'global part'
    const element = this.$.featureToggle(featureName)

    // control -> ensure we're testing what we think
    expect(await element.isChecked()).toBe(true)

    // now perform the toggle
    await element.click()

    // ensure the local state is updated, this is just a sanity check
    expect(await element.isChecked()).toBe(false)
  }

  /**
   * @returns {Promise<void>}
   */
  async canToggle(feature = 'adClickAttribution') {
    await this.$.loaded().waitFor()
    await this.$.featureToggle(feature).waitFor()
  }

  /**
   * @param {string | Record<string, any>} contents
   * @param {string} featureName
   */
  featureWasDisabledGlobally(contents, featureName) {
    const json = typeof contents === 'string' ? JSON.parse(contents) : contents
    expect(json.features[featureName].state).toBe('disabled')
  }

  featureHasUpdatedHash(contents, featureName) {
    const json = typeof contents === 'string' ? JSON.parse(contents) : contents
    expect(typeof json.features[featureName].hash).toBe('string')
    expect(json.features[featureName].hash.length).toBeGreaterThan(3)
    expect(json.features[featureName].hash).not.toBe('abc')
  }

  /**
   * @param {object} params
   * @param {string} params.feature
   * @param {string} params.forDomain
   */
  async toggles(params) {
    const { feature, forDomain: domain } = params
    await this.$.domainExceptionInput().fill(domain)
    await this.$.domainExceptionUpdate().click()

    // now click the toggle for this feature
    await this.$.domainExceptionsAddForFeature(feature, domain).click()
  }

  /**
   * @param {string} contents
   * @param {string} featureName
   * @param {string} domain
   */
  featureWasDisabledForDomain(contents, featureName, domain) {
    const json = typeof contents === 'string' ? JSON.parse(contents) : contents
    const exception = json.features[featureName].exceptions.find((x) => x.domain === domain)
    expect(exception.reason).toBe('debug tools')
  }

  async addFirstDomain() {
    await this.$.domainExceptionAddButton().click()
  }

  /**
   * @param {string} domain
   */
  async selectTab(domain) {
    await this.$.tabSelector().selectOption(domain)
  }

  async chooseTheOnlyOpenTab() {
    await this.$.singleTabButton().click()
  }

  /**
   * @param {string} domain
   */
  async activeDomainIsStoredInUrl(domain) {
    await this.page.waitForFunction(
      ({ expected }) => {
        const hash = new URL(window.location.href).hash
        const [, search] = hash.split('?')
        const params = new URLSearchParams(search)
        const currentDomain = params.get('currentDomain')
        return currentDomain === expected
      },
      { expected: domain },
    )
  }

  /**
   * @param {string} domain
   */
  async hasActiveDomain(domain) {
    await this.$.domainFormShowing().filter({ hasText: domain }).waitFor({ timeout: 5000 })
  }

  /**
   * @param {object} params
   * @param {string} params.from
   * @param {string} params.to
   */
  async editCurrentDomain({ from, to }) {
    await this.$.domainExceptionEdit().click()
    expect(await this.$.domainExceptionInput().inputValue()).toBe(from)
    await this.$.domainExceptionInput().fill(to)
    await this.$.domainExceptionUpdate().click()
  }

  /**
   * @param {string} domain
   */
  async addNewDomain(domain) {
    await this.$.domainExceptionNew().click()
    expect(await this.$.domainExceptionInput().inputValue()).toBe('')
    await this.$.domainExceptionInput().fill(domain)
    await this.$.domainExceptionUpdate().click()
  }

  async showsEmptyDomainsState() {
    const text = await this.$.domainExceptionContainer().textContent()
    expect(text).toContain('CURRENT DOMAIN:NONE')
  }
}

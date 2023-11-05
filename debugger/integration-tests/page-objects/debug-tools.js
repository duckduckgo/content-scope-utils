import { expect } from '@playwright/test'
import { Mocks } from './mocks.js'
import {
  mockErrors,
  mockResponses,
  simulateSubscriptionMessage,
} from '@duckduckgo/content-scope-scripts/packages/messaging/lib/test-utils.mjs'
import {
  perPlatform,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Build,
} from '@duckduckgo/content-scope-scripts/integration-test/playwright/type-helpers.mjs'
import invariant from 'tiny-invariant'
import { Features } from './features'
import { Remote } from './remote'
import { Editor } from './editor'
import { Resources } from './resources'

export const DEFAULT_EDIT_VALUE = '{ "foo": "baz" }'
export const DEFAULT_UPDATE_VALUE = '{ "updated": true }'

/**
 * @typedef {import('../../src/js/remote-resources/remote-resources.machine').EditorKind} EditorKind
 * @typedef {import('../../schema/__generated__/schema.types').GetFeaturesResponse} GetFeaturesResponse
 * @typedef {import('../../schema/__generated__/schema.types').GetTabsResponse} GetTabsResponse
 * @typedef {import('../../schema/__generated__/schema.types').RemoteResource} RemoteResource
 * @typedef {import('../../src/js/global-config.mjs').GlobalConfig} GlobalConfig
 */

export class DebugToolsPage {
  /**
   * @param {import("@playwright/test").Page} page
   * @param {string} baseURL
   * @param {GlobalConfig['injectName']} injectName
   * @param {GlobalConfig['transport']} transport
   * @param {Build | null} build
   */
  constructor(page, baseURL, injectName, transport, build) {
    this.page = page
    this.injectName = injectName
    this.baseURL = baseURL
    this.resources = new Resources(this.page)

    this.mocks = new Mocks(page, this.resources, build, {
      context: 'specialPages',
      featureName: 'debugToolsPage',
      env: 'development',
    })

    this.mocks.withDefaultResponses()

    // sub-testing modules
    this.editor = new Editor(this.page, this.mocks, this.resources)
    this.features = new Features(this.page)
    this.remote = new Remote(this.page, this.mocks, this.editor)

    /** @type {import("../../src/js/global-config.mjs").GlobalConfig} */
    this.globalConfig = {
      editor: 'monaco',
      transport: transport,
      injectName: injectName,
      editorSaveTimeout: 0,
      debugMessaging: 'silent',
    }

    this.$ = new (class Selectors {
      revertButton = () => page.getByRole('button', { name: 'Revert' })
      popupErrors = () => page.getByTestId('FloatingErrors')
      errorDismiss = () => page.getByRole('button', { name: '↩️ Dismiss' })
      diffEditorModified = () => page.locator('.editor.modified')
      inlineMonacoEditor = () => page.locator('.monaco-editor')
      simpleEditor = () => page.locator('textarea[name="simple-editor"]')
      inlineEditorButton = () => page.getByRole('button', { name: 'Inline' })
      togglesButton = () => page.getByRole('button', { name: 'Toggles' })
      diffEditorButton = () => page.getByRole('button', { name: 'Diff', exact: true })
      togglesEditor = () => page.getByTestId('TogglesEditor')
    })()

    page.on('console', (msg) => {
      if (msg.text().includes('Download the React DevTools')) {
        return
      }
      switch (msg.type()) {
        case 'error':
          return console.error('🌐❌ console.%s', msg.type(), msg.text())
        case 'warn':
          return console.warn('🌐⚠️ console.%s', msg.type(), msg.text())
        case 'log':
          return console.log('🌐ℹ️️ console.%s', msg.type(), msg.text())
        default:
          return console.log('🌐 console.%s', msg.type(), msg.text())
      }
    })
  }

  /**
   * This ensures we can choose when to apply mocks based on the platform
   * @param {URLSearchParams} urlParams
   * @param {string} [pathname] optional starting path
   * @return {Promise<void>}
   */
  async openPage(urlParams, pathname) {
    const url = new URL(this.basePath, this.baseURL)

    // assign global config elements
    for (let [key, value] of Object.entries(this.globalConfig)) {
      url.searchParams.append(key, String(value))
    }
    url.hash = pathname + '?' + urlParams.toString()
    await this.page.goto(url.href)
  }

  /**
   * Used later if/when we might want to simulate fetching remote config
   * @return {Promise<void>}
   */
  async installRemoteMocks() {
    // default: https://staticcdn.duckduckgo.com/trackerblocking/config/v2/macos-config.json
    await this.page.route('https://example.com/**', (route, req) => {
      const url = new URL(req.url())
      if (url.pathname === '/override.json') {
        return route.fulfill({
          status: 200,
          json: {},
        })
      }
      return route.continue()
    })
  }

  /**
   * @param {import('../../schema/__generated__/schema.types').GetTabsResponse} params
   */
  async receivesNewTabs(params) {
    await this.page.evaluate(simulateSubscriptionMessage, {
      messagingContext: {
        context: 'specialPages',
        featureName: 'debugToolsPage',
        env: 'development',
      },
      name: 'onTabsUpdated',
      payload: params,
      injectName: this.injectName,
    })
  }

  /**
   * @param {object} params
   * @param {string} params.id
   * @returns {Promise<void>}
   */
  async openRemoteResourceEditor({ id }) {
    const params = new URLSearchParams({})
    if (id) {
      await this.openPage(params, '/remoteResources/' + id)
    } else {
      await this.openPage(params, '/remoteResources')
    }
  }

  /**
   * @param {object} [params]
   * @param {string} [params.currentDomain]
   */
  async openWithSearchParams(params) {
    const hashParams = new URLSearchParams({
      editorKind: 'toggles',
      ...params,
    })
    await this.openPage(hashParams, '/remoteResources')
  }

  async savedWithValue() {
    const calls = await this.mocks.waitForCallCount({ method: 'updateResource', count: 1 })
    expect(calls.length).toBe(1)
    return calls[0].payload.params
  }

  /**
   * @param {string} msg
   */
  async showsErrorText(msg) {
    await this.page.getByText(msg).waitFor()
  }

  async dismissesError() {
    await this.$.errorDismiss().click()
  }

  async errorWasDismissed() {
    const matches = await this.$.errorDismiss().count()
    expect(matches).toBe(0)
  }

  /**
   * @param {object} params
   * @param {string} params.method
   * @param {string} params.message
   */
  async willReceiveError(params) {
    const { method, message } = params
    await this.page.evaluate(mockErrors, {
      errors: {
        [method]: {
          message,
        },
      },
    })
  }

  /**
   * We test the fully built artifacts, so for each test run we need to
   * select the correct HTML file.
   * @return {string}
   */
  get basePath() {
    return 'index.html'
  }

  /**
   * @param {import("@playwright/test").Page} page
   * @param {string|undefined} baseURL
   * @param {import("@playwright/test").TestInfo} testInfo
   * @param {GlobalConfig['transport']} transport
   */
  static async create(page, baseURL, testInfo, transport = 'http') {
    invariant(typeof baseURL === 'string', 'baseURL must be a string')
    // Read the configuration object to determine which platform we're testing against
    // @ts-ignore
    const injectName = testInfo.project.use.injectName
    let instance

    // http doesn't include a 'build'
    if (transport === 'http') {
      instance = new DebugToolsPage(page, baseURL, injectName, transport, null)
    } else {
      const { build } = perPlatform(testInfo.project.use)
      instance = new DebugToolsPage(page, baseURL, injectName, transport, build)
    }

    // attachments
    await testInfo.attach('globalConfig', {
      body: JSON.stringify(instance.globalConfig, null, 2),
      contentType: 'application/json',
    })

    return instance
  }

  /**
   * @param {EditorKind} kind
   * @return {Promise<void>}
   */
  // eslint-disable-next-line require-await
  async switchesTo(kind) {
    if (kind === 'diff') {
      await this.$.diffEditorButton().click()
      await this.$.diffEditorModified().waitFor()
    } else if (kind === 'inline') {
      await this.$.inlineEditorButton().click()
      if (this.globalConfig.editor === 'simple') {
        await this.$.simpleEditor().waitFor()
      } else {
        await this.$.inlineMonacoEditor().waitFor()
      }
    } else if (kind === 'toggles') {
      await this.$.togglesButton().click()
      await this.$.togglesEditor().waitFor()
    }
  }

  /**
   * @param {GetTabsResponse} params
   */
  async withTabsResponse(params) {
    await this.page.addInitScript(mockResponses, {
      responses: {
        getTabs: params,
      },
    })
  }

  async withEditedPrivacyConfig(params) {
    const jsonString = JSON.stringify(params, null, 2)

    /** @type {RemoteResource} */
    const resource = Resources.updatedResource(this.resources.remoteResources.privacyConfig(), jsonString)

    /** @type {GetFeaturesResponse} */
    const getFeatures = {
      features: {
        remoteResources: {
          resources: [resource],
        },
      },
    }

    await this.page.addInitScript(mockResponses, {
      responses: {
        getFeatures,
        getRemoteResource: resource,
      },
    })
  }

  /**
   * @param {RemoteResource} resource
   */
  async withPrivacyConfig(resource) {
    /** @type {GetFeaturesResponse} */
    const getFeatures = {
      features: {
        remoteResources: {
          resources: [resource],
        },
      },
    }

    await this.page.addInitScript(mockResponses, {
      responses: {
        getFeatures,
        getRemoteResource: resource,
      },
    })
  }

  /**
   * @param {RemoteResource} resource
   */
  async withTestResources(resource) {
    /** @type {GetFeaturesResponse} */
    const getFeatures = {
      features: {
        remoteResources: {
          resources: [resource],
        },
      },
    }

    await this.page.addInitScript(mockResponses, {
      responses: {
        getFeatures,
        getRemoteResource: resource,
      },
    })
  }

  async enabled() {
    await this.installRemoteMocks()
    await this.mocks.install()
  }

  async revertsErrorFromPopup() {
    await this.$.popupErrors().locator(this.$.revertButton()).click()
  }

  /**
   * @param {Partial<import("../../src/js/global-config.mjs").GlobalConfig>} globalConfig
   */
  async withGlobalConfig(globalConfig) {
    this.globalConfig = {
      ...this.globalConfig,
      ...globalConfig,
    }
  }

  async waitForMemorySave() {
    const { page } = this
    await page.waitForTimeout(500)
  }
}

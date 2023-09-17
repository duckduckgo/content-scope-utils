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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  PlatformInfo,
} from '@duckduckgo/content-scope-scripts/integration-test/playwright/type-helpers.mjs'
import invariant from 'tiny-invariant'
import { Features } from './features'
import { Remote } from './remote'
import { Editor } from './editor'
import { Resources } from './resources'
import { Patches } from './patches'

export const DEFAULT_BASE_VALUE = '{ "foo": "bar" }'
export const DEFAULT_EDIT_VALUE = '{ "foo": "baz" }'

/**
 * @typedef {import('../../src/js/remote-resources/remote-resources.machine').EditorKind} EditorKind
 * @typedef {import('../../schema/__generated__/schema.types').GetFeaturesResponse} GetFeaturesResponse
 * @typedef {import('../../schema/__generated__/schema.types').GetTabsResponse} GetTabsResponse
 * @typedef {import('../../schema/__generated__/schema.types').RemoteResource} RemoteResource
 */

export class DebugToolsPage {
  /**
   * @param {import("@playwright/test").Page} page
   * @param {string} baseURL
   * @param {Build} build
   * @param {PlatformInfo} platform
   */
  constructor(page, baseURL, build, platform) {
    this.page = page
    this.build = build
    this.baseURL = baseURL
    this.platform = platform
    this.mocks = new Mocks(page, build, platform, {
      context: 'specialPages',
      featureName: 'debugToolsPage',
      env: 'development',
    })

    // sub-testing modules
    this.resources = new Resources(this.page)
    this.editor = new Editor(this.page, this.mocks, this.resources)
    this.features = new Features(this.page)
    this.remote = new Remote(this.page, this.mocks, this.editor)
    this.patches = new Patches(this.page, this.editor)

    /** @type {import("../../src/js/global-config").GlobalConfig} */
    this.globalConfig = {
      editor: 'monaco',
      platform: this.build.name,
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
      patchesButton = () => page.getByRole('button', { name: 'Patches' })
      diffEditorButton = () => page.getByRole('button', { name: 'Diff', exact: true })
      togglesEditor = () => page.getByTestId('TogglesEditor')
      patchesScreen = () => page.getByTestId('PatchesEditor')
    })()

    // default mocks - just enough to render the first page without error
    /** @type {RemoteResource} */
    const resource = this.resources.remoteResources.privacyConfig()
    /** @type {RemoteResource} */
    const updatedResource = Resources.updatedResource(resource)

    /** @type {GetFeaturesResponse} */
    const getFeatures = {
      features: {
        remoteResources: {
          resources: [resource],
        },
      },
    }

    /** @type {GetTabsResponse} */
    const getTabs = {
      tabs: [],
    }

    this.mocks.defaultResponses({
      getFeatures,
      getTabs,
      getRemoteResource: resource,
      updateResource: updatedResource,
    })

    page.on('console', (msg) => {
      console.log(msg.type(), msg.text())
    })
  }

  /**
   * This ensures we can choose when to apply mocks based on the platform
   * @param {URLSearchParams} urlParams
   * @param {string} [pathname] optional starting path
   * @return {Promise<void>}
   */
  async openPage(urlParams, pathname = '/remoteResources') {
    const url = new URL(this.basePath, this.baseURL)

    // assign global config elements
    for (let [key, value] of Object.entries(this.globalConfig)) {
      url.searchParams.append(key, value)
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
      injectName: this.build.name,
    })
  }

  /**
   * @returns {Promise<void>}
   */
  async openRemoteResourceEditor() {
    const params = new URLSearchParams({})
    await this.openPage(params)
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
    await this.openPage(hashParams)
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
    return this.build.switch({
      windows: () => 'dist/index.html',
      apple: () => 'dist/index.html',
    })
  }

  /**
   * @param {import("@playwright/test").Page} page
   * @param {string|undefined} baseURL
   * @param {import("@playwright/test").TestInfo} testInfo
   */
  static create(page, baseURL, testInfo) {
    // Read the configuration object to determine which platform we're testing against
    const { platformInfo, build } = perPlatform(testInfo.project.use)
    invariant(baseURL, 'cannot continue without baseURL')
    return new DebugToolsPage(page, baseURL, build, platformInfo)
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
    } else if (kind === 'patches') {
      await this.$.patchesButton().click()
      await this.$.patchesScreen().waitFor()
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
   * @param {Record<string, any>} params
   */
  async withPrivacyConfig(params) {
    const jsonString = JSON.stringify(params, null, 2)

    /** @type {RemoteResource} */
    const resource = this.resources.remoteResources.privacyConfig(jsonString)

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

  async withTestResources(resource = this.resources.remoteResources.testResource()) {
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
   * @param {Partial<import("../../src/js/global-config.js").GlobalConfig>} globalConfig
   */
  async withGlobalConfig(globalConfig) {
    this.globalConfig = {
      ...this.globalConfig,
      ...globalConfig,
    }
  }
}

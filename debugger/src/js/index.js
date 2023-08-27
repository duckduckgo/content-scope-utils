/**
 * @module Debug Tools
 *
 * @description
 *
 * A JavaScript application that provides common debugging utilities for DuckDuckGo Browsers
 *
 * To get started, check the required messages that need implementing:
 *
 * - {@link "Debug Tools Messaging"}
 *
 */
import { DebugToolsMessages, GlobalContext } from './DebugToolsMessages.mjs'
import { createSpecialPagesMessaging } from './create-messaging'
import { createRoot } from 'react-dom/client'
import { inspect } from '@xstate/inspect'
import { appMachine } from './app/app.machine'
import { MockImpl } from './mock-transport'
import { App, AppMachineContext } from './app/components/app'
import { createHashHistory } from 'history'

const params = new URLSearchParams(window.location.search)
/**
 * xstate debugging - add the `?inspect` param
 */
if (params.has('inspect')) {
  inspect({
    iframe: false,
  })
}

if (!params.has('platform')) {
  console.warn('platform missing from URL Search Params', 'defaulting to apple')
}

const injectName = /** @type {any} */ (params.get('platform') || 'apple')

/**
 * Global Setup for Monaco
 */
// @ts-ignore
// eslint-disable-next-line no-undef
globalThis.MonacoEnvironment = {
  getWorkerUrl: function (moduleId, label) {
    if (label === 'json') {
      return './js/editor/json.js'
    }
    return './js/editor/editor.js'
  },
}

/**
 * Communications
 */
const messagingInstance = createSpecialPagesMessaging({
  injectName: injectName,
  env: import.meta.env,
  featureName: 'debugToolsPage',
  mockImpl: () => new MockImpl(),
})
const messages = new DebugToolsMessages(messagingInstance)

/**
 * History instance for navigation
 */
const history = createHashHistory(window)

/**
 * Setup global state
 */
const withContext = appMachine.withContext({
  error: null,
  features: null,
  feature: null,
  messages,
  search: new URLSearchParams(),
  history,
  preModules: [],
  currentModule: null,
  /**
   * @param featureName
   * @return {Promise<import('./types').FeatureModuleDescription>}
   */
  preLoader: async (featureName) => {
    try {
      const featureModule = await import(`./features/${featureName}.feature.js`)
      if ('feature' in featureModule) {
        return featureModule.feature
      }
    } catch (e) {
      console.error('could not match a feature name to a module...', featureName)
    }
    throw new Error('unreachable - should fallback to notFound')
  },
  /**
   * @param segment
   * @return {Promise<import('./types').Feature>}
   */
  loader: async (segment) => {
    try {
      const featureModule = await import(`./features/${segment}.feature.js`)
      if ('feature' in featureModule) {
        const page = await featureModule.feature.loader()
        return {
          page,
          title: featureModule.feature.title,
          pathname: '/' + segment,
        }
      }
    } catch (e) {
      // console.log('error', e)
      const notFound = await import(`./features/notFound.feature.js`)
      const page = await notFound.feature.loader()
      return {
        page,
        title: notFound.feature.title,
        pathname: '/notFound',
      }
    }
    throw new Error('unreachable - should fallback to notFound')
  },
})

/**
 * Now try to render
 */
const appNode = document.querySelector('#app')
const root = createRoot(appNode)

root.render(
  <GlobalContext.Provider value={{ messages, history }}>
    <AppMachineContext.Provider machine={withContext}>
      <App />
    </AppMachineContext.Provider>
  </GlobalContext.Provider>,
)

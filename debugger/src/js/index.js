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
import { TextModelContext } from './models/text-model'

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
        /** @type {import('./types').FeatureModuleDescription} */
        const output = {
          title: featureModule.feature.title,
          order: featureModule.feature.order,
        }
        return output
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

;(async () => {
  const useRichEditor = !params.has('simple')
  const model = useRichEditor ? 'monaco-opt-in.js' : 'text-model.js'
  const { createTextModel } = await import(`./models/${model}`)

  /**
   * Now try to render
   */
  const appNode = document.querySelector('#app')
  const root = createRoot(appNode)

  root.render(
    <TextModelContext.Provider value={{ createTextModel, editorType: useRichEditor ? 'monaco' : 'web' }}>
      <GlobalContext.Provider value={{ messages, history }}>
        <AppMachineContext.Provider machine={withContext}>
          <App />
        </AppMachineContext.Provider>
      </GlobalContext.Provider>
    </TextModelContext.Provider>,
  )
})()

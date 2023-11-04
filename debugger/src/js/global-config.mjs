import z from 'zod'
import { HttpImpl } from './http-transport'
import { DebugToolsMessages } from './DebugToolsMessages.mjs'
import { createSpecialPagesMessaging } from './create-messaging.js'
import { MockImpl } from './mock-transport.js'

export const GlobalConfig = z.object({
  editor: z.enum(['simple', 'monaco']).default('monaco'),
  injectName: z.string().default('apple'),
  editorSaveTimeout: z
    .number({
      description: 'how long to debounce changes before persisting',
      required_error: 'editorSaveTimeout was missing',
      invalid_type_error: 'editorSaveTimeout must be a number',
      coerce: true,
    })
    .default(500),
  transport: z
    .enum(['http', 'native'])
    .default('http')
    .catch((ctx) => {
      console.warn('DEFAULT used for `transport`: ', 'http')
      console.warn(ctx.error)
      return 'http'
    }),
  debugMessaging: z
    .enum(['silent', 'verbose'])
    .default('silent')
    .catch((ctx) => {
      console.warn('DEFAULT used for `debugMessaging`: ', 'silent')
      console.warn(ctx.error)
      return 'silent'
    }),
})

/**
 * @typedef {import("zod").infer<typeof GlobalConfig>} GlobalConfig
 * @typedef {import("@duckduckgo/content-scope-scripts/packages/messaging/index.js").Messaging} Messaging
 * @typedef {import("@duckduckgo/content-scope-scripts/packages/messaging/index.js").MessagingContext} MessagingContext
 */

/**
 * @param {GlobalConfig} globalConfig
 */
export function configAwareFactory(globalConfig) {
  return {
    /**
     * Ret
     * @return {Promise<(...args: any[]) => import("./models/text-model").TextModel>}
     */
    async createTextModelFactory() {
      const model = globalConfig.editor === 'simple' ? 'text-model.js' : 'monaco-opt-in.js'
      const { createTextModel } = await import(`./models/${model}`)
      return createTextModel
    },
    /**
     * @return {DebugToolsMessages}
     */
    createDebugMessages() {
      /**
       * create the per-platform comms
       */
      const messagingInstance = createSpecialPagesMessaging({
        injectName: /** @type {any} */ (globalConfig.injectName),
        env: import.meta.env,
        transport: globalConfig.transport,
        featureName: 'debugToolsPage',
        mockImpl: () => new MockImpl(),
        httpImpl: (ctx) =>
          new HttpImpl(ctx, {
            debug: globalConfig.debugMessaging === 'verbose',
          }),
      })

      /**
       * Optionally wrap it in a proxy
       */
      return globalConfig.debugMessaging === 'verbose'
        ? createDebugProxy(new DebugToolsMessages(messagingInstance))
        : new DebugToolsMessages(messagingInstance)
    },
  }
}

function createDebugProxy(instance) {
  return new Proxy(instance, {
    get(target, propKey, receiver) {
      if (typeof propKey !== 'string') return Reflect.get(target, propKey, receiver)
      const origMethod = target[propKey]

      // Check if it's a function (ignoring properties)
      if (typeof origMethod === 'function') {
        return function (...args) {
          console.log(`Called: ${propKey} with arguments:`, args)
          // Call the original method using Reflect
          return Reflect.apply(origMethod, target, args)
        }
      }

      // Handle properties by simply returning them
      return Reflect.get(target, propKey, receiver)
    },
  })
}

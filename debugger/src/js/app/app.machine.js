import { assign, createMachine, pure, raise } from 'xstate'
import { getFeaturesResponseSchema } from '../../../schema/__generated__/schema.parsers.mjs'
import * as z from 'zod'

export const appMachine = createMachine(
  {
    id: 'Panel Open',
    initial: 'Initial state',
    context: /** @type {import('./app.machine.types').AppMachineCtx} */ ({}),
    invoke: {
      src: 'internalNavListener',
      id: 'history',
    },
    on: {
      NAV_INTERNAL: {
        actions: ['handleInternalNavResult'],
      },
    },
    states: {
      'Initial state': {
        invoke: {
          src: 'getFeatures',
          onDone: [
            {
              target: 'waiting for nav',
              actions: 'assignFeatures',
            },
          ],
          onError: [
            {
              target: 'showing error',
              actions: 'assignError',
            },
          ],
        },
      },
      'waiting for nav': {
        description: 'waiting for navigations',
        invoke: {
          src: 'handleFirstLoad',
          id: 'handleFirstLoad',
          onDone: [
            {
              target: 'routes ready',
              actions: 'handleInternalNavResult',
            },
          ],
        },
      },
      'showing error': {
        on: {
          '👆 retry': {
            target: 'Initial state',
          },
        },
      },
      'routes ready': {
        description: 'If we get here',
      },
    },
    schema: {
      events: /** @type {import('./app.machine.types').AppEvents} */ ({}),
    },
    predictableActionArguments: true,
    preserveActionOrder: true,
  },
  {
    services: {
      getFeatures: (ctx) => {
        return ctx.messages.getFeatures()
      },
      internalNavListener: (ctx) => (send) => {
        const history = ctx.history
        /**
         * Handle click events on `<a href="" data-nav></a>`
         */
        const handler = (e) => {
          if (!(e.target instanceof HTMLAnchorElement)) return
          if (e.target.tagName === 'A' && e.target.dataset.nav) {
            e.preventDefault()
            const next = e.target.pathname + e.target.hash
            const curr = history.location.pathname + history.location.hash
            if (next !== curr) history.push(next)
          }
        }

        document.addEventListener('click', handler)

        const unsubscribe = ctx.history.listen((update) => {
          const pathSegment = update.location.pathname.split('/')[1]
          if (pathSegment.length > 0) {
            ctx
              .loader(pathSegment)
              .then((feature) => {
                const search = new URLSearchParams(update.location.search)
                send({ type: 'NAV_INTERNAL', feature, search })
              })
              .catch(console.error)
          }
        })

        return () => {
          unsubscribe()
          document.removeEventListener('click', handler)
        }
      },
      /**
       * Handle the very first page load.
       * Here we want to determine what can be shown
       */
      handleFirstLoad: async (ctx) => {
        // retrieve all known feature modules (just enough meta data)
        const preModuleJobs = Object.keys(ctx.features || {}).map((featureName) => {
          return ctx.preLoader(featureName).then((preModule) => {
            return { ...preModule, pathname: '/' + featureName }
          })
        })

        const preModules = await Promise.all(preModuleJobs)
        const pathSegment = ctx.history.location.pathname.split('/')[1]
        const search = new URLSearchParams(ctx.history.location.search)
        const feature = await ctx.loader(pathSegment)

        /** @type {import('xstate').ExtractEvent<import('./app.machine.types').AppEvents, 'done.invoke.handleFirstLoad'>['data']} */
        const result = {
          search,
          feature,
          preModules,
        }

        return result
      },
    },
    actions: {
      handleInternalNavResult: assign({
        preModules: (ctx, evt) => {
          if (evt.type === 'done.invoke.handleFirstLoad') {
            return evt.data.preModules
          }
          return ctx.preModules
        },
        search: (ctx, evt) => {
          if (evt.type === 'NAV_INTERNAL') {
            return new URLSearchParams(evt.search)
          } else if (evt.type === 'done.invoke.handleFirstLoad') {
            return evt.data.search
          }
          return null
        },
        feature: (ctx, evt) => {
          if (evt.type === 'NAV_INTERNAL') {
            return evt.feature
          } else if (evt.type === 'done.invoke.handleFirstLoad') {
            return evt.data.feature
          }
          throw new Error('unreachable')
        },
      }),
      assignFeatures: assign({
        features: (_, evt) => {
          const data = getFeaturesResponseSchema.parse(/** @type {any} */ (evt).data)
          return data.features
        },
      }),
      serviceError: pure((ctx, evt) => {
        const schema = z.string()
        const parsed = schema.parse(/** @type {any} */ (evt).data?.message)
        return [assign({ error: () => parsed }), raise({ type: 'error' })]
      }),
      clearErrors: pure(() => {
        return [assign({ error: () => null }), raise({ type: 'clearErrors' })]
      }),
      assignError: assign({
        error: (ctx, evt) => {
          console.error(evt)
          const lines = ["Couldn't fetch initial data - see the console for more information"]
          // @ts-expect-error - possibly unknown event
          lines.push(evt.data?.message || 'unknown error')
          return lines.join('\n\n')
        },
      }),
    },
  },
)
